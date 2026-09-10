import { useCallback, useEffect, useState } from 'react'
import { LogOut, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { createUser, deleteUser, fetchUsers } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const labelCls = 'font-mono text-[10px] tracking-[0.2em] text-muted-foreground'

function Field({ label, ...props }) {
  return (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      <Input {...props} />
    </div>
  )
}

/**
 * 账号弹窗：当前账号（改密码 / 退出登录）+ 账号维护（列表 / 新建 / 删除）。
 * 暂无权限隔离，任何已登录账号均可维护全部账号。
 */
export function AccountDialog({ open, user, onClose, onLogout, onChangePassword }) {
  const [users, setUsers] = useState(null) // null = 加载中
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [newUser, setNewUser] = useState({ username: '', displayName: '', password: '' })
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setUsers(await fetchUsers())
  }, [])

  // 外部按钮打开弹窗不会触发 Dialog 的 onOpenChange，需用 effect 监听 open 变化
  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    fetchUsers().then((list) => {
      if (!cancelled) setUsers(list)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const resetForms = () => {
    setOldPw('')
    setNewPw('')
    setConfirmPw('')
    setNewUser({ username: '', displayName: '', password: '' })
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    if (busy) return
    if (newPw !== confirmPw) {
      toast.error('两次输入的新密码不一致')
      return
    }
    setBusy(true)
    const err = await onChangePassword(oldPw, newPw)
    setBusy(false)
    if (err) {
      toast.error(err)
    } else {
      toast.success('密码已更新')
      setOldPw('')
      setNewPw('')
      setConfirmPw('')
    }
  }

  const submitNewUser = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const err = await createUser({
      username: newUser.username.trim(),
      displayName: newUser.displayName,
      password: newUser.password,
    })
    setBusy(false)
    if (err) {
      toast.error(err)
    } else {
      toast.success(`账号 ${newUser.username.trim()} 已创建`)
      setNewUser({ username: '', displayName: '', password: '' })
      refresh()
    }
  }

  const handleDelete = async (username) => {
    const err = await deleteUser(username, user.username)
    if (err) {
      toast.error(err)
    } else {
      toast.success(`账号 ${username} 已删除`)
      refresh()
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          resetForms()
          onClose()
        }
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>账号</DialogTitle>
          <DialogDescription>修改当前账号密码，或维护可登录工作台的账号。</DialogDescription>
        </DialogHeader>

        {/* 当前账号 */}
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 font-display text-sm font-bold text-primary">
            {user.displayName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.displayName}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">@{user.username}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut />
            退出登录
          </Button>
        </div>

        <Separator />

        {/* 修改密码 */}
        <form className="space-y-3" onSubmit={submitPassword}>
          <p className={labelCls}>修改密码 CHANGE PASSWORD</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field
              label="当前密码"
              type="password"
              autoComplete="current-password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
            />
            <Field
              label="新密码"
              type="password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
            <Field
              label="确认新密码"
              type="password"
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={busy || !oldPw || !newPw || !confirmPw}>
              保存密码
            </Button>
          </div>
        </form>

        <Separator />

        {/* 账号列表 */}
        <div className="space-y-2">
          <p className={labelCls}>全部账号 ACCOUNTS</p>
          <ul className="divide-y divide-hairline rounded-md border border-hairline">
            {(users ?? []).map((u) => {
              const isSelf = u.username === user.username
              return (
                <li key={u.id} className="flex items-center gap-3 px-3 py-2">
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-display text-xs font-bold',
                      isSelf ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {u.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {u.displayName}
                      {isSelf && (
                        <span className="ml-1.5 font-mono text-[10px] text-primary">（当前）</span>
                      )}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      @{u.username} · {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`删除账号 ${u.username}`}
                    disabled={isSelf}
                    title={isSelf ? '不能删除当前登录的账号' : '删除该账号'}
                    onClick={() => handleDelete(u.username)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </li>
              )
            })}
            {users === null && (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">加载中…</li>
            )}
            {users !== null && users.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                账号列表加载失败，请关闭后重试
              </li>
            )}
          </ul>
        </div>

        {/* 新建账号 */}
        <form className="space-y-3" onSubmit={submitNewUser}>
          <p className={labelCls}>新建账号 NEW ACCOUNT</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field
              label="用户名"
              placeholder="如 zhangsan"
              autoComplete="off"
              value={newUser.username}
              onChange={(e) => setNewUser((s) => ({ ...s, username: e.target.value }))}
            />
            <Field
              label="显示名（可选）"
              placeholder="如 张三"
              autoComplete="off"
              value={newUser.displayName}
              onChange={(e) => setNewUser((s) => ({ ...s, displayName: e.target.value }))}
            />
            <Field
              label="初始密码"
              type="password"
              autoComplete="new-password"
              placeholder="至少 6 位"
              value={newUser.password}
              onChange={(e) => setNewUser((s) => ({ ...s, password: e.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={busy || !newUser.username.trim() || !newUser.password}
            >
              <UserPlus />
              添加账号
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
