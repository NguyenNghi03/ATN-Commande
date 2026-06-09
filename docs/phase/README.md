---
title: ATN Commande Vocale - Kế Hoạch Phase & Task
language: vi
source_docs:
  - ATN_Commande_Vocale_Fruits_Legumes_Tasks_VI.md
  - ATN_Commande_Vocale_Fruits_Legumes_Tasks_2_VI.md
generated_at: 2026-06-09
status: planning
---

# ATN Commande Vocale Fruits & Légumes - Kế Hoạch Phase

Folder này tổng hợp toàn bộ công việc cần thực hiện, được trích từ 2 tài liệu yêu cầu trong `docs/`:

- `ATN_Commande_Vocale_Fruits_Legumes_Tasks_VI.md` - 69 yêu cầu (REQ) + 10 tiêu chuẩn triển khai (STD) + Definition of Done.
- `ATN_Commande_Vocale_Fruits_Legumes_Tasks_2_VI.md` - bản triển khai chia sẵn 3 Phase (P1/P2/P3) cho Cursor.

Mục tiêu: chuyển lời nói / văn bản tự do thành **phiếu đặt hàng rau củ quả có cấu trúc** (JSON contract + bảng realtime + bon de commande), parser **deterministic** (rule + dictionary), **không suy diễn** dữ liệu thiếu.

## Danh sách file Phase

| File | Nội dung | Trạng thái |
|---|---|---|
| `Phase-1-Core-Parser-Dictionaries.md` | Schema, JSON contract, dictionary (product/unit/noise/trigger), parser deterministic, negation/correction, reprompt | Chưa hoàn tất |
| `Phase-2-UI-Bon-De-Commande.md` | Bon de commande, mapper, order state realtime, UI một màn hình, error handling | Chưa hoàn tất |
| `Phase-3-Tests-Dataset.md` | Dataset 200 câu, 800 scenario dialogue, 800 scenario hardcore, test matrix, performance/logging | Chưa hoàn tất |

## Trạng thái hiện tại của codebase (đánh giá ngày 2026-06-09)

Phần đã có (một phần, lệch so với đặc tả):

- Parser đa ngôn ngữ `fr/en/vi` với fuzzy matching (`src/lib/parseOrderMessage.ts`).
- Dictionary product/unit/action/noise dạng JSON (`src/data/keywords/*.json`).
- UI micro + waveform + bảng sản phẩm (`src/App.tsx`, `src/components/OrderedProductsTable.tsx`).
- Speech recognition hook (`src/hooks/useSpeechRecognition.ts`), order state hook (`src/hooks/useOrderState.ts`).

Phần CÒN THIẾU so với đặc tả (đưa vào các Phase bên dưới):

1. **Product dictionary chưa đủ:** mới có 10/26 sản phẩm bắt buộc. → Xem Phase 1, mục thực phẩm/fruits (đã thực hiện trong commit này).
2. **JSON contract `ParsedOrder`** (client/site/date_livraison/creneau_livraison/items/ignored_segments/...) chưa được build ra.
3. **Trích xuất admin/business** (client, site, date, creneau) bằng trigger chưa có.
4. **Negation** (`pas de`, `pas`, `sans`) và **correction `non/plutôt/en fait`** chưa được implement đúng đặc tả.
5. **Reprompt một lần** khi thiếu data chưa có.
6. **Bon de commande** (OrderForm) và mapper chưa có.
7. **Test fixtures** (200 câu / 800 scenario / test matrix) chưa có → khởi tạo trong commit này (sample + format).

## Hai phần được implement kèm theo kế hoạch này

Theo yêu cầu, ngoài việc liệt kê task, commit này đã thực hiện sẵn 2 phần nền tảng:

1. **Thực phẩm / Fruits & Légumes:** mở rộng `src/data/keywords/products.json` lên đủ **26 sản phẩm** bắt buộc theo bảng alias trong `Tasks_2_VI.md` (P1-TASK-003), kèm thêm đơn vị `botte` vào `src/data/keywords/units.json` (P1-TASK-004).
2. **Kịch bản test:** khởi tạo `tests/fixtures/` với format chuẩn cho dataset 200 câu, scenario dialogue, scenario hardcore và test matrix (P3-TASK-001 → P3-TASK-004), kèm bộ case mẫu đại diện.

## Bản đồ truy vết yêu cầu → Phase

| Nhóm yêu cầu nguồn | Phase phụ trách |
|---|---|
| STD-001 → STD-010 (tiêu chuẩn xuyên suốt) | Áp dụng cho cả 3 Phase |
| REQ-009 → REQ-016, REQ-021 → REQ-045 (pipeline, parsing, lỗi, dictionary) | Phase 1 |
| REQ-001 → REQ-008, REQ-010 → REQ-011 (mục tiêu, phạm vi, JSON) | Phase 1 |
| REQ-056 → REQ-066 (UX, use case realtime) | Phase 2 |
| REQ-067 → REQ-069 (dataset 200, scenario 800 x2) | Phase 3 |
| P1-TASK-001 → P1-TASK-012 | Phase 1 |
| P2-TASK-001 → P2-TASK-005 | Phase 2 |
| P3-TASK-001 → P3-TASK-005 | Phase 3 |

## Nguyên tắc không được phá (xuyên suốt mọi Phase)

- Không cho parser tự suy diễn dữ liệu (sản phẩm, số lượng, khách hàng, ngày).
- Thiếu trường → để trống + reprompt một lần (trừ `unit` mặc định `pièce`).
- Sản phẩm phải nằm trong từ điển đóng.
- Quantity là số nguyên và đứng trước sản phẩm.
- Giữ nguyên token kỹ thuật: `date_livraison`, `creneau_livraison`, `ignored_segments`, `pièce`, `fruits_legumes`, `SET_CLIENT`, `ADD_LIGNE`...
