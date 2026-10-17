import React, { useState } from 'react';
import { WordItem, WordGroup, CollocationItem, DictionaryLang } from '../types/dictionary';
import {
  playPronunciation,
  findLocalWord,
  spanishDictionaryMap,
  esNormalizeToClass,
} from '../services/dictionaryService';
import { getCoreEssentialCollocations } from '../services/dictionaryAggregatorService';
import {
  Volume2,
  Bookmark,
  CheckCircle2,
  Trash2,
  Edit3,
  Check,
  Folder,
  Layers,
  ArrowLeft,
  GraduationCap,
  X,
  MessageSquareQuote,
} from 'lucide-react';

interface WordDetailViewProps {
  word: WordItem;
  groups: WordGroup[];
  isSaved: boolean;
  onToggleStar: (id: string) => void;
  onToggleMastered: (id: string) => void;
  onDelete: (id: string) => void;
  onAssignGroup: (wordId: string, groupId: string) => void;
  preferredAccent: 'UK' | 'US';
  onUpdateNotes: (wordId: string, notes: string) => void;
  onBack?: () => void;
  onSelectWord?: (word: string) => void;
  /** 词条语言：es 时发音走西语 TTS、meta 显示词频 */
  lang?: DictionaryLang;
}

export const WordDetailView: React.FC<WordDetailViewProps> = ({
  word,
  groups,
  isSaved,
  onToggleStar,
  onToggleMastered,
  onDelete,
  onAssignGroup,
  preferredAccent,
  onUpdateNotes,
  onBack,
  onSelectWord,
  lang = 'en',
}) => {
  // 词条自身语言优先（生词本中可能混有另一种语言的词）
  const entryLang: DictionaryLang = word.lang || lang;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingSentence, setIsPlayingSentence] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(word.notes || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // 例句内点查：null 表示未激活；非 null 表示点击了某个词，附该词释义
  const [inlineAnn, setInlineAnn] = useState<{
    surface: string; lemma: string;
    translation: string; pos: string;
  } | null>(null);
  const [isSpeakingZh, setIsSpeakingZh] = useState(false);
  // 中文朗读文本：优先中文释义，其次例句中文译文
  const zhText = (() => {
    const t = (word.translation || '').trim();
    if (/[一-龥]/.test(t)) return t.replace(/^[a-zA-Z]+\.\s*/, '');
    return (word.exampleTranslation || '').trim();
  })();

  /** 朗读中文（zh-CN TTS） */
  const handleSpeakChinese = () => {
    const text = zhText;
    if (!text) return;
    setIsSpeakingZh(true);
    playPronunciation(text, preferredAccent, undefined, 'zh');
    setTimeout(() => setIsSpeakingZh(false), 2400);
  };

  // Strictly 2~3 core essential collocations
  const essentialCollocations: CollocationItem[] = getCoreEssentialCollocations(
    word.collocations && word.collocations.length > 0 ? word.collocations : []
  );

  const handlePronounce = (textToSpeak?: string) => {
    setIsPlaying(true);
    const isMainWord = !textToSpeak || textToSpeak.toLowerCase() === word.word.toLowerCase();
    playPronunciation(
      textToSpeak || word.word,
      preferredAccent,
      isMainWord ? word.audioUrl : undefined,
      entryLang,
    );
    setTimeout(() => setIsPlaying(false), 900);
  };

  const handlePronounceSentence = (sentence: string) => {
    setIsPlayingSentence(true);
    playPronunciation(sentence, preferredAccent, undefined, entryLang);
    setTimeout(() => setIsPlayingSentence(false), 2400);
  };

  const handleSaveNotes = () => {
    onUpdateNotes(word.id, notesDraft.trim());
    setIsEditingNotes(false);
  };

  // Helper to highlight the searched word in the example sentence
  // + 把每个西语词/英文单词做成可点击的 chip，触发 inline 注释
  const renderHighlightedExample = (sentence: string, targetWord: string) => {
    if (!sentence) return null;
    // 用 Unicode 字符类切分：保留字母（含西语 á é í ó ú ñ ü），标点单独成段
    // 例："Hola, ¿cómo estás?" → ["Hola", ",", " ", "¿", "cómo", " ", "estás", "?"]
    const tokens = sentence.match(/[\p{L}\p{M}]+|[^\p{L}\p{M}]+/gu) || [sentence];
    const cleanTarget = targetWord.trim().replace(/[^\p{L}\p{N}]/gu, '');
    const targetCls = esNormalizeToClass(cleanTarget);

    return (
      <span>
        {tokens.map((tok, i) => {
          // 标点 / 空白：原样渲染
          if (!/[\p{L}\p{M}]/u.test(tok)) return <span key={i}>{tok}</span>;
          const isTarget =
            cleanTarget &&
            esNormalizeToClass(tok) === targetCls; // 跨 b/v 等同族的高亮
          const isActiveAnn =
            inlineAnn && esNormalizeToClass(tok) === esNormalizeToClass(inlineAnn.surface);

          const cls = isActiveAnn
            ? 'bg-amber-200/80 text-zinc-950 ring-1 ring-amber-400 rounded px-0.5 cursor-pointer'
            : isTarget
            ? 'font-semibold text-zinc-950 underline decoration-amber-400 decoration-2 underline-offset-4 bg-amber-50/70 px-0.5 rounded cursor-pointer hover:bg-amber-100'
            : 'cursor-pointer hover:bg-zinc-200/60 hover:text-zinc-950 rounded px-0.5 transition-colors';

          return (
            <button
              key={i}
              type="button"
              onClick={e => {
                e.stopPropagation();
                handleInlineLookup(tok);
              }}
              className={cls}
              title="点击查看词义"
            >
              {tok}
            </button>
          );
        })}
      </span>
    );
  };

  /**
   * 点查例句中某词：先查西语/英语本地词库，命中则显示注释。
   * 西语侧做简单变形归一（去重音、去复数 -s/-es、词尾常见变位）。
   */
  const handleInlineLookup = (surface: string) => {
    const raw = surface.trim();
    if (!raw) return;
    // 1) 精确查（含重音）
    let hit = entryLang === 'es'
      ? spanishDictionaryMap.get(raw.toLowerCase())
      : findLocalWord(raw, 'en');
    if (hit) {
      setInlineAnn({
        surface: raw,
        lemma: hit.word,
        translation: hit.translation,
        pos: hit.pos || '',
      });
      return;
    }
    // 2) 西语常见变形：去掉重音、复数 -s/-es、动词常见词尾
    let candidate = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    // 去掉尾随的 s/es
    if (candidate.endsWith('es') && candidate.length > 3) candidate = candidate.slice(0, -2);
    else if (candidate.endsWith('s') && candidate.length > 2) candidate = candidate.slice(0, -1);
    hit = entryLang === 'es' ? spanishDictionaryMap.get(candidate) : findLocalWord(candidate, 'en');
    if (hit) {
      setInlineAnn({ surface: raw, lemma: hit.word, translation: hit.translation, pos: hit.pos || '' });
      return;
    }
    // 3) 英语 strip 后缀
    if (entryLang === 'en') {
      const stems = [candidate];
      if (candidate.endsWith('ing') && candidate.length > 4) stems.push(candidate.slice(0, -3));
      if (candidate.endsWith('ed') && candidate.length > 3) stems.push(candidate.slice(0, -2));
      if (candidate.endsWith('es') && candidate.length > 3) stems.push(candidate.slice(0, -2));
      if (candidate.endsWith('s') && candidate.length > 2) stems.push(candidate.slice(0, -1));
      for (const s of stems) {
        const w = findLocalWord(s, 'en');
        if (w) {
          setInlineAnn({ surface: raw, lemma: w.word, translation: w.translation, pos: w.pos || '' });
          return;
        }
      }
    }
    // 4) 未命中
    setInlineAnn({ surface: raw, lemma: raw, translation: '(本地词库未收录此词)', pos: '' });
  };

  return (
    <article id="word-detail-container" className="w-full max-w-4xl mx-auto bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 md:p-6 shadow-xs transition-all">
      {/* Return to previous view banner if opened from notebook or review */}
      {onBack && (
        <div className="pb-3 mb-3 border-b border-zinc-100 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 px-2.5 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 transition-colors touch-manipulation min-h-[36px]"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-600" />
            <span>返回生词本</span>
          </button>
          <span className="text-[11px] text-zinc-400">词汇详情与多词典聚合</span>
        </div>
      )}

      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-2.5 pb-4 border-b border-zinc-100 flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-zinc-500 font-sans flex-wrap">
          <span className="font-semibold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded">{word.pos}</span>
          <span aria-hidden="true" className="text-zinc-300">·</span>
          {entryLang === 'es' && word.frequencyRank ? (
            /* 西语词条：显示词频排名（1 = 最高频）而非雅思 Band */
            <span className="font-mono text-zinc-800 font-semibold bg-zinc-50 border border-zinc-200/60 px-1.5 py-0.5 rounded text-[11px] sm:text-xs">
              词频 #{word.frequencyRank.toLocaleString()}
            </span>
          ) : (
            <span className="font-mono text-zinc-800 font-semibold bg-zinc-50 border border-zinc-200/60 px-1.5 py-0.5 rounded text-[11px] sm:text-xs">
              {word.ieltsBand}
            </span>
          )}
          {entryLang === 'en' && (
            <>
              <span aria-hidden="true" className="text-zinc-300">·</span>
              <span className="text-zinc-600">{word.topic}</span>
            </>
          )}
          {entryLang === 'es' && (
            <>
              <span aria-hidden="true" className="text-zinc-300">·</span>
              <span className="text-zinc-600">西班牙语</span>
            </>
          )}

          {/* Group assignment indicator & switcher */}
          {isSaved && groups.length > 0 && (
            <>
              <span aria-hidden="true" className="text-zinc-300">·</span>
              <div className="inline-flex items-center gap-1 py-0.5">
                <Folder className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="text-zinc-500 hidden sm:inline">归入:</span>
                <select
                  value={word.groupId || 'default'}
                  onChange={e => onAssignGroup(word.id, e.target.value)}
                  className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-xs rounded-md px-2 py-1 text-zinc-800 font-medium focus:outline-none transition-colors cursor-pointer min-h-[32px] max-w-[130px] sm:max-w-[180px] truncate"
                  title="切换所属生词本"
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
          {isSaved && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-zinc-700 bg-zinc-50 border border-zinc-200/80 px-2 py-1 rounded-md">
              <Check className="w-3.5 h-3.5 text-zinc-700" />
              <span>已存入</span>
            </div>
          )}

          {/* Quick star favorite */}
          <button
            onClick={() => onToggleStar(word.id)}
            title={word.starred ? '取消收藏' : '收藏此词'}
            className={`p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg transition-colors active:scale-95 touch-manipulation ${
              word.starred
                ? 'text-amber-500 hover:text-amber-600 bg-amber-50'
                : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${word.starred ? 'fill-amber-500' : ''}`} />
          </button>

          {/* Quick mastery toggle */}
          <button
            onClick={() => onToggleMastered(word.id)}
            title={word.mastered ? '标记为需复习' : '标记为已掌握'}
            className={`p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg transition-colors active:scale-95 touch-manipulation ${
              word.mastered
                ? 'text-emerald-600 hover:text-emerald-700 bg-emerald-50'
                : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${word.mastered ? 'fill-emerald-100' : ''}`} />
          </button>

          {/* Single word delete button */}
          {isSaved && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="从生词本删除"
              className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors active:scale-95 touch-manipulation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation banner */}
      {showDeleteConfirm && (
        <div className="my-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-xs animate-fadeIn flex-wrap">
          <span className="text-red-800 font-medium">确认从生词本中移除单词 “{word.word}” 吗？</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onDelete(word.id);
                setShowDeleteConfirm(false);
              }}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 min-h-[36px] transition-colors"
            >
              确认删除
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 min-h-[36px] transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Headword, Phonetic & Pronunciation */}
      <div className="pt-3 pb-3 sm:pt-4 sm:pb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-2.5 sm:gap-3.5 flex-wrap min-w-0">
            <h1 className="font-editorial text-2xl sm:text-4xl md:text-5xl font-medium tracking-tight text-zinc-950 break-words">
              {word.word}
            </h1>
            <span className="font-editorial text-sm sm:text-lg text-zinc-500 italic">
              {word.phonetic}
            </span>
          </div>

          {/* Audio Pronunciation Button */}
          <button
            onClick={() => handlePronounce()}
            className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] text-xs font-medium border border-zinc-200 rounded-lg transition-all active:scale-95 touch-manipulation ${
              isPlaying
                ? 'bg-zinc-950 text-white border-zinc-950'
                : 'bg-white text-zinc-800 hover:bg-zinc-50 hover:text-zinc-950'
            }`}
          >
            <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-pulse text-white' : 'text-zinc-500'}`} />
            <span>发音</span>
          </button>

          {/* 朗读中文：西语=读中文释义 / 英语=读中文释义 */}
          {(zhText || word.exampleTranslation) && (
            <button
              onClick={() => handleSpeakChinese()}
              className={`inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[44px] text-xs font-medium border rounded-lg transition-all active:scale-95 touch-manipulation ${
                isSpeakingZh
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300'
              }`}
              title="朗读中文释义"
            >
              <MessageSquareQuote className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">朗读中文</span>
            </button>
          )}
        </div>

      {/* 变形提示：命中 días / hablo 等屈折形式时告知对应原形 */}
      {word.isInflectedForm && word.inflectionNote && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50/80 border border-amber-200/70 rounded-lg px-2.5 py-1.5">
          <MessageSquareQuote className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            “{word.word}” 是 <span className="font-semibold">{word.word}</span> 的
            {word.inflectionNote}，已为你显示原形释义
          </span>
        </div>
      )}

      {/* Primary Translation & concise English Definition */}
      <div className="mt-2.5 sm:mt-3 space-y-1">
        {/* 中文释义优先大字显示；英语词条 translation 本身即中文 */}
        <div className="text-lg sm:text-2xl font-medium text-zinc-950 leading-snug">
          {zhText || word.translation}
        </div>
        {/* 西语词条另起一行小字展示英文释义（非中文），避免混入中文朗读 */}
        {entryLang === 'es' && word.translation && (
          <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl font-sans">
            EN: {word.translation}
          </p>
        )}
      </div>
      </div>



      {/* 派生词（紧凑一排，点击可跳转查词） */}
      {word.derivedWords && word.derivedWords.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
          <span className="text-[11px] text-zinc-400 shrink-0">派生词</span>
          {word.derivedWords.map(dw => (
            <button
              key={dw}
              onClick={() => onSelectWord?.(dw)}
              className="text-xs text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 rounded-md px-2 py-0.5 transition-colors touch-manipulation"
            >
              {dw}
            </button>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. 例句区：英语=剑桥雅思真题例句 / 西语=西英对照例句（Tatoeba） */}
      {/* ------------------------------------------------------------- */}
      {((word.realExamCitations && word.realExamCitations.length > 0) ||
        word.example ||
        (word.examples && word.examples.length > 0)) && (
        <section className="my-4 p-4 bg-zinc-50/90 border border-zinc-200/90 rounded-2xl space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs sm:text-sm font-semibold text-zinc-950 tracking-tight flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-zinc-600" />
              {entryLang === 'es' ? '西语例句 · 西英对照' : '剑桥雅思真题例句'}
            </h2>
            <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
              {entryLang === 'es' ? 'TATOEBA · 点词看注释' : 'CAMBRIDGE IELTS'}
            </span>
          </div>

          {/* Citations List */}
          <div className="space-y-3">
            {/* 优先渲染 citations（英语）；否则渲染 examples（西语多条）或 example（兜底） */}
            {(() => {
              if (word.realExamCitations && word.realExamCitations.length > 0) {
                return word.realExamCitations.map((cit, idx) => (
                  <ExampleCard
                    key={idx}
                    sentence={cit.sentence}
                    translation={cit.translation}
                    source={cit.source}
                    targetWord={word.word}
                    isEs={entryLang === 'es'}
                    onPronounce={handlePronounceSentence}
                    annotation={inlineAnn}
                    onClearAnnotation={() => setInlineAnn(null)}
                    renderTokens={renderHighlightedExample}
                  />
                ));
              }
              // 西语：examples 多条 + example（兼容旧数据）
              const list: { sentence: string; translation: string }[] = [];
              if (word.examples && word.examples.length > 0) {
                for (const [es, en] of word.examples) list.push({ sentence: es, translation: en });
              }
              if (word.example && !list.some(l => l.sentence === word.example)) {
                list.unshift({ sentence: word.example, translation: word.exampleTranslation });
              }
              return list.map((s, idx) => (
                <ExampleCard
                  key={idx}
                  sentence={s.sentence}
                  translation={s.translation}
                  source={word.examContextTag || (entryLang === 'es' ? 'Tatoeba 例句' : '剑桥雅思官方真题精选')}
                  targetWord={word.word}
                  isEs={entryLang === 'es'}
                  onPronounce={handlePronounceSentence}
                  annotation={inlineAnn}
                  onClearAnnotation={() => setInlineAnn(null)}
                  renderTokens={renderHighlightedExample}
                />
              ));
            })()}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2b. 固定搭配（仅西语）—— 精校短语，便于记背 */}
      {/* ------------------------------------------------------------- */}
      {entryLang === 'es' && word.phrases && word.phrases.length > 0 && (
        <section className="my-4 p-4 bg-emerald-50/40 border border-emerald-200/70 rounded-2xl space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs sm:text-sm font-semibold text-emerald-950 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-700" />
              常见固定搭配
            </h2>
            <span className="text-[10px] font-mono text-emerald-700 hidden sm:inline">
              {word.phrases.length} 条
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {word.phrases.map(([es, zh], idx) => (
              <div key={idx} className="p-2.5 bg-white border border-emerald-200/80 rounded-lg flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-editorial text-sm font-medium text-zinc-950 truncate">{es}</div>
                  <div className="text-[11px] text-zinc-600 mt-0.5">{zh}</div>
                </div>
                <button
                  onClick={() => handlePronounce(es)}
                  className="shrink-0 p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                  title="朗读搭配"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. 雅思核心必备搭配 (Strictly 2~3 Essential Core Collocations) */}
      {/* ------------------------------------------------------------- */}
      {essentialCollocations.length > 0 && (
        <section className="my-4 pt-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-600" />
              <h2 className="text-xs sm:text-sm font-semibold text-zinc-900 uppercase tracking-wider">
                核心高频搭配
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            {essentialCollocations.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-zinc-50/80 hover:bg-zinc-50 border border-zinc-200/80 rounded-xl flex flex-col justify-between gap-1.5 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-editorial text-base font-medium text-zinc-950 leading-snug">
                    {item.phrase}
                  </span>
                  <button
                    onClick={() => handlePronounce(item.phrase)}
                    title="朗读搭配"
                    className="p-1.5 text-zinc-400 hover:text-zinc-800 rounded-lg hover:bg-zinc-200/60 min-w-[32px] min-h-[32px] flex items-center justify-center touch-manipulation transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {item.translation && (
                  <div className="text-xs text-zinc-600 font-sans leading-normal pt-1.5 border-t border-zinc-200/60">
                    {item.translation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. 学术同义替换词与反义词 (Academic Synonyms & Antonyms for IELTS) */}
      {/* ------------------------------------------------------------- */}
      {((word.synonyms && word.synonyms.length > 0) || (word.antonyms && word.antonyms.length > 0)) && (
        <section className="my-4 pt-1 space-y-2">
          {word.synonyms && word.synonyms.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-medium text-zinc-400 shrink-0">同义替换</span>
              {word.synonyms.map((syn, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectWord && onSelectWord(syn)}
                  title={`查阅同义词: ${syn}`}
                  className="px-2.5 py-1 text-xs text-zinc-700 bg-zinc-100/80 hover:bg-zinc-200/90 border border-zinc-200 rounded-lg font-editorial transition-colors cursor-pointer min-h-[30px] flex items-center gap-1 active:scale-95 touch-manipulation"
                >
                  <span>{syn}</span>
                  <span className="text-[10px] text-zinc-400">→</span>
                </button>
              ))}
            </div>
          )}

          {word.antonyms && word.antonyms.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-medium text-zinc-400 shrink-0">反义词</span>
              {word.antonyms.map((ant, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectWord && onSelectWord(ant)}
                  title={`查阅反义词: ${ant}`}
                  className="px-2.5 py-1 text-xs text-zinc-600 bg-white hover:bg-zinc-100 border border-zinc-200/80 rounded-lg font-editorial transition-colors cursor-pointer min-h-[30px] active:scale-95 touch-manipulation"
                >
                  {ant}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. 个人学习心得与笔记 (Study Notes) */}
      {/* ------------------------------------------------------------- */}
      <section className="mt-4 pt-3 border-t border-zinc-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            学习笔记
          </span>
          {!isEditingNotes && (
            <button
              onClick={() => setIsEditingNotes(true)}
              className="text-xs text-zinc-600 hover:text-zinc-950 flex items-center gap-1 min-h-[36px] px-2 rounded hover:bg-zinc-50 touch-manipulation"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{word.notes ? '修改笔记' : '添加笔记'}</span>
            </button>
          )}
        </div>

        {isEditingNotes ? (
          <div className="space-y-2.5 animate-fadeIn">
            <textarea
              autoFocus
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              placeholder="记录您对该生词的联想记忆、常见错误、剑雅刷题心得等..."
              rows={3}
              className="w-full p-3 text-xs sm:text-sm bg-zinc-50 border border-zinc-300 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all leading-relaxed"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setIsEditingNotes(false)}
                className="px-3.5 py-2 text-xs text-zinc-600 hover:text-zinc-900 rounded-lg min-h-[38px] touch-manipulation"
              >
                取消
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-4 py-2 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg min-h-[38px] transition-colors touch-manipulation"
              >
                保存笔记
              </button>
            </div>
          </div>
        ) : (
          word.notes && (
            <div className="p-3 bg-zinc-50/70 border border-zinc-100 rounded-xl text-xs sm:text-sm text-zinc-700 leading-relaxed">
              {word.notes}
            </div>
          )
        )}
      </section>
    </article>
  );
};

/**
 * 例句卡片：含朗读 + 可点击单词 chip + 触发 inline 注释。
 * 抽出为子组件便于维护，props 由父组件透传。
 */
interface ExampleCardProps {
  sentence: string;
  translation: string;
  source: string;
  targetWord: string;
  isEs: boolean;
  annotation: { surface: string; lemma: string; translation: string; pos: string } | null;
  onClearAnnotation: () => void;
  onPronounce: (sentence: string) => void;
  renderTokens: (sentence: string, target: string) => React.ReactNode;
}

const ExampleCard: React.FC<ExampleCardProps> = ({
  sentence,
  translation,
  source,
  isEs,
  annotation,
  onClearAnnotation,
  onPronounce,
  renderTokens,
}) => (
  <div className="p-3 sm:p-4 bg-white border border-zinc-200/90 rounded-xl space-y-2 relative">
    <div className="flex items-center justify-between gap-2">
      <span className="font-semibold text-zinc-900 text-[11px] bg-zinc-100/90 text-zinc-800 px-2 py-0.5 rounded-md flex items-center gap-1.5">
        <GraduationCap className="w-3.5 h-3.5 text-zinc-600" />
        {source}
      </span>
      <button
        onClick={() => onPronounce(sentence)}
        title="朗读原句"
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 transition-all active:scale-95 min-h-[30px]"
      >
        <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
        <span>朗读</span>
      </button>
    </div>

    {/* 西语/英语例句本体，每个词为可点击 chip */}
    <div className={`font-editorial text-base sm:text-lg text-zinc-950 leading-loose`}>
      {renderTokens(sentence, '')}
    </div>

    {/* 注释卡：当且仅当当前例句包含用户点查的词时才显示 */}
    {annotation && sentence.toLowerCase().includes(annotation.surface.toLowerCase()) && (
      <div
        className="mt-2 p-2.5 bg-amber-50 border border-amber-300/80 rounded-lg flex items-start justify-between gap-2 animate-fadeIn"
        onClick={e => e.stopPropagation()}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-editorial text-sm font-semibold text-amber-950">
              {annotation.surface}
            </span>
            {annotation.pos && (
              <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-mono">
                {annotation.pos}
              </span>
            )}
            {annotation.lemma !== annotation.surface && (
              <span className="text-[10px] text-zinc-500">
                词形 <span className="font-mono">{annotation.lemma}</span>
              </span>
            )}
          </div>
          <div className="text-xs text-zinc-800 leading-snug">{annotation.translation}</div>
          <div className="text-[10px] text-zinc-400 mt-1">
            {isEs ? '点击其他单词切换注释 · 点空白处关闭' : 'Click another word to switch · click blank to close'}
          </div>
        </div>
        <button
          onClick={onClearAnnotation}
          className="shrink-0 text-zinc-400 hover:text-zinc-700 p-1 -mr-1 -mt-1 rounded hover:bg-zinc-100/60 transition-colors"
          title="关闭注释"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )}

    {/* 英文翻译（始终显示；点击外部关闭注释） */}
    {translation && (
      <div
        className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-sans border-t border-zinc-100 pt-2"
        onClick={onClearAnnotation}
      >
        {translation}
      </div>
    )}
  </div>
);
