# 目录与文件放置规范

## 目录树

```text
Face/
├─ README.md / AGENTS.md
├─ docs/                         # PM 原文与技术规范
│  └─ adr/                       # 技术决策
├─ plan/                         # 版本计划
├─ changes/                      # CR/SR/PR/HF
├─ apps/web/src/
│  ├─ app/                       # 路由、Provider、装配
│  ├─ pages/                     # 页面组合
│  ├─ components/                # 公共展示组件
│  ├─ features/
│  │  ├─ resume/                 # 接入、解析确认
│  │  ├─ paper/                  # 组卷用例
│  │  ├─ session/                # 状态机、恢复
│  │  ├─ scoring/                # 双引擎编排与聚合
│  │  └─ report/                 # 展示与导出
│  ├─ services/
│  │  ├─ http/                   # 传输、队列、取消
│  │  ├─ providers/              # 第三方协议适配
│  │  └─ repositories/           # 本地/API 仓储适配
│  ├─ state/                     # 跨功能状态
│  ├─ domain/                    # 前端领域约束、共享兼容出口
│  ├─ lib/
│  │  ├─ audio/                  # 音频处理工具
│  │  └─ storage/                # 存储底层
│  ├─ styles/                    # 全局/打印样式
│  └─ data/{bank,presets,templates}/ # bank已有seed JSON，保留
├─ packages/shared/{contracts,scoring}/   # DTO/Schema、纯规则内核
├─ packages/ai/
│  ├─ prompts/{parse-resume,score-answer,final-report}/
│  └─ evaluations/               # 脱敏回归规范
├─ packages/rules/scoring/                # 规则配置与版本
├─ apps/api/                       # 2.0
│  ├─ apps/web/src/{modules,providers,infrastructure}/
│  └─ migrations/
├─ apps/workers/{ocr,asr,llm,vision}/  # 2.0 推理
├─ tests/{unit,integration,contract,e2e,fixtures}/
├─ scripts/                      # 既有validate-bank.mjs保留，其余预留
├─ infra/{containers,environments,observability}/ # 3.0
└─ .github/workflows/            # 仅说明，不含可执行流水线
```

花括号代表多个实际子目录。每个叶子有职责 README 或 .gitkeep。本阶段禁止新增运行入口/配置/依赖/数据实例。既有11个题库JSON和校验脚本不是本轮产物，保留不运行。

## 放置与依赖

| 职责 | 必须放置 | 禁止 |
|---|---|---|
| 页面/路由 | pages/app | 评分与供应商调用 |
| 单功能组件/Hook/状态 | 对应 features 内 | 过早塞全局目录 |
| 通用展示组件 | components | 存储副作用 |
| 跨端 DTO/Schema/错误 | packages/shared/contracts | apps/web/src/domain 重复声明 |
| 纯规则计算 | packages/shared/scoring | 网络/DOM/存储/系统时钟 |
| 阈值数据 | packages/rules/scoring | 魔法数散落算法和组件 |
| 提示词 | packages/ai/prompts/任务/版本 | UI 字符串中硬编码 |
| 题库/示例/模板 | apps/web/src/data 对应子目录 | public 中绕过校验 |
| 传输/供应商/仓储 | services 对应子目录 | 偷改业务规则 |
| 小工具 | lib | 杂物目录与业务聚合 |
| 后端/推理/部署 | apps/api/apps/workers/deploy | 被 1.0 导入 |
| 测试与脱敏样本 | tests 对应类型 | 真实个人数据 |

app/pages → features → 契约和 service 端口；app 装配适配器；适配器 → HTTP/存储底层。shared 不反向依赖。跨功能只使用公开入口，禁止深路径、循环依赖和共享可变单例。后续用 import 限制检查。

## 与 PM 路径映射

保留根 src 和功能名。未来 apps/web/src/domain/types.ts 只兼容导出共享类型，禁止双写。features/scoring 保留编排，纯内核迁至 packages/shared/scoring。packages/ai/rules 独立。独立 proxy 不初始化。见 [ADR-001](adr/ADR-001-architecture-boundaries.md)；落实时须同步计划，不静默改 PM。

## 文档记录

适用：1.0 架构初始化；2.0/3.0 为预留（各节另有说明时从其说明）。状态：技术规范基线；引用的未决业务规则仍待冻结。

| 版本 | 日期 | 变更 |
|---|---|---|
| 1.0.0 | 2026-11-03 | 初始架构与规范；仅文档和说明占位 |
