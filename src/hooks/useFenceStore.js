import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { hasSupabaseConfig, supabase } from '@/config/supabase'

const CACHE_KEY = 'geofence-studio:fences'

export const MODE_LABEL = { sale: '买卖', rent: '租赁' }
const MODE_PREFIX = { sale: 'S', rent: 'R' }

/** HMR / 重复挂载下，云端迁移只尝试一次（普通拉取由 effect 的 cancelled 标志保护） */
let migrationAttempted = false

/** 去重：先按 id，再按 (mode, code, name)——覆盖历史双写产生的「同内容不同 id」重复行 */
function dedupeFences(list) {
  const byId = new Set()
  const byContent = new Set()
  return list.filter((f) => {
    if (byId.has(f.id)) return false
    byId.add(f.id)
    const key = `${f.mode}|${f.code}|${f.name}`
    if (byContent.has(key)) return false
    byContent.add(key)
    return true
  })
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const list = raw ? JSON.parse(raw) : []
    if (!Array.isArray(list)) return []
    // 旧格式（无 mode 字段）默认归入买卖视图；顺带清理历史重复
    return dedupeFences(list.map((f) => ({ ...f, mode: f.mode === 'rent' ? 'rent' : 'sale' })))
  } catch {
    return []
  }
}

/** 生成下一条编号：买卖 S-001…，租赁 R-001…（按模式内最大序号递增） */
function nextCode(fences, mode) {
  const prefix = MODE_PREFIX[mode] || 'S'
  const re = new RegExp(`^${prefix}-(\\d+)$`)
  const max = fences.reduce((acc, f) => {
    if (f.mode !== mode) return acc
    const m = re.exec(f.code || '')
    return m ? Math.max(acc, Number(m[1])) : acc
  }, 0)
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

const fromRow = (r) => ({
  id: r.id,
  mode: r.mode,
  code: r.code,
  name: r.name,
  path: r.path,
  area: r.area,
  createdAt: r.created_at,
})

const toRow = (f) => ({
  id: f.id,
  mode: f.mode,
  code: f.code,
  name: f.name,
  path: f.path,
  area: f.area,
  vertex_count: f.path.length,
  created_at: f.createdAt,
  updated_at: new Date().toISOString(),
})

/**
 * 围栏数据层：Supabase 为主，localStorage 作离线缓存/兜底。
 * - 加载时从云端拉取；未配置或连接失败时降级为纯本地模式
 * - 增删改乐观更新 UI，并直接写云端
 * - Realtime 订阅：其他设备的改动自动合并进本端并 toast 提示
 * - 首次迁移：云端为空而本地缓存有旧数据时自动上传（归买卖视图）
 */
export function useFenceStore() {
  const [fences, setFences] = useState(loadCache)
  const [syncStatus, setSyncStatus] = useState(hasSupabaseConfig ? 'connecting' : 'offline')
  const fencesRef = useRef(fences)
  const localOpsRef = useRef(new Set())

  useEffect(() => {
    fencesRef.current = fences
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(fences))
    } catch {
      // 缓存写失败不影响主流程
    }
  }, [fences])

  // ---- 云端初始化 + Realtime 订阅 ----
  // 注意：不能用模块级"已初始化"标志——StrictMode 首跑 effect 会立即 cleanup，
  // 续跑被早退后第一次初始化的 cancelled 又会丢弃结果，导致永远卡在 connecting。
  // 每次挂载都初始化，副作用一律用 cancelled 保护即可（重复 select 无害）。
  useEffect(() => {
    if (!supabase) return undefined
    let cancelled = false

    const init = async () => {
      const { data, error } = await supabase
        .from('fences')
        .select('*')
        .order('created_at', { ascending: true })
      if (cancelled) return
      if (error) {
        setSyncStatus('offline')
        toast.error('Supabase 连接失败，已切换为本地模式', { id: 'sb-conn' })
        return
      }
      setSyncStatus('online')
      const local = loadCache()
      if (data.length === 0 && local.length > 0 && !migrationAttempted) {
        migrationAttempted = true
        // 首次迁移：本地旧数据上传到云端，统一归买卖视图并重新编号 S-001…
        const migrated = local.map((f, i) => ({
          id: f.id || crypto.randomUUID(),
          mode: 'sale',
          code: `S-${String(i + 1).padStart(3, '0')}`,
          name: f.name,
          path: f.path,
          area: f.area,
          createdAt: f.createdAt || new Date().toISOString(),
        }))
        migrated.forEach((f) => localOpsRef.current.add(f.id))
        const { error: insErr } = await supabase
          .from('fences')
          .insert(migrated.map(toRow))
        if (cancelled) return
        if (insErr) {
          toast.error('本地围栏迁移到云端失败，数据仍保留在本机')
        } else {
          setFences(migrated)
          toast.success(`已将 ${migrated.length} 条本地围栏迁移到云端（买卖视图）`, {
            id: 'sb-migrate',
          })
        }
      } else {
        setFences(dedupeFences(data.map(fromRow)))
      }
    }

    const modeLabel = (m) => MODE_LABEL[m] || m
    const isLocalOp = (id) => localOpsRef.current.delete(id)

    const channel = supabase
      .channel('fences-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fences' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const fence = fromRow(payload.new)
          if (isLocalOp(fence.id)) return
          setFences((prev) => (prev.some((f) => f.id === fence.id) ? prev : [...prev, fence]))
          toast.info(`${modeLabel(fence.mode)}视图新增围栏 ${fence.code}（来自其他设备）`)
        } else if (payload.eventType === 'UPDATE') {
          const fence = fromRow(payload.new)
          if (isLocalOp(fence.id)) return
          setFences((prev) => prev.map((f) => (f.id === fence.id ? fence : f)))
          toast.info(`围栏 ${fence.code} 已在其他设备更新`)
        } else if (payload.eventType === 'DELETE') {
          const id = payload.old?.id
          if (!id || isLocalOp(id)) return
          const known = fencesRef.current.find((f) => f.id === id)
          setFences((prev) => prev.filter((f) => f.id !== id))
          toast.info(`围栏 ${known?.code || ''} 已在其他设备删除`)
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setSyncStatus('offline')
          toast.error('Realtime 连接中断，本端改动不再自动同步', { id: 'sb-rt' })
        }
      })

    init()
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  // ---- 增删改（乐观更新 + 写云端）----
  const insertFence = useCallback(({ mode, name, path, area }) => {
    const fence = {
      id: crypto.randomUUID(),
      mode,
      code: nextCode(fencesRef.current, mode),
      name: name.trim() || '未命名围栏',
      path,
      area,
      createdAt: new Date().toISOString(),
    }
    localOpsRef.current.add(fence.id)
    setFences((prev) => [...prev, fence])
    if (supabase && syncStatus !== 'offline') {
      supabase
        .from('fences')
        .insert(toRow(fence))
        .then(({ error }) => {
          if (error) toast.error('云端写入失败，该围栏仅保存在本机')
        })
    }
    return fence
  }, [syncStatus])

  const updateFence = useCallback(
    (id, patch) => {
      localOpsRef.current.add(id)
      setFences((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
      if (supabase && syncStatus !== 'offline') {
        const row = { updated_at: new Date().toISOString() }
        if (patch.name !== undefined) row.name = patch.name
        if (patch.path !== undefined) {
          row.path = patch.path
          row.vertex_count = patch.path.length
        }
        if (patch.area !== undefined) row.area = patch.area
        supabase
          .from('fences')
          .update(row)
          .eq('id', id)
          .then(({ error }) => {
            if (error) toast.error('云端写入失败，修改仅保存在本机')
          })
      }
    },
    [syncStatus],
  )

  const removeFence = useCallback(
    (id) => {
      localOpsRef.current.add(id)
      setFences((prev) => prev.filter((f) => f.id !== id))
      if (supabase && syncStatus !== 'offline') {
        supabase
          .from('fences')
          .delete()
          .eq('id', id)
          .then(({ error }) => {
            if (error) toast.error('云端删除失败，请刷新后重试')
          })
      }
    },
    [syncStatus],
  )

  return { fences, syncStatus, insertFence, updateFence, removeFence }
}
