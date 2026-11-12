export const resumeDebugPage = String.raw`<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>简历提示词调试</title>
<style>
  body{font:16px/1.5 system-ui,sans-serif;color:#182336;background:#f6f8fb;margin:0}
  main{max-width:1100px;margin:auto;padding:24px}
  section{background:white;border:1px solid #dce3ee;border-radius:8px;padding:16px;margin:14px 0}
  h1,h2{margin:0 0 10px} h2{font-size:18px}
  textarea,pre{width:100%;box-sizing:border-box;padding:10px;border:1px solid #bcc9db;border-radius:4px;background:#fafcff;overflow-wrap:anywhere;white-space:pre-wrap}
  textarea{min-height:150px;resize:vertical}
  button,input{font:inherit;margin:4px;padding:4px 8px}
  .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  [role=status]{min-height:1.5em;color:#233b62}
  @media(max-width:700px){.grid{grid-template-columns:1fr}}
</style>
<main>
  <h1>简历提示词调试</h1>
  <p>PDF 或图片发送给百度 OCR。识别后的文字只发送给本机 Qwen2.5-3B-Instruct。调试内容不会写入简历库。</p>
  <form id="login" hidden>
    <label>管理员账号 <input name="username" autocomplete="username" required></label>
    <label>密码 <input name="password" type="password" autocomplete="current-password" required></label>
    <button>登录</button>
  </form>
  <div id="tools" hidden>
    <section>
      <h2><label for="text">1. OCR 原文</label></h2>
      <form id="ocr"><input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg" required aria-label="PDF 或图片"><button>上传并识别</button></form>
      <textarea id="text" placeholder="上传识别，或直接粘贴测试原文"></textarea>
    </section>
    <section>
      <h2><label for="prompt">2. 编辑提示词</label></h2>
      <textarea id="prompt"></textarea>
      <p>已启用字段 Schema 约束解码。</p>
      <button id="reset" type="button">恢复默认提示词</button>
      <button id="run" type="button">运行本机模型</button>
    </section>
    <section>
      <h2>3. 查看结果</h2>
      <p id="diagnosis"></p>
      <div class="grid">
        <div><strong>模型原始输出</strong><pre id="raw"></pre></div>
        <div><strong>解析后的 JSON</strong><pre id="json"></pre></div>
      </div>
      <details><summary>查看字段类型校验明细</summary><pre id="validation"></pre></details>
    </section>
  </div>
  <p id="status" role="status"></p>
</main>
<script>
  const byId = (id) => document.getElementById(id);
  const show = (id, text) => { byId(id).textContent = text; };
  let defaultPrompt = "";
  async function request(path, body) {
    const options = body === undefined ? {} : { method: "POST", body };
    if (typeof body === "string") options.headers = { "Content-Type": "application/json" };
    const response = await fetch(path, options);
    const data = await response.json();
    if (response.status === 401) {
      byId("login").hidden = false;
      byId("tools").hidden = true;
    }
    if (!response.ok) throw new Error(data.error?.message || "请求失败");
    return data;
  }
  async function action(button, message, work) {
    if (button) button.disabled = true;
    show("status", message);
    try { await work(); show("status", ""); }
    catch (error) { show("status", error.message); }
    finally { if (button) button.disabled = false; }
  }
  async function open() {
    defaultPrompt = (await request("/debug/resume/prompt")).prompt;
    byId("prompt").value = defaultPrompt;
    byId("login").hidden = true;
    byId("tools").hidden = false;
  }
  byId("login").onsubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const credentials = JSON.stringify(Object.fromEntries(new FormData(form)));
    form.reset();
    void action(event.submitter, "正在登录…", async () => {
      await request("/api/v1/auth/login", credentials);
      await open();
    });
  };
  byId("ocr").onsubmit = (event) => {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    byId("run").disabled = true;
    void action(event.submitter, "正在调用百度 OCR…", async () => {
      byId("text").value = (await request("/debug/resume/ocr", body)).rawText;
      for (const id of ["diagnosis","raw","json","validation"]) show(id, "");
    }).finally(() => { byId("run").disabled = false; });
  };
  byId("reset").onclick = () => { byId("prompt").value = defaultPrompt; };
  byId("run").onclick = () => {
    for (const id of ["diagnosis","raw","json","validation"]) show(id, "");
    void action(byId("run"), "本机模型推理中…", async () => {
      const data = await request("/debug/resume/run", JSON.stringify({
        rawText: byId("text").value, prompt: byId("prompt").value,
      }));
      show("raw", data.rawOutput);
      show("json", data.validJson ? JSON.stringify(JSON.parse(data.rawOutput), null, 2) : "无法解析为 JSON");
      show("diagnosis", [
        data.finishReason === "stop" ? "生成正常结束" : "结束状态：" + (data.finishReason ?? "未知"),
        data.validJson ? "JSON 语法通过" : "JSON 语法不通过",
        data.validFields ? "字段结构通过" : "字段结构不通过",
        data.issues.some((issue) => issue.code === "work_content_missing") ? "检测到工作正文遗漏，请对照原文核对" : "未检出明确工作正文遗漏（不代表全文完整）",
      ].join(" · "));
      show("validation", JSON.stringify(data.issues, null, 2));
    });
  };
  void action(null, "正在检查登录…", open);
</script>
</html>`;
