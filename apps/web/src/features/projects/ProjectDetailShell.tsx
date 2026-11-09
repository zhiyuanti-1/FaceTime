import { useSearchParams } from "react-router-dom";

const tabs = [
  ["resume-job", "简历与岗位"], ["gap", "Gap 诊断"],
  ["narrative", "叙事定制"], ["questions", "题目预览"],
] as const;

export const ProjectDetailShell = () => {
  const [params, setParams] = useSearchParams();
  const selected = tabs.find(([key]) => key === params.get("tab"))?.[0] ?? "resume-job";
  return (
    <div>
      <nav aria-label="项目详情标签" className="tabs">
        {tabs.map(([key, label]) => (
          <button type="button" key={key} aria-current={selected === key ? "page" : undefined}
            onClick={() => setParams({ tab: key })}>{label}</button>
        ))}
      </nav>
      <div className="emptyPanel" aria-label={tabs.find(([key]) => key === selected)?.[1]} />
    </div>
  );
};
