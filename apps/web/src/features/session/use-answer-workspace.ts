import { useEffect, useState } from "react";
import type { Practice } from "@face/shared";
import { coreApi } from "../../services/repositories/core-api";
import { errorMessage } from "../../services/http/client";
export function useAnswerWorkspace(id: string | undefined) {
  const [practice, setPractice] = useState<Practice | null>(null);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (id)
      coreApi
        .practice(id)
        .then((data) => {
          if (active) {
            setPractice(data);
            setDraft(data.turns[0]?.answerText ?? "");
          }
        })
        .catch((err) => {
          if (active) setError(errorMessage(err));
        });
    return () => {
      active = false;
    };
  }, [id]);
  const turn = practice?.turns[index];
  const dirty = turn && draft !== turn.answerText;
  function select(next: number) {
    if (dirty) {
      setError("请先保存当前回答，或还原后再切换题目。");
      return;
    }
    setIndex(next);
    setDraft(practice?.turns[next]?.answerText ?? "");
    setError("");
  }
  async function save() {
    if (!practice || !turn) return;
    setBusy(true);
    setError("");
    try {
      const updated = await coreApi.answer(practice.id, turn.id, draft);
      setPractice(updated);
      setDraft(updated.turns[index]?.answerText ?? "");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return {
    practice,
    index,
    draft,
    error,
    busy,
    turn,
    dirty,
    select,
    save,
    setDraft,
  };
}
