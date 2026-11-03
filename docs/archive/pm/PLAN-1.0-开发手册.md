# PLAN-1.0 开发手册（前端实现规格）

> 文档编号：PLAN-1.0 ｜ 版本：v1.0 ｜ 状态：可开发（契约待冻结）｜ 最后更新：2026-11-03
> 读者：前端开发（主）、内容同学（题库）、你（验收）
> 配套：[PM-04 评分规则](04-评分原则与规则表.md)、[PM-05 提示词包](05-AI提示词包.md)、[PM-06 题库与组卷](06-题库与组卷规则.md)
> 性质：**这是代码实现规格，不是产品介绍。** 文档里的类型名、函数名、字段名、错误码、阈值，按此实现即可。

> **假设声明（未确认，若与实际不符我按新信息重出）**
> - A1：技术栈 = React 18 + TypeScript 5 + Vite 5 + Tailwind 3 + Zustand（或 React Context）+ IndexedDB(`idb`)，测试用 Vitest。**不引入 UI 组件库**，用 Tailwind 手写（减少包体积与风格约束）。
> - A2：传输层 = **Vite `server.proxy`（主）+ 浏览器直连（兜底）**，**不引入任何常驻进程**。独立代理进程降为 P2 可选，见 §4.3 与附录 B。
> - A3：单人单机使用；数据全本地（IndexedDB）；无账号、无服务端。
> - A4：单场固定 10 题（5 八股 + 5 拷打），追问不计入题量。
> - A5：浏览器支持 Chrome/Edge ≥120、Safari ≥17；不支持 IE 与移动端竖屏小屏（仅做可用性兜底）。
> - A6：人力假设 2 名前端，可并行；估时为**人日**，含自测不含联调返工。

---

## 0. 怎么读这份手册

| 优先级 | 定义 | 缺失后果 | 章节 |
|---|---|---|---|
| **P0** | 缺了主流程跑不通，或存在密钥/数据风险 | 不可交付，不可演示 | §4.1–§4.12 |
| **P1** | 能用，但会崩、会丢数据、体验差 | 可内测，不可推广 | §4.13–§4.16 |
| **P2** | 增强项，可顺延到 1.1 | 不影响 1.0 验收 | §4.17–§4.19 |

**建议开发顺序**：先跑通「骨架 → 契约 → 组卷 → 页面骨架」的**竖切**（用时约 5 人日，能做出一场假数据面试），再补录音/ASR/AI 的真实链路。**不要**按模块顺序把 12 个 P0 全做完再联调——这样会在第 25 人日才发现契约不对。

---

## 1. 系统总览

### 1.1 架构

```
┌──────────────── 浏览器 (SPA, localhost:5173) ────────────────┐
│  Pages: Home / Setup / Interview / Report / Settings          │
│    │                                                          │
│  Features: resume · paper · session · scoring · report        │
│    │                                                          │
│  Services (适配器层):                                          │
│    asrAdapter · ocrAdapter · llmAdapter · httpClient · queue   │
│    │  所有请求走相对路径 /api/*，不写死域名、不出现任何密钥      │
│  Domain: types · constants · errors · rules                    │
│  Lib: storage(IndexedDB) · audio(pcm/wav/vad) · seedRng        │
└───────────────────────────┬───────────────────────────────────┘
                            │ 同源请求，天然无 CORS
┌───────────────────────────▼───────────────────────────────────┐
│  vite.config.ts → server.proxy / preview.proxy（约 20 行）      │
│  注入 Authorization · 终结跨域 · 只运行在开发服务器里，不入包    │
└───────────────────────────┬───────────────────────────────────┘
        ┌───────────────────┼────────────────────┐
   百度 ASR/OCR        DeepSeek Chat         （2.0：换成真后端）
```

**传输层定位**：1.0 的"代理"不是另起一个后端进程，而是 **Vite 开发服务器的一段配置**——`npm run dev` 时顺带生效，零额外启动步骤，密钥放 `.env` 且不进 `dist`。三条路线的取舍见 §4.3。

**一个必须先实测的前提**：DeepSeek 与百度是否真的不发 CORS 头，不能靠猜。30 秒验证：

```js
// 在 http://localhost:5173 的 DevTools Console 里跑，换成自己的 Key
fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer sk-你的key' },
  body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 })
}).then(r => console.log('OK', r.status)).catch(e => console.log('BLOCKED', e));
```

`BLOCKED`（TypeError: Failed to fetch）→ 走 §4.3 方案 B；`OK` → 方案 A 也能跑。**测完把结果告诉我，我按结果定 M03 的实现量。**

### 1.2 目录结构（约定，不得随意改）

```
.
├─ proxy/
│  ├─ server.mjs              # 唯一代理入口
│  └─ .env.example            # DEEPSEEK_API_KEY / BAIDU_AK / BAIDU_SK
├─ public/
├─ scripts/
│  └─ validate-bank.mjs       # 题库校验，CI 必跑
├─ apps/web/src/
│  ├─ main.tsx
│  ├─ app/                    # 路由、布局、全局 Provider
│  ├─ pages/                  # Home / Setup / Interview / Report / Settings
│  ├─ features/
│  │  ├─ resume/              # 上传、OCR、解析、编辑
│  │  ├─ paper/               # composer、quota、probeBuilder
│  │  ├─ session/             # 状态机、记录器、恢复
│  │  ├─ scoring/             # ruleEngine、aiScorer、aggregator
│  │  └─ report/              # 报告视图、导出
│  ├─ services/
│  │  ├─ http.ts              # fetch 封装：超时/重试/错误码
│  │  ├─ queue.ts             # 令牌桶 + 串行队列
│  │  ├─ asr.ts  ocr.ts  llm.ts
│  │  └─ proxyClient.ts       # 代理健康检查、模式切换
│  ├─ domain/
│  │  ├─ types.ts             # 全部实体（唯一事实源）
│  │  ├─ constants.ts         # 阈值、枚举、超时
│  │  └─ errors.ts            # AppError + 错误码
│  ├─ lib/
│  │  ├─ storage.ts           # IndexedDB 封装 + 迁移
│  │  ├─ audio/{decode.ts,wav.ts,vad.ts}
│  │  └─ seedRng.ts
│  └─ data/
│     ├─ bank/{index.json, vue.json, ...}
│     ├─ presets/{weights.example.json}   # 仅示例填充值，权重数值未锁定
│     └─ templates/probe.ts
└─ tests/
```

### 1.3 模块优先级总表

