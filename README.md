# ObsidianData（黑曜数据）

基于 **Vite + React + TypeScript** 与 **FastAPI** 的 CSV/Excel 数据分析与可视化应用。支持自动图表生成、交互式探索、**规则引擎**数据解读（非大模型）与行动计划追踪。

> 品牌命名：英文 **ObsidianData**，中文 **黑曜数据**，标语 **数据分析引擎**。

## 功能特性

| 模块 | 说明 |
|------|------|
| 文件上传 | 支持 CSV、XLSX、XLS，单文件最大 10MB（前后端双重校验） |
| 静态图表 | matplotlib 自动生成仪表盘、饼图、折线图、柱状图、散点图；缺图有原因说明 |
| 交互探索 | ECharts 动态图表，支持 10 种图表类型、筛选、透视、安全计算列 |
| 规则引擎分析 | 场景识别 + 通用分析（缺失值、分布异常、相关性等），产出 findings 与建议 |
| 行动计划 | 分析后自动写入后端，步骤勾选持久化，刷新后进度保持 |
| 看板布局 | 拖拽排版按 `file_id` 存入 localStorage，刷新可恢复 |
| 会话恢复 | Dashboard 刷新后从 sessionStorage 恢复文件上下文 |
| 多数据集对比 | 批量上传对比，支持合计/均值与柱状/折线图，超 1000 行有截断提示 |
| 报告导出 | 打印预览含摘要、关键指标、静态图表与行动计划列表 |
| 示例数据 | 内置 `data.csv`，无需上传即可体验完整流程 |

## 技术栈

**前端**

- React 18、TypeScript、Vite 6
- ECharts、Zustand、Tailwind CSS、React Router

**后端**

- FastAPI、Uvicorn
- Pandas、Matplotlib、NumPy、OpenPyXL

**工具链**

- Bun（包管理与脚本编排）
- Python 虚拟环境（`backend/.venv`）

## 环境要求

