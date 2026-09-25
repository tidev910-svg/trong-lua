# GDD – Game mô phỏng nông dân lúa nước Việt Nam

*Cập nhật: 25/09/2026. Mọi con số kinh tế là giá trị tạm, sẽ hiệu chỉnh bằng bộ mô phỏng.*

## 1. Tổng quan

Người chơi bắt đầu tay trắng với mảnh ruộng thuê và phấn đấu từ tá điền trở thành điền chủ, trên đồng lúa Việt Nam. Mục đích là giúp người chơi hiểu sự vất vả của nghề nông qua trải nghiệm thật.

| Mục | Nội dung |
| --- | --- |
| Thể loại | Mô phỏng đời sống nông dân, quản lý và sinh tồn kinh tế |
| Bối cảnh | Làng quê Việt Nam, đồng lúa nước |
| Nghề đầu tiên | Trồng lúa nước; cây ăn trái và nuôi tôm mở rộng sau |
| Chế độ | Offline trước; cân nhắc online nếu phát triển tốt |
| Kết thúc | Không có hồi kết; so thành tích bằng tài sản sau mốc thời gian (ví dụ 3 năm trong game) |
| Định vị | "Cozy bên ngoài, căng thẳng bên trong" |

Hình ảnh, âm thanh làng quê yên bình, nhưng mỗi màn tính sổ cuối vụ đều khiến người chơi hồi hộp. Game gần với thể loại quản lý kinh tế hơn là cozy game thuần túy như Stardew Valley.

## 2. Trụ cột và nguyên tắc thiết kế

1. **Mô phỏng quyết định, trừu tượng hóa thao tác.** Sự vất vả đến từ lựa chọn khó, rủi ro và hậu quả, không đến từ việc bấm chuột lặp lại.
2. **Kiến thức của người chơi là sự tiến bộ.** Người hiểu nghề (đọc dấu hiệu sâu bệnh, chọn thời vụ, đọc thị trường) chơi giỏi hơn.
3. **Rủi ro phải đoán được.** Người chơi thua vì quyết định sai, không phải vì game giấu thông tin quan trọng.
4. **Chân thực ở chi tiết, nén ở nhịp độ.** Chi phí vật tư, giá lúa, thời gian sinh trưởng, sâu bệnh sát thực tế; riêng giá đất được nén lại.

Tham chiếu: Papers, Please (khốn khó qua vài dòng ngân sách), Football Manager và RimWorld (tua nhanh, dừng khi có biến).

## 3. Khởi đầu và dẫn dắt

- **Ruộng:** 5 công ruộng thuê (nửa ha).
- **Vốn khởi đầu:** vay họ hàng, không lãi, đủ trả kỳ thuê đầu tiên. Trả chậm thì mất lòng họ hàng và giảm uy tín trong làng.
- **Lão nông dẫn dắt:** vụ đầu khuyên chọn giống ngắn ngày dễ trồng, nhắc những ngày quan trọng. Từ vụ thứ hai chỉ góp ý khi được hỏi. Kinh nghiệm của ông đôi khi lỗi thời.
- **Nguồn học khác:** bản tin nông nghiệp trên radio, cán bộ khuyến nông tập huấn, sổ tay nhà nông tự ghi lại trải nghiệm.

Mục tiêu: người chơi học luật chơi trong vụ đầu mà không bị trừng phạt quá sớm.

## 4. Hệ thống thời gian

### Lịch

- Lịch 365 ngày thật, ba vụ: Đông Xuân, Hè Thu, Thu Đông.
- Sự kiện theo lịch âm. Tết Nguyên Đán rơi vào giữa hoặc cuối vụ Đông Xuân, lúc áp lực tiền bạc cao nhất.

### Bản tin buổi sáng (đọc trong khoảng 5 giây)

- **Hôm qua:** tình trạng ruộng nếu có ra đồng, hoặc "không rõ, lần cuối thăm đồng N ngày trước".
- **Hôm nay:** thời tiết kèm độ tin cậy dự báo.
- **Tin tức:** 1–2 dòng radio về giá lúa, cảnh báo dịch.
- **Lịch vụ:** giai đoạn sinh trưởng, số ngày đến giai đoạn nhạy cảm tiếp theo.
- **Tài chính:** tiền mặt, khoản nợ gần hạn nhất.

