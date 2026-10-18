/** 检查 minga 这类误匹配 */
import { findLocalWord, ensureSpanishReady, resolveSpanishInflection, esFuzzySearch } from '../src/services/dictionaryService';
import { SPANISH_LEXICON } from '../src/data/spanishLexicon';

async function main() {
  await ensureSpanishReady();

  for (const w of ['minga', 'mingo', 'mingar', 'mango']) {
    console.log(`\n=== ${w} ===`);
    console.log('  在词库中:', !!(SPANISH_LEXICON as any)[w]);
    const infl = resolveSpanishInflection(w);
    console.log('  resolveSpanishInflection →', infl ? `${infl.word} (${infl.inflectionNote || '-'})` : 'null');
    const fz = esFuzzySearch(w, 3);
    console.log('  esFuzzySearch →', fz.map(x => x.word).join(', ') || '(空)');
    const hit = findLocalWord(w, 'es');
    console.log('  findLocalWord →', hit ? `${hit.word} | ${hit.chineseTranslation || hit.translation}` : 'null');
  }
}
main().catch(e => { console.error(e); process.exit(1); });