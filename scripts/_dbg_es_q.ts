/** 诊断西语词条释义质量 */
import { findLocalWord, ensureSpanishReady } from '../src/services/dictionaryService';

async function main() {
  await ensureSpanishReady();
  const words = ['mingo', 'mango', 'manga', 'minga', 'casa', 'agua', 'perro', 'tiempo', 'comer'];
  for (const w of words) {
    const it = findLocalWord(w, 'es');
    if (!it) { console.log(`${w.padEnd(10)} → 未收录`); continue; }
    console.log(`${w.padEnd(10)} → word=${String(it.word).padEnd(10)} pos=${String(it.pos).padEnd(8)}`);
    console.log(`${''.padEnd(13)}translation=${JSON.stringify((it.translation || '').slice(0, 70))}`);
    console.log(`${''.padEnd(13)}chineseTranslation=${JSON.stringify((it.chineseTranslation || '').slice(0, 70))}`);
    console.log(`${''.padEnd(13)}phrases=${it.phrases?.length ?? 0} examples=${it.examples?.length ?? 0} freq=${it.frequencyRank ?? '-'}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });