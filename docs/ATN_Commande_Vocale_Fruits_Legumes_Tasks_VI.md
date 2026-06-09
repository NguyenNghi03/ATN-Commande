---
title: ATN Commande Vocale Fruits & Legumes - Tasks VI
language: vi
source_docx: ATN_Commande_Vocale_Fruits_Legumes.docx
generated_at: 2026-06-09
format: import-ready-markdown
total_requirements: 69
---

# ATN Commande Vocale Fruits & Légumes - Yêu Cầu & Task Triển Khai

File này gom toàn bộ yêu cầu tiếng Việt, tiêu chuẩn triển khai và checklist công việc để đưa thẳng vào code agent, backlog hoặc GitHub issue/task list.

> Ghi chú kỹ thuật: các key JSON, action code, category và token nghiệp vụ gốc như `date_livraison`, `creneau_livraison`, `ignored_segments`, `pièce`, `fruits_legumes` được giữ nguyên để không làm lệch đặc tả.

## 1. Mục Tiêu Sản Phẩm

- Xây dựng ATN có khả năng chuyển đơn hàng nói hoặc text tự do thành phiếu đặt hàng có cấu trúc.
- Phạm vi V1 chỉ xử lý rau củ quả.
- Hệ thống phải lọc nhiễu, trích xuất thông tin hữu ích, cập nhật bảng đơn hàng realtime và xuất JSON.
- Không được tự suy diễn dữ liệu thiếu hoặc ngoài từ điển.

## 2. Tiêu Chuẩn Triển Khai

- [ ] **STD-001 - Không suy diễn dữ liệu:** Không tự tạo sản phẩm, số lượng, khách hàng, ngày giao hàng hoặc quyết định nghiệp vụ nếu người dùng không nói/nhập rõ.
- [ ] **STD-002 - Parser xác định:** Ưu tiên rule + dictionary. Không dùng reasoning tự do để sinh dữ liệu đơn hàng.
- [ ] **STD-003 - Từ điển đóng:** Sản phẩm, alias, đơn vị và cụm nhiễu phải được quản lý bằng dictionary/versioned constants.
- [ ] **STD-004 - JSON contract ổn định:** Không đổi tên key JSON như `date_livraison`, `creneau_livraison`, `ignored_segments`, `fruits_legumes`.
- [ ] **STD-005 - Chuẩn hóa trước khi hiển thị:** Mọi dòng hợp lệ phải được chuẩn hóa product, quantity, unit, category trước khi cập nhật bảng/UI.
- [ ] **STD-006 - Không chặn người dùng:** Lỗi hiểu câu, STT sai hoặc dữ liệu thiếu phải được xử lý mềm: hiển thị rõ, không crash, không khóa luồng thao tác.
- [ ] **STD-007 - Realtime-first UX:** Bordereau/bảng đơn hàng phải cập nhật theo tiến trình hội thoại, không đợi người dùng nhập xong toàn bộ.
- [ ] **STD-008 - Tách lớp rõ ràng:** Tách STT/input, parser, normalizer, validator, state/order store, UI renderer và JSON serializer.
- [ ] **STD-009 - Test bằng fixture:** Dataset 200 câu và các scenario hội thoại phải chạy được như test fixture tự động, có expected output/action.
- [ ] **STD-010 - Hiệu năng demo:** Mục tiêu phản hồi cho một lệnh đơn hàng là dưới 3 giây trong môi trường demo.

## 3. JSON Contract Bắt Buộc

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

## 4. Thứ Tự Thực Hiện Khuyến Nghị

1. Thiết lập schema JSON và type/model nội bộ.
2. Tạo dictionary sản phẩm, alias, đơn vị, trigger admin/nghiệp vụ và noise.
3. Xây parser deterministic cho text input trước, sau đó nối STT/voice.
4. Xây normalizer + validator + ignored_segments.
5. Xây order state để hỗ trợ add/update/delete/validate realtime.
6. Xây API hoặc service boundary cho frontend.
7. Xây UI một màn hình: micro, text area, admin panel, bảng dòng hàng, JSON, ignored segments.
8. Thêm test fixture cho dataset 200 câu và scenario dialogue/action.
9. Tối ưu phản hồi, trạng thái lỗi và UX demo màn hình ngoài nếu cần.

