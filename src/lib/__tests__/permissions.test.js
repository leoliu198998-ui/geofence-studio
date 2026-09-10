import { describe, expect, it } from 'vitest'
import { canEdit, canManageAccounts, isRole, ROLE_LABEL } from '../permissions'

describe('permissions', () => {
  it('三种角色均有中文标签', () => {
    expect(ROLE_LABEL.admin).toBe('管理员')
    expect(ROLE_LABEL.editor).toBe('可编辑')
    expect(ROLE_LABEL.viewer).toBe('只读')
  })

  it('角色校验只接受 admin / editor / viewer', () => {
    expect(isRole('admin')).toBe(true)
    expect(isRole('editor')).toBe(true)
    expect(isRole('viewer')).toBe(true)
    expect(isRole('root')).toBe(false)
    expect(isRole('')).toBe(false)
    expect(isRole(undefined)).toBe(false)
  })

  it('编辑数据：admin 与 editor 可以，viewer 与未知角色不行', () => {
    expect(canEdit('admin')).toBe(true)
    expect(canEdit('editor')).toBe(true)
    expect(canEdit('viewer')).toBe(false)
    expect(canEdit(undefined)).toBe(false)
  })

  it('账号管理：仅 admin', () => {
    expect(canManageAccounts('admin')).toBe(true)
    expect(canManageAccounts('editor')).toBe(false)
    expect(canManageAccounts('viewer')).toBe(false)
  })
})
