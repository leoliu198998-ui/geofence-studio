import { useEffect, useRef, useState } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'
import { AMAP_KEY, AMAP_MAP_STYLE, AMAP_SECURITY_CODE } from '@/config/amap'

const PLUGINS = ['AMap.AutoComplete', 'AMap.PlaceSearch', 'AMap.PolygonEditor', 'AMap.GeometryUtil']

/**
 * 加载高德 JS API 2.0 并初始化深色地图。
 * @param {React.RefObject<HTMLDivElement>} containerRef 地图容器
 * @returns {{ map: object|null, AMap: object|null, status: string, error: Error|null, coords: {lng:number,lat:number}|null, retry: () => void }}
 */
export function useAmap(containerRef) {
  const [state, setState] = useState({
    map: null,
    AMap: null,
    status: 'loading', // loading | ready | error
    error: null,
  })
  const [coords, setCoords] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const mapRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let map = null
    let handleMove = null

    window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE }

    setState({ map: null, AMap: null, status: 'loading', error: null })

    AMapLoader.load({ key: AMAP_KEY, version: '2.0', plugins: PLUGINS })
      .then((AMap) => {
        if (cancelled || !containerRef.current) return
        map = new AMap.Map(containerRef.current, {
          viewMode: '2D',
          zoom: 11,
          center: [116.397128, 39.916527],
          mapStyle: AMAP_MAP_STYLE,
        })
        mapRef.current = map
        handleMove = (e) => {
          setCoords({ lng: e.lnglat.getLng(), lat: e.lnglat.getLat() })
        }
        map.on('mousemove', handleMove)
        map.on('complete', () => {
          if (!cancelled) setState({ map, AMap, status: 'ready', error: null })
        })
        // complete 事件在个别环境下可能延迟，兜底置为 ready
        setTimeout(() => {
          if (!cancelled) {
            setState((s) => (s.status === 'loading' ? { map, AMap, status: 'ready', error: null } : s))
          }
        }, 3000)
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ map: null, AMap: null, status: 'error', error: err })
        }
      })

    return () => {
      cancelled = true
      if (map) {
        if (handleMove) map.off('mousemove', handleMove)
        map.destroy()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  return { ...state, coords, retry: () => setAttempt((n) => n + 1) }
}
