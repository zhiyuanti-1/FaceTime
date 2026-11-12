import type { ResumeFields } from "@face/shared";

const workHeading =
  /^(?:实习\s*[/／和与、]\s*工作经历|工作\s*[/／和与、]\s*实习经历|实习经历|工作经历|工作经验|实习经验)$/u;
const otherHeading =
  /^(?:教育经历|教育背景|学习经历|项目经历|项目经验|个人项目|校园经历|校园经验|在校经历|专业技能|技能|技能特长|个人技能|自我评价|个人评价|个人总结|求职意向|基本信息|个人信息|语言能力|兴趣爱好|爱好|其他|荣誉奖项|获奖经历|证书)$/u;
const subtitle =
  /^(\s*(?:[-*•·]\s*)?)(职责|工作职责|工作内容|主要工作内容|主要工作|项目成果|工作成果|成果|工作业绩|业绩)(?:\s*[:：]\s*|\s*$)/u;
const date = /(?:19|20)\d{2}\s*(?:[年./-]\s*\d{1,2})?/u;
const company = /[^\s|｜,，:：;；。]+(?:公司|集团|研究院|研究所|事务所)/u;

type SourceLine = Readonly<{
  text: string;
  ending: string;
  start: number;
  end: number;
}>;
type WorkBlock = Readonly<{
  company: string;
  start: number;
  end: number;
  body: readonly string[];
}>;
export type PreparedWorkText = Readonly<{
  text: string;
  blocks: readonly WorkBlock[];
  removedHeadings: number;
}>;

function heading(text: string): string {
  return text
    .trim()
    .replace(/^#{1,6}\s*/u, "")
    .replace(/\s*[:：]\s*$/u, "");
}

function normalize(text: string): string {
  return text.replace(/\s+/gu, "");
}

function content(text: string): string {
  return text.replace(/^\s*(?:[-*•·]|\d+[.、)）])\s*/u, "").trim();
}

/** 只处理有明确工作标题、公司及日期线索的区域；原文位置用于核对，不进入日志。 */
export function prepareWorkText(rawText: string): PreparedWorkText {
  const lines: SourceLine[] = [];
  for (const match of rawText.matchAll(/([^\r\n]*)(\r\n|\n|\r|$)/gu)) {
    if (!match[0]) continue;
    lines.push({
      text: match[1] ?? "",
      ending: match[2] ?? "",
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  const output = lines.map((line) => line.text + line.ending);
  const blocks: WorkBlock[] = [];
  let inWork = false;
  let current:
    | {
        company: string;
        start: number;
        body: { text: string; start: number }[];
      }
    | undefined;
  let inBody = false;
  let removedHeadings = 0;
  const close = (end: number) => {
    if (current)
      blocks.push({
        ...current,
        end,
        body: current.body
          .filter((part) => part.start < end)
          .map((part) => part.text),
      });
    current = undefined;
    inBody = false;
  };
  for (const [index, line] of lines.entries()) {
    const title = heading(line.text);
    if (
      workHeading.test(title) ||
      otherHeading.test(title) ||
      (/^[\p{L}\s]{2,16}(?:经历|经验|评价|技能|信息|能力|奖项|证书)$/u.test(
        title,
      ) &&
        !subtitle.test(line.text))
    ) {
      close(line.start);
      inWork = workHeading.test(title);
      continue;
    }
    if (!inWork) continue;
    const label = subtitle.exec(line.text);
    const employer = company.exec(line.text);
    // 正文中提到公司不能成为新条目；日期允许在公司相邻的单独行。
    const nearbyDate = lines
      .slice(Math.max(0, index - 1), index + 3)
      .some((item) => date.test(item.text));
    if (
      !label &&
      employer &&
      line.text.length < 160 &&
      !/[。；;]|^\s*(?:[-*•·]|\d+[、)）])/u.test(line.text)
    ) {
      const previous = lines[index - 1];
      const start =
        previous &&
        date.test(previous.text) &&
        /^[\d\s年月日./~—–－至今-]+$/u.test(previous.text)
          ? previous.start
          : line.start;
      close(start);
      if (nearbyDate) current = { company: employer[0], start, body: [] };
      continue;
    }
    if (!current) continue;
    if (label) {
      const rest = line.text.slice(label[0].length);
      output[index] = label[1] + rest + line.ending;
      removedHeadings++;
      inBody = true;
      if (content(rest))
        current.body.push({ text: content(rest), start: line.start });
    } else if (inBody && content(line.text)) {
      current.body.push({ text: content(line.text), start: line.start });
    }
  }
  close(rawText.length);
  return { text: output.join(""), blocks, removedHeadings };
}

/** 只作确定性摘录检查；不使用相似度猜测，不自动补写。 */
export function missingWorkContent(
  prepared: PreparedWorkText,
  fields: ResumeFields,
): number {
  let missing = 0;
  for (const block of prepared.blocks) {
    const sameSource = prepared.blocks.filter(
      (item) => normalize(item.company) === normalize(block.company),
    );
    if (sameSource.length !== 1 || block.body.length === 0) continue;
    const jobs = fields["实习/工作经历"].filter(
      (job) =>
        job.公司名 !== null &&
        normalize(job.公司名) === normalize(block.company),
    );
    if (jobs.length > 1) continue;
    const covered = normalize(
      jobs[0]?.主要工作内容.map(content).join("") ?? "",
    );
    let cursor = 0;
    for (const part of block.body) {
      const text = normalize(part);
      const index = covered.indexOf(text, cursor);
      if (index < 0) missing++;
      else cursor = index + text.length;
    }
  }
  return missing;
}
