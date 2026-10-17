"""Smoke tests for Spanish fuzzy match + click-to-annotate data layer."""
import json
import sys
sys.path.insert(0, '.')


def assert_eq(a, b, msg):
    if a == b:
        print(f'  PASS {msg}')
    else:
        print(f'  FAIL {msg}  expect={b!r}  got={a!r}')


def main():
    # Load
    data = json.load(open('scripts/spanish_raw.json', encoding='utf-8'))
    print(f'spanish_raw.json: {len(data)} entries')

    # 1. examples field present and meaningful
    with_5_examples = sum(1 for e in data if len(e.get('examples', [])) >= 5)
    assert_eq(with_5_examples > 5000, True, f'many entries have >=5 examples (got {with_5_examples})')

    # 2. phrases field present and curated
    with_phrases = sum(1 for e in data if len(e.get('phrases', [])) >= 3)
    assert_eq(with_phrases > 50, True, f'many entries have curated phrases (got {with_phrases})')

    # 3. Sample examples quality
    for w in ['casa', 'agua', 'perro', 'hablar', 'ser', 'tener', 'hacer']:
        ent = [e for e in data if e['word'] == w]
        if not ent:
            print(f'  FAIL {w}: missing')
            continue
        e = ent[0]
        n_ex = len(e['examples'])
        n_ph = len(e['phrases'])
        ok = n_ex >= 3 and n_ph >= 3
        print(f'  {"PASS" if ok else "FAIL"} {w}: examples={n_ex}, phrases={n_ph}')

    # 4. Fixed expressions of common lemmas
    for w in ['tener', 'hacer', 'ser', 'estar', 'ir', 'dar', 'poner', 'saber', 'no', 'muy', 'bueno']:
        ent = [e for e in data if e['word'] == w]
        if not ent:
            continue
        e = ent[0]
        cur = [p for p in e['phrases'] if any(c in p[0] for c in ['+', '...'])]
        print(f'  {"PASS" if cur else "WARN"} {w}: grammatical patterns = {len(cur)}  e.g. {cur[:2]}')


if __name__ == '__main__':
    main()