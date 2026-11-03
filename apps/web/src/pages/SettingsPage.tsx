import {
  Badge,
  Button,
  Card,
  Heading,
  Notice,
  PrivacyNotes,
} from "../components/PreviewUi";
export function SettingsPage() {
  return (
    <div className="stack settings-page">
      <div className="grid two">
        <Card>
          <Heading title="传输模式" subtitle="默认走本地代理，直连为备用" />
          <div className="proxy-status">
            <span className="status-dot" />
            <strong>本地代理 · 连接态示例</strong>
          </div>
          <p>/api/health 状态未探测，当前无网络请求</p>
          <div className="actions">
            <Badge>Vite server.proxy</Badge>
            <Badge tone="green">无额外进程</Badge>
          </div>
          <p className="muted">未来密钥仅在进程环境变量中，不进入 dist。</p>
        </Card>
        <Card>
          <Heading title="直连备用（仅在代理不可用时）" />
          <div className="key-field">
            <input
              type="password"
              disabled
              placeholder="临时凭证输入暂未开放"
              aria-label="直连临时凭证（未开放）"
              autoComplete="off"
            />
            <Button>保存</Button>
          </div>
          <p>
            仅存 sessionStorage，关闭标签即失效；不写入 localStorage、不上报。
          </p>
          <p className="amber-text">
            直连可能被浏览器 CORS 拦截，属于实验路径。
          </p>
        </Card>
        <Card>
          <Heading title="数据管理" subtitle="产品数据全部在本机，可随时清除" />
          <div className="actions">
            <Button>导出诊断日志</Button>
            <Button>清除音频</Button>
            <Button>删除全部</Button>
          </div>
          <p>诊断日志只含时间、模块、错误码与耗时，不含简历正文与音频。</p>
          <p>
            删除会同时清理 sessions / resumes / audio / reports 四个 store。
          </p>
          <p className="muted">当前静态预览未使用浏览器存储。</p>
        </Card>
        <Card>
          <Heading title="隐私说明" subtitle="两种事实分别说明" />
          <PrivacyNotes />
        </Card>
      </div>
      <Card>
        <Heading
          title="口径版本"
          subtitle="报告记录版本，跨版本对比时提示差异"
        />
        <div className="version-grid">
          {[
            ["scoringVersion", "1.0.0"],
            ["promptVersion", "1.0.0"],
            ["bankVersion", "1.0.0-seed"],
          ].map(([name, value]) => (
            <div key={name}>
              <p className="muted">{name}</p>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </Card>
      <Notice>
        <strong>无法连接时怎么办？</strong>
        <p>
          实际接入后：确认本地开发服务在运行，检查环境变量配置；仍失败可临时改用直连。
        </p>
        <p className="muted">
          dist
          不具备代理能力，局域网分享或公网使用必须重新评审。当前界面只展示这些说明，不执行检测。
        </p>
      </Notice>
    </div>
  );
}
