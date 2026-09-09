import { useEffect, useRef, useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'

/**
 * 顶部搜索：AutoComplete 输入提示 + PlaceSearch POI 搜索。
 * @param {{ AMap: object|null, map: object|null }} props
 */
export function SearchBox({ AMap, map }) {
  const [keyword, setKeyword] = useState('')
  const [tips, setTips] = useState([])
  const [results, setResults] = useState(null) // null=未搜索, []=无结果
  const [open, setOpen] = useState(false)
  const autoCompleteRef = useRef(null)
  const placeSearchRef = useRef(null)
  const markerRef = useRef(null)
  const blurTimerRef = useRef(null)

  useEffect(() => {
    if (!AMap) return
    autoCompleteRef.current = new AMap.AutoComplete({ city: '全国', citylimit: false })
    placeSearchRef.current = new AMap.PlaceSearch({ pageSize: 8, pageIndex: 1 })
  }, [AMap])

  useEffect(() => () => clearTimeout(blurTimerRef.current), [])

  const placeMarker = (lng, lat, title) => {
    if (!map || !AMap) return
    markerRef.current?.setMap(null)
    const marker = new AMap.Marker({
      position: [lng, lat],
      title,
      anchor: 'bottom-center',
    })
    marker.setMap(map)
    markerRef.current = marker
  }

  const runSearch = (kw) => {
    const q = kw.trim()
    if (!q || !placeSearchRef.current) return
    placeSearchRef.current.search(q, (status, result) => {
      if (status === 'complete' && result.poiList?.pois?.length) {
        setResults(result.poiList.pois)
        setTips([])
        setOpen(true)
      } else {
        setResults([])
        setOpen(true)
        toast.warning(`没有找到与「${q}」相关的地点`)
      }
    })
  }

  const handleChange = (e) => {
    const value = e.target.value
    setKeyword(value)
    setResults(null)
    const q = value.trim()
    if (!q) {
      setTips([])
      setOpen(false)
      return
    }
    autoCompleteRef.current?.search(q, (status, result) => {
      if (status === 'complete') {
        setTips((result.tips || []).filter((t) => t.name).slice(0, 8))
        setOpen(true)
      }
    })
  }

  const handleSelectPoi = (poi) => {
    const { lng, lat } = poi.location
    map?.setZoomAndCenter(16, [lng, lat], false, 400)
    placeMarker(lng, lat, poi.name)
    setKeyword(poi.name)
    setOpen(false)
    setResults(null)
    setTips([])
  }

  const showList = results ?? tips

  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={keyword}
        onChange={handleChange}
        onFocus={() => showList.length > 0 && setOpen(true)}
        onBlur={() => {
          blurTimerRef.current = setTimeout(() => setOpen(false), 150)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') runSearch(keyword)
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder="搜索小区 / 住宅区，回车搜索…"
        className="h-9 border-hairline bg-background/70 pl-9 backdrop-blur-md"
        aria-label="搜索小区"
      />
      {open && (
        <div className="hud-panel absolute left-0 right-0 top-11 z-40 max-h-72 overflow-y-auto p-1 animate-slide-up">
          {showList.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">
              {results ? '没有找到相关地点，换个关键词试试' : '输入关键词获取提示'}
            </p>
          ) : (
            showList.map((item, i) => {
              const isPoi = Boolean(item.location)
              const name = item.name
              const addr = isPoi
                ? item.address || ''
                : `${item.district || ''}${item.address || ''}`
              return (
                <button
                  key={`${item.id || name}-${i}`}
                  type="button"
                  className="flex w-full items-start gap-2.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    if (isPoi) handleSelectPoi(item)
                    else runSearch(name)
                  }}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-foreground">{name}</span>
                    {addr && (
                      <span className="block truncate text-xs text-muted-foreground">{addr}</span>
                    )}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
