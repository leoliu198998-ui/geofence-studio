import { describe, expect, it } from 'vitest'
import { CITIES, searchCities } from '@/data/cities'

describe('searchCities', () => {
  it('空查询返回全部城市', () => {
    expect(searchCities('')).toHaveLength(CITIES.length)
    expect(searchCities('   ')).toHaveLength(CITIES.length)
  })

  it('按中文名模糊匹配', () => {
    const names = searchCities('上海').map((c) => c.name)
    expect(names).toContain('上海')
  })

  it('按拼音匹配（大小写不敏感）', () => {
    const lower = searchCities('shanghai').map((c) => c.name)
    const upper = searchCities('SHANGHAI').map((c) => c.name)
    expect(lower).toContain('上海')
    expect(upper).toEqual(lower)
  })

  it('拼音前缀命中多个城市', () => {
    const names = searchCities('s').map((c) => c.name)
    expect(names).toEqual(expect.arrayContaining(['上海', '深圳', '苏州']))
  })

  it('按区号匹配', () => {
    expect(searchCities('021').map((c) => c.name)).toContain('上海')
    expect(searchCities('0755').map((c) => c.name)).toContain('深圳')
  })

  it('按 adcode 匹配', () => {
    expect(searchCities('310000').map((c) => c.name)).toContain('上海')
  })

  it('无结果时返回空数组', () => {
    expect(searchCities('不存在的城市xyz')).toEqual([])
  })
})
