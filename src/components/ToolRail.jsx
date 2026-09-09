import { useEffect, useRef, useState } from 'react'
import { Check, Download, Hexagon, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

function ToolButton({ label, active, onClick, disabled, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            'h-10 w-10 text-muted-foreground hover:text-foreground',
            active && 'bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary',
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * 左侧窄工具列：绘制 / 导出全部 / 清除全部。
 */
export function ToolRail({ drawing, editing, hasFences, onStartDraw, onFinishDraw, onCancelDraw, onExportAll, onClearAll }) {
  const [armingClear, setArmingClear] = useState(false)
  const armTimerRef = useRef(null)

  useEffect(() => () => clearTimeout(armTimerRef.current), [])

  const handleClear = () => {
    if (!armingClear) {
      setArmingClear(true)
      armTimerRef.current = setTimeout(() => setArmingClear(false), 2600)
      return
    }
    clearTimeout(armTimerRef.current)
    setArmingClear(false)
    onClearAll()
  }

  return (
    <nav
      aria-label="工具列"
      className="hud-panel absolute left-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 p-1.5"
    >
      {drawing ? (
        <>
          <ToolButton label="完成绘制（回车）" active onClick={onFinishDraw}>
            <Check />
          </ToolButton>
          <ToolButton label="取消绘制（Esc）" onClick={onCancelDraw}>
            <X />
          </ToolButton>
        </>
      ) : (
        <ToolButton label="绘制多边形围栏" onClick={onStartDraw} disabled={editing}>
          <Hexagon />
        </ToolButton>
      )}
      <div className="mx-2 my-0.5 h-px bg-hairline" />
      <ToolButton label="导出全部围栏 (GeoJSON)" onClick={onExportAll} disabled={!hasFences}>
        <Download />
      </ToolButton>
      <ToolButton
        label={armingClear ? '再次点击确认清除' : '清除全部围栏'}
        active={armingClear}
        onClick={handleClear}
        disabled={!hasFences}
      >
        <Trash2 />
      </ToolButton>
    </nav>
  )
}
