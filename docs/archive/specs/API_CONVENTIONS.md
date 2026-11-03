# API 与错误约定

状态：技术提案已记录，端点/业务 DTO 尚未冻结；本文件不是已部署接口文档。PM 字段冲突见 DOCUMENT_GAPS。

## 分层与路径

1.0 前端只经 client/service 调用本地代理；现有手册存在 /api/health、/api/vop 与简化供应商路径，必须在未来实现前形成映射表，不依据散落示例猜 rewrite。2.0 业务 API 统一 /api/v1，供应商转发路径不直接作为业务接口。健康检查须验证约定 JSON/版本/本地配置，禁止仅用 200 或 SPA 回退判活；不进行付费上游探测。

## 建议的业务信封

成功：`{ data, meta: { requestId, schemaVersion, warnings } }`。
失败：`{ error: { code, message, retryable }, meta: { requestId } }`。

信封适用于应用服务结果与未来业务 API，不强求第三方原始协议使用该形状；provider 负责转换。AppError 至少含 code/module/retryable/userMessage；cause、堆栈、请求凭证不进入响应。错误文案不能承担机器判断。

时间用 UTC ISO8601，用户显示按本地时区；媒体偏移统一毫秒且明确相对音频起点。ID 为不透明字符串；分页提议使用 cursor/limit，限制上限待端点冻结。文件使用 multipart/Blob，不在普通 JSON 中重复塞大体积 base64；供应商格式转换留适配层。

## HTTP 与业务码

| HTTP | 语义/应用 |
|---|---|
| 400/422 | 格式错误/语义校验失败，不自动重试 |
| 401/403 | 未认证/无权限；2.0 资源归属强制校验 |
| 404/409 | 不存在/状态、版本或幂等冲突 |
| 413 | 文件超限 |
| 429 | 限流，遵守 Retry-After |
| 500/502/503/504 | 内部/上游失败、不可用、超时；按幂等和预算重试 |

禁止全返回 200。1.0 浏览器内部错误不假装收到 HTTP 状态。

| 既有 code | 统一行为 |
|---|---|
| E_PROXY_DOWN / E_KEY_MISSING | 本地配置指引；direct 需用户另供凭证 |
| E_CORS_BLOCKED | 提示代理；单凭 fetch TypeError 不能确定是 CORS，应保留网络未知诊断 |
| E_RATE_LIMIT / E_QUOTA_EXCEEDED | 排队/退避或降级，额度耗尽不盲重试 |
| E_TIMEOUT | 按任务矩阵与取消状态处理 |
| E_ASR_EMPTY / E_ASR_LOW_CONF | 重录、编辑或手填；不扣分 |
| E_OCR_LOW_QUALITY | 手填或更换文件 |
| E_LLM_SCHEMA / E_LLM_QUOTA | 一次修复预算内重试或降级，需复核 |
| E_AUDIO_PERMISSION / E_AUDIO_TOO_SHORT | 权限指引或重录 |
| E_BANK_INSUFFICIENT | 显式 warning；无解行为须 PM 冻结 |
| E_ILLEGAL_TRANSITION | 记录并安全恢复，不静默推进 |

新增码必须登记语义、HTTP、可恢复性、用户动作与测试，禁止把上游原始错误直接暴露给用户。

## 超时、重试与取消

沿用 PLAN 作为待统一候选：health 1.5s/0重试，token 10s/2，ASR 60s/3，OCR 30s/2，LLM 30s/1；重试次数指初次之外。D09 冻结前不落配置。429/5xx 按任务允许重试；401/输入错不重试；非法 JSON 不走网络重试叠加。截止时间覆盖排队与全部尝试；AbortSignal 贯穿队列和 fetch。取消不触发重试。不能因超时认为供应商未计费。

## 幂等与兼容

2.0 评分/任务创建提议使用 Idempotency-Key，绑定资源、用户、输入哈希与版本；同键异内容返回冲突。服务端保存任务与结果，重复回调去重。UI 防连点不替代服务端幂等。

schemaVersion 管实体迁移，API 主版本管破坏性接口，scoringVersion/promptVersion/bankVersion 分开。新增必填、删字段和枚举变化必须评估旧客户端，未知值安全降级；删除先废弃一版本。破坏性变更给迁移/回滚/契约测试。2.0 后 OpenAPI 从同一契约派生，禁止另写一份字段表漂移。

## 文档记录

适用：1.0 架构初始化；2.0/3.0 为预留（各节另有说明时从其说明）。状态：技术规范基线；引用的未决业务规则仍待冻结。

| 版本 | 日期 | 变更 |
|---|---|---|
| 1.0.0 | 2026-11-03 | 初始架构与规范；仅文档和说明占位 |
