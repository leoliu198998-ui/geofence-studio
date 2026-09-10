# 围界 GeoStudio · 电子围栏工作台

基于**高德地图开放平台（JS API 2.0）**的 Web 端电子围栏工具，配 **Supabase** 后端实现跨设备实时同步。深色、精确、克制的"测绘仪器"风格界面：全屏地图 + HUD 浮层，在地图上圈地、命名、测量、导出。

## 功能

- **深色/浅色双主题**：dark / light / 跟随系统三态切换（顶栏右侧图标循环），localStorage 持久化 + 系统主题监听，刷新无闪烁；高德底图随主题联动（darkblue / whitesmoke），亮色为"白天勘测图纸"风格（纸白 #F7F5F0 + 墨色 #1A2028），测量橙两主题共用
- **定位与城市切换**：首次加载用 `AMap.CitySearch` 定位当前城市并 fitBounds；授权浏览器定位（`AMap.Geolocation`）后精确打点放大；失败/拒绝静默回退默认城市（上海）。顶栏城市切换器支持热门城市芯片与按城市名/拼音/区号模糊搜索，选择持久化，下次打开优先使用记忆城市
- **深色地图**：高德 JS API 2.0（`@amap/amap-jsapi-loader`），`darkblue` 地图样式
- **多边形围栏绘制**：单击加顶点，双击 / 回车结束，Esc 取消；绘制中实时显示**面积（㎡ / k㎡）**与**周长**
- **买卖 / 租赁双视图**：顶栏分段切换，两个视图的围栏完全独立维护；编号按视图区分前缀——买卖 `S-001…`，租赁 `R-001…`；视图选择本地记忆
- **跨设备同步（Supabase）**：云端为主、localStorage 离线缓存兜底；增删改乐观更新并写云端；Realtime 订阅，其他设备的改动自动刷新并轻量提示；未配置或连接失败时优雅降级为纯本地模式（顶栏有状态指示）
- **首次迁移**：若本地存有旧版（v1）围栏数据而云端为空，自动上传迁移到买卖视图（仅提示一次）
- **围栏管理**：命名保存、重命名、`AMap.PolygonEditor` 顶点编辑、删除、点击定位（fitView）
- **小区搜索**：`AMap.AutoComplete` 输入提示 + `AMap.PlaceSearch` POI 搜索，点击结果飞行定位并打点；提示范围跟随当前城市
- **Excel 导入/导出**：导出为与「运营区围栏清单」模板一致的 .xlsx（SheetJS），按当前视图过滤，单条围栏可单独导出；支持从模板 xlsx 批量导入，预览确认后写入云端
- **实时经纬度**：右下角 HUD 随鼠标移动实时读数，精确到小数点后 6 位
- **缺 Key 引导页**：未配置高德环境变量时不白屏，显示接入指引

## 截图

> 占位 —— 运行 `npm run dev` 后截取工作台主界面替换此处。
>
> ![工作台截图占位](docs/screenshot.png)

## 快速开始

```bash
npm install

cp .env.example .env
# 编辑 .env 填入高德 Key / 安全密钥，以及 Supabase URL / anon key

npm run dev
```

构建与检查：

```bash
npm run build   # 生产构建
npm run lint    # oxlint
```

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `VITE_AMAP_KEY` | 高德 Web 端（JS API）Key |
| `VITE_AMAP_SECURITY_CODE` | 与 Key 配套的安全密钥 securityJsCode |
| `VITE_SUPABASE_URL` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

`.env` 已在 `.gitignore` 中，不会被提交。未配置高德 Key 时显示接入引导页；未配置 Supabase 时应用以"本地模式"运行（数据只存本机 localStorage）。

## 申请高德 Key

