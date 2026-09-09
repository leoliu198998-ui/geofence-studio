import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

const STORAGE_KEY = 'geofence-studio:fences'

const FENCE_STYLE = {
  strokeColor: '#FF5A1F',
  strokeWeight: 1.5,
  strokeOpacity: 0.9,
  fillColor: '#FF5A1F',
  fillOpacity: 0.08,
  zIndex: 10,
}

const DRAW_STYLE = {
  strokeColor: '#FF5A1F',
  strokeWeight: 2,
  strokeOpacity: 1,
  fillColor: '#FF5A1F',
  fillOpacity: 0.18,
  strokeStyle: 'dashed',
  zIndex: 50,
}

function loadFences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

/** 生成下一条记录编号：F-001、F-002…（基于现有最大序号递增） */
function nextCode(fences) {
  const max = fences.reduce((acc, f) => {
    const m = /^F-(\d+)$/.exec(f.code || '')
    return m ? Math.max(acc, Number(m[1])) : acc
  }, 0)
  return `F-${String(max + 1).padStart(3, '0')}`
}

/** 去掉双击结束产生的重复尾点 */
function dedupeTail(path) {
  const out = []
  for (const p of path) {
    const last = out[out.length - 1]
    if (last && Math.abs(last[0] - p[0]) < 1e-7 && Math.abs(last[1] - p[1]) < 1e-7) continue
    out.push(p)
  }
  return out
}

function fenceToFeature(f) {
  const ring = [...f.path, f.path[0]]
  return {
    type: 'Feature',
    properties: {
      name: f.name,
      code: f.code,
      area: Math.round(f.area),
      vertexCount: f.path.length,
      createdAt: f.createdAt,
    },
    geometry: { type: 'Polygon', coordinates: [ring] },
  }
}

