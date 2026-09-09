import { Hexagon } from 'lucide-react'
import { CitySwitcher } from '@/components/CitySwitcher'
import { ModeSwitch } from '@/components/ModeSwitch'
import { SearchBox } from '@/components/SearchBox'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

const SYNC_META = {
  connecting: { dot: 'bg-muted-foreground animate-pulse', text: '连接中' },
  online: { dot: 'bg-success', text: '云端同步' },
  offline: { dot: 'bg-muted-foreground/50', text: '本地模式' },
}

function SyncStatus({ status }) {
  const meta = SYNC_META[status] || SYNC_META.offline
  return (
    <div
      className="hidden shrink-0 items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted-foreground xl:flex"
      title={status === 'online' ? '已连接 Supabase，跨设备实时同步' : '数据仅保存在本机'}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.text}
    </div>
  )
}

export function TopBar({ AMap, map, mode, onModeChange, syncStatus, city, onCityChange, theme, onThemeCycle }) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-14 items-center gap-3 border-b border-hairline bg-background/70 px-4 backdrop-blur-md">
      <div className="pointer-events-auto flex shrink-0 items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Hexagon className="h-4 w-4" strokeWidth={2.4} />
        </span>
        <span className="font-display text-[15px] font-bold tracking-wide">围界</span>
        <span className="hidden font-mono text-[10px] font-medium tracking-[0.22em] text-muted-foreground sm:inline">
          GEOSTUDIO
        </span>
      </div>
      <div className="pointer-events-auto shrink-0">
        <ModeSwitch mode={mode} onChange={onModeChange} />
      </div>
      <div className="pointer-events-auto hidden shrink-0 sm:block">
        <CitySwitcher city={city} onSelect={onCityChange} />
      </div>
      <div className="pointer-events-auto mx-auto w-full max-w-xl">
        <SearchBox AMap={AMap} map={map} city={city} />
      </div>
      <div className="pointer-events-auto shrink-0">
        <ThemeToggle theme={theme} onCycle={onThemeCycle} />
      </div>
      <SyncStatus status={syncStatus} />
    </header>
  )
}
