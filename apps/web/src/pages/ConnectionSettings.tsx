import { useEffect, useState } from "react";
import { z } from "zod";
import { settingsSchema } from "@face/shared";
import { coreApi } from "../services/repositories/core-api";
import { errorMessage } from "../services/http/client";
import { Feedback, PageHeading } from "../components/WorkbenchUi";
export function ConnectionSettings() {
  const [settings, setSettings] = useState<z.infer<
    typeof settingsSchema
  > | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    coreApi
      .settings()
      .then(setSettings)
      .catch((err) => setError(errorMessage(err)));
  }, []);
  return (
    <>
      <PageHeading
        number="04"
        title="连接与本机配置。"
        description="私密配置统一保存在后端环境文件，浏览器只读取连接状态。"
      />
      <Feedback message={error} />
      <section className="paper-panel settings-panel">
        <h2>服务状态</h2>
        {settings ? (
          <dl>
            <div>
              <dt>数据存储</dt>
              <dd>{settings.database} · 已连接</dd>
            </div>
            <div>
              <dt>百度 OCR</dt>
              <dd>
                {settings.baiduConfigured
                  ? "凭证已配置（实际可用性以识别结果为准）"
                  : "待配置凭证 · Word / TXT 可直接提取"}
              </dd>
            </div>
            <div>
              <dt>PDF 上传限制</dt>
              <dd>
                {settings.uploadMaxMb} MB / {settings.pdfMaxPages} 页
              </dd>
            </div>
            <div>
              <dt>评分</dt>
              <dd>未启用</dd>
            </div>
          </dl>
        ) : (
          <p>正在读取配置…</p>
        )}
        <div className="config-note">
          <h3>一次配置，统一维护</h3>
          <p>
            在本机 <code>apps/api/.env</code> 中管理数据库连接、管理员账号和百度
            OCR 的 BAIDU_AK / BAIDU_SK。修改后重启后端生效。
          </p>
          <p>
            环境文件和上传原件均已加入 Git
            忽略规则。不要把凭证放入前端环境变量、截图或公共仓库。
          </p>
        </div>
      </section>
    </>
  );
}
