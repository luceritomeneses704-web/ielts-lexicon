export interface WordGroup {
  id: string;
  name: string;
  createdAt: number;
}

export interface CollocationItem {
  phrase: string;
  translation: string;
}

export interface AggregatedDictionaryEntry {
  dictionary: string; // e.g. '剑桥高阶词典', '牛津高阶词典', '柯林斯词典', '朗文当代词典', '网易有道词典'
  shortName: string; // '剑桥', '牛津', '柯林斯', '朗文', '有道'
  badge: string; // 'Cambridge', 'Oxford', 'Collins', 'Longman', 'Youdao'
  color: string;
  pos?: string;
  levelTag?: string; // e.g. 'C1 · 雅思必背', 'Oxford 3000', 'Collins ★★★★★', 'Longman W1/S1'
  definition: string; // Chinese or bilingual definition
  englishDefinition?: string; // English definition
  example?: string; // Example sentence from that specific dictionary
  exampleTranslation?: string;
}

export interface RealExamCitation {
  source: string; // e.g. '剑雅真题 18 · Test 2 Reading 3 《城市微气候与低碳建筑》'
  section: 'Reading' | 'Writing' | 'Listening' | 'Speaking';
  questionType?: string; // e.g. 'List of Headings 标题匹配', 'Summary 摘要填空', 'Task 2 考官范文得分语块'
  sentence: string; // 雅思官方真题原文考句
  translation: string; // 权威中文解析与专业翻译
  testPointAnalysis?: string; // 雅思考点透析与破题要点
}

export interface WordItem {
  id: string;
  word: string;
  phonetic: string;
  audioUrl?: string; // Native speaker MP3 recording URL
  pos: string; // Part of speech: v. / adj. / n. / adv.
  translation: string; // Chinese meaning
  englishDefinition: string; // English definition
  ieltsBand: 'Band 6.0' | 'Band 6.5' | 'Band 7.0' | 'Band 7.5' | 'Band 8.0+' | '基础核心词';
  topic: '环境生态' | '科技媒体' | '学术教育' | '社会文化' | '经济工作' | '政府法律' | '心理生活';
  example: string; // Authentic IELTS Academic reading/writing sentence
  exampleTranslation: string; // Professional Chinese translation of example
  examContextTag?: string; // e.g., '剑雅真题 · Task 2 范文', '学术阅读原刊', '真题高频考点'
  sourceBadge?: string; // e.g., '网易有道 · 剑桥 · 牛津 · 柯林斯多词典汇总'
  collocations: CollocationItem[]; // Academic collocations with Chinese annotations
  synonyms: string[];
  antonyms?: string[];
  realExamCitations?: RealExamCitation[]; // 剑桥雅思 4-19 官方真题库真实考点与题源还原
  notes?: string; // User personal study note
  lookupCount: number;
  addedAt: number; // timestamp
  lastLookedUpAt: number; // timestamp
  mastered: boolean; // whether memorized
  starred: boolean; // user favorite
  isCustom?: boolean; // manually added by user
  groupId?: string; // Associated group ID (default: 'default')
  oxfordReal?: OxfordRealEntry; // Authentic OALD entry data (from src/data/oxfordLexicon.ts)
  derivedWords?: string[]; // Derived word forms (e.g. abandoned, abandonment)
  aggregatedDictionaries?: AggregatedDictionaryEntry[]; // Direct multi-dictionary data aggregated in-page
  /** 词条所属词典语言：en=英语（默认）/ es=西语 */
  lang?: 'en' | 'es';
  /** 西语词频排名（1 = 最高频，来自 frequency.csv） */
  frequencyRank?: number;
  /** 多例句（西语词典使用，最多 5 条） */
  examples?: [string, string][];
  /** 固定搭配（西语词典使用） */
  phrases?: [string, string][];
  /** 命中屈折形式（如 días）而非原形时置 true */
  isInflectedForm?: boolean;
  /** 屈折说明，如「复数形式 (-s)」/「动词变位形式」 */
  inflectionNote?: string;
  /** 用户实际输入的原词形（如 flirting），用于提示「flirting 是 flirt 的现在分词」 */
  lookupForm?: string;
  /** 中文释义（西语词条由英文 gloss 反查英语词库得到；英语词条与 translation 相同） */
  chineseTranslation?: string;
}

export type ViewMode = 'dict' | 'notebook' | 'review';

export type FilterCategory = 'all' | 'need_review' | 'mastered' | 'starred';

/** App 词典类型：en=英语雅思词典 / es=西语词典 */
export type DictionaryLang = 'en' | 'es';

/**
 * 牛津高阶英汉双解词典（OALD）真实词条数据
 * 来自 scripts/parse_oxford_dict.py 解析 DICT.zip 语料生成的 src/data/oxfordLexicon.ts
 */
export interface OxfordRealEntry {
  /** 显示词头（保留原始大小写，如 January / Oxford） */
  display: string;
  /** 音标（保留牛津原记法，如 5beIbI; `bebI） */
  ph: string;
  /** 词性，如 v. / adj. / n. */
  pos: string;
  /** 完整义项文本（编号义项 + 英英释义 + 中文释义 + 行内例句） */
  senses: string;
  /** 精选例句 [英文, 中文][] */
  ex: Array<[string, string]>;
  /** 英文主释义 */
  en: string;
  /** 中文主释义 */
  zh: string;
  /** 派生词 */
  der: string[];
}
