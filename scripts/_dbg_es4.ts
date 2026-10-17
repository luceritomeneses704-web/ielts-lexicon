/** 调试 niños 与 niños 的解析 */
import { spanishDictionaryMap, findLocalWord, ensureSpanishReady } from '../src/services/dictionaryService';

async function main() {
  await ensureSpanishReady();
  console.log('total es entries:', spanishDictionaryMap.size);

  for (const w of ['niños', 'ninos', 'niño', 'nino', 'ni']) {
    const hit = spanishDictionaryMap.get(w.toLowerCase());
    console.log(`map.get(${JSON.stringify(w)}) =`, hit ? JSON.stringify({ word: hit.word, trans: hit.translation.slice(0, 30), rank: hit.frequencyRank }) : 'null');
  }

  console.log('\n-- findLocalWord --');
  for (const w of ['niños', 'ninos', 'niño']) {
    const hit = findLocalWord(w, 'es');
    console.log(`  ${w} →`, hit ? `${hit.word} (${hit.translation.slice(0, 30)})` : 'null');
  }
}

main().catch(e => { console.error(e); process.exit(1); });