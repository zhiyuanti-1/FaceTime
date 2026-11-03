#!/usr/bin/env node
/**
 * 题库校验 + index.json 生成
 * 用法：node scripts/validate-bank.mjs            （校验 + 写 index）
 *      node scripts/validate-bank.mjs --check    （只校验，CI 用，不写文件）
 *
 * 规则见 product/需求.md §3
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BANK_DIR = join(ROOT, 'packages', 'content', 'bank');
const CHECK_ONLY = process.argv.includes('--check');

const LIMITS = {
  textMax: 120,        // 题干字数
  qMarksMax: 2,        // 问号数量上限
  pointsMin: 3,
  pointsMax: 6,
  pointMax: 60,        // 单条要点字数
  perTopic: 20,        // 种子阶段每池目标题量
};

const errors = [];
const warns = [];

const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);
const stripPunct = (s) => s.replace(/[\s，。？！、；：""''（）()【】\[\]!?.,;:]/g, '');

function main() {
  if (!existsSync(BANK_DIR)) {
    console.error(`✗ 题库目录不存在: ${BANK_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(BANK_DIR).filter((f) => f.endsWith('.json') && f !== 'index.json');
  if (files.length === 0) {
    console.error('✗ 未找到任何题库文件');
    process.exit(1);
  }

  const allIds = new Map();    // id -> file
  const allText = new Map();   // normalized text -> id
  const topics = [];

  for (const file of files.sort()) {
    const raw = JSON.parse(readFileSync(join(BANK_DIR, file), 'utf8'));
    const where = `[${file}]`;

    if (!raw.topicId) errors.push(`${where} 缺少 topicId`);
    if (!raw.stage || !['seed', 'curated'].includes(raw.stage)) {
      errors.push(`${where} stage 必须为 seed 或 curated`);
    }
    if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
      errors.push(`${where} questions 为空`);
      continue;
    }

    const diff = { 1: 0, 2: 0, 3: 0 };
    const localText = new Set();
    let usable = 0;

    raw.questions.forEach((q, i) => {
      const at = `${where} 第 ${i + 1} 题(${q.id || '无id'})`;

      if (!q.id) return errors.push(`${at} 缺少 id`);
      if (!/^q_[a-z]+_\d{4}$/.test(q.id)) errors.push(`${at} id 格式应为 q_<topic>_<4位序号>`);
      if (allIds.has(q.id)) errors.push(`${at} id 重复，已存在于 ${allIds.get(q.id)}`);
      allIds.set(q.id, file);

      if (!q.text || typeof q.text !== 'string') return errors.push(`${at} 缺少 text`);
      const len = stripPunct(q.text).length;
      if (len > LIMITS.textMax) errors.push(`${at} 题干 ${len} 字，超过 ${LIMITS.textMax}`);
      const qm = (q.text.match(/[？?]/g) || []).length;
      if (qm === 0) warns.push(`${at} 题干没有问号`);
      if (qm > LIMITS.qMarksMax) errors.push(`${at} 问号 ${qm} 个，超过上限 ${LIMITS.qMarksMax}`);

      if (![1, 2, 3].includes(q.difficulty)) errors.push(`${at} difficulty 必须为 1/2/3`);
      else diff[q.difficulty] += 1;

      if (!['oral', 'oral_scenario'].includes(q.mode)) errors.push(`${at} mode 非法`);

      if (!Array.isArray(q.expectedPoints)) return errors.push(`${at} 缺少 expectedPoints`);
      if (q.expectedPoints.length < LIMITS.pointsMin || q.expectedPoints.length > LIMITS.pointsMax) {
        errors.push(`${at} 要点 ${q.expectedPoints.length} 条，应为 ${LIMITS.pointsMin}-${LIMITS.pointsMax}`);
      }
      q.expectedPoints.forEach((p) => {
        const pl = String(p).length;
        if (pl > LIMITS.pointMax) errors.push(`${at} 要点超过 ${LIMITS.pointMax} 字：${String(p).slice(0, 20)}…`);
      });

      if (!Array.isArray(q.tags) || q.tags.length === 0) warns.push(`${at} 缺少 tags`);
      if (!Number.isFinite(q.timeLimitSec)) errors.push(`${at} 缺少 timeLimitSec`);

      // 池内重复：归一化后完全一致
      const nt = stripPunct(q.text);
      if (localText.has(nt)) errors.push(`${at} 池内题干重复`);
      localText.add(nt);

      // 跨池近似：归一化后包含关系
      for (const [otherText, otherId] of allText) {
        if (otherText === nt) continue;
        if (otherText.length > 10 && nt.length > 10 && (otherText.includes(nt) || nt.includes(otherText))) {
          warns.push(`${at} 与 ${otherId} 题干高度相似`);
        }
      }
      allText.set(nt, q.id);

      // 可用性：curated 必须 verified；seed 允许未校验
      const usableFlag = raw.stage === 'curated' ? q.verified === true : true;
      if (usableFlag) usable += 1;
      if (raw.stage === 'seed' && q.verified === true) {
        warns.push(`${at} seed 池内标了 verified=true，确认是否真的人工校验过`);
      }
    });

    if (raw.questions.length !== LIMITS.perTopic) {
      warns.push(`${where} 题量 ${raw.questions.length}，种子阶段目标 ${LIMITS.perTopic}`);
    }
    // 难度分布只对 curated 池做硬性要求；seed 阶段只展示不告警（质量先不考虑）
    if (raw.stage === 'curated') {
      const dist = diff[2] / raw.questions.length;
      if (dist < 0.4 || dist > 0.6) {
        warns.push(`${where} 中等难度占比 ${(dist * 100).toFixed(0)}%，curated 池建议 40%-60%`);
      }
    }

    topics.push({
      topicId: raw.topicId,
      name: raw.name || raw.topicId,
      stage: raw.stage,
      file,
      total: raw.questions.length,
      usable,
      difficulty: diff,
      hash: hash(readFileSync(join(BANK_DIR, file), 'utf8')),
    });
  }

  report(topics);

  if (errors.length) {
    console.error(`\n✗ 校验失败：${errors.length} 个错误\n`);
    errors.forEach((e) => console.error('  - ' + e));
    process.exit(1);
  }

  if (!CHECK_ONLY) {
    const index = {
      generatedAt: new Date().toISOString(),
      bankVersion: '1.0.0-seed',
      topics,
      totals: {
        topics: topics.length,
        questions: topics.reduce((a, t) => a + t.total, 0),
        usable: topics.reduce((a, t) => a + t.usable, 0),
      },
      note: 'stage=seed 表示占位题库，可被真题库整体替换；替换时只改本目录与 stage 字段，代码无需改动。',
    };
    writeFileSync(join(BANK_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');
    console.log('\n✓ 已写入 packages/content/bank/index.json');
  }

  if (warns.length) {
    console.log(`\n⚠ 告警 ${warns.length} 条（不阻塞）`);
    warns.slice(0, 20).forEach((w) => console.log('  - ' + w));
    if (warns.length > 20) console.log(`  … 另有 ${warns.length - 20} 条`);
  }
  console.log('\n✓ 校验通过');
}

function report(topics) {
  const pad = (s, n) => String(s).padEnd(n, ' ');
  console.log('\n' + pad('topic', 14) + pad('题量', 6) + pad('可用', 6) + pad('易/中/难', 12) + 'stage');
  console.log('-'.repeat(52));
  for (const t of topics) {
    console.log(
      pad(t.topicId, 14) + pad(t.total, 6) + pad(t.usable, 6) +
      pad(`${t.difficulty[1]}/${t.difficulty[2]}/${t.difficulty[3]}`, 12) + t.stage
    );
  }
  console.log('-'.repeat(52));
  console.log(
    pad('TOTAL', 14) +
    pad(topics.reduce((a, t) => a + t.total, 0), 6) +
    pad(topics.reduce((a, t) => a + t.usable, 0), 6)
  );
}

main();
