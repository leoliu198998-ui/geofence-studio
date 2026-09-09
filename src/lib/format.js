/** 面积格式化：<1 k㎡ 用 ㎡，否则 k㎡ */
export function formatArea(sqm) {
  if (sqm == null || Number.isNaN(sqm)) return '—'
  if (sqm < 1_000_000) {
    return `${sqm.toLocaleString('zh-CN', { maximumFractionDigits: 1 })} ㎡`
  }
  return `${(sqm / 1_000_000).toFixed(3)} k㎡`
}

/** 周长/距离格式化：<1 km 用 m，否则 km */
export function formatLength(m) {
  if (m == null || Number.isNaN(m)) return '—'
  if (m < 1000) return `${m.toFixed(1)} m`
  return `${(m / 1000).toFixed(3)} km`
}

/** 经纬度：固定 6 位小数 */
export function formatCoord(value) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(6)
}

/** 创建时间：YYYY-MM-DD HH:mm */
export function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
