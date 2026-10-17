import React, { useState, useEffect, useCallback } from 'react';
import { WordItem, WordGroup, ViewMode, DictionaryLang } from './types/dictionary';
import { IELTS_DICTIONARY } from './data/ieltsDictionary';
import {
  findLocalWord,
  fetchOnlineDefinition,
  synthesizeInstantWord,
  ensureOxfordReady,
  ensureSpanishReady,
  spanishLoadState,
  isPhraseOrSentence,
  translateText,
  synthesizePhraseTranslation,
} from './services/dictionaryService';
import {
  getSavedWords,
  saveWords,
  recordWordLookup,
  deleteWord,
  deleteMultipleWords,
  updateWord,
  toggleWordStar,
  toggleWordMastered,
  getAutoSaveSetting,
  setAutoSaveSetting,
  getGroups,
  createGroup,
  deleteGroup,
  renameGroup,
  assignWordGroup,
  batchAssignWordsGroup,
  getActiveGroupId,
  setActiveGroupId,
  getDictionaryLang,
  setDictionaryLang,
} from './services/storageService';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { WordDetailView } from './components/WordDetailView';
import { VocabularyNotebook } from './components/VocabularyNotebook';
import { FlashcardReview } from './components/FlashcardReview';
import { Check, ArrowLeft } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('dict');
  const [selectedNotebookWord, setSelectedNotebookWord] = useState<WordItem | null>(null);
  const [detailOrigin, setDetailOrigin] = useState<'dict' | 'notebook' | null>(null);
  const [savedWords, setSavedWords] = useState<WordItem[]>(() => {
    const list = getSavedWords();
    let hasChanges = false;
    const sanitized = list.map(w => {
      const master = findLocalWord(w.word, w.lang || 'en');
      const isTranslationBroken =
        !w.translation ||
        w.translation === w.englishDefinition ||
        w.translation.includes('（英文学术词汇）') ||
        w.translation.includes('学术专有概念') ||
        w.translation.includes('学术词汇与相关范畴');
      const isExampleBroken =
        !w.exampleTranslation ||
        w.exampleTranslation.startsWith('（语境例句：') ||
        Boolean(
          w.example &&
            (w.example.includes('accelerating proliferation') ||
              w.example.includes('Empirical findings from Cambridge longitudinal research') ||
              w.example.includes('Contemporary sociologists emphasize that maintaining') ||
              w.example.includes('Macroeconomic analysts urge that central regulatory') ||
              w.example.includes('efforts to ' + w.word.toLowerCase() + ' emerging societal challenges'))
        );

      if (master) {
        if (isTranslationBroken || isExampleBroken) hasChanges = true;
        return {
          ...w,
          translation: isTranslationBroken ? master.translation : w.translation,
          englishDefinition: master.englishDefinition || w.englishDefinition,
          examContextTag: master.examContextTag || w.examContextTag,
          example: isExampleBroken ? master.example : (w.example || master.example),
          exampleTranslation: isExampleBroken ? master.exampleTranslation : (w.exampleTranslation || master.exampleTranslation),
          collocations: (master.collocations && master.collocations.length > 0) ? master.collocations : w.collocations,
        };
      }
      if (isTranslationBroken || isExampleBroken) {
        hasChanges = true;
        const fallback = synthesizeInstantWord(w.word);
        return {
          ...w,
          translation: isTranslationBroken ? fallback.translation : w.translation,
          englishDefinition: fallback.englishDefinition || w.englishDefinition,
          examContextTag: fallback.examContextTag || w.examContextTag,
          example: isExampleBroken ? fallback.example : w.example,
          exampleTranslation: isExampleBroken ? fallback.exampleTranslation : w.exampleTranslation,
          collocations: (fallback.collocations && fallback.collocations.length > 0) ? fallback.collocations : w.collocations,
        };
      }
      return w;
    });

    if (hasChanges) {
      saveWords(sanitized);
    }
    return sanitized;
  });
  const [groups, setGroups] = useState<WordGroup[]>(() => getGroups());
  const [activeGroupId, setActiveGroupIdState] = useState<string>(() => getActiveGroupId());

  const [currentWord, setCurrentWord] = useState<WordItem | null>(() => {
    const saved = getSavedWords();
    const candidate = saved.length > 0 ? saved[0] : IELTS_DICTIONARY[0];
    const master = findLocalWord(candidate.word, candidate.lang || 'en');
    if (master) return master;
    if (
      !candidate.translation ||
      candidate.translation.includes('学术专有概念') ||
      candidate.translation.includes('学术词汇与相关范畴') ||
      (candidate.example && candidate.example.includes('accelerating proliferation'))
    ) {
      return synthesizeInstantWord(candidate.word);
    }
    return candidate;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [autoSave, setAutoSave] = useState<boolean>(() => getAutoSaveSetting());
  // 当前词典语言：en=英语雅思词典 / es=西语词典（持久化到 localStorage）
  const [currentDictionary, setCurrentDictionary] = useState<DictionaryLang>(() => getDictionaryLang());
  // 发音口音固定为英音（UK）：产品已去掉英音/美音切换，仅保留读音功能
  const preferredAccent: 'UK' | 'US' = 'UK';

  // 当前词典下的生词（生词本/闪卡按词典隔离）
  const dictWords = savedWords.filter(w => (w.lang || 'en') === currentDictionary);

  // 上次停留在西语词典时，启动即后台预加载词库（不阻塞页面渲染）
  // dictReadyTick：词库异步加载完成后自增，驱动生词本/词库浏览重新取数
  const [dictReadyTick, setDictReadyTick] = useState(0);
  useEffect(() => {
    if (currentDictionary === 'es') {
      void ensureSpanishReady().then(() => setDictReadyTick(t => t + 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subtle toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2200);
  }, []);

  // Set active target group
  const handleSelectActiveGroup = (groupId: string) => {
    setActiveGroupIdState(groupId);
    setActiveGroupId(groupId);
    const grp = groups.find(g => g.id === groupId);
    if (grp) {
      showToast(`当前归入生词本已设为: 「${grp.name}」`);
    }
  };

  // Helper to immediately transition and scroll to the word detail card
  const scrollToWordDetail = useCallback(() => {
    setCurrentView('dict');
    setDetailOrigin(null);
    setSelectedNotebookWord(null);
    // Smoothly scroll to the detail container if not in view
    setTimeout(() => {
      const el = document.getElementById('word-detail-container');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }, []);

  // Handle word query with 0ms instant display + automatic classification into active group
  const handleSearchWord = useCallback(
    async (rawWord: string) => {
      const clean = rawWord.trim();
      if (!clean) return;
      const lang = currentDictionary;

      // 0. 词典词库按需加载（不阻塞首屏；西语词库 3.8MB 仅在需要时载入）
      if (lang === 'en') {
        void ensureOxfordReady();
      } else if (spanishLoadState.status !== 'ready') {
        setIsLoading(true);
        await ensureSpanishReady();
        setIsLoading(false);
      }

      // 0.5 词组/句子检测：多词输入或含句中标点时自动走在线翻译（英→中）
      //     西语词典仅支持单词/短语本地查询，不做整句翻译
      if (lang === 'en' && isPhraseOrSentence(clean)) {
        setIsLoading(true);
        const result = await translateText(clean);
        setIsLoading(false);
        if (result) {
          const phraseItem = synthesizePhraseTranslation(clean, result.translated);
          phraseItem.groupId = activeGroupId;
          setCurrentWord(phraseItem);
          if (autoSave) {
            const { list, isNew } = recordWordLookup(phraseItem, activeGroupId);
            setSavedWords(list);
            if (isNew) {
              const targetGroup = groups.find(g => g.id === activeGroupId)?.name || '默认生词本';
              showToast(`已存入「${targetGroup}」`);
            }
          }
          scrollToWordDetail();
          return;
        }
        // 翻译服务不可用时降级为单词查询链路
      }

      // 1. Instant local search (0ms)
      const local = findLocalWord(clean, lang);
      if (local) {
        setCurrentWord(local);
        if (autoSave) {
          const { list, isNew } = recordWordLookup(local, activeGroupId);
          setSavedWords(list);
          if (isNew) {
            const targetGroup = groups.find(g => g.id === activeGroupId)?.name || '默认生词本';
            showToast(`已将 "${local.word}" 存入「${targetGroup}」`);
          }
        }
        scrollToWordDetail();
        return;
      }

      // 2. 西语词典未命中：不调用英语在线词典（会返回无关英文释义），直接提示
      if (lang === 'es') {
        showToast(`西语词库未收录「${clean}」，试试其他拼写或原形`);
        setCurrentWord(null);
        return;
      }

      // 3. Ultra-fast local dictionary lookup via SQLite engine (<10ms)
      setIsLoading(true);
      try {
        const wordItem = await fetchOnlineDefinition(clean);
        setIsLoading(false);
        if (wordItem) {
          wordItem.groupId = activeGroupId;
          setCurrentWord(wordItem);
          if (autoSave) {
            const { list, isNew } = recordWordLookup(wordItem, activeGroupId);
            setSavedWords(list);
            if (isNew) {
              const targetGroup = groups.find(g => g.id === activeGroupId)?.name || '默认生词本';
              showToast(`已将 "${wordItem.word}" 存入「${targetGroup}」`);
            }
          }
          scrollToWordDetail();
          return;
        }
      } catch {
        setIsLoading(false);
      }

      // 4. Offline synthesis fallback if server unreachable
      const fallback = synthesizeInstantWord(clean);
      fallback.groupId = activeGroupId;
      setCurrentWord(fallback);
      if (autoSave) {
        const { list } = recordWordLookup(fallback, activeGroupId);
        setSavedWords(list);
      }
      scrollToWordDetail();
    },
    [autoSave, activeGroupId, groups, scrollToWordDetail, showToast, currentDictionary]
  );

  // 切换词典：清空当前词条、持久化选择；切到西语时预加载词库
  const handleSelectDictionary = useCallback((lang: DictionaryLang) => {
    if (lang === currentDictionary) return;
    setDictionaryLang(lang);
    setCurrentDictionary(lang);
    setCurrentWord(null);
    setSelectedNotebookWord(null);
    setCurrentView('dict');
    showToast(lang === 'es' ? '已切换到「西语词典」' : '已切换到「英语词典」');
    if (lang === 'es') void ensureSpanishReady().then(() => setDictReadyTick(t => t + 1));
  }, [currentDictionary, showToast]);

  // Auto-save toggle (English feedback)
  const handleToggleAutoSave = () => {
    const next = !autoSave;
    setAutoSave(next);
    setAutoSaveSetting(next);
    showToast(next ? 'Auto-Save: Enabled' : 'Auto-Save: Disabled');
  };

  // Star toggle
  const handleToggleStar = (id: string) => {
    const updated = toggleWordStar(id);
    setSavedWords(updated);
    if (currentWord && currentWord.id === id) {
      setCurrentWord(prev => (prev ? { ...prev, starred: !prev.starred } : prev));
    }
  };

  // Mastered toggle
  const handleToggleMastered = (id: string) => {
    const updated = toggleWordMastered(id);
    setSavedWords(updated);
    if (currentWord && currentWord.id === id) {
      const nextMastered = !currentWord.mastered;
      setCurrentWord(prev => (prev ? { ...prev, mastered: nextMastered } : prev));
      showToast(nextMastered ? `"${currentWord.word}" 已标记为掌握` : `"${currentWord.word}" 已移入待复习`);
    }
  };

  // Delete single word
  const handleDeleteWord = (id: string) => {
    const target = savedWords.find(w => w.id === id);
    const updated = deleteWord(id);
    setSavedWords(updated);
    showToast(`已从生词本删除 ${target ? `"${target.word}"` : ''}`);
    if (currentWord && currentWord.id === id) {
      if (updated.length > 0) {
        setCurrentWord(updated[0]);
      } else {
        setCurrentWord(IELTS_DICTIONARY[0]);
      }
    }
  };

  // Delete multiple words
  const handleDeleteMultiple = (ids: string[]) => {
    const updated = deleteMultipleWords(ids);
    setSavedWords(updated);
    showToast(`已成功删除选中的 ${ids.length} 个生词`);
    if (currentWord && ids.includes(currentWord.id)) {
      if (updated.length > 0) {
        setCurrentWord(updated[0]);
      } else {
        setCurrentWord(IELTS_DICTIONARY[0]);
      }
    }
  };

  // Edit word notes inline
  const handleUpdateNotes = (wordId: string, notes: string) => {
    const target = savedWords.find(w => w.id === wordId) || currentWord;
    if (target) {
      const updatedItem = { ...target, notes };
      const updatedList = updateWord(updatedItem);
      setSavedWords(updatedList);
      if (currentWord && currentWord.id === wordId) {
        setCurrentWord(updatedItem);
      }
      showToast('学习笔记已保存');
    }
  };

  // Group Handlers
  const handleCreateGroup = (name: string) => {
    const { groups: updated, newGroupId } = createGroup(name);
    setGroups(updated);
    setActiveGroupIdState(newGroupId);
    showToast(`已创建生词本: 「${name}」并设为当前归入库`);
  };

  const handleDeleteGroup = (groupId: string) => {
    const { groups: updatedGroups, words: updatedWords } = deleteGroup(groupId);
    setGroups(updatedGroups);
    setSavedWords(updatedWords);
    setActiveGroupIdState(getActiveGroupId());
    showToast('生词本已删除，其中的生词已归入默认生词本');
  };

  const handleRenameGroup = (groupId: string, newName: string) => {
    const updated = renameGroup(groupId, newName);
    setGroups(updated);
    showToast(`生词本已重命名为「${newName}」`);
  };

  const handleAssignWordGroup = (wordId: string, groupId: string) => {
    const updated = assignWordGroup(wordId, groupId);
    setSavedWords(updated);
    if (currentWord && currentWord.id === wordId) {
      setCurrentWord(prev => (prev ? { ...prev, groupId } : prev));
    }
    const groupName = groups.find(g => g.id === groupId)?.name || '默认生词本';
    showToast(`已将单词归入「${groupName}」`);
  };

  const handleBatchAssignWordsGroup = (wordIds: string[], groupId: string) => {
    const updated = batchAssignWordsGroup(wordIds, groupId);
    setSavedWords(updated);
    const groupName = groups.find(g => g.id === groupId)?.name || '默认生词本';
    showToast(`已将选中的 ${wordIds.length} 个词归入「${groupName}」`);
  };

  // Check if current viewed word is saved
  const isCurrentWordSaved = savedWords.some(
    w => w.word.toLowerCase() === currentWord?.word.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 flex flex-col selection:bg-zinc-900 selection:text-white">
      {/* Toast floating banner - positioned safely above mobile bottom bar */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-50 bg-zinc-950 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-zinc-800 animate-fadeIn max-w-[90vw] truncate">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Top Bar with English Auto-Save status */}
      <Header
        currentView={currentView}
        onSelectView={view => {
          setSelectedNotebookWord(null);
          setDetailOrigin(null);
          setCurrentView(view);
        }}
        savedCount={dictWords.length}
        autoSave={autoSave}
        onToggleAutoSave={handleToggleAutoSave}
        currentDictionary={currentDictionary}
        onSelectDictionary={handleSelectDictionary}
      />

      {/* Main Body - Ultra Clean, No redundant H1/P banners, immediate search access, mobile bottom safe padding */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 md:py-5 pb-24 md:pb-10 space-y-4 md:space-y-5">
        {currentView === 'dict' && (
          <div className="space-y-5 md:space-y-6 animate-fadeIn">
            {/* Minimalist Search Bar with Active Notebook classification */}
            <SearchBar
              onSearch={handleSearchWord}
              isLoading={isLoading}
              groups={groups}
              activeGroupId={activeGroupId}
              onSelectActiveGroup={handleSelectActiveGroup}
              onCreateGroup={handleCreateGroup}
              lang={currentDictionary}
            />

            {/* Word Detail Card */}
            {currentWord && (
              <div className="pt-2">
                <WordDetailView
                  word={currentWord}
                  groups={groups}
                  isSaved={isCurrentWordSaved}
                  onToggleStar={handleToggleStar}
                  onToggleMastered={handleToggleMastered}
                  onDelete={handleDeleteWord}
                  onAssignGroup={handleAssignWordGroup}
                  preferredAccent={preferredAccent}
                  onUpdateNotes={handleUpdateNotes}
                  onSelectWord={handleSearchWord}
                  lang={currentDictionary}
                  onBack={
                    detailOrigin === 'notebook'
                      ? () => {
                          setCurrentView('notebook');
                          setDetailOrigin(null);
                        }
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        )}

        {currentView === 'notebook' && (
          <div className="animate-fadeIn">
            {selectedNotebookWord ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-1">
                  <button
                    onClick={() => setSelectedNotebookWord(null)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-100 border border-zinc-200/90 rounded-xl transition-all shadow-xs active:scale-95 touch-manipulation min-h-[40px]"
                  >
                    <ArrowLeft className="w-4 h-4 text-zinc-700" />
                    <span>返回生词本</span>
                  </button>
                  <span className="text-xs text-zinc-400 font-mono">生词详情 · {selectedNotebookWord.word}</span>
                </div>

                <WordDetailView
                  word={selectedNotebookWord}
                  groups={groups}
                  isSaved={savedWords.some(
                    w => w.word.toLowerCase() === selectedNotebookWord.word.toLowerCase()
                      && (w.lang || 'en') === (selectedNotebookWord.lang || 'en')
                  )}
                  onToggleStar={id => {
                    handleToggleStar(id);
                    setSelectedNotebookWord(prev => (prev && prev.id === id ? { ...prev, starred: !prev.starred } : prev));
                  }}
                  onToggleMastered={id => {
                    handleToggleMastered(id);
                    setSelectedNotebookWord(prev => (prev && prev.id === id ? { ...prev, mastered: !prev.mastered } : prev));
                  }}
                  onDelete={id => {
                    handleDeleteWord(id);
                    setSelectedNotebookWord(null);
                  }}
                  onAssignGroup={(wordId, gId) => {
                    handleAssignWordGroup(wordId, gId);
                    setSelectedNotebookWord(prev => (prev && prev.id === wordId ? { ...prev, groupId: gId } : prev));
                  }}
                  preferredAccent={preferredAccent}
                  onUpdateNotes={(wordId, notes) => {
                    handleUpdateNotes(wordId, notes);
                    setSelectedNotebookWord(prev => (prev && prev.id === wordId ? { ...prev, notes } : prev));
                  }}
                  onSelectWord={handleSearchWord}
                  onBack={() => setSelectedNotebookWord(null)}
                  lang={selectedNotebookWord.lang || currentDictionary}
                />
              </div>
            ) : (
              <VocabularyNotebook
                key={`${currentDictionary}-${dictReadyTick}`}
                words={dictWords}
                groups={groups}
                onSelectWord={word => {
                  setSelectedNotebookWord(word);
                  setCurrentWord(word);
                }}
                onToggleStar={handleToggleStar}
                onToggleMastered={handleToggleMastered}
                onDeleteWord={handleDeleteWord}
                onDeleteMultiple={handleDeleteMultiple}
                onEditWord={word => {
                  setSelectedNotebookWord(word);
                  setCurrentWord(word);
                }}
                onAssignGroup={handleAssignWordGroup}
                onBatchAssignGroup={handleBatchAssignWordsGroup}
                onCreateGroup={handleCreateGroup}
                onDeleteGroup={handleDeleteGroup}
                onRenameGroup={handleRenameGroup}
                preferredAccent={preferredAccent}
                lang={currentDictionary}
              />
            )}
          </div>
        )}

        {currentView === 'review' && (
          <div className="animate-fadeIn">
            <FlashcardReview
              words={dictWords}
              groups={groups}
              onToggleMastered={handleToggleMastered}
              preferredAccent={preferredAccent}
              lang={currentDictionary}
              onExitReview={() => setCurrentView('dict')}
            />
          </div>
        )}
      </main>
    </div>
  );
}
