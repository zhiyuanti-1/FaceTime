# FaceTime · AI 面试训练

折光卡片简历库已接入本机管理员登录和 Oracle。登录后可搜索、查看和编辑简历，也可导入 PDF、Word 或 UTF-8 TXT。点击「导入简历」并开始识别后，页面会预填一份新简历草稿。核对后点击「保存简历」即可入库。

Windows 双击 `scripts/start-dev.bat`，会检查 Node.js 和 npm、补装缺失依赖，并同时启动前端、后端和已安装的本地模型。打开 [简历库](http://127.0.0.1:5173/resumes)，提示词调试页使用启动窗口显示的地址。前端和后端端口占用时自动顺延，前端代理使用同一组端口，启动窗口显示实际地址；本机模型端口 17861 已在运行时直接沿用。保留启动窗口，停止时按 Ctrl+C。

简历库和调试页都用 `apps/api/.env` 里的管理员账号和密码登录。简历库读写需要 Oracle 实例和监听已启动。调试页可以粘贴合成简历文本、编辑提示词并查看本机模型的原始输出和字段校验结果。上传 PDF 或图片时使用百度 OCR，需要后端 OCR 凭证。

简历库导入需要本地模型已启动。PDF 会发送给百度 OCR，Word 和 TXT 直接在本机提取文字。解析接口和限制见[技术约束](docs/技术约束.md#4-接口约束)。

如果可以登录但简历列表返回 503，请在 Windows「服务」里检查 Oracle 实例和监听是否都已启动。本机服务名为 `OracleServiceFREE` 和 `OracleOraDB23Home1TNSListener`。启动服务后，在简历库点击「重试」即可。

单独启动前端时，同源代理默认转发到本机 3000 端口。如果只在后端 `.env` 中设置了其他端口，请在启动前端前把 `FACE_API_PROXY_PORT` 设为相同端口。

指南：[需求](product/需求.md) · [技术约束](docs/技术约束.md) · [开发流程](docs/开发流程.md) · [进度](docs/进度.md) · [页面索引](product/prototype/README.md)。AI 入口为 [AGENTS.md](AGENTS.md)。

真实配置仅放被忽略的 `apps/api/.env`。首次配置时使用 `node -p "require('node:crypto').randomUUID()"` 生成一次 `ADMIN_OWNER_ID`，它用于识别已有简历的归属。只启动前后端可用 `npm run dev`，单独启动模型可用 `powershell -File scripts/start-local-resume.ps1`。[接口和配置说明](docs/技术约束.md#4-接口约束)
