/** 验证西语短语查询（纯客户端） */
import { findSpanishPhrase, findLocalWord, ensureSpanishReady } from '../src/services/dictionaryService';

async function main() {
  await ensureSpanishReady();

  console.log('== findSpanishPhrase ==');
  const cases = ['tener hambre', 'tener miedo', 'hacer falta', 'hacer caso',
    'estar de acuerdo', 'dar igual', 'ponerse las pilas', 'no existe esto'];
  for (const c of cases) {
    const hit = findSpanishPhrase(c);
    console.log(`  ${hit ? '✓' : '✗'} ${c.padEnd(22)} → ${hit ? hit.chineseTranslation || hit.translation : 'NOT FOUND'}`);
  }

  console.log('\n== findLocalWord 走短语链路 ==');
  for (const c of ['tener hambre', 'hacer falta']) {
    const hit = findLocalWord(c, 'es');
    console.log(`  ${hit ? '✓' : '✗'} ${c.padEnd(16)} → ${hit?.word} | ${hit?.chineseTranslation || hit?.translation}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });