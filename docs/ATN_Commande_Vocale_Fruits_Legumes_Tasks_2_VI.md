---
title: ATN Commande Vocale Fruits & Legumes - Requirements Tasks 2
language: vi
source_docx: ATN_Commande_Vocale_Fruits_Legumes.docx
target_executor: Cursor
generated_at: 2026-06-09
format: implementation-ready-markdown
---

# ATN Commande Vocale Fruits & Légumes - Requirements Tasks_2

Tài liệu này là bản bổ sung triển khai cho Cursor. Mục tiêu là chuẩn hóa đầy đủ parser, dictionary, trigger, rule skip data, reprompt, cấu trúc hóa đơn/bon de commande và bộ test để Cursor có thể đọc rồi thực hiện theo 3 phase.

Nguyên tắc không được phá:

- Không cho AI tự suy diễn dữ liệu.
- Nếu thiếu trường thì để trống và yêu cầu người dùng nói lại một lần nữa, trừ đơn vị vì tài liệu quy định thiếu đơn vị thì dùng `pièce`.
- Sản phẩm phải nằm trong từ điển đóng.
- Số lượng phải là số nguyên và phải đứng trước sản phẩm.
- Parser dùng rule + dictionary, không dùng reasoning tự do để tạo dữ liệu.
- Các token kỹ thuật gốc như `date_livraison`, `creneau_livraison`, `ignored_segments`, `pièce`, `fruits_legumes`, `SET_CLIENT`, `ADD_LIGNE` phải giữ nguyên.

## Phase 1 - Core Parser, Dictionaries, Data Contract

Phase 1 tạo nền móng. Cursor phải triển khai schema, dictionary, parser text và unit test deterministic trước khi làm UI đẹp hoặc voice realtime.

### P1-TASK-001 - Tạo Schema Đơn Hàng Nội Bộ

Tạo type/model nội bộ cho đơn hàng:

```ts
export type OrderStatus = "draft" | "validated" | "reopened";
export type InputSource = "voice" | "text";
export type ProductCategory = "fruits_legumes";

export type OrderItem = {
  product: string;
  quantity: number;
  unit: "kg" | "pièce" | "cagette" | "botte" | "colis";
  category: ProductCategory;
  raw_segment?: string;
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

export type MissingField =
  | "client"
  | "site"
  | "date_livraison"
  | "creneau_livraison"
  | "product"
  | "quantity";

export type RepromptState = {
  required: boolean;
  already_asked: boolean;
  reason: string;
  message: string;
};
```

Acceptance:

- [ ] Schema có đủ trường admin, items, ignored_segments, missing_fields và reprompt.
- [ ] `unit` không nhận giá trị ngoài danh sách đơn vị được nhận diện.
- [ ] `category` luôn là `fruits_legumes`.
- [ ] Không thêm field đoán như price/brand/stock vào parser Phase 1.

### P1-TASK-002 - Tạo JSON Contract Bắt Buộc

Output JSON tối thiểu phải giữ đúng contract:

```json
{
  "order_id": "AUTO",
  "timestamp": "AUTO",
  "source": "voice|text",
  "user": "AUTO_SESSION_USER",
  "status": "draft",
  "client": "",
  "site": "",
  "date_livraison": "",
  "creneau_livraison": "",
  "commentaire_livraison": "",
  "items": [
    {
      "product": "",
      "quantity": 0,
      "unit": "",
      "category": "fruits_legumes"
    }
  ],
  "ignored_segments": []
}
```

Acceptance:

- [ ] `order_id`, `timestamp`, `source`, `user`, `status` do hệ thống tạo.
- [ ] Nếu thiếu `client`, `site`, `date_livraison`, `creneau_livraison`, để chuỗi rỗng.
- [ ] Nếu không có item hợp lệ, `items` là mảng rỗng.
- [ ] Nếu câu hoặc segment là nhiễu, đưa vào `ignored_segments`.
- [ ] Không tự suy diễn giá trị cho field còn thiếu.

### P1-TASK-003 - Tạo Dictionary Sản Phẩm Và Alias Đóng

File gợi ý: `src/domain/dictionaries/products.ts`

Cursor phải tạo dictionary đầy đủ:

