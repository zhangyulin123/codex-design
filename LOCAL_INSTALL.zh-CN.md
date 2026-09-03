# codex-design · 本地安装指南

本说明针对**不发布到 npm、直接在本机使用 `codex-design`（DeepSeek Harness 的 Codex 暗色主题插件）**的安装步骤。如果你要上架到 dsh-market，见 [README.md](README.md)。

> 交付物：`codex-design-0.1.0.tgz`（`npm pack` 生成，内容 = `package.json` + `lib/` + `cordis.patch.yml`）。

## 前置条件

- 已安装 DSH Desktop，并能正常打开 Harness。
- 能从终端执行 `dsh plugin --profile web ...`，或能进入 web profile 目录执行 `pnpm ...`。

## 方式 A：从 tarball 安装（推荐）

用 `dsh plugin` 直接装本地 tarball（等效于从 registry 装，只是来源是本地文件）：

```bash
dsh plugin --profile web add "D:\Program Files\awesome-design-md-main\plugins\codex-design\codex-design-0.1.0.tgz"
```

如果 `dsh plugin` 不接受 tarball 路径，可在 **web profile** 里用 pnpm 装：

```bash
# 进入 web profile（默认 C:\Users\<你>\AppData\Roaming\dsh-desktop\harness\profiles\web）
cd "%APPDATA%\dsh-desktop\harness\profiles\web"
pnpm add "D:\Program Files\awesome-design-md-main\plugins\codex-design\codex-design-0.1.0.tgz"
```

> 装到 web profile 后，DSH 启动时会按 generation 机制组合它（`dsh.profile.bundles` 会加入 `codex-design`，`node_modules/codex-design` 指向插件目录）。

## 方式 B：从本地目录安装（开发调试）

不打包、直接用源码目录：

```bash
cd "%APPDATA%\dsh-desktop\harness\profiles\web"
pnpm add "D:\Program Files\awesome-design-md-main\plugins\codex-design"
```

## 安装后启用

1. **完全退出 DSH Desktop → 重新打开**（客户端模块在启动时组合，需重启）。
2. 打开 **设置 → 通用**，找到 **「Codex 主题」** 行。
3. 点 **「应用 Codex 主题」** —— 整个 Harness 界面切到 Codex 风格（近黑画布 + 绿色点缀）。
4. （可选）点 **「恢复系统 亮/暗 跟随」** 回到系统默认。

## 它怎么工作（一句话）

- 用 `theme.register`（宿主认识的语义令牌）+ `theme.setTheme('codex')` 应用视觉；
- 应用时主动把 **dsh-catppuccin** 的口味设成「跟随系统」(off)，避免和 codex 抢主题偏好；
- 是否启用通过宿主路由 `/codex-design/state` 持久化到 `$DSH_HOME/codex-design-state.json`（跨重启保留），启动时读取并重放。

## 卸载

```bash
dsh plugin --profile web remove codex-design
```
（或在 DSH → 插件市场里卸载；若用了 pnpm 手动装，则 `pnpm remove codex-design`。）

卸载后重启一次 Harness 即可。`$DSH_HOME/codex-design-state.json` 可一并删除。

## 备注

- `codex-design` 与 catppuccin 都用"主题偏好"，所以 codex 生效时会**请 catppuccin 让位（切到跟随系统）**；想让 catppuccin 回来，在它那行选回某个口味即可（此时 codex 会相应退出）。
- 若重装后界面没变：确认**完全退出再重开**；仍不行则看 `$DSH_HOME/codex-design-state.json` 是否为 `{"active":true}`、以及 `dsh.profile.bundles` 是否含 `codex-design`。