| # | 模块 | 优先级 | 人日 | 依赖 |
|---|---|---|---|---|
| M01 | 工程骨架 | P0 | 2 | — |
| M02 | 数据契约与存储 | P0 | 2 | M01 |
| M03 | 传输层与密钥（Vite 代理 + 直连兜底） | P0 | 1.5 | M01 |
| M04 | 简历接入（上传/OCR/解析） | P0 | 4 | M02 M03 |
| M05 | 组卷器 | P0 | 3 | M02 |
| M06 | 会话状态机 | P0 | 2 | M02 M05 |
| M07 | 录音与音频处理 | P0 | 3 | M01 |
| M08 | ASR 适配器 | P0 | 2 | M03 M07 |
| M09 | 规则引擎（口头禅/流畅度） | P0 | 3 | M02 M08 |
| M10 | AI 评分与追问 | P0 | 3 | M03 M08 |
| M11 | 报告聚合与展示 | P0 | 3 | M09 M10 |
| M12 | 降级与错误处理 | P0 | 2 | 全部 P0 |
| M13 | 请求队列与限流 | P1 | 1.5 | M03 |
| M14 | 断点恢复与历史 | P1 | 2 | M06 |
| M15 | 页面与交互完整化 | P1 | 4 | M04–M11 |
| M16 | 本地可观测 | P1 | 1 | M12 |
| M17 | 导出（JSON/打印） | P2 | 1.5 | M11 |
| M18 | 专项训练模式 | P2 | 2 | M05 |
| M19 | 调试面板 | P2 | 1 | M12 |

**合计 43.5 人日**（P0 30.5 + P1 8.5 + P2 4.5）。**这是复杂度权重，不是工期**——用途见 §8.2。

---

## 2. 数据契约（`apps/web/src/domain/types.ts`）

> 这是前后端（2.0）唯一事实源。字段改名前必须先改本文件并升 `SCHEMA_VERSION`。

```ts
export const SCHEMA_VERSION = 1 as const;

export type ID = string;
export type ISODate = string;
export type TopicId =
  | 'js' | 'vue' | 'react' | 'network' | 'engineering'
  | 'css' | 'browser' | 'java' | 'algorithm' | 'database' | 'ts' | 'behavioral';
export type Difficulty = 1 | 2 | 3;
export type SuspicionType =
  | 'TIME_GAP' | 'OWNERSHIP' | 'SENIORITY' | 'DEPTH' | 'METRIC' | 'CONSISTENCY';

/* ---------------- 简历 ---------------- */
export interface ResumeProfile {
  id: ID; schemaVersion: number; createdAt: ISODate;
  source: 'pdf' | 'image' | 'paste';
  rawText: string;
  profile: {
    name: string | null; title: string | null; yearsOfExperience: number | null;
    education: { school: string; degree: string; major: string; start: string; end: string; precision: 'month' | 'year' }[];
    experiences: { company: string; role: string; start: string; end: string; teamSize: number | null; bullets: string[] }[];
    projects: { name: string; role: string; tech: string[]; metrics: string[]; summary: string }[];
    skills: string[];
  };
  suspicions: Suspicion[];
  uncertainFields: string[];
  parseConfidence: number;
  needsReview: boolean;
}

export interface Suspicion {
  type: SuspicionType;
  claim: string;        // 简历原文主张
  quote: string;        // 逐字原文 ≤80 字
  risk: 'high' | 'medium' | 'low';
  confidence: number;
  ask: string;          // 可直接当拷打题用
}

/* ---------------- 岗位与组卷 ---------------- */
export interface TopicWeight { topicId: TopicId; weight: number; minCount?: number; maxCount?: number; }

export interface JobProfile {
  id: string; role: string; level: 'junior' | 'mid' | 'senior';
  topicWeights: TopicWeight[];
  knowledgeCount: number;   // 默认 5
  probeCount: number;       // 默认 5
  orderStrategy: 'interleave' | 'block';
}

export interface Question {
  id: string; topicId: TopicId; difficulty: Difficulty; mode: 'oral' | 'oral_scenario';
  text: string; expectedPoints: string[]; followUpHints?: string[]; tags: string[];
  timeLimitSec: number; version: number; verified: boolean; contentHash: string;
}

export interface QuestionRef {
  id: string; source: 'bank' | 'probe'; text: string;
  topicId?: TopicId; difficulty?: Difficulty; expectedPoints?: string[];
  probe?: ResumeProbe;
}

export interface PaperPlan {
  id: ID; jobProfileId: string; seed: string; createdAt: ISODate;
  knowledge: QuestionRef[]; probes: QuestionRef[];
  order: QuestionRef[];                    // 已排好序的 10 题
  warnings: string[];                      // 降级事实，必须透传到报告
  degraded: boolean;
}

export interface ResumeProbe {
  id: string; source: 'suspicion' | 'project' | 'gap_fill';
  target: string; suspicionType?: SuspicionType;
  question: string; anchorQuote: string;
  severity: 1 | 2 | 3; confidence: number;
}

/* ---------------- 会话 ---------------- */
export type SessionStatus =
  | 'idle' | 'preparing' | 'ready' | 'asking' | 'answering'
  | 'transcribing' | 'scoring' | 'followup' | 'finished' | 'failed';

export interface TranscriptSegment {
  text: string; startMs: number; endMs: number; confidence: number;
  confidenceSource: 'api' | 'derived';
}

export interface RuleEvent {
  ruleId: string; dimension: 'FILLER' | 'FLUENCY' | 'BODY' | 'CONTENT' | 'RESUME' | 'FIT';
  points: number;               // 扣分为负，加分为正
  occurredAtMs: number;
  actual: number; threshold: number; unit: string;
  evidence: string; confidence: number;
  status: 'APPLIED' | 'WAIVED' | 'INCONCLUSIVE' | 'PENDING_REVIEW';
}

export interface TurnScore {
  content: number | null; resumeEvidence: number | null; jobFit: number | null;
  filler: number | null; fluency: number | null; body: number | null;
  status: 'SCORED' | 'NEEDS_REVIEW' | 'NOT_ENABLED';
}

export interface Turn {
  id: ID; index: number; question: QuestionRef;
  answer: { durationMs: number; mimeType: string; audioKey: string | null; manualText?: string };
  transcripts: TranscriptSegment[];
  ruleEvents: RuleEvent[];
  aiResult: AiScoreResult | null;
  followUps: { level: 1 | 2 | 3; question: string; answerText: string; atMs: number }[];
  score: TurnScore | null;
  status: 'pending' | 'answered' | 'transcribed' | 'scored' | 'needs_review' | 'skipped';
}

export interface Session {
  id: ID; schemaVersion: number; createdAt: ISODate; updatedAt: ISODate;
  status: SessionStatus;
  jobProfile: JobProfile; resumeId: ID | null; paper: PaperPlan;
  turns: Turn[]; currentIndex: number;
  versions: { scoring: string; prompt: string; bank: string };
  degradeFlags: string[];       // 'ASR_FAILED' | 'LLM_FAILED' | 'OCR_FAILED' | 'MANUAL_INPUT'
  errorCode?: string;
}
```

**报告实体**见 [PM-04 §7](04-评分原则与规则表.md)，实现时用 `ScoreReport`，字段名不得改。

### 2.2 存储设计

| 存储 | 名称 | Key | 索引 | 内容 |
|---|---|---|---|---|
| IndexedDB | `interview-coach` v1 | — | — | — |
| store | `resumes` | `id` | `createdAt` | `ResumeProfile` |
| store | `sessions` | `id` | `createdAt`, `status` | `Session`（含 turns） |
| store | `audio` | `sessionId:turnId` | — | `Blob`（音频，单独存避免撑大会话） |
| store | `reports` | `sessionId` | `createdAt` | `ScoreReport` |
| localStorage | `ic.recentQuestions.v1` | — | — | `string[]`，最近 200 个题 id |
| localStorage | `ic.activeSession.v1` | — | — | `sessionId`（断点恢复用） |
| sessionStorage | `ic.directKey.v1` | — | — | 仅 direct 模式下的临时 Key，关闭标签即失 |

**迁移**：`storage.ts` 导出 `migrate(db, from, to)`，`meta` store 存 `schemaVersion`。每次打开 DB 检查版本号，逐级执行迁移函数；迁移失败 → 备份旧库到 `interview-coach-backup` 并提示用户导出数据后重置。

**清理策略**：音频默认保留 7 天（`createdAt + 7d`），超期在启动时删除并保留报告；设置页提供「立即清除全部音频」。

---

## 3. 会话状态机

### 3.1 状态定义

| 状态 | 含义 | 允许的下一步 |
|---|---|---|
| `idle` | 未开始 | `preparing` |
| `preparing` | 解析简历 + 组卷 | `ready` / `failed` |
| `ready` | 题目已就绪，等用户点开始 | `asking` |
| `asking` | 播报/展示当前题 | `answering` |
| `answering` | 录音中 | `transcribing` |
| `transcribing` | ASR 处理中 | `scoring` |
| `scoring` | 规则 + AI 评分中 | `followup` / `asking`（下一题）/ `finished` |
| `followup` | 展示追问，等作答 | `transcribing` |
| `finished` | 10 题完成 | `idle`（看报告） |
| `failed` | 不可恢复错误 | `preparing`（重试） |

### 3.2 关键守卫

| 转换 | 守卫条件 | 失败处理 |
|---|---|---|
| `asking → answering` | 麦克风权限已授予 | 提示授权指引，可切「文字作答」 |
| `answering → transcribing` | 录音时长 ≥1.5s | 提示"太短了，再说一次"，回到 `asking` |
| `transcribing → scoring` | 至少 1 段转写非空 | 转 `NEEDS_REVIEW` 或手动输入，不阻塞 |
| `scoring → followup` | `aiResult.followUp.needed && level ≤ 2` | 直接下一题 |
| `scoring → finished` | `currentIndex === order.length - 1` | — |

**幂等要求**：同一 turn 重复触发评分，必须复用已有 `aiResult`（按 `turnId + answerHash` 缓存），不得重复计费。

**恢复规则**：刷新页面 → 读 `ic.activeSession.v1` → 会话存在且 `status ∈ {answering, transcribing, scoring}` → 回退到 `asking`（该题重录），已完成的 turn 不丢。

---

## 4. 模块实现规格

### 4.1 M01 工程骨架（P0，2 人日）

| 项 | 要求 |
|---|---|
| 脚手架 | `npm create vite@latest -- --template react-ts` |
| 路由 | `react-router-dom` v6，`createBrowserRouter`，5 条路由 |
| 状态 | Zustand（3 个 store：`useSession`、`useSettings`、`useResume`） |
| 样式 | Tailwind + CSS 变量定义色板；不引组件库 |
| 质量 | ESLint + Prettier + `tsc --noEmit` + Vitest；`npm run check` 一键全跑 |
| CI 脚本 | `check` = lint + typecheck + test + `node scripts/validate-bank.mjs` |

**完成判据**：`npm run dev` 起得来；5 个空页面可路由；`npm run check` 全绿。

### 4.2 M02 数据契约与存储（P0，2 人日）

- `types.ts` 全量落地，导出 `SCHEMA_VERSION`。
- `errors.ts`：`class AppError extends Error { code: ErrorCode; recoverable: boolean; userMessage: string; action?: string }`。
- `storage.ts`：`putResume / getResume / putSession / getSession / listSessions / putAudio / getAudio / putReport / deleteAudioOlderThan(days)`。
- 单元测试：写入-读出往返一致（含 `null` 字段与中文）；迁移函数从 v0→v1。

**完成判据**：跑通「存一个假 Session → 刷新 → 读回来」，字段零丢失。

### 4.3 M03 传输层与密钥（P0，1.5 人日）

**先选路线（这是 1.5 人日与 3 人日的区别）**

| 方案 | 做法 | 前置成本 | 密钥位置 | CORS | 构建后能否用 | 适用 |
|---|---|---|---|---|---|---|
| **A 直连** | 浏览器直接 `fetch` 官方域名 | 0 | sessionStorage，用户自填 | ❌ 大概率被拦 | 能（但大概率跑不通） | 只想先验证可行性 |
| **B Vite 代理**（推荐） | `vite.config.ts` 的 `server.proxy` + `preview.proxy` | 20 行配置 | `.env`（非 `VITE_` 前缀，不进包） | ✅ 同源 | 本地 `dev`/`preview` 能 | **你现在的场景：本地自用** |
| C 独立进程 | `node proxy/server.mjs` | 一个常驻进程 | `.env` | ✅ | 能（任意静态服务器） | 将来要发给别人 / 3.0 |

**结论（按你「本地自己用、不发给别人」的场景）**：

- **安全上 A 是可接受的**——Key 只存在于你自己机器的 sessionStorage，除请求本身外不外传，风险等价于你把 Key 写在 Postman 里。之前把它列为红线是「一旦公网/分享」的前提，对你现在的用法过重了。
- **技术上 A 大概率还是跑不通**，卡在 CORS，不是安全。所以真正要测的是 CORS（见 §1.1 的 30 秒脚本）。
- **推荐 B**：不增加任何启动步骤（`npm run dev` 本来就要跑），密钥顺手就不进包了，等于白赚。
- **C 降级为 P2 可选**，等你真要发给别人时再做（约 1 人日，代码可复用）。

**方案 B 实现（`vite.config.ts`）**

```ts
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');   // 注意：不传 'VITE_' 前缀 → 只在此处可见，不进 bundle
  const proxy = {
    '/api/ds': {
      target: 'https://api.deepseek.com',
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/api\/ds/, ''),
      configure: (p) => p.on('proxyReq', (r) => r.setHeader('Authorization', `Bearer ${env.DEEPSEEK_API_KEY}`)),
    },
    '/api/baidu': {
      target: 'https://aip.baidubce.com',
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/api\/baidu/, ''),
      configure: (p) => p.on('proxyReq', (r) => r.setHeader('X-Baidu-AK', env.BAIDU_AK || '')),
    },
  };
  return { server: { proxy }, preview: { proxy } };
});
```

> 注意：百度 ASR 走 `vop.baidu.com`（与 `aip` 不同域），需再加一条 `/api/vop` 转发；token 由前端先取再拼 `?access_token=`。这一条是 1.0 实现时最容易踩的坑，已在 §4.8 标注。

**前端 `apiClient.ts`**

```ts
export type ApiMode = 'proxy' | 'direct';
export async function detectMode(): Promise<ApiMode>;  // 探 /api/health，1.5s 超时
```

| 模式 | 触发 | 密钥来源 | UI 行为 |
|---|---|---|---|
| `proxy` | `/api/health` 200 | `.env`，前端完全无感 | 设置页显示「已连接（本地代理）」 |
| `direct` | `/api/health` 失败/超时 | 用户在设置页填，存 sessionStorage | 顶部黄条「直连模式，Key 存在本机浏览器」 |

**硬性要求**

1. `dist/` 产物里不得出现 `sk-`、`AK`、`SK` 任一字符串（构建后 grep 验证）。
2. `.env` 进 `.gitignore`，仓库只留 `.env.example`。
3. 请求体上限 10MB（单题音频 base64 约 2–8MB）；超时：普通 30s、ASR 60s。
4. 任何错误日志中的 Key 打码为 `sk-****`；直连模式下日志不得打印完整 Authorization。

**完成判据**：`npm run dev` 后 4 条链路（DS/ASR/OCR/token）全部 200；`npm run build && grep -r "sk-" dist/` 无结果；关掉代理后 1.5s 内切 `direct` 并出现黄条。

### 4.4 M04 简历接入（P0，4 人日）

**三条输入通道**

| 通道 | 实现 | 失败降级 |
|---|---|---|
| 图片（jpg/png/webp） | base64 → `/proxy/baidu/ocr` → `words_result` 拼接 | OCR 失败 → 手填 |
| PDF | 文本层提取（`pdfjs-dist`）；扫版 PDF（无文本层）→ 转图走 OCR | 提取字数 <200 → 提示"像是扫描件"并转 OCR |
| 粘贴文本 | 直接用 | — |

**流程**：`upload → extractText → (可选) 脱敏提示 → llm.parse_resume → 用户确认/编辑 → ResumeProfile`

**实现要点**

1. 上传即做**前端脱敏预检**：正则命中身份证/银行卡/手机号 → 弹窗「检测到敏感信息，建议删除后再解析」，提供一键打码（替换为 `***`）。**不强制**，但要留痕 `redacted: boolean`。
2. 调 `parse_resume` 前，文本截断到 8000 字符（超出截断并警告，不静默丢）。
3. 解析结果必须给**可编辑表单**，用户改完才算 `ResumeProfile` 定稿；编辑后 `suspicions` 保留但标记 `edited: true`。
4. `parseConfidence < 0.6` 或 `needsReview` → 顶部黄条「解析可能不准，请核对」+ 高亮 `uncertainFields`。
5. **不落原始文件**，只落 `rawText` 与结构化结果（减少隐私面）。

**完成判据**：3 种简历（PDF 文本版 / 扫描图 / 乱粘贴）都能得到可编辑的 `ResumeProfile`；OCR 失败时手填路径可用；敏感信息预检能命中。

### 4.5 M05 组卷器（P0，3 人日）

严格按 [PM-06](06-题库与组卷规则.md) 实现，位于 `apps/web/src/features/paper/`。

```ts
export function allocate(count: number, weights: TopicWeight[]): Map<TopicId, number>;
export function composePaper(input: {
  jobProfile: JobProfile;
  bankIndex: BankIndex;                 // 池元信息
  loadPool: (t: TopicId) => Promise<Question[]>;
  resume: ResumeProfile | null;
  seed: string;
  recentIds: string[];
}): Promise<PaperPlan>;
```

| 子任务 | 要求 | 单测 |
|---|---|---|
| 配额分配 | 最大余额法 + min/max 约束 + 缺口回填 | 5 组算例（含 §6.2、§6.4） |
| 抽题 | seed 可复现、难度权重、最近题排除 | 同 seed 两次结果一致 |
| 去重 | `expectedPoints` 重合 >70% 重抽（最多 5 次） | 构造 2 道近似题验证 |
| 拷打题 | suspicion 优先 → 项目深挖 → 兜底 | 3 种简历输入 |
| 排序 | `interleave`（默认）/ `block` | 快照测试固定顺序 |
| 降级 | 池不足、简历为空 | `warnings` 断言 |

**可用题集与 seed 告警**：`usable(pool)` 的定义只写在 [PM-06 §7](06-题库与组卷规则.md)，代码里不要重写。当前 10 个池全部是 `stage: "seed"`，因此**每一次组卷都会带 warning**，报告页必须显示「占位题库，质量未校验」——这是诚实性要求，不能藏。

**性能**：单次组卷 ≤150ms（不含池加载）。

### 4.6 M06 会话状态机（P0，2 人日）

用**显式 reducer**，不用 if/else 散落各处：

```ts
export type SessionAction =
  | { type: 'PREPARE' } | { type: 'PAPER_READY'; paper: PaperPlan }
  | { type: 'START' } | { type: 'START_ANSWER'; atMs: number }
  | { type: 'STOP_ANSWER'; durationMs: number; audioKey: string | null }
  | { type: 'TRANSCRIBED'; segments: TranscriptSegment[] }
  | { type: 'SCORED'; score: TurnScore; ruleEvents: RuleEvent[]; ai: AiScoreResult | null }
  | { type: 'FOLLOWUP'; question: string } | { type: 'NEXT' } | { type: 'FAIL'; code: string };
```

**要求**：非法转换抛 `AppError('E_ILLEGAL_TRANSITION')` 并写日志，不得静默忽略；每次转换后 `updatedAt` 刷新并落库（节流 300ms）。

### 4.7 M07 录音与音频处理（P0，3 人日）

这是 1.0 最容易翻车的模块，单独说明。

**管线**

```
getUserMedia → MediaRecorder(opus/webm | aac/mp4)
  → onstop: Blob → AudioContext.decodeAudioData
  → 降混为单声道 → OfflineAudioContext 重采样到 16kHz
  → VAD 切段 → 每段 encodeWAV(PCM16) → base64
```

| 参数 | 值 | 理由 |
|---|---|---|
| 采样率 | 16000 Hz 单声道 | 百度 ASR 要求，体积小 |
| 分段 | 静默 ≥600ms 切段；单段 1.5–15s；不足 1.5s 合并；超 15s 强切 | 短语音接口单次 ≤60s，切段同时产出时间戳 |
| VAD | 帧 20ms，RMS 阈值 = `max(0.008, 0.15 × P95(RMS))` | 自适应环境噪声 |
| 编码 | 16bit PCM LE + 44 字节 WAV 头 | 兼容性最好 |
| 上限 | 单题录音 ≤180s，超出自动截断并提示 | 防误操作录一小时 |

