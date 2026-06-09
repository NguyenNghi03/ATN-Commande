---
title: Phase 1 - Core Parser, Dictionaries, Data Contract
language: vi
phase: 1
source_tasks: P1-TASK-001 → P1-TASK-012
related_req: REQ-001..045, STD-001..010
---

# Phase 1 - Core Parser, Dictionaries & Data Contract

Mục tiêu Phase 1: dựng **nền móng deterministic**. Hoàn thiện schema, JSON contract, dictionary đóng, parser text + unit test trước khi làm UI đẹp hay voice realtime.

> Quy tắc: rule + dictionary, không reasoning tự do. Thiếu field → để trống + reprompt (trừ unit mặc định `pièce`).

## Bảng task

| Task | Nội dung | Nguồn | Trạng thái |
|---|---|---|---|
| P1-T01 | Schema đơn hàng nội bộ (`ParsedOrder`, `OrderItem`, `MissingField`, `RepromptState`) | P1-TASK-001, REQ-010/011 | [x] `src/types/parsedOrder.ts` |
| P1-T02 | JSON contract bắt buộc + AUTO fields | P1-TASK-002, REQ-010/012 | [x] `toJsonContract()` + test |
| P1-T03 | Dictionary sản phẩm + alias (26 sản phẩm) | P1-TASK-003, REQ-027 | [x] đã mở rộng products.json |
| P1-T04 | Dictionary đơn vị (kg/pièce/cagette/botte/colis) | P1-TASK-004, REQ-028 | [x] đã thêm botte |
| P1-T05 | Dictionary nhiễu | P1-TASK-005, REQ-029 | [~] có sẵn, cần bổ sung cụm |
| P1-T06 | Dictionary trigger admin/business (client/site/date/creneau/connector) | P1-TASK-006, REQ-017..020/023 | [x] `triggers.json` + extraction |
| P1-T07 | Rule skip data + negation | P1-TASK-007, REQ-013/014/025/038/039 | [x] negation + skip reason |
| P1-T08 | Rule correction đơn giản (`non/plutôt/en fait`) | P1-TASK-008, REQ-024 | [x] last-wins per product |
| P1-T09 | Parser pipeline deterministic | P1-TASK-009, REQ-009/026/030..037 | [x] `parseOrder()` |
| P1-T10 | Quy tắc trích xuất từng câu | P1-TASK-010, REQ-006 | [x] (unit mặc định pièce, skip rule) |
| P1-T11 | Reprompt một lần khi thiếu data | P1-TASK-011, REQ-061 | [x] `buildReprompt()` |
| P1-T12 | Example test bắt buộc | P1-TASK-012 | [x] test pass |

> Cập nhật 2026-06-09: parser deterministic Phase 1 đã implement tại `src/lib/parseOrder.ts`, kiểm chứng bằng `tests/parseOrder.test.ts` + `tests/datasetRunner.test.ts` (27/27 pass). Phần còn lại: nối parser vào UI (Phase 2) và bổ sung NOISE_PHRASES (P1-T05).

Chú thích: `[x]` xong, `[~]` có một phần/cần sửa, `[ ]` chưa làm.

## Chi tiết công việc

### P1-T01 - Schema đơn hàng nội bộ
- [ ] Tạo type `ParsedOrder` với đủ admin fields, `items[]`, `ignored_segments[]`, `missing_fields[]`, `reprompt`.
- [ ] `OrderItem.unit` chỉ nhận `kg | pièce | cagette | botte | colis`.
- [ ] `category` luôn `fruits_legumes`.
- [ ] Không thêm field đoán (price/brand/stock) vào parser Phase 1.
- File gợi ý: `src/types/parsedOrder.ts` (bổ sung cạnh `src/types/order.ts` hiện có).

### P1-T02 - JSON contract bắt buộc
- [ ] Build JSON với keys: `order_id, timestamp, source, user, status, client, site, date_livraison, creneau_livraison, commentaire_livraison, items, ignored_segments`.
- [ ] `order_id/timestamp/source/user/status` do hệ thống tạo (AUTO).
- [ ] Field admin thiếu → chuỗi rỗng `""`.
- [ ] Không có item hợp lệ → `items: []`.
- [ ] Segment nhiễu → đẩy vào `ignored_segments`.
- [ ] Không suy diễn giá trị thiếu.

### P1-T03 - Dictionary sản phẩm + alias  ✅ (đã thực hiện)
- [x] `src/data/keywords/products.json` mở rộng đủ **26 sản phẩm** chuẩn hóa: tomates, pommes de terre, carottes, courgettes, aubergines, salades, oignons, ail, poivrons, concombres, pommes, bananes, oranges, citrons, fraises, poires, kiwis, poireaux, choux, haricots verts, champignons, clémentines, ananas, mangues, melons, pastèques.
- [x] Match alias không phân biệt hoa/thường, có dấu/không dấu.
- [x] Output luôn là product chuẩn hóa (field `produit`/`id`), không phải alias raw.
- [ ] Cần xác nhận rule "alias dài nhất thắng" (vd `pommes de terre` thắng `pommes`) trong `findProduct` - hiện sort theo `keyword.length` đã hỗ trợ phần lớn, cần test riêng.

### P1-T04 - Dictionary đơn vị  ✅ (đã thực hiện)
- [x] Thêm đơn vị `botte` vào `src/data/keywords/units.json`.
- [x] `kilo/kilos/kg → kg`; `pièce/pièces → pièce` (lưu ý: id nội bộ hiện là `piece`, cần thống nhất sang token `pièce` ở bước serialize JSON).
- [ ] Nếu thiếu unit nhưng có quantity + product hợp lệ → mặc định `pièce`.
- [ ] Không tự thêm unit ngoài tài liệu (`tonne/sac/filet/caisse`) vào parser core.

### P1-T05 - Dictionary nhiễu
- [~] `src/data/keywords/ignore-segments.json` đã có cụm cơ bản.
- [ ] Bổ sung đủ NOISE_PHRASES: `allo`, `je reviens`, `pour le café`, `oui bon`, `vas-y`, `tu m'entends`, `je suis dans le camion`, `je rappelle`, `deux secondes`, `allô tu m'entends`.
- [ ] Segment chỉ chứa noise → không tạo item, đẩy vào `ignored_segments`.
- [ ] Noise xen giữa data hợp lệ không được phá extraction.

### P1-T06 - Dictionary trigger admin/business
- [ ] CLIENT_TRIGGERS: `pour, client, pour le client, commande pour, livraison pour, chez`.
- [ ] SITE_TRIGGERS: `site, dépôt, depot, magasin, entrepôt, entrepot`.
- [ ] DATE_TOKENS: `aujourd'hui, demain, lundi..dimanche` + format `dd/mm`, `dd/mm/yyyy`.
- [ ] CRENEAU_TOKENS: `matin, après-midi, aprem, soir, avant 10h, avant midi, fin de matinée, début d'après-midi`.
- [ ] COMMAND_CONNECTORS: `et, puis, avec, plus, rajoute, ajoute, prends, mets, il faut, il me faut, on met, on ajoute, prépare, j'ai besoin de, commande` - tách segment nhưng không xóa data.
- File gợi ý: `src/data/keywords/triggers.json`.

### P1-T07 - Rule skip data + negation
- [ ] Skip product line khi: product ngoài dictionary, thiếu quantity, quantity không phải số nguyên, quantity không đứng trước product, negation đứng ngay trước product, segment chỉ noise, STT lệch dictionary, command mâu thuẫn.
- [ ] NEGATION_TRIGGERS: `pas de, pas, sans` ngay trước product → không tạo item.
- [ ] Mỗi line bị skip phải có `reason` nội bộ để debug.
- [ ] Thiếu field quan trọng → `reprompt.required = true`.

### P1-T08 - Rule correction đơn giản
- [ ] CORRECTION_TRIGGERS: `non, plutôt, en fait`.
- [ ] Cùng câu + cùng product → giữ occurrence cuối. Vd `5 tomates non 6 tomates` → `tomates/6/pièce`.
- [ ] Không dùng correction để đoán product mới.
- [ ] Test: `non 6 tomates`, `plutôt 6 kilos de tomates`, `en fait 6 tomates`.

### P1-T09 - Parser pipeline deterministic
Pipeline bắt buộc: `input → raw_text → lowercase → normalize punct → split segments → extract admin → extract product lines → negation → correction → normalize unit/product → validate → build JSON → build reprompt → display`.
- [ ] Admin extraction chạy TRƯỚC product line validation.
- [ ] Giữ raw text gốc để UI hiển thị; match dùng lowercase.
- [ ] Parser có unit test độc lập, không cần UI.

### P1-T10 - Quy tắc trích xuất từng câu
- [ ] Product ngoài dictionary → bỏ qua.
- [ ] Thiếu quantity → bỏ item + reprompt 1 lần.
- [ ] Thiếu unit → dùng `pièce`, không reprompt.
- [ ] Thiếu client/date → để rỗng + reprompt 1 lần nếu flow yêu cầu.

### P1-T11 - Reprompt một lần
- [ ] `buildReprompt(parsed): RepromptState`.
- [ ] Reprompt không tự điền field thiếu, chỉ hỏi 1 lần / missing state, không loop vô hạn.
- [ ] Message template: missingClient/missingDate/missingQuantity/noValidItems/unknownProduct.

### P1-T12 - Example test bắt buộc
Input: `Bonjour attends-moi, commande pour Dupont demain matin 5 kilos de tomates et 3 salades`
Expected: `client=Dupont`, `date_livraison=demain matin`, items `[tomates/5/kg, salades/3/pièce]`.
- [ ] noise không phá extraction; client/date set đúng; 2 item đúng; không thêm dữ liệu khác.

## Acceptance tổng Phase 1
- [ ] Parser chạy được example bắt buộc P1-T12.
- [ ] 26 product alias, 5 unit, noise, admin trigger đầy đủ.
- [ ] Skip/negation/correction hoạt động.
- [ ] JSON contract khớp tài liệu.
- [ ] Không suy diễn dữ liệu.