## 5. Backlog Import-Ready

Mỗi task dưới đây có ID yêu cầu, nhóm, mức độ, tiêu chí nghiệm thu và nguồn. Có thể import trực tiếp vào công cụ quản lý việc hoặc dùng làm prompt triển khai theo checklist.

### Mục tiêu

- [ ] **TASK-001 / REQ-001** - ATN phải chuyển đơn hàng nói hoặc văn bản tự do thành phiếu đặt hàng có cấu trúc cho rau củ quả.
  - **Nhóm:** Mục tiêu
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Nhập một câu tự nhiên và nhận được bảng đơn hàng cùng JSON có cấu trúc.
  - **Nguồn:** 1. Objet du projet

- [ ] **TASK-002 / REQ-002** - Hệ thống không được chỉ dừng ở ghi âm thành văn bản; phải nghe, lọc, hiểu, trích xuất và cấu trúc thông tin hữu ích.
  - **Nhóm:** Mục tiêu
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Các đoạn nhiễu không tạo dòng hàng; thông tin hợp lệ được đưa vào đúng trường.
  - **Nguồn:** 1. Objet du projet

### Người dùng

- [ ] **TASK-003 / REQ-003** - Người dùng chính là nhân viên vận hành hoặc nhân viên chuẩn bị đơn tại nhà bán buôn rau củ quả.
  - **Nhóm:** Người dùng
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Luồng thao tác phù hợp môi trường kho, logistics, demo thương mại.
  - **Nguồn:** 2. Cas d’usage cible

### Phạm vi

- [ ] **TASK-004 / REQ-004** - V1 chỉ xử lý miền rau củ quả.
  - **Nhóm:** Phạm vi
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Sản phẩm ngoài từ điển không được tạo dòng hàng.
  - **Nguồn:** 3. Périmètre fonctionnel

### Đầu vào

- [ ] **TASK-005 / REQ-005** - Hệ thống phải hỗ trợ đầu vào bằng giọng nói và văn bản tự do.
  - **Nhóm:** Đầu vào
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Có nút micro và vùng nhập/dán văn bản.
  - **Nguồn:** 3. Périmètre fonctionnel; 10. Interface

### Trích xuất

- [ ] **TASK-006 / REQ-006** - Hệ thống phải trích xuất khách hàng, địa điểm, ngày giao hàng, khung giờ, sản phẩm, số lượng, đơn vị và ghi chú giao hàng đơn giản.
  - **Nhóm:** Trích xuất
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Các trường này xuất hiện trong khối hành chính hoặc dòng đơn hàng.
  - **Nguồn:** 3. Périmètre fonctionnel

### Đầu ra

- [ ] **TASK-007 / REQ-007** - Hệ thống phải hiển thị kết quả trên màn hình, bảng đơn hàng và JSON.
  - **Nhóm:** Đầu ra
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Có bảng kết quả và khối JSON debug/final.
  - **Nguồn:** 3. Périmètre fonctionnel; 10. Interface

### Ngoài phạm vi

- [ ] **TASK-008 / REQ-008** - V1 không xử lý giá, khuyến mãi, tồn kho, thay thế thông minh, thương hiệu hoặc quyết định thương mại.
  - **Nhóm:** Ngoài phạm vi
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Không có logic suy luận hoặc enrich dữ liệu cho các phạm vi này.
  - **Nguồn:** 3. Périmètre fonctionnel

### Pipeline

- [ ] **TASK-009 / REQ-009** - Chuỗi xử lý bắt buộc: giọng nói, STT, văn bản thô, lọc nhiễu, trích xuất admin/nghiệp vụ, trích dòng hàng, chuẩn hóa, xác thực, JSON, hiển thị.
  - **Nhóm:** Pipeline
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Log hoặc cấu trúc xử lý phản ánh đúng chuỗi này.
  - **Nguồn:** 4. Chaîne de traitement

### JSON

- [ ] **TASK-010 / REQ-010** - JSON phải có các trường order_id, timestamp, source, user, status, client, site, date_livraison, creneau_livraison, commentaire_livraison, items, ignored_segments.
  - **Nhóm:** JSON
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** JSON xuất ra có đủ schema theo tài liệu.
  - **Nguồn:** 5. Structure administrative

