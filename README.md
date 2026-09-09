# 围界 GeoStudio · 电子围栏工作台

基于**高德地图开放平台（JS API 2.0）**的 Web 端电子围栏工具。深色、精确、克制的"测绘仪器"风格界面：全屏地图 + HUD 浮层，在地图上圈地、命名、测量、导出。

## 功能

- **深色地图**：高德 JS API 2.0（`@amap/amap-jsapi-loader`），`darkblue` 地图样式
- **多边形围栏绘制**：单击加顶点，双击 / 回车结束，Esc 取消；绘制中实时显示**面积（㎡ / k㎡）**与**周长**
- **围栏管理**：命名保存、重命名、`AMap.PolygonEditor` 顶点编辑、删除、点击定位（fitView）；记录编号 F-001、F-002… 自动生成
- **小区搜索**：`AMap.AutoComplete` 输入提示 + `AMap.PlaceSearch` POI 搜索，点击结果飞行定位并打点
- **GeoJSON 导出**：全部围栏一键导出 FeatureCollection（`properties` 含 name / 面积 / 顶点数 / 创建时间），单条围栏可单独导出
- **持久化**：围栏数据存于 `localStorage`，刷新不丢
- **实时经纬度**：右下角 HUD 随鼠标移动实时读数，精确到小数点后 6 位
- **缺 Key 引导页**：未配置环境变量时不白屏，显示接入指引

## 截图

> 占位 —— 配置好高德 Key 后运行 `npm run dev`，截取工作台主界面替换此处。
>
> ![工作台截图占位](docs/screenshot.png)

## 快速开始

```bash
npm install

# 配置高德 Key（见下节）
cp .env.example .env
# 编辑 .env 填入 VITE_AMAP_KEY 与 VITE_AMAP_SECURITY_CODE

npm run dev
```

构建与检查：

```bash
npm run build   # 生产构建
npm run lint    # oxlint
```

## 申请高德 Key

1. 登录 [高德开放平台控制台](https://console.amap.com/dev/key/app)，进入「应用管理 → 我的应用」
2. 「创建新应用」后「添加 Key」，**服务平台选择 `Web 端 ( JS API )`**
3. 复制 Key 与配套的**安全密钥（securityJsCode）**，填入 `.env`：

```ini
VITE_AMAP_KEY=你的Key
VITE_AMAP_SECURITY_CODE=你的安全密钥
```

4. 重启 `npm run dev`。`.env` 已在 `.gitignore` 中，不会被提交。

未配置时打开应用会显示接入引导页，不会崩溃。

## 导出格式

导出为 UTF-8 编码的 GeoJSON 文件（`FeatureCollection`）。每条围栏一个 `Feature`：

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "望京 SOHO 周边围栏",
        "code": "F-001",
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
- 坐标环首尾闭合（首尾点重复），WGS84 偏移坐标系（GCJ-02，与高德地图一致）
- 全部导出文件名 `geofences-all.geojson`；单条导出 `F-001-名称.geojson`

## 技术栈

- Vite + React 19（JavaScript，`jsconfig.json` 配置 `@` 路径别名）
- Tailwind CSS v3 + shadcn/ui 风格组件（Radix UI 原语：dialog / scroll-area / separator / tooltip，sonner 通知，lucide 图标）
- `@amap/amap-jsapi-loader` 加载高德 JS API 2.0

## 项目结构

```
src/
├── config/amap.js          # 环境变量读取与 Key 检测
├── hooks/
│   ├── useAmap.js          # JS API 加载、地图初始化、经纬度读数
│   └── useFenceManager.js  # 围栏绘制/编辑/持久化/导出
├── components/
│   ├── ui/                 # shadcn 风格基础组件
│   ├── TopBar.jsx          # 顶栏（logo + 搜索）
│   ├── SearchBox.jsx       # AutoComplete + PlaceSearch
│   ├── ToolRail.jsx        # 左侧工具列
│   ├── FencePanel.jsx      # 右侧「测量日志」围栏列表
│   ├── DrawHud.jsx         # 绘制中实时面积/周长 HUD
│   ├── CoordsHud.jsx       # 右下角经纬度读数
│   ├── NameDialog.jsx      # 命名/重命名对话框
│   └── SetupGuide.jsx      # 缺 Key 接入引导页
├── lib/                    # cn()、格式化工具
└── App.jsx
```
