#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解析《雅思词汇真经》词汇表List.pdf（63页，21章，约6600词）

策略：词头锚定 + 区间聚合
1. 全页文本按行切分，剔除页眉噪音
2. 识别所有「词头行」（序号 + 英文词头）的位置作为锚点
3. 每个词条的释义区 = 该词头行之后、到下一个词头行之前的所有行
4. 释义区内：首个词性行取 pos；该行剩余内容 + 后续非词性行拼接为释义
5. 词头断裂恢复（thermodyna → thermodynamics）：从释义区找以词头开头的更长词形

格式边界（实测）：
- 词性可能独立成行（'n.' 单行，释义在下一行）
- 词性与释义可能同行（'adj. 破坏/有害的...'）
- 词头可能被表格宽度截断
- ~ 代表词条本身；* 为记忆难度标记
"""
import fitz
import re
import json
from pathlib import Path

PDF = r'D:\学习\英语\21天背完《雅思词汇真经》6600个单词！\词汇表List.pdf'
OUT = Path(r'D:\ielts-lexicon\scripts\zhenjing_raw.json')

POS_ALT = r'n|v|adj|adv|conj|prep|pron|det|num|art|vt|vi|aux|modal|abbr|int|exclam|n/v|adj/adv|v/n|n/adj|v/adj'
POS_LINE_RE = re.compile(rf'^({POS_ALT})\.?\s*[；;：:]?\s*(.*)$')
HEAD_RE = re.compile(r'^\s*(\d{1,4})\s+([A-Za-z][A-Za-z0-9\-\'/ ]*?)\s*$')
HEAD_POS_RE = re.compile(rf'^\s*(\d{{1,4}})\s+([A-Za-z][A-Za-z0-9\-\'/ ]*?)\s+({POS_ALT})\.?\s*[；;：:]?\s*(.*)$')
WORD_IN_TEXT_RE = re.compile(r'[A-Za-z][A-Za-z\-]{2,}')
# 下一个词头模式（三列交错时释义区可能串到下一列词条）
NEXT_HEAD_RE = re.compile(r'^\s*\d{1,4}\s+[A-Za-z]')
# 音标（国际音标或牛津式）
PHONETIC_RE = re.compile(r'[\[(/](?:[ˈˌ]?[A-Za-zɪɛæɑɔʊəʃʒðθŋː\s\-]+)[\])/]')
SINGLE_LETTER_TOKEN_RE = re.compile(r'^[A-Za-z]$')
SKIP_PREFIXES = ('Chapter', 'Date', '□', '序', '单词', '释义')
NOISE_RE = re.compile(r'^[\uf000-\uf0ff\s]+$')


def norm_pos(p: str) -> str:
    p = p.strip().lower().replace('.', '')
    table = {
        'vt': 'v.', 'vi': 'v.',
        'n/v': 'n. & v.', 'adj/adv': 'adj. & adv.',
        'v/n': 'v. & n.', 'n/adj': 'n. & adj.', 'v/adj': 'v. & adj.',
    }
    return table.get(p, p + '.')


def clean_zh(s: str, word: str) -> str:
    s = s.strip()
    # ~ 替换为词本身（含 working~ → working atmosphere）
    s = re.sub(r'([A-Za-z\-\']*?)~', lambda m: (m.group(1) + word) if m.group(1) else word, s)
    s = s.replace('*', '')
    s = re.sub(r'\s{2,}', ' ', s)
    return s.strip(' ;；,，')


def merge_broken_word(word: str, region: list) -> str:
    """PDF 字距导致的单字母拆行合并：['w','a','r','m'] → 'warm'。
    仅当词头本身全是单字母 token 且区域首行也是单字母序列时触发。"""
    tokens = word.split(' ')
    if not all(SINGLE_LETTER_TOKEN_RE.match(t) for t in tokens if t):
        return word
    # 从区域行继续收集单字母
    extra = []
    for l in region:
        toks = l.split(' ')
        if toks and all(SINGLE_LETTER_TOKEN_RE.match(t) for t in toks if t):
            extra.extend(t for t in toks if t)
        else:
            break
    return ''.join(tokens + extra)


def extract_phonetic(region: list) -> str:
    """从释义区首行提取音标（如有）"""
    if not region:
        return ''
    m = PHONETIC_RE.search(region[0])
    return m.group(0).strip('[]()/') if m else ''


def truncate_at_next_head(text: str) -> str:
    """释义区聚合后，若中间串入了下一个词头（三列交错），在此截断"""
    # 找到 '数字+空格+英文' 模式的位置，截断其前
    m = re.search(r'\s\d{1,3}\s+[A-Za-z][a-z]', text)
    if m and m.start() > 4:
        return text[:m.start()]
    return text


def recover_head(word: str, region_text: str) -> str:
    """词头断裂恢复：释义区里若有以词头开头的更长英文词形，采用它"""
    for w in WORD_IN_TEXT_RE.findall(region_text):
        if len(w) > len(word) and w.lower().startswith(word.lower()[:max(6, len(word) - 1)]):
            return w
    return word


def extract_entries():
    doc = fitz.open(PDF)
    entries = []
    chapter_cur = ''
    topic_cur = ''
    stats = {'inline': 0, 'pos_line': 0, 'pos_plus_next': 0, 'broken': 0, 'no_pos': 0, 'no_zh': 0}

    for pno in range(doc.page_count):
        text = doc[pno].get_text()
        lines = [l.rstrip() for l in text.splitlines()]

        m = re.search(r'Chapter\s*(\d+)\s*([^\n]*?)List\s*(\d+)', text)
        if m:
            chapter_cur = m.group(1)
            topic_cur = m.group(2).strip().lstrip('/').strip()
            if '/' in topic_cur:
                topic_cur = topic_cur.split('/')[-1]

        body = []
        for l in lines:
            ls = l.strip()
            if not ls or ls.startswith(SKIP_PREFIXES) or NOISE_RE.match(ls):
                continue
            body.append(ls)

        # 1. 锚定所有词头行
        anchors = []  # (index_in_body, seq, word, inline_pos, inline_rest)
        for idx, l in enumerate(body):
            m2 = HEAD_POS_RE.match(l)
            if m2:
                seq, word, pos, rest = m2.groups()
                anchors.append((idx, int(seq), word.strip(), pos, rest))
                continue
            m3 = HEAD_RE.match(l)
            if m3:
                seq, word = m3.groups()
                anchors.append((idx, int(seq), word.strip(), None, ''))
        if not anchors:
            continue

        # 2. 逐词头聚合释义区
        for ai, (idx, seq, word, inline_pos, inline_rest) in enumerate(anchors):
            region_end = anchors[ai + 1][0] if ai + 1 < len(anchors) else len(body)
            region = body[idx + 1:region_end]
            # 三列交错防护：遇到下一个词头行（序号+英文）即止
            clipped = []
            for r in region:
                if NEXT_HEAD_RE.match(r):
                    break
                clipped.append(r)
            region = clipped

            phonetic = extract_phonetic(region)

            # 词头单字母拆行合并（w a r m → warm）
            word = merge_broken_word(word, region)

            if inline_pos:
                pos = norm_pos(inline_pos)
                zh = clean_zh(inline_rest, word)
                if not zh and region:
                    zh = clean_zh(region[0], word)
                    region = region[1:]
                stats['inline'] += 1
            else:
                pos = ''
                zh = ''
                if region:
                    pm = POS_LINE_RE.match(region[0])
                    if pm:
                        pos = norm_pos(pm.group(1))
                        rest = pm.group(2)
                        stats['pos_line'] += 1
                        if rest:
                            zh = clean_zh(rest, word)
                        else:
                            rest_lines = [r for r in region[1:] if not POS_LINE_RE.match(r) and not HEAD_RE.match(r)]
                            zh = clean_zh(' '.join(rest_lines), word)
                            stats['pos_plus_next'] += 1
                        region = region[1:]
                    else:
                        rest_lines = [r for r in region if not POS_LINE_RE.match(r)]
                        zh = clean_zh(' '.join(rest_lines), word)
                        stats['no_pos'] += 1
                # 词头断裂恢复
                fixed = recover_head(word, ' '.join(region))
                if fixed != word:
                    word = fixed
                    stats['broken'] += 1

            # 释义串词截断 + 音标残留清除 + 长度控制
            zh = truncate_at_next_head(zh)
            zh = PHONETIC_RE.sub('', zh)
            zh = re.sub(r'\s{2,}', ' ', zh).strip(' ;；,，.。')
            if len(zh) > 72:
                zh = zh[:72].rstrip(' ;；,，.。/(（[') 

            if not zh:
                stats['no_zh'] += 1

            entries.append({
                'seq': seq, 'word': word, 'pos': pos, 'zh': zh,
                'phonetic': phonetic, 'topic': topic_cur, 'chapter': chapter_cur,
            })

    return entries, stats


if __name__ == '__main__':
    entries, stats = extract_entries()
    print('total entries:', len(entries))
    print('stats:', stats)
    seen = {}
    dup = 0
    for e in entries:
        k = e['word'].lower()
        if k in seen:
            dup += 1
        else:
            seen[k] = e
    print('unique words:', len(seen), 'dups removed:', dup)
    nopos = [e for e in seen.values() if not e['pos']]
    nozh = [e for e in seen.values() if not e['zh']]
    print('no pos:', len(nopos), 'no zh:', len(nozh))
    for e in nopos[:12]:
        print('  NOPOS:', e['seq'], e['word'], '|', e['topic'])
    for e in nozh[:12]:
        print('  NOZH:', e['seq'], e['word'], '|', e['topic'])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(list(seen.values()), ensure_ascii=False, indent=1), encoding='utf-8')
    print('saved:', OUT)
