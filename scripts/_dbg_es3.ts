/** 验证屈折解析与原形标注 */
import { findLocalWord, resolveSpanishInflection, ensureSpanishReady } from '../src/services/dictionaryService';

async function main() {
  await ensureSpanishReady();

  const cases = [
    'dias', 'días', 'casas', 'perros', 'hablo', 'habló', 'hablar',
    'comemos', 'comer', 'niños', 'mujeres', 'grandes', 'hablando', 'comiendo',
    'hablado', 'comido', 'manana', 'mañana', 'estas', 'estás',
  ];

  console.log('== 屈折解析结果 ==');
  for (const c of cases) {
    const hit = findLocalWord(c, 'es');
    const note = hit?.isInflectedForm
      ? `变形：原形 = ${hit.word}${hit.inflectionNote ? ' · ' + hit.inflectionNote : ''}`
      : '原形';
    console.log(
      `  ${String(c).padEnd(12)} → ${String(hit?.word ?? 'NOT FOUND').padEnd(14)} | ${note}`
    );
  }
}

main().catch(e => { console.error(e); process.exit(1); });