/** Bon de commande client (P2-TASK-001). Giá/TVA out-of-scope V1 -> null. */
export type OrderFormLine = {
  ref: string;
  designation: string;
  unite: string;
  qte: number;
  pu_eur: number | null;
  total_eur: number | null;
};

export type OrderFormTotals = {
  total_ht: number | null;
  tva_rate: number | null;
  tva_amount: number | null;
  total_ttc: number | null;
};

export type OrderForm = {
  title: 'BON DE COMMANDE CLIENT';
  fournisseur: string;
  client: {
    name: string;
    code: string;
    address: string;
  };
  date_commande: string;
  date_livraison: string;
  creneau_livraison: string;
  lines: OrderFormLine[];
  totals: OrderFormTotals;
  commande_passee_par: string;
  validation_client: string;
  observations: string;
};

export type OrderFormContext = {
  fournisseur?: string;
  client_code?: string;
  client_address?: string;
  date_commande?: string;
  commande_passee_par?: string;
  observations?: string;
};
