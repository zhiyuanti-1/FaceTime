import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { CreatePractice, ResumeSummary, Topic } from "@face/shared";
import { coreApi } from "../../services/repositories/core-api";
import { errorMessage } from "../../services/http/client";
export function usePracticeSetup() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<"knowledge" | "interview">("knowledge");
  const [jobTitle, setJobTitle] = useState("");
  const [order, setOrder] = useState<"alternate" | "knowledge_first">(
    "alternate",
  );
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [consent, setConsent] = useState(false);
  const [preview, setPreview] =
    useState<Awaited<ReturnType<typeof coreApi.preview>>>();
  const [last, setLast] =
    useState<
      Awaited<ReturnType<typeof coreApi.dashboard>>["lastConfiguration"]
    >(null);
  const [count, setCount] = useState(5);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  useEffect(() => {
    Promise.all([
      coreApi.topics(),
      coreApi.resumes(),
      coreApi.preferences(),
      coreApi.dashboard(),
    ])
      .then(([data, library, preferences, dashboard]) => {
        setTopics(data);
        setResumes(
          library.filter(
            (item) => item.status === "ready" && !item.needsReview,
          ),
        );
        setWeights(
          Object.keys(preferences.weights).length
            ? preferences.weights
            : Object.fromEntries(data.map((topic) => [topic.id, 1])),
        );
        setJobTitle(preferences.jobTitle);
        setOrder(preferences.order);
        setResumeId(params.get("resume") ?? preferences.defaultResumeId ?? "");
        if (params.get("resume")) setMode("interview");
        setLast(dashboard.lastConfiguration);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [params]);
  const body: CreatePractice = {
    mode,
    jobTitle,
    order,
    weights,
    count: mode === "interview" ? 10 : count,
    resumeId: mode === "interview" ? resumeId || null : null,
  };
  const canCreate =
    mode === "knowledge" ||
    (jobTitle.trim() &&
      resumes.some((resume) => resume.id === resumeId) &&
      consent);
  async function loadPreview() {
    setBusy(true);
    setError("");
    try {
      setPreview(await coreApi.preview(body));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !canCreate) return;
    setBusy(true);
    setError("");
    try {
      const practice = await coreApi.createPractice(body);
      navigate(`/practice/${practice.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return {
    topics,
    weights,
    setWeights,
    mode,
    setMode,
    jobTitle,
    setJobTitle,
    order,
    setOrder,
    resumes,
    resumeId,
    setResumeId,
    consent,
    setConsent,
    preview,
    setPreview,
    last,
    count,
    setCount,
    error,
    busy,
    total,
    canCreate,
    submit,
    loadPreview,
  };
}
