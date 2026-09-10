import { describe, expect, it } from 'vitest'
import { filterFences } from '../search'

const FENCES = [
  { id: '1', mode: 'sale', code: 'S-001', name: '大宁地区' },
  { id: '2', mode: 'sale', code: 'S-002', name: '望京 SOHO 周边' },
  { id: '3', mode: 'rent', code: 'R-001', name: '中关村壹号' },
]

describe('filterFences', () => {
  it('空查询返回全部围栏', () => {
    expect(filterFences(FENCES, '')).toEqual(FENCES)
    expect(filterFences(FENCES, '   ')).toEqual(FENCES)
  })

  it('按名称子串匹配', () => {
    expect(filterFences(FENCES, '大宁')).toEqual([FENCES[0]])
    expect(filterFences(FENCES, '中关村')).toEqual([FENCES[2]])
  })

  it('按编号子串匹配，大小写不敏感', () => {
    expect(filterFences(FENCES, 's-00')).toEqual([FENCES[0], FENCES[1]])
    expect(filterFences(FENCES, 'R-0')).toEqual([FENCES[2]])
    expect(filterFences(FENCES, 'soho')).toEqual([FENCES[1]])
    expect(filterFences(FENCES, '不存在的围栏')).toEqual([])
  })
})
