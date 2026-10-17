#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试牛津旧式音标 → IPA 转换规则（与 TS 实现保持一致）

OALD 旧式音标系统（源自 PDF 语料的符号统计）：
  5/9 = 重音标记（5 主重音ˈ；9 多为次重音ˌ）、` = 次重音ˌ
  ; 分隔英式/美式（取英式段）
  长组合: i:→iː u:→uː E:→ɜː O:/R:→ɔː A:/B:→ɑː
         EI→eɪ AI→aɪ OI→ɔɪ EU→əʊ AU→aʊ IE→ɪə UE→ʊə EA→eə
  单元音: I→ɪ A→æ Q/C→ɒ U→ʊ R→ɔ B→ɑ
  辅音:   W→θ T→ð F→ʃ V→ʒ D→dʒ N→ŋ J→j Z→r L→əl
  E → e（主重音后首音节）或 ə（其余位置，含词尾）
"""

PLACEHOLDER_OPEN = '\x01'
PLACEHOLDER_CLOSE = '\x02'


def oxford_ph_to_ipa(raw: str) -> str:
    if not raw:
        return ''
    # TS 字符串已反转义；测试时若传入未反转义的原始串，先处理
    seg = raw.split(';')[0].strip()
    seg = seg.replace('?@', '').replace('-', '')
    if not seg:
        return ''

    longs = [
        ('i:', 'iː'), ('u:', 'uː'), ('E:', 'ɜː'), ('\\:', 'ɜː'),
        ('O:', 'ɔː'), ('R:', 'ɔː'), ('B:', 'ɑː'), ('A:', 'ɑː'),
        ('EI', 'eɪ'), ('AI', 'aɪ'), ('OI', 'ɔɪ'), ('EU', 'əʊ'), ('AU', 'aʊ'),
        ('IE', 'ɪə'), ('UE', 'ʊə'), ('EA', 'eə'),
    ]
    # 占位符用字母索引（避免数字 5/9 与重音标记冲突）
    placeholders = {}
    tmp = seg
    for i, (a, b) in enumerate(longs):
        key = f'{PLACEHOLDER_OPEN}{chr(97 + i)}{PLACEHOLDER_CLOSE}'
        if a in tmp:
            tmp = tmp.replace(a, key)
            placeholders[key] = b

    out = []
    last_stress_idx = -1
    n = len(tmp)
    i = 0
    while i < n:
        ch = tmp[i]
        if ch == '5':
            out.append('ˈ')
            last_stress_idx = i
            i += 1
            continue
        if ch == '9':
            out.append('ˌ')
            last_stress_idx = i
            i += 1
            continue
        if ch == '`':
            out.append('ˌ')
            last_stress_idx = i
            i += 1
            continue
        if ch == 'E':
            # E 之后到字符串结束是否还有元音
            rest_has_vowel = any(tmp[k] in 'AEIOU' for k in range(i + 1, n))
            # 主重音之后到 E 之间是否有其他元音
            stress_to_e_has_vowel = any(
                tmp[k] in 'AEIOU' for k in range(last_stress_idx + 1, i)
            )
            # 主重音后第一个音节（且非词尾最后一个元音）→ e；其余 → ə
            is_first_after_stress = last_stress_idx >= 0 and not stress_to_e_has_vowel
            out.append('e' if (is_first_after_stress and rest_has_vowel) else 'ə')
            i += 1
            continue
        out.append(ch)
        i += 1

    s = ''.join(out)
    singles = {
        'I': 'ɪ', 'A': 'æ', 'Q': 'ɒ', 'C': 'ɒ', 'U': 'ʊ', 'R': 'ɔ', 'B': 'ɑ',
        'W': 'θ', 'T': 'ð', 'F': 'ʃ', 'V': 'ʒ', 'D': 'dʒ', 'N': 'ŋ',
        'J': 'j', 'Z': 'r', 'L': 'əl',
    }
    for a, b in singles.items():
        s = s.replace(a, b)
    for key, b in placeholders.items():
        s = s.replace(key, b)
    return s


if __name__ == '__main__':
    import re
    src = open(r'D:\ielts-lexicon\src\data\oxfordLexicon.ts', encoding='utf-8').read()
    body = src[src.index('OXFORD_LEXICON: Record<string, string> = {'):]
    pat = re.compile(r"'((?:[^'\\]|\\.)*)': '((?:[^'\\]|\\.)*)',")
    d = {}
    for m in pat.finditer(body):
        # TS 字符串反转义（模拟运行时）
        key = m.group(1).replace('\\\\', '\\').replace("\\'", "'")
        val = m.group(2).replace('\\\\', '\\').replace("\\'", "'")
        d[key] = val
    expect = {
        'forget': 'fəˈget', 'abandon': 'əˈbændən', 'climate': 'ˈklaɪmɪt',
        'computer': 'kəmˈpjuːtə(r)', 'police': 'pəˈliːs', 'main': 'meɪn',
        'high': 'haɪ', 'seven': 'ˈsevn', 'region': 'ˈriːdʒən',
        'theatre': 'ˈθɪətə(r)', 'their': 'ðeə(r)', 'three': 'θriː',
        'third': 'θɜːd', 'sheet': 'ʃiːt', 'plant': 'plɑːnt', 'north': 'nɔːθ',
        'point': 'pɔɪnt', 'upon': 'əˈpɒn', 'post': 'pəʊst', 'tree': 'triː',
        'recent': 'ˈriːsnt', 'situation': 'ˌsɪtʃʊˈeɪʃn', 'village': 'ˈvɪlɪdʒ',
        'represent': 'ˌreprɪˈzent', 'student': 'ˈstjuːdnt', 'solution': 'səˈluːʃn',
        'various': 'ˈveəriəs', 'television': 'ˌtelɪvɪʒn',
    }
    ok = 0
    for k, exp in expect.items():
        if k in d:
            f = d[k].split('|')
            got = oxford_ph_to_ipa(f[1])
            mark = '✓' if got == exp else '≈'
            if got == exp:
                ok += 1
            print(f'{mark} {k:<12} raw={f[1]:<24} → /{got}/   expect /{exp}/')
    print(f'\nexact match: {ok}/{len(expect)}')
