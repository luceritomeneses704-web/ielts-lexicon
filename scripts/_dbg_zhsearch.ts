/** 验证中文搜英文 */
import { searchByChinese, ensureOxfordReady, ensureSpanishReady } from '../src/services/dictionaryService';

async function main() {
  await ensureOxfordReady();
  await ensureSpanishReady();

  const queries = ['东西', '材料', '预订', '陡峭的', '雾', '核心', '工作', '跑', '相同', '温暖'];
  console.log('=== 英语词典：中文 → 英文 ===');
  for (const q of queries) {
    const r = searchByChinese(q, 'en', 6);
    console.log(`\n【${q}】`);
    r.forEach((w, i) => {
      console.log(`  ${i + 1}. ${w.word.padEnd(14)} ${w.pos.padEnd(10)} ${(w.translation || '').slice(0, 52)}`);
    });
    if (r.length === 0) console.log('  (无结果)');
  }

  console.log('\n=== 西语词典：中文 → 西语 ===');
  for (const q of ['房子', '水', '狗', '时间', '吃']) {
    const r = searchByChinese(q, 'es', 5);
    console.log(`\n【${q}】`);
    r.forEach((w, i) => console.log(`  ${i + 1}. ${w.word.padEnd(12)} ${(w.chineseTranslation || w.translation).slice(0, 40)}`));
    if (r.length === 0) console.log('  (无结果)');
  }
}
main().catch(e => { console.error(e); process.exit(1); });