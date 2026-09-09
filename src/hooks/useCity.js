import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_CITY } from '@/data/cities'

const CITY_KEY = 'geofence-studio:city'

function loadSavedCity() {
  try {
    const raw = localStorage.getItem(CITY_KEY)
    const c = raw ? JSON.parse(raw) : null
    return c && Array.isArray(c.center) ? c : null
  } catch {
    return null
  }
}

/** CitySearch 返回的 rectangle: 'lng,lat;lng,lat' */
function rectToBounds(AMap, rectangle) {
  const [sw, ne] = rectangle.split(';').map((p) => p.split(',').map(Number))
  return new AMap.Bounds(sw, ne)
}

/**
 * 城市定位：记忆城市 > CitySearch IP 定位 > 默认上海；
 * 无记忆城市时同时尝试浏览器精确定位（授权后打点并放大），失败静默回退。
 */
export function useCity({ map, AMap }) {
  const [city, setCityState] = useState(loadSavedCity)
  const geoMarkerRef = useRef(null)
  const bootedRef = useRef(false)

  const setCity = useCallback(
    (next, { fly = true } = {}) => {
      setCityState(next)
      try {
        localStorage.setItem(CITY_KEY, JSON.stringify(next))
      } catch {
        // 忽略
      }
      if (fly && map) map.setZoomAndCenter(11, next.center, false, 600)
    },
    [map],
  )

  useEffect(() => {
    if (!map || !AMap || bootedRef.current) return
    bootedRef.current = true

    const saved = loadSavedCity()
    if (saved) {
      // 记忆城市优先，不再自动定位
      map.setZoomAndCenter(11, saved.center)
      return
    }

    const fallback = () => setCityState(DEFAULT_CITY)

    const citySearch = new AMap.CitySearch()
    citySearch.getLocalCity((status, result) => {
      if (status === 'complete' && result?.city) {
        const rect = result.rectangle
        const next = {
          name: result.city,
          adcode: String(result.adcode || ''),
          center: rect ? rectToBounds(AMap, rect).getCenter().toArray() : DEFAULT_CITY.center,
        }
        setCityState(next)
        try {
          localStorage.setItem(CITY_KEY, JSON.stringify(next))
        } catch {
          // 忽略
        }
        if (rect) map.setBounds(rectToBounds(AMap, rect), false, [40, 40, 40, 40])
        else map.setZoomAndCenter(11, next.center)
      } else {
        fallback()
      }
    })

    // 浏览器精确定位：授权后打当前位置标记并放大；失败/拒绝静默
    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 8000,
      showButton: false,
      showMarker: false,
      showCircle: false,
    })
    geolocation.getCurrentPosition((status, result) => {
      if (status !== 'complete' || !result?.position) return
      const lnglat = [result.position.getLng(), result.position.getLat()]
      geoMarkerRef.current?.setMap(null)
      const marker = new AMap.Marker({
        position: lnglat,
        anchor: 'center',
        zIndex: 60,
        content:
          '<div style="width:14px;height:14px;border-radius:50%;background:#FF5A1F;border:3px solid rgba(255,90,31,0.35);box-shadow:0 0 0 2px #0B0F14;"></div>',
        title: '当前位置',
      })
      marker.setMap(map)
      geoMarkerRef.current = marker
      map.setZoomAndCenter(15, lnglat, false, 600)
    })
  }, [map, AMap])

  return { city, setCity }
}