- [ ] **TASK-011 / REQ-011** - Mỗi item phải có product, quantity, unit và category.
  - **Nhóm:** JSON
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Mỗi dòng hàng hợp lệ xuất hiện trong items với đủ 4 trường.
  - **Nguồn:** 5. Structure administrative

### Trường AUTO

- [ ] **TASK-012 / REQ-012** - order_id, timestamp, source, user và status do hệ thống tự cung cấp.
  - **Nhóm:** Trường AUTO
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Người dùng không cần nói/nhập các trường AUTO.
  - **Nguồn:** 6. Règles strictes

### Không suy diễn

- [ ] **TASK-013 / REQ-013** - Không được tạo sản phẩm không có trong từ điển.
  - **Nhóm:** Không suy diễn
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Sản phẩm lạ bị bỏ qua, không xuất hiện trong items.
  - **Nguồn:** 6. Règles strictes

- [ ] **TASK-014 / REQ-014** - Không được tự tạo số lượng; nếu thiếu hoặc nghi ngờ số lượng thì bỏ qua dòng.
  - **Nhóm:** Không suy diễn
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Câu có sản phẩm nhưng không có số lượng không tạo item.
  - **Nguồn:** 6. Règles strictes

### Đơn vị

- [ ] **TASK-015 / REQ-015** - Nếu không nói đơn vị, hệ thống dùng đơn vị mặc định `pièce`.
  - **Nhóm:** Đơn vị
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Ví dụ `3 salades` tạo unit = `pièce`.
  - **Nguồn:** 6. Règles strictes

### Danh mục

- [ ] **TASK-016 / REQ-016** - Mỗi sản phẩm hợp lệ phải có category cố định `fruits_legumes`.
  - **Nhóm:** Danh mục
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Mọi item xuất JSON đều có category = `fruits_legumes`.
  - **Nguồn:** 6. Règles strictes

### Khách hàng

- [ ] **TASK-017 / REQ-017** - Trích xuất khách hàng sau các trigger `pour`, `client`, `pour le client`, `commande pour`, `livraison pour`, `chez`.
  - **Nhóm:** Khách hàng
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Câu chứa trigger điền đúng trường client.
  - **Nguồn:** 6. Règles strictes

### Địa điểm

- [ ] **TASK-018 / REQ-018** - Trích xuất địa điểm sau `site`, `dépôt`, `depot`, `magasin`, `entrepôt`, `entrepot`.
  - **Nhóm:** Địa điểm
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Câu chứa trigger điền đúng trường site.
  - **Nguồn:** 6. Règles strictes

### Ngày giao hàng

- [ ] **TASK-019 / REQ-019** - Trích xuất ngày dạng hôm nay/ngày mai/thứ trong tuần và định dạng dd/mm hoặc dd/mm/yyyy nếu được nói hoặc nhập.
  - **Nhóm:** Ngày giao hàng
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** date_livraison được điền khi có dạng hợp lệ; nếu không nhận diện thì để trống.
  - **Nguồn:** 6. Règles strictes; 9. Cas d’erreur

### Khung giờ

- [ ] **TASK-020 / REQ-020** - Trích xuất các khung `matin`, `après-midi`, `aprem`, `soir`, `avant 10h`, `avant midi`, `fin de matinée`, `début d’après-midi`.
  - **Nhóm:** Khung giờ
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** creneau_livraison được điền khi có từ khóa hợp lệ.
  - **Nguồn:** 6. Règles strictes

### Nhiễu

- [ ] **TASK-021 / REQ-021** - Chuỗi không chứa thông tin admin/nghiệp vụ hợp lệ hoặc dòng sản phẩm hợp lệ phải đưa vào ignored_segments.
  - **Nhóm:** Nhiễu
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Câu 100% nhiễu không tạo item và xuất hiện trong ignored_segments.
  - **Nguồn:** 6. Règles strictes; 9. Cas d’erreur

### Nhiều sản phẩm

- [ ] **TASK-022 / REQ-022** - Mỗi cặp số lượng + đơn vị tùy chọn + sản phẩm phải tạo một dòng riêng.
  - **Nhóm:** Nhiều sản phẩm
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Một câu nhiều sản phẩm tạo nhiều item.
  - **Nguồn:** 6. Règles strictes

### Từ nối

