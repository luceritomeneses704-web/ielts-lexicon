/** 测试：不带重音输入 & 屈折形式 */
import { findLocalWord, getInstantSuggestions, esFuzzySearch, esNormalizeToClass, ensureSpanishReady } from '../src/services/dictionaryService';

async function main() {
  await ensureSpanishReady();

  console.log('== A. 不带重音输入（í → i 等）==');
  const cases: Array<[string, string]> = [
    ['dias', 'días'],
    ['dia', 'día'],
    ['habia', 'había'],
    ['estas', 'estás'],
    ['mas', 'más'],
    ['manana', 'mañana'],
    ['nino', 'niño'],
    ['corazon', 'corazón'],
    ['informacion', 'información'],
    ['tambien', 'también'],
    ['rapido', 'rápido'],
    ['numero', 'número'],
    ['cuando', 'cuándo'],
    ['donde', 'dónde'],
  ];
  for (const [typed, want] of cases) {
    const direct = findLocalWord(typed, 'es');
    const fuzzy = esFuzzySearch(typed, 6);
    const hit = direct?.word === want || fuzzy.some(f => f.word === want);
    console.log(`  ${hit ? '✓' : '✗'} ${typed} → ${want}  (direct=${direct?.word ?? '-'}, fuzzy=[${fuzzy.map(f => f.word).join(',')}])`);
  }

  console.log('\n== B. 归一化一致性 ==');
  for (const [a, b] of [['dias', 'días'], ['manana', 'mañana'], ['rapido', 'rápido']]) {
    const eq = esNormalizeToClass(a) === esNormalizeToClass(b);
    console.log(`  ${eq ? '✓' : '✗'} ${a} ≈ ${b}  (${esNormalizeToClass(a)} / ${esNormalizeToClass(b)})`);
  }

  console.log('\n== C. 屈折形式覆盖检查 ==');
  const forms = ['días', 'día', 'casas', 'casa', 'perros', 'perro', 'hablo', 'habló', 'hablar',
    'comemos', 'comer', 'niños', 'niño', 'mujeres', 'mujer', 'grandes', 'grande'];
  for (const f of forms) {
    const direct = findLocalWord(f, 'es');
    const fuzzy = esFuzzySearch(f, 3);
    const covered = !!direct || fuzzy.length > 0;
    console.log(`  ${covered ? '✓' : '✗'} ${f}  direct=${direct ? 'YES' : 'no'}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });