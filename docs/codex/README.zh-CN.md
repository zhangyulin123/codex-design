# Codex 主题（codex-design 内置能力）

> 本文是**合并后插件 `codex-design` 的 Codex 主题功能文档**。
> 产品总览与安装见 [../../README.md](../../README.md)（English: [../../README_EN.md](../../README_EN.md)）；合并前后的身份与兼容约定见 [../../MIGRATION.md](../../MIGRATION.md)。

**Codex 主题**把 DeepSeek Harness 的整个界面切换成 **Codex 风格**——近黑画布、标志性绿点缀、灰阶文本与发丝轮廓，整体像运行中的终端一样冷静、专注。

> 这是对 OpenAI Codex 设计语言的**启发式解读**，**不是**官方令牌集。

## 特性

- **整站换肤**：注册一个可切换的 `codex` 主题，覆盖 Harness 主界面的背景 / 文字 / 按钮 / 品牌色 / 代码高亮等。
- **一键开关**：设置 → 通用 → **Codex 主题**，点「应用 Codex 主题」立即生效，「恢复系统 亮/暗 跟随」一键还原。
- **跨重启持久化**：是否启用由**宿主路由**持久化（`$DSH_HOME` 下的状态文件），重启后自动恢复。
- **不抢主题**：激活时会主动请其它主题插件（如 catppuccin）让位（切到跟随系统），避免两个主题互抢。
- **侧边栏自动继承**：侧边栏与内置视图的视觉值**只消费 `--dsw-alias-*` / `--dsw-font-*` / `--ds-*` 设计令牌**，不硬编码颜色——主题一换，工作台跟着换。
- **删除会话（一键快捷）**：侧边栏每个会话行多出一个**垃圾桶**按钮，点它即可永久删除该会话。它调用的是 Harness **自带的**会话删除能力（与行内「更多 → 删除会话」同一个 API），由宿主完成完整拆除（释放 agent、删除持久化、从工作区与归档集合注销），不做事后文件手术。
- **已归档会话管理**：侧边栏**底部（设置按钮旁）**有一个「已归档」入口，点开可列出所有已归档会话，支持**恢复（取消归档）**与**删除**。核心 UI 归档后没有查看/取消归档入口，本功能的「恢复」通过宿主路由读写 workspace registry 的归档集合补上；「删除」同样走宿主自带的会话删除 API。

## 调色板要点

| 角色 | 值 |
|---|---|
| 画布（近黑） | `#0b0d10` |
| 分层表面 | `#12151a` / `#16191f` / `#1a1f27` |
| 标志性绿（强调 / 激活） | `#3ecf8e` |
| 主文本 | `#e6e9ee` |
| 次文本 | `#b7bec8` |
| 弱文本 | `#8b929d` |
| 分层手段 | **发丝边框**（hairline），不用阴影 |
| 整体气质 | 等宽优先（mono-first） |

## 使用

1. 打开 **设置 → 通用**。
2. 找到 **「Codex 主题」** 行。
3. 点 **「应用 Codex 主题」** → 整站切到 Codex 风格。
4. 点 **「恢复系统 亮/暗 跟随」** → 回到系统默认。

### 删除会话

两种方式，效果相同（都走 Harness 自带的会话删除能力）：

1. **一键垃圾桶（本功能加）**：把鼠标移到任意会话行，该行 `···` 左侧会出现**垃圾桶**按钮 → 点它 → 主题化确认框 → 删除。
2. **原生菜单**：点该行 `···` → **删除会话**。

> **注意**：删除不可恢复。由宿主负责完整拆除（释放 agent、删除持久化、从工作区与归档集合注销），删除后不会残留幽灵会话。

### 已归档会话

1. 在**侧边栏底部（设置按钮旁）**点击 **「已归档」** 入口（带数量小徽标）。
2. 弹出面板列出所有已归档会话，每行可：
   - **恢复** → 取消归档，该会话重新出现在侧边栏对应分组。
   - **删除** → 永久删除（含对话记录）。
3. 点标题或 `✕` 关闭面板。

> **说明**：核心 UI 没有「已归档」入口（归档后会话会从所有分组隐藏，且无法取消归档），本功能补上了「查看/恢复/删除」。恢复会实时写回 workspace registry 的归档集合，无需刷新。

