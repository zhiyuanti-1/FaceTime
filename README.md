# Face · 面试练习室

本机运行的简历核对与文字面试练习工具，包含管理员登录、简历工作台、题库练习、作答记录和报告。

## 项目结构

```text
apps/web/           React + TypeScript + Vite 前端
apps/api/           NestJS + TypeORM + Oracle 后端、迁移、本机私密配置
apps/workers/       2.0 本地模型预留
packages/shared/    跨端 Zod 契约、纯评分内核
packages/content/   数据库初始化种子题库（200 题，未人工审核）
packages/ai,rules/  版本化提示词与评分规则资产
product/            产品需求与历史原型
docs/              技术规范、流程、进度及归档
scripts/            工程检查与本机集成验证
tests/              仓库工具与核心逻辑测试
infra/              3.0 公网部署预留
```

## 新设备首次启动（Windows x64）

以下命令在仓库根目录的 PowerShell 中运行。新设备需要 Git、Node.js 22.13 以上及 npm，以及本机 Oracle AI Database Free 和 SQL*Plus。[Node.js 下载](https://nodejs.org/en/download/archive/v22) · [Oracle Database Free 下载](https://www.oracle.com/database/free/get-started/)

1. 克隆仓库，安装锁定的依赖并生成本机配置文件。

   ```powershell
   npm ci
   if (-not (Test-Path apps/api/.env)) { Copy-Item apps/api/.env.example apps/api/.env }
   ```

2. 在新设备启动 Oracle，确认监听器可访问 `127.0.0.1:1521/FREEPDB1`。只有当 `FACE_APP` 和 `FACE_RUNTIME` **都不存在**时，才在具有 Oracle 本机管理权限的账号下初始化一次。脚本会提示输入新的 `FACE_RUNTIME` 口令。若 SQL*Plus 不在 PATH，把命令里的 `sqlplus` 换成实际可执行文件的完整路径。已有项目库直接跳到配置和检查，账本不匹配时先核对数据库版本。

   ```powershell
   sqlplus -L "/ as sysdba" "@apps/api/migrations/bootstrap-empty.sql"
   ```

3. 编辑 `apps/api/.env`。填写刚设置的 `DB_PASSWORD` 和独立的 `ADMIN_PASSWORD`。需要 PDF 或图片识别时填写 `BAIDU_AK`、`BAIDU_SK`。需要云端分析、出题或评分时填写 `DEEPSEEK_API_KEY`。数据库连接地址不同时填写实际的 `DB_CONNECT_STRING`。检查成功时会显示 001、005、006、007 账本校验通过。

   ```powershell
   npm run db:check
   ```

4. 下载 Knife4j、Windows Vulkan 推理程序和约 4.68GB 的 Qwen2.5-7B-Instruct Q4_K_M 两分片权重。脚本校验下载哈希，已验证的资源可以复用。仅需接口文档时传 `-Component Docs`。模型下载连接不稳定时可传 -UseModelMirror，运行程序下载连接不稳定时可传 -UseRuntimeMirror；镜像文件仍校验官方 SHA-256。

   ```powershell
   .\scripts\install-local-resume.ps1
   ```

5. 需要本机简历抽取或提示词调试时，在一个终端启动模型。再在另一个终端启动前后端，保持两个终端运行。

   ```powershell
   .\scripts\start-local-resume.ps1
   ```

   ```powershell
   npm run dev
   ```

   Windows 下双击 scripts/start-dev.bat，在一个窗口中启动本机模型、前端和后端。窗口打印访问地址，等待服务就绪后打开。关闭该窗口或按 Ctrl+C 会停止本次启动的全部进程。API 与 Web 端口占用时自动顺延，模型 17861 端口占用时退出并提示关闭现有实例。

| 入口 | 默认地址 |
|---|---|
| 主站 | [http://127.0.0.1:5173](http://127.0.0.1:5173) |
| 后端健康检查 | [http://127.0.0.1:3000/api/health](http://127.0.0.1:3000/api/health) |
| Knife4j | [http://127.0.0.1:3000/doc.html](http://127.0.0.1:3000/doc.html) |
| OpenAPI JSON | [http://127.0.0.1:3000/v3/api-docs](http://127.0.0.1:3000/v3/api-docs) |
| 提示词调试 | [http://127.0.0.1:3000/debug/resume](http://127.0.0.1:3000/debug/resume) |
| 本机模型健康检查 | [http://127.0.0.1:17861/health](http://127.0.0.1:17861/health) |

以启动终端打印的地址为准。若 3000 被占用，可在 `apps/api/.env` 修改 `API_PORT`，再重新运行 `npm run dev`，Vite 会从同一份配置读取代理端口。
## 配置与存储

唯一私密配置入口是 **apps/api/.env**，已被 Git 忽略。数据库连接、管理员账号/密码、百度 `BAIDU_AK` / `BAIDU_SK`、DeepSeek `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL`、端口、大小限制都在此处维护，修改后重启服务。管理员初始口令仅在本机配置中，源码与模板不包含可用口令。修改管理员密码并重启会更新哈希、注销旧会话；修改数据库连接密码必须与 Oracle 账号实际密码一致，应用不会替你改数据库口令。

- DOCX / DOC / UTF-8 TXT：本机提取；扫描版 Word 请另存 PDF。
- 支持粘贴文本和上传 PNG/JPEG，图片由百度 OCR 识别。
- PDF：确认发送后，由后端调用百度 OCR 逐页提取。未配置 AK/SK 时保留原件并显示失败原因，可配置后重新识别。
- 识别原文可复制、导出 TXT；确认文本另存，不覆盖原文。
- 原文件在被忽略的 `apps/api/data/resumes/<账号ID>/`；元数据、全文、修订和题目/回答在 Oracle。无需另配 NoSQL。
- Git 克隆只恢复源码和配置模板。原件、历史、私密配置和运行资源各设备独立。如果要迁移业务数据，需要单独备份和恢复 Oracle 与简历原件。

## 后端接口调试

Knife4j 页面和 OpenAPI JSON 由同一个后端提供。使用后端启动日志中的端口，先访问 /api/health。如果健康检查正常、OpenAPI 正常而 /doc.html 返回 503，在仓库根运行 `./scripts/install-local-resume.ps1 -Component Docs` 后刷新页面。调试需要登录的接口时，先调用 POST /api/v1/auth/login。
本机 Qwen2.5-7B-Instruct 可对百度 OCR 原文进行结构化并写入 Oracle。每个账号最多保存三份简历，结构化结果支持查询、修改、清除和按简历 ID 重试导入。安装步骤和接口契约见 [技术约束 §19](docs/技术约束.md#19-cr-10-017-简历结构化接口与本机调试)。

## 验证与公开仓库

```bash
npm run check             # 保密 / 格式 / lint / 类型 / 组件 / 单元测试
npm run build             # shared → api/dist → web/dist
npm run validate:bank     # 只读校验种子资产
npm run test:integration  # 需先启动 API；011基础流程验证
npm run test:ia           # 本机 Oracle 与 HTTP 联调，模拟外部服务，测试后清理合成资料
```

运行 `npm run test:ia` 时，SQL*Plus 需在 PATH 中，或在当前 PowerShell 用 `$env:FACE_SQLPLUS` 指向本机 sqlplus.exe。该测试需要 Oracle 本机管理权限清理合成账号。注意：启动阶段会执行正常应用初始化，可能更新配置管理员密码、注销会话并补入题库；随机测试账号不等于数据库环境隔离。测试隔离方案暂缓，日常数据所在库不要运行该测试，也不能将其作为只读检查。

OCR 单元测试使用模拟上游响应，不会发送真实简历。真实百度调用需要单独验证。登录会话使用 HttpOnly Cookie，令牌只存数据库 SHA-256，密码存 scrypt 哈希，简历和练习按账号查找。应用仅绑定回环；网络攻击防御和公网发布留至 3.0。

上传 GitHub 前执行 `npm run check:public` 并检查图片/附件。真实 `.env`、运行文件、原件、日志、数据库导出和钱包不得提交；`VITE_*` 不允许存秘密。新克隆执行 `git config --local core.hooksPath .githooks` 启用提交前检查。检查不能替代凭证轮换，也不能移除曾提交的秘密历史。本轮未提交或推送。

## 文档

- [AGENTS.md](AGENTS.md)：后续代理入口与硬约束。
- [product/需求.md](product/需求.md)：当前产品范围与版本规划。
- [docs/技术约束.md](docs/技术约束.md)：架构、接口、数据库、编码和保密规范。
- [docs/开发流程.md](docs/开发流程.md)：变更与验收流程。
- [docs/进度.md](docs/进度.md)：当前完成项、验证证据与后续事项。
- [product/prototype/README.md](product/prototype/README.md)：历史原型索引。


工作台和练习后端交接见 [技术约束 §15](docs/技术约束.md)。后续按“后端对话完成契约与测试→前端对话接入与浏览器验收”执行，不在前端硬编码原型示例。DeepSeek真实密钥只填apps/api/.env，模板不包含真值；未配置时API明确返回503，不生成模拟结果。

### 启动器检查与停止范围

启动器通过 Windows Job Object 管理本次进程树。窗口退出时，其启动的模型、前端和后端全部终止。其他终端原先启动的实例需要在对应窗口关闭。若提示词修改后仍看到旧内容，重启对应后端实例，并确认调试页端口与启动日志一致。

一键启动器等待六个入口就绪后，末尾会显示完整地址表。提示词调试位于后端端口的 /debug/resume，接口文档位于同端口 /doc.html。端口自动顺延时，以该表的实际端口为准。
