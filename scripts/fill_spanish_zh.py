#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为西语词库批量补全中文释义。

思路：西语词条本身带英文 gloss（Wiktionary），而项目里已有两份英汉词库：
    - src/data/oxfordLexicon.ts      管道格式，第 7 字段是中文
    - src/data/ecdictSupplement.ts   \\x01 分隔，第 4 字段是中文
把 gloss 里的核心词抽出来回查英汉词典，即可在不联网的前提下得到中文。

对一个西语词的多个 gloss 分别翻译后去重合并，
例如 mango 的两条 gloss「handle (...)」与「mango (fruit and tree)」
→ 分别查到「把手；柄」与「芒果」→ 合并为「芒果；把手」。

已有的人工精校中文（约 320 条）一律保留，不覆盖。
"""
import re
import sys
from pathlib import Path

ROOT = Path(r'D:\ielts-lexicon')
ES_FILE = ROOT / 'src' / 'data' / 'spanishLexicon.ts'
OX_FILE = ROOT / 'src' / 'data' / 'oxfordLexicon.ts'
EC_FILE = ROOT / 'src' / 'data' / 'ecdictSupplement.ts'

CJK = r'\u4e00-\u9fa5'


# ---------------------------------------------------------------- 英汉词典
def load_oxford() -> dict:
    """解析牛津词库 → {英文词: 中文}"""
    out = {}
    if not OX_FILE.exists():
        return out
    pat = re.compile(r"^  '((?:[^'\\]|\\.)*)': '((?:[^'\\]|\\.)*)',$", re.M)
    for m in pat.finditer(OX_FILE.read_text(encoding='utf-8')):
        key = m.group(1).replace("\\'", "'").lower()
        fields = m.group(2).replace("\\'", "'").split('|')
        if len(fields) < 8:
            continue
        zh = (fields[6] or '').strip()
        if zh and re.search(f'[{CJK}]', zh):
            out[key] = zh
    return out


def load_ecdict() -> dict:
    """解析 ECDICT 补充词库 → {英文词: 中文}"""
    out = {}
    if not EC_FILE.exists():
        return out
    src = EC_FILE.read_text(encoding='utf-8')
    body = src.split('ECDICT_SUPPLEMENT_RAW', 1)[-1]
    for chunk in re.findall(r"'((?:[^'\\]|\\.)*)'", body):
        text = chunk.replace("\\'", "'").replace('\\n', '\n').replace('\\\\', '\\')
        for line in text.split('\n'):
            f = line.split('\x01')
            if len(f) < 4:
                continue
            w = f[0].strip().lower()
            zh = f[3].strip()
            if w and zh and w not in out and re.search(f'[{CJK}]', zh):
                out[w] = zh
    return out


# ---------------------------------------------------------------- 英文 gloss 处理
STOP_PREFIX = re.compile(
    r'^(?:to|a|an|the|sb|sth|somebody|something|be|being|one who|that which|'
    r'person who|thing that|act of|state of|quality of)\s+', re.I)


def gloss_variants(gloss: str) -> list:
    """把一个英文 gloss 拆成若干可回查的词形候选（按优先级）"""
    g = (gloss or '').strip()
    if not g:
        return []
    # 去掉括号补充、去掉引号
    g = re.sub(r'\([^)]*\)', ' ', g)
    g = g.replace('’', "'").strip(' .,;:')

    cands = []
    # 1) 整句/短语先试（多词短语可能在词库里直接存在）
    cands.append(g.lower())
    # 2) 按逗号/分号拆，逐段试（"free, without charge" → free / without charge）
    for seg in re.split(r'[,;]', g):
        seg = seg.strip()
        if seg:
            cands.append(seg.lower())
    # 3) 去掉 to / a / the 等前缀
    for c in list(cands):
        stripped = STOP_PREFIX.sub('', c).strip()
        if stripped and stripped != c:
            cands.append(stripped)
    # 4) 多词短语取中心词（最后一个实词）
    for c in list(cands):
        words = [w for w in re.findall(r"[a-z][a-z'\-]*", c) if w not in ('of', 'the', 'a', 'an', 'to', 'in', 'on', 'with', 'for', 'and', 'or')]
        if len(words) >= 2:
            cands.append(words[-1])
            cands.append(words[0])
    # 5) 英文屈折形式还原：signed→sign、handling→handle、bushes→bush
    for c in list(cands):
        for suf, rep in (('ies', 'y'), ('ing', ''), ('ed', ''), ('es', ''), ('s', '')):
            if c.endswith(suf) and len(c) > len(suf) + 2:
                stem = c[:-len(suf)]
                cands.append(stem + rep)
                if rep == '':
                    cands.append(stem + 'e')          # handling → handle
                    if len(stem) >= 3 and stem[-1] == stem[-2]:
                        cands.append(stem[:-1])       # planned → plan

    # 去重保序、过滤过短
    seen, out = set(), []
    for c in cands:
        c = c.strip(' .,;:-')
        if len(c) < 2 or c in seen:
            continue
        seen.add(c)
        out.append(c)
    return out


def polish_zh(zh: str) -> str:
    """把词典里的中文释义洗成干净、可直接展示的一条。"""
    s = re.sub(r'\[[^\]]{1,8}\]\s*', '', zh)          # [计] [医] 等标记
    s = re.sub(r'<[^>]{1,6}>', '', s)                 # <德> 等语源标记
    s = re.sub(r'=>.*$', '', s)                       # 词典的「=> 参见」箭头
    s = re.sub(r'(?:用法|释义)?见[a-zA-Z0-9_\u4e00-\u9fa5]{1,10}\s*$', '', s)  # 用法见name1
    s = re.sub(r'^(?:(?:n|vt|vi|v|adj|adv|prep|conj|pron|num|art|interj)\s*\.\s*)+', '', s)
    # 词典里的交叉引用/说明性长句不是释义
    if re.search(r'见词条|同上|参见|详细说明|用于构成|用以构成|参见插图', s):
        return ''
    s = re.sub(r'\s+', ' ', s).strip(' .,;:。；、')
    # 英文式的「A, B, C」列表改成顿号，并限制条数
    if ',' in s and not re.search(r'[，、]', s):
        parts = [p.strip(' .') for p in s.split(',') if p.strip(' .')]
        seen, uniq = set(), []
        for p in parts:
            if p and p not in seen:
                seen.add(p)
                uniq.append(p)
        s = '、'.join(uniq[:3])
    # 按分号拆后取前两条，太长不像释义
    parts = [p.strip(' .,;:。；、') for p in re.split(r'[;；]', s) if p.strip(' .,;:。；、')]
    if not parts:
        return ''
    out = '；'.join(parts[:2])
    # 去掉末尾拖着的拉丁字母残渣（如「黄（色）的. =>illus」被截断后的尾巴）
    out = re.sub(r'[a-zA-Z][a-zA-Z .\'\-]*$', '', out).strip(' .,;:。；、')
    # 中文太少说明是噪声
    if len(re.findall(f'[{CJK}]', out)) < 2:
        return ''
    return out[:34]


def first_zh(gloss: str, dicts: list) -> str:
    """在英汉词典里为一条 gloss 找中文"""
    for cand in gloss_variants(gloss):
        for d in dicts:
            zh = d.get(cand)
            if not zh:
                continue
            polished = polish_zh(zh)
            if polished:
                return polished
    return ''


def main():
    if not ES_FILE.exists():
        print('缺少西语词库文件', file=sys.stderr)
        return 1

    print('加载英汉词典…')
    ox = load_oxford()
    ec = load_ecdict()
    print(f'  牛津 {len(ox)} 条，ECDICT {len(ec)} 条')
    dicts = [ox, ec]

    text = ES_FILE.read_text(encoding='utf-8')

    # 逐个词条处理：只改 chineseTranslation 为空的那部分
    entry_re = re.compile(
        r"'((?:[^'\\]|\\.)*)': \{ pos: '(?:[^'\\]|\\.)*', "
        r"translation: '((?:[^'\\]|\\.)*)', "
        r"chineseTranslation: '((?:[^'\\]|\\.)*)', "
        r"englishDefinition: '((?:[^'\\]|\\.)*)'"
    )

    stats = {'total': 0, 'kept': 0, 'filled': 0, 'miss': 0}
    misses = []

    def repl(m):
        word, tr, zh, ed = m.group(1), m.group(2), m.group(3), m.group(4)
        stats['total'] += 1
        if zh.strip():
            stats['kept'] += 1
            return m.group(0)

        glosses = []
        if tr.strip():
            glosses.append(tr.replace("\\'", "'"))
        if ed.strip():
            glosses.append(ed.replace("\\'", "'"))

        zh_parts = []
        for g in glosses:
            z = first_zh(g, dicts)
            if z and z not in zh_parts:
                zh_parts.append(z)
        if not zh_parts:
            stats['miss'] += 1
            if len(misses) < 40:
                misses.append((word, tr[:40]))
            return m.group(0)

        stats['filled'] += 1
        merged = '；'.join(zh_parts)[:80]
        return m.group(0).replace(
            f"chineseTranslation: '{zh}'",
            "chineseTranslation: '" + merged.replace("'", "\\'") + "'",
            1)

    new_text = entry_re.sub(repl, text)

    ES_FILE.write_text(new_text, encoding='utf-8')

    print(f"\n词条总数 {stats['total']}")
    print(f"  保留原有中文 {stats['kept']}")
    print(f"  新补中文     {stats['filled']}")
    print(f"  未能补全     {stats['miss']}")
    if misses:
        print('\n未补全样例:')
        for w, g in misses:
            print(f'  {w}  ← {g}')
    return 0


if __name__ == '__main__':
    sys.exit(main())