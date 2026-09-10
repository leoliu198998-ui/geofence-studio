import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { FENCE_SHEET_NAME, fencesToSheetRows, parseFenceWorkbook } from '@/lib/excel'

const TEMPLATE_HEADERS = [
  '事业部',
  '对应区域',
  '细化四至',
  'point_id（点位 ID）',
  'longitude（经度）',
  'latitude（纬度）',
]

function toXlsx(rows, sheetName = FENCE_SHEET_NAME) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
}

describe('parseFenceWorkbook', () => {
  it('解析标准模板：按细化四至分组，名称规则 C==B 用 B 否则用 C', () => {
    const buf = toXlsx([
      TEMPLATE_HEADERS,
      ['杨浦事业部', '黄兴买卖区', '黄兴买卖区', 0, 121.5, 31.3],
      ['杨浦事业部', '黄兴买卖区', '黄兴买卖区', 1, 121.6, 31.3],
      ['杨浦事业部', '黄兴买卖区', '黄兴买卖区', 2, 121.55, 31.35],
      ['杨浦事业部', '彭虹买卖区', '彭虹买卖区1', 0, 121.4, 31.29],
      ['杨浦事业部', '彭虹买卖区', '彭虹买卖区1', 1, 121.45, 31.29],
      ['杨浦事业部', '彭虹买卖区', '彭虹买卖区1', 2, 121.42, 31.31],
    ])
    const { entries, skipped } = parseFenceWorkbook(buf)
    expect(skipped).toEqual([])
    expect(entries.map((e) => e.name)).toEqual(['黄兴买卖区', '彭虹买卖区1'])
    expect(entries[0].path).toHaveLength(3)
    expect(entries.every((e) => e.mode === 'sale')).toBe(true)
  })

  it('顶点按 point_id 升序，与行顺序无关', () => {
    const buf = toXlsx([
      TEMPLATE_HEADERS,
      ['', '甲区', '甲区', 2, 3, 3],
      ['', '甲区', '甲区', 0, 1, 1],
      ['', '甲区', '甲区', 1, 2, 2],
    ])
    const { entries } = parseFenceWorkbook(buf)
    expect(entries[0].path).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ])
  })

  it('脏数据：去重后不足 3 个不同顶点的条目跳过并注明原因', () => {
    const buf = toXlsx([
      TEMPLATE_HEADERS,
      ['', '彭虹买卖区', '彭虹买卖区2', 0, 121.4, 31.29],
      ['', '彭虹买卖区', '彭虹买卖区2', 1, 121.4, 31.29],
      ['', '彭虹买卖区', '彭虹买卖区2', 2, 121.4, 31.29],
    ])
    const { entries, skipped } = parseFenceWorkbook(buf)
    expect(entries).toEqual([])
    expect(skipped).toHaveLength(1)
    expect(skipped[0].name).toBe('彭虹买卖区2')
    expect(skipped[0].reason).toContain('不足 3 个')
  })

  it('相同坐标只保留一次（同组内重复点去重）', () => {
    const buf = toXlsx([
      TEMPLATE_HEADERS,
      ['', '甲区', '甲区', 0, 1, 1],
      ['', '甲区', '甲区', 1, 2, 2],
      ['', '甲区', '甲区', 2, 2, 2],
      ['', '甲区', '甲区', 3, 3, 3],
    ])
    const { entries } = parseFenceWorkbook(buf)
    expect(entries[0].path).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ])
  })

  it('缺细化四至列时回退按对应区域分组（兼容四列导出格式）', () => {
    const buf = toXlsx([
      ['对应区域', 'point_id（点位 ID）', 'longitude（经度）', 'latitude（纬度）'],
      ['大宁地区', 0, 121.41, 31.29],
      ['大宁地区', 1, 121.42, 31.29],
      ['大宁地区', 2, 121.41, 31.3],
    ])
    const { entries, skipped } = parseFenceWorkbook(buf)
    expect(skipped).toEqual([])
    expect(entries).toHaveLength(1)
    expect(entries[0].name).toBe('大宁地区')
  })

  it('视图推断：租赁→rent，无法推断时用默认视图', () => {
    const buf = toXlsx([
      TEMPLATE_HEADERS,
      ['', '古北租赁区', '古北租赁区', 0, 1, 1],
      ['', '古北租赁区', '古北租赁区', 1, 2, 1],
      ['', '古北租赁区', '古北租赁区', 2, 1, 2],
      ['', '望京', '望京', 0, 3, 3],
      ['', '望京', '望京', 1, 4, 3],
      ['', '望京', '望京', 2, 3, 4],
    ])
    const { entries } = parseFenceWorkbook(buf, 'rent')
    expect(entries[0].mode).toBe('rent')
    expect(entries[1].mode).toBe('rent')
    const { entries: saleDefault } = parseFenceWorkbook(buf, 'sale')
    expect(saleDefault[1].mode).toBe('sale')
  })

  it('非数字坐标行被忽略', () => {
    const buf = toXlsx([
      TEMPLATE_HEADERS,
      ['', '甲区', '甲区', 0, 1, 1],
      ['', '甲区', '甲区', 1, 'abc', null],
      ['', '甲区', '甲区', 2, 2, 2],
      ['', '甲区', '甲区', 3, 3, 3],
    ])
    const { entries } = parseFenceWorkbook(buf)
    expect(entries[0].path).toHaveLength(3)
  })

  it('缺少必需列（经度/纬度）时抛错', () => {
    const buf = toXlsx([
      ['对应区域', '细化四至', 'point_id'],
      ['甲区', '甲区', 0],
    ])
    expect(() => parseFenceWorkbook(buf)).toThrow('缺少必需列')
  })

  it('空工作表抛错', () => {
    const buf = toXlsx([TEMPLATE_HEADERS])
    expect(() => parseFenceWorkbook(buf)).toThrow('工作表为空')
  })
})

