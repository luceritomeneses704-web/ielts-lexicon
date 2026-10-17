/**
 * smoke_spanish.ts — 西语词典集成冒烟测试
 * 用法: npx tsx scripts/smoke_spanish.ts
 */
import {
  findLocalWord,
  getInstantSuggestions,
  getAllSpanishWords,
  getAllMasterWords,
  ensureOxfordReady,
  ensureSpanishReady,
  esFuzzySearch,
  esNormalizeToClass,
} from '../src/services/dictionaryService';
import { SPANISH_LEXICON } from '../src/data/spanishLexicon';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}

async function main() {
  await ensureOxfordReady();
  await ensureSpanishReady();

  console.log('== 1. 西语词库完整性 ==');
  const keys = Object.keys(SPANISH_LEXICON);
  check('词条数 > 19000', keys.length > 19000, `actual=${keys.length}`);
  check('全部词条有英文释义', Object.values(SPANISH_LEXICON).every(e => !!e.translation));
  check('全部词条有词频', Object.values(SPANISH_LEXICON).every(e => e.frequencyRank > 0));

  console.log('== 2. 西语查词（findLocalWord lang=es）==');
  const samples: Array<[string, string]> = [
    ['casa', 'house'],
    ['agua', 'water'],
    ['perro', 'dog'],
    ['hablar', 'talk'],
    ['tiempo', 'time'],
  ];
  for (const [w, keyword] of samples) {
    const item = findLocalWord(w, 'es');
    check(
      `${w} 命中且释义含「${keyword}」`,
      !!item && item.translation.toLowerCase().includes(keyword),
      item ? `got=${item.translation}` : 'NOT FOUND'
    );
  }

  console.log('== 3. 词条字段完整性 ==');
  const casa = findLocalWord('casa', 'es');
  check('lang 标记为 es', casa?.lang === 'es', `lang=${casa?.lang}`);
  check('有词频排名', (casa?.frequencyRank ?? 0) > 0);
  check('有例句', !!casa?.example || !!findLocalWord('agua', 'es')?.example);
  check('音标留空（靠 TTS）', casa?.phonetic === '');
  check('examContextTag 标注西语来源', !!casa?.examContextTag?.includes('西语'));

  console.log('== 4. 西语联想（getInstantSuggestions lang=es）==');
  const sug = getInstantSuggestions('cas', 6, 'es');
  check('输入 cas 提示 casa', sug.some(s => s.word.toLowerCase() === 'casa'), `got=${sug.map(s => s.word).join(',')}`);
  check('联想结果均为西语词条', sug.every(s => s.lang === 'es'));

  console.log('== 5. 英语/西语词典隔离 ==');
  check('getAllSpanishWords 返回西语词', getAllSpanishWords().length > 19000);
  check('getAllMasterWords 不含西语词条', !getAllMasterWords().some(w => w.lang === 'es'));
  // 同形词：no 在两种词典下应为不同词条
  const noEs = findLocalWord('no', 'es');
  const noEn = findLocalWord('no', 'en');
  check('同形词 no 各自可查', !!noEs && !!noEn);
  check('同形词 no 语言标记正确', noEs?.lang === 'es' && (noEn?.lang || 'en') === 'en');
  check('同形词释义不同', noEs?.translation !== noEn?.translation, `es=${noEs?.translation} / en=${noEn?.translation}`);

  console.log('== 6. 英语链路未受影响 ==');
  const harness = findLocalWord('harness', 'en');
  check('英语查词 harness 正常', !!harness, harness ? harness.translation.slice(0, 20) : 'NOT FOUND');
  check('英语默认参数仍为 en', (findLocalWord('harness')?.lang || 'en') === 'en');

  console.log('== 7. 西语字母模糊匹配（b/v/h 静默）==');
  check('ablar → hablar 命中', esFuzzySearch('ablar').some(w => w.word === 'hablar'));
  check('aber → haber 命中', esFuzzySearch('aber').some(w => w.word === 'haber'));
  check('kasa → casa 命中', esFuzzySearch('kasa').some(w => w.word === 'casa'));
  check('jente → gente 命中', esFuzzySearch('jente').some(w => w.word === 'gente'));
  check('yllamar → llamar 命中（多 1 字符）', esFuzzySearch('yllamar').some(w => w.word === 'llamar'));
  check('kena → cena 不会误中（k/c+e 不同音）', !esFuzzySearch('kena').some(w => w.word === 'cena'));
  check('aber 顶层（最相关）含 haber', (esFuzzySearch('aber')[0]?.word || '').includes('haber'));

  console.log('== 8. 归一化函数正确性 ==');
  check('hablar 归一', esNormalizeToClass('hablar') === 'ABLAR');
  check('ablar 归一（h 静默）', esNormalizeToClass('ablar') === esNormalizeToClass('hablar'));
  check('baca ≈ vaca (b/v 同类)', esNormalizeToClass('baca') === esNormalizeToClass('vaca'));
  check('gente ≈ jente', esNormalizeToClass('gente') === esNormalizeToClass('jente'));
  check('casa ≈ kasa', esNormalizeToClass('casa') === esNormalizeToClass('kasa'));
  check('llamar ≈ yamar', esNormalizeToClass('llamar') === esNormalizeToClass('yamar'));
  check('重音去除', esNormalizeToClass('está') === esNormalizeToClass('esta'));

  console.log('== 9. 多例句与固定搭配字段 ==');
  const tener = findLocalWord('tener', 'es');
  check('tener 至少 3 条 examples', (tener?.examples?.length ?? 0) >= 3);
  check('tener 至少 5 条 phrases（精校）', (tener?.phrases?.length ?? 0) >= 5);
  const agua = findLocalWord('agua', 'es');
  check('agua 有 examples', (agua?.examples?.length ?? 0) > 0);
  const hacer = findLocalWord('hacer', 'es');
  check('hacer 含 hacerse 短语', !!hacer?.phrases?.some(([p]) => p.includes('hacerse')));

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
