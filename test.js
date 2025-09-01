// pro/demo1.js - 最小化实现：仅使用本地 WordsSearch（无拼音/简繁）
import WordsSearch from './WordsSearch.js';

// 敏感词（后续可从数据库读取）
const sensitiveEntries = [
  { id: '1', sensitiveWord: '敏感', reply: '请注意文明用语' },
  { id: '2', sensitiveWord: '违规', reply: '请遵守平台规则' },
  { id: '3', sensitiveWord: '不当言论', reply: '请注意措辞' },
];

// 构建搜索器（一次性）
const search = new WordsSearch();
search.SetKeywords(sensitiveEntries.map(e => e.sensitiveWord));

function checkFirstHit(text) {
  const first = search.FindFirst(text);
  if (!first) return { matched: false, originalText: text };

  const entry = sensitiveEntries.find(e => e.sensitiveWord === first.Keyword);
  const start = first.Start;
  const endInclusive = first.End;
  return {
    matched: true,
    originalText: text,
    id: entry?.id,
    sensitiveWord: first.Keyword,
    reply: entry?.reply,
    position: { start, end: endInclusive }, // 闭区间
    matchedText: text.substring(start, endInclusive + 1)
  };
}

// 流式检测（最小化）：命中即停
class StreamDetector {
  constructor(entries) {
    this.entries = entries;
    this.search = search; // 共享搜索器
    this.buffer = '';
    this.matched = false;
    this.result = null;
    this.maxLen = Math.max(...entries.map(e => e.sensitiveWord.length));
  }
  push(chunk) {
    if (this.matched) return this.result;
    const prevLen = this.buffer.length;
    this.buffer += chunk;
    const startScan = Math.max(0, prevLen - (this.maxLen - 1));
    const slice = this.buffer.substring(startScan);
    const first = this.search.FindFirst(slice);
    if (!first) return null;

    const startAbs = startScan + first.Start;
    const endAbs = startScan + first.End;
    const entry = this.entries.find(e => e.sensitiveWord === first.Keyword);
    const res = {
      matched: true,
      originalText: this.buffer,
      id: entry?.id,
      sensitiveWord: first.Keyword,
      reply: entry?.reply,
      position: { start: startAbs, end: endAbs },
      matchedText: this.buffer.substring(startAbs, endAbs + 1)
    };
    this.matched = true;
    this.result = res;
    return res;
  }
}

// 演示 - 一次性检测
const samples = [
  '这是一段正常的文本',
  '这里包含敏感信息',
  '这里有不当言论和违规',
];
console.log('=== pro/demo1 一次性检测（FindFirst） ===\n');
for (const [i, s] of samples.entries()) {
  console.log(`样例 ${i + 1}:`, checkFirstHit(s));
}
console.log('');

// 演示 - 流式检测
console.log('=== pro/demo1 流式检测（FindFirst，首命中即停） ===\n');
const detector = new StreamDetector(sensitiveEntries);
const chunks = ['这里包', '含敏', '感与其他'];
for (let i = 0; i < chunks.length; i++) {
  const ck = chunks[i];
  const r = detector.push(ck);
  console.log(`chunk${i + 1}:`, JSON.stringify(ck));
  if (r) { console.log('命中:', r); break; } else { console.log('未命中'); }
}