function downloadGeoJSON(filename, features) {
  const collection = { type: 'FeatureCollection', features }
  const blob = new Blob([JSON.stringify(collection, null, 2)], {
    type: 'application/geo+json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 围栏管理：绘制、编辑、持久化、导出。
 * @param {{ map: object|null, AMap: object|null }} args
 */
export function useFenceManager({ map, AMap }) {
  const [fences, setFences] = useState(loadFences)
  const [drawing, setDrawing] = useState(null) // { path: [[lng,lat]...], cursor: [lng,lat]|null }
  const [pendingName, setPendingName] = useState(null) // { path, area }
  const [editingId, setEditingId] = useState(null)
  const polygonsRef = useRef(new Map()) // id -> AMap.Polygon
  const drawPolygonRef = useRef(null)
  const editorRef = useRef(null)
  const drawingRef = useRef(null)
  useEffect(() => {
    drawingRef.current = drawing
  }, [drawing])

  // ---- 持久化 ----
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fences))
    } catch {
      toast.error('围栏数据写入 localStorage 失败')
    }
  }, [fences])

  // ---- 已保存围栏的多边形同步 ----
  useEffect(() => {
    if (!map || !AMap) return
    const store = polygonsRef.current
    const ids = new Set(fences.map((f) => f.id))

    for (const [id, polygon] of store) {
      if (!ids.has(id)) {
        polygon.setMap(null)
        store.delete(id)
      }
    }
    for (const fence of fences) {
      const existing = store.get(fence.id)
      if (existing) {
        const current = existing.getPath().map((p) => [p.getLng(), p.getLat()])
        if (JSON.stringify(current) !== JSON.stringify(fence.path)) {
          existing.setPath(fence.path)
        }
      } else {
        const polygon = new AMap.Polygon({ ...FENCE_STYLE, path: fence.path })
        polygon.setMap(map)
        polygon.on('click', () => map.setFitView([polygon], false, [60, 60, 60, 60]))
        store.set(fence.id, polygon)
      }
    }
  }, [map, AMap, fences])

  // 卸载时清理
  useEffect(() => {
    const store = polygonsRef.current
    return () => {
      for (const polygon of store.values()) polygon.setMap(null)
      store.clear()
      editorRef.current?.close()
      drawPolygonRef.current?.setMap(null)
    }
  }, [])

  const requestFinish = useCallback(() => {
    const d = drawingRef.current
    if (!d) return
    const path = dedupeTail(d.path)
    if (path.length < 3) {
      toast.warning('至少需要 3 个顶点才能构成围栏')
      return
    }
    const area = AMap.GeometryUtil.ringArea(path)
    setDrawing(null)
    setPendingName({ path, area })
  }, [AMap])

  // ---- 绘制模式：事件绑定 ----
  useEffect(() => {
    if (!map || !drawing) return undefined

    const onClick = (e) => {
      const p = [e.lnglat.getLng(), e.lnglat.getLat()]
      setDrawing((d) => (d ? { ...d, path: [...d.path, p] } : d))
    }
    const onMove = (e) => {
      const p = [e.lnglat.getLng(), e.lnglat.getLat()]
      setDrawing((d) => (d ? { ...d, cursor: p } : d))
    }
    const onDblClick = () => requestFinish()
    const onKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        requestFinish()
      } else if (e.key === 'Escape') {
        setDrawing(null)
        toast.info('已取消绘制')
      }
    }

    map.on('click', onClick)
    map.on('mousemove', onMove)
    map.on('dblclick', onDblClick)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      map.off('click', onClick)
      map.off('mousemove', onMove)
      map.off('dblclick', onDblClick)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [map, drawing !== null, requestFinish]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- 绘制预览多边形 ----
  useEffect(() => {
    if (!map || !AMap) return
    if (!drawing) {
      drawPolygonRef.current?.setMap(null)
      drawPolygonRef.current = null
      return
    }
    if (!drawPolygonRef.current) {
      drawPolygonRef.current = new AMap.Polygon({ ...DRAW_STYLE, path: [] })
      drawPolygonRef.current.setMap(map)
    }
    const pts = drawing.cursor ? [...drawing.path, drawing.cursor] : drawing.path
    drawPolygonRef.current.setPath(pts)
  }, [map, AMap, drawing])

  // ---- 面积 / 周长实时读数 ----
  const drawingStats = (() => {
    if (!drawing || !AMap) return null
    const pts = drawing.cursor ? [...drawing.path, drawing.cursor] : drawing.path
    const util = AMap.GeometryUtil
    let area = 0
    let perimeter = 0
    if (pts.length >= 3) {
      area = util.ringArea(pts)
      perimeter = util.distanceOfLine([...pts, pts[0]])
    } else if (pts.length === 2) {
      perimeter = util.distance(pts[0], pts[1])
    }
    return { count: drawing.path.length, area, perimeter }
  })()

  // ---- 对外动作 ----
  const startDrawing = useCallback(() => {
    if (editingId) return
    setDrawing({ path: [], cursor: null })
  }, [editingId])

  const cancelDrawing = useCallback(() => {
    setDrawing(null)
  }, [])

  const confirmName = useCallback(
    (name) => {
      setPendingName((p) => {
        if (!p) return null
        setFences((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            code: nextCode(prev),
            name: name.trim() || '未命名围栏',
            path: p.path,
            area: p.area,
            createdAt: new Date().toISOString(),
          },
        ])
        return null
      })
      toast.success('围栏已保存')
    },
    [],
  )

  const cancelName = useCallback(() => setPendingName(null), [])

  const renameFence = useCallback((id, name) => {
    setFences((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: name.trim() || f.name } : f)),
    )
    toast.success('已重命名')
  }, [])

  const removeFence = useCallback((id) => {
    setFences((prev) => prev.filter((f) => f.id !== id))
    toast.success('围栏已删除')
  }, [])

  const clearAll = useCallback(() => {
    setFences([])
    toast.success('已清除全部围栏')
  }, [])

  const locateFence = useCallback(
    (id) => {
      const polygon = polygonsRef.current.get(id)
      if (polygon && map) map.setFitView([polygon], false, [80, 80, 80, 80])
    },
    [map],
  )

  // ---- 顶点编辑 ----
  const startEdit = useCallback(
    (id) => {
      if (!map || !AMap || drawing) return
      const polygon = polygonsRef.current.get(id)
      if (!polygon) return
      if (editorRef.current) editorRef.current.close()
      const editor = new AMap.PolygonEditor(map, polygon)
      const sync = () => {
        const path = polygon.getPath().map((p) => [p.getLng(), p.getLat()])
        const area = AMap.GeometryUtil.ringArea(path)
        setFences((prev) => prev.map((f) => (f.id === id ? { ...f, path, area } : f)))
      }
      editor.on('adjust', sync)
      editor.on('addnode', sync)
      editor.on('removenode', sync)
      editor.open()
      editorRef.current = editor
      setEditingId(id)
      map.setFitView([polygon], false, [80, 80, 80, 80])
    },
    [map, AMap, drawing],
  )

  const stopEdit = useCallback(() => {
    editorRef.current?.close()
    editorRef.current = null
    setEditingId(null)
    toast.success('顶点修改已保存')
  }, [])

  // ---- 导出 ----
  const exportFence = useCallback((id) => {
    setFences((prev) => {
      const fence = prev.find((f) => f.id === id)
      if (fence) {
        downloadGeoJSON(`${fence.code}-${fence.name}.geojson`, [fenceToFeature(fence)])
        toast.success(`已导出 ${fence.code}`)
      }
      return prev
    })
  }, [])

  const exportAll = useCallback(() => {
    if (fences.length === 0) {
      toast.warning('没有可导出的围栏')
      return
    }
    downloadGeoJSON('geofences-all.geojson', fences.map(fenceToFeature))
    toast.success(`已导出全部 ${fences.length} 条围栏`)
  }, [fences])

  return {
    fences,
    drawing,
    drawingStats,
    pendingName,
    editingId,
    startDrawing,
    cancelDrawing,
    requestFinish,
    confirmName,
    cancelName,
    renameFence,
    removeFence,
    clearAll,
    locateFence,
    startEdit,
    stopEdit,
    exportFence,
    exportAll,
  }
}
