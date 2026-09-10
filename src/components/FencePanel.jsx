import { useEffect } from 'react'
import { Check, Crosshair, Download, PenLine, Ruler, Trash2, Type, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatArea, formatDateTime } from '@/lib/format'

function ActionButton({ label, onClick, danger, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          className={`flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent ${
            danger ? 'hover:text-destructive' : 'hover:text-foreground'
          } [&_svg]:h-3.5 [&_svg]:w-3.5`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * 右侧围栏列表面板 —— 测量日志样式（按当前视图模式过滤）。
 */
export function FencePanel({
  mode,
  fences,
  editingId,
  onLocate,
  onStartEdit,
  onStopEdit,
  onRename,
  onExport,
  onExportAll,
  onImport,
  onRemove,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
}) {
  const modeLabel = mode === 'rent' ? '租赁' : '买卖'

  // 地图上点击围栏选中时，滚动到列表对应项
  useEffect(() => {
    if (!selectedId) return
    document
      .querySelector(`[data-fence-row="${selectedId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedId])

  return (
    <aside className="hud-panel absolute bottom-4 right-4 top-[4.5rem] z-20 hidden w-[320px] flex-col md:flex">
      <div className="flex items-center justify-between px-4 pb-2.5 pt-3.5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold tracking-wide">测量日志</h2>
          <span className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground">
            SURVEY LOG · {modeLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={fences.length > 0 ? 'default' : 'secondary'}>
            {String(fences.length).padStart(2, '0')}
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="导入围栏 Excel" onClick={onImport}>
                <Upload className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">导入 Excel (.xlsx)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="导出全部围栏"
                disabled={fences.length === 0}
                onClick={onExportAll}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">导出全部 (Excel)</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <Separator />
      {fences.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full rounded-md border border-dashed border-hairline px-5 py-8 text-center">
            <Ruler className="mx-auto mb-3 h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-foreground">还没有{modeLabel}围栏记录</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              点击左侧的绘制工具，
              <br />
              在地图上圈出第一块区域。
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <ol className="p-2">
            {fences.map((fence, idx) => {
              const editing = editingId === fence.id
              return (
                <li key={fence.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    data-fence-row={fence.id}
                    onClick={() => {
                      onSelect?.(fence.id)
                      onLocate(fence.id)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onSelect?.(fence.id)
                        onLocate(fence.id)
                      }
                    }}
                    onMouseEnter={() => onHover?.(fence.id)}
                    onMouseLeave={() => onHover?.(null)}
                    className={`group w-full cursor-pointer rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent/60 ${
                      editing ? 'bg-primary/10 ring-1 ring-primary/40' : ''
                    } ${selectedId === fence.id ? 'bg-accent/70 ring-1 ring-primary/50' : ''} ${
                      hoveredId === fence.id ? 'bg-accent/60' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <span className="tabular font-mono text-xs font-semibold text-primary">
                          {fence.code}
                        </span>
                        <span className="truncate text-sm text-foreground">{fence.name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        {editing ? (
                          <ActionButton label="完成编辑" onClick={onStopEdit}>
                            <Check className="text-success" />
                          </ActionButton>
                        ) : (
                          <>
                            <ActionButton label="定位" onClick={() => onLocate(fence.id)}>
                              <Crosshair />
                            </ActionButton>
                            <ActionButton label="编辑顶点" onClick={() => onStartEdit(fence.id)}>
                              <PenLine />
                            </ActionButton>
                            <ActionButton label="重命名" onClick={() => onRename(fence)}>
                              <Type />
                            </ActionButton>
                            <ActionButton label="导出 Excel" onClick={() => onExport(fence.id)}>
                              <Download />
                            </ActionButton>
                            <ActionButton label="删除" danger onClick={() => onRemove(fence.id)}>
                              <Trash2 />
                            </ActionButton>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="tabular mt-1 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                      <span>{formatArea(fence.area)}</span>
                      <span aria-hidden>·</span>
                      <span>{fence.path.length} 顶点</span>
                      <span aria-hidden>·</span>
                      <span>{formatDateTime(fence.createdAt)}</span>
                    </div>
                  </div>
                  {idx < fences.length - 1 && <Separator className="mx-3 w-auto opacity-50" />}
                </li>
              )
            })}
          </ol>
        </ScrollArea>
      )}
    </aside>
  )
}
