#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""诊断西语 gloss → 中文 的匹配过程，看垃圾释义从哪来。"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import fill_spanish_zh as F  # noqa: E402

ox = F.load_oxford()
ec = F.load_ecdict()
dicts = [ox, ec]

cases = [
    ('españa', 'Spain (A country in Southern Europe, including most of the Iberian Peninsula)', 'Peninsular Spain'),
    ('domingo', 'given name', 'surname'),
    ('mingo', 'target ball', ''),
    ('josé', 'given name', '(biblical) Joseph (Eleventh son of Jacob)'),
    ('francia', 'France (A country located primarily in Western Europe)', 'the letter F in the Spanish alphabet'),
]

for word, tr, ed in cases:
    print(f'\n=== {word} ===')
    for label, g in (('translation', tr), ('englishDefinition', ed)):
        if not g:
            continue
        vs = F.gloss_variants(g)
        print(f'  {label}: {g[:50]!r}')
        print(f'    候选: {vs[:8]}')
        hit = None
        for c in vs:
            for nm, d in (('ox', ox), ('ec', ec)):
                if c in d:
                    hit = (c, nm, d[c][:40])
                    break
            if hit:
                break
        print(f'    命中: {hit}')
        print(f'    polish → {F.first_zh(g, dicts)!r}')
