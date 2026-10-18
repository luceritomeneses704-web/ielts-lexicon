/** 诊断 flirt 这类词的变形收录情况 */
import { findLocalWord, ensureOxfordReady } from '../src/services/dictionaryService';
import { OXFORD_LEXICON } from '../src/data/oxfordLexicon';

async function main() {
  await ensureOxfordReady();

  const forms = ['flirt', 'flirts', 'flirted', 'flirting', 'flirtation', 'flirtatious', 'flirtatiously'];

  console.log('=== 各变形查词结果 ===');
  for (const f of forms) {
    const hit = findLocalWord(f, 'en');
    const inOxford = !!OXFORD_LEXICON[f];
    console.log(
      `  ${f.padEnd(18)} oxford=${inOxford ? 'Y' : 'N'} → ${hit ? `${hit.pos} | ${(hit.translation || '').slice(0, 42)}` : '(未收录)'}`
    );
  }

  const it = findLocalWord('flirt', 'en');
  console.log('\n=== flirt 词条 ===');
  console.log('  pos:', it?.pos);
  console.log('  translation:', it?.translation);
  console.log('  derivedWords:', JSON.stringify(it?.derivedWords));

  const raw = OXFORD_LEXICON['flirt'];
  console.log('\n=== 牛津原始串 ===');
  if (raw) {
    const f = raw.split('|');
    console.log('  pos:', f[2], '| zh:', f[6], '| der:', JSON.stringify(f[7]));
  } else {
    console.log('  牛津未收录 flirt');
  }

  // 统计：牛津词库里有多少词带 der 字段
  let withDer = 0, total = 0;
  for (const [, v] of Object.entries(OXFORD_LEXICON)) {
    total++;
    const p = v.split('|');
    if (p[7] && p[7].trim()) withDer++;
  }
  console.log(`\n牛津词条总数 ${total}，带派生词字段的 ${withDer}`);
}
main().catch(e => { console.error(e); process.exit(1); });