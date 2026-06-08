export type OrderRow = {
  id: number;
  productId: string;
  produit: string;
  emoji: string;
  categorie: string;
  qte: number;
  unite: string;
  avatar: string;
};

export type ActionType = 'add' | 'correct' | 'ignore' | 'remove';

export type ActionLogEntry = {
  type: ActionType;
  product?: string;
  label: string;
  time: string;
  isLatest: boolean;
};

export type ParsedOrderMessage =
  | {
      type: 'add';
      productId: string;
      produit: string;
      qte: number;
      unite: string;
      emoji: string;
      categorie: string;
      avatar: string;
      logLabel: string;
    }
  | {
      type: 'correct';
      productId: string;
      produit: string;
      qte: number;
      oldQte?: number;
      unite: string;
      logLabel: string;
    }
  | {
      type: 'remove';
      productId: string;
      produit: string;
      logLabel: string;
    }
  | {
      type: 'ignore';
      segments: string[];
      logLabel: string;
    }
  | { type: 'unknown' };
