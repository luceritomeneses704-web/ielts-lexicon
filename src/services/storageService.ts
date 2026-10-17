import { WordItem, WordGroup } from '../types/dictionary';
import { IELTS_DICTIONARY } from '../data/ieltsDictionary';

const STORAGE_KEY = 'ielts_lexicon_notebook_v1';
const AUTO_SAVE_KEY = 'ielts_lexicon_auto_save_v1';
const ACCENT_KEY = 'ielts_lexicon_accent_v1';
const GROUPS_KEY = 'ielts_lexicon_groups_v1';
const ACTIVE_GROUP_KEY = 'ielts_lexicon_active_group_v1';

export const DEFAULT_GROUPS: WordGroup[] = [
  { id: 'default', name: '默认生词本', createdAt: 1 },
  { id: 'sample_book', name: '《经济学人》精读', createdAt: 2 },
  { id: 'sample_movie', name: '《星际穿越》电影词汇', createdAt: 3 },
];

export function getGroups(): WordGroup[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (!raw) {
      localStorage.setItem(GROUPS_KEY, JSON.stringify(DEFAULT_GROUPS));
      return DEFAULT_GROUPS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (!parsed.some(g => g.id === 'default')) {
        parsed.unshift({ id: 'default', name: '默认生词本', createdAt: 1 });
      }
      return parsed;
    }
    return DEFAULT_GROUPS;
  } catch (e) {
    console.error('Failed to load groups:', e);
    return DEFAULT_GROUPS;
  }
}

export function saveGroups(groups: WordGroup[]): void {
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  } catch (e) {
    console.error('Failed to persist groups:', e);
  }
}

export function getActiveGroupId(): string {
  try {
    return localStorage.getItem(ACTIVE_GROUP_KEY) || 'default';
  } catch {
    return 'default';
  }
}

export function setActiveGroupId(groupId: string): void {
  try {
    localStorage.setItem(ACTIVE_GROUP_KEY, groupId);
  } catch (e) {
    console.error(e);
  }
}

export function createGroup(name: string): { groups: WordGroup[]; newGroupId: string } {
  const current = getGroups();
  const trimmed = name.trim();
  if (!trimmed) return { groups: current, newGroupId: 'default' };
  const newId = `group_${Date.now()}`;
  const newGroup: WordGroup = {
    id: newId,
    name: trimmed,
    createdAt: Date.now(),
  };
  const updated = [...current, newGroup];
  saveGroups(updated);
  setActiveGroupId(newId);
  return { groups: updated, newGroupId: newId };
}

export function renameGroup(groupId: string, newName: string): WordGroup[] {
  const current = getGroups();
  const trimmed = newName.trim();
  if (!trimmed) return current;
  const updated = current.map(g => (g.id === groupId ? { ...g, name: trimmed } : g));
  saveGroups(updated);
  return updated;
}

export function deleteGroup(groupId: string): { groups: WordGroup[]; words: WordItem[] } {
  if (groupId === 'default') {
    return { groups: getGroups(), words: getSavedWords() };
  }
  const currentGroups = getGroups();
  const updatedGroups = currentGroups.filter(g => g.id !== groupId);
  saveGroups(updatedGroups);

  // If active group was deleted, revert active to 'default'
  if (getActiveGroupId() === groupId) {
    setActiveGroupId('default');
  }

  // Reassign any words in this group to 'default'
  const currentWords = getSavedWords();
  const updatedWords = currentWords.map(w =>
    w.groupId === groupId ? { ...w, groupId: 'default' } : w
  );
  saveWords(updatedWords);

  return { groups: updatedGroups, words: updatedWords };
}

// Seed initial words if empty
function initializeDefaultStorage(): WordItem[] {
  return IELTS_DICTIONARY.slice(0, 6).map(w => ({
    ...w,
    groupId: w.groupId || 'default',
  }));
}

export function getSavedWords(): WordItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = initializeDefaultStorage();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(w => ({
        ...w,
        groupId: w.groupId || 'default',
      }));
    }
    return initializeDefaultStorage();
  } catch (e) {
    console.error('Failed to load words from localStorage:', e);
    return initializeDefaultStorage();
  }
}

export function saveWords(words: WordItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  } catch (e) {
    console.error('Failed to persist words:', e);
  }
}

/**
 * Automatically records or updates a looked up word in the notebook.
 * Assigns targetGroupId or currently active group.
 */
