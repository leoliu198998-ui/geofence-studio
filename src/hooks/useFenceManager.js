import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

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
      mode: f.mode,
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
 * 围栏的地图交互层：绘制、顶点编辑、定位、导出。
 * 数据读写交给 useFenceStore；本 hook 只接收当前模式的围栏列表。
 * @param {{ map: object|null, AMap: object|null, mode: string, fences: Array,
 *   onInsert: (f: object) => void, onUpdate: (id: string, patch: object) => void,
 *   onRemove: (id: string) => void }} args
 */
export function useFenceManager({ map, AMap, mode, fences, onInsert, onUpdate, onRemove }) {
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

  // 切换视图时：中止未完成的绘制 / 顶点编辑（render 期间调整 state）
  const [prevMode, setPrevMode] = useState(mode)
  if (mode !== prevMode) {
    setPrevMode(mode)
    setDrawing(null)
    setPendingName(null)
    setEditingId(null)
  }
  useEffect(() => {
    if (!editingId && editorRef.current) {
      editorRef.current.close()
      editorRef.current = null
    }
  }, [editingId])

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
        onInsert({ mode, name, path: p.path, area: p.area })
        return null
      })
      toast.success('围栏已保存')
    },
    [mode, onInsert],
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
    [map, AMap, drawing, onUpdate],
  )

  const stopEdit = useCallback(() => {
    editorRef.current?.close()
    editorRef.current = null
    setEditingId(null)
    toast.success('顶点修改已保存')
  }, [])

  // ---- 导出（仅当前模式）----
  const exportFence = useCallback(
    (id) => {
      const fence = fences.find((f) => f.id === id)
      if (fence) {
        downloadGeoJSON(`${fence.code}-${fence.name}.geojson`, [fenceToFeature(fence)])
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
    downloadGeoJSON(`geofences-${mode}.geojson`, fences.map(fenceToFeature))
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
    startEdit,
    stopEdit,
    exportFence,
    exportAll,
  }
}
