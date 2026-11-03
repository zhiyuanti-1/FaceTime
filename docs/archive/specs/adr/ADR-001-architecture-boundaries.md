# ADR-001：版本边界与职责分域

日期：2026-11-03。状态：已采用（目录与文档初始化）。适用：1.0，预留2.0/3.0。

## 背景与备选

用户授权创建目录与规范，禁止业务代码。PM采用根src、Vite本地代理，未来后端化。备选为立即引入apps/packages工作区与独立代理进程；当前会增加运行与路径迁移成本，暂不采用。

## 决策

保留根src；新增packages/shared/contracts、packages/shared/scoring、packages/ai/prompts、packages/rules/scoring。server为NestJS预留，workers为Python推理预留，deploy为公网预留。每个叶子只放职责README。本轮不建package.json、锁文件、配置、CI YAML、Schema、规则与提示词实现。

apps/web/src/domain/types.ts未来只兼容导出共享类型；features/scoring保留编排，packages/shared/scoring是纯内核，rules是阈值资产。静态题库留apps/web/src/data，与PM路径一致。独立proxy不初始化，沿CR-1.0-002 v2本地Vite主方案。

## 后果与约束

跨端契约无框架依赖；2.0通过适配器迁移。未来落实路径调整必须同步计划。精确依赖版本安装阶段复核。目录授权不代表评分量纲、组卷错误、隐私告知等已批准，仍受DOCUMENT_GAPS门禁。

## 验证与替换

本轮验证文件/链接/占位/原文保留。2.0工具链确需独立工作区时另立ADR迁移到apps/packages，给路径映射、导入变更与回归。无实现阶段回滚只撤销本次新增文件，不动PM原文；禁止未经确认递归删除工作区。

## 文档记录

适用：1.0 架构初始化；2.0/3.0 为预留（各节另有说明时从其说明）。状态：技术规范基线；引用的未决业务规则仍待冻结。

| 版本 | 日期 | 变更 |
|---|---|---|
| 1.0.0 | 2026-11-03 | 初始架构与规范；仅文档和说明占位 |
