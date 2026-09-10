import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from '@/components/LoginPage'

function renderLogin(onLogin = vi.fn()) {
  render(<LoginPage onLogin={onLogin} />)
  return onLogin
}

describe('LoginPage', () => {
  it('空表单提交：提示请输入账号密码，不调用 onLogin', async () => {
    const onLogin = renderLogin()
    await userEvent.click(screen.getByRole('button', { name: '登录' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('请输入账号和密码')
    expect(onLogin).not.toHaveBeenCalled()
  })

  it('登录失败时展示 onLogin 返回的错误', async () => {
    const onLogin = renderLogin(vi.fn().mockResolvedValue('账号或密码不正确'))
    await userEvent.type(screen.getByLabelText(/账号/), 'admin')
    await userEvent.type(screen.getByLabelText(/密码/), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: '登录' }))
    expect(onLogin).toHaveBeenCalledWith('admin', 'wrong')
    expect(await screen.findByRole('alert')).toHaveTextContent('账号或密码不正确')
  })

  it('登录成功（onLogin 返回 null）时不显示错误', async () => {
    const onLogin = renderLogin(vi.fn().mockResolvedValue(null))
    await userEvent.type(screen.getByLabelText(/账号/), 'admin')
    await userEvent.type(screen.getByLabelText(/密码/), 'admin123')
    await userEvent.click(screen.getByRole('button', { name: '登录' }))
    expect(onLogin).toHaveBeenCalledWith('admin', 'admin123')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('用户名首尾空格在提交前被 trim', async () => {
    const onLogin = renderLogin(vi.fn().mockResolvedValue(null))
    await userEvent.type(screen.getByLabelText(/账号/), '  admin  ')
    await userEvent.type(screen.getByLabelText(/密码/), 'admin123')
    await userEvent.click(screen.getByRole('button', { name: '登录' }))
    expect(onLogin).toHaveBeenCalledWith('admin', 'admin123')
  })
})