### Lựa chọn mỗi ngày

| Lựa chọn | Được | Mất |
| --- | --- | --- |
| Ra đồng | Thấy tình trạng ruộng, xử lý vấn đề | Một ngày công |
| Đi làm thuê | Tiền mặt, uy tín với hàng xóm | Không biết ruộng ra sao |
| Nghỉ ngơi | Hồi sức khỏe | Không có gì thêm |
| Tua đến khi… | Tiết kiệm thời gian thật | Rủi ro tích lũy |

Một ngày chia buổi sáng và buổi chiều. Một ngày ra đồng kéo dài 1–3 phút thật, giới hạn việc làm theo sức lực.

### Tua nhiều ngày

- Người chơi tự đặt điều kiện dừng: mưa lớn, cảnh báo dịch, lúa sang giai đoạn mới, sắp đến hạn nợ, hoặc sau N ngày.
- Sự kiện luôn dừng: bão, lũ, chủ nợ đến nhà.

### Hai loại thông tin

| Loại | Ví dụ | Cách biết |
| --- | --- | --- |
| Công khai | Thời tiết, cảnh báo dịch, giá cả, hạn nợ | Bản tin buổi sáng |
| Riêng | Sâu bệnh, mực nước, tình trạng lúa | Phải thăm đồng |

- Sâu bệnh phát triển ngầm theo cấp số nhân: phát hiện sớm xử lý rẻ, muộn thì tốn kém hoặc mất trắng.
- Tín hiệu gián tiếp: hàng xóm kể ruộng bên cạnh bị rầy, chim sẻ về nhiều lúc lúa chín.

### Dự báo

- Dự báo hôm nay đúng khoảng 80–90%; dự báo xa kém hơn.
- Nguồn thông tin nâng cấp dần: radio → TV → điện thoại với ứng dụng thời tiết và nhóm Zalo nông dân.
- Kinh nghiệm dân gian là nguồn phụ, lúc đúng lúc sai.

### Nhịp độ một vụ

Đầu vụ dày đặc, giữa vụ thưa (tua nhiều, đi làm thuê), làm đòng và trổ bông căng thẳng, thu hoạch quyết liệt.

## 5. Hệ thống lúa

Thời gian sinh trưởng theo giống thật và co giãn theo điều kiện:

```
Thời gian thực tế = thời gian gốc của giống × hệ số vụ × hệ số chăm sóc
```

- Vụ Đông Xuân lạnh nên lúa lâu chín hơn Hè Thu.
- Thiếu phân, thiếu nước, sâu bệnh làm lúa chậm lại vài ngày.
- Giai đoạn sinh dưỡng co giãn nhiều nhất; sinh sản và chín tương đối ổn định. Ngày trổ bông phụ thuộc giống và ngày xuống giống.

### Nhóm giống

Dùng tên giống thật cho các giống phổ biến; chỉ số cân bằng theo khoảng giá trị thực.

| Nhóm | Thời gian | Ưu điểm | Nhược điểm |
| --- | --- | --- | --- |
| Cực ngắn ngày | Dưới 95 ngày | 3 vụ/năm, né lũ, né mặn | Năng suất, giá thấp hơn |
| Ngắn ngày chất lượng cao | 95–105 ngày | Cân bằng, giá tốt | Giống đắt, một số nhạy sâu bệnh |
| Lúa thơm đặc sản | 100–115 ngày | Giá cao nhất | Khó chăm, rủi ro cao |
| Lúa mùa truyền thống | 5–6 tháng | Chịu ngập, ít đầu tư | 1 vụ/năm, năng suất thấp |

### Vòng lặp một vụ

