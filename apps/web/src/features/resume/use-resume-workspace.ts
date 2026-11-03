import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Resume, ResumeSummary } from "@face/shared";
import { coreApi } from "../../services/repositories/core-api";
import { errorMessage } from "../../services/http/client";
type State = {
  items: ResumeSummary[];
  selected: Resume | null;
  draft: string;
  busy: string;
  error: string;
  notice: string;
  loading: boolean;
};
const initial: State = {
  items: [],
  selected: null,
  draft: "",
  busy: "",
  error: "",
  notice: "",
  loading: true,
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
        if (active) patch({ items, loading: false });
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
      accept(await coreApi.upload(file));
      await refresh();
      patch({ notice: "原文件已保存。请核对提取内容，必要时修订后确认。" });
    } catch (error) {
      patch({ error: errorMessage(error) });
    } finally {
      patch({ busy: "" });
    }
  }
  async function recognize() {
    if (!state.selected) return;
    patch({ busy: "重新识别中", error: "", notice: "" });
    try {
      accept(await coreApi.recognize(state.selected.id));
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
  return {
    ...state,
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
