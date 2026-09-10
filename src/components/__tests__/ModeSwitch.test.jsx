import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ModeSwitch } from '@/components/ModeSwitch'

describe('ModeSwitch', () => {
  it('渲染买卖/租赁两个 tab，当前模式 aria-selected', () => {
    render(<ModeSwitch mode="sale" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: /买卖/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /租赁/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('点击切换回调传入对应 value', async () => {
    const onChange = vi.fn()
    render(<ModeSwitch mode="sale" onChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: /租赁/ }))
    expect(onChange).toHaveBeenCalledWith('rent')
    await userEvent.click(screen.getByRole('tab', { name: /买卖/ }))
    expect(onChange).toHaveBeenCalledWith('sale')
  })
})