| Product chuẩn hóa | Alias được nhận diện |
|---|---|
| `tomates` | `tomate`, `tomates` |
| `pommes de terre` | `patate`, `patates`, `pomme de terre`, `pommes de terre` |
| `carottes` | `carotte`, `carottes` |
| `courgettes` | `courgette`, `courgettes` |
| `aubergines` | `aubergine`, `aubergines` |
| `salades` | `salade`, `salades`, `laitue`, `laitues` |
| `oignons` | `oignon`, `oignons` |
| `ail` | `ail`, `gousse d ail`, `gousses d ail` |
| `poivrons` | `poivron`, `poivrons` |
| `concombres` | `concombre`, `concombres` |
| `pommes` | `pomme`, `pommes` |
| `bananes` | `banane`, `bananes` |
| `oranges` | `orange`, `oranges` |
| `citrons` | `citron`, `citrons` |
| `fraises` | `fraise`, `fraises` |
| `poires` | `poire`, `poires` |
| `kiwis` | `kiwi`, `kiwis` |
| `poireaux` | `poireau`, `poireaux` |
| `choux` | `chou`, `choux` |
| `haricots verts` | `haricot vert`, `haricots verts` |
| `champignons` | `champignon`, `champignons` |
| `clémentines` | `clémentine`, `clémentines`, `clementine`, `clementines` |
| `ananas` | `ananas` |
| `mangues` | `mangue`, `mangues` |
| `melons` | `melon`, `melons` |
| `pastèques` | `pasteque`, `pastèque`, `pasteques`, `pastèques` |

Implementation detail:

```ts
export const PRODUCT_ALIASES: Record<string, string[]> = {
  tomates: ["tomate", "tomates"],
  "pommes de terre": ["patate", "patates", "pomme de terre", "pommes de terre"]
};
```

Acceptance:

- [ ] Match alias không phân biệt hoa/thường.
- [ ] Match được alias có dấu và không dấu khi tài liệu có cả hai dạng.
- [ ] Nếu nhiều alias match chồng nhau, ưu tiên alias dài nhất trước. Ví dụ `pommes de terre` phải thắng `pommes`.
- [ ] Product output luôn là product chuẩn hóa, không phải alias raw.
- [ ] Product ngoài dictionary bị bỏ qua, không tự tạo.

### P1-TASK-004 - Tạo Dictionary Đơn Vị Được Nhận Diện

File gợi ý: `src/domain/dictionaries/units.ts`

| Unit chuẩn hóa | Dạng được nhận diện |
|---|---|
| `kg` | `kg`, `kilo`, `kilos` |
| `pièce` | `pièce`, `pièces`, rỗng/missing mặc định |
| `cagette` | `cagette`, `cagettes` |
| `botte` | `botte`, `bottes` |
| `colis` | `colis` |

Acceptance:

- [ ] `kilo`, `kilos`, `kg` normalize thành `kg`.
- [ ] `pièce`, `pièces` normalize thành `pièce`.
- [ ] Nếu thiếu unit nhưng có quantity + product hợp lệ, unit mặc định là `pièce`.
- [ ] Nếu unit lạ nhưng product đúng, chỉ dùng `pièce` khi segment vẫn hợp lệ và không làm sai nghĩa.
- [ ] Không tự thêm unit ngoài tài liệu như `tonne`, `sac`, `filet`, `caisse` vào parser Phase 1. Nếu gặp các từ này, đưa vào flow lỗi/ignored theo rule.

### P1-TASK-005 - Tạo Dictionary Từ Nhiễu Cần Bỏ Qua

File gợi ý: `src/domain/dictionaries/noise.ts`

Các từ/cụm nhiễu phải nhận diện:

```ts
export const NOISE_PHRASES = [
  "bonjour",
  "salut",
  "allo",
  "ok",
  "merci",
  "attends",
  "je reviens",
  "pour le café",
  "ça va",
  "oui bon",
  "vas-y",
  "tu m’entends",
  "je suis dans le camion",
  "je rappelle",
  "deux secondes",
  "allô tu m’entends"
];
```

Acceptance:

- [ ] Segment chỉ chứa noise không tạo item.
- [ ] Segment noise được đưa vào `ignored_segments`.
- [ ] Noise nằm trong câu có data hợp lệ không được phá extraction. Ví dụ `Bonjour attends-moi, commande pour Dupont demain matin 5 kilos de tomates` vẫn lấy được client/date/item.
- [ ] Không xóa raw text gốc nếu cần hiển thị transcript.

