import { useEffect, useMemo, useRef, useState } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { CoordsHud } from '@/components/CoordsHud'
import { DrawHud } from '@/components/DrawHud'
import { FencePanel } from '@/components/FencePanel'
import { NameDialog } from '@/components/NameDialog'
import { SetupGuide } from '@/components/SetupGuide'
import { ToolRail } from '@/components/ToolRail'
import { TopBar } from '@/components/TopBar'
import { Button } from '@/components/ui/button'
import { AMAP_MAP_STYLE, AMAP_MAP_STYLE_LIGHT, hasAmapConfig } from '@/config/amap'
import { useAmap } from '@/hooks/useAmap'
import { useCity } from '@/hooks/useCity'
import { useFenceManager } from '@/hooks/useFenceManager'
import { useFenceStore } from '@/hooks/useFenceStore'
import { useTheme } from '@/hooks/useTheme'

const MODE_KEY = 'geofence-studio:mode'

function loadMode() {
  return localStorage.getItem(MODE_KEY) === 'rent' ? 'rent' : 'sale'
}

function Workbench({ theme, resolvedTheme, onThemeCycle }) {
  const containerRef = useRef(null)
  const { map, AMap, status, error, coords, retry } = useAmap(containerRef)
  const { fences, syncStatus, insertFence, updateFence, removeFence } = useFenceStore()
  const { city, setCity } = useCity({ map, AMap })

  // 高德底图随主题联动：darkblue / whitesmoke，不重建地图
  useEffect(() => {
    if (!map) return
    map.setMapStyle(resolvedTheme === 'dark' ? AMAP_MAP_STYLE : AMAP_MAP_STYLE_LIGHT)
  }, [map, resolvedTheme])

  const [mode, setMode] = useState(loadMode)
  useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, mode)
    } catch {
      // 忽略
    }
  }, [mode])

  const modeFences = useMemo(() => fences.filter((f) => f.mode === mode), [fences, mode])

  const [hoveredFenceId, setHoveredFenceId] = useState(null)
  const [selectedFenceId, setSelectedFenceId] = useState(null)

  const {
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
    removeFence: removeCurrentFence,
    clearAll,
    locateFence,
    startEdit,
    stopEdit,
    exportFence,
    exportAll,
  } = useFenceManager({
    map,
    AMap,
    mode,
    fences: modeFences,
    onInsert: insertFence,
    onUpdate: updateFence,
    onRemove: removeFence,
    hoveredId: hoveredFenceId,
    selectedId: selectedFenceId,
    onHover: setHoveredFenceId,
    onSelect: setSelectedFenceId,
  })

  const [renaming, setRenaming] = useState(null) // { id, name }

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <div ref={containerRef} className="absolute inset-0" aria-label="地图" />

      {status === 'loading' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-primary" />
            <p className="font-mono text-xs tracking-widest text-muted-foreground">
              正在加载高德地图…
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/90 p-6 backdrop-blur-sm">
          <div className="hud-panel max-w-md p-6 text-center">
            <p className="text-sm font-medium text-foreground">地图加载失败</p>
            <p className="mt-2 break-all font-mono text-xs leading-relaxed text-muted-foreground">
              {String(error?.message || error || '未知错误')}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              请检查 Key 与安全密钥是否匹配、域名白名单是否包含当前地址。
            </p>
            <Button className="mt-4" size="sm" onClick={retry}>
              重试
            </Button>
          </div>
        </div>
      )}

      <TopBar
        AMap={AMap}
        map={map}
        mode={mode}
        onModeChange={setMode}
        syncStatus={syncStatus}
        city={city}
        onCityChange={setCity}
        theme={theme}
        onThemeCycle={onThemeCycle}
      />

      <ToolRail
        drawing={Boolean(drawing)}
        editing={Boolean(editingId)}
        hasFences={modeFences.length > 0}
        onStartDraw={startDrawing}
        onFinishDraw={requestFinish}
        onCancelDraw={cancelDrawing}
        onExportAll={exportAll}
        onClearAll={clearAll}
      />

      <FencePanel
        mode={mode}
        fences={modeFences}
        editingId={editingId}
        onLocate={locateFence}
        onStartEdit={startEdit}
        onStopEdit={stopEdit}
        onRename={(fence) => setRenaming({ id: fence.id, name: fence.name })}
        onExport={exportFence}
        onExportAll={exportAll}
        onRemove={removeCurrentFence}
        hoveredId={hoveredFenceId}
        selectedId={selectedFenceId}
        onHover={setHoveredFenceId}
        onSelect={setSelectedFenceId}
      />

      <CoordsHud coords={coords} />

      {drawing && (
        <DrawHud stats={drawingStats} onFinish={requestFinish} onCancel={cancelDrawing} />
      )}

      {editingId && !drawing && (
        <div className="hud-panel absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 px-4 py-2 animate-slide-up">
          <span className="font-mono text-xs text-primary">正在编辑顶点</span>
          <span className="text-[11px] text-muted-foreground">拖动白色锚点调整边界</span>
          <Button size="sm" variant="success" onClick={stopEdit}>
            完成编辑
          </Button>
        </div>
      )}

      <NameDialog
        open={Boolean(pendingName)}
        title="命名围栏"
        description="为这块区域起个名字，保存后会进入右侧的测量日志。"
        submitLabel="保存围栏"
        onSubmit={confirmName}
        onClose={cancelName}
      />

      <NameDialog
        open={Boolean(renaming)}
        title="重命名围栏"
        defaultValue={renaming?.name ?? ''}
        submitLabel="保存"
        onSubmit={(name) => {
          renameFence(renaming.id, name)
          setRenaming(null)
        }}
        onClose={() => setRenaming(null)}
      />
    </div>
  )
}

export default function App() {
  const { theme, resolved, cycleTheme } = useTheme()

  if (!hasAmapConfig) {
    return (
      <>
        <SetupGuide />
        <Toaster theme={resolved} />
      </>
    )
  }
  return (
    <TooltipProvider delayDuration={250}>
      <Workbench theme={theme} resolvedTheme={resolved} onThemeCycle={cycleTheme} />
      <Toaster theme={resolved} />
    </TooltipProvider>
  )
}
