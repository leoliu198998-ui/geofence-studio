import { useState } from 'react'
import { Hexagon, KeyRound, Loader2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const HAIRLINE = 'rgb(var(--hairline))'
const MUTED_FG = 'rgb(var(--muted-foreground))'
const ORANGE = '#FF5A1F'
const MONO = "'IBM Plex Mono', ui-monospace, monospace"

/** 主围栏顶点（与插画描边动画节奏对应，依次弹出） */
const VERTICES = [
  [180, 430],
  [310, 300],
  [480, 335],
  [540, 480],
  [405, 575],
  [235, 555],
]

/** 「勘测图纸」插画：网格 + 等高线 + 历史围栏 + 一根正在绘制的橙色多边形 */
function SurveyPlot() {
  return (
    <svg viewBox="0 0 640 760" className="h-full w-full" role="img" aria-label="勘测图纸插画">
      <defs>
        <pattern id="plot-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke={HAIRLINE} strokeWidth="0.8" opacity="0.9" />
        </pattern>
      </defs>

      <rect width="640" height="760" fill="url(#plot-grid)" />

      {/* 图廓角标 */}
      {[
        [24, 24, 'M24 44V24H44'],
        [616, 24, 'M596 24H616V44'],
        [24, 736, 'M24 716V736H44'],
        [616, 736, 'M596 736H616V716'],
      ].map(([x, y, d]) => (
        <path key={`${x}-${y}`} d={d} fill="none" stroke={MUTED_FG} strokeWidth="1.4" />
      ))}

      {/* 等高线 */}
      <g fill="none" stroke={HAIRLINE} strokeWidth="1" opacity="0.9">
        <path d="M-20 150 C 120 100, 260 190, 400 130 S 590 170, 660 120" />
        <path d="M-20 190 C 130 140, 270 230, 410 170 S 600 210, 660 160" />
        <path d="M-20 650 C 140 610, 300 690, 460 630 S 610 660, 660 640" />
      </g>

      {/* 历史围栏（已测量） */}
      <g stroke={MUTED_FG} strokeWidth="1.2" opacity="0.5">
        <polygon points="80,180 190,140 250,220 140,270" fill={MUTED_FG} fillOpacity="0.06" />
        <polygon points="420,610 545,590 565,685 450,705" fill={MUTED_FG} fillOpacity="0.06" />
      </g>
      <text x="152" y="212" fontFamily={MONO} fontSize="11" fill={MUTED_FG} opacity="0.8">
        S-014
      </text>
      <text x="478" y="655" fontFamily={MONO} fontSize="11" fill={MUTED_FG} opacity="0.8">
        R-007
      </text>

      {/* 主围栏：描边绘制 → 橙色填充淡入 */}
      <polygon
        points={VERTICES.map((p) => p.join(',')).join(' ')}
        fill={ORANGE}
        fillOpacity="0.1"
        stroke={ORANGE}
        strokeWidth="2.5"
        strokeLinejoin="round"
        pathLength="100"
        strokeDasharray="100"
        strokeDashoffset="100"
        style={{ animation: 'plot-draw 2.4s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards' }}
      />

      {/* 顶点锚点：随描边节奏依次弹出 */}
      {VERTICES.map(([x, y], i) => (
        <rect
          key={i}
          x={x - 4.5}
          y={y - 4.5}
          width="9"
          height="9"
          fill="rgb(var(--panel))"
          stroke={ORANGE}
          strokeWidth="2"
          opacity="0"
          style={{
            transformBox: 'fill-box',
            transformOrigin: 'center',
            animation: `anchor-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.5 + i * 0.3}s forwards`,
          }}
        />
      ))}

      {/* 活动顶点脉冲（起始锚点） */}
      <circle
        cx={VERTICES[0][0]}
        cy={VERTICES[0][1]}
        r="8"
        fill="none"
        stroke={ORANGE}
        strokeWidth="1.5"
        opacity="0"
        style={{
          transformBox: 'fill-box',
          transformOrigin: 'center',
          animation:
            'anchor-pop 0.3s ease-out 2.6s forwards, ping-soft 2.4s ease-out 2.9s infinite',
        }}
      />

      {/* 十字丝 + 坐标 */}
      <g stroke={MUTED_FG} strokeWidth="1.2">
        <path d="M340 446V474M326 460H354" />
        <circle cx="340" cy="460" r="4" fill="none" />
      </g>
      <text x="364" y="464" fontFamily={MONO} fontSize="11" fill={MUTED_FG}>
        116.4074°E 39.9042°N
      </text>

      {/* 罗盘 */}
      <g>
        <circle cx="560" cy="92" r="24" fill="none" stroke={HAIRLINE} strokeWidth="1.2" />
        <polygon points="560,74 566,100 560,95 554,100" fill={ORANGE} />
        <text x="556" y="120" fontFamily={MONO} fontSize="10" fill={MUTED_FG}>
          N
        </text>
      </g>
    </svg>
  )
}

/** 登录页：左侧表单，右侧勘测图纸插画（lg 以下收起插画） */
export function LoginPage({ onLogin, themeSlot }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!username.trim() || !password) {
      setError('请输入账号和密码')
      return
    }
    setBusy(true)
    setError('')
    const err = await onLogin(username.trim(), password)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="flex h-full bg-background">
      {themeSlot && <div className="absolute right-4 top-4 z-10">{themeSlot}</div>}

      {/* 表单栏 */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-10">
        <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background:radial-gradient(600px_circle_at_50%_-10%,rgba(255,90,31,0.12),transparent_60%)]" />

        <main className="relative w-full max-w-sm animate-slide-up">
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

          <p className="mt-10 font-mono text-[10px] tracking-[0.3em] text-primary">
            SIGN IN / 登录
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-wide">回到勘测现场</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            登录后继续绘制、测量并同步你的电子围栏。
          </p>

          <form className="mt-8 space-y-5" onSubmit={submit}>
            <div className="space-y-1.5">
              <label
                htmlFor="login-username"
                className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground"
              >
                账号 USERNAME
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-username"
                  autoFocus
                  autoComplete="username"
                  className="h-10 pl-9"
                  placeholder="输入账号"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground"
              >
                密码 PASSWORD
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  className="h-10 pl-9"
                  placeholder="输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-xs leading-relaxed text-destructive animate-fade-in">
                {error}
              </p>
            )}

            <Button type="submit" className="h-10 w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {busy ? '正在登录…' : '登录'}
            </Button>
          </form>

          <p className="mt-10 font-mono text-[10px] leading-relaxed tracking-wider text-muted-foreground">
            AUTHORIZED SURVEYORS ONLY
            <br />
            数据经云端加密存储 · 跨设备实时同步
          </p>
        </main>
      </div>

      {/* 插画栏 */}
      <aside className="relative hidden w-[52%] border-l border-hairline bg-panel lg:block">
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(720px_circle_at_70%_20%,rgba(255,90,31,0.08),transparent_65%)]" />
        <div className="absolute inset-0 p-10">
          <SurveyPlot />
        </div>
        <p className="absolute inset-x-10 bottom-6 flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
          <span>GRID 39.9042°N 116.4074°E</span>
          <span>SCALE 1:2000</span>
          <span>SURVEY MODE</span>
        </p>
      </aside>
    </div>
  )
}
