export interface DictionaryProvider {
  id: string;
  name: string;
  shortName: string;
  category: 'bilingual' | 'academic' | 'software' | 'corpus';
  description: string;
  badge: string;
  color: string;
  getUrl: (word: string) => string;
  appUrlScheme?: (word: string) => string;
  isSoftware?: boolean;
}

/**
 * Authoritative World Dictionaries & Software Integration Hub
 * Connects the user directly to premier linguistic reference platforms and desktop/mobile software
 */
export const DICTIONARY_PROVIDERS: DictionaryProvider[] = [
  {
    id: 'cambridge',
    name: '剑桥高阶英汉双解词典',
    shortName: '剑桥词典',
    category: 'bilingual',
    description: '剑桥大学官方权威词典，雅思官方主推双解参考，含真人英音/美音与雅思词阶。',
    badge: 'Cambridge',
    color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    getUrl: (word: string) => `https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${encodeURIComponent(word.trim().toLowerCase())}`,
  },
  {
    id: 'oxford',
    name: '牛津高阶英语词典 (OALD)',
    shortName: '牛津词典',
    category: 'academic',
    description: '全球学术英语标准，精细语境与词性考释，牛津 3000/5000 核心语料库。',
    badge: 'Oxford',
    color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    getUrl: (word: string) => `https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(word.trim().toLowerCase())}`,
  },
  {
    id: 'collins',
    name: '柯林斯高阶英汉双解词典',
    shortName: '柯林斯',
    category: 'academic',
    description: '柯林斯独创整句自然语境释义，五星词频体系，海量母语级学术真实例句。',
    badge: 'Collins',
    color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    getUrl: (word: string) => `https://www.collinsdictionary.com/dictionary/english/${encodeURIComponent(word.trim().toLowerCase())}`,
  },
  {
    id: 'longman',
    name: '朗文当代高级英语辞典 (LDOCE)',
    shortName: '朗文当代',
    category: 'bilingual',
    description: '朗文 9000 常用词标注，以通俗 2000 基础词精准解释一切深奥词汇。',
    badge: 'Longman',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    getUrl: (word: string) => `https://www.ldoceonline.com/dictionary/${encodeURIComponent(word.trim().toLowerCase())}`,
  },
  {
    id: 'webster',
    name: '韦氏大学英语大词典 (Merriam-Webster)',
    shortName: '韦氏词典',
    category: 'academic',
    description: '美国第一权威学术词典，溯源印欧语系词根演变，深层同义词与辨析。',
    badge: 'Webster',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    getUrl: (word: string) => `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word.trim().toLowerCase())}`,
  },
  {
    id: 'youdao',
    name: '网易有道词典 (专业学术版)',
    shortName: '网易有道',
    category: 'bilingual',
    description: '集成柯林斯、真题考点与专业学术汉译，支持即时中文多义项详解。',
    badge: '有道词典',
    color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    getUrl: (word: string) => `https://dict.youdao.com/result?word=${encodeURIComponent(word.trim().toLowerCase())}&lang=en`,
  },
  {
    id: 'eudic',
    name: '欧路词典 (本地客户端联动)',
    shortName: '欧路词典',
    category: 'software',
    description: '国内最广泛使用的离线与专业词典软件，可直接唤起本地电脑或手机客户端。',
    badge: '欧路客户端',
    color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    getUrl: (word: string) => `https://dict.eudic.net/dicts/en/${encodeURIComponent(word.trim().toLowerCase())}`,
    appUrlScheme: (word: string) => `eudic://dict/${encodeURIComponent(word.trim().toLowerCase())}`,
    isSoftware: true,
  },
  {
    id: 'dict_cn',
    name: '海词词典 (中国学习者词典)',
    shortName: '海词词典',
    category: 'bilingual',
    description: '针对中国英语学习者的高频搭配、辨析与考试出现频度详尽分析。',
    badge: '海词',
    color: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
    getUrl: (word: string) => `https://dict.cn/search?q=${encodeURIComponent(word.trim().toLowerCase())}`,
  },
];

/**
 * Open external dictionary or software link
 */
export function openDictionary(provider: DictionaryProvider, word: string): void {
  const targetUrl = provider.getUrl(word);
  if (typeof window !== 'undefined') {
    // If it's a desktop/mobile software provider with a custom protocol scheme
    if (provider.appUrlScheme) {
      const scheme = provider.appUrlScheme(word);
      // Try opening application scheme via hidden iframe/anchor, and fallback to web url
      const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (win) win.opener = null;
      try {
        const link = document.createElement('a');
        link.href = scheme;
        link.click();
      } catch {
        // Fallback already opened in web
      }
      return;
    }

    const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (win) win.opener = null;
  }
}
