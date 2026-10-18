/** 英语变形解析综合测试 */
import { findLocalWord, ensureOxfordReady, generateEnglishForms } from '../src/services/dictionaryService';

async function main() {
  await ensureOxfordReady();

  const cases: Array<[string, string]> = [
    ['flirt', '原形'],
    ['flirts', '三单'],
    ['flirting', '现在分词'],
    ['flirted', '过去式'],
    ['make', '原形'],
    ['making', '去e加ing'],
    ['liked', '加d'],
    ['stop', '原形'],
    ['stopping', '双写'],
    ['studied', 'y变i'],
    ['studying', 'study+ing'],
    ['die', '原形'],
    ['dying', 'ie变y'],
    ['run', '原形'],
    ['running', '双写n'],
    ['big', '原形'],
    ['bigger', '比较级'],
    ['biggest', '最高级'],
    ['happy', '原形'],
    ['happier', 'y变i比较级'],
    ['box', '原形'],
    ['boxes', 'es复数'],
    ['study', '原形'],
    ['studies', 'ies三单'],
    ['beautiful', '原形'],
    ['beautifully', '副词'],
    ['flirtatious', '原形'],
    ['flirtatiously', '副词'],
  ];

  console.log('=== 变形 → 原形 ===');
  for (const [w, desc] of cases) {
    const it = findLocalWord(w, 'en');
    const mark = it?.isInflectedForm ? '✔' : ' ';
    console.log(
      `  ${mark} ${w.padEnd(16)} ${it ? `${String(it.word).padEnd(14)} ${it.pos.padEnd(10)} ${it.isInflectedForm ? it.inflectionNote : '（原形）'}` : '(未找到)'}   [${desc}]`
    );
  }

  console.log('\n=== 正向生成：flirt 的全部变形 ===');
  const f = findLocalWord('flirt', 'en');
  console.log(' ', generateEnglishForms('flirt', f?.pos || 'v.').join(' · '));
  console.log('\n=== 正向生成：其他词 ===');
  for (const [w, pos] of [['study', 'v. & n.'], ['big', 'adj.'], ['box', 'n. & v.'], ['make', 'v. & n.']] as Array<[string, string]>) {
    console.log(`  ${w.padEnd(8)} → ${generateEnglishForms(w, pos).join(' · ')}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });