import React, { useState, useRef, useEffect } from 'react';
import { ViewMode, DictionaryLang } from '../types/dictionary';
import { Search, BookMarked, Sparkles, ChevronDown, BookOpen, Languages } from 'lucide-react';

interface HeaderProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  savedCount: number;
  autoSave: boolean;
  onToggleAutoSave: () => void;
  /** 当前词典语言 */
  currentDictionary: DictionaryLang;
  /** 切换词典 */
  onSelectDictionary: (lang: DictionaryLang) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  savedCount,
  autoSave,
  onToggleAutoSave,
  currentDictionary,
  onSelectDictionary,
}) => {
  const [dictMenuOpen, setDictMenuOpen] = useState(false);
  const dictMenuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭词典下拉菜单
  useEffect(() => {
    if (!dictMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (dictMenuRef.current && !dictMenuRef.current.contains(e.target as Node)) {
        setDictMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dictMenuOpen]);

  return (
    <>
      {/* Top Bar for Desktop and Mobile */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 transition-colors">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Zone 1: Wordmark + 词典切换 */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => onSelectView('dict')}
              className="text-left group focus:outline-none min-h-[44px] flex items-center"
            >
              <span className="font-editorial text-lg sm:text-2xl font-semibold tracking-tight text-zinc-950 group-hover:text-zinc-600 transition-colors">
                IELTS Lexicon
              </span>
            </button>

            {/* 词典切换按钮（英语 / 西语） */}
            <div className="relative" ref={dictMenuRef}>
              <button
                onClick={() => setDictMenuOpen(o => !o)}
                title="选择要使用的词典"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 min-h-[40px] text-xs font-medium text-zinc-700 hover:text-zinc-950 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors whitespace-nowrap active:scale-95 touch-manipulation"
              >
                {currentDictionary === 'es'
                  ? <Languages className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  : <BookOpen className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
                <span>{currentDictionary === 'es' ? '西语词典' : '英语词典'}</span>
                <ChevronDown className={`w-3 h-3 text-zinc-400 shrink-0 transition-transform ${dictMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {dictMenuOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-56 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={() => { onSelectDictionary('en'); setDictMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors ${currentDictionary === 'en' ? 'bg-zinc-50' : 'hover:bg-zinc-50'}`}
                  >
                    <BookOpen className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-950">英语词典</span>
                      <span className="block text-[11px] text-zinc-500 mt-0.5">雅思核心词库 · 牛津高阶 · 词汇真经</span>
                    </span>
                  </button>
                  <button
                    onClick={() => { onSelectDictionary('es'); setDictMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors border-t border-zinc-100 ${currentDictionary === 'es' ? 'bg-zinc-50' : 'hover:bg-zinc-50'}`}
                  >
                    <Languages className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-950">西语词典</span>
                      <span className="block text-[11px] text-zinc-500 mt-0.5">19,486 高频词 · 英文释义 · 例句对照</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Zone 2: Desktop Navigation Tabs (Hidden on small mobile screens) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => onSelectView('dict')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap min-h-[40px] flex items-center ${
                currentView === 'dict'
                  ? 'text-zinc-950 font-semibold border-b-2 border-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              查阅词典
            </button>

            <button
              onClick={() => onSelectView('notebook')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 min-h-[40px] ${
                currentView === 'notebook'
                  ? 'text-zinc-950 font-semibold border-b-2 border-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <span>生词本</span>
              <span className="text-xs px-1.5 py-0.2 text-zinc-700 bg-zinc-100 rounded tabular-nums font-mono">
                {savedCount}
              </span>
            </button>

            <button
              onClick={() => onSelectView('review')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 min-h-[40px] ${
                currentView === 'review'
                  ? 'text-zinc-950 font-semibold border-b-2 border-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <span>记忆卡片</span>
            </button>
          </nav>

          {/* Zone 3: Functional Utilities (Compact & Mobile-friendly) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Auto-Save toggle (English status with responsive text) */}
            <button
              onClick={onToggleAutoSave}
              title={autoSave ? 'Auto-Save is Enabled' : 'Auto-Save is Disabled'}
              className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 min-h-[40px] text-xs text-zinc-700 hover:text-zinc-950 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors whitespace-nowrap active:scale-95 touch-manipulation"
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${autoSave ? 'bg-zinc-900' : 'bg-zinc-300'}`} />
              <span className="font-mono font-medium hidden sm:inline">Auto-Save: {autoSave ? 'ON' : 'OFF'}</span>
              <span className="font-mono font-medium sm:hidden">{autoSave ? 'Auto: ON' : 'Auto: OFF'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (Thumb Zone Optimized with safe area) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/90 shadow-lg flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom)]">
        <button
          onClick={() => onSelectView('dict')}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors active:scale-95 touch-manipulation ${
            currentView === 'dict' ? 'text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 tracking-tight">查阅词典</span>
        </button>

        <button
          onClick={() => onSelectView('notebook')}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors relative active:scale-95 touch-manipulation ${
            currentView === 'notebook' ? 'text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <div className="relative">
            <BookMarked className="w-5 h-5" />
            {savedCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 text-[9px] font-mono bg-zinc-950 text-white rounded-full min-w-[14px] text-center leading-tight">
                {savedCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">生词本</span>
        </button>

        <button
          onClick={() => onSelectView('review')}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors active:scale-95 touch-manipulation ${
            currentView === 'review' ? 'text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 tracking-tight">记忆卡片</span>
        </button>
      </nav>
    </>
  );
};
