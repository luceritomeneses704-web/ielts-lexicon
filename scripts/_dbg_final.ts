/** 最终统计：补全了多少词条 */
import { findLocalWord, ensureOxfordReady, oxfordLoadState, searchByChinese } from '../src/services/dictionaryService';

async function main() {
  await ensureOxfordReady();
  console.log('牛津加载统计:', JSON.stringify(oxfordLoadState, null, 0));

  console.log('\n=== 典型高频词最终结果 ===');
  for (const w of ['stuff', 'like', 'work', 'book', 'run', 'flat', 'thing', 'time', 'people']) {
    const it = findLocalWord(w, 'en');
    if (!it) continue;
    console.log(`\n${w}  [${it.pos}]`);
    console.log(`  ${it.translation.slice(0, 110)}`);
  }

  console.log('\n=== 中文检索抽样 ===');
  for (const q of ['东西', '故意的', '推迟', '影响']) {
    const r = searchByChinese(q, 'en', 3);
    console.log(`  ${q} → ${r.map(x => x.word).join(', ') || '(无)'}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });