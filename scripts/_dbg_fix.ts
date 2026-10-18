/** 验证词性/释义补全效果 */
import { findLocalWord, ensureOxfordReady, oxfordLoadState } from '../src/services/dictionaryService';

async function main() {
  await ensureOxfordReady();
  console.log('牛津加载:', JSON.stringify(oxfordLoadState));

  const words = ['stuff', 'like', 'flat', 'landscape', 'equal', 'mist', 'core',
    'plain', 'work', 'run', 'book', 'fume', 'warmth', 'marble', 'tide'];

  console.log('\n=== 补全后的词性与释义 ===');
  for (const w of words) {
    const it = findLocalWord(w, 'en');
    if (!it) { console.log(`${w}: NOT FOUND`); continue; }
    console.log(`\n【${w}】 pos = ${it.pos}`);
    console.log(`  翻译 = ${it.translation}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });