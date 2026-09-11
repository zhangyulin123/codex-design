# 设计文档目录（docs/plans/）

> 本目录是 **codex-design** 逐特性设计史的存档。**新设计文档也放在这里**，与本目录既有文件并列。

## 1. 这些文件是什么

- 这里的文档是**合并前的 `dsh-better-sidebar` 项目**在开发过程中逐特性写下的设计稿与实施记录（含**实施偏差记录**——最终实现与当初设计不一样的地方会写明）。
- 它们记录的是**当时**的结论与取舍，**不是**当前 API 的权威说明。要找"现在怎么接入"，看 [docs/external-plugin-guide.md](../external-plugin-guide.md)；产品与安装看 [README.md](../../README.md)；仓库规则看 [AGENTS.md](../../AGENTS.md)。

## 2. 为什么正文里保留旧项目名与旧编号

- 这些文档正文中的**项目名（`dsh-better-sidebar`）、npm 包名、PR / issue 编号与链接**都**故意保持原样**：它们是**历史记录**，改掉会让引用指向错误的位置，也会抹掉可追溯的开发脉络。
- 同理，本目录的**文件名**（含日期前缀）也保持原样，不做重命名。
- 这是**刻意的保留**，不是漏改。其他界面/契约层面的"保留旧值"清单见 [MIGRATION.md](../../MIGRATION.md) 的「兼容性约定」一节。

## 3. 新增设计文档的约定

1. **命名**：`<日期>-<特性 slug>.md`，例如 `2026-09-01-codex-theme-merge-design.md`（日期用 `YYYY-MM-DD`，与既有文件一致）。
2. **内容**：写清**动机 / 方案 / 取舍 / 实施偏差**；涉及对外契约（`ctx.betterSidebar`、`/sidebar/*` 路由、皮肤令牌契约）时，同时更新 [docs/external-plugin-guide.md](../external-plugin-guide.md)——该指南是唯一权威接入文档，不再双份维护。
3. **写新名字**：**新**文档一律使用合并后的包名 `codex-design`；只有**引用历史**时才写旧名。
4. **合并相关**：与本次合并本身有关的记录写在 [MIGRATION.md](../../MIGRATION.md)，不必再单开设计文档。

## 4. 目录速览

既有文档按时间顺序覆盖了这些主题（节选，非全集）：

- 工作台基座：服务注册表（`2026-08-11-service-registry-design.md`）、声明式设置（`2026-08-11-declarative-sidebar-settings-design.md`）、懒加载 chunk（`2026-08-12-lazy-chunks-design.md`）
- 预览与编辑：PDF / Office / PPTX / DOCX 预览（`2026-08-10-*`）、Mermaid 安全渲染（`2026-08-17-mermaid-safe-render-design.md`）、README 级 HTML + TOC（`2026-08-24-markdown-html-toc-design.md`）
- 面板与窗口：移动端布局（`2026-08-12-mobile-layout-design.md`）、统一面板宿主注入（`2026-08-19-sidebar-injection-unified-host-design.md`）、自由窗口（`2026-08-23-free-window-design.md`）、固定终端（`2026-08-26-pinned-terminal-design.md` / `-plan.md`）
- 任务与对话：子代理 / 后台任务（`2026-08-12-subagent-background-tasks-design.md`）、侧边对话 tab（`2026-08-20-sidechat-tab-design.md`）
- 平台与皮肤：皮肤兼容（`2026-08-15-skin-compat-design.md`）、桌面方案设置（`2026-08-20-desktop-scheme-settings-design.md`）、Edge 151 Origin 围栏（`2026-08-17-edge151-origin-portless-fence.md`）
- 其他：聊天文件打开漏斗（`2026-08-31-openpath-intercept-alpha-design.md`）、性能优化（`2026-08-31-perf-optimization.md`）

新建文档直接追加在本列表覆盖之外即可，无需回改上面的速览。
