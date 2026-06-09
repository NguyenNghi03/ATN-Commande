---
title: Phase 3 - Dataset, Scenario Fixtures, Hardening
language: vi
phase: 3
source_tasks: P3-TASK-001 → P3-TASK-005
related_req: REQ-067..069, STD-009/010
---

# Phase 3 - Dataset, Scenario Fixtures & Hardening

Mục tiêu Phase 3: hệ thống test bền vững. Dataset và scenario phải là **fixture chạy được**, deterministic, không gọi LLM.

## Bảng task

| Task | Nội dung | Nguồn | Trạng thái |
|---|---|---|---|
| P3-T01 | Fixture dataset 200 câu | P3-TASK-001, REQ-067 | [x] runner chạy sample (15 case); còn import đủ 200 |
| P3-T02 | Fixture 800 scenario đặt hàng bán buôn | P3-TASK-002, REQ-068 | [x] engine + runner; còn import đủ 800 |
| P3-T03 | Fixture 800 scenario terrain hardcore | P3-TASK-003, REQ-069 | [x] engine + runner + skip tonnes; còn import đủ 800 |
| P3-T04 | Test matrix bắt buộc | P3-TASK-004 | [x] 77 test generic theo dictionary |
| P3-T05 | Performance + logging | P3-TASK-005, STD-010 | [x] `buildDebugLog` + perf test |

> Cập nhật 2026-06-09: hạ tầng test Phase 3 đã chạy được. **118/118 tests pass** trên 6 file. Đã thêm:
> - `src/lib/scenarioEngine.ts` — `replayScenario(dialogue) → ScenarioAction[]` (SET_CLIENT/SET_SITE/SET_DATE/ADD/UPDATE/DELETE/IGNORE/VALIDATE/REOPEN).
> - `tests/datasetRunner.test.ts`, `tests/scenarioRunner.test.ts`, `tests/testMatrix.test.ts`, `tests/parserDebug.test.ts`.
> - Parser: skip đơn vị ngoài V1 (`tonnes`) với reason `out_of_scope_unit`; `buildDebugLog` cho `ParserDebugLog`.
> - CI: `.github/workflows/ci.yml` (typecheck + lint + test).
> Việc còn lại: import đủ 200 câu + 800 + 800 scenario từ file `.docx` gốc.

## Vị trí fixtures (đã khởi tạo trong commit này)

```text
tests/fixtures/
  dataset-200.sample.json            # P3-T01 - mẫu đại diện, format chuẩn
  dialogue-scenarios-800.sample.json # P3-T02 - mẫu đại diện
  dialogue-scenarios-hardcore-800.sample.json # P3-T03 - mẫu đại diện
  test-matrix.md                     # P3-T04 - ma trận test bắt buộc
  README.md                          # hướng dẫn + format type
```

> Lưu ý: bộ 200 câu + 800 scenario đầy đủ nằm trong Annexe A / phần scénarios của file `.docx` gốc. Hiện đã tạo **format chuẩn + bộ case mẫu đại diện** để test runner chạy được; việc import đủ 200/800 case từ docx là task còn lại (xem checklist).

## Chi tiết công việc

### P3-T01 - Dataset 200 câu
Format `DatasetCase`: `{ id, input, expected: { client, site, date_livraison, creneau_livraison, items[], ignored_segments[] } }`.
- [ ] Import đủ 200 case từ tài liệu gốc (Annexe A).
- [x] Định nghĩa format + tạo file `dataset-200.sample.json` với case đại diện.
- [ ] Test runner chạy toàn bộ 200 case; mismatch in ra `id, input, expected, actual`.
- Rule: xử lý nguyên trạng, field không rõ → rỗng, product ngoài dictionary không tạo, segment parasite không suy diễn.

### P3-T02 - 800 scenario đặt hàng bán buôn
Format `DialogueScenario`: `{ id, dialogue[], expected_actions[] }` với action `SET_CLIENT/SET_DATE/ADD_LIGNE/UPDATE_LIGNE/DELETE_LIGNE/IGNORE/VALIDATE`.
- [ ] Import đủ 800 scenario.
- [x] Định nghĩa format + sample.
- [ ] Dialogue giữ đúng thứ tự; expected action parse thành object; test runner replay từng dialogue và so action.

### P3-T03 - 800 scenario terrain hardcore
Phải test: noise xen data, correction `non attends mets plutôt`, add `ajoute`, delete `supprime`, validate, unit lạ (`tonnes`).
- [ ] Import đủ 800 scenario hardcore.
- [x] Định nghĩa format + sample + đánh dấu expected behavior cho unit ngoài V1.
- [ ] Cursor không tự mở rộng `tonnes` vào parser core; test không pass bằng suy diễn.

### P3-T04 - Test matrix bắt buộc
| Test group | Minimum cases |
|---|---:|
| Product aliases | 26 products |
| Unit normalization | 5 units + missing unit |
| Noise skip | all NOISE_PHRASES |
| Client triggers | all CLIENT_TRIGGERS |
| Site triggers | all SITE_TRIGGERS |
| Date tokens | all DATE_TOKENS + dd/mm + dd/mm/yyyy |
| Time window tokens | all CRENEAU_TOKENS |
| Negation | pas de / pas / sans |
| Correction | non / plutôt / en fait |
| Error behavior | all table error cases |
| Reprompt once | missing client/date/quantity/no items |
| Bon de commande mapping | parsed order → invoice preview |

- [ ] Tests deterministic, không gọi LLM, chạy được CI, phủ happy/skip/reprompt path.

### P3-T05 - Performance + logging
- [ ] Single text parse < 200ms local; end-to-end demo < 3s.
- [ ] `ParserDebugLog`: raw_text, normalized_text, segments, extracted_admin, extracted_items, ignored_segments, skipped_segments[{segment,reason}], reprompt.
- [ ] Mỗi skipped segment có reason; không inference ẩn.

## Hạ tầng test (đã có)
- [x] Test runner `vitest` + script `npm test`.
- [x] Loader đọc fixtures JSON, gọi parser/engine, so sánh expected.
- [x] Báo cáo pass/fail theo nhóm test matrix.
- [x] CI `.github/workflows/ci.yml`.

## Acceptance tổng Phase 3
- [ ] 200 dataset + 800 + 800 scenario fixture hóa và chạy được.
- [ ] Test matrix phủ đủ nhóm.
- [ ] Không logic AI tự suy diễn.
- [ ] Performance đạt mục tiêu demo.
