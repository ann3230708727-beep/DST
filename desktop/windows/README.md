# Do Stuff Windows Tauri 壳（第一阶段）

这个目录只负责 Windows 原生窗口能力，不承载任务业务逻辑。

## 第一阶段能力

- 顶部 Pin：切换真正的 Always on Top。
- 启动后自动吸附到当前显示器右侧工作区。
- 鼠标离开窗口约 650ms 后向右收起，仅保留约 10px 可触达边缘。
- 鼠标重新进入边缘后立即展开。
- 多显示器/DPI：位置计算使用 Tauri 返回的物理像素工作区，不写死屏幕尺寸。

## Web 代码关系

`npm run sync-web` 会把仓库根目录当前 Web/PWA 资源复制到 `desktop/windows/dist`，并只在复制品里注入 `shell-bridge.js`。

因此：

- 根目录 Web/PWA 仍是唯一业务代码基线；
- Windows 壳不会复制或重写任务解析、提醒、完成、存储等逻辑；
- `dist/` 是生成目录，不提交 Git。

## 本地启动（Windows）

前置环境：Node.js、Rust、Microsoft C++ Build Tools，以及系统 WebView2 Runtime。

```bash
cd desktop/windows
npm install
npm run dev
```

第一阶段暂不生成安装包（`bundle.active=false`）。确认置顶、吸附和收起体验后，再补图标、安装包与窗口状态持久化。
