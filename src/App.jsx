import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { CoordsHud } from '@/components/CoordsHud'
import { DrawHud } from '@/components/DrawHud'
import { FencePanel } from '@/components/FencePanel'
import { ImportPreviewDialog } from '@/components/ImportPreviewDialog'
import { LoginPage } from '@/components/LoginPage'
import { NameDialog } from '@/components/NameDialog'
import { SetupGuide } from '@/components/SetupGuide'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ToolRail } from '@/components/ToolRail'
import { TopBar } from '@/components/TopBar'
import { Button } from '@/components/ui/button'
import { AMAP_MAP_STYLE, AMAP_MAP_STYLE_LIGHT, hasAmapConfig } from '@/config/amap'
import { useAmap } from '@/hooks/useAmap'
import { useAuth } from '@/hooks/useAuth'
import { useCity } from '@/hooks/useCity'
import { useFenceManager } from '@/hooks/useFenceManager'
import { useFenceStore } from '@/hooks/useFenceStore'
import { useTheme } from '@/hooks/useTheme'
import { parseFenceWorkbook } from '@/lib/excel'
import { canEdit } from '@/lib/permissions'

const MODE_KEY = 'geofence-studio:mode'

function loadMode() {
  return localStorage.getItem(MODE_KEY) === 'rent' ? 'rent' : 'sale'
}

function Workbench({ theme, resolvedTheme, onThemeCycle, auth }) {
  const containerRef = useRef(null)
  const { map, AMap, status, error, coords, retry } = useAmap(containerRef)
  const { fences, syncStatus, insertFence, insertFences, updateFence, removeFence } = useFenceStore()
  const { city, setCity } = useCity({ map, AMap })

  // 纯本地模式（未配置 Supabase）不做权限约束；登录模式按角色门控
  const role = auth?.enabled ? auth.user?.role : 'admin'
  const canEditData = canEdit(role)

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
    locateFences,
    startEdit,
    stopEdit,
    cancelEdit,
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

  // ---- Excel 导入 ----
  const fileInputRef = useRef(null)
  const [importPreview, setImportPreview] = useState(null) // { entries, skipped }
  const pendingFitRef = useRef(null)

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const { entries, skipped } = parseFenceWorkbook(buf, mode)
      const withArea = entries.map((en) => ({
        ...en,
        area: AMap ? AMap.GeometryUtil.ringArea(en.path) : null,
      }))
      if (withArea.length === 0 && skipped.length === 0) {
        toast.warning('文件里没有可识别的围栏数据')
        return
      }
      setImportPreview({ entries: withArea, skipped })
    } catch (err) {
      toast.error(`解析失败：${err.message}`)
    }
  }

  const handleImportConfirm = (target) => {
    const { entries, skipped } = importPreview
    const items = entries.map((en) => ({
      mode: target === 'auto' ? en.mode : target,
      name: en.name,
      path: en.path,
      area: en.area ?? undefined,
    }))
    const created = insertFences(items)
    setImportPreview(null)
    toast.success(
      `导入完成：成功 ${created.length} 条${skipped.length ? ` / 跳过 ${skipped.length} 条` : ''}`,
    )
    if (created.length === 0) return
    // 导入目标与当前视图不一致时切过去，并 fitView 展示导入结果
    const targetMode = created[0].mode
    if (created.every((f) => f.mode === targetMode) && targetMode !== mode) setMode(targetMode)
    pendingFitRef.current = created.map((f) => f.id)
  }

  // 多边形同步完成后 fitView 到导入的围栏
  useEffect(() => {
    const ids = pendingFitRef.current
    if (!ids) return
    const visible = ids.filter((id) => modeFences.some((f) => f.id === id))
    if (visible.length === 0) return
    locateFences(visible)
    pendingFitRef.current = null
  }, [modeFences, locateFences])

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
        user={auth?.user ?? null}
        onLogout={auth?.logout}
        onChangePassword={auth?.changePassword}
      />

      {canEditData && (
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
      )}

      <FencePanel
        mode={mode}
        fences={modeFences}
        canEdit={canEditData}
        editingId={editingId}
        onLocate={locateFence}
        onStartEdit={startEdit}
        onStopEdit={stopEdit}
        onRename={(fence) => setRenaming({ id: fence.id, name: fence.name })}
        onExport={exportFence}
        onExportAll={exportAll}
        onImport={() => fileInputRef.current?.click()}
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
          <span className="text-[11px] text-muted-foreground">拖动白色锚点调整边界 · Esc 取消</span>
          <Button size="sm" variant="outline" onClick={cancelEdit}>
            取消
          </Button>
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

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        aria-label="选择围栏 Excel 文件"
        onChange={handleImportFile}
      />

      <ImportPreviewDialog
        open={Boolean(importPreview)}
        entries={importPreview?.entries}
        skipped={importPreview?.skipped}
        onConfirm={handleImportConfirm}
        onClose={() => setImportPreview(null)}
      />
    </div>
  )
}

export default function App() {
  const { theme, resolved, cycleTheme } = useTheme()
  const auth = useAuth()

  if (!hasAmapConfig) {
    return (
      <>
        <SetupGuide />
        <Toaster theme={resolved} />
      </>
    )
  }

  // 配置了 Supabase 才启用登录门槛；未配置时保持纯本地模式
  if (auth.enabled) {
    if (auth.checking) {
      return (
        <div className="flex h-full items-center justify-center bg-background">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-primary" />
        </div>
      )
    }
    if (!auth.user) {
      return (
        <TooltipProvider delayDuration={250}>
          <LoginPage
            onLogin={auth.login}
            themeSlot={<ThemeToggle theme={theme} onCycle={cycleTheme} />}
          />
          <Toaster theme={resolved} />
        </TooltipProvider>
      )
    }
  }

  return (
    <TooltipProvider delayDuration={250}>
      <Workbench theme={theme} resolvedTheme={resolved} onThemeCycle={cycleTheme} auth={auth} />
      <Toaster theme={resolved} />
    </TooltipProvider>
  )
}