**必须处理的坑**

1. Safari 的 `MediaRecorder` 输出 `mp4/aac`，`decodeAudioData` 可解；但**必须在用户手势内**申请麦克风，否则静默失败。
2. 录音中切后台/锁屏会中断 → 监听 `visibilitychange`，中断时结束当前段并提示「刚才的录音可能不完整」。
3. 音频 Blob 存 IndexedDB，不要塞进 `Session` 对象（会把会话记录撑到几十 MB）。
4. `decodeAudioData` 对大文件会卡主线程 → 用 `AudioWorklet` 或至少 `await` 后让出（`setTimeout(0)`）再处理。

**单测**：给定 3 个固定 wav fixture（纯静音 / 5 秒说话 / 长时间说话），断言切段数量、每段时间戳单调、重采样后长度误差 <1%。

### 4.8 M08 ASR 适配器（P0，2 人日）

```ts
export async function transcribe(segments: AudioSegment[]): Promise<TranscriptSegment[]>;
```

| 项 | 要求 |
|---|---|
| 接口 | `POST /proxy/baidu/asr`，body `{ format:'wav', rate:16000, channel:1, speech: base64, len }` |
| 并发 | 串行 + 令牌桶（默认 2 QPS），见 M13 |
| 重试 | 网络/5xx 重试 3 次（1s/2s/4s）；`4004/4005`（配额/权限）不重试，直接降级 |
| 空结果 | 段文本为空 → 该段标 `confidence=0`，不参与统计，不影响其它段 |
| 置信度 | 百度短语音**可能不返回**词级置信度 → 用代理指标：`confidence = clamp(识别字数 / (段时长秒 × 4), 0, 1)`，并标 `confidenceSource:'derived'` |
| 拼接 | 按 `startMs` 升序拼接，段间保留标点；去重相邻重复短语（ASR 常见幻觉） |

**验收**：一段 20 秒中文普通话，转写字准确率目测 ≥85%，时间戳单调且误差 ≤1.5s（与音频对拍）。

### 4.9 M09 规则引擎（P0，3 人日）

**必须是纯函数**：`evaluate(input) → RuleEvent[]`，不读系统时间、不取随机数、不访问 DOM。这样才能写单测、才能在 2.0 搬到服务端复用。

```ts
export interface RuleInput {
  segments: TranscriptSegment[];
  totalDurationMs: number;
  config: RuleConfig;      // 阈值集中在此，见 constants.ts
}
export function evaluateFiller(input: RuleInput): RuleEvent[];
export function evaluateFluency(input: RuleInput): RuleEvent[];
export function evaluateAll(input: RuleInput): RuleEvent[];   // 含去重、封顶、低置信度丢弃
```

**处理顺序（不可乱）**：过滤低置信度 → 时间排序 → 规则命中 → 去重（300ms 窗）→ 单维度封顶（50%）→ 生成事件。

**阈值**：全部来自 [PM-04 §3](04-评分原则与规则表.md)，写在 `constants.ts` 的 `RULE_CONFIG` 里，**不得硬编码在函数内**。

**必写单测（8 条）**

| # | 输入 | 期望 |
|---|---|---|
| U1 | 10 分钟回答含 0 个填充词 | 0 事件 |
| U2 | 密度 7.2 次/分，持续 3 个窗口 | `FIL-001` 命中且 `actual≈7.2` |
| U3 | 密度 11 次/分 | 只命中 `FIL-002`，不与 001 叠加 |
| U4 | "额额额" 连续 3 次 | `FIL-003` 每次 -0.5 |
| U5 | 置信度 0.5 的段 | 不产生任何事件 |
| U6 | 静默 9 秒 | `FLU-003` 一次 |
| U7 | 语速 100 字/分，3 题 | `FLU-001` ×3，封顶 -9 |
| U8 | 全部规则命中 | 单维度总扣分 ≤50 |

### 4.10 M10 AI 评分与追问（P0，3 人日）

```ts
export async function scoreAnswer(args: {
  session: Session; turn: Turn; question: QuestionRef; history: Turn[];
}): Promise<AiScoreResult>;
```

| 步骤 | 要求 |
|---|---|
| 1 组装输入 | 按 [PM-05 §2](05-AI提示词包.md)；`history` 只带最近 6 轮；`resume.rawSnippets` 最多 8 条 |
| 2 调用 | `temperature 0.2`，`response_format: json_object`，超时 30s |
| 3 校验 | 用 `ajv` 校验 §3 Schema；**必须**，非法 JSON 一律不采信 |
| 4 归一 | 丢弃 `confidence<0.65` 的扣分项；分数 `clamp` 到区间；校验 `base + bonus - deduction = score` |
| 5 失败 | 重试 1 次（temperature 0）；仍失败 → 规则分兜底，`degradeFlags += 'LLM_FAILED'`，该题 `score.status='NEEDS_REVIEW'` |
| 6 缓存 | key = `sha1(turnId + answerText + promptVersion)`，同 key 不重复调用 |

**token 护栏**：单场累计输入 >60K token 或单场调用 >30 次 → 停止 AI 调用，余下题目走规则分，并提示「本场已达 AI 用量上限」。

**降级追问**：AI 失败时用 `templates/probe.ts` 的固定模板追问（"你刚提到 X，能具体说下怎么做的吗"），保证对话不中断。

### 4.11 M11 报告聚合与展示（P0，3 人日）

**聚合公式**（[PM-04 §2](04-评分原则与规则表.md)）：

```ts
function aggregate(turns: Turn[], jobProfile: JobProfile): ScoreReport {
  // 1. 每个维度：题均分（跳过 NEEDS_REVIEW / NOT_ENABLED）
  // 2. BODY 在 1.0 恒为 NOT_ENABLED，权重剔除
  // 3. effectiveWeight 归一化 → 加权求和 → clamp 0–100
  // 4. 附加：扣分项聚合（按 ruleId 汇总次数与总扣分）、加分项、疑点列表、降级说明
}
```

**报告页必须包含**（缺一不可）

| 区块 | 内容 | 交互 |
|---|---|---|
| 总分 | 大数字 + 一档评语（优秀/良好/待提升） | — |
| 维度雷达/条形 | 6 维度，`BODY` 显示「未启用」 | 悬停看权重与说明 |
| 扣分明细 | 每条：`ruleId` / 时间戳 / 实际值 vs 阈值 / 原文证据 | 点击定位到对应题 |
| 加分明细 | 同理 | — |
| 逐题回顾 | 题目 / 转写 / 评分 / 追问记录 / 改进建议 | 可展开 |
| 简历疑点 | 类型 + 原文 + AI 判断 + 是否已追问 | — |
| 降级说明 | 若 `warnings` 非空，必须显式列出 | 不可隐藏 |

**"未启用" vs "0 分"**：`BODY` 必须显示为灰色「未启用」，不得显示 0，否则用户会误以为扣光了。

### 4.12 M12 降级与错误处理（P0，2 人日）

四条降级链路，每条都要能手工演示：

| 链路 | 触发 | 降级 | 用户看到 |
|---|---|---|---|
| D1 ASR | 3 次重试失败 / 配额耗尽 | 切文字作答 | 「语音识别暂不可用，请手动输入」（输入框自动聚焦） |
| D2 OCR | 失败或质量低 | 手填简历 | 「识别失败，请粘贴简历文本」 |
| D3 LLM | 超时/非法 JSON/额度 | 规则分 + 模板追问 | 「AI 评分暂不可用，已用规则评分」 |
| D4 动作 | 1.0 恒启用 | — | 报告显示「动作评分未启用」 |

**兜底原则**：任何降级后，**必须仍能产出报告**。做不到就不是降级，是崩溃。

### 4.13 M13 请求队列与限流（P1，1.5 人日）

```ts
export class RateLimiter { constructor(qps: number, burst: number); acquire(): Promise<void>; }
export class SerialQueue { push<T>(task: () => Promise<T>): Promise<T>; }
```

- 全局 QPS 2（百度），并发上限 3；`429` 时指数退避 + 抖动。
- 队列长度 >20 → 提示「当前请求较多，预计等待 Xs」。
- 队列必须可取消（用户退出面试时清空）。

### 4.14 M14 断点恢复与历史（P1，2 人日）

- 刷新/崩溃后回 `asking`（当前题重录），已完成 turn 不丢。
- 历史列表：时间、岗位、总分、题目数、状态；点击进报告。
- 「继续未完成的面试」入口在首页。
- 删除会话 = 删 session + audio + report 三处，且**真的删干净**（验收时用 DevTools 检查 IndexedDB）。

### 4.15 M15 页面与交互完整化（P1，4 人日）

| 页面 | 路由 | 核心元素 | 必做状态 |
|---|---|---|---|
| 首页 | `/` | 开始新面试、继续未完成、历史、说明 | 空态/加载/错误 |
| 设置 | `/setup` | 岗位预设、12 个权重滑块、题量、顺序策略、模式检测 | 权重全 0 禁用 |
| 简历 | `/resume` | 上传三通道、解析结果编辑、疑点列表、脱敏提示 | 解析中/失败/低置信度 |
| 面试 | `/interview` | 题号进度、题干、计时、录音波形、转写可编辑、追问 | 权限拒绝/录音中断/降级 |
| 报告 | `/report/:id` | 见 M11 | 加载/空/降级 |

**交互硬要求**：面试页禁止使用 `alert/confirm`；所有错误用内联提示 + 可操作按钮（重试/降级/跳过）。

### 4.16 M16 本地可观测（P1，1 人日）

- `logger.ts`：环形缓冲 500 条，记录 `ts/level/module/code/message/duration`，**不含**简历正文与音频。
- 设置页「导出诊断日志」按钮 → 下载 JSON（用于你反馈问题）。
- 关键埋点（本地）：每步耗时、重试次数、降级次数、token 估算。

### 4.17 M17 导出（P2，1.5 人日）

- JSON 导出（完整 `ScoreReport`）。
- 打印样式（`@media print`），不做服务端 PDF。

### 4.18 M18 专项训练（P2，2 人日）

- 只出八股、可选题池、不限题量，不做简历拷打。
- 复用 `composePaper`，`probeCount = 0`。

### 4.19 M19 调试面板（P2，1 人日）

- 仅 `import.meta.env.DEV` 下显示：当前 mode、队列长度、最近 10 次调用耗时、降级计数。

---

## 5. 接口层规格

### 5.1 错误码

| code | 触发 | 用户提示 | 自动动作 | 可恢复 |
|---|---|---|---|---|
| `E_PROXY_DOWN` | `/health` 不通 | 代理未启动 | 切 direct 或提示启动命令 | 是 |
| `E_KEY_MISSING` | 缺 Key | 未配置密钥 | 跳设置页 | 是 |
| `E_CORS_BLOCKED` | fetch 抛 TypeError | 跨域被拦截 | 提示用代理模式 | 是 |
| `E_RATE_LIMIT` | 429 | 请求过于频繁 | 退避重试 3 次 | 是 |
| `E_QUOTA_EXCEEDED` | 百度 17/19 | 额度用尽 | 降级 D1/D2 | 否（当天） |
| `E_TIMEOUT` | >30s | 网络超时 | 重试 1 次 | 是 |
| `E_ASR_EMPTY` | 转写为空 | 没听清 | 重录/手填 | 是 |
| `E_ASR_LOW_CONF` | 置信度 <0.7 | 识别不准 | 转复核 | 是 |
| `E_OCR_LOW_QUALITY` | 文本 <200 字或乱码 >30% | 图片不清 | 手填 | 是 |
| `E_LLM_SCHEMA` | Schema 校验失败 | AI 返回异常 | 重试→规则兜底 | 是 |
| `E_LLM_QUOTA` | token 超限 | 用量达上限 | 规则兜底 | 是 |
| `E_AUDIO_PERMISSION` | 麦克风被拒 | 需要麦克风权限 | 引导设置 | 是 |
| `E_AUDIO_TOO_SHORT` | <1.5s | 太短 | 重录 | 是 |
| `E_BANK_INSUFFICIENT` | 可用题不足 | 题库不足 | 放宽配额 + warning | 是 |
| `E_ILLEGAL_TRANSITION` | 状态机非法 | 内部错误 | 回退 asking | 是 |

### 5.2 重试与超时矩阵

| 调用 | 超时 | 重试 | 退避 | 重试后失败动作 |
|---|---|---|---|---|
| `/health` | 1.5s | 0 | — | 切 direct |
| `/baidu/token` | 10s | 2 | 1s/2s | D1/D2 |
| `/baidu/asr` | 60s | 3 | 1s/2s/4s | D1 |
| `/baidu/ocr` | 30s | 2 | 1s/2s | D2 |
| `/deepseek/chat` | 30s | 1（temp 0） | 2s | D3 |

---

## 6. 页面与流程（主流程图）

```
首页 ──开始──▶ 设置(岗位/权重) ──▶ 简历(上传/解析/确认) ──▶ 组卷(preparing)
                                                              │
                                    ┌─────────────────────────┘
                                    ▼
                              面试页(10 题循环)
                          ┌──────────────────────┐
                          │ 出题 → 录音 → 转写    │
                          │  → 评分 → 追问(≤2层)  │
                          │  → 下一题             │
                          └──────────────────────┘
                                    │ 第 10 题结束
                                    ▼
                              报告页(聚合/明细/导出)
```

**中断点**：任一步骤失败 → 显示错误码 + 3 个按钮（重试 / 降级 / 跳过），不允许白屏。

---

## 7. 非功能要求

| 项 | 指标 | 验证方式 |
|---|---|---|
| 首屏 JS（gzip） | ≤250KB | `vite build --report` |
| 题库按需加载 | 首场 ≤400KB | Network 面板 |
| 报告页渲染 | ≤200ms（10 题） | Performance 面板 |
| 单题端到端（转写+评分，不含作答） | P95 ≤8s | 手工计时 10 次 |
| 组卷耗时 | ≤150ms | 单测 benchmark |
| 内存 | 单场 ≤300MB | 任务管理器 |
| 浏览器 | Chrome/Edge ≥120、Safari ≥17 | 手工 |
| 无障碍 | 键盘可达、焦点可见、对比度 ≥4.5:1 | axe DevTools |
| 隐私 | 简历/音频不出本机；无第三方埋点 | 抓包验证 |

---

## 8. 任务拆解与排期

### 8.1 任务清单（按依赖排序；人日 = 复杂度权重，不是工期承诺）

| 任务号 | 模块 | 内容 | 人日 | 依赖 | 完成判据 |
|---|---|---|---|---|---|
| FE-01 | M01 | 脚手架 + 路由 + CI | 2 | — | `check` 全绿 |
| FE-02 | M02 | types/errors/constants | 1 | FE-01 | 类型全覆盖 |
| FE-03 | M02 | storage + 迁移 + 单测 | 1 | FE-02 | 往返一致 |
| FE-04 | M03 | Vite 代理配置 + `.env` + 连通性探测 | 1 | — | 4 条链路 200 |
| FE-05 | M03 | apiClient 模式切换 + 直连兜底 | 0.5 | FE-04 | 1.5s 内切换 |
| FE-06 | M04 | 上传三通道 + 文本提取 | 2 | FE-02 | 3 种文件可读 |
| FE-07 | M04 | 解析 + 编辑表单 + 脱敏预检 | 2 | FE-06 FE-05 | 3 种简历可定稿 |
| FE-08 | M05 | 配额 + 抽题 + 排序 | 2 | FE-02 | 5 组算例通过 |
| FE-09 | M05 | 拷打题生成 + 降级 | 1 | FE-08 | 3 种输入通过 |
| FE-10 | M06 | 状态机 reducer + 持久化 | 2 | FE-03 | 非法转换抛错 |
| FE-11 | M07 | 录音 + 解码 + 重采样 + WAV | 2 | FE-01 | fixture 单测通过 |
| FE-12 | M07 | VAD 切段 + 时间戳 | 1 | FE-11 | 切段数正确 |
| FE-13 | M08 | ASR 适配 + 拼接 + 置信度 | 2 | FE-05 FE-12 | 20s 音频可用 |
| FE-14 | M09 | 规则引擎 + 8 条单测 | 3 | FE-13 | 全绿 |
| FE-15 | M10 | AI 评分 + Schema 校验 + 缓存 | 3 | FE-05 FE-13 | 8 条回归集 |
| FE-16 | M11 | 聚合公式 + 报告页 | 3 | FE-14 FE-15 | 报告可出 |
| FE-17 | M12 | 4 条降级 + 错误码 | 2 | FE-10..16 | 手工演练 4 条 |
| FE-18 | M13 | 队列 + 限流 | 1.5 | FE-05 | 429 可恢复 |
| FE-19 | M14 | 断点恢复 + 历史 | 2 | FE-10 | 刷新不丢 |
| FE-20 | M15 | 5 页面完整化 | 4 | FE-07..16 | 状态全覆盖 |
| FE-21 | M16 | 日志 + 导出诊断 | 1 | FE-17 | 可下载 |
| FE-22 | M17 | JSON/打印导出 | 1.5 | FE-16 | 打印不破版 |
| FE-23 | M18 | 专项训练 | 2 | FE-08 | 只出八股 |
| FE-24 | M19 | 调试面板 | 1 | FE-17 | DEV 可见 |

### 8.2 节奏与卡点（AI 辅助开发视角）

> 你说明 AI 辅助开发很快，那「人日」就不该被当成工期。它只剩一个用途：**判断谁先做、哪里会卡**。下面按「AI 能加速多少」重排。

| 工作类型 | 占比 | AI 加速比 | 真正的卡点 |
|---|---|---|---|
| 样板代码（路由/表单/类型/样式） | ~40% | 10× | 无，直接生成 |
| 算法实现（组卷/规则引擎/聚合） | ~25% | 3× | 单测边界要自己想（U1–U8 那 8 条骗不过去） |
| 第三方联调（百度/DeepSeek 真实返回、配额、CORS） | ~20% | 1.2× | **最慢**，只能实测；文档和模型都会给你错的字段名 |
| 音频管线调参（VAD/切段/重采样） | ~10% | 1.5× | 需要你真人录 5 段（安静/嘈杂/口音/快语速/长停顿） |
| 题库内容（200 题 seed / 1000 题目标） | 另计 | 2×（AI 起草） | 质量校验只能人做，AI 出的题会重复和跑偏 |

**结论**：代码侧 1 周内能出可跑版本；**工期由三件事决定，而不是由代码量决定**——

| # | 决定工期的变量 | 验证成本 | 卡住的后果 |
|---|---|---|---|
| 1 | DeepSeek/百度能不能直连（CORS） | 30 分钟（§1.1 脚本） | 决定 M03 走 A 还是 B，差 1 人日 |
| 2 | 百度 ASR 是否返回词级时间戳 | 半天（拿一段真录音打一次） | 口头禅只能定位到 ±1.5s，报告话术要改 |
| 3 | 正式题库什么时候替换 seed | 取决于内容投入 | 组卷可跑，但得分只代表占位题 |

**建议节奏（可压缩，不必按 5 周）**：W1 竖切 + 三条卡点全部验掉；W2 评分链路 + 报告；W3 降级 + 内测。若三条卡点 W1 就清了，两周出可用版本是现实的。

**唯一不建议压缩的**：题库的 `verified` 校验。200 题里混进 20 道烂题（歧义/答案错/重复），报告可信度会被直接毁掉，而这部分 AI 帮不上忙。

### 8.3 里程碑（相对周，按"验证"而非"写完"定义）

| 周 | 目标 | 判据 |
|---|---|---|
| W1 | 契约冻结 + 三条卡点验证 + 组卷器 | 假数据能出一份 `PaperPlan`；CORS/ASR 格式/时间戳三问有答案 |
| W2 | 录音 → ASR → 规则分 → AI 分 → 报告 | 一场完整面试出报告 |
| W3 | 4 条降级 + 页面完整化 + 内测 | 降级可演示，验收清单全绿 |

---

## 9. 验收清单

### 9.1 功能（必过）

