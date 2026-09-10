import { describe, expect, it } from 'vitest'
import { emailOf } from '@/hooks/useAuth'

describe('emailOf', () => {
  it('用户名映射为 Supabase Auth 内部伪邮箱', () => {
    expect(emailOf('admin')).toBe('admin@geofence.local')
    expect(emailOf('zhang.san')).toBe('zhang.san@geofence.local')
    expect(emailOf('user_01')).toBe('user_01@geofence.local')
  })
})
