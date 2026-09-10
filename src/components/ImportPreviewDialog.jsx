import { useState } from 'react'
import { FileUp, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { formatArea } from '@/lib/format'
import { MODE_LABEL } from '@/hooks/useFenceStore'

const TARGET_OPTIONS = [
  { value: 'auto', label: '按名称推断' },
  { value: 'sale', label: '买卖' },
  { value: 'rent', label: '租赁' },
]

/**
 * Excel 导入预览对话框（测量日志风）。
 * @param {{ open: boolean, entries: Array<{ name, mode, path, area }>,
 *   skipped: Array<{ name, reason }>, onConfirm: (target: string) => void, onClose: () => void }} props
 */
export function ImportPreviewDialog({ open, entries = [], skipped = [], onConfirm, onClose }) {
  const [target, setTarget] = useState('auto')
  const [prevOpen, setPrevOpen] = useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setTarget('auto')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-4 w-4 text-primary" />
            导入预览
            <span className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground">
              IMPORT · 运营区围栏清单
            </span>
          </DialogTitle>
          <DialogDescription>
            解析出 {entries.length} 条有效围栏
            {skipped.length > 0 ? `，${skipped.length} 条无效已跳过` : ''}。坐标按 GCJ-02 直接使用。
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 rounded-md border border-hairline px-3 py-2">
          <span className="text-xs text-muted-foreground">导入目标视图</span>
          <div className="flex items-center gap-1">
            {TARGET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTarget(opt.value)}
                className={`h-6 rounded-sm px-2.5 font-mono text-[11px] transition-colors ${
                  target === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="max-h-64">
          <ol className="space-y-1 pr-3">
            {entries.map((e, i) => (
              <li
                key={`${e.name}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-hairline/60 px-3 py-2"
              >
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate text-sm text-foreground">{e.name}</span>
                  <Badge variant={e.mode === 'rent' ? 'secondary' : 'default'}>
                    {MODE_LABEL[target === 'auto' ? e.mode : target]}
                  </Badge>
                </div>
                <div className="tabular flex shrink-0 items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <span>{e.path.length} 顶点</span>
                  <span aria-hidden>·</span>
                  <span>{formatArea(e.area)}</span>
                </div>
              </li>
            ))}
          </ol>
          {skipped.length > 0 && (
            <>
              <Separator className="my-2" />
              <p className="mb-1.5 flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                <TriangleAlert className="h-3.5 w-3.5 text-destructive" />
                以下条目无效，导入时跳过
              </p>
              <ol className="space-y-1 pr-3">
                {skipped.map((s, i) => (
                  <li
                    key={`${s.name}-${i}`}
                    className="rounded-md border border-dashed border-destructive/40 px-3 py-2"
                  >
                    <p className="text-sm text-muted-foreground line-through">{s.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-destructive/90">{s.reason}</p>
                  </li>
                ))}
              </ol>
            </>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={() => onConfirm(target)} disabled={entries.length === 0}>
            确认导入 {entries.length > 0 ? `${entries.length} 条` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
