/** 检查英语词库能否为西语英文释义提供中文反查 */
import { findLocalWord, ensureOxfordReady, ensureSpanishReady } from '../src/services/dictionaryService';

async function main() {
  await ensureOxfordReady();
  await ensureSpanishReady();

  // 西语高频词的英文释义
  const glosses = ['house', 'water', 'dog', 'time', 'talk', 'to be', 'to have', 'to go',
    'in', 'with', 'by', 'one', 'what', 'letter: d', 'she', 'he', 'that'];

  console.log('== 英文词库中文反查能力 ==');
  for (const g of glosses) {
    const en = findLocalWord(g, 'en');
    const zh = en?.translation || '';
    const hasZh = /[一-龥]/.test(zh);
    console.log(`  ${hasZh ? '✓' : '✗'} ${String(g).padEnd(12)} → ${zh.slice(0, 40) || '(无中文)'}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });