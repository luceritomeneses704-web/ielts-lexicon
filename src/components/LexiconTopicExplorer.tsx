import React, { useState, useMemo } from 'react';
import { WordItem } from '../types/dictionary';
import { getAllMasterWords } from '../services/dictionaryService';
import { BookOpen, Sparkles, ChevronDown, ChevronUp, Layers, Check } from 'lucide-react';

interface LexiconTopicExplorerProps {
  currentWord: WordItem;
  onSelectWord: (word: string) => void;
  savedWordIds: Set<string>;
}

const TOPICS = [
  '全部',
  '环境生态',
  '科技媒体',
  '学术教育',
  '社会文化',
  '经济工作',
  '政府法律',
  '心理生活',
] as const;

const BANDS = [
  '全部',
  'Band 6.5',
  'Band 7.0',
  'Band 7.5',
  'Band 8.0+',
] as const;

export const LexiconTopicExplorer: React.FC<LexiconTopicExplorerProps> = ({
  currentWord,
  onSelectWord,
  savedWordIds,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('全部');
  const [selectedBand, setSelectedBand] = useState<string>('全部');

  const allWords = useMemo(() => {
    return getAllMasterWords();
  }, []);

  const filteredWords = useMemo(() => {
    return allWords.filter(w => {
      const matchTopic = selectedTopic === '全部' || w.topic === selectedTopic;
      const matchBand = selectedBand === '全部' || w.ieltsBand === selectedBand;
      return matchTopic && matchBand;
    });
  }, [allWords, selectedTopic, selectedBand]);

  return (
    <section className="bg-white border border-zinc-200/90 rounded-2xl p-3.5 sm:p-5 shadow-2xs transition-all">
      {/* Header with expand toggle */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-zinc-700" />
          <h2 className="text-xs sm:text-sm font-semibold text-zinc-900 tracking-tight">
            雅思真题与学术核心词库分类速览
          </h2>
          <span className="text-[11px] font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full font-medium">
            共 {allWords.length} 核心词
          </span>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-medium text-zinc-600 hover:text-zinc-950 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors min-h-[34px] touch-manipulation"
        >
          <span>{isExpanded ? '收起词库速览' : '展开分类浏览'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Filter Chips Bar (Always visible or expanded) */}
      <div className="mt-3 space-y-2 pt-2 border-t border-zinc-100 text-xs">
        {/* Topic selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-[11px] text-zinc-400 shrink-0 font-medium">话题:</span>
          {TOPICS.map(topic => (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className={`px-2.5 py-1 rounded-lg transition-all shrink-0 min-h-[30px] font-medium ${
                selectedTopic === topic
                  ? 'bg-zinc-950 text-white shadow-2xs'
                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200/70'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Band selector (Shown when expanded) */}
        {isExpanded && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar animate-fadeIn">
            <span className="text-[11px] text-zinc-400 shrink-0 font-medium">分段:</span>
            {BANDS.map(band => (
              <button
                key={band}
                onClick={() => setSelectedBand(band)}
                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 min-h-[30px] font-mono text-[11px] font-medium ${
                  selectedBand === band
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200/70'
                }`}
              >
                {band}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Words Grid - Compact when collapsed, full grid when expanded */}
      <div className="mt-3">
        <div
          className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 transition-all ${
            isExpanded ? 'max-h-[420px] overflow-y-auto overscroll-contain pr-1' : 'max-h-24 overflow-hidden'
          }`}
        >
          {filteredWords.map(w => {
            const isCurrent = currentWord && currentWord.word.toLowerCase() === w.word.toLowerCase();
            const isSaved = savedWordIds.has(w.word.toLowerCase());
            const cleanZh = w.translation.replace(/^[a-z]+[.\s]+/i, '').split(/[；;,，]/)[0].trim() || w.translation;

            return (
              <button
                key={w.id}
                onClick={() => onSelectWord(w.word)}
                className={`text-left p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-1 touch-manipulation min-h-[52px] ${
                  isCurrent
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                    : 'bg-zinc-50/70 hover:bg-zinc-100/90 text-zinc-900 border-zinc-200/80 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="font-editorial font-medium text-xs sm:text-sm truncate">
                    {w.word}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded shrink-0 ${
                      isCurrent
                        ? 'bg-zinc-800 text-zinc-200'
                        : 'bg-white text-zinc-500 border border-zinc-200/60'
                    }`}
                  >
                    {w.ieltsBand.replace('Band ', '')}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 w-full text-[11px]">
                  <span
                    className={`truncate ${
                      isCurrent ? 'text-zinc-300' : 'text-zinc-500'
                    }`}
                  >
                    {w.pos} {cleanZh}
                  </span>
                  {isSaved && (
                    <span
                      title="已存入生词本"
                      className={`shrink-0 ${isCurrent ? 'text-emerald-400' : 'text-emerald-600'}`}
                    >
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {!isExpanded && filteredWords.length > 8 && (
          <div className="pt-2 text-center">
            <button
              onClick={() => setIsExpanded(true)}
              className="text-[11px] text-zinc-500 hover:text-zinc-900 font-medium underline underline-offset-2 min-h-[30px]"
            >
              点击查看当前分类下全部 {filteredWords.length} 个词汇...
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
