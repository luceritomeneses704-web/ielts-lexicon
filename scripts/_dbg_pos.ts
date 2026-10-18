/** 诊断 stuff 这类词条的词性与释义问题 */
import { findLocalWord, ensureOxfordReady } from '../src/services/dictionaryService';

async function main() {
  await ensureOxfordReady();
  const words = ['stuff', 'like', 'work', 'book', 'run', 'get', 'make', 'good', 'then', 'just'];
  for (const w of words) {
    const it = findLocalWord(w, 'en');
    if (!it) { console.log(`${w}: NOT FOUND`); continue; }
    console.log(`\n=== ${w} ===`);
    console.log(`  pos: ${it.pos}`);
    console.log(`  translation: ${JSON.stringify(it.translation)}`);
    console.log(`  englishDefinition: ${JSON.stringify((it.englishDefinition || '').slice(0, 90))}`);
    console.log(`  sourceBadge: ${it.sourceBadge || '-'}`);
    console.log(`  ieltsBand: ${it.ieltsBand || '-'}`);
    console.log(`  oxfordReal: ${it.oxfordReal ? 'yes' : 'no'}`);
    console.log(`  aggregated: ${it.aggregatedDictionaries?.length ?? 0}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });