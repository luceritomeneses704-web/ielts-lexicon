#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解析 spanish_data-master.zip 生成 src/data/spanishLexicon.ts

数据源（Wiktionary + Tatoeba，CC-BY-SA）：
- es-en.data     : 西英词典词条（词头 / pos / gloss 英文释义 / syn / g 性别）
- frequency.csv  : 25016 个高频 lemma（count 降序）——取前 N 个作为收录范围
- sentences.tsv  : 160945 英西句对，末列为 lemma 标注（:pos,wordform|lemma）——用于配例句

输出词条字段（对齐 App WordItem 体系）：
  word / pos / translation(英文主释义) / englishDefinition(次释义)
  frequencyRank / example(西语句) / exampleTranslation(英文)
"""
import zipfile
import csv
import json
import re
from pathlib import Path

from es_zh_map import get_zh

ZIP = Path(r'D:\spanish_data-master.zip')
OUT = Path(r'D:\ielts-lexicon\scripts\spanish_raw.json')
TOP_N = 25015          # 收录高频 lemma 数
MAX_EXAMPLES = 5       # 每词最多例句数（西语新手多例句优先）
SUPPLEMENT_TOP = 6000  # 补充层：es_merged_50k 前 N 词形

POS_MAP = {
    'n': 'n.', 'v': 'v.', 'adj': 'adj.', 'adv': 'adv.',
    'prep': 'prep.', 'conj': 'conj.', 'pron': 'pron.', 'det': 'det.',
    'num': 'num.', 'art': 'art.', 'interj': 'interj.', 'phrase': 'phrase',
    'prov': 'proverb', 'prep phrase': 'phrase', 'adv phrase': 'phrase',
    'pronoun': 'pron.', 'verb': 'v.', 'noun': 'n.', 'adjective': 'adj.',
    'adverb': 'adv.', 'proper noun': 'n.', 'proper': 'n.', 'abbr': 'abbr.',
    'prefix': 'prefix', 'suffix': 'suffix', 'symbol': 'symbol',
}

# gloss 清洗：去掉 Wiktionary 标记与超长百科释义
GLOSS_CLEAN_RE = re.compile(r'\(#[^)]*\)|\{\{[^}]*\}\}|\[\[|\]\]')


def clean_gloss(g: str) -> str:
    g = GLOSS_CLEAN_RE.sub('', g)
    g = re.sub(r'\s{2,}', ' ', g).strip(' #;,.')
    # 过长释义截断（多为维基百科式长解释）
    if len(g) > 90:
        cut = g.find(' (')
        if 0 < cut < 90:
            g = g[:cut]
        else:
            g = g[:90].rstrip(' ,;(') + '…'
    return g


def parse_es_en(z: zipfile.ZipFile) -> dict:
    """解析 es-en.data → {head: {'pos': [...], 'glosses': [...], 'g': str}}"""
    data = z.read('spanish_data-master/es-en.data').decode('utf-8', errors='replace')
    lines = data.splitlines()
    entries = {}
    i = 0
    n = len(lines)
    while i < n:
        if lines[i].strip() != '_____':
            i += 1
            continue
        # 词头行
        if i + 1 >= n:
            break
        head = lines[i + 1].strip().strip('"').strip()
        i += 2
        pos_list = []
        glosses = []
        gender = ''
        cur_pos = None
        while i < n and lines[i].strip() != '_____':
            l = lines[i]
            s = l.strip()
            if s.startswith('pos:'):
                cur_pos = POS_MAP.get(s[4:].strip(), s[4:].strip())
                if cur_pos and cur_pos not in pos_list:
                    pos_list.append(cur_pos)
            elif s.startswith('gloss:'):
                g = clean_gloss(s[6:].strip())
                if g:
                    glosses.append(g)
            elif s.startswith('g:') and not gender:
                gender = s[2:].strip()
            i += 1
        if head and glosses and head not in entries:
            entries[head] = {'pos': pos_list, 'glosses': glosses, 'g': gender}
        # 注意：内循环退出时 i 已指向下一个 _____ 行，这里不能再 i += 1，
        # 否则会把下一个词条的词头行当内容跳过（会丢失一半词条）。
    return entries


def parse_frequency(z: zipfile.ZipFile) -> list:
    """frequency.csv → [(lemma, count, pos)]，按 count 降序（文件已排序）"""
    d = z.read('spanish_data-master/frequency.csv').decode('utf-8', errors='replace')
    out = []
    for row in csv.reader(d.splitlines()[1:]):
        if len(row) >= 3:
            try:
                count = int(row[0])
            except ValueError:
                continue
            out.append((row[1], count, row[2]))
    return out


LEMMA_SEG_RE = re.compile(r':([a-z\- ]+),([^ ]+)')


def parse_sentences(z: zipfile.ZipFile, wanted: set) -> dict:
    """sentences.tsv → {lemma: [[es, en], ...]}，仅保留 wanted 中的 lemma"""
    d = z.read('spanish_data-master/sentences.tsv').decode('utf-8', errors='replace')
    idx = {}
    for line in d.splitlines()[1:]:
        parts = line.split('\t')
        if len(parts) < 6:
            continue
        en, es = parts[0], parts[1]
        if not en or not es or len(es) > 120 or len(en) > 120:
            continue
        lemma_col = parts[5]
        for m in LEMMA_SEG_RE.finditer(lemma_col):
            wf = m.group(2)
            # wf 形如 "wordform|lemma" 或 "wordform"
            lemma = wf.split('|')[-1].lower()
            if lemma in wanted:
                bucket = idx.setdefault(lemma, [])
                if len(bucket) < MAX_EXAMPLES * 3:  # 多存一些供后续挑选
                    bucket.append((es, en, len(es)))  # 带长度用于后续挑选短句
    return idx


# Top 高频动词 / 形容词的常见固定搭配（人工精校，例句来源：西语口语/课本）
# 每条目：lemma → [(西语短语, 中文意思), ...]
FIXED_EXPRESSIONS = {
    'tener': [
        ('tener hambre', '饥饿'),
        ('tener sueño', '困倦'),
        ('tener miedo', '害怕'),
        ('tener razón', '有理'),
        ('tener prisa', '匆忙'),
        ('tener lugar', '发生/举行'),
        ('tener que + infinitivo', '必须做某事'),
        ('tener en cuenta', '考虑到'),
        ('tener cuidado', '小心'),
        ('tener ganas de', '想要'),
    ],
    'hacer': [
        ('hacer falta', '缺少/需要'),
        ('hacer caso', '听从'),
        ('hacerse', '变成/伪装'),
        ('hacer de', '充当'),
        ('hacer el papel de', '扮演'),
        ('hacer las paces', '讲和'),
        ('hacer cola', '排队'),
        ('hacer la cama', '铺床'),
        ('hacerse cargo de', '负责'),
        ('hace falta + inf', '需要做某事'),
    ],
    'ser': [
        ('ser de', '来自'),
        ('es que', '是因为'),
        ('siendo así', '既然如此'),
        ('ser capaz de', '能够'),
        ('ser hora de', '是时候'),
        ('a no ser que', '除非'),
        ('sea como sea', '无论如何'),
    ],
    'estar': [
        ('estar bien', '舒服/好'),
        ('estar mal', '不舒服/糟'),
        ('estar de acuerdo', '同意'),
        ('estar a punto de', '即将'),
        ('estar seguro', '确信'),
        ('estar en casa', '在家'),
        ('estarse + gerundio', '持续做某事'),
    ],
    'ir': [
        ('ir a + infinitivo', '将要/去做'),
        ('irse', '离开'),
        ('ir bien', '顺利'),
        ('ir mal', '不顺利'),
        ('ir en coche', '坐车去'),
        ('ir de compras', '购物'),
        ('¿Cómo te va?', '你怎么样？'),
        ('vamos a ver', '我们来看看'),
    ],
    'dar': [
        ('dar a', '朝向/面对'),
        ('dar con', '找到'),
        ('dar igual', '无所谓'),
        ('dar la vuelta', '转身'),
        ('dar las gracias', '致谢'),
        ('darse cuenta de', '意识到'),
        ('darse por vencido', '认输'),
    ],
    'poner': [
        ('ponerse + adj', '变得'),
        ('ponerse a + inf', '开始做'),
        ('ponerse de acuerdo', '达成一致'),
        ('ponerse en marcha', '启动'),
        ('ponerse en pie', '站起来'),
        ('ponerse las pilas', '振作起来'),
        ('ponerse rojo', '脸红'),
    ],
    'saber': [
        ('saber a', '尝起来像'),
        ('saber + inf', '会/能做'),
        ('saber de', '了解'),
        ('saberse la lección', '背熟课文'),
        ('a saber', '即'),
        ('¡Quién sabe!', '谁知道呢！'),
    ],
    'dejar': [
        ('dejar de + inf', '停止'),
        ('dejar caer', '暗示'),
        ('dejar en paz', '不打扰'),
        ('dejar plantado', '放鸽子'),
        ('dejar atrás', '抛在后面'),
    ],
    'pasar': [
        ('pasar por', '经过/被视为'),
        ('pasar a + inf', '接下来'),
        ('¿Qué pasa?', '怎么了？'),
        ('pasarlo bien', '过得愉快'),
        ('pasar de + inf', '超过'),
        ('pasarse de listo', '自作聪明'),
    ],
    'quedar': [
        ('quedar en + inf', '约定'),
        ('quedarse con', '保留'),
        ('quedarse en casa', '留在家'),
        ('quedar bien', '得体'),
        ('quedar mal', '尴尬'),
    ],
    'no': [
        ('no sólo... sino también', '不仅...而且'),
        ('no... hasta', '直到...才'),
        ('no... más que', '只有'),
        ('por no hablar de', '更不用说'),
    ],
    'muy': [
        ('muy + adj', '非常'),
        ('muy bien', '很好'),
        ('muy mal', '很差'),
        ('a muy + tardar', '最迟'),
    ],
    'bueno': [
        ('buen + n', '好的（短元音前）'),
        ('saber bueno', '好吃'),
        ('bueno, ...', '好吧...（过渡词）'),
        ('¡Buena suerte!', '祝好运！'),
        ('de buenas a primeras', '突然地'),
    ],
    'malo': [
        ('mal + adv', '不好地'),
        ('saber mal', '不好吃'),
        ('de malas', '不走运'),
        ('¡Qué mal!', '真糟糕！'),
        ('estar de mal humor', '心情差'),
    ],
    'grande': [
        ('gran + n', '伟大的（短元音前）'),
        ('a lo grande', '大规模地'),
        ('en grande', '盛大地'),
        ('pasarlo en grande', '玩得很开心'),
    ],
    'pequeño': [
        ('un poco', '一点儿'),
        ('pequeño a pequeño', '一点一点地'),
    ],
    'bien': [
        ('bien + adv', '好地'),
        ('muy bien', '很好'),
        ('está bien', '好的/可以'),
        ('si bien', '虽然'),
        ('bien hecho', '做得好'),
        ('o bien', '或者'),
    ],
    'mal': [
        ('mal + adv', '不好地'),
        ('de mal en peor', '越来越糟'),
        ('mal de la cabeza', '头脑有问题'),
        ('no está mal', '还不错'),
    ],
    'más': [
        ('más... que', '比...更'),
        ('más de + num', '多于'),
        ('a más de', '除了'),
        ('más bien', '更准确地说'),
        ('por más que', '无论怎样'),
        ('a más tardar', '最迟'),
        ('más o menos', '差不多'),
        ('es más', '更重要的是'),
    ],
    'menos': [
        ('menos... que', '比...更少'),
        ('a menos que', '除非'),
        ('al menos', '至少'),
        ('menos mal', '还好/幸亏'),
        ('a menos de', '距...不到'),
    ],
    'pero': [
        ('pero + adj', '很...（强调）'),
        ('no... sino', '不是...而是'),
        ('pero bueno', '不过'),
    ],
    'porque': [
        ('porque sí', '没有原因地'),
        ('¿por qué?', '为什么？'),
        ('porque no', '不为什么'),
    ],
    'como': [
        ('como + subj', '既然'),
        ('como si', '好像'),
        ('tal como', '正如'),
        ('como mucho', '最多'),
        ('como mínimo', '至少'),
        ('como siempre', '一如既往'),
    ],
    'si': [
        ('si + indic', '如果/是否'),
        ('como si', '好像'),
        ('por si acaso', '以防万一'),
        ('si bien', '虽然'),
        ('¡y si ...?', '要不...？'),
    ],
    'a': [
        ('a + inf', '即将做某事'),
        ('ir a + lugar', '去某地'),
        ('a la(s)', '阴性定冠词'),
        ('a poco que', '只要'),
        ('a no ser que', '除非'),
    ],
    'de': [
        ('de + n', '的/来自'),
        ('de... a...', '从...到...'),
        ('de acuerdo con', '根据'),
        ('de nada', '不客气'),
        ('de nuevo', '再次'),
        ('de pronto', '突然'),
    ],
    'en': [
        ('en + lugar', '在'),
        ('en cuanto', '一...就'),
        ('en vez de', '代替'),
        ('en realidad', '事实上'),
        ('en serio', '认真地'),
        ('en fin', '总之'),
    ],
    'con': [
        ('con + n', '和/带'),
        ('con tal de que', '只要'),
        ('con que', '所以'),
        ('con todo', '尽管如此'),
    ],
    'para': [
        ('para + inf', '为了/将要'),
        ('para que + subj', '以便'),
        ('no... para', '并不...'),
        ('¿para qué?', '为什么？'),
    ],
    'por': [
        ('por + n', '因为/通过'),
        ('por que', '因为'),
        ('¿por qué?', '为什么？'),
        ('por favor', '请'),
        ('por cierto', '顺便'),
        ('por fin', '终于'),
        ('por supuesto', '当然'),
        ('por ejemplo', '例如'),
        ('por más que', '无论'),
        ('por poco', '差点'),
    ],
    'sin': [
        ('sin + inf', '不/没有'),
        ('sin embargo', '但是'),
        ('sin duda', '毫无疑问'),
        ('sin más', '就这样'),
        ('sin que + subj', '没有'),
    ],
    'sobre': [
        ('sobre todo', '尤其是'),
        ('sobre + n', '关于/在...上'),
        ('¿sobre qué?', '关于什么？'),
    ],
    'entre': [
        ('entre... y...', '在...之间'),
        ('entre tanto', '与此同时'),
        ('entre todos', '总共'),
    ],
    'hasta': [
        ('hasta que + indic', '直到'),
        ('hasta + n', '直到'),
        ('hasta ahora', '到目前为止'),
        ('hasta luego', '回头见'),
        ('¡Hasta la vista!', '再见！'),
        ('no... hasta', '直到...才'),
    ],
    'cuando': [
        ('cuando + indic', '当...时'),
        ('cuando + subj', '一...就'),
        ('de cuando en cuando', '偶尔'),
    ],
    'donde': [
        ('donde + indic', '在...的地方'),
        ('de donde', '来自'),
        ('¿dónde?', '哪里？'),
        ('por donde', '经过'),
    ],
    'todo': [
        ('todo + n', '所有的'),
        ('todos los + n', '所有的...（复数）'),
        ('del todo', '完全'),
        ('en todo caso', '无论如何'),
        ('sobre todo', '尤其是'),
        ('todo el mundo', '所有人'),
    ],
    'cada': [
        ('cada vez más', '越来越'),
        ('cada vez menos', '越来越少'),
        ('cada + n', '每个'),
    ],
    'mucho': [
        ('mucho + adv', '很多地'),
        ('mucho + n', '许多'),
        ('muchas gracias', '非常感谢'),
        ('ni mucho menos', '远非'),
    ],
    'poco': [
        ('poco + n', '少的'),
        ('un poco de', '一点'),
        ('poco a poco', '渐渐地'),
        ('dentro de poco', '很快'),
        ('por poco', '差点'),
    ],
    'siempre': [
        ('siempre + indic', '总是'),
        ('casi siempre', '几乎总是'),
        ('para siempre', '永远'),
        ('como siempre', '像往常一样'),
    ],
    'nunca': [
        ('nunca + indic', '从不'),
        ('casi nunca', '几乎从不'),
        ('más que nunca', '前所未有地'),
    ],
    'ya': [
        ('ya + indic', '已经'),
        ('ya no', '不再'),
        ('ya que', '既然'),
        ('¡Ya basta!', '够了！'),
    ],
    'aquí': [
        ('aquí + estar', '在这里'),
        ('de aquí', '从这里'),
        ('por aquí', '在这附近'),
        ('hasta aquí', '到目前为止'),
    ],
    'allí': [
        ('allí + estar', '在那里'),
        ('de allí', '从那里'),
        ('por allí', '在那附近'),
    ],
    'ahora': [
        ('ahora mismo', '马上'),
        ('por ahora', '目前'),
        ('hasta ahora', '到现在'),
        ('ahora bien', '然而'),
    ],
    'hoy': [
        ('hoy en día', '如今'),
        ('hoy por hoy', '目前'),
    ],
    'ayer': [
        ('anteayer', '前天'),
        ('ayer por la noche', '昨晚'),
    ],
    'mañana': [
        ('mañana por la mañana', '明早'),
        ('hasta mañana', '明天见'),
        ('pasado mañana', '后天'),
        ('de la mañana', '上午的'),
    ],
}


def main():
    z = zipfile.ZipFile(ZIP)
    print('parsing es-en.data ...', flush=True)
    es_en = parse_es_en(z)
    print('es-en entries:', len(es_en), flush=True)

    print('parsing frequency.csv ...', flush=True)
    freq = parse_frequency(z)
    print('frequency rows:', len(freq), flush=True)

    top = freq[:TOP_N]
    wanted = {w for w, _, _ in top}

    print('parsing sentences.tsv ...', flush=True)
    sent_idx = parse_sentences(z, wanted)
    print('sentence index lemmas:', len(sent_idx), flush=True)

    entries = []
    rank = 0
    for lemma, count, fpos in top:
        rank += 1
        e = es_en.get(lemma)
        if not e or not e['glosses']:
            continue
        glosses = e['glosses']
        pos_list = e['pos'] or ([POS_MAP.get(fpos, '')] if fpos in POS_MAP else [])
        pos = pos_list[0] if pos_list else ''
        # 词性补齐：frequency 的 pos 作为备选
        if not pos and fpos in POS_MAP:
            pos = POS_MAP[fpos]
        translation = glosses[0][:70]  # 体积控制：英文释义截断
        english = glosses[1][:70] if len(glosses) > 1 else ''
        sents = sent_idx.get(lemma.lower(), [])
        sents.sort(key=lambda t: t[2])  # 选最短的若干句
        # 体积控制：高频词保留全部例句；低频词只留 1 条例句
        keep = MAX_EXAMPLES if rank <= 3000 else 1
        sents = [s[:2] for s in sents[:keep]]
        example = sents[0][0] if sents else ''
        example_translation = sents[0][1] if sents else ''

        # 固定搭配：仅精校短语（自动提取的短句与 examples 重复，已移除以压缩体积）
        phrases = list(FIXED_EXPRESSIONS.get(lemma, []))

        entries.append({
            'word': lemma,
            'pos': pos,
            'translation': translation,
            'chineseTranslation': get_zh(lemma),
            'englishDefinition': english,
            'frequencyRank': rank,
            'example': example,
            'exampleTranslation': example_translation,
            'examples': [[s[0], s[1]] for s in sents],  # 多例句
            'phrases': phrases,  # 固定搭配
        })

    print('final entries:', len(entries), flush=True)

    # === 补充层：frequency.csv 缺收录但其词形极高频的词（no / son / a 等） ===
    # es_merged_50k 是词形级频率；只在 es-en.data 有真实释义时才收录，避免造释义
    print('parsing es_merged_50k supplemental ...', flush=True)
    merged = []
    d = z.read('spanish_data-master/es_merged_50k.txt').decode('utf-8', errors='replace')
    for i, line in enumerate(d.splitlines()):
        p = line.split('\t')
        if len(p) >= 2:
            merged.append((p[0], i + 1))
    covered = {e['word'].lower() for e in entries}
    added = 0
    for wordform, mrank in merged[:SUPPLEMENT_TOP]:
        if wordform.lower() in covered:
            continue
        e = es_en.get(wordform)
        if not e or not e['glosses']:
            continue
        # 只收单词语形（跳过含空格/连字符的短语）
        if not all(ch.isalpha() or ch in 'áéíóúüñÁÉÍÓÚÜÑ' for ch in wordform):
            continue
        pos = e['pos'][0] if e['pos'] else ''
        sents = sent_idx.get(wordform.lower(), [])
        sents.sort(key=lambda t: t[2])
        sents = [s[:2] for s in sents[:MAX_EXAMPLES]]
        example = sents[0][0] if sents else ''
        example_translation = sents[0][1] if sents else ''
        phrases = list(FIXED_EXPRESSIONS.get(wordform, []))

        entries.append({
            'word': wordform,
            'pos': pos,
            'translation': e['glosses'][0],
            'chineseTranslation': get_zh(wordform),
            'englishDefinition': e['glosses'][1] if len(e['glosses']) > 1 else '',
            'frequencyRank': mrank,
            'example': example,
            'exampleTranslation': example_translation,
            'examples': [[s[0], s[1]] for s in sents],
            'phrases': phrases,
        })
        covered.add(wordform.lower())
        added += 1
    print('supplemental added:', added, flush=True)

    print('total entries:', len(entries), flush=True)
    with_ex = sum(1 for e in entries if e['example'])
    print('with examples:', with_ex, flush=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(entries, ensure_ascii=False, indent=1), encoding='utf-8')
    print('saved:', OUT, flush=True)


if __name__ == '__main__':
    main()
