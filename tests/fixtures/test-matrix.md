---
title: Test Matrix bắt buộc
language: vi
task: P3-TASK-004
---

# Test Matrix Bắt Buộc

Mọi nhóm dưới đây phải có test deterministic (không gọi LLM), chạy được CI, phủ happy / skip / reprompt path.

| # | Test group | Minimum cases | Tham chiếu fixture | Trạng thái |
|---|---|---:|---|---|
| 1 | Product aliases | 26 products | dataset-200 + per-product | [ ] |
| 2 | Unit normalization | 5 units + missing unit | dataset-200 #3,#5,#9,#13 | [ ] |
| 3 | Noise skip | all NOISE_PHRASES | dataset-200 #4, dialogue #4 | [ ] |
| 4 | Client triggers | all CLIENT_TRIGGERS | dataset-200 #1,#2,#5,#11 | [ ] |
| 5 | Site triggers | all SITE_TRIGGERS | dataset-200 #5,#13 | [ ] |
| 6 | Date tokens | all DATE_TOKENS + dd/mm + dd/mm/yyyy | dataset-200 #1,#5,#11,#13 | [ ] |
| 7 | Time window tokens | all CRENEAU_TOKENS | dataset-200 #1,#11,#14 | [ ] |
| 8 | Negation | pas de / pas / sans | dataset-200 #6,#14, hardcore #2 | [ ] |
| 9 | Correction | non / plutôt / en fait | dataset-200 #7,#8, dialogue #2, hardcore #1,#4 | [ ] |
| 10 | Error behavior | all table error cases | dataset-200 #10,#12 | [ ] |
| 11 | Reprompt once | missing client/date/quantity/no items | dataset-200 #10 | [ ] |
| 12 | Bon de commande mapping | parsed order → invoice preview | (Phase 2) | [ ] |

## Acceptance
- [ ] Tests deterministic.
- [ ] Tests không gọi LLM.
- [ ] Tests chạy được CI.
- [ ] Phủ happy path, skip path và reprompt path.

## 26 sản phẩm cần test alias (nhóm 1)

tomates, pommes de terre, carottes, courgettes, aubergines, salades, oignons, ail, poivrons, concombres, pommes, bananes, oranges, citrons, fraises, poires, kiwis, poireaux, choux, haricots verts, champignons, clémentines, ananas, mangues, melons, pastèques.

## 5 đơn vị cần test normalize (nhóm 2)

| Input | Expected unit |
|---|---|
| kg / kilo / kilos | `kg` |
| pièce / pièces / (missing) | `pièce` |
| cagette / cagettes | `cagette` |
| botte / bottes | `botte` |
| colis | `colis` |
