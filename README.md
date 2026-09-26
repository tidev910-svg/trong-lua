# Nông dân lúa nước – prototype

Prototype web cho game mô phỏng nông dân thuê 5 công ruộng lúa nước, xoay xở tiền bạc qua các vụ và tránh vòng xoáy nợ. Thiết kế và luật chơi: xem `CLAUDE.md` và `docs/`.

## Chạy khi phát triển

```
npm install
npm run dev            # mở http://localhost:5173
npm run typecheck
npm test
npm run validate-data
npm run sim -- --bot all --runs 1000
```

Trong game, phím `` ` `` mở bảng debug (state ẩn, nhảy ngày, xuất/nhập file lưu).
Trang dev: `?preview` (các mẩu giấy), `?preview=scene&day=40` (cảnh trên một lượt chơi thật của bot).

## Build để đăng itch.io

```
npm run build
```

Kết quả nằm trong `dist/` (`index.html` + `assets/`). Mọi đường dẫn là tương đối (`base: "./"` trong `vite.config.ts`), nên chạy được khi đặt trong thư mục con bất kỳ.

1. Nén **nội dung** của `dist/` thành một file zip (`index.html` phải nằm ở gốc file zip, không nằm trong thư mục `dist/`).
2. Trên itch.io: tạo project, *Kind of project* = **HTML**, tải file zip lên, đánh dấu **This file will be played in the browser**.
3. Kích thước khung gợi ý: 1200 × 720, bật **Mobile friendly** và **Fullscreen button**.

Thử trên máy trước khi tải lên:

```
npm run preview        # phục vụ dist/ tại http://localhost:4173
```

Ghi chú:
- Font (Be Vietnam Pro, Patrick Hand) tải từ Google Fonts; không có mạng thì dùng font dự phòng của máy.
- Game tự lưu cuối mỗi ngày vào `localStorage` của trình duyệt. Chỉ giữ ván đang chơi: bắt đầu ván mới là ghi đè ván cũ. Xóa dữ liệu trang web là mất bản lưu.
- File lưu có thêm dữ liệu playtest (số lần tua, bậc nợ cao nhất, thời điểm dừng chơi…). Người chơi thử có thể xuất file lưu từ bảng debug để gửi lại.
