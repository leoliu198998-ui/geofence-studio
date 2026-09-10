import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { downloadFencesXlsx } from '@/lib/excel'
import { MODE_LABEL } from '@/hooks/useFenceStore'

const FENCE_STYLE = {
  strokeColor: '#FF5A1F',
  strokeWeight: 1.5,
  strokeOpacity: 0.9,
  fillColor: '#FF5A1F',
  fillOpacity: 0.08,
  zIndex: 10,
}

const HOVER_STYLE = { ...FENCE_STYLE, strokeWeight: 2.5, strokeOpacity: 1, fillOpacity: 0.14 }
const SELECTED_STYLE = { ...FENCE_STYLE, strokeWeight: 3, strokeOpacity: 1, fillOpacity: 0.18 }

const DRAW_STYLE = {
  strokeColor: '#FF5A1F',
  strokeWeight: 2,
  strokeOpacity: 1,
  fillColor: '#FF5A1F',
  fillOpacity: 0.18,
  strokeStyle: 'dashed',
  // 关键：让预览多边形上的鼠标事件冒泡到地图，
  // 否则在已成形预览区域内单击/双击会被覆盖物拦截（无法加点、双击不收尾）
  bubble: true,
  zIndex: 50,
}

/** 标签缩放阈值：低于该 zoom 只显示编号 */
const LABEL_COMPACT_ZOOM = 11

