# FaceTime · AI 面试训练

折光卡片简历库已接入本机管理员登录和 Oracle。登录后可搜索、查看和编辑简历，也可导入 PDF、Word 或 UTF-8 TXT。点击「导入简历」并开始识别后，页面会预填一份新简历草稿。核对后点击「保存简历」即可入库。

另一台已有旧副本的 Windows 电脑可以双击根目录 [update.bat](update.bat) 一键更新、清理旧模型并启动。先将本轮完整代码提交并推送到 GitHub；旧副本第一次只需从 GitHub 下载这份 BAT，放到旧项目根目录再双击，不必先手动拉取其他新脚本。以后直接双击已有的 BAT。需要已安装 Git、Node.js 22.13.0 或更高版本及可用的 NVIDIA 驱动，并保留该电脑自己的 `apps/api/.env` 和 Oracle 环境。

更新器从当前分支已配置的上游快进更新，随后停止能确认属于本目录的开发进程，执行 `npm ci`、安装校验模型及运行资源、构建和真实模型探测。全部通过后，自动删除已知旧 7B 两分片、旧 Qwen3.5-0.8B、Vulkan 运行目录和明确的过渡下载资源，再调用既有启动器。当前 3B/CUDA、未知模型、`.env`、简历和数据库保留。清理具体名单在 [更新脚本](scripts/update-project.ps1) 中维护，不自动迁移数据库。

有本地修改、未跟踪文件（首次放入的 update.bat 除外）、未推送提交或分叉时，更新会停止，不强制覆盖。网络、安装或模型验证失败时旧模型尚未清理，可处理错误后重新双击。代码更新成功后若安装失败，源码仍是已拉取的新版本，不自动回退；失败时已停止的开发服务也不会自动恢复。Git 尚未登录、硬件不满足要求或数据库版本过旧时，需要先处理对应环境问题。

Windows 双击 `scripts/start-dev.bat`，会检查 Node.js 和 npm、补装缺失依赖，并同时启动前端、后端和已安装的本地模型。打开 [简历库](http://127.0.0.1:5173/resumes)，提示词调试页使用启动窗口显示的地址。前端和后端端口占用时自动顺延，前端代理使用同一组端口，启动窗口显示实际地址；本机模型端口 17861 已在运行时直接沿用。保留启动窗口，停止时按 Ctrl+C。

简历库和调试页都用 `apps/api/.env` 里的管理员账号和密码登录。简历库读写需要 Oracle 实例和监听已启动。调试页可以粘贴合成简历文本、编辑提示词并查看本机模型的原始输出和字段校验结果。上传 PDF 或图片时使用百度 OCR，需要后端 OCR 凭证。

简历库导入需要本地模型已启动。PDF 会发送给百度 OCR，Word 和 TXT 直接在本机提取文字。解析接口和限制见[技术约束](docs/技术约束.md#4-接口约束)。

当前简历抽取使用 Qwen2.5-3B-Instruct Q4_K_M 和 llama.cpp CUDA，需 NVIDIA 显卡。首次安装或从旧 7B/Vulkan 升级，运行 `powershell -File scripts/install-local-resume.ps1 -Component Model`，再重启本机模型。17861 上仍是旧模型时启动器会明确报错。工作区域内的子标题会在推理前移除；明确检出正文遗漏时提供原文供核对，不自动补写。无法明确识别的区域仍需人工核对。

如果可以登录但简历列表返回 503，请在 Windows「服务」里检查 Oracle 实例和监听是否都已启动。本机服务名为 `OracleServiceFREE` 和 `OracleOraDB23Home1TNSListener`。启动服务后，在简历库点击「重试」即可。

单独启动前端时，同源代理默认转发到本机 3000 端口。如果只在后端 `.env` 中设置了其他端口，请在启动前端前把 `FACE_API_PROXY_PORT` 设为相同端口。

指南：[需求](product/需求.md) · [技术约束](docs/技术约束.md) · [开发流程](docs/开发流程.md) · [进度](docs/进度.md) · [页面索引](product/prototype/README.md)。AI 入口为 [AGENTS.md](AGENTS.md)。

真实配置仅放被忽略的 `apps/api/.env`。首次配置时使用 `node -p "require('node:crypto').randomUUID()"` 生成一次 `ADMIN_OWNER_ID`，它用于识别已有简历的归属。只启动前后端可用 `npm run dev`，单独启动模型可用 `powershell -File scripts/start-local-resume.ps1`。[接口和配置说明](docs/技术约束.md#4-接口约束)
