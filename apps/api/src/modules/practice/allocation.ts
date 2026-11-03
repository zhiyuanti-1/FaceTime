export function allocateQuestions(
  count: number,
  topics: { id: string; weight: number; available: number }[],
) {
  const valid = topics.filter((t) => t.weight > 0 && t.available > 0);
  if (!valid.length) throw new Error("请选择至少一个有题目的方向并填写权重");
  if (valid.reduce((sum, t) => sum + t.available, 0) < count)
    throw new Error("所选方向题量不足，请减少题量或增加方向");
  const total = valid.reduce((sum, t) => sum + t.weight, 0);
  const allocated = valid.map((t) => ({
    ...t,
    count: Math.min(t.available, Math.floor((count * t.weight) / total)),
    fraction: ((count * t.weight) / total) % 1,
  }));
  let remaining = count - allocated.reduce((sum, t) => sum + t.count, 0);
  const ranked = [...allocated].sort(
    (a, b) => b.fraction - a.fraction || a.id.localeCompare(b.id, "en"),
  );
  while (remaining > 0) {
    let added = false;
    for (const t of ranked) {
      if (remaining === 0) break;
      if (t.count < t.available) {
        t.count++;
        remaining--;
        added = true;
      }
    }
    if (!added) throw new Error("无法完成出题配额");
  }
  return allocated.map((t) => ({ id: t.id, count: t.count }));
}
