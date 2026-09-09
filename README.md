# 围界 GeoStudio · 电子围栏工作台

基于**高德地图开放平台（JS API 2.0）**的 Web 端电子围栏工具，配 **Supabase** 后端实现跨设备实时同步。深色、精确、克制的"测绘仪器"风格界面：全屏地图 + HUD 浮层，在地图上圈地、命名、测量、导出。

## 功能

- **深色地图**：高德 JS API 2.0（`@amap/amap-jsapi-loader`），`darkblue` 地图样式
- **多边形围栏绘制**：单击加顶点，双击 / 回车结束，Esc 取消；绘制中实时显示**面积（㎡ / k㎡）**与**周长**
- **买卖 / 租赁双视图**：顶栏分段切换，两个视图的围栏完全独立维护；编号按视图区分前缀——买卖 `S-001…`，租赁 `R-001…`；视图选择本地记忆
- **跨设备同步（Supabase）**：云端为主、localStorage 离线缓存兜底；增删改乐观更新并写云端；Realtime 订阅，其他设备的改动自动刷新并轻量提示；未配置或连接失败时优雅降级为纯本地模式（顶栏有状态指示）
- **首次迁移**：若本地存有旧版（v1）围栏数据而云端为空，自动上传迁移到买卖视图（仅提示一次）
- **围栏管理**：命名保存、重命名、`AMap.PolygonEditor` 顶点编辑、删除、点击定位（fitView）
- **小区搜索**：`AMap.AutoComplete` 输入提示 + `AMap.PlaceSearch` POI 搜索，点击结果飞行定位并打点
- **GeoJSON 导出**：按当前视图导出 FeatureCollection（`properties` 含 name / code / mode / 面积 / 顶点数 / 创建时间），单条围栏可单独导出
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

## 导出格式

导出为 UTF-8 编码的 GeoJSON 文件（`FeatureCollection`），按当前视图过滤：

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "望京 SOHO 周边围栏",
        "code": "S-001",
        "mode": "sale",
        "area": 512340,
        "vertexCount": 6,
        "createdAt": "2026-09-09T10:30:00.000Z"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[116.48, 39.996], [116.49, 39.996], [116.48, 39.996]]]
      }
    }
  ]
}
```

- `area`：平方米（由 `AMap.GeometryUtil.ringArea` 计算）
- 坐标环首尾闭合（首尾点重复），GCJ-02 坐标系（与高德地图一致）
- 文件名：买卖视图 `geofences-sale.geojson`，租赁视图 `geofences-rent.geojson`；单条导出 `S-001-名称.geojson`

## 技术栈

- Vite + React 19（JavaScript，`jsconfig.json` 配置 `@` 路径别名）
- Tailwind CSS v3 + shadcn/ui 风格组件（Radix UI 原语，sonner 通知，lucide 图标）
- `@amap/amap-jsapi-loader` 加载高德 JS API 2.0
- `@supabase/supabase-js`（数据 + Realtime）

## 项目结构

```
src/
├── config/
│   ├── amap.js             # 高德环境变量读取与 Key 检测
│   └── supabase.js         # Supabase client 单例（未配置时为 null）
├── hooks/
│   ├── useAmap.js          # JS API 加载、地图初始化、经纬度读数
│   ├── useFenceStore.js    # 数据层：云端为主 + 本地缓存 + Realtime + 首次迁移
│   └── useFenceManager.js  # 地图交互：绘制/顶点编辑/定位/导出（按当前视图）
├── components/
│   ├── ui/                 # shadcn 风格基础组件
│   ├── TopBar.jsx          # 顶栏（logo + 视图切换 + 搜索 + 同步状态）
│   ├── ModeSwitch.jsx      # 买卖 / 租赁分段切换
│   ├── SearchBox.jsx       # AutoComplete + PlaceSearch
│   ├── ToolRail.jsx        # 左侧工具列
│   ├── FencePanel.jsx      # 右侧「测量日志」围栏列表
│   ├── DrawHud.jsx         # 绘制中实时面积/周长 HUD
│   ├── CoordsHud.jsx       # 右下角经纬度读数
│   ├── NameDialog.jsx      # 命名/重命名对话框
│   └── SetupGuide.jsx      # 缺 Key 接入引导页
├── lib/                    # cn()、格式化工具
└── App.jsx
supabase/
└── migrations/             # 建表 migration（RLS + Realtime）
```
