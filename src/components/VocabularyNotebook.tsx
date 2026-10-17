import React, { useState, useMemo } from 'react';
import { WordItem, WordGroup, FilterCategory, DictionaryLang } from '../types/dictionary';
import { playPronunciation, normalizeCollocation } from '../services/dictionaryService';
import {
  Search,
  Bookmark,
  CheckCircle2,
  Trash2,
  Volume2,
  Edit3,
  CheckSquare,
  Square,
  BookOpen,
  Plus,
  Folder,
  FolderPlus,
  Settings2,
  X,
  Check,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { getAllMasterWords, getAllSpanishWords } from '../services/dictionaryService';

interface VocabularyNotebookProps {
  words: WordItem[];
  groups: WordGroup[];
  onSelectWord: (word: WordItem) => void;
  onToggleStar: (id: string) => void;
  onToggleMastered: (id: string) => void;
  onDeleteWord: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onEditWord: (word: WordItem) => void;
  onAssignGroup: (wordId: string, groupId: string) => void;
  onBatchAssignGroup: (wordIds: string[], groupId: string) => void;
  onCreateGroup: (name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  preferredAccent: 'UK' | 'US';
  onSaveWord?: (word: WordItem) => void;
  /** 当前词典语言：es 时浏览西语词库、发音走西语 TTS */
  lang?: DictionaryLang;
}

export const VocabularyNotebook: React.FC<VocabularyNotebookProps> = ({
  words,
  groups,
  onSelectWord,
  onToggleStar,
  onToggleMastered,
  onDeleteWord,
  onDeleteMultiple,
  onEditWord,
  onAssignGroup,
  onBatchAssignGroup,
  onCreateGroup,
  onDeleteGroup,
  onRenameGroup,
  preferredAccent,
  onSaveWord,
  lang = 'en',
}) => {
  const [libraryMode, setLibraryMode] = useState<'my_notebook' | 'master_lexicon'>('my_notebook');
  const allMasterWords = useMemo(
    () => (lang === 'es' ? getAllSpanishWords() : getAllMasterWords()),
    [lang]
  );
  const savedWordSet = useMemo(() => new Set(words.map(w => w.word.toLowerCase())), [words]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [selectedBand, setSelectedBand] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'frequency' | 'alpha'>('recent');

  const filteredMasterWords = useMemo(() => {
    return allMasterWords.filter(w => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchWord = w.word.toLowerCase().includes(q);
        const matchTrans = w.translation.toLowerCase().includes(q);
        const matchExample = w.example.toLowerCase().includes(q);
        if (!matchWord && !matchTrans && !matchExample) return false;
      }
      if (selectedBand !== 'all' && w.ieltsBand !== selectedBand) return false;
      if (selectedTopic !== 'all' && w.topic !== selectedTopic) return false;
      return true;
    }).sort((a, b) => a.word.localeCompare(b.word));
  }, [allMasterWords, searchQuery, selectedBand, selectedTopic]);

  // Group creation & management UI states
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isManagingGroups, setIsManagingGroups] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  // Batch selection state
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConfirmingBatchDelete, setIsConfirmingBatchDelete] = useState(false);
  const [batchTargetGroup, setBatchTargetGroup] = useState<string>('');

  // Single word inline delete confirmation ID
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Quick group dropdown popover on card
  const [activeWordGroupPickerId, setActiveWordGroupPickerId] = useState<string | null>(null);

  // Metrics
  const totalCount = words.length;
  const masteredCount = words.filter(w => w.mastered).length;
  const needReviewCount = totalCount - masteredCount;
  const starredCount = words.filter(w => w.starred).length;

  // Groups lookup map
  const groupMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) {
      map.set(g.id, g.name);
    }
    return map;
  }, [groups]);

  // Filtered & Sorted list
  const filteredWords = useMemo(() => {
    return words
      .filter(w => {
        // Group filter
        if (selectedGroupId !== 'all') {
          const wGroup = w.groupId || 'default';
          if (wGroup !== selectedGroupId) return false;
        }

        // Query search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchWord = w.word.toLowerCase().includes(q);
          const matchTrans = w.translation.toLowerCase().includes(q);
          const matchExample = w.example.toLowerCase().includes(q);
          if (!matchWord && !matchTrans && !matchExample) return false;
        }

        // Category filter
        if (activeCategory === 'need_review' && w.mastered) return false;
        if (activeCategory === 'mastered' && !w.mastered) return false;
        if (activeCategory === 'starred' && !w.starred) return false;

        // Band filter
        if (selectedBand !== 'all' && w.ieltsBand !== selectedBand) return false;

        // Topic filter
        if (selectedTopic !== 'all' && w.topic !== selectedTopic) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') {
          return (b.lastLookedUpAt || b.addedAt) - (a.lastLookedUpAt || a.addedAt);
        }
        if (sortBy === 'frequency') {
          return (b.lookupCount || 1) - (a.lookupCount || 1);
        }
        if (sortBy === 'alpha') {
          return a.word.localeCompare(b.word);
        }
        return 0;
      });
  }, [words, searchQuery, activeCategory, selectedGroupId, selectedBand, selectedTopic, sortBy]);

  // Submit new group
  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    onCreateGroup(trimmed);
    setNewGroupName('');
    setIsCreatingGroup(false);
  };

  // Submit rename group
  const handleRenameGroupSubmit = (groupId: string) => {
    const trimmed = editingGroupName.trim();
    if (trimmed) {
      onRenameGroup(groupId, trimmed);
    }
    setEditingGroupId(null);
    setEditingGroupName('');
  };

  // Batch toggle
  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.size === filteredWords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredWords.map(w => w.id)));
    }
  };

  const handleExecuteBatchDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.size === 0) return;
    onDeleteMultiple(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsConfirmingBatchDelete(false);
    setIsBatchMode(false);
  };

  const handleExecuteBatchMove = (targetGroupId: string) => {
    if (!targetGroupId || selectedIds.size === 0) return;
    onBatchAssignGroup(Array.from(selectedIds), targetGroupId);
    setSelectedIds(new Set());
    setIsBatchMode(false);
    setBatchTargetGroup('');
  };

  const handleSingleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteWord(id);
    setConfirmDeleteId(null);
  };

  return (
    <section className="w-full max-w-4xl mx-auto space-y-5">
      {/* Mode Switcher: Personal Notebook vs Expanded Master Lexicon (290+ words) */}
      <div className="flex items-center justify-between p-1 bg-zinc-100 rounded-xl max-w-md mx-auto border border-zinc-200/80">
        <button
          onClick={() => setLibraryMode('my_notebook')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            libraryMode === 'my_notebook'
              ? 'bg-white text-zinc-950 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950'
          }`}
        >
          我的生词本 ({words.length})
        </button>
        <button
          onClick={() => setLibraryMode('master_lexicon')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            libraryMode === 'master_lexicon'
              ? 'bg-white text-zinc-950 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>雅思真题词库全集 ({allMasterWords.length})</span>
        </button>
      </div>

      {libraryMode === 'master_lexicon' ? (
        /* ================= MASTER LEXICON FULL BROWSER ================= */
        <div className="space-y-4 animate-fadeIn">
          {/* Search & Filter Header */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-zinc-700" />
                <h3 className="text-sm sm:text-base font-semibold text-zinc-900">
                  官方题库精选全词库
                </h3>
                <span className="text-xs font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                  共收录 {allMasterWords.length} 核心词
                </span>
              </div>
              <span className="text-xs text-zinc-400">
                点击卡片查看5大词典双解与例句
              </span>
            </div>

            {/* Keyword Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="在真题词库中搜索英文、中文或真题语境..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all placeholder:text-zinc-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Topic & Band Filter Row */}
            <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar w-full sm:w-auto">
                <span className="text-zinc-400 shrink-0 font-medium">话题:</span>
                {[
                  'all',
                  '环境生态',
                  '科技媒体',
                  '学术教育',
                  '社会文化',
                  '经济工作',
                  '政府法律',
                  '心理生活',
                ].map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedTopic(t)}
                    className={`px-2.5 py-1 rounded-lg transition-all shrink-0 font-medium ${
                      selectedTopic === t
                        ? 'bg-zinc-950 text-white shadow-2xs'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200/70'
                    }`}
                  >
                    {t === 'all' ? '全部话题' : t}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1 sm:pt-0">
                <span className="text-zinc-400 shrink-0 font-medium">分段:</span>
                {['all', 'Band 6.5', 'Band 7.0', 'Band 7.5', 'Band 8.0+'].map(b => (
                  <button
                    key={b}
                    onClick={() => setSelectedBand(b)}
                    className={`px-2 py-0.5 rounded-lg transition-all shrink-0 font-mono text-[11px] font-medium ${
                      selectedBand === b
                        ? 'bg-zinc-900 text-white shadow-2xs'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200/70'
                    }`}
                  >
                    {b === 'all' ? '全部' : b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Master Word Cards */}
          <div className="space-y-3">
            <div className="text-xs text-zinc-400 px-1 flex items-center justify-between">
              <span>展示 {filteredMasterWords.length} 个词汇</span>
            </div>

            {filteredMasterWords.map(item => {
              const isSaved = savedWordSet.has(item.word.toLowerCase());
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectWord(item)}
                  className="group bg-white border border-zinc-200/90 hover:border-zinc-300 rounded-2xl p-4 sm:p-5 transition-all hover:shadow-xs cursor-pointer touch-manipulation space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2.5 flex-wrap">
                        <span className="font-editorial text-lg sm:text-xl font-semibold text-zinc-950 group-hover:text-zinc-800">
                          {item.word}
                        </span>
                        <span className="font-editorial text-xs sm:text-sm text-zinc-500 italic">
                          {item.phonetic}
                        </span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            playPronunciation(item.word, preferredAccent, item.audioUrl, item.lang || lang);
                          }}
                          title="发音"
                          className="p-1 text-zinc-400 hover:text-zinc-800 rounded min-w-[28px] min-h-[28px] flex items-center justify-center touch-manipulation"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1 flex-wrap">
                        <span className="font-semibold text-zinc-800 bg-zinc-100 px-1.5 py-0.2 rounded text-[11px]">
                          {item.pos}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200/60 px-1 py-0.2 rounded">
                          {item.ieltsBand}
                        </span>
                        <span className="text-[11px] text-zinc-600 bg-zinc-50 px-1.5 py-0.2 rounded">
                          {item.topic}
                        </span>
                      </div>
                    </div>

                    {/* Quick Add or Saved status */}
                    <div className="shrink-0">
                      {isSaved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>已在生词本</span>
                        </span>
                      ) : (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (onSaveWord) {
                              onSaveWord(item);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-800 hover:text-white bg-zinc-100 hover:bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-200/80 hover:border-zinc-950 transition-all active:scale-95 touch-manipulation min-h-[32px]"
                        >
                          <Plus className="w-3 h-3" />
                          <span>存入生词本</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Primary Chinese Translation & English Definition */}
                  <div className="space-y-0.5">
                    <div className="text-xs sm:text-sm font-medium text-zinc-900 leading-snug">
                      {item.translation}
                    </div>
                    {item.englishDefinition && (
                      <p className="text-xs text-zinc-500 font-sans leading-relaxed line-clamp-2">
                        {item.englishDefinition}
                      </p>
                    )}
                  </div>

                  {/* Authentic IELTS Exam Sentence */}
                  {item.example && (
                    <div className="p-2.5 bg-zinc-50/80 rounded-xl border border-zinc-100 text-xs space-y-1">
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {item.examContextTag || '雅思真题语境'}
                      </div>
                      <div className="font-editorial text-zinc-800 leading-relaxed text-xs sm:text-sm">
                        {item.example}
                      </div>
                      {item.exampleTranslation && (
                        <div className="text-zinc-500 text-[11px] leading-relaxed pt-0.5 border-t border-zinc-200/50">
                          {item.exampleTranslation}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Core Collocations */}
                  {item.collocations && item.collocations.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      <span className="text-[10px] text-zinc-400 font-mono">核心搭配:</span>
                      {item.collocations.slice(0, 3).map((col, idx) => {
                        const c = normalizeCollocation(col);
                        return (
                          <span
                            key={idx}
                            className="text-[11px] text-zinc-700 bg-zinc-100/70 border border-zinc-200/60 px-2 py-0.5 rounded-md font-sans"
                          >
                            <span className="font-medium text-zinc-900">{c.phrase}</span>
                            {c.translation && <span className="text-zinc-500 ml-1">({c.translation})</span>}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ================= PERSONAL NOTEBOOK VIEW ================= */
        <>
      {/* 4-KPI Overview Strip - Desktop Only to keep Mobile ultra-clean and un-cluttered */}
      <div className="hidden sm:grid sm:grid-cols-4 gap-2.5 sm:gap-3 bg-white p-3.5 sm:p-5 border border-zinc-200/90 rounded-2xl shadow-xs">
        <div className="p-2 sm:p-2.5">
          <div className="text-xs text-zinc-500 font-sans">已记录生词</div>
          <div className="font-editorial text-2xl sm:text-3xl font-semibold text-zinc-950 mt-0.5 tabular-nums">
            {totalCount}
          </div>
        </div>

        <div className="p-2 sm:p-2.5">
          <div className="text-xs text-zinc-500 font-sans">待巩固复习</div>
          <div className="font-editorial text-2xl sm:text-3xl font-semibold text-amber-700 mt-0.5 tabular-nums">
            {needReviewCount}
          </div>
        </div>

        <div className="p-2 sm:p-2.5">
          <div className="text-xs text-zinc-500 font-sans">已熟练掌握</div>
          <div className="font-editorial text-2xl sm:text-3xl font-semibold text-emerald-700 mt-0.5 tabular-nums">
            {masteredCount}
          </div>
        </div>

        <div className="p-2 sm:p-2.5">
          <div className="text-xs text-zinc-500 font-sans">重点标星</div>
          <div className="font-editorial text-2xl sm:text-3xl font-semibold text-zinc-950 mt-0.5 tabular-nums">
            {starredCount}
          </div>
        </div>
      </div>

      {/* Groups Management Bar - Mobile Friendly */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
            <Folder className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>我的生词本分类</span>
          </div>

          <div className="flex items-center gap-2">
            {!isCreatingGroup && (
              <button
                onClick={() => setIsCreatingGroup(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:text-zinc-950 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors min-h-[34px] touch-manipulation"
              >
                <FolderPlus className="w-3.5 h-3.5 text-zinc-500" />
                <span>+ 新建生词本</span>
              </button>
            )}

            <button
              onClick={() => setIsManagingGroups(!isManagingGroups)}
              className={`p-1.5 text-xs font-medium border rounded-lg transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center touch-manipulation ${
                isManagingGroups
                  ? 'bg-zinc-950 text-white border-zinc-950'
                  : 'text-zinc-500 hover:text-zinc-900 bg-white border-zinc-200 hover:bg-zinc-50'
              }`}
              title="管理与重命名自定义生词本"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inline Create Group Form */}
        {isCreatingGroup && (
          <form onSubmit={handleCreateGroupSubmit} className="flex items-center gap-2 pt-1 animate-fadeIn flex-wrap sm:flex-nowrap">
            <input
              type="text"
              autoFocus
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="输入生词本名称（如《经济学人》、某电影名或雅思真题18）..."
              className="flex-1 min-w-[200px] px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:bg-white focus:border-zinc-900 focus:outline-none"
            />
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="submit"
                disabled={!newGroupName.trim()}
                className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 rounded-lg transition-colors min-h-[34px]"
              >
                创建
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingGroup(false);
                  setNewGroupName('');
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 min-h-[34px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Group Selector Tabs - Smooth touch scrolling on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap pt-1 pb-1 overscroll-x-contain touch-pan-x">
          {/* All Words option */}
          <button
            onClick={() => setSelectedGroupId('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0 min-h-[36px] active:scale-95 touch-manipulation ${
              selectedGroupId === 'all'
                ? 'bg-zinc-950 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 active:bg-zinc-200'
            }`}
          >
            <span>全部生词</span>
            <span className={`text-[11px] font-mono tabular-nums ${selectedGroupId === 'all' ? 'text-zinc-300' : 'text-zinc-500'}`}>
              ({words.length})
            </span>
          </button>

          {/* Render Each Group Pill */}
          {groups.map(group => {
            const groupWordCount = words.filter(w => (w.groupId || 'default') === group.id).length;
            const isSelected = selectedGroupId === group.id;

            return (
              <button
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0 min-h-[36px] active:scale-95 touch-manipulation ${
                  isSelected
                    ? 'bg-zinc-950 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 active:bg-zinc-200'
                }`}
              >
                <span className="truncate max-w-[120px] sm:max-w-[180px]">{group.name}</span>
                <span className={`text-[11px] font-mono tabular-nums ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  ({groupWordCount})
                </span>
              </button>
            );
          })}
        </div>

        {/* Groups Management Drawer / Panel */}
        {isManagingGroups && (
          <div className="pt-3 border-t border-zinc-100 space-y-2 animate-fadeIn">
            <div className="text-xs font-medium text-zinc-500">生词本命名与维护:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {groups.map(g => (
                <div
                  key={g.id}
                  className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-between gap-2 text-xs"
                >
                  {editingGroupId === g.id ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        autoFocus
                        value={editingGroupName}
                        onChange={e => setEditingGroupName(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs bg-white border border-zinc-300 rounded focus:outline-none"
                      />
                      <button
                        onClick={() => handleRenameGroupSubmit(g.id)}
                        className="px-2 py-1 text-xs bg-zinc-900 text-white rounded font-medium"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingGroupId(null)}
                        className="p-1 text-zinc-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Folder className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="font-medium text-zinc-800 truncate">{g.name}</span>
                        {g.id === 'default' && (
                          <span className="text-[10px] text-zinc-400 shrink-0">(默认)</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingGroupId(g.id);
                            setEditingGroupName(g.name);
                          }}
                          className="p-1 text-zinc-400 hover:text-zinc-700"
                          title="重命名生词本"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {g.id !== 'default' && (
                          <button
                            onClick={() => onDeleteGroup(g.id)}
                            className="p-1 text-zinc-400 hover:text-red-600"
                            title="删除此生词本（其中单词将合并归入默认生词本）"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search, Filter Category & Batch Toolbar */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Quick local search inside notebook */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="在当前生词本中检索单词或释义..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Batch Mode Toggle & Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'recent' | 'frequency' | 'alpha')}
              className="text-xs py-2 px-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none cursor-pointer min-h-[36px]"
            >
              <option value="recent">最近查阅排序</option>
              <option value="frequency">查阅频次最高</option>
              <option value="alpha">字母 A-Z 顺序</option>
            </select>

            <button
              onClick={() => {
                setIsBatchMode(!isBatchMode);
                setSelectedIds(new Set());
              }}
              className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors min-h-[36px] flex items-center gap-1 touch-manipulation active:scale-95 ${
                isBatchMode
                  ? 'bg-zinc-950 text-white border-zinc-950'
                  : 'text-zinc-700 hover:text-zinc-950 bg-zinc-50 border-zinc-200'
              }`}
            >
              <span>{isBatchMode ? '退出多选' : '批量操作'}</span>
            </button>
          </div>
        </div>

        {/* Category Tabs & Sub-filters */}
        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
          {/* Primary Category Filter Chips */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors min-h-[32px] whitespace-nowrap active:scale-95 touch-manipulation ${
                activeCategory === 'all'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              全部 ({totalCount})
            </button>
            <button
              onClick={() => setActiveCategory('need_review')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors min-h-[32px] whitespace-nowrap active:scale-95 touch-manipulation ${
                activeCategory === 'need_review'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              待复习 ({needReviewCount})
            </button>
            <button
              onClick={() => setActiveCategory('mastered')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors min-h-[32px] whitespace-nowrap active:scale-95 touch-manipulation ${
                activeCategory === 'mastered'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              已掌握 ({masteredCount})
            </button>
            <button
              onClick={() => setActiveCategory('starred')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors min-h-[32px] whitespace-nowrap active:scale-95 touch-manipulation ${
                activeCategory === 'starred'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              标星 ({starredCount})
            </button>
          </div>

          {/* Secondary Topic & Band Dropdown Filters - Desktop Only */}
          <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
            <select
              value={selectedBand}
              onChange={e => setSelectedBand(e.target.value)}
              aria-label="按雅思分数筛选"
              className="text-xs py-1.5 px-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none min-h-[34px]"
            >
              <option value="all">全部分数段</option>
              <option value="Band 6.5">Band 6.5</option>
              <option value="Band 7.0">Band 7.0</option>
              <option value="Band 7.5">Band 7.5</option>
              <option value="Band 8.0+">Band 8.0+</option>
            </select>

            <select
              value={selectedTopic}
              onChange={e => setSelectedTopic(e.target.value)}
              aria-label="按话题分类筛选"
              className="text-xs py-1.5 px-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none min-h-[34px]"
            >
              <option value="all">全部话题</option>
              <option value="学术教育">学术教育</option>
              <option value="环境生态">环境生态</option>
              <option value="科技媒体">科技媒体</option>
              <option value="社会文化">社会文化</option>
              <option value="经济工作">经济工作</option>
              <option value="政府法律">政府法律</option>
              <option value="心理生活">心理生活</option>
            </select>
          </div>
        </div>

        {/* Batch Operations Bar */}
        {isBatchMode && (
          <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 animate-fadeIn flex-wrap gap-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 hover:text-zinc-950 font-medium min-h-[34px]"
              >
                {selectedIds.size === filteredWords.length ? (
                  <CheckSquare className="w-4 h-4 text-zinc-950" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-400" />
                )}
                <span>全选当前 ({selectedIds.size}/{filteredWords.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Batch Move to Group */}
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500 hidden sm:inline">移至组别:</span>
                <select
                  value={batchTargetGroup}
                  disabled={selectedIds.size === 0}
                  onChange={e => {
                    const target = e.target.value;
                    if (target) handleExecuteBatchMove(target);
                  }}
                  className="px-2 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none min-h-[34px]"
                >
                  <option value="">移至组别...</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Delete */}
              {isConfirmingBatchDelete ? (
                <div className="flex items-center gap-2 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                  <span className="text-red-700 font-medium">确认删除这 {selectedIds.size} 个词？</span>
                  <button
                    onClick={handleExecuteBatchDelete}
                    className="px-2.5 py-1 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors min-h-[32px]"
                  >
                    确认删除
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setIsConfirmingBatchDelete(false);
                    }}
                    className="text-zinc-600 hover:text-zinc-900 px-1 py-1"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (selectedIds.size > 0) setIsConfirmingBatchDelete(true);
                  }}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-40 transition-colors min-h-[34px] touch-manipulation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>删除选中 ({selectedIds.size})</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Word List Cards - Mobile Optimized */}
      {filteredWords.length === 0 ? (
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-10 sm:p-12 text-center space-y-3 shadow-xs">
          <BookOpen className="w-10 h-10 text-zinc-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-medium text-zinc-800">
              {searchQuery ? '没有找到符合条件的单词' : '该组别暂无生词'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              在上方查词栏搜索任意生词，系统将以毫秒级响应自动记录并归纳至您选中的生词本。
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWords.map(item => {
            const isSelected = selectedIds.has(item.id);
            const isConfirmingThisDelete = confirmDeleteId === item.id;
            const currentGroupTitle = groupMap.get(item.groupId || 'default') || '默认分组';
            const isPickerOpen = activeWordGroupPickerId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => onSelectWord(item)}
                className={`group bg-white border rounded-2xl p-4 sm:p-5 transition-all hover:border-zinc-300 hover:shadow-xs cursor-pointer touch-manipulation ${
                  isSelected ? 'border-zinc-950 bg-zinc-50/50' : 'border-zinc-200/90'
                }`}
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  {/* Left Column: Checkbox & Word Info */}
                  <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                    {isBatchMode && (
                      <button
                        onClick={e => toggleSelectOne(item.id, e)}
                        className="mt-1 text-zinc-400 hover:text-zinc-950 shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-zinc-950" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Word & Phonetic Header */}
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-editorial text-lg sm:text-2xl font-medium text-zinc-950 group-hover:text-zinc-700 transition-colors">
                          {item.word}
                        </span>
                        
                        {/* Desktop-only Phonetic & Part of speech tags to keep mobile clean */}
                        <span className="hidden sm:inline font-editorial text-xs sm:text-sm text-zinc-400 italic">
                          {item.phonetic}
                        </span>
                        <span className="hidden sm:inline text-xs text-zinc-500 font-medium">
                          {item.pos}
                        </span>

                        {/* Desktop metadata separator */}
                        <span className="hidden sm:inline text-zinc-300">·</span>
                        <span className="hidden sm:inline text-[11px] sm:text-xs font-mono text-zinc-700 bg-zinc-100 px-1.5 py-0.2 rounded font-medium">
                          {item.ieltsBand}
                        </span>
                        <span className="hidden sm:inline text-zinc-300">·</span>
                        <span className="hidden sm:inline text-[11px] sm:text-xs text-zinc-400">
                          {item.topic}
                        </span>

                        {/* Group Marker Tag */}
                        <span className="hidden sm:inline text-zinc-300">·</span>
                        <div className="relative hidden sm:inline-block" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setActiveWordGroupPickerId(isPickerOpen ? null : item.id);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-950 px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors min-h-[26px]"
                            title="点击更改组别"
                          >
                            <Folder className="w-3 h-3 text-zinc-400" />
                            <span className="truncate max-w-[100px]">{currentGroupTitle}</span>
                          </button>

                          {/* Quick Group Switcher Popover */}
                          {isPickerOpen && (
                            <div className="absolute left-0 mt-1 w-44 bg-white border border-zinc-200 rounded-xl shadow-xl z-30 py-1 animate-fadeIn">
                              <div className="px-3 py-1.5 text-[10px] text-zinc-400 border-b border-zinc-100">
                                更改所属生词本:
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                {groups.map(g => (
                                  <button
                                    key={g.id}
                                    onClick={e => {
                                      e.stopPropagation();
                                      onAssignGroup(item.id, g.id);
                                      setActiveWordGroupPickerId(null);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-zinc-50 ${
                                      (item.groupId || 'default') === g.id
                                        ? 'text-zinc-950 font-semibold bg-zinc-50'
                                        : 'text-zinc-600'
                                    }`}
                                  >
                                    <span className="truncate">{g.name}</span>
                                    {(item.groupId || 'default') === g.id && (
                                      <Check className="w-3.5 h-3.5 text-zinc-950 shrink-0" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Primary Chinese Translation - Clean, prominent, and concise */}
                      <div className="text-sm font-normal sm:font-medium text-zinc-700 sm:text-zinc-900 leading-snug">
                        {item.translation}
                      </div>

                      {/* Desktop only: High-frequency academic collocations preview with Chinese annotations */}
                      {item.collocations && item.collocations.length > 0 && (
                        <div className="hidden sm:flex pt-1.5 flex-wrap gap-1.5 items-center">
                          <Layers className="w-3 h-3 text-zinc-400 shrink-0" />
                          {item.collocations.slice(0, 2).map((col, cIdx) => {
                            const norm = normalizeCollocation(col);
                            return (
                              <span
                                key={cIdx}
                                className="inline-flex items-baseline gap-1 px-2 py-0.5 bg-zinc-50 border border-zinc-200/60 rounded-md text-[11px] text-zinc-700"
                              >
                                <span className="font-editorial font-medium text-zinc-900">{norm.phrase}</span>
                                {norm.translation && (
                                  <span className="text-zinc-500 font-sans">({norm.translation})</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Desktop only: Authentic Example Sentence Snippet */}
                      {item.example && (
                        <p className="hidden sm:block font-editorial text-xs sm:text-sm text-zinc-600 pt-1 line-clamp-2 leading-relaxed">
                          "{item.example}"
                        </p>
                      )}

                      {/* Desktop only: Personal study note if exists */}
                      {item.notes && (
                        <div className="hidden sm:block mt-1.5 text-xs text-zinc-600 bg-zinc-50 border border-zinc-100 p-2 rounded-lg max-w-lg">
                          <span className="font-medium text-zinc-700">笔记：</span>
                          <span>{item.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions (Audio, Star, Master, Edit, Delete) - Desktop only to keep mobile 100% minimalist */}
                  <div className="hidden sm:flex items-center gap-0.5 sm:gap-1 shrink-0 pt-0.5">
                    {/* Audio */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        playPronunciation(item.word, preferredAccent, undefined, item.lang || lang);
                      }}
                      title={`发音 (${preferredAccent})`}
                      className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors touch-manipulation"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    {/* Star toggle */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onToggleStar(item.id);
                      }}
                      title={item.starred ? '取消标星' : '标星重点'}
                      className={`p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg transition-colors touch-manipulation ${
                        item.starred
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${item.starred ? 'fill-amber-500' : ''}`} />
                    </button>

                    {/* Mastered toggle */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onToggleMastered(item.id);
                      }}
                      title={item.mastered ? '标记为需复习' : '标记为已掌握'}
                      className={`p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg transition-colors touch-manipulation ${
                        item.mastered
                          ? 'text-emerald-600 hover:text-emerald-700'
                          : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <CheckCircle2 className={`w-4 h-4 ${item.mastered ? 'fill-emerald-100' : ''}`} />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onEditWord(item);
                      }}
                      title="编辑释义与例句"
                      className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors touch-manipulation"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete single word with inline prompt */}
                    {isConfirmingThisDelete ? (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2 py-1 rounded-lg text-xs animate-fadeIn shrink-0"
                      >
                        <span className="text-red-700 font-medium">确认删除?</span>
                        <button
                          onClick={e => handleSingleDelete(item.id, e)}
                          title="确认删除"
                          className="px-2 py-1 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition-colors min-h-[30px]"
                        >
                          删除
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          title="取消"
                          className="p-1 text-zinc-400 hover:text-zinc-600 min-h-[30px]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setConfirmDeleteId(item.id);
                        }}
                        title="删除此生词"
                        className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Subtle mobile chevron to indicate tap-to-view detail */}
                  <div className="flex sm:hidden items-center justify-center self-center pl-1 text-zinc-300 shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </section>
  );
};