- [ ] 上传 PDF/图片/粘贴三种简历，都能得到可编辑的 `ResumeProfile`
- [ ] 权重配置 `vue20/network20/react20/engineering20/java10`，得到 5 道八股且五者各 1 道（与 [PM-06 §6.2](06-题库与组卷规则.md) 一致）
- [ ] 同 seed 组卷两次结果完全一致
- [ ] 10 题顺序符合 `interleave` 快照
- [ ] 录音 → 转写 → 评分 → 追问完整跑通，单题 ≤8s（不含作答）
- [ ] 报告含：总分、6 维分、扣分明细（含时间戳与阈值）、加分、逐题回顾、疑点、降级说明
- [ ] `BODY` 显示「未启用」而非 0 分
- [ ] 刷新页面不丢已完成题目

### 9.2 降级（必须手工演示 4 条）

- [ ] 关掉代理/改错 Key → 1.5s 内切 direct 并给黄条，不白屏
- [ ] 断网录音 → 手动输入 → 仍能出报告
- [ ] 简历 OCR 失败 → 手填 → 仍能拷打
- [ ] LLM 返回非法 JSON → 规则兜底 → 报告仍生成且标注

### 9.3 规则与质量

- [ ] 规则引擎 8 条单测全绿
- [ ] `validate-bank` 能拦住坏题
- [ ] 同一 turn 重复评分不重复调用 AI（查日志）
- [ ] 日志与导出中无明文 Key、无简历全文

### 9.4 安全与隐私

- [ ] `dist` 产物全文搜索不到 `sk-`、`AK`、`SK`
- [ ] 抓包确认简历与音频不出本机（除代理转发）
- [ ] 敏感信息预检能命中身份证/手机号
- [ ] 删除会话后 IndexedDB 三个 store 均无残留

### 9.5 性能

- [ ] 首屏 JS ≤250KB gzip
- [ ] 报告页渲染 ≤200ms

---

## 10. 风险与回滚

| 风险 | 概率 | 影响 | 缓解 | 回滚 |
|---|---|---|---|---|
| 百度 ASR 无词级时间戳，口头禅定位不准 | 高 | 扣分位置偏移 | 用 VAD 切段近似（±1.5s），报告标注"定位为近似" | 关闭时间戳展示，只给次数 |
| DeepSeek/百度 CORS 拦截 | 高（待实测） | 直连模式不可用 | 走 Vite 代理（零额外进程）；**W1 第一件事就是跑 §1.1 的 30 秒脚本** | 切 direct 模式（本地自用可接受） |
| 百度 ASR 与 OCR 不同域（`vop` vs `aip`） | 高 | 只配一条代理会漏 | 配两条 rewrite（§4.3 已标） | — |
| 题库题量不足 | 中 | 组卷降级 | 现有 10 池 × 20 题 seed 已够跑通；正式题库按池替换 | 降低池配额，`warnings` 提示 |
| Safari 录音格式差异 | 中 | 部分用户不可用 | 解码层统一转 16k wav；Safari 单测 | 提示改用 Chrome |
| 规则误判引发不信任 | 中 | 用户弃用 | 扣分可展开看证据 + 单条申诉入口 | 全局关闭口头禅扣分（设置项） |
| 单场 token 超预算 | 低 | 成本上升 | 60K 护栏 + 缓存 | 超限自动转规则分 |

---

## 11. 待确认（都有默认值，不答按默认开工）

| # | 问题 | 默认值 | 影响 |
|---|---|---|---|
| Q1 | 直连能不能通？（跑 §1.1 脚本） | 假设不通，走 Vite 代理 | 决定 M03 走 A/B，差 1 人日 |
| Q2 | 权重数值暂不定——是否接受默认进「自定义」、不给预设？ | 接受，预设只留示例 JSON | 设置页交互 |
| Q3 | 正式题库什么时候替换 seed？ | 跑通后再换，整池替换 | 不影响开发 |
| Q4 | 权重导致 java 出 0 道，是否加"至少 1 道"开关？ | 不加，UI 提示 | 组卷算法 |
| Q5 | 追问是否计入 10 题？ | 不计入，单独统计 | 报告口径 |
| Q6 | 是否需要"文字作答"作为一等公民（非降级）？ | 是，允许全程手打 | 面试页布局 |

---

## 附录 A：CR-1.0-001 题库模型变更

| 项 | 内容 |
|---|---|
| 类型 | 功能调整（数据模型 + 算法） |
| 改前 | 固定 40 题，随机抽 5 题，无岗位适配 |
| 改后 | **10 池 × 20 题 seed（200 题）**，目标 100 题/池；按岗位权重分配 5 道配额，5 八股 + 5 拷打 |
| 影响 | 前端（组卷器、设置页权重 UI、题库加载）、数据结构（新增 `TopicPool/JobProfile/PaperPlan`）、内容（正式题库替换） |
| 不改 | 评分规则（PM-04 不变）、提示词（PM-05 不变） |
| 验收 | 见 [PM-06 §12](06-题库与组卷规则.md) |
| 回滚 | 保留 `presets/legacy_40.json`，`composePaper` 加 `strategy:'legacy'` 开关，一行配置切回固定卷 |
| 兼容 | 旧会话的 `paper` 字段保留原结构，报告可正常渲染 |

## 附录 B：CR-1.0-002 传输与密钥方案（v2 修订）

| 项 | 内容 |
|---|---|
| 类型 | 功能调整（部署/安全） |
| 改前（v1，已被推翻） | 独立 `proxy/server.mjs` 进程，**标为 P0 必需组件** |
| 改后（本版） | **Vite `server.proxy`/`preview.proxy` 为主**（零额外进程，密钥不进 bundle）；direct 直连为兜底；独立进程降为 P2 可选 |
| 原因 | 用户场景是本地自用，安全风险可接受；真正的阻塞是 CORS 而非密钥泄露。把「必需进程」当 P0 属于过度设计，增加了启动摩擦 |
| 影响 | `proxy/` 目录从 P0 移出；M03 3→1.5 人日；总工作量 45→43.5 人日 |
| 验收 | `npm run dev` 起服务即通；`dist` 搜不到密钥；关代理后 1.5s 切 direct |
| 回滚 | 若后续要发给别人/上公网，恢复 `proxy/server.mjs`（约 1 人日，接口路径已按 `/api/*` 对齐，前端零改动） |
| 对既有功能影响 | 无（前端统一走 `apiClient`，模式对上层透明） |
| 遗留判断 | 直连能否成功取决于 DeepSeek/百度是否返回 CORS 头，**必须实测**，不做假设 |

---

## 变更记录

| 版本 | 日期 | 变更内容 |
|---|---|---|
| v1.0 | 2026-11-03 | 初版：19 个模块、数据契约、状态机、音频管线、规则引擎、AI 接入、验收清单、容量测算、2 条变更附录 |
| v1.1 | 2026-11-03 | 三处修订：①CR-1.0-002 v2——代理从「P0 必需进程」改为「Vite 配置」，M03 3→1.5 人日，总 45→43.5；②权重数值不锁定，预设仅作示例；③「人日」重定义为复杂度权重，§8.2 改为节奏与卡点分析，去掉 4 周/5 周三方案 |
