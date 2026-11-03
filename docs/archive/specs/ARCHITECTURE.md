# 整体架构与演进

## 原则与 1.0

必须按版本交付，以契约、端口与适配器隔离运行环境。1.0 无业务后端，但本地 Vite 进程属于密钥信任边界，不能称全部处理均在浏览器。

```text
app/pages → features → 领域契约与 service 端口
app 装配适配器 → IndexedDB / 音频工具 / HTTP client
HTTP client → 本地 Vite 代理 → 百度 / DeepSeek
评分编排 → 纯规则内核 + 已校验 AI 结果
```

app 负责装配；resume 接入与确认，paper 组卷，session 状态机/恢复，scoring 编排聚合，report 展示导出。状态机与评分可评估性分离。provider 转换供应商协议，不决定业务阈值。

ASR→文字、OCR→手填、LLM→可用规则项+模板、BODY→未启用。任何降级仍可生成报告，但必须列缺失维度，不能编造完整点分。

## 2.0

```text
SPA → /api/v1 → NestJS 模块化单体 → PostgreSQL / 对象存储
                       ↓ 队列
                Python OCR / ASR / LLM / vision workers
```

服务端负责权限、资源归属、评分、预算与提示词。前端换 service/repository 适配器。worker 输出标准识别/事件，不直接修改业务分数。队列至少一次投递，消费必须幂等。规则重放确定；AI 通过已保存结果复用，不能承诺模型推理严格确定。

迁移包含 schemaVersion、校验、预览和用户确认；禁止无感上传本地历史。报告保存规则/提示词/题库/模型版本与结果快照。数据库实体不得充当 API DTO。

## 3.0

网关提供 TLS、入口限流、大小限制；后端提供鉴权、用户配额和成本控制。数据库、Redis 和 worker 不暴露公网。静态资源与 API 独立发布，启用备份恢复、告警、灰度和删除验证。先验证单机容器容量，再按证据评估集群。

## 边界与禁止

- 页面只调用功能公开入口；功能禁止导入页面或 app。
- 跨功能禁止内部深路径与循环依赖。
- shared 不依赖 src、React、DOM、NestJS、ORM。
- packages/shared/scoring 是纯内核；packages/rules/scoring 是配置；features/scoring 是编排。
- ai 是提示词版本资产，services/providers 不决定业务提示词版本。
- 1.0 禁止引用 apps/api/apps/workers/deploy。
- 健康检查验证固定 JSON、版本及本地配置状态，不能用 SPA 的任意 200 或付费调用判断健康。

技术路径调整见 [ADR-001](adr/ADR-001-architecture-boundaries.md)。未决规则见 [差异台账](DOCUMENT_GAPS.md)。

## 文档记录

适用：1.0 架构初始化；2.0/3.0 为预留（各节另有说明时从其说明）。状态：技术规范基线；引用的未决业务规则仍待冻结。

| 版本 | 日期 | 变更 |
|---|---|---|
| 1.0.0 | 2026-11-03 | 初始架构与规范；仅文档和说明占位 |
