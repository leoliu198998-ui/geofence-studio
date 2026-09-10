import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ImportPreviewDialog } from '@/components/ImportPreviewDialog'

const entries = [
  { name: '黄兴买卖区', mode: 'sale', path: [[1, 1], [2, 2], [3, 3]], area: 66720.1 },
  { name: '古北租赁区', mode: 'rent', path: [[1, 1], [2, 2], [3, 3]], area: 1234567 },
]
const skipped = [{ name: '彭虹买卖区2', reason: '去重后仅 1 个不同顶点，不足 3 个，无法构成多边形' }]

function renderDialog(props = {}) {
  return render(
    <ImportPreviewDialog
      open
      entries={entries}
      skipped={skipped}
      onConfirm={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  )
}

describe('ImportPreviewDialog', () => {
  it('渲染有效条目（名称/视图/顶点数/面积）与跳过原因', () => {
    renderDialog()
    expect(screen.getByText('黄兴买卖区')).toBeInTheDocument()
    expect(screen.getByText('古北租赁区')).toBeInTheDocument()
    expect(screen.getAllByText(/\d+ 顶点/)).toHaveLength(2)
    expect(screen.getByText('彭虹买卖区2')).toBeInTheDocument()
    expect(screen.getByText(/不足 3 个/)).toBeInTheDocument()
  })

  it('目标视图默认按名称推断，条目展示各自推断的视图', () => {
    renderDialog()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('买卖')
    expect(dialog).toHaveTextContent('租赁')
  })

  it('统一切换到租赁后，确认回调收到 rent', async () => {
    const onConfirm = vi.fn()
    renderDialog({ onConfirm })
    await userEvent.click(screen.getByRole('button', { name: '租赁' }))
    await userEvent.click(screen.getByRole('button', { name: /确认导入/ }))
    expect(onConfirm).toHaveBeenCalledWith('rent')
  })

  it('默认推断模式确认回调收到 auto', async () => {
    const onConfirm = vi.fn()
    renderDialog({ onConfirm })
    await userEvent.click(screen.getByRole('button', { name: /确认导入 2 条/ }))
    expect(onConfirm).toHaveBeenCalledWith('auto')
  })

  it('无有效条目时禁用确认按钮', () => {
    renderDialog({ entries: [] })
    expect(screen.getByRole('button', { name: /确认导入/ })).toBeDisabled()
  })

  it('取消按钮触发 onClose', async () => {
    const onClose = vi.fn()
    renderDialog({ onClose })
    await userEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onClose).toHaveBeenCalled()
  })
})
