# Face · 面试练习室

本机运行的简历核对与文字面试练习工具。当前已接通管理员登录、文档上传与持续存储、原文核对、数据库题库、手动权重、文字回答和练习记录。暂不评分、追问或生成面试报告。

## 项目结构

```text
apps/web/           React + TypeScript + Vite 前端
apps/api/           NestJS + TypeORM + Oracle 后端、迁移、本机私密配置
apps/workers/       2.0 本地模型预留
packages/shared/    跨端 Zod 契约、未来纯评分内核
packages/content/   数据库初始化种子题库（200 题，未人工审核）
packages/ai,rules/  未来提示词与规则版本资产
product/            产品需求与历史原型
docs/              技术规范、流程、进度及归档
scripts/            工程检查与本机集成验证
tests/              仓库工具与核心逻辑测试
infra/              3.0 公网部署预留
```

## 启动

要求 Node ≥22.13、npm、本机 Oracle FREEPDB1、已执行的 FACE_APP 迁移及 FACE_RUNTIME 运行账号。当前电脑已完成 001 / 005 建表；不要重复执行。其他电脑先按技术约束的数据库章节准备 schema 和迁移，禁止使用 SYS 运行应用。

```powershell
npm ci
if (-not (Test-Path apps/api/.env)) { Copy-Item apps/api/.env.example apps/api/.env }
# 编辑本机 .env，填写数据库连接与管理员配置，不在命令行粘贴密码。
npm run dev
```

前端默认 5173，被占用时 Vite 自动选择后续端口，以终端 Local 地址为准；后端默认 `127.0.0.1:3000`。前端 `/api` 由 Vite 代理至后端，不需要配置第二套密钥。顶部导航为简历空间、定向练习、练习记录与设置。

## 配置与存储

唯一私密配置入口是 **apps/api/.env**，已被 Git 忽略。数据库连接、管理员账号/密码、百度 `BAIDU_AK` / `BAIDU_SK`、端口、大小限制都在此处维护，修改后重启服务。管理员初始口令仅在本机配置中，源码与模板不包含可用口令。修改管理员密码并重启会更新哈希、注销旧会话；修改数据库连接密码必须与 Oracle 账号实际密码一致，应用不会替你改数据库口令。

- DOCX / DOC / UTF-8 TXT：本机提取；扫描版 Word 请另存 PDF。
- PDF：确认发送后，由后端调用百度 OCR 逐页提取。未配置 AK/SK 时保留原件并显示失败原因，可配置后重新识别。
- 识别原文可复制、导出 TXT；确认文本另存，不覆盖原文。
- 原文件在被忽略的 `apps/api/data/resumes/<账号ID>/`；元数据、全文、修订和题目/回答在 Oracle。无需另配 NoSQL。
- 当前不自动删除原件，也不实现删除入口；请同时备份 Oracle 和本机 data。原件不会随 Git 迁移。

## 验证与公开仓库

```bash
npm run check             # 保密 / 格式 / lint / 类型 / 组件 / 单元测试
npm run build             # shared → api/dist → web/dist
npm run validate:bank     # 只读校验种子资产
npm run test:integration  # 需先启动 API；合成数据验证后清理本次创建的记录
```

OCR 单元测试使用模拟上游响应，不会发送真实简历。本轮按用户选择暂不进行真实百度联调，凭证配置状态不代表识别已验收。登录会话使用 HttpOnly Cookie，令牌只存数据库 SHA-256，密码存 scrypt 哈希，简历和练习按账号查找。应用仅绑定回环；网络攻击防御和公网发布留至 3.0。

上传 GitHub 前执行 `npm run check:public` 并检查图片/附件。真实 `.env`、运行文件、原件、日志、数据库导出和钱包不得提交；`VITE_*` 不允许存秘密。新克隆执行 `git config --local core.hooksPath .githooks` 启用提交前检查。检查不能替代凭证轮换，也不能移除曾提交的秘密历史。本轮未提交或推送。

## 文档

- [AGENTS.md](AGENTS.md)：后续代理入口与硬约束。
- [product/需求.md](product/需求.md)：当前产品范围与版本规划。
- [docs/技术约束.md](docs/技术约束.md)：架构、接口、数据库、编码和保密规范。
- [docs/开发流程.md](docs/开发流程.md)：变更与验收流程。
- [docs/进度.md](docs/进度.md)：当前完成项、验证证据与后续事项。
- [product/prototype/README.md](product/prototype/README.md)：历史原型索引；本轮工作台以 CR-1.0-011 为准。