1. 登录 [高德开放平台控制台](https://console.amap.com/dev/key/app)，进入「应用管理 → 我的应用」
2. 「创建新应用」后「添加 Key」，**服务平台选择 `Web 端 ( JS API )`**
3. 复制 Key 与配套的**安全密钥（securityJsCode）**，填入 `.env` 后重启 `npm run dev`

## 定位与城市切换

- 启动时优先读取 localStorage 记忆城市；没有则用 `AMap.CitySearch` 按 IP 定位当前城市并把视野 fitBounds 到城市范围；定位失败静默回退到默认城市（上海）
- 无记忆城市时会同时请求浏览器定位（`AMap.Geolocation`）：授权后地图放大到精确位置并打橙色当前位置标记；拒绝或失败不打断使用
- 顶栏城市切换器：当前城市名 + adcode 小标，面板内含 12 个热门城市芯片与搜索框（按城市名 / 拼音 / 区号 / adcode 模糊匹配，内置 35 个一二线城市数据）；选中后地图平滑 flyTo 并写入 localStorage
- 城市切换与小区搜索相互独立；小区搜索的 AutoComplete / PlaceSearch `city` 参数跟随当前城市，提示优先落在当前城市范围内

## 主题切换

- 三态：dark / light / system，顶栏右侧图标按钮循环（Moon / Sun / Monitor），选择持久化；system 模式下监听 `prefers-color-scheme` 实时跟随
- `index.html` 头部内联脚本在渲染前设好 `html.dark` class，刷新无主题闪烁
- Tailwind `darkMode: 'class'`，全部设计 token 为 CSS 变量：深色（测绘仪器）与亮色（白天勘测图纸：纸白 #F7F5F0、墨色 #1A2028、加深发丝线 #D8D3C6、成功绿 #16855A）各一套，测量橙 #FF5A1F 两主题共用
- 高德底图随主题联动：dark 用 `amap://styles/darkblue`，light 用 `amap://styles/whitesmoke`，切换时 `map.setMapStyle` 平滑过渡、不重建地图

## Supabase 配置

1. 在 [Supabase](https://supabase.com/dashboard) 创建项目，进入 Project Settings → API，复制 **Project URL** 与 **anon public key** 填入 `.env`
2. 建表：migration 见 `supabase/migrations/20260909090000_create_fences.sql`（含 RLS anon 全量读写策略、Realtime publication），用 Supabase CLI 或 SQL Editor 执行
3. 表结构 `public.fences`：

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `id` | uuid | 主键 |
| `mode` | text | `'sale'`（买卖）/ `'rent'`（租赁） |
| `name` | text | 围栏名称 |
| `code` | text | 编号（S-001… / R-001…） |
| `path` | jsonb | 顶点数组 `[[lng,lat],...]`（GCJ-02） |
| `area` | double | 面积（平方米） |
| `vertex_count` | int | 顶点数 |
| `created_at` / `updated_at` | timestamptz | 时间戳 |

4. **跨设备同步**：表已加入 `supabase_realtime` publication，任一端增删改，其他在线设备秒级自动刷新，并有 toast 提示（如"租赁视图新增围栏 R-003（来自其他设备）"）

## 导入 / 导出（Excel）

导入与导出都针对「运营区围栏清单」模板格式（SheetJS / `xlsx` 解析与生成）：

| 列 | 说明 |
| --- | --- |
| `事业部` | 导出时留空（应用内无此数据） |
| `对应区域` | 围栏名称 |
| `细化四至` | 围栏名称（与对应区域同值；导入时若与对应区域不同则优先用作名称） |
| `point_id（点位 ID）` | 顶点顺序，从 0 递增 |
| `longitude（经度）` / `latitude（纬度）` | GCJ-02 坐标（与高德地图一致），一行一个顶点 |

**导入**（右侧面板「导入」按钮，选择 .xlsx）：

- 每个唯一的「细化四至」解析为一个多边形，顶点按 point_id 升序；相同坐标去重后不足 3 个顶点的条目视为无效，跳过并在预览中注明原因
- 预览对话框列出每条围栏的名称、推断视图、顶点数、面积预估；可统一切换导入目标视图（按名称推断 / 买卖 / 租赁，名称含「买卖」「租赁」自动推断，否则默认当前视图）
- 确认后批量写入云端（编号自动续 S- / R-），toast 汇总成功/跳过条数，并 fitView 展示导入结果

**导出**：

- 导出全部（当前视图）：`运营区围栏清单-买卖.xlsx` / `运营区围栏清单-租赁.xlsx`
- 单条导出：`S-001-名称.xlsx`
- sheet 名固定为 `运营区围栏清单`

## 技术栈

- Vite + React 19（JavaScript，`jsconfig.json` 配置 `@` 路径别名）
- Tailwind CSS v3 + shadcn/ui 风格组件（Radix UI 原语，sonner 通知，lucide 图标）
- `@amap/amap-jsapi-loader` 加载高德 JS API 2.0
- `@supabase/supabase-js`（数据 + Realtime）
- `xlsx`（SheetJS，围栏清单 Excel 导入/导出）

## 项目结构

```
src/
├── config/
│   ├── amap.js             # 高德环境变量读取与 Key 检测
│   └── supabase.js         # Supabase client 单例（未配置时为 null）
├── hooks/
│   ├── useAmap.js          # JS API 加载、地图初始化（样式随主题）、经纬度读数
│   ├── useCity.js          # 城市定位：记忆 > CitySearch > 默认上海 + Geolocation
│   ├── useTheme.js         # dark / light / system 三态主题
│   ├── useFenceStore.js    # 数据层：云端为主 + 本地缓存 + Realtime + 首次迁移
│   └── useFenceManager.js  # 地图交互：绘制/顶点编辑/定位/导出（按当前视图）├── data/
│   └── cities.js           # 内置一二线城市数据（拼音/区号/adcode/中心点）
├── components/
│   ├── ui/                 # shadcn 风格基础组件
│   ├── TopBar.jsx          # 顶栏（logo + 视图切换 + 城市 + 搜索 + 主题 + 同步状态）
│   ├── ModeSwitch.jsx      # 买卖 / 租赁分段切换
│   ├── CitySwitcher.jsx    # 城市切换器（热门芯片 + 模糊搜索）
│   ├── ThemeToggle.jsx     # 主题三态切换按钮
│   ├── SearchBox.jsx       # AutoComplete + PlaceSearch
│   ├── ToolRail.jsx        # 左侧工具列
│   ├── FencePanel.jsx      # 右侧「测量日志」围栏列表
│   ├── DrawHud.jsx         # 绘制中实时面积/周长 HUD
│   ├── CoordsHud.jsx       # 右下角经纬度读数
│   ├── NameDialog.jsx      # 命名/重命名对话框
│   ├── ImportPreviewDialog.jsx  # Excel 导入预览（有效条目 + 跳过原因 + 目标视图切换）
│   └── SetupGuide.jsx      # 缺 Key 接入引导页
├── lib/                    # cn()、格式化工具、excel.js（围栏清单解析/导出）
└── App.jsx
supabase/
└── migrations/             # 建表 migration（RLS + Realtime）
```
