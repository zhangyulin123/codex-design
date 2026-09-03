# codex-design

**codex-design**：为 DeepSeek Harness 打造的一款**终端原生暗色主题**插件。一键把 Harness 界面切换到 **Codex 风格**——近黑画布、标志性绿点缀、灰阶文本与单色轮廓，整体像运行中的终端一样冷静、专注。

> 这是对 OpenAI Codex 设计语言的**启发式解读**，并非官方令牌集。

## 特性

- **整站换肤**：注册一个可切换的 `codex` 主题，覆盖 Harness 主界面的背景/文字/按钮/品牌色/代码高亮等。
- **一键开关**：设置 → 通用 → **Codex 主题**，点「应用 Codex 主题」立即生效，「恢复系统 亮/暗 跟随」一键还原。
- **跨重启持久化**：是否启用通过宿主路由持久化到 `$DSH_HOME/codex-design-state.json`，重启后自动恢复。
- **不抢主题**：激活时会主动请其它主题插件（如 catppuccin）让位（切到跟随系统），避免两个主题互抢。

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

## 目录结构

```
codex-design/
├── package.json        # dsh.client.platform="web" + dsh.bundle.patch + ./client 导出
├── cordis.patch.yml    # dsh.bundle.patch：insert 挂载服务端行
├── lib/
│   ├── index.js        # 宿主(服务端)：注册 /codex-design/state 持久化路由
│   └── client.js       # 浏览器端：注册 codex 主题(setTheme) + 静默 catppuccin + 开关行
└── README.md
```

## 兼容性

- 需要 DSH（DeepSeek Harness）Web 客户端（`@deepseek-ai/dsh-client-ui-theme` 提供主题服务）。
- 与 catppuccin 等主题插件共存时，codex 生效会请其让位（切到跟随系统）。

## 许可证

[MIT](LICENSE)