### P1-TASK-006 - Tạo Dictionary Trigger Admin Và Business

File gợi ý: `src/domain/dictionaries/triggers.ts`

Customer triggers:

```ts
export const CLIENT_TRIGGERS = [
  "pour",
  "client",
  "pour le client",
  "commande pour",
  "livraison pour",
  "chez"
];
```

Site triggers:

```ts
export const SITE_TRIGGERS = [
  "site",
  "dépôt",
  "depot",
  "magasin",
  "entrepôt",
  "entrepot"
];
```

Date triggers:

```ts
export const DATE_TOKENS = [
  "aujourd’hui",
  "aujourd'hui",
  "demain",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche"
];
```

Date formats:

- `dd/mm`
- `dd/mm/yyyy`

Time window triggers:

```ts
export const CRENEAU_TOKENS = [
  "matin",
  "après-midi",
  "aprem",
  "soir",
  "avant 10h",
  "avant midi",
  "fin de matinée",
  "début d’après-midi"
];
```

Command/connector triggers that must not block extraction:

```ts
export const COMMAND_CONNECTORS = [
  "et",
  "puis",
  "avec",
  "plus",
  "rajoute",
  "ajoute",
  "prends",
  "mets",
  "il faut",
  "il me faut",
  "on met",
  "on ajoute",
  "prépare",
  "j'ai besoin de",
  "commande"
];
```

Acceptance:

- [ ] Client detected after `pour`, `client`, `chez` and related trigger phrases.
- [ ] Date detected from `demain`, weekdays and date formats.
- [ ] `demain matin` can fill `date_livraison = "demain"` and `creneau_livraison = "matin"` internally, but if the expected compact output asks `date_livraison = "demain matin"`, support mapping for the test fixture.
- [ ] Connectors split segments but do not delete useful data.

### P1-TASK-007 - Tạo Trigger Skip Data Và Rule Bỏ Qua

Skip product line khi:

- Product không tồn tại trong dictionary.
- Quantity thiếu.
- Quantity không phải số nguyên.
- Quantity không đứng trước product.
- Segment có phủ định ngay trước product.
- Segment chỉ là noise.
- STT tạo text không khớp dictionary/rule.
- Command mâu thuẫn phức tạp và không xác định được dòng chắc chắn.

Negation triggers:

```ts
export const NEGATION_TRIGGERS = [
  "pas de",
  "pas",
  "sans"
];
```

Rule:

- Nếu `pas de`, `pas`, `sans` đứng ngay trước product alias, không tạo item cho product đó.
- Ví dụ: `pas de tomates` không tạo item `tomates`.
- Ví dụ: `sans salade` không tạo item `salades`.

Acceptance:

- [ ] Product line bị skip phải có lý do nội bộ để debug.
- [ ] Segment bị skip vì noise được đưa vào `ignored_segments`.
- [ ] Segment bị skip vì product/quantity thiếu không được tự sửa bằng AI.
- [ ] Nếu thiếu field quan trọng, set `reprompt.required = true`.

### P1-TASK-008 - Tạo Rule Correction Đơn Giản

Correction triggers:

```ts
export const CORRECTION_TRIGGERS = [
  "non",
  "plutôt",
  "en fait"
];
```

Rule:

- Nếu cùng một câu có `non`, `plutôt`, hoặc `en fait` ngay trước quantity mới cho cùng product, giữ occurrence cuối.
- Ví dụ `5 tomates non 6 tomates` output là `tomates / 6 / pièce`.
- Ví dụ `5 kilos de tomates, non plutôt 6 kilos de tomates` output là `tomates / 6 / kg`.

Acceptance:

- [ ] Correction chỉ áp dụng cho cùng product trong cùng câu/segment group.
- [ ] Không dùng correction để đoán product mới.
- [ ] Có test cho `non 6 tomates`, `plutôt 6 kilos de tomates`, `en fait 6 tomates`.

### P1-TASK-009 - Tạo Parser Pipeline Xác Định

Pipeline bắt buộc:

```text
Voice/Text input
→ raw_text
→ lowercase working text
→ normalize punctuation
→ split segments
→ extract admin/business fields
→ extract product lines
→ apply negation
→ apply correction
→ normalize units/products
→ validate lines
→ build JSON
→ build reprompt
→ display
```

Acceptance:

- [ ] Admin/business extraction chạy trước product line validation.
- [ ] Parser giữ raw text gốc để UI hiển thị.
- [ ] Parser dùng lowercase working text để match.
- [ ] Parser có unit tests độc lập không cần UI.

### P1-TASK-010 - Quy Tắc Trích Xuất Từ Mỗi Câu

Hệ thống phải cố gắng trích xuất:

- `client`: khách hàng, ví dụ `Dupont`, `Martin`.
- `date_livraison`: ngày giao hàng, ví dụ `demain`, `vendredi`.
- `product`: sản phẩm trong danh sách đóng rau củ quả.
- `quantity`: số nguyên.
- `unit`: `kg`, `pièce`, `cagette`, `botte`, `colis`.

Rule bắt buộc:

- [ ] Nếu product không có trong dictionary, bỏ qua.
- [ ] Nếu quantity thiếu, bỏ qua item và reprompt một lần.
- [ ] Nếu unit thiếu, dùng `pièce`, không reprompt.
- [ ] Nếu client thiếu, để `client = ""` và reprompt một lần nếu flow yêu cầu khách hàng.
- [ ] Nếu date thiếu, để `date_livraison = ""` và reprompt một lần nếu flow yêu cầu ngày giao hàng.
- [ ] Nếu creneau thiếu, để `creneau_livraison = ""`; reprompt chỉ khi nghiệp vụ bắt buộc chọn khung giờ.

### P1-TASK-011 - Reprompt Một Lần Khi Thiếu Data

Tạo function:

```ts
export function buildReprompt(parsed: ParsedOrder): RepromptState
```

Reprompt policy:

- Nếu thiếu quantity cho product đã nhận diện: hỏi lại một lần.
- Nếu không có item hợp lệ nào: hỏi lại một lần.
- Nếu thiếu client: hỏi lại một lần.
- Nếu thiếu date_livraison: hỏi lại một lần.
- Nếu user đã được hỏi lại một lần mà vẫn thiếu, không hỏi vòng lặp vô hạn. Giữ field rỗng và cho phép người dùng sửa tay.
- Unit thiếu không cần hỏi lại vì mặc định là `pièce`.

Message template:

```ts
const REPROMPT_MESSAGES = {
  missingClient: "Mình chưa nghe rõ khách hàng. Bạn nói lại tên khách hàng một lần nữa giúp mình.",
  missingDate: "Mình chưa nghe rõ ngày giao hàng. Bạn nói lại ngày giao hàng một lần nữa giúp mình.",
  missingQuantity: "Mình nghe được sản phẩm nhưng chưa rõ số lượng. Bạn nói lại số lượng một lần nữa giúp mình.",
  noValidItems: "Mình chưa bắt được dòng sản phẩm hợp lệ. Bạn nói lại đơn hàng một lần nữa giúp mình.",
  unknownProduct: "Sản phẩm này chưa có trong từ điển. Bạn nói lại bằng tên sản phẩm trong danh sách hỗ trợ giúp mình."
};
```

Acceptance:

- [ ] Reprompt không tự điền field thiếu.
- [ ] Reprompt chỉ hỏi một lần cho cùng missing state.
- [ ] UI hiển thị rõ message và vẫn giữ các field đã bắt được.
- [ ] Người dùng có thể sửa tay nếu reprompt vẫn không đủ data.

### P1-TASK-012 - Example Test Bắt Buộc

Input:

```text
Bonjour attends-moi, commande pour Dupont demain matin 5 kilos de tomates et 3 salades
```

Expected output:

```json
{
  "client": "Dupont",
  "date_livraison": "demain matin",
  "items": [
    { "product": "tomates", "quantity": 5, "unit": "kg" },
    { "product": "salades", "quantity": 3, "unit": "pièce" }
  ]
}
```

Acceptance:

- [ ] `bonjour` và `attends-moi` không phá extraction.
- [ ] `commande pour Dupont` set client.
- [ ] `demain matin` set delivery date/window theo expected fixture.
- [ ] `5 kilos de tomates` normalize thành product `tomates`, quantity `5`, unit `kg`.
- [ ] `3 salades` normalize thành product `salades`, quantity `3`, unit `pièce`.
- [ ] Không thêm product, quantity hoặc client khác.

## Phase 2 - Bon De Commande, UI Realtime, Action State

Phase 2 biến parser thành trải nghiệm dùng được: bảng đơn hàng realtime, cấu trúc bon de commande, action add/update/delete/validate và UI yêu cầu nói lại.

### P2-TASK-001 - Cấu Trúc Bon De Commande Client

Tạo model `OrderForm` để render hóa đơn/bon de commande giống mẫu:

```ts
export type OrderForm = {
  title: "BON DE COMMANDE CLIENT";
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
  totals: {
    total_ht: number | null;
    tva_rate: number | null;
    tva_amount: number | null;
    total_ttc: number | null;
  };
  commande_passee_par: string;
  validation_client: string;
  observations: string;
};

export type OrderFormLine = {
  ref: string;
  designation: string;
  unite: string;
  qte: number;
  pu_eur: number | null;
  total_eur: number | null;
};
```

Fields required for the visual invoice/order form:

| Field | Required | Source |
|---|---:|---|
| `title` | yes | fixed text |
| `fournisseur` | yes | config/default |
| `client.name` | yes | parser/user/manual |
| `client.code` | optional | customer database/manual |
| `client.address` | optional | customer database/manual |
| `date_commande` | yes | system date |
| `date_livraison` | yes | parser/user/manual |
| `creneau_livraison` | optional | parser/user/manual |
| `lines[].ref` | optional | product catalog |
| `lines[].designation` | yes | product normalized/display name |
| `lines[].unite` | yes | unit normalized/display unit |
| `lines[].qte` | yes | parser quantity |
| `lines[].pu_eur` | out of scope V1 | catalog/manual |
| `lines[].total_eur` | out of scope V1 | computed only if price exists |
| `totals` | out of scope V1 | computed only if price exists |
| `commande_passee_par` | optional | user/manual |
| `validation_client` | optional | signature/manual |
| `observations` | optional | manual/comment |

Important:

- Giá, TVA, total không được parser tự suy diễn.
- Phase 2 có thể render các field giá là `null`, rỗng hoặc hidden nếu chưa có catalog price.
- Nếu sau này có product catalog, chỉ lấy giá từ catalog/manual, không dùng AI đoán giá.

Acceptance:

- [ ] Render được header `BON DE COMMANDE CLIENT`.
- [ ] Render được supplier, client, address, order date, delivery date, delivery slot.
- [ ] Render được bảng dòng hàng: `Réf`, `Désignation`, `Unité`, `Qté`, `PU (€)`, `Total (€)`.
- [ ] Nếu thiếu price, không tính total giả.
- [ ] Observations giữ text user/manual, không tự sinh.

### P2-TASK-002 - Map ParsedOrder Sang OrderForm

Tạo mapper:

```ts
export function mapParsedOrderToOrderForm(
  parsed: ParsedOrder,
  context: OrderFormContext
): OrderForm
```

Mapping:

- `parsed.client` -> `client.name`.
- `parsed.date_livraison` -> `date_livraison`.
- `parsed.creneau_livraison` -> `creneau_livraison`.
- `parsed.items[].product` -> `lines[].designation`.
- `parsed.items[].quantity` -> `lines[].qte`.
- `parsed.items[].unit` -> `lines[].unite`.
- `category` không cần render trên invoice, nhưng vẫn giữ trong JSON.

Acceptance:

- [ ] Không mất item khi map.
- [ ] Không tự thêm `ref` nếu không có product catalog.
- [ ] Không tự thêm price nếu không có price source.
- [ ] Missing fields vẫn rỗng và có reprompt.

### P2-TASK-003 - Xây Order State Cho Hội Thoại Realtime

Tạo state reducer:

```ts
type OrderAction =
  | { type: "SET_CLIENT"; client: string }
  | { type: "SET_SITE"; site: string }
  | { type: "SET_DATE"; date_livraison: string; creneau_livraison?: string }
  | { type: "ADD_LIGNE"; item: OrderItem }
  | { type: "UPDATE_LIGNE"; product: string; item: OrderItem }
  | { type: "DELETE_LIGNE"; product: string }
  | { type: "VALIDATE" }
  | { type: "REOPEN" };
```

Action words to catch:

- Add: `ajoute`, `rajoute`, `mets`, `prends`, `il me faut`, `on met`, `on ajoute`, `prépare`, `j'ai besoin de`.
- Update/correction: `non`, `plutôt`, `en fait`, `mets plutôt`.
- Delete: `supprime`, `retire`, `enlève` nếu được chọn mở rộng Phase 2.
- Validate: `valide la commande`, `c'est bon`, `validé`.
- Reopen: `réouvre`, `modifier`, `corriger` nếu được chọn mở rộng Phase 2.

Acceptance:

- [ ] Lines appear, update, or disappear live.
- [ ] Correction updates existing product line when product matches.
- [ ] Delete removes the matching product line only if product is recognized.
- [ ] Validate sets `status = "validated"`.
- [ ] Reopen sets `status = "reopened"` or returns to `draft` according to product decision.

### P2-TASK-004 - UI Một Màn Hình

Build UI blocks:

- Micro button with states: ready/listening/analyzing/error/done.
- Text area for free-form input.
- Administrative panel: client, site, date_livraison, creneau_livraison, commentaire_livraison.
- Order lines table: product, quantity, unit, category.
- Bon de commande preview.
- Ignored segments panel.
- Final/debug JSON panel.
- Reprompt message area.
- Action history panel.

Acceptance:

- [ ] User can paste the example sentence and see parsed output.
- [ ] Missing fields show empty value, not guessed.
- [ ] Reprompt appears once for missing required data.
- [ ] Ignored segments are visible.
- [ ] JSON and table are synchronized.

### P2-TASK-005 - Error Handling Và Nói Lại Một Lần

Implement required error behavior:

| Case | Behavior |
|---|---|
| Product unknown | Ignore line, do not invent |
| Quantity missing | Ignore line, ask user to repeat quantity once |
| Unit unknown but product recognized | Use `pièce` only if sequence remains valid |
| Date unknown | Keep `date_livraison = ""`, ask once if delivery date required |
| Client unknown | Keep `client = ""`, ask once if client required |
| 100% noise sentence | Create no line, put text in `ignored_segments`, ask once if no valid data |
| Complex contradiction | Keep only certain lines, do not infer |
| STT error | Do not correct by imagination, apply dictionary and rules only |

Acceptance:

- [ ] No crash on invalid speech/text.
- [ ] No infinite reprompt loop.
- [ ] The already extracted data remains visible after reprompt.
- [ ] User can correct manually.

## Phase 3 - Dataset, Scenario Fixtures, Hardening

Phase 3 biến hệ thống thành thứ có thể test bền vững. Không làm qua loa: dataset và scenario phải là fixture chạy được.

### P3-TASK-001 - Chuẩn Hóa Bộ Dữ Liệu 200 Câu

Tạo fixture:

```text
tests/fixtures/dataset-200.json
```

Format:

```ts
export type DatasetCase = {
  id: number;
  input: string;
  expected: {
    client: string;
    site: string;
    date_livraison: string;
    creneau_livraison: string;
    items: Array<{
      product: string;
      quantity: number;
      unit: string;
      category: "fruits_legumes";
    }>;
    ignored_segments: string[];
  };
};
```

Rules:

- Mỗi câu được xử lý nguyên trạng.
- Field không được cung cấp rõ ràng thì để trống.
- Product ngoài dictionary không được tạo.
- Segment parasite không được suy diễn.

Acceptance:

- [ ] Import đủ 200 case từ tài liệu gốc.
- [ ] Mỗi case có input và expected compact JSON.
- [ ] Test runner chạy toàn bộ 200 case.
- [ ] Mismatch in ra id, input, expected, actual.

### P3-TASK-002 - Chuẩn Hóa 800 Kịch Bản Đặt Hàng Bán Buôn

Tạo fixture:

```text
tests/fixtures/dialogue-scenarios-800.json
```

Format:

```ts
export type DialogueScenario = {
  id: number;
  dialogue: string[];
  expected_actions: Array<
    | { type: "SET_CLIENT"; value: string }
    | { type: "SET_DATE"; value: string }
    | { type: "ADD_LIGNE"; product: string; quantity: number; unit: string }
    | { type: "UPDATE_LIGNE"; product: string; quantity: number; unit: string }
    | { type: "DELETE_LIGNE"; product: string }
    | { type: "IGNORE"; value: string }
    | { type: "VALIDATE"; status: "validée" }
  >;
};
```

Acceptance:

