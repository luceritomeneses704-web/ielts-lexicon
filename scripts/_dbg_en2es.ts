/** 测试英文 → 西语 跨词典检索 */
import { findLocalWord, ensureSpanishReady, searchSpanishByEnglish, searchByChinese } from '../src/services/dictionaryService';

async function main() {
  await ensureSpanishReady();

  const queries = ['house', 'to eat', 'dog', 'water', 'book', 'time', 'monday',
                   'red', 'mother', 'spain', 'sleeve', 'to park', 'car'];

  console.log('=== 英文 → 西语 ===');
  for (const q of queries) {
    const r = searchSpanishByEnglish(q, 3);
    console.log(`\n【${q}】`);
    r.forEach((w, i) => {
      console.log(`  ${i + 1}. ${String(w.word).padEnd(12)} ${String(w.pos).padEnd(6)} ${(w.chineseTranslation || w.translation).slice(0, 30)}`);
    });
    if (r.length === 0) console.log('  (无结果)');
  }

  console.log('\n=== findLocalWord 链路（西语词典页输入英文）===');
  for (const q of ['house', 'to eat', 'dog', 'monday']) {
    const it = findLocalWord(q, 'es');
    console.log(`  ${q.padEnd(10)} → ${it ? `${it.word} [${it.inflectionNote || '-'}] ${(it.chineseTranslation || '').slice(0, 20)}` : 'null'}`);
  }

  console.log('\n=== 中文 → 西语（链路另一环）===');
  for (const q of ['房子', '水', '狗', '吃']) {
    const r = searchByChinese(q, 'es', 3);
    console.log(`  ${q} → ${r.map(x => x.word).join(', ') || '(无)'}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });