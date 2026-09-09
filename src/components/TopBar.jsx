import { Hexagon } from 'lucide-react'
import { SearchBox } from '@/components/SearchBox'

export function TopBar({ AMap, map }) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-14 items-center gap-4 border-b border-hairline bg-background/70 px-4 backdrop-blur-md">
      <div className="pointer-events-auto flex shrink-0 items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Hexagon className="h-4 w-4" strokeWidth={2.4} />
        </span>
        <span className="font-display text-[15px] font-bold tracking-wide">围界</span>
        <span className="font-mono text-[10px] font-medium tracking-[0.22em] text-muted-foreground">
          GEOSTUDIO
        </span>
      </div>
      <div className="pointer-events-auto mx-auto w-full max-w-xl">
        <SearchBox AMap={AMap} map={map} />
      </div>
      <div className="hidden shrink-0 font-mono text-[10px] tracking-widest text-muted-foreground lg:block">
        AMAP JS API 2.0
      </div>
    </header>
  )
}