- [ ] Import đủ 800 scenario từ tài liệu gốc.
- [ ] Dialogue được giữ theo thứ tự câu nói.
- [ ] Expected action được parse thành object, không giữ text tự do nếu có thể.
- [ ] Test runner replay từng dialogue và so sánh action.

### P3-TASK-003 - Chuẩn Hóa 800 Kịch Bản Terrain Hardcore

Tạo fixture:

```text
tests/fixtures/dialogue-scenarios-hardcore-800.json
```

Hardcore scenarios phải test:

- Noise xen giữa data hợp lệ.
- Correction `non attends mets plutôt`.
- Add line bằng `ajoute`.
- Delete line bằng `supprime`.
- Validate command.
- Unit lạ như `tonnes` xuất hiện trong tài liệu scenario. Vì Phase 1 không support `tonnes`, cần test behavior rõ: skip, ignored, hoặc feature flag nếu mở rộng domain.

Acceptance:

- [ ] Cursor không tự mở rộng unit `tonnes` vào parser core nếu chưa có quyết định.
- [ ] Scenario có unit ngoài V1 phải được đánh dấu expected behavior.
- [ ] Test runner không pass bằng cách tự suy diễn.
- [ ] Action log khớp expected hoặc ghi rõ fixture cần refine.

### P3-TASK-004 - Test Matrix Bắt Buộc

Tạo test theo nhóm:

| Test group | Minimum cases |
|---|---:|
| Product aliases | 26 products |
| Unit normalization | 5 units + missing unit |
| Noise skip | all NOISE_PHRASES |
| Client triggers | all CLIENT_TRIGGERS |
| Site triggers | all SITE_TRIGGERS |
| Date tokens | all DATE_TOKENS + dd/mm + dd/mm/yyyy |
| Time window tokens | all CRENEAU_TOKENS |
| Negation | `pas de`, `pas`, `sans` |
| Correction | `non`, `plutôt`, `en fait` |
| Error behavior | all table error cases |
| Reprompt once | missing client/date/quantity/no items |
| Bon de commande mapping | parsed order to invoice preview |

Acceptance:

- [ ] Tests are deterministic.
- [ ] Tests do not call an LLM.
- [ ] Tests can run in CI.
- [ ] Tests cover happy path, skip path and reprompt path.

### P3-TASK-005 - Performance Và Logging

Performance target:

- Single text parse: under 200 ms locally for normal sentence.
- End-to-end demo response: under 3 seconds.

Logging:

```ts
type ParserDebugLog = {
  raw_text: string;
  normalized_text: string;
  segments: string[];
  extracted_admin: Record<string, string>;
  extracted_items: OrderItem[];
  ignored_segments: string[];
  skipped_segments: Array<{ segment: string; reason: string }>;
  reprompt: RepromptState;
};
```

Acceptance:

- [ ] Debug log available in development.
- [ ] No sensitive hidden inference.
- [ ] Every skipped segment has a reason.
- [ ] Performance target measured in tests or local benchmark.

## Cursor Execution Prompt

Copy/paste đoạn này cho Cursor nếu muốn nó thực thi:

```text
Read outputs/ATN_Commande_Vocale_Fruits_Legumes_Tasks_2_VI.md completely.
Implement the project in 3 phases exactly as described.
Do not infer missing order data.
Use only deterministic parser rules and dictionaries for product, unit, noise, triggers, negation and correction.
If data is missing, leave the field empty and ask the user to repeat once, except missing unit defaults to pièce.
Keep JSON keys and technical tokens unchanged.
Create fixtures for the 200 dataset and 800 dialogue scenarios from the source document.
Implement tests before polishing UI.
```

## Definition Of Done Tổng

- [ ] Phase 1 parser chạy được với example bắt buộc.
- [ ] Product alias dictionary đầy đủ.
- [ ] Unit dictionary đầy đủ.
- [ ] Noise dictionary đầy đủ.
- [ ] Admin triggers đầy đủ.
- [ ] Skip data và negation rules hoạt động.
- [ ] Correction rules hoạt động.
- [ ] Missing data reprompt đúng một lần.
- [ ] Bon de commande structure render được.
- [ ] Dataset 200 câu được fixture hóa.
- [ ] 800 scenario dialogue được fixture hóa.
- [ ] Hardcore scenario được phân loại rõ behavior.
- [ ] Không có logic AI tự suy diễn dữ liệu đơn hàng.
