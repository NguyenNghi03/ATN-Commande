import productsData from './products.json';
import actionsData from './actions.json';
import unitsData from './units.json';
import ignoreData from './ignore-segments.json';
import configData from './config.json';
import triggersData from './triggers.json';

export type Lang = 'fr' | 'en' | 'vi';

export type KeywordConfig = {
  matchThreshold: number;
  suggestThreshold?: number;
  rejectBelow?: number;
  maxInputLength?: number;
  maxWords?: number;
  minScoreGap?: number;
  maxActionLog?: number;
  maxUserNotices?: number;
  _matchThresholdHelp?: string;
  _suggestThresholdHelp?: string;
  _minScoreGapHelp?: string;
  _maxActionLogHelp?: string;
  _maxUserNoticesHelp?: string;
};

export type FuzzyConfig = {
  autoMatchThreshold: number;
  suggestThreshold: number;
  rejectBelow: number;
  maxInputLength: number;
  maxWords: number;
  minScoreGap: number;
};

export type ProductKeyword = {
  id: string;
  produit: string;
  emoji: string;
  categorie: string;
  avatar: string;
  defaultUnite: string;
  keywords: Record<Lang, string[]>;
};

export type ActionKeyword = {
  type: 'add' | 'correct' | 'remove' | 'replace' | 'ignore';
  keywords: Record<Lang, string[]>;
  logLabel: Record<Lang, string>;
};

export type UnitKeyword = {
  unite: string;
  keywords: Record<Lang, string[]>;
};

export const keywordConfig = configData as KeywordConfig;

/** Ngưỡng score tối thiểu để tự khớp sản phẩm (0–1). */
export const matchThreshold = Math.min(1, Math.max(0, keywordConfig.matchThreshold ?? 0.82));

export const fuzzyConfig: FuzzyConfig = {
  autoMatchThreshold: matchThreshold,
  suggestThreshold: Math.min(1, Math.max(0, keywordConfig.suggestThreshold ?? 0.7)),
  rejectBelow: Math.min(1, Math.max(0, keywordConfig.rejectBelow ?? 0.7)),
  maxInputLength: Math.max(10, keywordConfig.maxInputLength ?? 80),
  maxWords: Math.max(2, keywordConfig.maxWords ?? 10),
  minScoreGap: Math.min(1, Math.max(0, keywordConfig.minScoreGap ?? 0.08)),
};

/** Khoảng cách Levenshtein tối đa khi quét ứng viên fuzzy (1 - rejectBelow). */
export const fuzzySearchMaxDistance = 1 - fuzzyConfig.rejectBelow;

export const maxActionLog = Math.max(1, keywordConfig.maxActionLog ?? 10);
export const maxUserNotices = Math.max(1, keywordConfig.maxUserNotices ?? 10);

export const products = productsData.products as ProductKeyword[];
export const actions = actionsData.actions as ActionKeyword[];
export const units = unitsData.units as UnitKeyword[];
export const ignoreSegments = ignoreData.segments;

export type TriggerDictionary = {
  client: string[];
  site: string[];
  date_tokens: string[];
  creneau: string[];
  connectors: string[];
  item_connectors: string[];
  negation: string[];
  correction: string[];
  validate: string[];
};

export const triggers = triggersData as TriggerDictionary;

function sortKeywordEntries<T extends { keyword: string }>(
  entries: T[],
  preferredLang?: Lang,
  langOf?: (entry: T) => Lang,
): T[] {
  return entries.sort((a, b) => {
    if (preferredLang && langOf) {
      const aPref = langOf(a) === preferredLang ? 1 : 0;
      const bPref = langOf(b) === preferredLang ? 1 : 0;
      if (aPref !== bPref) return bPref - aPref;
    }
    return b.keyword.length - a.keyword.length;
  });
}

export function allProductKeywords(
  preferredLang?: Lang,
): { product: ProductKeyword; keyword: string; lang: Lang }[] {
  const entries: { product: ProductKeyword; keyword: string; lang: Lang }[] = [];
  for (const product of products) {
    for (const lang of ['fr', 'en', 'vi'] as Lang[]) {
      for (const kw of product.keywords[lang]) {
        entries.push({ product, keyword: kw, lang });
      }
    }
  }
  return sortKeywordEntries(entries, preferredLang, (e) => e.lang);
}

export function allUnitKeywords(
  preferredLang?: Lang,
): { unite: string; keyword: string; lang: Lang }[] {
  const entries: { unite: string; keyword: string; lang: Lang }[] = [];
  for (const unit of units) {
    for (const lang of ['fr', 'en', 'vi'] as Lang[]) {
      for (const kw of unit.keywords[lang]) {
        entries.push({ unite: unit.unite, keyword: kw, lang });
      }
    }
  }
  return sortKeywordEntries(entries, preferredLang, (e) => e.lang);
}

export function allActionKeywords(): { type: ActionKeyword['type']; keyword: string }[] {
  const entries: { type: ActionKeyword['type']; keyword: string }[] = [];
  for (const action of actions) {
    for (const lang of ['fr', 'en', 'vi'] as Lang[]) {
      for (const kw of action.keywords[lang]) {
        entries.push({ type: action.type, keyword: kw });
      }
    }
  }
  return entries.sort((a, b) => b.keyword.length - a.keyword.length);
}

export function allIgnoreKeywords(): string[] {
  const keys: string[] = [];
  for (const segment of ignoreSegments) {
    for (const lang of ['fr', 'en', 'vi'] as Lang[]) {
      keys.push(...segment.keywords[lang]);
    }
  }
  return keys.sort((a, b) => b.length - a.length);
}
