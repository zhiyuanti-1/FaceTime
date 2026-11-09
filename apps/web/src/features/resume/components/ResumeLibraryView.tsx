import { useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useResumeDrawer } from "../hooks/useResumeDrawer";
import { useResumeLibrary } from "../hooks/useResumeLibrary";
import { ResumeCard } from "./ResumeCard";
import { ResumeDrawer } from "./ResumeDrawer";
import styles from "./ResumeLibraryView.module.css";

export const ResumeLibraryView = () => {
  const library = useResumeLibrary();
  const [search, setSearch] = useSearchParams();
  const keyword = search.get("q") ?? "";
  const query = keyword.trim().toLocaleLowerCase();
  const newButton = useRef<HTMLButtonElement>(null);
  const drawer = useResumeDrawer(library.update, (id) => {
    library.remove(id);
    requestAnimationFrame(() => newButton.current?.focus());
  });
  const { list } = library;
  const { state } = drawer;
  const selectedId = "record" in state ? state.record?.id : "id" in state ? state.id : undefined;
  const inProgress = state.kind === "edit" || state.kind === "import" || state.kind === "delete";
  const matches = list.status === "ready" ? list.items.filter(({ fullName, desiredRole }) =>
    [fullName, desiredRole].some((value) => value?.toLocaleLowerCase().includes(query)) || !query) : [];

  return (
    <section className={styles.page} aria-labelledby="resumeLibraryTitle">
      <div className={styles.library}>
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1 id="resumeLibraryTitle">简历库</h1>
            <p>集中管理简历，随时更新求职方向和经历，为下一场面试做好准备。</p>
          </div>
          <div className={styles.heroArt} aria-hidden="true"><span className={styles.paper} /></div>
        </div>
        <div className={styles.toolbar}>
          <button className="prismButton" data-variant="primary" type="button" ref={newButton}
            disabled={list.status !== "ready" || inProgress} onClick={() => drawer.show({ kind: "edit" })}>＋ 新建简历</button>
          <button className="prismButton" type="button" disabled={list.status !== "ready" || inProgress}
            onClick={() => drawer.show({ kind: "import" })}>导入简历</button>
          <input type="search" className={`prismInput ${styles.search}`} aria-label="搜索简历"
            placeholder="搜索姓名或岗位" value={keyword} onChange={(event) => {
              const next = new URLSearchParams(search);
              if (event.target.value) next.set("q", event.target.value);
              else next.delete("q");
              setSearch(next, { replace: true });
            }} />
        </div>
        <div className={styles.sectionTitle}>
          <h2>我的简历</h2>
          {list.status === "ready" && <p>{list.items.length} 份简历</p>}
        </div>
        {list.status === "loading" && <div className={styles.message} role="status">正在加载简历…</div>}
        {list.status === "error" && <div className={styles.message}>
          <p className="prismNotice" role="alert">简历列表加载失败，请重试。</p>
          <button className="prismButton" type="button" onClick={library.retry}>重试</button>
        </div>}
        {list.status === "ready" && (matches.length ? (
          <ul className={styles.list}>
            {matches.map((resume) => <ResumeCard key={resume.id} resume={resume} selected={selectedId === resume.id}
              disabled={inProgress} onOpen={() => void drawer.open(resume.id)} />)}
          </ul>
        ) : (
          <div className={styles.message}>
            {list.items.length ? <h3>没有匹配的简历</h3> : <><h3>还没有简历</h3><p>新建或导入第一份简历。</p></>}
          </div>
        ))}
      </div>
      {state.kind === "closed"
        ? <aside className={styles.detailPlaceholder}><h2>简历详情</h2><p>选择左侧简历查看详情。</p></aside>
        : <ResumeDrawer drawer={drawer} />}
    </section>
  );
};
