import { formatCoord } from '@/lib/format'

/** 右下角实时经纬度读数 */
export function CoordsHud({ coords }) {
  return (
    <div
      aria-live="off"
      className="tabular pointer-events-none absolute bottom-4 right-4 z-10 rounded-md border border-hairline bg-background/70 px-3 py-1.5 font-mono text-[11px] text-muted-foreground backdrop-blur-md md:right-[344px]"
    >
      <span className="text-foreground/80">LNG</span> {formatCoord(coords?.lng)}
      <span className="mx-2 text-hairline">|</span>
      <span className="text-foreground/80">LAT</span> {formatCoord(coords?.lat)}
    </div>
  )
}
