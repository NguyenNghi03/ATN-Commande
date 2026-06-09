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

export type ActionType = 'add' | 'correct' | 'ignore' | 'remove' | 'replace';

export type ActionLogPhase = 'pending' | 'done';

export type ActionLogEntry = {
  id: string;
  type: ActionType;
  product?: string;
  /** Texte brut pour type ignore uniquement */
  label?: string;
  qte?: number;
  oldQte?: number;
  fromProduct?: string;
  unite?: string;
  /** Cụm người dùng nói/nhập gắn với action này */
  userText: string;
  source: 'voice' | 'text';
  time: string;
  isLatest: boolean;
  /** pending = spinner avant mise à jour tableau ; done = icône finale */
  phase: ActionLogPhase;
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
      /** Số lượng bớt; thiếu = xóa hết dòng. */
      qte?: number;
      unite: string;
      logLabel: string;
    }
  | {
      type: 'replace';
      fromProductId: string;
      fromProduit: string;
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
      type: 'ignore';
      segments: string[];
      logLabel: string;
    }
  | { type: 'unknown' };
