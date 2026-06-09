---
title: Phase 2 - Bon De Commande, UI Realtime, Action State
language: vi
phase: 2
source_tasks: P2-TASK-001 → P2-TASK-005
related_req: REQ-005..007, REQ-056..066
---

# Phase 2 - Bon De Commande, UI Realtime & Action State

Mục tiêu Phase 2: biến parser thành trải nghiệm dùng được - bảng đơn hàng realtime, cấu trúc bon de commande, action add/update/delete/validate và UI yêu cầu nói lại.

## Bảng task

| Task | Nội dung | Nguồn | Trạng thái |
|---|---|---|---|
| P2-T01 | Cấu trúc `OrderForm` (BON DE COMMANDE CLIENT) | P2-TASK-001, REQ-007 | [x] `orderForm.ts` + `BonDeCommande.tsx` |
| P2-T02 | Mapper `ParsedOrder → OrderForm` | P2-TASK-002 | [x] `mapParsedOrderToOrderForm` + test |
| P2-T03 | Order state reducer realtime (SET/ADD/UPDATE/DELETE/VALIDATE/REOPEN) | P2-TASK-003, REQ-059/060/065 | [x] `useOrderState` + validate/reopen voice |
| P2-T04 | UI một màn hình (micro/text/admin/table/preview/ignored/json/reprompt/history) | P2-TASK-004, REQ-056..058/063 | [x] `App.tsx` + AdminPanel, RepromptBanner, IgnoredSegmentsPanel |
| P2-T05 | Error handling + nói lại một lần | P2-TASK-005, REQ-061 | [x] reprompt banner + dismiss |

> Cập nhật 2026-06-09: Phase 2 wired — header dynamic, admin editable, bon de commande preview, JSON contract, ignored segments, reprompt. 31/31 tests pass.

## Chi tiết công việc

### P2-T01 - Cấu trúc Bon De Commande
- [ ] Model `OrderForm`: `title="BON DE COMMANDE CLIENT"`, `fournisseur`, `client{name,code,address}`, `date_commande`, `date_livraison`, `creneau_livraison`, `lines[]`, `totals`, `commande_passee_par`, `validation_client`, `observations`.
- [ ] `OrderFormLine`: `ref, designation, unite, qte, pu_eur, total_eur`.
- [ ] Giá/TVA/total KHÔNG được parser suy diễn → render `null`/hidden nếu chưa có catalog price.
- [ ] Render header + supplier/client/address/dates + bảng `Réf | Désignation | Unité | Qté | PU(€) | Total(€)`.
- File gợi ý: `src/types/orderForm.ts`, `src/components/BonDeCommande.tsx`.

### P2-T02 - Mapper ParsedOrder → OrderForm
- [ ] `mapParsedOrderToOrderForm(parsed, context): OrderForm`.
- [ ] `client → client.name`, `date_livraison → date_livraison`, `creneau_livraison → creneau_livraison`.
- [ ] `items[].product → lines[].designation`, `quantity → qte`, `unit → unite`.
- [ ] Không mất item, không tự thêm `ref`/price, missing fields vẫn rỗng + reprompt.

### P2-T03 - Order state realtime
- [ ] Reducer `OrderAction`: `SET_CLIENT, SET_SITE, SET_DATE, ADD_LIGNE, UPDATE_LIGNE, DELETE_LIGNE, VALIDATE, REOPEN`.
- [ ] Action words: Add (`ajoute/rajoute/mets/prends/il me faut/on met/on ajoute/prépare/j'ai besoin de`), Update (`non/plutôt/en fait/mets plutôt`), Delete (`supprime/retire/enlève`), Validate (`valide la commande/c'est bon/validé`), Reopen (`réouvre/modifier/corriger`).
- [ ] Lines xuất hiện/sửa/biến mất live; correction update đúng product; delete chỉ khi product nhận diện; VALIDATE → `status="validated"`; REOPEN → `reopened`/`draft`.
- [~] Hiện `src/hooks/useOrderState.ts` đã có add/correct/remove/replace; cần bổ sung SET_CLIENT/SET_SITE/SET_DATE/VALIDATE/REOPEN.

### P2-T04 - UI một màn hình
Khối UI cần có:
- [ ] Micro button states: ready/listening/analyzing/error/done. (đã có một phần trong `App.tsx`).
- [ ] Text area nhập tự do.
- [ ] Admin panel: client, site, date_livraison, creneau_livraison, commentaire_livraison.
- [ ] Bảng order lines: product, quantity, unit, category.
- [ ] Bon de commande preview.
- [ ] Ignored segments panel.
- [ ] Final/debug JSON panel.
- [ ] Reprompt message area.
- [ ] Action history panel (REQ-063).
- [ ] Header cố định luôn hiển thị client + date_livraison + status (REQ-057).

### P2-T05 - Error handling + nói lại một lần
Bảng hành vi lỗi:
| Case | Behavior |
|---|---|
| Product unknown | Bỏ qua line, không bịa |
| Quantity missing | Bỏ line, hỏi lại số lượng 1 lần |
| Unit unknown nhưng product OK | Dùng `pièce` nếu chuỗi vẫn hợp lệ |
| Date unknown | `date_livraison=""`, hỏi 1 lần nếu cần |
| Client unknown | `client=""`, hỏi 1 lần nếu cần |
| 100% noise | Không tạo line, đẩy vào `ignored_segments` |
| Mâu thuẫn phức tạp | Giữ line chắc chắn, không suy diễn |
| STT error | Không tự sửa bằng tưởng tượng |

- [ ] Không crash; không reprompt loop vô hạn; data đã bắt vẫn hiển thị sau reprompt; cho phép sửa tay.

## Acceptance tổng Phase 2
- [ ] Paste example → thấy parsed output + bon de commande.
- [ ] Missing fields hiển thị rỗng (không đoán).
- [ ] Reprompt xuất hiện 1 lần cho data thiếu bắt buộc.
- [ ] Ignored segments hiển thị; JSON và table đồng bộ.
