/** 排查 españa 未命中原因 */
import { ensureSpanishReady, searchSpanishByEnglish } from '../src/services/dictionaryService';

async function main() {
  await ensureSpanishReady();
  const all = searchSpanishByEnglish('spain', 400);
  const hit = all.find(x => x.word === 'españa');
  console.log('españa 在结果中:', !!hit, '| 结果总数', all.length);

  // 直接看 map 里的字段
  const map = (await import('../src/data/spanishLexicon')).SPANISH_LEXICON as any;
  const raw = map['españa'];
  console.log('原始数据 translation:', JSON.stringify(raw?.translation));
  console.log('原始数据 englishDefinition:', JSON.stringify(raw?.englishDefinition));
  console.log('frequencyRank:', raw?.frequencyRank);

  // 复算打分
  const gloss = (raw.translation || '').toLowerCase().trim();
  const head = gloss.replace(/\s*\([^)]*\)\s*$/, '').trim();
  console.log('gloss:', JSON.stringify(gloss.slice(0, 50)));
  console.log('head :', JSON.stringify(head));
  console.log('head === "spain":', head === 'spain');
}
main().catch(e => { console.error(e); process.exit(1); });