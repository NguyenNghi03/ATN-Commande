import productsData from './products.json';
import actionsData from './actions.json';
import unitsData from './units.json';
import ignoreData from './ignore-segments.json';
import configData from './config.json';

export type Lang = 'fr' | 'en' | 'vi';

export type KeywordConfig = {
  matchThreshold: number;
  _matchThresholdHelp?: string;
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
  type: 'add' | 'correct' | 'remove' | 'ignore';
  keywords: Record<Lang, string[]>;
  logLabel: Record<Lang, string>;
};

export type UnitKeyword = {
  unite: string;
  keywords: Record<Lang, string[]>;
};

export const keywordConfig = configData as KeywordConfig;

/** 0 = khớp chính xác, 1 = fuzzy rộng (sai số lớn hơn). */
export const matchThreshold = Math.min(1, Math.max(0, keywordConfig.matchThreshold ?? 0));

export const products = productsData.products as ProductKeyword[];
export const actions = actionsData.actions as ActionKeyword[];
export const units = unitsData.units as UnitKeyword[];
export const ignoreSegments = ignoreData.segments;

export function allProductKeywords(): { product: ProductKeyword; keyword: string }[] {
  const entries: { product: ProductKeyword; keyword: string }[] = [];
  for (const product of products) {
    for (const lang of ['fr', 'en', 'vi'] as Lang[]) {
      for (const kw of product.keywords[lang]) {
        entries.push({ product, keyword: kw });
      }
    }
  }
  return entries.sort((a, b) => b.keyword.length - a.keyword.length);
}

export function allUnitKeywords(): { unite: string; keyword: string }[] {
  const entries: { unite: string; keyword: string }[] = [];
  for (const unit of units) {
    for (const lang of ['fr', 'en', 'vi'] as Lang[]) {
      for (const kw of unit.keywords[lang]) {
        entries.push({ unite: unit.unite, keyword: kw });
      }
    }
  }
  return entries.sort((a, b) => b.keyword.length - a.keyword.length);
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
