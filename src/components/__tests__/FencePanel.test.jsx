import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FencePanel } from '@/components/FencePanel'
import { TooltipProvider } from '@/components/ui/tooltip'

const FENCE = {
  id: 'f1',
  mode: 'sale',
  code: 'S-001',
  name: '大宁地区',
  path: [
    [121.4, 31.2],
    [121.5, 31.2],
    [121.5, 31.3],
  ],
  area: 1000000,
  createdAt: '2026-09-10T01:00:00.000Z',
}

const noop = vi.fn()

function renderPanel(canEdit) {
  return render(
    <TooltipProvider>
      <FencePanel
        mode="sale"
        fences={[FENCE]}
        canEdit={canEdit}
        editingId={null}
        onLocate={noop}
        onStartEdit={noop}
        onStopEdit={noop}
        onRename={noop}
        onExport={noop}
        onExportAll={noop}
        onImport={noop}
        onRemove={noop}
        hoveredId={null}
        selectedId={null}
        onHover={noop}
        onSelect={noop}
      />
    </TooltipProvider>,
  )
}

describe('FencePanel 权限门控', () => {
  it('只读：保留搜索与定位，隐藏全部数据操作', () => {
    renderPanel(false)
    expect(screen.getByLabelText('搜索围栏')).toBeInTheDocument()
    expect(screen.getByLabelText('定位')).toBeInTheDocument()
    for (const label of [
      '编辑顶点',
      '重命名',
      '导出 Excel',
      '删除',
      '导入围栏 Excel',
      '导出全部围栏',
    ]) {
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
    }
  })

  it('可编辑：全部操作可见', () => {
    renderPanel(true)
    for (const label of [
      '定位',
      '编辑顶点',
      '重命名',
      '导出 Excel',
      '删除',
      '导入围栏 Excel',
      '导出全部围栏',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
  })
})
