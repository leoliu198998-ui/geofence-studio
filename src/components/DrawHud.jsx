import { Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatArea, formatLength } from '@/lib/format'

/** 绘制中的底部 HUD：实时顶点数 / 面积 / 周长 */
export function DrawHud({ stats, onFinish, onCancel }) {
  return (
    <div className="hud-panel absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4 px-4 py-2.5 animate-slide-up">
      <Badge>绘制中</Badge>
      <div className="tabular flex items-center gap-3 font-mono text-xs text-muted-foreground">
        <span>
          顶点 <span className="text-foreground">{stats?.count ?? 0}</span>
        </span>
        <span>
          面积 <span className="text-primary">{formatArea(stats?.area ?? 0)}</span>
        </span>
        <span>
          周长 <span className="text-foreground">{formatLength(stats?.perimeter ?? 0)}</span>
        </span>
      </div>
      <span className="hidden text-[11px] text-muted-foreground lg:inline">
        单击加顶点 · 双击 / 回车结束 · Esc 取消
      </span>
      <div className="flex items-center gap-1.5">
        <Button size="sm" onClick={onFinish}>
          <Check className="h-3.5 w-3.5" />
          完成
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
          取消
        </Button>
      </div>
    </div>
  )
}
