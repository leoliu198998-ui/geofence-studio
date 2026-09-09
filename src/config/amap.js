export const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || ''
export const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE || ''

/** 是否已配置高德 Key 与安全密钥 */
export const hasAmapConfig = Boolean(AMAP_KEY && AMAP_SECURITY_CODE)

export const AMAP_MAP_STYLE = 'amap://styles/darkblue'
export const AMAP_MAP_STYLE_LIGHT = 'amap://styles/normal'
