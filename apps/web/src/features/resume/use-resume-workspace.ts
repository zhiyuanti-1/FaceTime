import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Resume, ResumeFields, ResumeSummary } from "@face/shared";
import { coreApi } from "../../services/repositories/core-api";
import { errorMessage } from "../../services/http/client";
type State = {
  items: ResumeSummary[];
  selected: Resume | null;
  draft: string;
  fieldsDraft: ResumeFields | null;
  busy: string;
  error: string;
  notice: string;
  loading: boolean;
  listReady: boolean;
};
const initial: State = {
  items: [],
  selected: null,
  draft: "",
  fieldsDraft: null,
  busy: "",
  error: "",
  notice: "",
  loading: true,
  listReady: false,
};
export function useResumeWorkspace() {
  const [state, patch] = useReducer(
    (s: State, p: Partial<State>) => ({ ...s, ...p }),
    initial,
  );
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const items = await coreApi.resumes();
    patch({ items });
  }, []);
  useEffect(() => {
    let active = true;
    coreApi
      .resumes()
      .then((items) => {
        if (active) patch({ items, loading: false, listReady: true });
      })
      .catch((error) => {
        if (active) patch({ error: errorMessage(error), loading: false });
      });
    return () => {
      active = false;
      version.current++;
    };
  }, []);
  const dirty =
    !!state.selected &&
    state.draft !== (state.selected.editedText ?? state.selected.rawText);
  function accept(value: Resume) {
    patch({ selected: value, draft: value.editedText ?? value.rawText });
  }
  async function select(id: string) {
    if (dirty) {
      patch({ error: "请先保存或放弃当前修订，再切换简历" });
      return;
    }
    const current = ++version.current;
    patch({ busy: "加载简历", error: "", notice: "" });
    try {
      const value = await coreApi.resume(id);
      if (version.current === current) accept(value);
    } catch (error) {
      if (version.current === current) patch({ error: errorMessage(error) });
    } finally {
      if (version.current === current) patch({ busy: "" });
    }
  }
  async function upload(file: File) {
    if (dirty) {
      patch({ error: "请先保存或放弃当前修订" });
      return;
    }
    patch({ busy: "提取全文中，请勿重复上传", error: "", notice: "" });
    try {
      const result = await coreApi.upload(file);
      accept(result);
      patch({ fieldsDraft: result.draft?.ok ? result.draft.structured : null });
      patch({ items: [result, ...state.items] });
      patch(
        result.draft?.ok === false
          ? { error: result.draft.error.message }
          : {
              notice: result.draft?.ok
                ? "草稿已生成，请核对后保存。"
                : "原文件已保存，请核对提取内容。",
            },
      );
      return true;
    } catch (error) {
      patch({ error: errorMessage(error) });
      return false;
    } finally {
      patch({ busy: "" });
    }
  }
  async function recognize() {
    if (!state.selected) return;
    patch({ busy: "重新识别中", error: "", notice: "" });
    try {
      const result = await coreApi.recognize(state.selected.id);
      accept(result);
      patch({ fieldsDraft: result.draft?.ok ? result.draft.structured : null });
      if (result.draft?.ok === false)
        patch({ error: result.draft.error.message });
      if (result.draft?.ok) patch({ notice: "草稿已生成，请核对后保存。" });
      await refresh();
    } catch (error) {
      patch({ error: errorMessage(error) });
    } finally {
      patch({ busy: "" });
    }
  }
  async function save() {
    if (!state.selected) return;
    patch({ busy: "保存修订中", error: "", notice: "" });
    try {
      accept(await coreApi.confirm(state.selected.id, state.draft));
      await refresh();
      patch({ notice: "确认文本已保存，原始识别内容仍完整保留。" });
    } catch (error) {
      patch({ error: errorMessage(error) });
    } finally {
      patch({ busy: "" });
    }
  }
  async function paste(text: string) {
    if (dirty || state.busy) return;
    patch({ busy: "正在保存粘贴简历", error: "", notice: "" });
    try {
      accept(await coreApi.paste(text));
      await refresh();
      patch({ notice: "粘贴简历已保存" });
    } catch (error) {
      patch({ error: errorMessage(error) });
    } finally {
      patch({ busy: "" });
    }
  }
  async function remove(id: string) {
    if (state.busy || dirty) return;
    patch({ busy: "正在删除简历", error: "", notice: "" });
    try {
      await coreApi.deleteResume(id);
      patch({
        items: state.items.filter((item) => item.id !== id),
        notice: "简历已删除",
      });
      await refresh();
    } catch (error) {
      patch({ error: errorMessage(error) });
    } finally {
      patch({ busy: "" });
    }
  }
  async function retryList() {
    patch({ loading: true, error: "" });
    try {
      await refresh();
      patch({ listReady: true });
    } catch (error) {
      patch({ error: errorMessage(error) });
    } finally {
      patch({ loading: false });
    }
  }
  return {
    ...state,
    retryList,
    close: () =>
      patch({
        selected: null,
        draft: "",
        fieldsDraft: null,
        error: "",
        notice: "",
      }),
    clearFieldsDraft: () => patch({ fieldsDraft: null }),
    paste,
    remove,
    dirty,
    select,
    upload,
    recognize,
    save,
    setDraft: (draft: string) => patch({ draft }),
    discard: () =>
      patch({
        draft: state.selected?.editedText ?? state.selected?.rawText ?? "",
        error: "",
      }),
    setError: (error: string) => patch({ error }),
  };
}