/** 顶点均值近似视觉中心 */
function pathCenter(path) {
  let lng = 0
  let lat = 0
  for (const p of path) {
    lng += p[0]
    lat += p[1]
  }
  return [lng / path.length, lat / path.length]
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

/**
 * 围栏的地图交互层：绘制、顶点编辑、定位、导出。
 * 数据读写交给 useFenceStore；本 hook 只接收当前模式的围栏列表。
 * @param {{ map: object|null, AMap: object|null, mode: string, fences: Array,
 *   onInsert: (f: object) => void, onUpdate: (id: string, patch: object) => void,
 *   onRemove: (id: string) => void }} args
 */
export function useFenceManager({
  map,
  AMap,
  mode,
  fences,
  onInsert,
  onUpdate,
  onRemove,
  hoveredId = null,
  selectedId = null,
  onHover,
  onSelect,
}) {
  const [drawing, setDrawing] = useState(null) // { path: [[lng,lat]...], cursor: [lng,lat]|null }
  const [pendingName, setPendingName] = useState(null) // { path, area }
  const [editingId, setEditingId] = useState(null)
  const [editBackup, setEditBackup] = useState(null) // { id, path, area }——进入编辑时的原始形状，用于取消回滚
  const polygonsRef = useRef(new Map()) // id -> AMap.Polygon
  const labelsRef = useRef(new Map()) // id -> { marker, el }
  const drawPolygonRef = useRef(null)
  const editorRef = useRef(null)
  const drawingRef = useRef(null)
  const handlersRef = useRef({ onHover, onSelect })
  useEffect(() => {
    handlersRef.current = { onHover, onSelect }
  }, [onHover, onSelect])
  useEffect(() => {
    drawingRef.current = drawing
  }, [drawing])

  // ---- 当前模式围栏的多边形同步 ----
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
        polygon.on('click', () => {
          if (drawingRef.current) return // 绘制中不拦截落点
          handlersRef.current.onSelect?.(fence.id)
        })
        polygon.on('mouseover', () => {
          if (drawingRef.current) return
          handlersRef.current.onHover?.(fence.id)
        })
        polygon.on('mouseout', () => handlersRef.current.onHover?.(null))
        store.set(fence.id, polygon)
      }
    }
  }, [map, AMap, fences])

  // ---- 围栏名称标签同步（DOM content + CSS 变量，双主题自适应，鼠标穿透）----
  useEffect(() => {
    if (!map || !AMap) return
    const labels = labelsRef.current
    const ids = new Set(fences.map((f) => f.id))

    for (const [id, rec] of labels) {
      if (!ids.has(id)) {
        rec.marker.setMap(null)
        labels.delete(id)
      }
    }
    for (const fence of fences) {
      const center = pathCenter(fence.path)
      const rec = labels.get(fence.id)
      if (rec) {
        rec.marker.setPosition(center)
        if (rec.code !== fence.code || rec.name !== fence.name) {
          rec.el.querySelector('.label-code').textContent = fence.code
          rec.el.querySelector('.label-name').textContent = fence.name
          rec.code = fence.code
          rec.name = fence.name
        }
      } else {
        const el = document.createElement('div')
        el.className = 'fence-label'
        const code = document.createElement('span')
        code.className = 'label-code'
        code.textContent = fence.code
        const name = document.createElement('span')
        name.className = 'label-name'
        name.textContent = fence.name
        el.append(code, name)
        const marker = new AMap.Marker({
          position: center,
          content: el,
          anchor: 'center',
          bubble: true,
          zIndex: 40,
        })
        marker.setMap(map)
        labels.set(fence.id, { marker, el, code: fence.code, name: fence.name })
      }
    }
  }, [map, AMap, fences])

  // ---- 标签随缩放降级：zoom < 阈值只显示编号 ----
  useEffect(() => {
    if (!map) return undefined
    const apply = () => {
      const compact = map.getZoom() < LABEL_COMPACT_ZOOM
      for (const rec of labelsRef.current.values()) {
        rec.el.classList.toggle('compact', compact)
      }
    }
    map.on('zoomend', apply)
    apply()
    return () => map.off('zoomend', apply)
  }, [map])

  // ---- 高亮联动 + 绘制/编辑时标签降透明度 ----
  useEffect(() => {
    const dimmed = Boolean(drawing) || Boolean(editingId)
    for (const [id, rec] of labelsRef.current) {
      rec.el.classList.toggle('active', id === hoveredId || id === selectedId)
      rec.el.classList.toggle('dimmed', dimmed)
    }
    for (const [id, polygon] of polygonsRef.current) {
      let style = FENCE_STYLE
      if (id === selectedId) style = SELECTED_STYLE
      else if (id === hoveredId) style = HOVER_STYLE
      // 绘制中已保存多边形事件穿透（bubble），让落点/双击到达地图
      polygon.setOptions({ ...style, bubble: Boolean(drawing) })
    }
  }, [hoveredId, selectedId, drawing, editingId, fences])

  // 卸载时清理
  useEffect(() => {
    const store = polygonsRef.current
    const labels = labelsRef.current
    return () => {
      for (const polygon of store.values()) polygon.setMap(null)
      store.clear()
      for (const rec of labels.values()) rec.marker.setMap(null)
      labels.clear()
      editorRef.current?.close()
      drawPolygonRef.current?.setMap(null)
    }
  }, [])

  // 切换视图时：中止未完成的绘制 / 顶点编辑（render 期间调整 state）
  const [prevMode, setPrevMode] = useState(mode)
  if (mode !== prevMode) {
    setPrevMode(mode)
    setDrawing(null)
    setPendingName(null)
    setEditingId(null)
    setEditBackup(null)
  }
  useEffect(() => {
    if (!editingId && editorRef.current) {
      editorRef.current.close()
      editorRef.current = null
    }
  }, [editingId])

  const requestFinish = useCallback(
    (dropLast = 0) => {
      const d = drawingRef.current
      if (!d) return
      // 双击收尾时，双击的第一下单击已加了一个顶点，按需去掉
      const raw = dropLast > 0 ? d.path.slice(0, -dropLast) : d.path
      const path = dedupeTail(raw)
      if (path.length < 3) {
        toast.warning('至少需要 3 个顶点才能构成围栏')
        return
      }
      const area = AMap.GeometryUtil.ringArea(path)
      setDrawing(null)
      setPendingName({ path, area })
    },
    [AMap],
  )

  // ---- 绘制模式：禁用地图拖拽与双击缩放，退出时恢复 ----
  useEffect(() => {
    if (!map) return
    if (drawing) {
      map.setStatus({ dragEnable: false, doubleClickZoom: false })
    } else {
      map.setStatus({ dragEnable: true, doubleClickZoom: true })
    }
  }, [map, drawing !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- 绘制模式：事件绑定 ----
  useEffect(() => {
    if (!map || !drawing) return undefined

    // AMap 对快速第二击会抑制 click 事件，map 级 dblclick 在 doubleClickZoom
    // 关闭后也不可靠——双击收尾改为监听地图容器的 DOM dblclick：
    // 双击的第一击若刚加了顶点（<450ms），收尾时去掉它
    let lastAddAt = 0
    const onClick = (e) => {
      const p = [e.lnglat.getLng(), e.lnglat.getLat()]
      lastAddAt = Date.now()
      setDrawing((d) => (d ? { ...d, path: [...d.path, p] } : d))
    }
    const onMove = (e) => {
      const p = [e.lnglat.getLng(), e.lnglat.getLat()]
      setDrawing((d) => (d ? { ...d, cursor: p } : d))
    }
    const onDomDblClick = () => {
      requestFinish(Date.now() - lastAddAt < 450 ? 1 : 0)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        requestFinish()
      } else if (e.key === 'Escape') {
        setDrawing(null)
        toast.info('已取消绘制')
      }
    }

    const container = map.getContainer()
    map.on('click', onClick)
    map.on('mousemove', onMove)
    container.addEventListener('dblclick', onDomDblClick)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      map.off('click', onClick)
      map.off('mousemove', onMove)
      container.removeEventListener('dblclick', onDomDblClick)
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

  // 注意：onInsert 副作用不能放在 setState updater 里（StrictMode 会双调 updater 导致重复保存）
  const confirmName = useCallback(
    (name) => {
      if (!pendingName) return
      onInsert({ mode, name, path: pendingName.path, area: pendingName.area })
      setPendingName(null)
      toast.success('围栏已保存')
    },
    [mode, onInsert, pendingName],
  )

  const cancelName = useCallback(() => setPendingName(null), [])

  const renameFence = useCallback(
    (id, name) => {
      onUpdate(id, { name: name.trim() || undefined })
      toast.success('已重命名')
    },
    [onUpdate],
  )

  const removeFence = useCallback(
    (id) => {
      onRemove(id)
      toast.success('围栏已删除')
    },
    [onRemove],
  )

  const clearAll = useCallback(() => {
    for (const f of fences) onRemove(f.id)
    toast.success(`已清除当前视图全部 ${fences.length} 条围栏`)
  }, [fences, onRemove])

  const locateFence = useCallback(
    (id) => {
      const polygon = polygonsRef.current.get(id)
      if (polygon && map) map.setFitView([polygon], false, [80, 80, 80, 80])
    },
    [map],
  )

  /** 批量定位：fitView 到一组围栏（忽略当前视图外的 id） */
  const locateFences = useCallback(
    (ids) => {
      if (!map) return
      const polygons = ids
        .map((id) => polygonsRef.current.get(id))
        .filter(Boolean)
      if (polygons.length) map.setFitView(polygons, false, [80, 80, 80, 80])
    },
    [map],
  )

  // ---- 顶点编辑 ----
  const startEdit = useCallback(
    (id) => {
      if (!map || !AMap || drawing) return
      const polygon = polygonsRef.current.get(id)
      const fence = fences.find((f) => f.id === id)
      if (!polygon || !fence) return
      if (editorRef.current) editorRef.current.close()
      setEditBackup({ id, path: fence.path.map((p) => [...p]), area: fence.area })
      const editor = new AMap.PolygonEditor(map, polygon)
      const sync = () => {
        const path = polygon.getPath().map((p) => [p.getLng(), p.getLat()])
        onUpdate(id, { path, area: AMap.GeometryUtil.ringArea(path) })
      }
      editor.on('adjust', sync)
      editor.on('addnode', sync)
      editor.on('removenode', sync)
      editor.open()
      editorRef.current = editor
      setEditingId(id)
      map.setFitView([polygon], false, [80, 80, 80, 80])
    },
    [map, AMap, drawing, fences, onUpdate],
  )

  const stopEdit = useCallback(() => {
    editorRef.current?.close()
    editorRef.current = null
    setEditBackup(null)
    setEditingId(null)
    toast.success('顶点修改已保存')
  }, [])

  /** 取消编辑：回滚到进入编辑时的形状（编辑期间每次拖动都已实时保存，需显式恢复） */
  const cancelEdit = useCallback(() => {
    editorRef.current?.close()
    editorRef.current = null
    setEditingId(null)
    if (editBackup) {
      onUpdate(editBackup.id, { path: editBackup.path, area: editBackup.area })
      setEditBackup(null)
      toast.info('已取消编辑，围栏恢复原样')
    }
  }, [editBackup, onUpdate])

  // 编辑中按 Esc 取消（与绘制模式一致）
  useEffect(() => {
    if (!editingId) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') cancelEdit()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editingId, cancelEdit])

  // ---- 导出（仅当前模式，xlsx，格式同运营区围栏清单模板）----
  const exportFence = useCallback(
    (id) => {
      const fence = fences.find((f) => f.id === id)
      if (fence) {
        downloadFencesXlsx([fence], `${fence.code}-${fence.name}.xlsx`)
        toast.success(`已导出 ${fence.code}`)
      }
    },
    [fences],
  )

  const exportAll = useCallback(() => {
    if (fences.length === 0) {
      toast.warning('当前视图没有可导出的围栏')
      return
    }
    downloadFencesXlsx(fences, `运营区围栏清单-${MODE_LABEL[mode] || mode}.xlsx`)
    toast.success(`已导出当前视图全部 ${fences.length} 条围栏`)
  }, [fences, mode])

  return {
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
    locateFences,
    startEdit,
    stopEdit,
    cancelEdit,
    exportFence,
    exportAll,
  }
}