- [ ] **TASK-023 / REQ-023** - Các từ nối/động từ như `et`, `puis`, `avec`, `plus`, `rajoute`, `ajoute`, `prends`, `mets`, `il faut`, `il me faut`, `on met`, `on ajoute` không được cản trở trích xuất.
  - **Nhóm:** Từ nối
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Câu có các từ này vẫn tạo đúng dòng hàng.
  - **Nguồn:** 6. Règles strictes

### Sửa đơn giản

- [ ] **TASK-024 / REQ-024** - Nếu cùng câu có `non`, `plutôt`, `en fait` ngay trước số lượng mới cho cùng sản phẩm, giữ lần xuất hiện cuối.
  - **Nhóm:** Sửa đơn giản
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Giá trị cũ bị thay bởi giá trị mới trên cùng sản phẩm.
  - **Nguồn:** 6. Règles strictes

### Phủ định

- [ ] **TASK-025 / REQ-025** - Chuỗi có `pas de`, `pas`, `sans` ngay trước sản phẩm không được tạo dòng sản phẩm.
  - **Nhóm:** Phủ định
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Câu phủ định không tạo item cho sản phẩm đó.
  - **Nguồn:** 6. Règles strictes

### Thứ tự xử lý

- [ ] **TASK-026 / REQ-026** - Trích xuất admin/nghiệp vụ phải chạy trước xác thực dòng sản phẩm.
  - **Nhóm:** Thứ tự xử lý
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Dòng hàng được gắn đúng khách hàng và ngữ cảnh hiện tại.
  - **Nguồn:** 6. Règles strictes

### Từ điển sản phẩm

- [ ] **TASK-027 / REQ-027** - Chỉ chấp nhận danh sách sản phẩm và alias trong từ điển bắt buộc.
  - **Nhóm:** Từ điển sản phẩm
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Alias được chuẩn hóa về product chuẩn; ngoài từ điển bị bỏ qua.
  - **Nguồn:** 7.1 Produits et alias

### Từ điển đơn vị

- [ ] **TASK-028 / REQ-028** - Chỉ nhận diện các đơn vị kg, pièce, cagette, botte, colis theo dạng được liệt kê.
  - **Nhóm:** Từ điển đơn vị
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Đơn vị được chuẩn hóa đúng; dạng không hợp lệ xử lý theo quy tắc lỗi.
  - **Nguồn:** 7.2 Unités reconnues

### Từ điển nhiễu

- [ ] **TASK-029 / REQ-029** - Các cụm nhiễu như bonjour, salut, allo, ok, merci, attends... phải được bỏ qua khi không có thông tin hợp lệ.
  - **Nhóm:** Từ điển nhiễu
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Nhiễu không tạo item, có thể xuất hiện trong ignored_segments.
  - **Nguồn:** 7.3 Bruit à ignorer

### Parsing

- [ ] **TASK-030 / REQ-030** - Bước 1 phải chuyển giọng nói thành văn bản thô.
  - **Nhóm:** Parsing
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Có output text thô từ STT trước khi parsing.
  - **Nguồn:** 8. Règles de parsing

- [ ] **TASK-031 / REQ-031** - Bước 2 xử lý chữ thường nhưng giữ văn bản gốc để hiển thị.
  - **Nhóm:** Parsing
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Logic matching không phụ thuộc hoa/thường; UI vẫn có thể hiển thị nguyên văn.
  - **Nguồn:** 8. Règles de parsing

- [ ] **TASK-032 / REQ-032** - Bước 3 trích xuất trường admin/nghiệp vụ bằng từ kích hoạt.
  - **Nhóm:** Parsing
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Trigger điền đúng client/site/date/creneau.
  - **Nguồn:** 8. Règles de parsing

- [ ] **TASK-033 / REQ-033** - Bước 4 tách segment bằng dấu câu và connector thông dụng.
  - **Nhóm:** Parsing
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Một câu dài nhiều đoạn vẫn xử lý từng phần.
  - **Nguồn:** 8. Règles de parsing

- [ ] **TASK-034 / REQ-034** - Bước 5 phát hiện quantity, unit và product cho từng segment.
  - **Nhóm:** Parsing
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Segment hợp lệ có đủ quantity + product sau chuẩn hóa.
  - **Nguồn:** 8. Règles de parsing

- [ ] **TASK-035 / REQ-035** - Bước 6 chỉ tạo dòng nếu quantity + product hợp lệ; nếu không thì bỏ qua.
  - **Nhóm:** Parsing
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Không tạo item thiếu quantity hoặc product ngoài từ điển.
  - **Nguồn:** 8. Règles de parsing

- [ ] **TASK-036 / REQ-036** - Bước 7 áp dụng sửa đơn giản và phủ định đơn giản.
  - **Nhóm:** Parsing
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Các câu `non...` và `pas de...` xử lý đúng.
  - **Nguồn:** 8. Règles de parsing

- [ ] **TASK-037 / REQ-037** - Bước 8 serialize JSON rồi hiển thị bảng.
  - **Nhóm:** Parsing
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** JSON và bảng UI đồng bộ.
  - **Nguồn:** 8. Règles de parsing

### Lỗi

- [ ] **TASK-038 / REQ-038** - Sản phẩm không xác định phải bị bỏ qua và không được tự tạo.
  - **Nhóm:** Lỗi
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Không xuất hiện item cho sản phẩm lạ.
  - **Nguồn:** 9. Cas d’erreur

- [ ] **TASK-039 / REQ-039** - Thiếu số lượng phải bỏ qua dòng.
  - **Nhóm:** Lỗi
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Không xuất hiện item nếu không có quantity.
  - **Nguồn:** 9. Cas d’erreur

- [ ] **TASK-040 / REQ-040** - Đơn vị không xác định nhưng sản phẩm được nhận diện chỉ dùng `pièce` nếu chuỗi vẫn hợp lệ.
  - **Nhóm:** Lỗi
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Không tự sửa đơn vị bằng suy đoán ngoài quy tắc.
  - **Nguồn:** 9. Cas d’erreur

- [ ] **TASK-041 / REQ-041** - Ngày không nhận diện thì để trống `date_livraison`.
  - **Nhóm:** Lỗi
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Không tự suy luận ngày.
  - **Nguồn:** 9. Cas d’erreur

- [ ] **TASK-042 / REQ-042** - Khách hàng không nhận diện thì để trống `client`.
  - **Nhóm:** Lỗi
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Không tự điền tên khách.
  - **Nguồn:** 9. Cas d’erreur

- [ ] **TASK-043 / REQ-043** - Câu 100% nhiễu không được tạo dòng và phải đưa vào ignored_segments.
  - **Nhóm:** Lỗi
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** items rỗng, ignored_segments chứa câu nhiễu.
  - **Nguồn:** 9. Cas d’erreur

- [ ] **TASK-044 / REQ-044** - Đơn hàng mâu thuẫn phức tạp chỉ giữ các dòng chắc chắn và không suy diễn.
  - **Nhóm:** Lỗi
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Không tự chọn phương án khi dữ liệu mâu thuẫn.
  - **Nguồn:** 9. Cas d’erreur

- [ ] **TASK-045 / REQ-045** - STT sai không được sửa bằng tưởng tượng; chỉ áp dụng từ điển và quy tắc.
  - **Nhóm:** Lỗi
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Không có autocorrect ngoài từ điển/rule.
  - **Nguồn:** 9. Cas d’erreur

### UX

- [ ] **TASK-056 / REQ-056** - Ứng dụng phải cho phép tạo đơn nhanh bằng giọng nói, thấy phiếu điền realtime, sửa dễ và xác nhận không ma sát.
  - **Nhóm:** UX
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Luồng demo không cần thao tác phức tạp.
  - **Nguồn:** 12. UX

- [ ] **TASK-057 / REQ-057** - Header cố định phải luôn hiển thị client, date_livraison và status.
  - **Nhóm:** UX
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Ba thông tin này luôn thấy khi thao tác.
  - **Nguồn:** 12. UX

- [ ] **TASK-058 / REQ-058** - Vùng micro phải có nút ON/OFF và chỉ báo nghe/phân tích/lỗi.
  - **Nhóm:** UX
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Trạng thái xử lý rõ ràng cho người dùng.
  - **Nguồn:** 12. UX

