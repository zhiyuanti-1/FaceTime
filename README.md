# Face · AI 模拟面试练习

按岗位与简历出题、逐题追问，给出可解释的练习反馈。当前已完成8个静态视图和本机Oracle表结构，业务API尚未实现。

## 项目结构

```text
apps/web/        前端（React + TypeScript + Vite）
apps/api/        后端（NestJS规划、Oracle迁移SQL、本机配置）
apps/workers/    2.0 本地模型预留
packages/        共享契约/评分内核、题库、规则、AI资产
product/         产品需求与原型
docs/           技术规范、开发流程、进度与历史归档
scripts/         仓库检查脚本
tests/          仓库级工具测试（前端测试在 apps/web/tests）
infra/           3.0 部署预留
```

根目录统一管理npm workspace与唯一锁文件。当前只有前端注册为运行工作区，后端尚无可启动服务；本轮没有修改数据库或新增业务功能。

## 开发与验证

要求Node ≥22.13、npm、Git。从仓库根目录执行：

```bash
npm ci
npm run dev          # 启动前端，地址以终端Local输出为准
npm run check        # 公开保密检查 + 格式/lint/类型/组件规则/测试
npm run build        # 输出 apps/web/dist
npm run validate:bank # 只读校验200道seed题，不改索引
```

页面底部导航可预览全部视图；业务按钮禁用，所有分数是固定示例。

## 配置与公开GitHub仓库

数据库运行配置已迁至 `apps/api/.env`，原密码不变，**此文件被Git忽略，不能上传**。别人克隆后只能获得空值模板：

```powershell
if (-not (Test-Path apps/api/.env)) { Copy-Item apps/api/.env.example apps/api/.env }
# 在本机编辑密码与连接参数，不在命令行或聊天中粘贴密码。
```

API Key、数据库密码只放后端进程环境变量/本机.env；前端 `VITE_*` 不得放秘密。依赖、产物、运行数据、录音、日志、数据库导出、Oracle钱包/私钥均不提交。题库、原型、无凭证SQL可以提交。

上传前执行 `npm run check:public`。它检查Git可提交集合及暂存区，不打印命中值；还需核对新增图片/附件没有真实隐私。仓库不能包含真实可用凭证，环境变量不等于可以把秘密写进前端。

本机已启用提交前检查；新克隆请执行以下命令启用（只对当前仓库生效）：

```bash
git config --local core.hooksPath .githooks
```

本轮只整理本地文件，没有自动暂存、提交、创建GitHub仓库或推送。当前仓库无历史提交；若以后把真实秘密提交过，仅添加ignore无法移除历史，须先轮换该秘密再处理历史。

## 文档入口

| 文件 | 职责 |
|---|---|
| [AGENTS.md](AGENTS.md) | 后续代理入口、范围与组件约束 |
| [product/需求.md](product/需求.md) | 唯一产品需求事实源 |
| [product/prototype/README.md](product/prototype/README.md) | 原型图索引 |
| [docs/技术约束.md](docs/技术约束.md) | 结构、架构、组件标准、数据库与保密要求 |
| [docs/开发流程.md](docs/开发流程.md) | 版本轮次与变更流程 |
| [docs/进度.md](docs/进度.md) | 当前进度、检查结果与后续工作 |

1.0/2.0按本机常规流程使用；针对攻击及非常规使用的网络安全能力留3.0。本期只落实公开仓库保密，前后端仍不接真实API。后端选型NestJS + TypeORM + node-oracledb + Oracle，已有FREEPDB1/FACE_APP表结构适用，无需换数据库。[建表SQL](apps/api/migrations/001-initial-oracle.sql)已执行，不要盲目重跑。