export function recordWordLookup(item: WordItem, targetGroupId?: string): { list: WordItem[]; isNew: boolean } {
  const currentList = getSavedWords();
  const itemLang = item.lang || 'en';
  // 按「语言 + 词形」匹配：英语与西语同形词（no / a / son）互不覆盖
  const index = currentList.findIndex(
    w => w.word.toLowerCase() === item.word.toLowerCase() && (w.lang || 'en') === itemLang
  );

  const activeGroup = targetGroupId || getActiveGroupId() || 'default';
  let updatedList: WordItem[];
  let isNew = false;

  if (index >= 0) {
    const existing = currentList[index];
    const updated: WordItem = {
      ...existing,
      lookupCount: (existing.lookupCount || 1) + 1,
      lastLookedUpAt: Date.now(),
      // If targetGroupId is provided explicitly, update group
      groupId: targetGroupId || existing.groupId || activeGroup,
    };
    updatedList = [updated, ...currentList.filter((_, i) => i !== index)];
  } else {
    isNew = true;
    const newWord: WordItem = {
      ...item,
      id: item.id || `${item.word.toLowerCase()}_${Date.now()}`,
      lang: itemLang, // 英语词条统一标记 'en'，便于生词本按词典隔离
      addedAt: Date.now(),
      lastLookedUpAt: Date.now(),
      lookupCount: 1,
      mastered: false,
      starred: false,
      groupId: activeGroup,
    };
    updatedList = [newWord, ...currentList];
  }

  saveWords(updatedList);
  return { list: updatedList, isNew };
}

export function deleteWord(id: string): WordItem[] {
  const current = getSavedWords();
  const updated = current.filter(w => w.id !== id);
  saveWords(updated);
  return updated;
}

export function deleteMultipleWords(ids: string[]): WordItem[] {
  const set = new Set(ids);
  const current = getSavedWords();
  const updated = current.filter(w => !set.has(w.id));
  saveWords(updated);
  return updated;
}

export function updateWord(updatedWord: WordItem): WordItem[] {
  const current = getSavedWords();
  const updated = current.map(w => (w.id === updatedWord.id ? updatedWord : w));
  saveWords(updated);
  return updated;
}

export function assignWordGroup(wordId: string, groupId: string): WordItem[] {
  const current = getSavedWords();
  const updated = current.map(w => (w.id === wordId ? { ...w, groupId } : w));
  saveWords(updated);
  return updated;
}

export function batchAssignWordsGroup(wordIds: string[], groupId: string): WordItem[] {
  const set = new Set(wordIds);
  const current = getSavedWords();
  const updated = current.map(w => (set.has(w.id) ? { ...w, groupId } : w));
  saveWords(updated);
  return updated;
}

export function toggleWordStar(id: string): WordItem[] {
  const current = getSavedWords();
  const updated = current.map(w => (w.id === id ? { ...w, starred: !w.starred } : w));
  saveWords(updated);
  return updated;
}

export function toggleWordMastered(id: string): WordItem[] {
  const current = getSavedWords();
  const updated = current.map(w => (w.id === id ? { ...w, mastered: !w.mastered } : w));
  saveWords(updated);
  return updated;
}

export function getAutoSaveSetting(): boolean {
  try {
    const val = localStorage.getItem(AUTO_SAVE_KEY);
    return val !== 'false';
  } catch {
    return true;
  }
}

export function setAutoSaveSetting(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_SAVE_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.error(e);
  }
}

/** 当前词典语言（en=英语雅思词典 / es=西语词典） */
const DICTIONARY_LANG_KEY = 'ielts_lexicon_dictionary_lang';

export function getDictionaryLang(): 'en' | 'es' {
  try {
    return localStorage.getItem(DICTIONARY_LANG_KEY) === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

export function setDictionaryLang(lang: 'en' | 'es'): void {
  try {
    localStorage.setItem(DICTIONARY_LANG_KEY, lang);
  } catch (e) {
    console.error(e);
  }
}

export function getPreferredAccent(): 'UK' | 'US' {
  try {
    const val = localStorage.getItem(ACCENT_KEY);
    return val === 'US' ? 'US' : 'UK';
  } catch {
    return 'UK';
  }
}

export function setPreferredAccent(accent: 'UK' | 'US'): void {
  try {
    localStorage.setItem(ACCENT_KEY, accent);
  } catch (e) {
    console.error(e);
  }
}
