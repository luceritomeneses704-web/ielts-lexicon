#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""校验构建产物里西语词条的最终内容。"""
import glob
import re
import sys

f = glob.glob(r'D:\ielts-lexicon\dist\assets\spanish-lexicon-*.js')[0]
raw = open(f, encoding='utf-8', errors='replace').read()


def entry(w):
    """按词边界取出词条（mingo 不能匹配到 domingo 里）"""
    for m in re.finditer(re.escape(w) + r':\{pos:', raw):
        i = m.start()
        if i > 0 and re.match(r'[a-zà-ÿ]', raw[i - 1], re.I):
            continue
        seg = raw[i:i + 200]
        pos = re.search(r'pos:`([^`]*)`', seg)
        tr = re.search(r'translation:`([^`]*)`', seg)
        zh = re.search(r'chineseTranslation:`([^`]*)`', seg)
        return (pos.group(1) if pos else '?',
                tr.group(1) if tr else '?',
                zh.group(1) if zh else '?')
    return None


print(f'chunk: {f.split(chr(92))[-1]}  {len(raw)/1024/1024:.2f} MB\n')

groups = {
    '你点出的两个词': ['mingo', 'domingo'],
    '星期 / 月份': ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado',
                   'enero', 'mayo', 'diciembre', 'septiembre'],
    '颜色 / 亲属 / 国家': ['rojo', 'azul', 'verde', 'negro',
                          'padre', 'madre', 'hermano', 'hija',
                          'españa', 'francia', 'méxico', 'china'],
    '之前修过的词': ['aparcar', 'semifinal', 'sangriento', 'gastar', 'mango', 'manga'],
    '普通词': ['casa', 'agua', 'tiempo', 'comer', 'libro', 'perro'],
    '不应显示英文 gloss 的词': ['josé', 'carlos', 'antonio'],
}

ok = 0
bad = []
for title, words in groups.items():
    print(f'=== {title} ===')
    for w in words:
        e = entry(w)
        if not e:
            print(f'  {w:<12} !! 未找到词条')
            bad.append(w)
            continue
        pos, en, zh = e
        print(f'  {w:<12} pos={pos:<10} EN={en[:30]:<32} ZH={zh[:30]}')
        if zh and zh != '?':
            ok += 1
    print()

print(f'有中文释义的词条: {ok}')
if bad:
    print('未找到:', bad)
    sys.exit(1)
