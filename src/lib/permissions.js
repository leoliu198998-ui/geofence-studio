/**
 * 三级角色权限矩阵。
 * admin 全部；editor 除账号管理外全部；viewer 仅查看/搜索。
 * 本模块负责 UI 级门控；服务端由 RLS 强制（见迁移 20260910140000_supabase_auth_rls）。
 */
export const ROLES = ['admin', 'editor', 'viewer']

export const ROLE_LABEL = {
  admin: '管理员',
  editor: '可编辑',
  viewer: '只读',
}

export function isRole(role) {
  return ROLES.includes(role)
}

/** 绘制 / 编辑 / 重命名 / 删除 / 导入 / 导出等数据操作 */
export function canEdit(role) {
  return role === 'admin' || role === 'editor'
}

/** 账号管理（增删账号、指定角色） */
export function canManageAccounts(role) {
  return role === 'admin'
}
