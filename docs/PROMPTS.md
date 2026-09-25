# PROMPTS – Các prompt dùng với Claude Code

File này dành cho bạn, không phải cho Claude Code đọc. Copy từng prompt khi đến bước tương ứng.

Mẹo chung:
- Mỗi task một phiên làm việc gọn. Xong task, commit, rồi bắt đầu phiên mới cho task sau để ngữ cảnh sạch.
- Với task lớn, dùng chế độ lập kế hoạch (plan mode) để Claude đề xuất kế hoạch trước khi sửa code.
- Luôn đọc diff trước khi chấp nhận, nhất là trong `core/` và `data/`.
- Có sẵn lệnh tắt `/next` (trong `.claude/commands/next.md`) để làm task tiếp theo trong `docs/PROGRESS.md`.

---

## Prompt 0 – Khởi động (chưa viết code)

```
Đọc CLAUDE.md và toàn bộ thư mục docs/. Chưa viết code.

1. Tóm tắt ngắn gọn bạn hiểu prototype này cần làm gì và kiến trúc ra sao.
2. Liệt kê mọi chỗ trong PROTOTYPE_SPEC.md, ARCHITECTURE.md, DATA_SPEC.md mà bạn thấy mơ hồ, mâu thuẫn, hoặc thiếu để triển khai được. Với mỗi chỗ, đề xuất một cách hiểu hợp lý.
3. Đề xuất cách chia nhỏ M1 nếu các task hiện tại trong PROGRESS.md còn quá lớn.

Chờ tôi trả lời các câu hỏi trước khi bắt đầu.
```

Sau khi trả lời, yêu cầu Claude cập nhật các chỗ mơ hồ đã chốt vào đúng file docs, để phiên sau không phải hỏi lại.

## Prompt 1 – Khởi tạo dự án (M1.1–M1.2)

```
Làm task M1.1 và M1.2 trong docs/PROGRESS.md.

- Khởi tạo dự án Vite + React + TypeScript strict, cài Vitest, Zod, tsx.
- Tạo các script: dev, typecheck, test, validate-data, sim (sim có thể là stub).
- Tạo toàn bộ data/*.json đúng như DATA_SPEC.md, khuôn Zod trong data/schemas.ts (kiểm tra cả tổng xác suất = 1), loadData.ts trả về GameData có kiểu.
- Viết kiểm thử: dữ liệu hợp lệ thì load được; cố tình làm sai một trường thì báo lỗi rõ ràng.

Chạy typecheck, test, validate-data. Cập nhật PROGRESS.md khi xong.
```

## Prompt 2 – Lõi mô phỏng (M1.3–M1.14)

Làm từng task một. Mẫu prompt:

```
Làm task M1.X trong docs/PROGRESS.md theo PROTOTYPE_SPEC.md và ARCHITECTURE.md.

Yêu cầu:
- Code thuần trong core/, mọi ngẫu nhiên qua core/rng.ts, mọi con số lấy từ data.
- Viết kiểm thử Vitest cho mọi quy tắc trong spec liên quan đến task này.
- Nếu spec không nói rõ một quy tắc, hỏi tôi thay vì tự đặt ra.

Trước khi báo xong: chạy typecheck và test. Cập nhật PROGRESS.md.
```

Riêng M1.12 (actions, máy trạng thái, runNight, skipUntil) nên dùng plan mode vì đây là phần nối mọi thứ lại với nhau.

Riêng M1.13 thêm yêu cầu:

```
Viết kiểm thử chứng minh getPlayerView không bao giờ lộ: mật độ sâu bệnh thật, sức khỏe chính xác, thời tiết thật ngày mai, ngày lũ chính xác.
```

## Prompt 3 – Bộ mô phỏng (M1.15–M1.16)

```
Làm task M1.15 và M1.16.

- 3 bot theo bảng chính sách trong DATA_SPEC.md, chỉ dùng getPlayerView.
- runSim.ts: tham số --bot, --runs, --seed-start. In bảng tổng hợp ra terminal và ghi CSV vào sim/output/.
- Chạy 1.000 seed cho mỗi bot.
- Viết docs/BALANCE_LOG.md: kết quả so với mục tiêu trong ARCHITECTURE.md (average sống sót 60–70%, safe 80–90%, risky phương sai lớn), nhận xét nguyên nhân chính, và đề xuất tối đa 3 thay đổi số liệu kèm lý do. KHÔNG tự sửa data.
```

## Prompt 4 – Vòng cân bằng (lặp lại nhiều lần)

```
Áp dụng các thay đổi số liệu sau vào data/: [liệt kê thay đổi bạn đã chọn].
Chạy lại sim 1.000 seed mỗi bot. Ghi kết quả mới vào BALANCE_LOG.md dưới dạng một mục mới có ngày, so sánh với lần trước.
```

## Prompt 5 – Khởi động giao diện (chưa viết code)

