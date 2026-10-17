/**
 * smoke_oxford.ts — 牛津词库整合运行时冒烟测试
 * 用法: npx tsx scripts/smoke_oxford.ts
 */
import {
  findLocalWord,
  getInstantSuggestions,
  getAllMasterWords,
  parseOxfordRaw,
  ensureOxfordReady,
  isPhraseOrSentence,
} from '../src/services/dictionaryService';
import { OXFORD_LEXICON } from '../src/data/oxfordLexicon';
import { IELTS_ZHENJING_LEXICON } from '../src/data/ieltsZhenjingLexicon';
import { generateAggregatedDictionaryData } from '../src/services/dictionaryAggregatorService';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} ${detail}`);
  }
}

async function main() {
  // 牛津词库为异步加载（首屏性能优化），测试前先等待就绪
  await ensureOxfordReady();

console.log('== 1. 数据文件基本完整性 ==');
check('OXFORD_LEXICON 条目数 > 38000', Object.keys(OXFORD_LEXICON).length > 38000, `actual=${Object.keys(OXFORD_LEXICON).length}`);
check('IELTS_ZHENJING_LEXICON 条目数 > 3000', Object.keys(IELTS_ZHENJING_LEXICON).length > 3000, `actual=${Object.keys(IELTS_ZHENJING_LEXICON).length}`);

console.log('== 2. parseOxfordRaw 解析 ==');
const raw = OXFORD_LEXICON['abandon'];
const entry = parseOxfordRaw(raw);
check('abandon 词条可解析', !!entry);
check('音标非空', !!entry?.ph, `ph=${entry?.ph}`);
check('词性为 v. & n.（动名兼类合并）', entry?.pos === 'v. & n.', `pos=${entry?.pos}`);
check('中文释义含「遗弃」', !!entry?.zh.includes('遗弃'), `zh=${entry?.zh}`);
check('例句解析出英文', (entry?.ex.length ?? 0) > 0 && !!entry?.ex[0][0].includes('abandoned'));
check('派生词含 abandoned/abandonment', !!entry?.der.includes('abandoned') && !!entry?.der.includes('abandonment'), `der=${entry?.der}`);

console.log('== 3. findLocalWord 查词（Tier 1 本地命中）==');
// 牛津独有词（精选与真经词库未覆盖）应命中牛津真实词条
for (const w of ['abaft', 'byway', 'scrambler', 'desultorily', 'a gentleman\'s agreement']) {
  const item = findLocalWord(w);
  check(`查词 ${w} 命中牛津真实词条`, !!item?.oxfordReal, item ? `word=${item.word}` : 'NOT FOUND');
}
// pollen 同时被真经词库收录（优先级高于牛津），验证可查询即可
const pollen = findLocalWord('pollen');
check('查词 pollen 可查询（真经/牛津任一来源）', !!pollen, pollen ? `word=${pollen.word}` : 'NOT FOUND');
// 精选词库优先级：curated 词不能被牛津覆盖
const curated = findLocalWord('environment');
check('精选词库词 environment 不被牛津覆盖', !!curated && !curated.oxfordReal, curated ? `source=${curated.sourceBadge}` : 'NOT FOUND');

console.log('== 4. 词条字段完整性（生词本/闪卡链路依赖）==');
const baby = findLocalWord('byway');
check('translation 非空', !!baby?.translation);
check('englishDefinition 非空', !!baby?.englishDefinition);
check('phonetic 格式 /.../', !!baby?.phonetic.startsWith('/') && baby.phonetic.endsWith('/'), `ph=${baby?.phonetic}`);
check('ieltsBand 合法', ['Band 6.0','Band 6.5','Band 7.0','Band 7.5','Band 8.0+','基础核心词'].includes(baby?.ieltsBand ?? ''), `band=${baby?.ieltsBand}`);
check('topic 合法', ['环境生态','科技媒体','学术教育','社会文化','经济工作','政府法律','心理生活'].includes(baby?.topic ?? ''), `topic=${baby?.topic}`);
check('sourceBadge 标注牛津来源', !!baby?.sourceBadge?.includes('牛津'));
check('aggregatedDictionaries 惰性生成 5 卡片', (baby?.aggregatedDictionaries?.length ?? 0) === 5);

console.log('== 5. 聚合服务真实化 ==');
const agg = baby?.aggregatedDictionaries ?? [];
const oxfordCard = agg.find(e => e.shortName === '牛津');
check('牛津卡片使用真实义项', !!oxfordCard?.definition.includes('by-road'), `def=${oxfordCard?.definition?.slice(0, 60)}`);
check('牛津卡片标注 OALD 真实数据', oxfordCard?.levelTag === 'OALD 真实词条数据');

console.log('== 6. suggest 自动补全纳入牛津词头 ==');
const sug = getInstantSuggestions('abando');
check('输入 abando 提示 abandon', sug.some(s => s.word.toLowerCase() === 'abandon'), `got=${sug.map(s => s.word).join(',')}`);
const sug2 = getInstantSuggestions('abaf');
check('输入 abaf 提示 abaft（纯牛津词）', sug2.some(s => s.word.toLowerCase() === 'abaft'), `got=${sug2.map(s => s.word).join(',')}`);
const sug3 = getInstantSuggestions('xyzzy');
check('无匹配时返回空数组', sug3.length === 0);

console.log('== 7. getAllMasterWords 排除牛津（保护浏览器性能）==');
const master = getAllMasterWords();
check('master 列表不含牛津词条', !master.some(w => w.oxfordReal));
check('master 列表仍含精选词库', master.some(w => w.word.toLowerCase() === 'environment'));

console.log('== 8. 派生词跳转目标可查 ==');
const abandoned = findLocalWord('abandoned');
check('派生词 abandoned 可独立查词', !!abandoned);

console.log('== 9. 词组/句子检测与真经词库 ==');
check('"make a difference" 判定为词组', isPhraseOrSentence('make a difference'));
check('长句判定为句子', isPhraseOrSentence('The government should invest more money'));
check('单个单词不判定为词组', !isPhraseOrSentence('abandon'));
const zj = findLocalWord('stratosphere');
check('真经词条可查（stratosphere）', !!zj);
const zjClimate = findLocalWord('climate');
check('真经词条可查（climate）', !!zjClimate);

} // end main

main().then(() => {
  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail > 0 ? 1 : 0);
});