| Giai đoạn | Quyết định chính | Rủi ro, sự kiện |
| --- | --- | --- |
| Chuẩn bị | Chọn nguồn vốn, chọn giống | Giá vật tư biến động |
| Làm đất, xuống giống | Sạ hay cấy; xuống giống sớm, đúng lịch né rầy hay muộn | Mưa trái mùa |
| Chăm sóc | Bón phân, quản lý nước, thăm đồng hay làm thuê | Rầy, đạo ôn, cỏ dại, hạn mặn |
| Làm đòng, trổ bông | Phun phòng hay chờ; xử lý mặn | Nhạy cảm nhất; bão có thể mất nửa vụ |
| Thu hoạch | Thuê máy hay cắt tay; bán ngay hay trữ chờ giá | Thương lái ép giá khi cả vùng cùng gặt |
| Tính sổ | Trả nợ nào trước, giữ vốn cho vụ sau | Thấy rõ đủ hay thiếu |

### Ví dụ mô phỏng quyết định

- **Sạ hay cấy:** sạ rẻ, nhanh nhưng tốn giống, dễ đổ ngã; cấy tốn công nhưng năng suất ổn định.
- **Sâu bệnh:** đọc dấu hiệu (vết hình thoi trên lá, rầy ở gốc) rồi chọn phun ngay, chờ theo dõi, hay dùng giống kháng bệnh từ đầu.
- **Thời vụ:** theo lịch xuống giống né rầy của địa phương, hoặc xuống sớm, muộn để đón giá nhưng dễ dính rầy, mặn.

### Màn tính sổ

Khoảnh khắc cảm xúc của cả vụ: bảng thu chi hiện từng dòng, con số cuối hiện chậm, xanh hoặc đỏ. Đầu tư trình bày kỹ nhất, dù art đơn giản.

## 6. Kinh tế

### Tiền thuê đất (theo năm, chia 2 kỳ)

- **Kỳ 1 (50%):** đầu năm, trước vụ Đông Xuân, trả bằng khoản vay họ hàng.
- **Kỳ 2 (50%):** sau thu hoạch Đông Xuân. Đông Xuân thất bại thì khủng hoảng ngay giữa năm.
- Người chơi tự bố trí số vụ trong năm: 2 vụ giống dài hay 3 vụ giống ngắn.

### Số liệu mỗi công (1.000 m²), mỗi vụ

| Chỉ số | Đông Xuân | Hè Thu | Thu Đông |
| --- | --- | --- | --- |
| Chi phí | ~2,5 tr | ~2,3 tr | ~2,4 tr |
| Năng suất | ~800 kg | ~650 kg | ~600 kg |
| Giá bán | ~7.800 đ/kg | ~6.800 đ/kg | ~7.000 đ/kg |
| Lời | ~3,7 tr | ~2,1 tr | ~1,8 tr |
| Rủi ro đặc trưng | Mặn, Tết | Mưa lúc gặt, sâu bệnh | Lũ, có thể mất trắng |

Công gặt thuê khoảng 300.000 đ/công, dùng cho cơ chế đi làm thuê.

### Chi cố định mỗi năm (5 công)

| Khoản | Giá trị tạm |
| --- | --- |
| Tiền thuê đất | 10 tr/năm (2 tr/công, chưa kiểm chứng) |
| Sinh hoạt phí | 1,2 tr/tháng, 14,4 tr/năm |
| Tết | 3–4 tr |
| Tổng | ~28 tr/năm |

### Kịch bản năm đầu

| Kịch bản | Cách chơi | Lời từ ruộng | Thu phụ | Kết quả năm |
| --- | --- | --- | --- | --- |
| Xui | 2 vụ, dính rầy Hè Thu, bị ép giá | ~17 tr | ~2 tr | Âm ~9 tr, vào vòng xoáy nợ |
| Trung bình | 2 vụ ổn định | ~29 tr | ~3 tr | Dư ~4 tr |
| Giỏi | 3 vụ thành công, làm thuê lúc rảnh | ~38 tr | ~6 tr | Dư ~16 tr |

Vụ thứ ba (mùa lũ) và việc đi làm thuê là ranh giới giữa sống sót và phát triển.

## 7. Nợ và uy tín

