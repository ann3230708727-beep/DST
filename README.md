# 做点儿啥

一个强调**低决策成本、强提醒、轻量常驻**的个人待办工具。

## 当前代码基线

- 产品版本：**v2.7.1**
- 视觉 / 交互基线：**V1.1**
- 页面入口：`index.html`
- 数据存储：浏览器本地 `localStorage`
- PWA：`manifest.webmanifest` + `sw.js`

`main` 分支从现在起作为当前代码事实来源。后续修改应直接落到仓库，不再通过多个本地 HTML 副本判断最新版。

## 目录

```text
DST/
├─ index.html
├─ styles-1.css
├─ styles-2.css
├─ app-core-1.js
├─ app-core-2.js
├─ app-tasks-1.js
├─ app-tasks-2.js
├─ app-tasks-3.js
├─ app-ui-1.js
├─ app-ui-2.js
├─ app-ui-3.js
├─ manifest.webmanifest
├─ sw.js
└─ docs/
```

当前网页由最新的 `做点儿啥_v2.7.1_视觉与交互V1.1落实版.html` 机械拆分而来，拆分目的是让 GitHub 更容易浏览和维护；业务逻辑与加载顺序保持为同一基线。

## 在线预览：GitHub Pages

这是纯静态前端项目，最简开发流程是直接从 `main` 分支根目录发布 GitHub Pages：

1. Repository → **Settings** → **Pages**
2. **Source** 选择 `Deploy from a branch`
3. Branch 选择 `main`
4. Folder 选择 `/(root)`
5. Save

启用后，项目站点通常为：

`https://ann3230708727-beep.github.io/DST/`

之后只需要把修改推送到 `main`，GitHub Pages 会从同一个分支重新发布；日常预览只刷新固定网址即可。

> 当前仓库是 Private。GitHub 是否允许直接从私有仓库发布 Pages 取决于 GitHub 账户方案；如果当前方案不支持，可以选择把仓库改为 Public，或改用外部静态托管（例如 Surge / Cloudflare Pages / Netlify）。

## 开发原则

1. v2.7.1 是当前唯一代码基线。
2. V1.1 是当前唯一视觉 / 交互基线。
3. 不擅自增加新功能。
4. 不为 UI 改造重构已经正常工作的业务逻辑。
5. 不因为视觉升级删除现有能力。
6. 所有改动应能追溯到规范或明确需求。
7. Windows 系统级能力如果 Web/PWA 壳无法可靠实现，不使用网页内部假动画冒充。
