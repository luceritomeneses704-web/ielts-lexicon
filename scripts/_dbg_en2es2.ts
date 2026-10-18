/** 调试英→西打分 */
import { ensureSpanishReady, searchSpanishByEnglish } from '../src/services/dictionaryService';

async function main() {
  await ensureSpanishReady();
  for (const q of ['spain', 'red', 'car']) {
    console.log(`\n=== ${q} ===`);
    const r = searchSpanishByEnglish(q, 8);
    r.forEach((w, i) => console.log(`  ${i + 1}. ${String(w.word).padEnd(12)} rank=${String(w.frequencyRank).padEnd(7)} EN=${String(w.translation).slice(0, 46)}`));
  }
}
main().catch(e => { console.error(e); process.exit(1); });