describe('fencesToSheetRows', () => {
  const fences = [
    { name: '大宁地区', path: [[121.41, 31.29], [121.42, 31.29], [121.41, 31.3]] },
    { name: '黄兴买卖区', path: [[121.5, 31.3], [121.6, 31.3], [121.55, 31.35], [121.52, 31.32]] },
  ]

  it('导出为四列：对应区域 / point_id / 经度 / 纬度', () => {
    const rows = fencesToSheetRows(fences)
    expect(rows).toHaveLength(7)
    expect(rows[0]).toEqual(['大宁地区', 0, 121.41, 31.29])
    expect(rows[2]).toEqual(['大宁地区', 2, 121.41, 31.3])
  })

  it('point_id 每条围栏从 0 重新递增', () => {
    const rows = fencesToSheetRows(fences)
    expect(rows.slice(0, 3).map((r) => r[1])).toEqual([0, 1, 2])
    expect(rows.slice(3).map((r) => r[1])).toEqual([0, 1, 2, 3])
  })
})

describe('导入 ↔ 导出 round-trip', () => {
  it('导出的四列 xlsx 再导入，名称与坐标完全还原', () => {
    const fences = [
      { name: '黄兴买卖区', path: [[121.5458, 31.29809], [121.5501, 31.2989], [121.552, 31.295]] },
      { name: '彭虹买卖区1', path: [[121.4671, 31.29245], [121.4699, 31.2931], [121.468, 31.2901]] },
    ]
    const rows = [
      ['对应区域', 'point_id（点位 ID）', 'longitude（经度）', 'latitude（纬度）'],
      ...fencesToSheetRows(fences),
    ]
    const { entries, skipped } = parseFenceWorkbook(toXlsx(rows))
    expect(skipped).toEqual([])
    expect(entries.map((e) => e.name)).toEqual(fences.map((f) => f.name))
    expect(entries.map((e) => e.path)).toEqual(fences.map((f) => f.path))
  })

  it('导出文件可被 sheet 名 `运营区围栏清单` 直接命中', () => {
    expect(FENCE_SHEET_NAME).toBe('运营区围栏清单')
  })
})
