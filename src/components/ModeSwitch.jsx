import { cn } from '@/lib/utils'

const OPTIONS = [
  { value: 'sale', label: '买卖', sub: 'SALE' },
  { value: 'rent', label: '租赁', sub: 'RENT' },
]

/** 顶栏分段切换：买卖 / 租赁 视图 */
export function ModeSwitch({ mode, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="视图切换"
      className="flex items-center rounded-md border border-hairline bg-background/70 p-0.5 backdrop-blur-md"
    >
      {OPTIONS.map((opt) => {
        const active = mode === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              active
                ? 'bg-primary font-medium text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
            <span
              className={cn(
                'font-mono text-[9px] tracking-[0.16em]',
                active ? 'text-primary-foreground/70' : 'text-muted-foreground/60',
              )}
            >
              {opt.sub}
            </span>
          </button>
        )
      })}
    </div>
  )
}
