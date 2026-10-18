#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从牛津 OALD 义项文本中提取「每个词性 → 完整中文释义串」。

OALD senses 字段形如（`｜` 分隔不同词性块）：
    1 [U] material of which sth is made 原料; 材料: What stuff is this jacket made of? ...
    2 (sl 俚) unnamed things... 东西、 财物、 活动、 题材等: ...
处理方式：
  1. 先切掉习语（idm）/ 短语动词（phr v）/ 用法说明等非释义段落
  2. 按 ｜ 切成词性块，再按编号 1/2/3 切成义项
  3. 每个义项取第一个冒号之前的部分（之后是例句）
  4. 在该部分里取「首个中文串」= 释义本体（前面是英文释义）
  5. 清洗括号残留、语法标签，去重后用「；」连接
"""
import re
import sys
from pathlib import Path

CJK = r'\u4e00-\u9fa5'

# 中文串：以中文字符开头结尾，中间允许中文、顿号、逗号、分号、空格与各类括号
# （释义常带「（某人[某事物]）」这类补充，括号必须纳入以免断串）
SPAN = re.compile(
    rf'[（(]?[{CJK}][{CJK}、；，,;·\s（）()\[\]［］]*(?:[{CJK}）)\]]|[{CJK}])'
)

# 义项编号：行首或空白后的 1-2 位数字 + 空格
SENSE_NO = re.compile(r'(?:^|(?<=[.\s]))\d{1,2}\s+')

# 非释义噪声（语法标签、交叉引用、泛指词）
NOISE = {
    '习语', '用法', '同上', '见上', '见词条', '反义词', '同义词', '派生词', '缩写', '简称',
    '参见', '详见', '即', '等', '某物', '某人', '某事', '等等', '同上条', '同前', '变体', '异体',
    '尤指', '尤用于', '常用于', '特指', '泛指引', '同上页', '见前', '见后', '同上所述',
}


def cjk_len(s: str) -> int:
    return len(re.findall(rf'[{CJK}]', s))


def clean_gloss(g: str) -> str:
    g = g.strip()
    # 去掉两端残留的括号
    g = g.strip('（）()[]［］、；，,;.。：:· ')
    # 去掉不配对的悬挂括号（如「用某物）塞满某物」）
    while g and g[0] in '）)]':
        g = g[1:].lstrip()
    while g and g[-1] in '（([':
        g = g[:-1].rstrip()
    # 括号总数不配对就全部去掉
    if g.count('（') != g.count('）') or g.count('(') != g.count(')'):
        g = re.sub(r'[（）()\[\]［］]', '', g)
    # 折叠空白
    g = re.sub(r'\s+', ' ', g).strip()
    if cjk_len(g) < 2:
        return ''
    if g in NOISE:
        return ''
    return g


def extract_zh(senses: str) -> list[tuple[int, str]]:
    """返回 [(词性块索引, 中文释义串)]"""
    if not senses:
        return []
    out: list[tuple[int, str]] = []
    blocks = senses.split('｜')
    for bi, block in enumerate(blocks):
        # 习语 / 短语动词 / 用法说明不是「释义」，先切掉
        block = re.split(r'(?:idm\b|phr v\b|习语|短语动词|用法说明)', block, maxsplit=1)[0]
        parts = SENSE_NO.split(' ' + block)
        glosses: list[str] = []
        for part in parts:
            if not part:
                continue
            head = re.split(r'[:：]', part, maxsplit=1)[0]
            if not re.search(rf'[{CJK}]', head):
                continue
            runs = [clean_gloss(m.group(0)) for m in SPAN.finditer(head)]
            runs = [r for r in runs if r]
            if not runs:
                continue
            gloss = runs[-1][:28]
            if cjk_len(gloss) >= 2:
                glosses.append(gloss)
        # 去重保序
        seen = set()
        uniq = []
        for g in glosses:
            if g not in seen:
                seen.add(g)
                uniq.append(g)
        if uniq:
            out.append((bi, '；'.join(uniq[:4])))
    return out


def main():
    p = Path(r'D:\ielts-lexicon\src\data\oxfordLexicon.ts')
    text = p.read_text(encoding='utf-8')
    samples = sys.argv[1:] or [
        'stuff', 'like', 'work', 'run', 'book', 'flat', 'landscape', 'mist', 'core', 'plain', 'equal',
    ]
    for w in samples:
        m = re.search(rf"^  '{re.escape(w)}': '(.*)',$", text, re.M)
        if not m:
            print(f'{w}: not found')
            continue
        raw = m.group(1).replace("\\'", "'")
        f = raw.split('|')
        if len(f) < 8:
            print(f'{w}: bad format')
            continue
        pos, senses, zh = f[2], f[3], f[6]
        print(f'\n【{w}】 pos={pos!r}  oxford.zh={zh!r}')
        for bi, g in extract_zh(senses):
            print(f'  块{bi}: {g}')


if __name__ == '__main__':
    main()