### Nguồn tiền khi túng thiếu

| Nguồn | Ưu điểm | Cái giá |
| --- | --- | --- |
| Mua chịu phân thuốc ở đại lý | Dễ, có ngay từ đầu | Giá cao hơn, trả cuối vụ |
| Bán lúa non cho thương lái | Có tiền ngay giữa vụ | Mất phần lời nếu giá lên, bị ràng buộc |
| Vay ngân hàng nông nghiệp | Lãi thấp | Cần uy tín và thế chấp |
| Vay nóng | Vay được ngay | Lãi rất cao, lãi chồng lãi |
| Đi làm thuê cho hàng xóm | Không nợ ai | Bỏ bê ruộng nhà |
| Xin chủ đất gia hạn | Thở được một kỳ | Uy tín giảm, giá thuê tăng |

### Chỉ số Uy tín

Trả nợ đúng hạn thì uy tín tăng: mở khoản vay rẻ hơn, được thuê thêm đất, thương lái trả giá tốt hơn. Trễ hạn thì uy tín giảm, chỉ còn vay nóng.

### Các bậc vòng xoáy

1. **Trễ hạn:** phạt lãi, uy tín giảm nhẹ.
2. **Cảnh báo:** chủ đất, chủ nợ đến nhà; hạn chót hiển thị rõ.
3. **Siết nợ:** bán bớt tài sản (máy bơm, lúa trữ, đất) giá rẻ.
4. **Mất ruộng thuê:** chạm đáy nhưng chưa thua; đi làm thuê để gom tiền thuê lại.
5. **Phá sản:** nợ vượt tổng tài sản và không ai cho vay; lượt chơi kết thúc.

## 8. Thất bại, reset và lưu game

- **Lưu game:** mỗi lượt chơi một bản lưu, tự động lưu cuối mỗi ngày, không tải lại ngày cũ.
- **Tự reset:** diễn ra như một cái kết, "Bán hết, lên thành phố làm công nhân", kèm thẻ tổng kết có thể chia sẻ.
- **Phá sản:** cũng kết thúc bằng thẻ tổng kết.
- **Sổ đời:** lưu lịch sử mọi lượt chơi.
- **Mang sang lượt sau:** chỉ kiến thức trong sổ tay nhà nông; tiền, đất, máy móc không mang theo.
- **Chế độ Thong thả (tùy chọn):** cho phép tải lại, không tính vào bảng xếp hạng theo seed.

## 9. Tiến trình, đất đai và nhà ở

### Con đường phát triển

1. Thuê thêm đất bằng uy tín.
2. Mua máy móc (máy sạ, máy phun, máy gặt), vừa tự làm vừa làm dịch vụ cho cả xóm.
3. Làm lúa giống, lúa đặc sản, ký hợp đồng bao tiêu.
4. Đa dạng hóa sang cây ăn trái, nuôi tôm (bản mở rộng).
5. Mua đất.

### Giá đất nén lại

- Neo theo thời gian hoàn vốn 3–4 năm với người chơi giỏi: khoảng 25 tr/công cho đất tốt (tạm), tức 2 ha khoảng 500 tr.
- Giá tăng 5–10% mỗi năm, có các đợt sốt đất.
- **Mua bằng thế chấp:** trả trước khoảng 30%, vay ngân hàng phần còn lại.
- **Đất chỉ có khi có sự kiện rao bán:** hàng xóm vỡ nợ, con cái lên thành phố, người già không còn sức làm.

### Hạng đất

| Hạng | Giá tương đối | Đặc điểm |
| --- | --- | --- |
| Đất tốt, gần kênh | Cao nhất | Năng suất đầy đủ, dễ dẫn nước |
| Đất xa kênh | Trung bình | Tốn chi phí bơm nước, vận chuyển |
| Đất nhiễm phèn, mặn | Rẻ | Năng suất thấp vài năm đầu, cần cải tạo |
| Đất bỏ hoang | Rất rẻ | Phải khai hoang, đắp bờ, cải tạo lâu |

### Nhà ở

