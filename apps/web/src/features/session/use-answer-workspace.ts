import { useEffect, useState } from "react";
import type { Practice, TurnScore } from "@face/shared";
import { coreApi } from "../../services/repositories/core-api";
import { errorMessage } from "../../services/http/client";
export function useAnswerWorkspace(id: string | undefined) {
  const [practice, setPractice] = useState<Practice | null>(null);
  const index = practice?.currentIndex ?? 0;
  const [score, setScore] = useState<TurnScore>();
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
            setDraft(data.turns[data.currentIndex]?.answerText ?? "");
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
  function accept(updated: Practice) {
    setPractice(updated);
    setDraft(updated.turns[updated.currentIndex]?.answerText ?? "");
    setScore(undefined);
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  function select(next: number) {
    if (!practice || next === index) return;
    void run(async () => {
      if (dirty && turn)
        accept(await coreApi.answer(practice.id, turn.id, draft));
      accept(await coreApi.progress(practice.id, next));
    });
  }
  function save() {
    if (practice && turn)
      void run(async () =>
        accept(await coreApi.answer(practice.id, turn.id, draft)),
      );
  }
  function skip() {
    if (practice && turn && !dirty && !turn.answerText)
      void run(async () => accept(await coreApi.skip(practice.id, turn.id)));
  }
  function scoreTurn() {
    if (practice && turn && !dirty && turn.answerText)
      void run(async () => setScore(await coreApi.score(practice.id, turn.id)));
  }
  return {
    practice,
    score,
    skip,
    scoreTurn,
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
