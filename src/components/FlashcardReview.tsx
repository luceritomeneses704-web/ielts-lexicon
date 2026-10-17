import React, { useState, useEffect } from 'react';
import { WordItem, WordGroup, DictionaryLang } from '../types/dictionary';
import { playPronunciation, normalizeCollocation } from '../services/dictionaryService';
import {
  RotateCw,
  Volume2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Folder,
  Layers,
  Quote
} from 'lucide-react';

interface FlashcardReviewProps {
  words: WordItem[];
  groups?: WordGroup[];
  onToggleMastered: (id: string) => void;
  preferredAccent: 'UK' | 'US';
  onExitReview: () => void;
  /** 当前词典语言：es 时发音走西语 TTS */
  lang?: DictionaryLang;
}

export const FlashcardReview: React.FC<FlashcardReviewProps> = ({
  words,
  groups = [],
  onToggleMastered,
  preferredAccent,
  lang = 'en',
  onExitReview,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'unmastered'>('unmastered');
  const [reviewGroupId, setReviewGroupId] = useState<string>('all');

  const groupWords = reviewGroupId === 'all'
    ? words
    : words.filter(w => (w.groupId || 'default') === reviewGroupId);

  const reviewDeck = filterMode === 'unmastered'
    ? groupWords.filter(w => !w.mastered)
    : groupWords;
  const activeDeck = reviewDeck.length > 0 ? reviewDeck : groupWords;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentWord = activeDeck[currentIndex];

  // Reset index if deck changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [filterMode, reviewGroupId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.key === 'ArrowRight' || e.key === 'j') {
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        handlePrev();
      } else if (e.key === 'p' || e.key === 'P') {
        if (currentWord) playPronunciation(currentWord.word, preferredAccent, currentWord.audioUrl, currentWord.lang || lang);
      } else if (e.key === '1') {
        handleAgain();
      } else if (e.key === '2') {
        handleRemembered();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, currentWord, isFlipped, activeDeck]);

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex(prev => (prev < activeDeck.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : activeDeck.length - 1));
  };

  const handleRemembered = () => {
    if (currentWord && !currentWord.mastered) {
      onToggleMastered(currentWord.id);
    }
    handleNext();
  };

  const handleAgain = () => {
    if (currentWord && currentWord.mastered) {
      onToggleMastered(currentWord.id);
    }
    handleNext();
  };

  if (!currentWord) {
    return (
      <div className="max-w-xl mx-auto bg-white border border-zinc-200/90 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
        <h3 className="text-lg font-medium text-zinc-900">暂无可复习词汇</h3>
        <p className="text-xs sm:text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">
          所选生词本中暂无符合条件的单词，请在词典中查询单词自动录入。
        </p>
        <button
          onClick={onExitReview}
          className="px-5 py-2.5 text-xs font-medium text-white bg-zinc-950 rounded-xl hover:bg-zinc-800 transition-colors"
        >
          返回查词
        </button>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / activeDeck.length) * 100);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 sm:space-y-6">
      {/* Top Deck Controller - Responsive */}
      <div className="flex items-center justify-between text-xs text-zinc-500 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl">
            <button
              onClick={() => setFilterMode('unmastered')}
              className={`px-3 py-1 font-medium rounded-lg transition-colors min-h-[32px] active:scale-95 touch-manipulation ${
                filterMode === 'unmastered'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              待巩固
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 font-medium rounded-lg transition-colors min-h-[32px] active:scale-95 touch-manipulation ${
                filterMode === 'all'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              全部生词
            </button>
          </div>

          {groups.length > 0 && (
            <div className="flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={reviewGroupId}
                onChange={e => setReviewGroupId(e.target.value)}
                aria-label="筛选复习生词本"
                className="bg-white border border-zinc-200 text-xs rounded-lg px-2.5 py-1 text-zinc-700 focus:outline-none cursor-pointer min-h-[32px] max-w-[150px] truncate"
              >
                <option value="all">所有生词本</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
          <span className="font-semibold text-zinc-900">{currentIndex + 1}</span>
          <span className="text-zinc-300">/</span>
          <span>{activeDeck.length}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-100 h-1 rounded-full overflow-hidden">
        <div
          className="bg-zinc-950 h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Flashcard Canvas - Responsive with Touch to Flip */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full min-h-[320px] sm:min-h-[380px] bg-white border border-zinc-200/90 hover:border-zinc-300 rounded-2xl p-5 sm:p-9 md:p-12 cursor-pointer transition-all shadow-sm flex flex-col justify-between select-none relative group touch-manipulation"
      >
        {/* Top Tag on Card */}
        <div className="flex items-center justify-between text-xs text-zinc-400 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-medium text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded text-[11px]">{currentWord.pos}</span>
            <span className="text-zinc-300">·</span>
            <span className="font-mono text-zinc-700 font-semibold">{currentWord.ieltsBand}</span>
            <span className="text-zinc-300">·</span>
            <span className="text-zinc-500">{currentWord.topic}</span>
          </div>

          <div className="flex items-center gap-1 text-zinc-400 group-hover:text-zinc-700 text-[11px] transition-colors">
            <RotateCw className="w-3.5 h-3.5" />
            <span>轻触翻转</span>
          </div>
        </div>

        {/* Card Center Content */}
        {!isFlipped ? (
          /* FRONT SIDE: Word, Phonetic, Audio */
          <div className="text-center py-8 sm:py-12 space-y-3 sm:space-y-4">
            <h2 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-zinc-950 break-words">
              {currentWord.word}
            </h2>
            <div className="flex items-center justify-center gap-2.5">
              <span className="font-editorial text-base sm:text-xl text-zinc-400 italic">
                {currentWord.phonetic}
              </span>
              <button
                onClick={e => {
                  e.stopPropagation();
                  playPronunciation(currentWord.word, preferredAccent, currentWord.audioUrl, currentWord.lang || lang);
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 rounded-full transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center touch-manipulation"
                title="发音"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 pt-3 sm:pt-4">点击翻转查看雅思真题例句与学术搭配...</p>
          </div>
        ) : (
          /* BACK SIDE: Meaning, Authentic Example, Collocations */
          <div className="text-center py-4 sm:py-6 space-y-4 animate-fadeIn">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-semibold text-zinc-950">
                {currentWord.translation}
              </h2>
              {currentWord.englishDefinition && (
                <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto font-sans leading-relaxed">
                  {currentWord.englishDefinition}
                </p>
              )}
            </div>

            {/* Authentic Exam Example Sentence */}
            {currentWord.example && (
              <div className="p-3.5 sm:p-4 bg-zinc-50 border border-zinc-200/60 rounded-xl text-left max-w-xl mx-auto space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600">
                  <Quote className="w-3 h-3 text-zinc-400" />
                  <span>{currentWord.examContextTag || '剑雅真题语境'}</span>
                </div>
                <p className="font-editorial text-sm sm:text-base text-zinc-800 leading-relaxed">
                  "{currentWord.example}"
                </p>
                {currentWord.exampleTranslation && (
                  <p className="text-xs text-zinc-500 font-sans leading-relaxed pt-1 border-t border-zinc-200/40">
                    {currentWord.exampleTranslation}
                  </p>
                )}
              </div>
            )}

            {/* High-Frequency Collocations with Chinese Annotations */}
            {currentWord.collocations && currentWord.collocations.length > 0 && (
              <div className="pt-1 space-y-1.5 max-w-xl mx-auto text-left">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  <Layers className="w-3 h-3 text-zinc-400" />
                  <span>高频学术搭配与注释:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  {currentWord.collocations.slice(0, 4).map((col, idx) => {
                    const norm = normalizeCollocation(col);
                    return (
                      <div key={idx} className="p-2 bg-zinc-50/80 border border-zinc-200/50 rounded-lg">
                        <div className="font-editorial font-medium text-zinc-900">{norm.phrase}</div>
                        {norm.translation && (
                          <div className="text-[11px] text-zinc-500 font-sans mt-0.5">{norm.translation}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Hint */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-3 border-t border-zinc-100">
          <span>
            {currentWord.mastered ? (
              <span className="text-emerald-700 font-medium">● 状态：已掌握</span>
            ) : (
              <span className="text-amber-700 font-medium">○ 状态：待巩固</span>
            )}
          </span>
          <span className="font-mono hidden sm:inline">快捷键: 空格翻转 · 1 模糊 · 2 掌握 · P 发音</span>
        </div>
      </div>

      {/* Review Response Action Bar - Mobile Touch Friendly */}
      <div className="space-y-2.5">
        {/* Main Action Buttons (Large Touch Targets) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <button
            onClick={handleAgain}
            className="flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all active:scale-95 touch-manipulation min-h-[46px]"
          >
            <XCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>记不太清 (按 1)</span>
          </button>

          <button
            onClick={handleRemembered}
            className="flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-medium text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all active:scale-95 touch-manipulation min-h-[46px]"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>完全掌握 (按 2)</span>
          </button>
        </div>

        {/* Secondary Navigation */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            onClick={handlePrev}
            className="flex items-center gap-1 px-3.5 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-950 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors min-h-[38px] active:scale-95 touch-manipulation"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>上一个</span>
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-3.5 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-950 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors min-h-[38px] active:scale-95 touch-manipulation"
          >
            <span>下一个</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