| Bậc | Tác dụng |
| --- | --- |
| Nhà lá | Khởi đầu; hồi sức chậm, dột khi mưa bão |
| Nhà tôn | Ổn định hơn |
| Nhà cấp 4 có kho | Trữ lúa chờ giá, tránh bị ép giá |
| Nhà lầu, biệt thự | Tăng uy tín, mở các lựa chọn gia đình |

### Đường tiến bộ mục tiêu

| Mốc | Người chơi trung bình | Người chơi giỏi |
| --- | --- | --- |
| Cuối năm 1 | Sống sót với 5 công, dư ít hoặc nợ nhẹ | Dư 15–20 tr |
| Cuối năm 2 | Thuê khoảng 10 công | Thuê 15–20 công, có máy làm dịch vụ |
| Cuối năm 3 | Có thể có mảnh đất đầu tiên (đất xấu, thế chấp) | Sở hữu 1–2 ha (một phần thế chấp), bắt đầu xây nhà |

## 10. Thành tích và so tài

- **Tính theo tài sản ròng** (tài sản trừ nợ).
- **Bậc danh hiệu:** làm thuê, tá điền, tiểu nông, trung nông, điền chủ. "2 ha cùng biệt thự sau 3 năm" là bậc cao nhất, dành cho khoảng 5% người chơi giỏi nhất.
- **Tiêu chí phụ:** diện tích sở hữu, loại nhà, uy tín.
- **Chống lợi dụng:** người vay tối đa mua 2 ha nhưng nợ ngập đầu không xếp cao hơn người mua 1 ha không nợ.
- **So tài bằng seed:** cùng seed thì thời tiết, dịch bệnh, giá cả giống hệt nhau. Thử thách hằng tuần theo seed tạo bảng xếp hạng cộng đồng mà không cần máy chủ.

## 11. Phạm vi và lộ trình

| Giai đoạn | Phạm vi | Tiêu chí hoàn thành |
| --- | --- | --- |
| Prototype | 1 thửa ruộng, 2 giống, 2 sâu bệnh, thời tiết ngẫu nhiên đơn giản, 3 nguồn vay (mua chịu, vay nóng, bán lúa non), uy tín, màn tính sổ | Chơi 3 vụ liên tiếp, thấy căng thẳng trước màn tính sổ và muốn chơi thêm |
| Demo | 1 năm, 2–3 vụ, 3–4 giống, 3–4 sâu bệnh, mưa hạn mặn, thương lái giá biến động, tiền thuê, vay mượn | Sẵn sàng cho Steam Next Fest |
| Mở rộng | Gia đình, con cái, thuê người, nhà nâng cao, cây ăn trái, nuôi tôm | Sau khi demo chứng minh được sức hút |
| Online | Kinh tế chung, xếp hạng trực tuyến | Chỉ cân nhắc khi bản offline thành công |

Trước prototype, dành 4–6 tuần thử cơ chế bằng hình khối: game vui khi chỉ là ô vuông thì cơ chế đã đúng.

## 12. Kỹ thuật và sử dụng AI

### Kiến trúc để thay art dễ dàng

- Engine: Godot 4, GDScript.
- Chốt thông số cố định từ đầu: kích thước ô (16 hoặc 32 px), tỉ lệ sprite, số frame mỗi animation, pivot.
- Dữ liệu (giống lúa, sâu bệnh, vật phẩm, NPC) định nghĩa bằng `Resource`, chỉ tham chiếu đường dẫn asset.
- Quy ước đặt tên và thư mục nhất quán, ví dụ `art/crops/rice_stage_01.png`.
- Âm thanh qua các audio bus riêng: nhạc, SFX, môi trường.
- Module kinh tế tách riêng để dễ mở rộng và dùng chung với bộ mô phỏng.
- Danh sách asset ghi nguồn gốc từng file (AI, tự làm, họa sĩ), công cụ đã dùng và trạng thái thay thế.

### Sử dụng AI

