import * as XLSX from 'xlsx'

export const FENCE_SHEET_NAME = '运营区围栏清单'
const EXPORT_HEADERS = ['对应区域', 'point_id（点位 ID）', 'longitude（经度）', 'latitude（纬度）']

/** 表头列定位：按关键字模糊匹配，容忍括号/空格差异 */
function findCol(header, ...keywords) {
  return header.findIndex((cell) => {
    const text = String(cell ?? '').replace(/\s/g, '')
    return keywords.every((k) => text.includes(k))
  })
}

function inferMode(name, defaultMode) {
  if (name.includes('买卖')) return 'sale'
  if (name.includes('租赁')) return 'rent'
  return defaultMode
}

/**
 * 解析运营区围栏清单 xlsx（sheet `运营区围栏清单`，缺失时回退第 2 个 sheet）。
 * 分组规则：每个唯一「细化四至」= 一个多边形，顶点按 point_id 升序；
 * 显示名：细化四至 == 对应区域 时用对应区域，否则用细化四至；
 * 校验：去重后不足 3 个不同顶点的跳过并给出原因。
 * 坐标为 GCJ-02，直接使用。
 * @param {ArrayBuffer} data
 * @param {'sale'|'rent'} defaultMode 名称无法推断时的默认视图
 * @returns {{ entries: Array<{ name: string, mode: string, path: number[][] }>,
 *   skipped: Array<{ name: string, reason: string }> }}
 */
export function parseFenceWorkbook(data, defaultMode = 'sale') {
  const wb = XLSX.read(data, { type: 'array' })
  const ws = wb.Sheets[FENCE_SHEET_NAME] || wb.Sheets[wb.SheetNames[1]] || wb.Sheets[wb.SheetNames[0]]
  if (!ws) throw new Error('文件里没有可用的工作表')
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
  if (rows.length < 2) throw new Error('工作表为空或缺少数据行')

  const header = rows[0].map((c) => String(c ?? ''))
  const colRegion = findCol(header, '对应区域')
  const colDetail = findCol(header, '细化四至')
  const colPid = findCol(header, 'point_id') >= 0 ? findCol(header, 'point_id') : findCol(header, '点位')
  const colLng = findCol(header, 'longitude') >= 0 ? findCol(header, 'longitude') : findCol(header, '经度')
  const colLat = findCol(header, 'latitude') >= 0 ? findCol(header, 'latitude') : findCol(header, '纬度')
  const colGroup = colDetail >= 0 ? colDetail : colRegion
  if (colGroup < 0 || colLng < 0 || colLat < 0) {
    throw new Error('缺少必需列（细化四至或对应区域 / 经度 / 纬度），请使用标准模板')
  }

  // 按细化四至分组（无细化四至列时按对应区域），保持出现顺序
  const groups = new Map()
  for (const row of rows.slice(1)) {
    if (!row) continue
    const detail = String(row[colGroup] ?? '').trim()
    if (!detail) continue
    if (!groups.has(detail)) groups.set(detail, { region: '', points: [] })
    const g = groups.get(detail)
    if (!g.region && colRegion >= 0) g.region = String(row[colRegion] ?? '').trim()
    const lng = Number(row[colLng])
    const lat = Number(row[colLat])
    const pid = colPid >= 0 ? Number(row[colPid]) : g.points.length
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue
    g.points.push({ pid: Number.isFinite(pid) ? pid : g.points.length, lng, lat })
  }

  const entries = []
  const skipped = []
  for (const [detail, g] of groups) {
    const displayName = detail === g.region ? g.region : detail
    const sorted = [...g.points].sort((a, b) => a.pid - b.pid)
    const seen = new Set()
    const path = []
    for (const p of sorted) {
      const key = `${p.lng},${p.lat}`
      if (seen.has(key)) continue
      seen.add(key)
      path.push([p.lng, p.lat])
    }
    if (path.length < 3) {
      skipped.push({
        name: displayName,
        reason: `去重后仅 ${path.length} 个不同顶点，不足 3 个，无法构成多边形`,
      })
      continue
    }
    entries.push({ name: displayName, mode: inferMode(displayName, defaultMode), path })
  }
  return { entries, skipped }
}

/**
 * 围栏列表 → 导出行（不含表头）。
 * 导出列：对应区域 / point_id / 经度 / 纬度；point_id 从 0 递增。
 */
export function fencesToSheetRows(fences) {
  const rows = []
  for (const f of fences) {
    f.path.forEach((p, i) => {
      rows.push([f.name, i, p[0], p[1]])
    })
  }
  return rows
}

/** 导出围栏为 xlsx，sheet 名 `运营区围栏清单` */
export function downloadFencesXlsx(fences, filename) {
  const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...fencesToSheetRows(fences)])
  ws['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 14 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, FENCE_SHEET_NAME)
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