- [ ] **TASK-059 / REQ-059** - Bảng phiếu realtime phải hiển thị product, quantity và unit; dòng có thể xuất hiện, sửa hoặc biến mất trực tiếp.
  - **Nhóm:** UX
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Kết quả cập nhật khi hội thoại thay đổi.
  - **Nguồn:** 12. UX

- [ ] **TASK-060 / REQ-060** - Phải có hành động nhanh: xác nhận đơn, chỉnh sửa, mở lại, xóa dòng.
  - **Nhóm:** UX
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Các action khả dụng trên UI.
  - **Nguồn:** 12. UX

- [ ] **TASK-061 / REQ-061** - Khi không hiểu câu, hệ thống hiển thị thông báo rõ, đề nghị lặp lại và không chặn người dùng.
  - **Nhóm:** UX
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Lỗi không làm kẹt luồng thao tác.
  - **Nguồn:** 12. UX

- [ ] **TASK-062 / REQ-062** - Khi phát hiện chỉnh sửa, giá trị cũ được thay thế và thay đổi hiển thị trên màn hình.
  - **Nhóm:** UX
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Correction visible ngay trên bảng.
  - **Nguồn:** 12. UX

- [ ] **TASK-063 / REQ-063** - Phải hiển thị lịch sử thêm/sửa/xóa.
  - **Nhóm:** UX
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Có lịch sử hành động cho thao tác đơn hàng.
  - **Nguồn:** 12. UX

- [ ] **TASK-064 / REQ-064** - Chế độ demo phải có khả năng hiển thị phiếu trên màn hình ngoài realtime trong khi nhập trên mobile.
  - **Nhóm:** UX
  - **Mức độ:** Tùy chọn
  - **Tiêu chí nghiệm thu:** Có luồng hoặc view phục vụ màn hình TV/external.
  - **Nguồn:** 12. UX

### Use case

- [ ] **TASK-065 / REQ-065** - Trong quá trình hội thoại, phiếu đơn hàng phải được điền dần theo thời gian thực.
  - **Nhóm:** Use case
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Người dùng nói từng phần, bảng cập nhật từng phần.
  - **Nguồn:** 13. Cas usage

- [ ] **TASK-066 / REQ-066** - Hệ thống phải xử lý lời nói tự do có nhiễu, lỗi và ngập ngừng nhưng chỉ trích xuất thông tin nghiệp vụ hữu ích.
  - **Nhóm:** Use case
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Câu nhiễu/hésitation không phá kết quả.
  - **Nguồn:** 13. Cas usage

### Kiểm thử

- [ ] **TASK-067 / REQ-067** - Bộ dataset 200 câu phải được dùng để kiểm tra parsing; câu được xử lý nguyên trạng, trường thiếu để trống, không suy diễn ngoài từ điển.
  - **Nhóm:** Kiểm thử
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Kết quả chạy test khớp expected JSON compact.
  - **Nguồn:** Annexe A

- [ ] **TASK-068 / REQ-068** - 800 kịch bản đặt hàng bán buôn đầy đủ phải được dùng để kiểm tra luồng dialogue + action.
  - **Nhóm:** Kiểm thử
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Các action SET/ADD/UPDATE/VALIDATE khớp scenario.
  - **Nguồn:** 800 scénarios

- [ ] **TASK-069 / REQ-069** - 800 kịch bản terrain hardcore phải được dùng để kiểm tra nhiễu, sửa, thêm, xóa và xác nhận trong hội thoại thực tế.
  - **Nhóm:** Kiểm thử
  - **Mức độ:** Bắt buộc
  - **Tiêu chí nghiệm thu:** Các action update/delete/validate đúng với dialogue phức tạp.
  - **Nguồn:** Version terrain hardcore

## 6. Definition Of Done

- [ ] Tất cả task `Bắt buộc` được triển khai hoặc có lý do defer rõ ràng.
- [ ] Parser không tự suy diễn dữ liệu ngoài dictionary/rule.
- [ ] JSON output khớp contract bắt buộc.
- [ ] UI hiển thị admin fields, order lines, ignored segments và JSON.
- [ ] Correction, negation, unknown product, missing quantity và noise đều có test.
- [ ] Dataset 200 câu chạy được dưới dạng automated fixture.
- [ ] Scenario dialogue/action chạy được ít nhất ở mức smoke test.
- [ ] Thời gian phản hồi demo mục tiêu dưới 3 giây.