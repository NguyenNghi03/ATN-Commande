---
title: ATN Commande Vocale - Test Fixtures
language: vi
phase: 3
source_tasks: P3-TASK-001 → P3-TASK-004
---

# Test Fixtures - ATN Commande Vocale

Folder này chứa các **fixture deterministic** để kiểm thử parser theo Phase 3. Không gọi LLM, chạy được trong CI.

## Danh sách file

| File | Mục đích | Task |
|---|---|---|
| `dataset-200.sample.json` | Kiểm tra parsing từng câu → JSON contract compact | P3-TASK-001 / REQ-067 |
| `dialogue-scenarios-800.sample.json` | Replay hội thoại đặt hàng → chuỗi action | P3-TASK-002 / REQ-068 |
| `dialogue-scenarios-hardcore-800.sample.json` | Hội thoại nhiễu/sửa/xóa/validate + unit ngoài V1 | P3-TASK-003 / REQ-069 |
| `test-matrix.md` | Ma trận test bắt buộc | P3-TASK-004 |

> Các file `*.sample.json` hiện chứa **bộ case mẫu đại diện** + đúng format. Việc import đủ 200 / 800 / 800 case từ file `.docx` gốc (Annexe A và phần scénarios) là task còn lại; khi import xong thì đổi tên thành `dataset-200.json`, `dialogue-scenarios-800.json`, `dialogue-scenarios-hardcore-800.json`.

## Format

### DatasetCase (dataset-200)

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

Rule: xử lý nguyên trạng, field không rõ → rỗng, product ngoài dictionary không tạo, segment parasite không suy diễn.

### DialogueScenario (dialogue-scenarios-800)

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

### Hardcore scenario

Cùng format `DialogueScenario`, thêm field `expected_behavior` cho các case ngoài V1 (vd unit `tonnes`): `"skip" | "ignored" | "feature_flag"`.

## Cách chạy (đề xuất, chưa cài)

```bash
npm i -D vitest
npm run test
```

Test runner cần: load fixture → gọi parser deterministic → so sánh `expected`. Mismatch in ra `id, input, expected, actual`.
