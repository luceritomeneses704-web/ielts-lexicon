/** 不规则变化反推测试 */
import { findLocalWord, ensureOxfordReady } from '../src/services/dictionaryService';

async function main() {
  await ensureOxfordReady();
  const cases = [
    'made', 'went', 'ran', 'took', 'written', 'said', 'thought', 'bought', 'brought',
    'children', 'men', 'women', 'feet', 'teeth', 'leaves', 'mice', 'data',
    'better', 'best', 'worse', 'worst',
  ];
  for (const w of cases) {
    const it = findLocalWord(w, 'en');
    const note = it ? (it.isInflectedForm ? `[${it.inflectionNote}]` : '（独立词条）') : '(未找到)';
    console.log(`  ${w.padEnd(12)} → ${String(it?.word ?? '-').padEnd(12)} ${note}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });