import { useEffect, useRef, useState } from 'react'
import { ChevronDown, MapPin, Search } from 'lucide-react'
import { HOT_CITIES, CITIES, searchCities } from '@/data/cities'
import { cn } from '@/lib/utils'

/**
 * 顶栏城市切换器：当前城市 + adcode 小标，点击展开热门城市 / 搜索面板。
 */
export function CitySwitcher({ city, onSelect }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const results = searchCities(query)
  const hot = CITIES.filter((c) => HOT_CITIES.includes(c.name))

  const pick = (c) => {
    onSelect({ name: c.name, adcode: c.adcode, center: c.center })
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="切换城市"
        className="flex h-8 items-center gap-1.5 rounded-md border border-hairline bg-background/70 px-2.5 text-xs text-foreground backdrop-blur-md transition-colors hover:bg-accent"
      >
        <MapPin className="h-3.5 w-3.5 text-primary" />
        <span>{city?.name || '定位中'}</span>
        {city?.adcode && (
          <span className="tabular font-mono text-[9px] tracking-wider text-muted-foreground">
            {city.adcode}
          </span>
        )}
        <ChevronDown
          className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="hud-panel absolute left-0 top-10 z-40 w-72 p-3 animate-slide-up">
          <p className="mb-2 font-mono text-[9px] tracking-[0.2em] text-muted-foreground">
            热门城市
          </p>
          <div className="flex flex-wrap gap-1.5">
            {hot.map((c) => (
              <button
                key={c.adcode}
                type="button"
                onClick={() => pick(c)}
                className={cn(
                  'rounded-sm border px-2 py-1 text-xs transition-colors',
                  city?.adcode === c.adcode
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-hairline text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="my-3 h-px bg-hairline" />

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="城市名 / 拼音 / 区号"
              aria-label="搜索城市"
              className="h-8 w-full rounded-md border border-hairline bg-background/60 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="mt-2 max-h-44 overflow-y-auto">
            {results.length === 0 ? (
              <p className="px-2 py-2.5 text-xs text-muted-foreground">没有匹配的城市</p>
            ) : (
              results.map((c) => (
                <button
                  key={c.adcode}
                  type="button"
                  onClick={() => pick(c)}
                  className="flex w-full items-baseline justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
                >
                  <span className="text-xs text-foreground">{c.name}</span>
                  <span className="tabular font-mono text-[10px] text-muted-foreground">
                    {c.adcode} · {c.areaCode}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
