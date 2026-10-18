#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""对比三种取串策略（first / last / longest）的释义质量。"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import extract_oxford_zh as m  # noqa: E402


def extract(senses: str, mode: str):
    out = []
    for bi, block in enumerate(senses.split('｜')):
        block = re.split(r'(?:idm\b|phr v\b|习语|短语动词|用法说明)', block, maxsplit=1)[0]
        gs = []
        for part in m.SENSE_NO.split(' ' + block):
            if not part:
                continue
            head = re.split(r'[:：]', part, maxsplit=1)[0]
            if not re.search(rf'[{m.CJK}]', head):
                continue
            runs = [m.clean_gloss(x.group(0)) for x in m.SPAN.finditer(head)]
            runs = [r for r in runs if r]
            if not runs:
                continue
            if mode == 'first':
                g = runs[0]
            elif mode == 'last':
                g = runs[-1]
            else:
                g = max(runs, key=m.cjk_len)
            gs.append(g[:28])
        seen, u = set(), []
        for g in gs:
            if g not in seen:
                seen.add(g)
                u.append(g)
        if u:
            out.append((bi, '；'.join(u[:4])))
    return out


def main():
    text = Path(r'D:\ielts-lexicon\src\data\oxfordLexicon.ts').read_text(encoding='utf-8')
    words = ['stuff', 'like', 'landscape', 'equal', 'mist', 'plain', 'work', 'run', 'core']
    for w in words:
        hit = re.search(r"^  '" + re.escape(w) + r"': '(.*)',$", text, re.M)
        if not hit:
            continue
        f = hit.group(1).replace("\\'", "'").split('|')
        if len(f) < 8:
            continue
        print(f'\n【{w}】 pos={f[2]}')
        for mode in ('first', 'last', 'longest'):
            segs = extract(f[3], mode)
            joined = ' ‖ '.join(g for _, g in segs)
            print(f'  {mode:8s}: {joined[:150]}')


if __name__ == '__main__':
    main()