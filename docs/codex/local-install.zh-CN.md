# codex-design · 本地安装指南（源码 / link 方式）

> 面向**不经过 npm 发布、直接在本机使用**的场景：调试本地改动、跟随开发分支、或在私有环境里跑。
> 产品总览与普通安装见 [../../README.md](../../README.md)；Codex 主题功能说明见 [README.zh-CN.md](README.zh-CN.md)；合并前后的身份与兼容约定见 [../../MIGRATION.md](../../MIGRATION.md)。
>
> **注意**：合并后 `codex-design` **不再是一个小主题插件**，而是完整的 **VSCode 风格侧边栏工作台 + Codex 主题**（原 `dsh-better-sidebar` v0.18.0 的全部能力）。本地安装因此**必须构建**——`lib/` 是 `pnpm build` 的产物（`tsc` + `tsdown`），不再是手写的源码文件。

## 前置条件

- 已安装 DSH Desktop 或 `dsh` CLI，并能打开 Harness。
- Node.js ≥ 20、pnpm ≥ 10（`package.json` 声明 `packageManager: pnpm@11.8.0`）。
- 本仓库已克隆到本机，例如 `D:\Program Files\awesome-design-md-main\plugins\codex-design`。

## 方式 A：从源码目录 link 进 profile（推荐，改完即生效）

### 1. 构建

```bash
cd "D:\Program Files\awesome-design-md-main\plugins\codex-design"
pnpm install
pnpm build        # tsc -p tsconfig.build.json && tsdown → lib/index.js / lib/invariant.js / lib/client*.js / lib/types
```

> `pnpm install` 会解析 `@deepseek-ai/*` devDependencies（基线 `0.1.2-rc.1`）；**client 半或 host 半的改动都需要先 `pnpm build`**，profile 只认 `lib/`。
> 可选自检：`pnpm typecheck`、`pnpm test`。

### 2. 把 profile 的依赖指向本地目录

编辑 `~/.dsh/profiles/web/package.json`（Windows：`%APPDATA%\dsh-desktop\harness\profiles\web\package.json`）的 `dependencies`：

```json
{
  "dependencies": {
    "codex-design": "link:D:\\Program Files\\awesome-design-md-main\\plugins\\codex-design"
  }
}
```

### 3. 加上挂载行

在 `~/.dsh/profiles/web/cordis.patch.yml` 追加**一段**（`id` / `name` 都必须是 `codex-design`）：

```yaml
- insert:
    - id: codex-design
      name: 'codex-design'
      # 可选：指定终端 shell；不填则自动解析 $SHELL / 登录 shell / powershell.exe
      config:
        shell: /bin/zsh
        shellArgs:
          - --noprofile
          - --no-rc
```

> ⚠️ **不要与 bundle 通道同时用**：如果你的 profile 里还有包自带的 `dsh.bundle.patch` 造成的 `codex-design` 挂载，或**合并前**遗留的 `- insert: ... better-sidebar ...` 行，请先删掉——重复挂载会让 `/sidebar/api` 注册两次（`duplicate prefix route`），或让页面出现两个侧边栏。`bash scripts/install.sh` / `install.ps1` 会**幂等清理**这两种旧行。
> 需要 `shell` / `shellArgs` 时，也可以只写在 profile 的手动挂载行里（如上），或改用设置页的终端卡片。

### 4. 安装依赖并启动

```bash
cd ~/.dsh/profiles/web
pnpm install
```

然后**硬刷新浏览器**（Cmd/Ctrl+Shift+R）即可看到侧边栏与主题入口。

- **client 半**改动：改完 `pnpm build` → 硬刷新即可（DSH 对 client 改动热加载）。
- **host 半**改动：改完 `pnpm build` → **重启 Harness**（`dsh web` / DSH Desktop）。

### 更新本地副本

```bash
cd <克隆目录> && git pull && pnpm install && pnpm build
```

然后按上一节区分 client / host 半决定"硬刷新"还是"重启"。

### 切回 npm 通道

把 profile 依赖改回版本范围再装：

```json
{ "dependencies": { "codex-design": "^0.19.0" } }
```

```bash
cd ~/.dsh/profiles/web && pnpm install
```

并**移除**你自己加的手动挂载行（bundle 通道会接管挂载）。

## 方式 B：从本地 tarball 安装（最接近真实发布）

```bash
cd "D:\Program Files\awesome-design-md-main\plugins\codex-design"
pnpm install && pnpm build
pnpm pack          # 产出 codex-design-0.19.0.tgz（内容 = package.json + lib/ + scripts/ + cordis.patch.yml + README …）
```

```bash
dsh plugin --profile web add "<克隆目录>\codex-design-0.19.0.tgz"
```

若 `dsh plugin` 不接受 tarball 路径，可在 profile 目录里用 pnpm：

```bash
cd "%APPDATA%\dsh-desktop\harness\profiles\web"
pnpm add "<克隆目录>\codex-design-0.19.0.tgz"
```

装到 web profile 后，DSH 启动时会按 generation 机制组合它（`dsh.profile.bundles` 会包含 `codex-design`，`node_modules/codex-design` 指向解包目录），**无需手写挂载行**。

> 首次安装若报 `Ignored build scripts`（pnpm 11 拦截 `node-pty` 构建脚本），在 profile 目录执行 `pnpm approve-builds --all` 后重跑安装。

## 方式 C：一键脚本（自动 add → 放行构建 → 重跑 → 清理旧挂载行）

```bash
bash scripts/install.sh              # macOS / Linux / Git Bash
pwsh -File scripts/install.ps1       # Windows 原生
```

两者都支持 `-h` 查看参数、`--dry-run` 只打印动作、`--profile <名>` 指定 profile；脚本会幂等写入 profile 的 `allowBuilds`（`node-pty` / `protobufjs`）与 `minimumReleaseAgeExclude`（`codex-design`），并移除旧的 `better-sidebar` / `codex-design` 手动挂载行。

## 安装后启用

1. **重启一次 Harness**（`dsh web` 或完全退出 DSH Desktop 再打开）——host 半与挂载在启动时组合。
2. **硬刷新浏览器**（Cmd/Ctrl+Shift+R）。
3. 打开 **设置 → 通用**，找到 **「Codex 主题」** 行：
   - 点 **「应用 Codex 主题」** → 整站切到 Codex 风格（近黑画布 + 绿色点缀）。
   - 点 **「恢复系统 亮/暗 跟随」** → 回到系统默认。
4. 侧边栏底部（设置按钮旁）应出现 **「已归档」** 入口；任意会话行悬停应出现**垃圾桶**按钮。

## 它怎么工作（一段话）

- **主题**：注册一个可切换的 `codex` 主题（宿主认识的语义令牌）+ 应用动作；应用时主动把 **dsh-catppuccin** 的口味设成「跟随系统」(off)，避免和 codex 抢主题偏好；是否启用通过**宿主路由**持久化到 `$DSH_HOME` 下的状态文件（跨重启保留），启动时读取并重放。
- **侧边栏**：host 半提供 `/sidebar/api/*`（JSON API）、`/sidebar/file`（媒体）、`/sidebar/html`（预览）、`/sidebar/ws/*`（终端等），全部会话级 + 信任围栏；client 半挂 `[data-codex-design]` 宿主元素渲染工作台，状态按会话持久化在 localStorage。
- **代码位置**：client 半在 **`src/client/codex/`**（`theme.ts` 主题引擎与 `CODEX_TOKENS` 调色板、`settings.tsx` 设置行、`sessions.ts` 会话与归档数据层、`index.ts` 注册胶水），宿主持久化路由在 **`src/codex-routes.ts`**（由 `src/index.ts` 的 `/sidebar/api` 分发器接入），client 侧 API 包装在 `src/client/api.ts`，测试守护在 `tests/codex-theme.spec.ts`；host 入口 `src/index.ts`，client 入口 `src/client/index.tsx`。改主题只改这几处，**不要改 `lib/`**（那是 `pnpm build` 的产物）。

## 卸载

```bash
dsh plugin --profile web remove codex-design
```

（在 DSH 插件市场卸载，或对 pnpm 手动装的情况用 `pnpm remove codex-design`；用了 link 方式的则改回依赖并 `pnpm install`。）

卸载后**重启一次 Harness**。`$DSH_HOME` 下 Codex 主题的状态文件可一并删除。

## 备注

- **硬刷新 vs 重启**：client 半改动只需硬刷新；host 半改动（`src/*.ts` 的宿主路由、工具、PTY 等）必须重启 Harness。
- **`lib/` 是产物**：不要直接改 `lib/*.js`（`pnpm build` 的 `rm -rf lib` 会覆盖），改 `src/`。
- **双挂载排查**：页面出现两个侧边栏，或启动报 `duplicate prefix route` / `duplicate loader entry id` ——检查 `~/.dsh/profiles/web/cordis.patch.yml` 是否残留手动挂载行（含合并前的 `better-sidebar`），以及 `dsh.profile.bundles` 是否同时含聚合包与本包。
- **主题让位说明**：`codex` 生效时会**请 catppuccin 让位（切到跟随系统）**；想让 catppuccin 回来，在它那行选回某个口味即可（此时 codex 相应退出）。
- **若重装后界面没变**：确认**完全退出再重开**；仍不行则检查 `dsh.profile.bundles` 是否含 `codex-design`，以及主题状态文件是否为"已启用"。