| Mảng | Mức dùng | Vai trò của bạn |
| --- | --- | --- |
| Game design | Cao | Người quyết định cuối, giữ phạm vi; yêu cầu AI phản biện thẳng thắn |
| Code | Cao | Tự thiết kế kiến trúc hệ thống cốt lõi, review; luôn ghi rõ "Godot 4.x" |
| Art | Trung bình | Asset tạm theo style guide, sửa tay trong Aseprite |
| Âm nhạc, SFX | Thấp–trung bình | Kiểm tra điều khoản thương mại của công cụ |

Trên Steam, nội dung do AI tạo có trong game phải khai báo công khai; công cụ hỗ trợ code thì không cần. Khi thay hết asset AI, cập nhật lại khai báo.

### Mô phỏng kinh tế

- Viết bằng Node.js: mô hình sinh trưởng, thời tiết ngẫu nhiên, giá cả, chi phí, nợ, không đồ họa.
- Bot chiến lược: an toàn (2 vụ, không vay), trung bình, liều (3 vụ, vay tối đa mua đất sớm).
- Mỗi bot chạy hàng nghìn lượt 3 năm với seed ngẫu nhiên.
- Mục tiêu: 60–70% bot trung bình sống sót năm đầu; 5–10% bot giỏi đạt 2 ha sau 3 năm; chiến lược liều không áp đảo.
- Logic sau đó chuyển sang GDScript.

## 13. Kênh nội dung và marketing

Góc nội dung chính: một lập trình viên làm game mô phỏng nông dân Việt Nam cùng AI, gameplay trước, art sau. Mọi video đều dẫn về nút wishlist trên Steam.

### Nền tảng

| Nền tảng | Vai trò | Tần suất |
| --- | --- | --- |
| YouTube (dài) | Devlog 8–15 phút, xây fan trung thành | 2–4 tuần/video |
| Shorts, TikTok, Reels | Clip 15–45 giây, tiếp cận người chơi mới | 2–3 clip/tuần |
| X/Twitter, Bluesky | GIF, ảnh, #screenshotsaturday | 3–4 bài/tuần |
| Reddit | Lấy phản hồi, không spam link | 2–4 bài/tháng |
| Discord | Giữ fan, tuyển playtester | Mở từ giai đoạn 3 |
| Steam | Đích đến: wishlist | Mở từ giai đoạn 3 |

YouTube dài và Steam dùng tiếng Anh; clip ngắn có thêm bản phụ đề tiếng Việt.

### Năm trụ cột nội dung

Tiến độ; giải quyết vấn đề; quyết định thiết kế; thử nghiệm với AI (minh bạch); văn hóa và bối cảnh. Thêm video đi thực tế hỏi nông dân.

### Giai đoạn

1. **Chuẩn bị:** đặt tên, đăng ký tài khoản, OBS Replay Buffer, kho nội dung hằng ngày.
2. **Prototype:** bán câu chuyện và ý tưởng; hỏi cộng đồng chọn cơ chế.
3. **Định hình bản sắc:** chốt art tạm, mở trang Steam và Discord, cho cộng đồng bình chọn tên NPC, tên làng.
4. **Demo và playtest:** trailer 60–90 giây, Steam Next Fest, gửi demo cho streamer cozy game nhỏ.
5. **Thay art:** chuỗi so sánh AI với thủ công; cột mốc gỡ khai báo AI.

### Quy trình hằng tuần

Thứ 2–6 làm game và lưu clip vào kho; thứ 7 dựng 2–3 clip ngắn, lên lịch cả tuần; chủ nhật (2–4 tuần/lần) viết kịch bản và thu tiếng video dài. Đều đặn quan trọng hơn dày đặc.

## 14. Việc còn mở

- [ ] Khảo sát giá thuê đất ruộng thực tế
- [ ] Viết bộ mô phỏng kinh tế và hiệu chỉnh toàn bộ con số
- [ ] Chốt danh sách giống lúa cụ thể và chỉ số từng giống
- [ ] Chốt danh sách sâu bệnh cho prototype kèm dấu hiệu nhận biết
- [ ] Đặt tên game
- [ ] Chọn phong cách art tạm và viết style guide
