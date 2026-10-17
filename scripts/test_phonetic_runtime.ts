import { findLocalWord, ensureOxfordReady, oxfordPhoneticToIpa } from '../src/services/dictionaryService';

(async () => {
  await ensureOxfordReady();
  const cases: Array<[string, string]> = [
    ['forget', 'fəˈget'],
    ['abandon', 'əˈbændən'],
    ['climate', 'ˈklaɪmɪt'],
    ['computer', 'kəmˈpjuːtə(r)'],
    ['police', 'pəˈliːs'],
    ['theatre', 'ˈθɪətə(r)'],
    ['north', 'nɔːθ'],
    ['situation', 'ˌsɪtʃʊˈeɪʃn'],
    ['third', 'θɜːd'],
    ['village', 'ˈvɪlɪdʒ'],
  ];
  let ok = 0;
  for (const [w, exp] of cases) {
    const item = findLocalWord(w);
    const realGot = oxfordPhoneticToIpa(item?.oxfordReal?.ph ?? '');
    const mark = realGot === exp ? 'OK ' : 'APPROX';
    if (realGot === exp) ok++;
    console.log(`${mark} ${w.padEnd(12)} -> /${realGot}/  expect /${exp}/  display=${JSON.stringify(item?.phonetic)}`);
  }
  // 假音标检查：真经/精选层不得再出现 /word/ 形式
  const zj = findLocalWord('stratosphere');
  console.log('zhenjing stratosphere phonetic =', JSON.stringify(zj?.phonetic));
  const offline = findLocalWord('mitigate');
  console.log('offline mitigate phonetic =', JSON.stringify(offline?.phonetic));
  console.log(`exact: ${ok}/${cases.length}`);
})().catch(e => { console.error(e); process.exit(1); });
