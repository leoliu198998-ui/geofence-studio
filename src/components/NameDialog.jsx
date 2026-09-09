import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

/**
 * 命名 / 重命名对话框。
 * @param {{ open: boolean, title: string, description?: string, defaultValue?: string, submitLabel?: string, onSubmit: (name: string) => void, onClose: () => void }} props
 */
export function NameDialog({ open, title, description, defaultValue = '', submitLabel = '保存', onSubmit, onClose }) {
  const [value, setValue] = useState(defaultValue)
  const [prevOpen, setPrevOpen] = useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setValue(defaultValue)
  }

  const submit = () => {
    if (!value.trim()) return
    onSubmit(value)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="例如：望京 SOHO 周边围栏"
            maxLength={40}
            aria-label="围栏名称"
          />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={submit} disabled={!value.trim()}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
