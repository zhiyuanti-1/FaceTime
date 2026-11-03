# 技术选型

当前只定方向，不安装依赖。PM 的 React 18/Vite 5/Tailwind 3 为历史假设，不直接当成当前版本建议。

## 版本策略

V1：安装阶段核验官方支持、安全公告、浏览器与插件矩阵，选择受维护稳定线，锁定精确版本和锁文件。Node 使用当时受维护 LTS。V2：对应版本启动前再评测，当前不安装。V3：模型锁权重哈希、许可证、镜像与参数。主版本升级/替换必须 ADR 与回归；禁止 latest/浮动生产镜像。

| 领域 | 选型 | 策略 | 理由 | 备选 | 风险与缓解 | 适用 |
|---|---|---|---|---|---|---|
| 前端 | React SPA | V1，DOM 同版 | 对齐 PM | Vue | 体积/错误边界验收 | 1–3 |
| 语言 | TypeScript strict | V1 | 明确契约 | JS+JSDoc | 补运行时校验 | 1–3 |
| 构建 | Vite | V1 | 本地代理/按需加载 | Rsbuild | 不用于公网网关 | 1–3 |
| 路由 | React Router | V1 | SPA 边界 | TanStack Router | 静态回退与错误页 | 1–3 |
| 状态 | Zustand+局部 React 状态 | V1 | 会话/设置可控 | Context/reducer | 不全量持久化 UI | 1–3 |
| UI/样式 | Tailwind+语义 HTML | V1 | 无大型 UI 库，对齐 PM | CSS Modules | 键盘/打印验收 | 1–3 |
| 表单/上传 | React Hook Form+File API | V1 | 表单状态集中 | 原生受控表单 | 大小/类型/内容检查 | 1–3 |
| PDF | PDF.js 按需加载 | V1，worker 同版 | PDF 文本通道 | 粘贴文本 | 扫描件转手填 | 1–3 |
| HTTP | fetch+统一 client | V1 浏览器基线 | 取消/重试集中 | Axios | 单层重试 | 1–3 |
| 校验 | draft-07 JSON Schema+Ajv，表单 Zod | V1，draft 配对 | 沿用 PM AI 契约 | Zod 派生 | 同实体不双写 Schema | 1–3 |
| 本地数据 | IndexedDB+idb | V1，迁移独立版本 | 对齐计划 | Dexie | 配额/备份/删除 | 1 |
| 测试 | Vitest/Testing Library/MSW/Playwright | V1 | 单元到 E2E | Jest | 脱敏 fixture，CI 不用付费 API | 1–3 |
| 质量 | ESLint/Prettier/tsc | V1 | 自动门禁 | Biome | 插件兼容检查 | 1–3 |
| 日志/监控 | 本地环形日志；后续 OpenTelemetry+错误监控 | V1/V2 | 分阶段观测 | 自托管 Sentry | 禁采正文与凭证 | 1–3 |
| 环境/密钥 | 进程 env；服务端 Secret/KMS | V1/V2 | 信任边界明确 | 用户临时 Key | VITE_* 仅公开配置 | 1–3 |
| 后端 | NestJS 模块化单体 | V2 | TS 契约复用 | FastAPI | 不提前微服务化 | 2–3 |
| 数据库 | PostgreSQL+Prisma | V2 | 关系/审计 | SQL 查询构建器 | 迁移与事务验证 | 2–3 |
| 媒体 | S3 兼容对象存储 | V2 | 媒体与实体分离 | 内测本地磁盘 | 签名 URL/生命周期/删除 | 2–3 |
| 任务 | Redis+BullMQ | V2 | 任务重试/进度 | Postgres 队列 | 消费幂等，队列非事实源 | 2–3 |
| 本地 OCR/ASR | PaddleOCR/FunASR，Python worker | V2+V3 | 中文候选方案 | Tesseract/Whisper | 中文样本/许可证/资源实测 | 2–3 |
| 本地 LLM | Ollama 内测，规模化评估 vLLM | V2+V3 | 可替换推理服务 | 云 DeepSeek | 不预先承诺质量与降本 | 2–3 |
| 动作 | MediaPipe Pose 预选 | V2+V3 | 先验证关键点事件 | YOLO Pose | 连续帧、遮挡、防误判 | 2–3 |
| 部署/CI | Docker/Nginx/GitHub Actions，Compose 起步 | V2，不可变镜像 | 独立发布与回滚 | 托管容器/其他 CI | 无容量证据不引入 K8s | 3 |

浏览器目标沿 PM 假设 Chrome/Edge ≥120、Safari ≥17；实际依赖兼容必须验证。2.0/3.0 选型为预选，不构成安装或能力承诺。

## 官方核验入口

- [Vite 环境变量](https://vite.dev/guide/env-and-mode)：VITE_* 暴露到客户端，env 不自动保密。
- [Vite 开发代理](https://vite.dev/config/server-options)：不是生产网关。
- [React 版本](https://react.dev/versions)：安装阶段核对支持线。
- [Zod JSON Schema](https://zod.dev/json-schema)：派生须验证语义，不能将实验性反向转换作为核心依赖。

## 文档记录

适用：1.0 架构初始化；2.0/3.0 为预留（各节另有说明时从其说明）。状态：技术规范基线；引用的未决业务规则仍待冻结。

| 版本 | 日期 | 变更 |
|---|---|---|
| 1.0.0 | 2026-11-03 | 初始架构与规范；仅文档和说明占位 |
