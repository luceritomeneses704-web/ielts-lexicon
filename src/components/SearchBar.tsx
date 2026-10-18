import React, { useState, useEffect, useRef } from 'react';
import { Search, X, CornerDownLeft, Folder, Plus, Globe, Sparkles } from 'lucide-react';
import { WordItem, WordGroup, DictionaryLang } from '../types/dictionary';
import { getInstantSuggestions, fetchRemoteSuggestions, esFuzzySearch } from '../services/dictionaryService';

interface SearchBarProps {
  onSearch: (word: string) => void;
  isLoading?: boolean;
  groups?: WordGroup[];
  activeGroupId?: string;
  onSelectActiveGroup?: (groupId: string) => void;
  onCreateGroup?: (name: string) => void;
  /** 当前词典语言：es 时仅走本地西语词库（不做英语远程联想） */
  lang?: DictionaryLang;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  isLoading,
  groups = [],
  activeGroupId = 'default',
  onSelectActiveGroup,
  onCreateGroup,
  lang = 'en',
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<WordItem[]>([]);
  const [fuzzySuggestions, setFuzzySuggestions] = useState<WordItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isQuickCreatingGroup, setIsQuickCreatingGroup] = useState(false);
  const [quickGroupName, setQuickGroupName] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Global shortcut to focus search input: '/' or 'Cmd+K' (desktop only)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Instant response on input change + live remote suggestions
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);
    const clean = text.trim();
    if (clean.length > 0) {
      const localResults = getInstantSuggestions(clean, 6, lang);
      setSuggestions(localResults);
      // 西语词典：模糊联想（b/v、g/j、ll/y、c/s/z 同族）——新手拼错仍能找到词
      if (lang === 'es') {
        const exactHits = new Set(localResults.map(r => r.word.toLowerCase()));
        const fuzzy = esFuzzySearch(clean, 6).filter(r => !exactHits.has(r.word.toLowerCase()));
        setFuzzySuggestions(fuzzy);
      } else {
        setFuzzySuggestions([]);
      }
      setIsOpen(true);
      setSelectedIndex(-1);

      // 西语词典不做英语远程联想（会混入无关英文词）
      if (lang === 'es') return;

      // Concurrently query remote suggestions for ANY word
      fetchRemoteSuggestions(clean)
        .then(remoteList => {
          if (!remoteList || remoteList.length === 0) return;
          setSuggestions(prev => {
            const seen = new Set(prev.map(p => p.word.toLowerCase()));
            const extra: WordItem[] = [];
            for (const r of remoteList) {
              const wLower = r.word.toLowerCase();
              if (!seen.has(wLower)) {
                seen.add(wLower);
                extra.push({
                  id: `remote_${wLower}`,
                  word: r.word,
                  phonetic: `/${r.word}/`,
                  pos: '词汇',
                  translation: r.translation || '权威词库在线解析',
                  englishDefinition: `Authoritative entry for ${r.word}`,
                  ieltsBand: 'Band 7.0',
                  topic: '社会文化',
                  example: '',
                  exampleTranslation: '',
                  collocations: [],
                  synonyms: [],
                  lookupCount: 1,
                  addedAt: Date.now(),
                  lastLookedUpAt: Date.now(),
                  mastered: false,
                  starred: false,
                });
              }
            }
            return [...prev, ...extra].slice(0, 8);
          });
        })
        .catch(() => {});
    } else {
      setSuggestions([]);
      setFuzzySuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSelectWord = (word: string) => {
    setQuery(word);
    setIsOpen(false);
    // Dismiss mobile soft keyboard
    inputRef.current?.blur();
    onSearch(word);
  };

  const totalList = suggestions.length + fuzzySuggestions.length;
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totalList > 0) {
        setSelectedIndex(prev => (prev < totalList - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totalList > 0) {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : totalList - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target =
        selectedIndex >= 0 && selectedIndex < suggestions.length
          ? suggestions[selectedIndex]
          : selectedIndex >= suggestions.length && selectedIndex < totalList
          ? fuzzySuggestions[selectedIndex - suggestions.length]
          : null;
      if (target) {
        handleSelectWord(target.word);
      } else if (query.trim()) {
        handleSelectWord(query.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleQuickCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickGroupName.trim() && onCreateGroup) {
      onCreateGroup(quickGroupName.trim());
      setQuickGroupName('');
      setIsQuickCreatingGroup(false);
    }
  };

  return (
    <div ref={containerRef} className="w-full relative max-w-2xl mx-auto space-y-1.5">
      {/* Target Active Notebook indicator - Responsive for Mobile */}
      {groups.length > 0 && onSelectActiveGroup && (
        <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 px-1 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <Folder className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="shrink-0 text-zinc-500 hidden sm:inline">归入生词本:</span>
            <span className="shrink-0 text-zinc-500 sm:hidden">归入:</span>
            <select
              value={activeGroupId}
              onChange={e => onSelectActiveGroup(e.target.value)}
              className="bg-white border border-zinc-200 text-xs rounded-md px-2 py-1 text-zinc-800 font-medium focus:outline-none hover:border-zinc-300 transition-colors cursor-pointer truncate max-w-[160px] sm:max-w-[220px]"
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {!isQuickCreatingGroup && onCreateGroup && (
            <button
              onClick={() => setIsQuickCreatingGroup(true)}
              className="text-xs text-zinc-600 hover:text-zinc-950 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-zinc-100 min-h-[32px] shrink-0"
            >
              <Plus className="w-3 h-3 text-zinc-500" />
              <span>新建生词本</span>
            </button>
          )}
        </div>
      )}

      {/* Quick create inline form - Mobile touch optimized */}
      {isQuickCreatingGroup && (
        <form onSubmit={handleQuickCreateSubmit} className="flex items-center gap-2 p-2 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs animate-fadeIn flex-wrap sm:flex-nowrap">
          <span className="text-zinc-700 shrink-0 font-medium">名称:</span>
          <input
            type="text"
            autoFocus
            value={quickGroupName}
            onChange={e => setQuickGroupName(e.target.value)}
            placeholder={lang === 'es' ? '如 动词短语、旅行...' : '如《经济学人》、电影名或剑雅18...'}
            className="flex-1 min-w-[180px] px-2.5 py-1.5 text-xs bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
          />
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              type="submit"
              disabled={!quickGroupName.trim()}
              className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg disabled:opacity-40 transition-colors min-h-[34px]"
            >
              创建
            </button>
            <button
              type="button"
              onClick={() => {
                setIsQuickCreatingGroup(false);
                setQuickGroupName('');
              }}
              className="text-zinc-400 hover:text-zinc-600 px-2 py-1.5 min-h-[34px]"
            >
              取消
            </button>
          </div>
        </form>
      )}

      {/* Search Input Box */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-zinc-900 transition-colors">
          <Search className="w-4 sm:w-5 h-4 sm:h-5" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => {
            if (query.trim().length > 0) {
              const base = getInstantSuggestions(query, 6, lang);
              setSuggestions(base);
              if (lang === 'es') {
                const exactHits = new Set(base.map(r => r.word.toLowerCase()));
                setFuzzySuggestions(esFuzzySearch(query, 6).filter(r => !exactHits.has(r.word.toLowerCase())));
              }
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={lang === 'es' ? '输入西语单词' : '输入英语单词'}
          className="w-full pl-10 sm:pl-11 pr-24 py-3 sm:py-3.5 bg-white border border-zinc-200/90 hover:border-zinc-300 focus:border-zinc-900 focus:outline-none rounded-xl text-sm sm:text-base text-zinc-900 placeholder:text-zinc-400 font-sans shadow-sm transition-all"
        />

        <div className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center gap-1">
          {query && (
            <button
              onClick={handleClear}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center touch-manipulation"
              title="清除"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => query.trim() && handleSelectWord(query.trim())}
            disabled={!query.trim()}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none rounded-lg transition-colors min-h-[36px] active:scale-95 touch-manipulation"
          >
            <span>查词</span>
            <CornerDownLeft className="w-3 h-3 text-zinc-400 hidden sm:inline" />
          </button>
        </div>
      </div>


      {/* Autocomplete Instant Dropdown - Mobile Touch Optimized */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-zinc-200 rounded-xl shadow-xl z-40 overflow-hidden divide-y divide-zinc-100">
          {/* Universal direct lookup button */}
          <button
            onClick={() => handleSelectWord(query.trim())}
            className="w-full text-left px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3 bg-zinc-50/60 hover:bg-zinc-100/80 transition-colors border-b border-zinc-100 touch-manipulation"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-editorial text-sm sm:text-base font-semibold text-zinc-950 truncate">
                查词: “{query.trim()}”
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono shrink-0">
              即时查词
            </span>
          </button>

          {suggestions.length > 0 && (
            <div className="max-h-60 sm:max-h-64 overflow-y-auto overscroll-contain">
              {suggestions.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectWord(item.word)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 transition-colors active:bg-zinc-100 touch-manipulation ${
                      isSelected ? 'bg-zinc-100' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="font-editorial text-base font-medium text-zinc-950 truncate">
                        {item.word}
                      </span>
                      {item.phonetic && (
                        <span className="text-xs text-zinc-400 font-mono shrink-0 hidden sm:inline">
                          {item.phonetic}
                        </span>
                      )}
                      <span className="text-xs text-zinc-600 truncate">
                        {item.translation}
                      </span>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 text-xs text-zinc-400">
                      <span className="font-mono text-[11px] text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">
                        {item.ieltsBand || '词汇'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 西语模糊联想：b/v、g/j、ll/y、c/s/z 同族联想，新手拼错也能找到 */}
          {fuzzySuggestions.length > 0 && (
            <div className="bg-amber-50/40">
              <div className="px-3.5 sm:px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-amber-700 font-semibold flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                你是不是要找？<span className="text-amber-600 font-normal normal-case">（模糊联想 · 拼写相近词）</span>
              </div>
              <div className="max-h-48 overflow-y-auto overscroll-contain">
                {fuzzySuggestions.map((item, idx) => {
                  const realIdx = suggestions.length + idx;
                  const isSelected = realIdx === selectedIndex;
                  return (
                    <button
                      key={`fz_${item.id}`}
                      onClick={() => handleSelectWord(item.word)}
                      onMouseEnter={() => setSelectedIndex(realIdx)}
                      className={`w-full text-left px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 transition-colors active:bg-amber-100/60 touch-manipulation ${
                        isSelected ? 'bg-amber-100/60' : 'hover:bg-amber-50/80'
                      }`}
                    >
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="font-editorial text-base font-medium text-zinc-950 truncate">
                          {item.word}
                        </span>
                        <span className="text-xs text-zinc-600 truncate">
                          {item.translation}
                        </span>
                      </div>
                      <span className="shrink-0 text-[10px] text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded font-mono">
                        #{item.frequencyRank}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
