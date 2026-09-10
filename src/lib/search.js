/**
 * 围栏列表模糊搜索：按 code / 名称做大小写不敏感的子串匹配。
 * 空查询（或纯空白）返回原列表。
 */
export function filterFences(fences, query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return fences
  return fences.filter(
    (f) => f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q),
  )
}
