/** 诊断 mingo / Domingo 这类词 */
import { findLocalWord, ensureSpanishReady, esFuzzySearch, resolveSpanishInflection } from '../src/services/dictionaryService';
import { SPANISH_LEXICON } from '../src/data/spanishLexicon';

async function main() {
  await ensureSpanishReady();

  for (const w of ['mingo', 'Mingo', 'Domingo', 'domingo', 'lunes', 'sábado']) {
    const it = findLocalWord(w, 'es');
    const key = w.toLowerCase();
    const raw = (SPANISH_LEXICON as any)[key];
    console.log(`\n=== 查询 "${w}" ===`);
    console.log('  词库直接命中:', raw ? `pos=${raw.pos} freq=${raw.frequencyRank}` : '否');
    if (raw) {
      console.log('    translation:', JSON.stringify(raw.translation));
      console.log('    englishDefinition:', JSON.stringify(raw.englishDefinition));
      console.log('    chineseTranslation:', JSON.stringify(raw.chineseTranslation));
    }
    console.log('  findLocalWord →', it ? `${it.word} | ${it.pos} | ${it.chineseTranslation || it.translation}` : 'null');
    console.log('  esFuzzySearch →', esFuzzySearch(w, 4).map(x => x.word).join(', ') || '(空)');
  }
}
main().catch(e => { console.error(e); process.exit(1); });