# ObsidianData 前端

这是 **ObsidianData（黑曜数据）** 的 React + TypeScript + Vite 前端子项目。

## 技术栈

- React 18 + TypeScript
- Vite 6
- ECharts（交互式图表）
- Zustand（全局状态管理）
- Tailwind CSS
- React Router

## 开发

```bash
# 在项目根目录执行
bun run dev:frontend
```

开发服务器默认监听 `http://localhost:5173`，API 与图表请求通过 Vite 代理转发到后端 `http://localhost:8000`。

## 构建

```bash
bun run build
```

构建产物输出到 `frontend/dist`，生产模式下由 FastAPI 统一挂载为 SPA。

## 目录说明

- `src/pages/` — 页面级组件（UploadPage、DashboardPage）
- `src/components/` — 可复用组件（图表、筛选、洞察、行动计划等）
- `src/lib/` — API 封装、工具函数、品牌常量
- `src/store/` — Zustand 全局状态
- `src/styles/print.css` — 报告打印样式
