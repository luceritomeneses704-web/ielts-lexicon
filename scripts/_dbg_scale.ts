/** 量化词性与释义残缺的规模 */
import { OXFORD_LEXICON } from '../src/data/oxfordLexicon';
import { IELTS_ZHENJING_LEXICON } from '../src/data/ieltsZhenjingLexicon';

/** 从牛津原始串解析 pos 与 zh */
function parseRaw(raw: string) {
  const f = raw.split('|');
  return { display: f[0], ph: f[1], pos: f[2] || '', senses: f[3] || '', en: f[5] || '', zh: f[6] || '' };
}

const POS_SET = ['n', 'v', 'adj', 'adv', 'prep', 'conj', 'pron', 'art', 'num', 'interj', 'aux', 'det'];

function posCount(pos: string): number {
  const s = (pos || '').toLowerCase();
  let c = 0;
  for (const p of ['adj', 'adv', 'prep', 'conj', 'pron', 'interj', 'aux', 'det', 'art', 'num', 'n', 'v']) {
    const re = p === 'n' ? /(^|[^a-z])n\./ : p === 'v' ? /(^|[^a-z])v\./ : new RegExp(p.replace('.', '\\.') + '\\.');
    if (re.test(s)) c++;
  }
  return c;
}

async function main() {
  const ox = OXFORD_LEXICON as Record<string, string>;
  console.log('牛津词条:', Object.keys(ox).length);

  // 只看雅思真经词库里、且牛津也有收录的词
  let total = 0, posWorse = 0, shortZh = 0, worst: Array<{ w: string; zjPos: string; oxPos: string; zjZh: string; oxZh: string }> = [];

  for (const [w, lex] of Object.entries(IELTS_ZHENJING_LEXICON as any) as Array<[string, any]>) {
    const raw = ox[w.toLowerCase()];
    if (!raw) continue;
    const o = parseRaw(raw);
    if (!o.pos) continue;
    total++;
    const zjP = posCount(lex.pos);
    const oxP = posCount(o.pos);
    if (oxP > zjP) {
      posWorse++;
      if (worst.length < 25) {
        worst.push({ w, zjPos: lex.pos, oxPos: o.pos, zjZh: lex.translation, oxZh: o.zh });
      }
    }
    // 中文释义过短（< 12 字符）视为可能残缺
    if ((lex.translation || '').replace(/[a-zA-Z.\s&]/g, '').length < 6) shortZh++;
  }

  console.log(`\n真经 ∩ 牛津 词条数: ${total}`);
  console.log(`词性比牛津少: ${posWorse}  (${(posWorse / total * 100).toFixed(1)}%)`);
  console.log(`中文释义疑似过短: ${shortZh}`);

  console.log('\n=== 样例（真经 → 牛津）===');
  for (const x of worst) {
    console.log(`  ${x.w.padEnd(12)} ${String(x.zjPos).padEnd(8)}→ ${String(x.oxPos).padEnd(22)} | ${String(x.zjZh).slice(0, 24).padEnd(26)} → ${String(x.oxZh).slice(0, 34)}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });