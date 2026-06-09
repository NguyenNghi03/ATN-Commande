export type OrderStatus = 'draft' | 'validated' | 'reopened';
export type InputSource = 'voice' | 'text';
export type ProductCategory = 'fruits_legumes';

/** Đơn vị xuất ra theo token đặc tả (giữ nguyên dấu `pièce`). */
export type OrderUnit = 'kg' | 'pièce' | 'cagette' | 'botte' | 'colis';

export type OrderItem = {
  product: string;
  quantity: number;
  unit: OrderUnit;
  category: ProductCategory;
  raw_segment?: string;
};

export type MissingField =
  | 'client'
  | 'site'
  | 'date_livraison'
  | 'creneau_livraison'
  | 'product'
  | 'quantity';

export type RepromptReason =
  | 'missingClient'
  | 'missingDate'
  | 'missingQuantity'
  | 'noValidItems'
  | 'unknownProduct'
  | '';

export type RepromptState = {
  required: boolean;
  already_asked: boolean;
  reason: RepromptReason;
  message: string;
};

export type ParsedOrder = {
  order_id: string;
  timestamp: string;
  source: InputSource;
  user: string;
  status: OrderStatus;
  client: string;
  site: string;
  date_livraison: string;
  creneau_livraison: string;
  commentaire_livraison: string;
  items: OrderItem[];
  ignored_segments: string[];
  missing_fields: MissingField[];
  reprompt: RepromptState;
};

/** Lý do một segment bị bỏ qua, phục vụ debug (P3-TASK-005). */
export type SkippedSegment = {
  segment: string;
  reason:
    | 'noise'
    | 'unknown_product'
    | 'missing_quantity'
    | 'negated'
    | 'non_integer_quantity'
    | 'out_of_scope_unit';
};

export type ParseOptions = {
  source?: InputSource;
  user?: string;
  /** Cho phép inject thời điểm để test deterministic. */
  now?: Date;
  /** Trạng thái reprompt trước đó để không hỏi lặp vô hạn. */
  alreadyAsked?: boolean;
};
