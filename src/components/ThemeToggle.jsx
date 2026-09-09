import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const META = {
  dark: { icon: Moon, label: '主题：深色（点击切换到浅色）' },
  light: { icon: Sun, label: '主题：浅色（点击切换到跟随系统）' },
  system: { icon: Monitor, label: '主题：跟随系统（点击切换到深色）' },
}

/** 三态主题切换：dark → light → system 循环 */
export function ThemeToggle({ theme, onCycle }) {
  const meta = META[theme] || META.system
  const Icon = meta.icon
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={meta.label}
          onClick={onCycle}
          className="h-8 w-8 border border-hairline bg-background/70 backdrop-blur-md"
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{meta.label}</TooltipContent>
    </Tooltip>
  )
}