## 安装

本主题**不是独立插件**：它随合并后的 **`codex-design`** 一起提供，装好工作台即有。

```sh
dsh plugin --profile web add codex-design@latest          # 首次会因 pnpm 11 拦截 node-pty 构建脚本而失败（依赖已写入）
cd ~/.dsh/profiles/web && pnpm approve-builds --all       # 放行构建脚本（node-pty 仍需要；自动重跑安装）
dsh plugin --profile web add codex-design@latest          # 重跑即成功
```

装完**硬刷新浏览器**（Cmd/Ctrl+Shift+R）。完整说明（含从旧包升级、源码安装、plugin-registry 通道）见 [../../README.md](../../README.md) 的「🚀 安装」与 [../../MIGRATION.md](../../MIGRATION.md)。

## 代码位置（合并后的 TypeScript 模块）

> 合并前这是无构建手写 JS 插件（`lib/index.js` + `lib/client.js`）；该实现已删除（存于 git 历史），能力已改写为 `src/` 下的一等 TypeScript 模块。

- **主题注册 / 调色板（client 半）**：`src/client/codex/theme.ts`——注册可切换的 `codex` 主题、定义 `CODEX_TOKENS` 调色板（`Record<令牌名, CSS 值>`，主题的职责就是**定义**这些令牌的值）、应用/还原动作，并请其它主题插件让位。
- **设置行**：`src/client/codex/settings.tsx`（+ `settings.module.css`）——设置 → 通用 的「Codex 主题」控制行与分享色块。
- **会话 / 归档数据层**：`src/client/codex/sessions.ts`——删除会话、已归档列表与取消归档。
- **注册胶水**：`src/client/codex/index.ts`——挂主题控制器、注册设置行与 Codex 页面。
- **宿主持久化路由**：`src/codex-routes.ts`——启用状态的读写（状态文件落在 `$DSH_HOME` 下），重启后读取并重放；由 `src/index.ts` 的 `/sidebar/api` 分发器接入。
- **client 侧 API 包装**：`src/client/api.ts`（`codexStateGet` / `codexStateSet` / `codexSessionsArchived` / `codexSessionsUnarchive` / `codexSessionsDelete`）。
- **Codex 侧边栏页面**：`src/client/codex/panel.tsx`（+ `codex-page.module.css`）——注册为普通 Tab（id `codex-design:codex`），页内三段：主题控制、设计令牌清单、会话与已归档管理（含行内确认删除，不用 `window.confirm`）。
- **设计令牌文件视图器**：`src/client/codex/viewer.tsx`——注册为普通 FileViewer（id `codex-design:tokens`）。它按扩展名认领 `md / json / css / yaml / yml`，但**只在文件名含 `design` / `token(s)` 且内容确实解析出令牌对**时渲染令牌板；其余认领到的文件一律**委派回内置视图器行为**（用 `LazyTextEditor` + 内置的 `viewerId`），因此 `.md` 仍是完整 Markdown 预览、`.json`/`.css`/`.yaml` 仍可编辑——工作台能力零回退。
- **测试守护**：`tests/codex-theme.spec.ts`（调色板令牌完整性 + 主题控制器）与 `tests/codex-routes.spec.ts`（宿主持久化状态、归档集、删除回退路径）。

> **上色规则**：Codex 模块只按 `--dsw-*` / `--ds-*` **令牌名**影响观感（组件样式表里只写 `var(--dsw-…)` / `var(--ds-…)`，不出现字面量颜色）；**字面量颜色值只允许写在 `theme.ts` 的调色板里**。详见 [AGENTS.md](../../AGENTS.md) §5。

## 兼容性

- 需要 DSH（DeepSeek Harness）Web 客户端（`@deepseek-ai/dsh-client-ui-theme` 提供主题服务）。
- 与 catppuccin 等主题插件共存时，codex 生效会请其让位（切到跟随系统）。
- 主题与侧边栏的视觉都走 `--dsw-*` 令牌，因此与皮肤体系（令牌驱动）兼容；皮肤令牌若是不透明值，终端 / 编辑器表面直接跟随。

## 许可证

MIT（见仓库根 [LICENSE](../../LICENSE)）。
