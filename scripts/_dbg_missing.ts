/** 诊断未收录词（steppenwolf 等）当前返回什么 */
import { findLocalWord, ensureOxfordReady, synthesizeInstantWord } from '../src/services/dictionaryService';

async function main() {
  await ensureOxfordReady();
  const words = ['steppenwolf', 'serendipity', 'quixotic', 'zeitgeist', 'wanderlust', 'petrichor', 'limerence'];
  for (const w of words) {
    const hit = findLocalWord(w, 'en');
    if (hit) {
      console.log(`${w.padEnd(14)} → 【命中】${hit.pos} | ${(hit.translation || '').slice(0, 50)}`);
    } else {
      const syn = synthesizeInstantWord(w);
      console.log(`${w.padEnd(14)} → 【未命中】合成词条: ${syn.pos} | ${(syn.translation || '').slice(0, 60)}`);
      console.log(`${''.padEnd(14)}   englishDefinition: ${(syn.englishDefinition || '').slice(0, 80)}`);
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });