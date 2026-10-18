/** 检查各词库对同一词条的数据完整度 */
import { OXFORD_LEXICON } from '../src/data/oxfordLexicon';
import { IELTS_ZHENJING_LEXICON } from '../src/data/ieltsZhenjingLexicon';
import { CAMBRIDGE_IELTS_REAL_EXAM_BANK } from '../src/data/cambridgeIeltsExamBank';

function show(name: string, e: any) {
  if (!e) { console.log(`  ${name}: —`); return; }
  console.log(`  ${name}: pos=${JSON.stringify(e.pos)} | zh=${JSON.stringify((e.zh || e.translation || '').slice(0, 60))}`);
  if (e.senses) console.log(`    senses(${e.senses.length}): ${String(e.senses).slice(0, 200)}`);
}

async function main() {
  const words = ['stuff', 'like', 'work', 'run', 'book'];
  console.log('=== 各数据源对 stuff 等词的覆盖度 ===');
  for (const w of words) {
    console.log(`\n【${w}】`);
    show('oxford', (OXFORD_LEXICON as any)[w]);
    show('zhenjing', (IELTS_ZHENJING_LEXICON as any)[w]);
    show('cambridge', (CAMBRIDGE_IELTS_REAL_EXAM_BANK as any)[w]);
  }
  console.log('\noxford 词条总数:', Object.keys(OXFORD_LEXICON).length);
  console.log('zhenjing 词条总数:', Object.keys(IELTS_ZHENJING_LEXICON).length);
  console.log('cambridge 词条总数:', Object.keys(CAMBRIDGE_IELTS_REAL_EXAM_BANK).length);
}
main().catch(e => { console.error(e); process.exit(1); });