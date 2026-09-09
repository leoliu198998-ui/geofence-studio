import { ExternalLink, FileKey2, Hexagon, KeyRound, RefreshCw } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

const STEPS = [
  {
    icon: ExternalLink,
    title: '登录高德开放平台控制台',
    body: '打开 console.amap.com，进入「应用管理 → 我的应用」。',
    link: { href: 'https://console.amap.com/dev/key/app', label: 'console.amap.com' },
  },
  {
    icon: FileKey2,
    title: '创建 Web 端（JS API）应用',
    body: '点击「创建新应用」，然后「添加 Key」——服务平台务必选择 Web 端 ( JS API )。',
  },
  {
    icon: KeyRound,
    title: '获取 Key 与安全密钥',
    body: '复制该 Key 以及配套的「安全密钥 securityJsCode」，二者缺一不可。',
  },
  {
    icon: RefreshCw,
    title: '写入 .env 并重启',
    body: '在项目根目录创建 .env（可参考 .env.example），填入两个值后重新执行 npm run dev。',
  },
]

/** 未配置高德 Key 时的接入引导页 */
export function SetupGuide() {
  return (
    <div className="flex min-h-full items-center justify-center bg-background p-6">
      <div className="pointer-events-none fixed inset-0 opacity-[0.35] [background:radial-gradient(600px_circle_at_50%_-10%,rgba(255,90,31,0.12),transparent_60%)]" />
      <main className="hud-panel relative w-full max-w-xl p-8 animate-slide-up">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Hexagon className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold tracking-wide">
              围界 <span className="text-muted-foreground">GEOSTUDIO</span>
            </h1>
            <p className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground">
              GEOFENCE WORKBENCH
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        <p className="text-sm leading-relaxed text-muted-foreground">
          还差一步接入高德地图。工作台需要一组
          <span className="text-foreground"> Web 端（JS API）Key 与安全密钥</span>
          才能渲染地图，请按以下步骤配置：
        </p>

        <ol className="mt-6 space-y-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-hairline font-mono text-xs text-primary">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <step.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {step.title}
                  {step.link && (
                    <a
                      href={step.link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                    >
                      {step.link.label}
                    </a>
                  )}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-md border border-hairline bg-background/70 p-4">
          <p className="mb-2 font-mono text-[10px] tracking-[0.2em] text-muted-foreground">.ENV</p>
          <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-foreground/90">
{`VITE_AMAP_KEY=你的Key
VITE_AMAP_SECURITY_CODE=你的安全密钥`}
          </pre>
        </div>

        <p className="mt-5 font-mono text-[11px] text-muted-foreground">
          提示：.env 已在 .gitignore 中，不会被提交到仓库。
        </p>
      </main>
    </div>
  )
}
