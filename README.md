# codex-design

**codex-design**：为 DeepSeek Harness 打造的一款**终端原生暗色主题**插件。一键把 Harness 界面切换到 **Codex 风格**——近黑画布、标志性绿点缀、灰阶文本与单色轮廓，整体像运行中的终端一样冷静、专注。

> 这是对 OpenAI Codex 设计语言的**启发式解读**，并非官方令牌集。

## 特性

- **整站换肤**：注册一个可切换的 `codex` 主题，覆盖 Harness 主界面的背景/文字/按钮/品牌色/代码高亮等。
- **一键开关**：设置 → 通用 → **Codex 主题**，点「应用 Codex 主题」立即生效，「恢复系统 亮/暗 跟随」一键还原。
- **跨重启持久化**：是否启用通过宿主路由持久化到 `$DSH_HOME/codex-design-state.json`，重启后自动恢复。
- **不抢主题**：激活时会主动请其它主题插件（如 catppuccin）让位（切到跟随系统），避免两个主题互抢。
- **删除会话**：侧边栏每个会话行多出一个垃圾桶按钮，点它可**永久删除**对应会话（含对话记录），并立即刷新。核心 UI 未提供「删除会话」入口，本插件通过宿主路由删除该会话在 `$DSH_HOME/sessions/**` 下的持久化日志目录。
- **已归档会话管理**：侧边栏**底部（设置按钮旁）**有一个「已归档」入口，点开可列出所有已归档会话，支持**恢复（取消归档）**与**删除**。核心 UI 归档后没有查看/取消归档入口，本插件通过宿主路由读写 workspace registry 的归档集合补上。

## 安装

插件市场（一键安装）：
```
dsh plugin --profile web add codex-design@0.1.0
```

或手动装本地目录 / tarball：
```
cd <web-profile>   # 例如 %APPDATA%\dsh-desktop\harness\profiles\web
pnpm add <path-to-codex-design>
pnpm add <path-to-codex-design-0.1.0.tgz>
```

安装后**重启一次 Harness**。

## 使用

1. 打开 **设置 → 通用**。
2. 找到 **「Codex 主题」** 行。
3. 点 **「应用 Codex 主题」** → 整站切到 Codex 风格。
4. 点 **「恢复系统 亮/暗 跟随」** → 回到系统默认。

### 删除会话

1. 在左侧会话栏把鼠标移到任意会话行。
2. 该行 `···` 按钮左侧会出现一个**垃圾桶**按钮。
3. 点它 → 确认弹窗 → 该会话的对话记录被**永久删除**并刷新界面。

> **注意**：删除会物理剔除 `$DSH_HOME/sessions/**` 下该会话的 JSONL 日志目录，**不可恢复**。正在运行的会话在删除后刷新时会被移除。

### 已归档会话

1. 在**侧边栏底部（设置按钮旁）**点击 **「已归档」** 入口（带数量小徽标）。
2. 弹出面板列出所有已归档会话，每行可：
   - **恢复** → 取消归档，该会话重新出现在侧边栏对应分组。
   - **删除** → 永久删除（含对话记录）。
3. 点标题或 `✕` 关闭面板。

> **说明**：核心 UI 没有「已归档」入口（归档后会话会从所有分组隐藏，且无法取消归档），本插件补上了「查看/恢复/删除」。恢复会实时写回 workspace registry 的归档集合，无需刷新。

## 目录结构

```
codex-design/
├── package.json        # dsh.client.platform="web" + dsh.bundle.patch + ./client 导出
├── cordis.patch.yml    # dsh.bundle.patch：insert 挂载服务端行
├── lib/
│   ├── index.js        # 宿主(服务端)：/state 持久化 + /session 删除 + /session/unarchive 恢复路由
│   └── client.js       # 浏览器端：codex 主题 + 静默 catppuccin + 开关行 + 会话行删除 + 已归档面板
└── README.md
```

## 兼容性

- 需要 DSH（DeepSeek Harness）Web 客户端（`@deepseek-ai/dsh-client-ui-theme` 提供主题服务）。
- 与 catppuccin 等主题插件共存时，codex 生效会请其让位（切到跟随系统）。

## 许可证

[MIT](LICENSE)
