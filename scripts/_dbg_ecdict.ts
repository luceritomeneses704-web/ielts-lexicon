/** 验证 ECDICT 补充词库覆盖 */
import { findLocalWord, ensureOxfordReady, ensureEcdictReady, ecdictLoadState } from '../src/services/dictionaryService';

async function main() {
  // 模拟用户流程：先牛津，未命中再补词库
  await ensureOxfordReady();

  const words = [
    'steppenwolf', 'limerence', 'petrichor', 'serendipity', 'zeitgeist',
    'defenestration', 'syzygy', 'quixotic', 'wanderlust', 'schadenfreude',
    'susurration', 'ephemeral', 'obfuscate', 'perfidious', 'lambent',
  ];

  console.log('=== 加载补充词库前 ===');
  const before: Record<string, boolean> = {};
  for (const w of words) before[w] = !!findLocalWord(w, 'en');
  console.log('  已命中:', words.filter(w => before[w]).join(', ') || '(无)');
  console.log('  未命中:', words.filter(w => !before[w]).join(', ') || '(无)');

  await ensureEcdictReady();
  console.log('\n补充词库状态:', JSON.stringify(ecdictLoadState));

  console.log('\n=== 加载后 ===');
  for (const w of words) {
    const it = findLocalWord(w, 'en');
    console.log(`  ${w.padEnd(16)} ${it ? `${it.pos.padEnd(10)} ${(it.translation || '').slice(0, 46)}` : '(仍未收录)'}`);
  }

  console.log('\n=== 抽样：其他生僻词 ===');
  for (const w of ['floccinaucinihilipilification', 'sesquipedalian', 'crepuscular', 'anhedonia', 'weltschmerz', 'hiraeth']) {
    const it = findLocalWord(w, 'en');
    console.log(`  ${w.padEnd(30)} ${it ? (it.translation || '').slice(0, 50) : '(未收录)'}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });