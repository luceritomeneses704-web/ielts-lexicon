"""Inspect spanish_data-master.zip structure (v2)."""
import zipfile
import re

z = zipfile.ZipFile(r'D:\spanish_data-master.zip')

lines = z.read('spanish_data-master/sentences.tsv').decode('utf-8', errors='replace').splitlines()

print('=== building lemma->spanish sentences index ===')
lemma_sents = {}
total = 0
for line in lines:
    cols = line.split('\t')
    if len(cols) < 6:
        continue
    es_text = cols[1].strip()
    en_text = cols[0].strip()
    meta = cols[5].strip()
    if not es_text or not meta:
        continue
    total += 1
    # extract unique lemmas from meta tokens
    lemmas = set()
    for token in meta.split(' :'):
        if not token.startswith(':'):
            token = ':' + token
        parts = token.split(',', 1)
        if len(parts) < 2:
            continue
        word_pos = parts[1].strip()
        if '|' in word_pos:
            word, lemma = word_pos.split('|', 1)
            lemmas.add(lemma.strip().lower())
        else:
            lemmas.add(word_pos.strip().lower())
    if not lemmas:
        continue
    for lm in lemmas:
        if not lm or len(lm) > 40:
            continue
        sents = lemma_sents.setdefault(lm, [])
        if len(sents) < 5:
            sents.append((es_text, en_text))

print(f'total processed: {total}, unique lemmas: {len(lemma_sents)}')

# Sample common words
for w in ['casa', 'agua', 'perro', 'hablar', 'ser', 'tener', 'hacer', 'no', 'muy', 'bueno',
          'grande', 'comer', 'cocinar', 'correr', 'cantar', 'estudiar', 'trabajar', 'vivir',
          'lunes', 'martes', 'enero', 'madre', 'padre', 'hermano', 'rojo', 'azul',
          'rápido', 'lento', 'feliz', 'triste', 'amigo', 'música', 'libro', 'escuela']:
    sents = lemma_sents.get(w, [])
    print(f'\n--- {w}: {len(sents)} ---')
    for es, en in sents[:2]:
        print(f'  ES: {es[:90]}')
        print(f'  EN: {en[:90]}')

# top 50 lemmas by count
ranked = sorted(lemma_sents.items(), key=lambda kv: -len(kv[1]))[:50]
print('\n=== top 50 lemmas by sentence count ===')
for w, s in ranked:
    print(f'  {w}: {len(s)}')