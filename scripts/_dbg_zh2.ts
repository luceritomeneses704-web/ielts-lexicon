/** 抽检中文释义反查结果 */
import { findLocalWord, ensureOxfordReady, ensureSpanishReady } from '../src/services/dictionaryService';

async function main() {
  await ensureOxfordReady();
  await ensureSpanishReady();

  const words = ['casa', 'agua', 'perro', 'tiempo', 'hablar', 'comer', 'grande',
    'niño', 'mujer', 'día', 'hombre', 'ciudad', 'país', 'trabajo', 'libro',
    'amigo', 'escuela', 'coche', 'música', 'comida', 'ser', 'estar', 'tener'];

  console.log('== 中文释义反查抽检 ==');
  let withZh = 0;
  for (const w of words) {
    const it = findLocalWord(w, 'es');
    const zh = it?.chineseTranslation || '';
    if (zh) withZh++;
    console.log(
      `  ${w.padEnd(10)} | en: ${(it?.translation || '').slice(0, 26).padEnd(28)} | zh: ${zh || '(无)'}`
    );
  }
  console.log(`\n覆盖率: ${withZh}/${words.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });