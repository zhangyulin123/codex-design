# 合并记录（codex-design v0.19.0）

> 本文记录 **codex-design** 与 **dsh-better-sidebar v0.18.0** 的合并：两个项目合成**一个包**，作为双方的共同继任者。
> 面向：从 `dsh-better-sidebar@0.18.0` 升级的用户与插件作者、以及接手本仓库的贡献者。
> 兼容常量速查见「[兼容性约定](#5-兼容性约定--compatibility-contract)」，未完成事项见「[合并后待办](#7-合并后待办post-merge-todos)」。

---

## 1. 合并结论（一句话）

- **一个包**：npm 包名 `codex-design`，版本 **`0.19.0`**；`dsh.plugin.json` 的插件 id 为 `your-org/codex-design`（`your-org` 是待替换占位符，见待办）。
- **一套目录结构**：沿用原 sidebar 仓库的结构（`src/` 双半、`tests/`、`docs/`、`scripts/`、`.github/workflows/`、`tsdown.config.ts`、`vitest.config.ts`、`tsconfig*.json`、`pnpm-workspace.yaml`、`Makefile`）。
- **能力 = 并集**：原 `dsh-better-sidebar` 的**完整工作台能力**（见 §2）＋ 原 `codex-design` 的 **Codex 主题与会话管理能力**（见 §3）。
- **旧实现已删除**：原 codex-design 是**无构建、手写 JS**的小插件（`lib/index.js` + `lib/client.js`），这两个文件已从工作树删除（只留在 git 历史里），其能力已作为**一等 TypeScript 模块**移植进 `src/`——client 半在 **`src/client/codex/`**（主题引擎 `theme.ts`、设置行 `settings.tsx`、会话/归档数据层 `sessions.ts`、注册胶水 `index.ts`），宿主持久化路由在 **`src/codex-routes.ts`**（由 `src/index.ts` 的 `/sidebar/api` 分发器接入）。`lib/` 现在是**构建产物目录**（gitignored，`pnpm build` 生成）。

---

## 2. 从 `dsh-better-sidebar` v0.18.0 吸收的内容

v0.18.0 的**完整源码树**被并入本包，因此下列能力现在是 `codex-design` 的一部分：

| 能力 | 说明 |
|---|---|
| 文件资源管理器 + CodeMirror 编辑器 | 懒加载目录树、软链接分类、上传、文件名搜索、语言高亮（含 19 个第三方语言覆盖） |
| 内联预览器 | 图片 / Markdown（Mermaid + README 级内嵌 HTML + TOC）/ HTML / PDF |
| 内嵌浏览器 | 多开网页 tab、沙箱 iframe、回环允许清单 |
| 真实终端 | xterm.js + node-pty 真 shell、断线重连回放、`terminal_*` 模型工具、固定终端 |
| 「文件变动」统一 tab | Git 视角（diff / 历史 / 暂存·提交·还原 / worktree·子仓库）＋ 本轮文件视角（模型读/写/编辑实时追踪） |
| 子代理 / 后台任务页 | 子代理拓扑 + `subagents.live` 批量实时预览 + 后台任务清单 |
| 侧边对话（Codex 风格） | 每线程一个 tab、继承主会话完整上下文、可保存为新会话 |
| 双工作台 | 右侧栏 + 底部面板、分栏拆分/合并、自由浮窗、按会话隔离 |
| 声明式设置 + 懒加载 chunk | 侧边卡片分区、按需下发 `lib/client-*.js` |
| 扩展 API | `ctx.betterSidebar` 服务（`registerTab` / `registerFileViewer`），对第三方插件保持开放 |

构建 / 测试命令与上游一致（`pnpm install` / `build` / `typecheck` / `test` / `pack` / `test:mount` / `check:consumer-types`，`make help` 列出薄封装目标）。

---

## 3. 被吸收的 Codex 主题与会话管理能力

原 codex-design 提供、现在作为合并包内置能力的三项：

1. **整站 Codex 主题**：注册可切换的 `codex` 主题——近黑画布、标志性绿点缀 `#3ecf8e`、灰阶文本、发丝边框（用边框而不是阴影），整体是终端原生的冷静观感。入口在**设置 → 通用 → 「Codex 主题」**，可「应用 Codex 主题」/「恢复系统 亮/暗 跟随」。这是对 OpenAI Codex 设计语言的**启发式解读**，**不是官方令牌集**。
   - 是否启用通过**宿主路由**持久化（`$DSH_HOME` 下的状态文件），跨重启自动恢复。
   - 激活时会**主动请其它主题插件（如 catppuccin）让位**（切到跟随系统），避免两个主题互抢。
   - 启用后**侧边栏自动继承**：侧边栏的视觉值只消费 `--dsw-alias-*` / `--dsw-font-*` / `--ds-*` 令牌，换肤自动跟随。
2. **会话行一键删除（垃圾桶按钮）**：侧边栏每个会话行多出一个垃圾桶按钮，点击即永久删除该会话。走的是 Harness **自带**的会话删除能力（`ctx.sessions.delete()`，与行内「更多 → 删除会话」同一个 API），由宿主完成完整拆除（释放 agent、删除持久化、从工作区与归档集合注销），插件不做事后文件手术。
3. **「已归档」会话管理**：侧边栏底部（设置按钮旁）的入口列出所有已归档会话，支持**恢复（取消归档）**与**删除**。核心 UI 归档后没有查看/取消归档入口，「恢复」通过宿主路由读写 workspace registry 的归档集合补上；「删除」同样走宿主自带的会话删除 API。

**移植落点（已落地，路径以工作树为准）**：

| 角色 | 路径 |
|---|---|
| client 半主题引擎（`CODEX_TOKENS` 调色板、主题注册、应用/还原、请其它主题让位） | `src/client/codex/theme.ts` |
| 设置 → 通用 的「Codex 主题」控制行 | `src/client/codex/settings.tsx`（+ `settings.module.css`） |
| 会话 / 归档数据层（删除、已归档列表、取消归档） | `src/client/codex/sessions.ts` |
| 注册胶水（挂主题控制器、注册设置行与页面） | `src/client/codex/index.ts` |
| 宿主持久化路由（由 `src/index.ts` 的 `/sidebar/api` 分发器接入） | `src/codex-routes.ts` |
| client 侧 API 包装（`codexStateGet` / `codexStateSet` / `codexSessionsArchived` / `codexSessionsUnarchive` / `codexSessionsDelete`） | `src/client/api.ts` |
| 测试守护（调色板令牌覆盖 / 主题控制器） | `tests/codex-theme.spec.ts` |

---

## 4. 身份映射表（旧 → 新）

**已改名**（包身份，全部指向新名字）：

| 位置 | 旧（dsh-better-sidebar v0.18.0） | 新（codex-design v0.19.0） |
|---|---|---|
| npm 包名 / `package.json` `name` | `dsh-better-sidebar` | `codex-design` |
| `package.json` `version` | `0.18.0` | `0.19.0` |
| `dsh.plugin.json` `id` | `dsh-external/dsh-better-sidebar` | `your-org/codex-design`（占位，见待办） |
| `cordis.patch.yml` 挂载 id | `better-sidebar` | `codex-design` |
| `cordis.patch.yml` 挂载 name | `'dsh-better-sidebar'` | `'codex-design'` |
| 宿主半插件 `name` 导出（`src/index.ts`） | `'dsh-better-sidebar'` | `'codex-design'` |
| 不变量伴生名（`src/invariant.ts`） | `…-invariant` | `'codex-design-invariant'` |
| client bundle id（`tsdown.config.ts`） | `dsh-better-sidebar` | `codex-design` |
| CI / release 的 git user | 旧项目名 | `codex-design-ci` |
| 聚合双挂载 fixture | 旧项目名 | `tests/fixtures/aggregate-codex-design` |
| **宿主 DOM 标记** | `data-dsh-better-sidebar` | `data-codex-design`（**同时**继续输出 `data-dsh-better-sidebar`，见下） |

**刻意保留**（生态兼容，**不要"顺手修掉"**）：见下一节 §5「兼容性约定 / Compatibility contract」的完整表格。

---

## 5. 兼容性约定 / Compatibility contract

下列标识符**故意保持旧值**，因为它们是**运行时契约**：改名会直接打断已发布的第三方插件、已持久化的用户状态或已有的皮肤覆盖。它们是本仓库的长期承诺，改动需要一次带迁移方案的大版本。

| 保留项 | 值 | 为什么保留 |
|---|---|---|
| 客户端服务名 | `ctx.betterSidebar` | **28+ 第三方插件**用 `inject: ['betterSidebar']` + `ctx.betterSidebar` 接入；改名等于让所有插件当场失效 |
| 语言命名空间 | `'betterSidebar'` | `ctx.locale.lookup('betterSidebar', key)` 是对外契约，第三方插件与 better-locale 覆盖都按这个名字取词典 |
| 宿主路由前缀 | `/sidebar/*`（`/sidebar/api`、`/sidebar/bundle`、`/sidebar/file`、`/sidebar/html`、`/sidebar/ws/*`） | 第三方插件与皮肤会直接 fetch 这些路由；改名会让它们 404 |
| 设置 / 偏好命名空间常量 | `SIDEBAR_PREFS_NS = 'dsh-better-sidebar'`（`src/prefs-shared.ts`） | **老用户升级不丢数据**：沿用旧字符串，侧边卡片偏好、Tab 布局与会话级状态原样带过来。宿主侧命名空间走编译期模板字面量校验，`'dsh-better-sidebar'` 字面量仍然合法 |
| Tab id | `editor` / `git` / `subagent` / `sidechat` / `terminal` / `browser` / `diff` | 持久化布局与第三方 Tab 覆盖按 id 解析；改名会让已存布局变成一堆"孤儿 tab" |
| Viewer id | `image` / `pdf` / `markdown` / `html` / `code` / `binary-download` | 同上，文件预览器的匹配与覆盖按 id 走 |
| 宿主 DOM 标记 | 同时输出 `data-codex-design`（新，主）**与** `data-dsh-better-sidebar`（旧，兼容） | 已发布的**皮肤插件**按旧属性做 DOM 覆盖选择器；保留旧属性它们不用改一行代码 |
| localStorage 键 | `dsh-sidebar:v1:*`（含全局宽度键） | 属**用户状态**而非包身份；改名＝丢布局。`?dsh-sidebar-reset` 逃生参数同样保留 |
| `docs/plans/**` 正文 | 保留原项目名与原始 PR / issue 编号 | 它们是**历史设计记录**（逐特性设计史 + 实施偏差），不是当前文档；回改编号会让引用失真 |

> 结论：**"产品名"改成 codex-design**；**"运行时契约"一律不动**。二者的边界就是上表。

---

## 6. 迁移步骤（从旧包升级的用户）

1. **删掉旧的手动挂载行**（如果 profile 里有）：
   检查 `~/.dsh/profiles/<profile>/cordis.patch.yml`，若还留着 `- insert: ... better-sidebar ...`（或旧的 `codex-design` 行）就删掉那一段。留着会**双挂载**——Node 半挂两次，页面出现两个侧边栏。
   > `scripts/install.sh` / `scripts/install.ps1` 已经会**幂等清理旧 id（`better-sidebar`）与新 id（`codex-design`）两种手动挂载行**，用脚本装就不用自己动手。
2. **安装合并后的包**：
   ```sh
   dsh plugin --profile web add codex-design@latest   # 首次会因 pnpm 11 拦截 node-pty 构建脚本而失败（依赖已写入）
   cd ~/.dsh/profiles/web && pnpm approve-builds --all  # 放行构建脚本（node-pty 仍需要），自动重跑安装
   dsh plugin --profile web add codex-design@latest     # 重跑即成功
   ```
   bundle 通道会读包内 `dsh.bundle.patch`（`cordis.patch.yml`）自动挂载 `codex-design`，无需手写挂载行。
3. **硬刷新浏览器**（Cmd/Ctrl+Shift+R）即可看到合并后的工作台。DSH 对 client 改动热加载；只有 **host 半**更新才需要重启 Harness。

**升级后你会自动获得**：原有侧边栏布局 / Tab / 偏好**原样保留**（见 §5 的命名空间与 localStorage 契约），并新增 Codex 主题（设置 → 通用）与会话管理入口。

**卸载 / 回滚**：`dsh plugin --profile web remove codex-design`。若装了 `dsh-better-sidebar@0.18.0` 与新包，先移除其中一个再装另一个，避免同包双挂载。

---

## 7. 合并后待办（Post-merge TODOs）

> 下列**占位符与外部配置**必须在正式发布前落实；本仓库当前状态是"功能已合并并完成 TypeScript 移植、包身份待定稿"。已完成项以 `[x]` 标出，便于对照。

- [ ] **`your-org` 占位符**（3 处，必须一致）：
  - `package.json` → `repository.url`（现为 `https://github.com/your-org/codex-design`）
  - `dsh.plugin.json` → `id`（现为 `your-org/codex-design`）
  - `tsdown.config.ts` → registry 通道的 client bundle id（现为 `clientBundle('your-org/codex-design', 'client-registry.js')`；bundle id 必须与 `dsh.plugin.json` 的 id 一致）
  - 连带：`scripts/package-registry.mjs` 打印的 `dsh registry enable your-org/codex-design` 提示、`scripts/install.ps1` 注释里的 raw 下载 URL、README / README_EN 的 registry 安装段与徽章。
- [ ] **npm Trusted Publishing（OIDC）一次性配置**：npmjs.com → 包 `codex-design` → Settings → Publishing access → Trusted Publishers → Provider `GitHub Actions`，填入**新的** Org / Repo / Workflow filename。**旧配置属于上一个项目**（Org `omdsh-dev`、Repo `DSH-better-sidebar`、Workflow `release.yml`），必须重新配置，否则 release workflow 无法发版（仓库不配 `NPM_TOKEN`）。工作流文件本身仍是 `.github/workflows/release.yml`，其中 `Organization or user` 目前写着占位 `your-org`。
- [ ] **确认版本号 `0.19.0`**：`package.json`、`dsh.plugin.json`、release tag（`v0.19.0`）三处必须一致——release workflow 会校验 tag 与 `package.json` `version` 匹配。若最终决定改号，三处同步改。
- [ ] **重新生成 `pnpm-lock.yaml`（首次构建前必做）**：合并后的 `package.json` 与锁定文件不再一致——新增了 Codex 主题所需的 `@deepseek-ai/dsh-client-ui-theme`（`peerDependencies` + `devDependencies`，也是 `dsh.client.inject` 里新增的一项），而 `pnpm-lock.yaml` 还停留在上游清单。CI 用的是 `pnpm install --frozen-lockfile`，两者不一致会**直接失败**。本地执行一次**不带** `--frozen-lockfile` 的 `pnpm install`（这一步同时装齐全部依赖；若 pnpm 11 拦截了 `node-pty` 的构建脚本，按 README 的 FAQ 在 profile 目录跑 `pnpm approve-builds --all`），确认 `pnpm build` / `pnpm typecheck` / `pnpm test` 全绿后，把更新后的 `pnpm-lock.yaml` 一并提交。
- [x] **Codex 模块的 TypeScript 移植已落地**（不再是待办）：client 半在 `src/client/codex/`（`theme.ts` 主题引擎 / `settings.tsx` 设置行 / `sessions.ts` 会话与归档数据层 / `panel.tsx` Codex 侧边栏页面 / `viewer.tsx` 设计令牌文件视图器 / `index.ts` 注册胶水），宿主持久化路由在 `src/codex-routes.ts`（由 `src/index.ts` 的 `/sidebar/api` 分发器接入），client 侧 API 包装在 `src/client/api.ts`，测试守护在 `tests/codex-theme.spec.ts` 与 `tests/codex-routes.spec.ts`——见 §3 的「移植落点」表。
- [x] **DOM 标记双写已确认**：`src/client/index.tsx` 在挂载宿主上**同时**写入 `data-codex-design` 与旧标记 `data-dsh-better-sidebar`，与 §5 的兼容承诺一致（依赖旧属性做 DOM 覆盖的皮肤插件不受影响）。
  > 📌 **视图器认领策略（设计决定，勿误改）**：`src/client/codex/viewer.tsx` 按扩展名认领 `md / json / css / yaml / yml`（服务的匹配只走 `exts`；`detect` 只在带 head 字节的重匹配里被咨询，纯文本读从不触发——因此无法只靠文件名规则认领）。它**不会**抢走这些文件的既有行为：只有文件名含 `design` / `token(s)` 且内容确实解析出令牌对时才渲染 Codex 令牌板，其余一律委派回内置视图器（`LazyTextEditor` + 内置 `viewerId`），`.md` 仍走完整 Markdown 预览、`.json`/`.css`/`.yaml` 仍可编辑。改动这条委派会静默降低工作台能力。
- [ ] **文档里的历史链接**：README 的 changelog 段与 `docs/plans/**` 保留指向 `github.com/omdsh-dev/DSH-better-sidebar` 的 PR / issue 链接（真实历史引用，不回改）；其余**当前文档**引用已切到新包名。

---

## 8. 相关文档

- 产品与安装：[README.md](./README.md)（中文）/ [README_EN.md](./README_EN.md)（English）
- 接入 API 全参考：[docs/external-plugin-guide.md](./docs/external-plugin-guide.md)
- 逐特性设计史：[docs/plans/](./docs/plans/)（含 [docs/plans/README.md](./docs/plans/README.md) 说明其历史定位）
- Codex 主题能力文档：[docs/codex/README.zh-CN.md](./docs/codex/README.zh-CN.md)
- 仓库开发规则：[AGENTS.md](./AGENTS.md)