```
Chuẩn bị làm M2 (giao diện). Chưa viết code.

1. Đọc docs/UI_DIRECTION.md, mục 12 trong docs/PROTOTYPE_SPEC.md, và mở reference/ui-reference.html để hiểu giao diện mẫu (bố cục cảnh, tọa độ vật thể, token màu, chữ, chất liệu giấy, các animation, luồng tương tác).
2. File mẫu là HTML thuần với logic giả lập. Chỉ lấy giao diện và tương tác; toàn bộ luật chơi phải đến từ core/ (getPlayerView, getActionOptions, applyAction).
3. Liệt kê những gì core/ còn thiếu để UI hoạt động mà không phải tự tính luật chơi (ví dụ: getActionOptions, các GameEvent để phát animation, số ngày kể từ lần thăm).
4. Đề xuất cách chuyển file mẫu thành các component React theo cấu trúc thư mục trong UI_DIRECTION.md, và cách nối animation với state.log.
5. Liệt kê những chỗ trong file mẫu mâu thuẫn với spec hoặc thiếu so với mục 12 (ví dụ: phun phòng, gặt, sổ nợ với các nguồn vay, thu hoạch và bán).

Chờ tôi xác nhận trước khi làm M2.0.
```

## Prompt 5a – Core cho giao diện (M2.0)

```
Làm M2.0 trong docs/PROGRESS.md.

- Thêm core/actionOptions.ts: getActionOptions(view, target) trả về danh sách hành động khả dụng cho một mục tiêu (một thửa, nhà, bảng gỗ, sổ), mỗi mục gồm: action sẽ dispatch, nhãn tiếng Việt, chi phí tiền, sức lực, enabled, lý do khi bị khóa, và phương án mua chịu (nếu chỉ thiếu tiền và đủ điều kiện uy tín) kèm giá đã cộng phụ phí.
- Thêm các GameEvent trình bày vào state.log theo danh sách trong PROGRESS.md.
- Bổ sung vào PlayerView những gì UI cần mà chưa có (số ngày kể từ lần thăm mỗi thửa, việc làm thuê hôm nay có hay không…), vẫn không lộ thông tin ẩn.
- Kiểm thử: mọi option enabled khi dispatch đều hợp lệ với applyAction; mọi option bị khóa đều có lý do; bot có thể dùng getActionOptions.

Chạy typecheck và test. Cập nhật PROGRESS.md.
```

## Prompt 5b – Từng phần giao diện (M2.1 → M2.9)

Làm lần lượt, mỗi task một phiên:

```
Làm task M2.X trong docs/PROGRESS.md theo docs/UI_DIRECTION.md, bám sát reference/ui-reference.html về hình ảnh và chuyển động.

Yêu cầu:
- Giữ đúng token màu, chữ (Be Vietnam Pro, Patrick Hand), chất liệu giấy vở ô ly, tọa độ vật thể trong viewBox 1200×720.
- Không tab, không sidebar, không lưới thẻ, không thư viện UI component hay icon. Cảnh chỉ vẽ bằng SVG.
- Không có luật chơi trong ui/: chi phí, sức lực, lý do khóa lấy từ getActionOptions; trạng thái lấy từ getPlayerView; thay đổi đi qua dispatch.
- Animation là lớp trình bày: dispatch ngay, phát animation dựa trên state.log.
- Mỗi vật thể trong cảnh là một component có khung và điểm neo cố định (để sau này thay bằng sprite).
- Bàn phím dùng được; tôn trọng prefers-reduced-motion; chạy tốt ở màn hình 390px.

Khi xong: chạy typecheck và test, chụp lại (hoặc mô tả) màn hình so với file mẫu và liệt kê điểm khác biệt còn lại. Cập nhật PROGRESS.md.
```

## Prompt 5c – Đối chiếu với mẫu (sau M2.9)

```
So sánh giao diện hiện tại với reference/ui-reference.html theo từng mục trong docs/UI_DIRECTION.md (màu, chữ, bố cục cảnh, HUD, giấy, luồng tương tác, chuyển động, bàn phím, reduced motion, di động, chế độ tối).
Lập danh sách điểm lệch, xếp theo mức ảnh hưởng tới cảm giác chơi, rồi sửa những điểm quan trọng. Không thêm tính năng mới.
```

## Prompt 6 – Tính sổ và tổng kết (M3.1–M3.2)

```
Làm M3.1 và M3.2 theo docs/UI_DIRECTION.md. Màn tính sổ là khoảnh khắc cảm xúc quan trọng nhất của game: trang vở, các dòng thu chi hiện lần lượt (~0,38 giây mỗi dòng), dòng "Vụ này: lời/lỗ X" hiện sau cùng với độ trễ thêm ~1,4 giây, màu xanh hoặc đỏ, như bản mẫu trong reference/ui-reference.html (mở từ quyển sổ, "Xem thử màn tính sổ cuối vụ"). Dữ liệu lấy từ core/settlement.ts, không tính toán trong UI.
```

## Prompt 7 – Sửa lỗi

```
Lỗi: [mô tả]. File lưu tái hiện: [đính kèm hoặc đường dẫn].
Tái hiện lỗi bằng replay, viết kiểm thử thất bại trước, rồi mới sửa. Thêm file lưu vào tests/replays/ nếu hữu ích.
```

## Prompt 8 – Build cho playtest (M3.5)

```
Làm M3.5: cấu hình vite build dùng đường dẫn tương đối để chạy được khi tải lên itch.io dạng HTML. Kiểm tra build chạy được khi mở từ thư mục con. Viết hướng dẫn ngắn trong README.md.
```