| 依赖 | 版本 |
|------|------|
| [Bun](https://bun.sh/) | ≥ 1.0 |
| Python | ≥ 3.10 |

## 快速开始

```bash
# 克隆项目后，在项目根目录执行

# 1. 安装前后端依赖（首次）
bun run setup

# 2. 启动开发环境（前端 :5173 + 后端 :8000）
bun run dev
```

浏览器访问 **http://localhost:5173**

> 也可在首页点击「加载示例数据快速体验」，跳过上传步骤。

## 脚本命令

在项目根目录执行：

| 命令 | 说明 |
|------|------|
| `bun run setup` | 安装全部依赖（Python venv + Bun workspaces） |
| `bun run setup:backend` | 仅创建 venv 并安装 `requirements.txt` |
| `bun run setup:frontend` | 仅执行 `bun install` |
| `bun run dev` | 开发模式，同时启动前后端 |
| `bun run dev:frontend` | 仅启动 Vite 开发服务器 |
| `bun run dev:backend` | 仅启动 FastAPI（带 `--reload`） |
| `bun run build` | 构建前端到 `frontend/dist` |
| `bun run start` | 构建前端并以生产模式启动（单端口 :8000） |
| `bun run check` | TypeScript 类型检查 |
| `bun run lint` | ESLint 检查 |

简写形式：`bun dev`、`bun setup` 等与 `bun run` 等价。

## 项目结构

```
.
├── frontend/                 # 前端（Bun workspace）
│   ├── src/
│   │   ├── pages/            # UploadPage、DashboardPage
│   │   ├── components/       # 图表、筛选、洞察分析等组件
│   │   ├── lib/              # brand.ts、api.ts、columnInference.ts、sessionStorage.ts
│   │   ├── styles/print.css  # 报告打印样式
│   │   └── store/            # Zustand 全局状态
│   ├── vite.config.ts        # 开发代理配置
│   └── dist/                 # 构建产物（生产部署）
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI 入口
│   │   ├── config.py         # 路径与环境配置
│   │   ├── routers/          # upload / charts / analyze / data / actions
│   │   ├── services/         # chart_engine / data_api / ai_analyzer
│   │   └── utils/
│   ├── uploads/              # 用户上传文件（运行时，已 gitignore）
│   ├── charts/               # matplotlib 生成的图表（运行时）
│   ├── .venv/                # Python 虚拟环境
│   └── requirements.txt
├── scripts/
│   ├── setup-backend.mjs     # 创建 venv 并安装 Python 依赖
│   └── run-backend.mjs       # 启动 uvicorn
├── data.csv                  # 内置示例数据（提交到仓库）
├── testdata/                 # 本地测试 CSV/Excel（gitignore，见 testdata/README.md）
├── package.json              # 根级脚本（Bun workspaces）
└── bun.lock                  # 依赖锁文件
```

## 运行架构

### 开发模式

```
浏览器 → Vite (:5173)
           ├─ /api/*    → 代理到 FastAPI (:8000)
           └─ /charts/* → 代理到 FastAPI (:8000)
```

### 生产模式

```
浏览器 → FastAPI (:8000)
           ├─ /api/*    → REST API
           ├─ /charts/* → 静态图表文件
           └─ /*        → frontend/dist（SPA）
```

执行 `bun run start` 时会自动设置 `ENV=production` 并构建前端。

## API 概览

所有接口前缀为 `/api`，响应格式统一包含 `success` 字段。

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/upload` | 上传单个文件 |
| `POST` | `/multi-upload` | 批量上传（多数据集对比） |
| `POST` | `/chart` | 生成 matplotlib 静态图表 |
| `GET` | `/sample` | 加载示例数据并生成图表 |
| `POST` | `/analyze` | 规则引擎数据分析 |
| `GET` | `/data/{file_id}` | 获取原始数据与列类型 |
| `POST` | `/data/{file_id}/filter` | 服务端数据筛选 |
| `POST` | `/data/{file_id}/pivot` | 数据透视 |
| `POST` | `/data/{file_id}/calculate` | 添加计算列 |
| `POST` | `/data/{file_id}/aggregate` | 聚合数据（图表用） |
| `GET` | `/data/{file_id}/stats/{column}` | 列统计信息 |
| `GET` | `/actions` | 获取行动计划列表（`session_id=file_id`） |
| `POST` | `/actions` | 创建单条行动计划 |
| `POST` | `/actions/bulk` | 批量写入行动计划（分析后同步） |
| `PUT` | `/actions/{id}` | 更新行动计划 |
| `PUT` | `/actions/{id}/step` | 切换行动步骤（勾选/取消） |
| `DELETE` | `/actions/{id}` | 删除行动计划 |

`file_id` 为 `sample` 时，后端读取根目录 `data.csv`。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8000` | 后端监听端口 |
| `ENV` | `development` | 设为 `production` 时挂载 `frontend/dist` |

示例：

```bash
# Windows（PowerShell）
$env:PORT=8001; bun run dev:backend

# Linux / macOS
PORT=8001 bun run dev:backend
```

## 生产部署

```bash
bun run start
```

访问 **http://localhost:8000**。FastAPI 同时提供 API 与前端静态资源，无需单独部署 Nginx（小规模场景）。

如需自定义端口：

```bash
# Windows（PowerShell）
$env:PORT=9000; bun run start

# Linux / macOS
PORT=9000 bun run start
```

## 开发说明

- 前端开发服务器默认监听 `0.0.0.0:5173`，可在局域网内访问
- 后端热重载通过 `uvicorn --reload` 实现（`bun run dev:backend`）
- Python 依赖安装在 `backend/.venv`，由 `scripts/setup-backend.mjs` 管理
- 前端依赖通过 Bun workspaces 管理，锁文件为根目录 `bun.lock`
- 上传文件与生成图表存储在 `backend/uploads/` 与 `backend/charts/`，已在 `.gitignore` 中排除

## 常见问题

**`Backend venv not found`**

```bash
bun run setup:backend
```

**端口 8000 被占用**

修改 `PORT` 环境变量，并同步更新 `frontend/vite.config.ts` 中的代理目标地址。

**前端依赖安装失败**

确认已安装 Bun，然后在根目录执行：

```bash
bun install
```

**仅重新安装 Python 依赖**

```bash
bun run setup:backend
```