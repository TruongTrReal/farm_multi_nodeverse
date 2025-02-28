# Farm Multi Nodeverse

Tự động hóa quá trình farming trong Nodeverse với nhiều tài khoản và proxy.

## 1. Chuẩn Bị Môi Trường

### 1.1 Login user (nodeerse)

Đăng nhập vào tài khoản `nodeerse` (nếu cần):
```bash
su - nodeerse
```

### 1.2 Clone repository

```bash
git clone https://github.com/TruongTrReal/farm_multi_nodeverse
cd farm_multi_nodeverse
```

### 1.3 Cài đặt các phụ thuộc

```bash
npm install
```

## 2. Kiểm Tra & Cài Đặt Chromium và Chromedriver

### 2.1 Kiểm tra phiên bản Chromium

```bash
chromium --version
```
Nếu chưa cài đặt, hãy chạy:
```bash
sudo apt install chromium-browser
```

### 2.2 Kiểm tra và cài đặt Chromedriver

```bash
chromedriver --version
```
Nếu chưa cài đặt, hãy chạy:
```bash
sudo apt install chromium-chromedriver
```

### 2.3 Đảm bảo đường dẫn đúng

Kiểm tra đường dẫn:
```bash
which chromium
which chromedriver
```
Đảm bảo kết quả trả về là `/usr/bin/chromium` và `/usr/bin/chromedriver`.

## 3. Cấu Hình

### 3.1 Cấu hình tài khoản

Chỉnh sửa file `config/accounts.txt` theo định dạng `email:mật khẩu`, ví dụ:
```
test1@gmail.com:password1
test2@gmail.com:password2
```
Mở bằng nano:
```bash
nano config/accounts.txt
```

### 3.2 Cấu hình proxy

Chỉnh sửa file `config/proxy.txt` theo định dạng `username:password@ip:port`, ví dụ:
```
proxyuser:proxypass@192.168.1.10:3128
```
Mở bằng nano:
```bash
nano config/proxy.txt
```

## 4. Chạy Ứng Dụng

Dự án có **file chính** là `app.js`, trong đó hỗ trợ một số **tham số (arguments)**:

1. `--reset` hoặc `-r`:  
   - Xoá dữ liệu DB cũ và xoá thư mục profiles (nếu có).  
   - Thường dùng khi bạn muốn chạy lại từ đầu (cài đặt sạch).
2. `--proxy` hoặc `-p`:  
   - Đọc danh sách proxy từ `config/proxy.txt` và gán (assign) chúng cho các tài khoản (dựa trên `config/accounts.txt`).
3. `--services` hoặc `-s`:  
   - Danh sách service muốn chạy.  
   - Bao gồm các service: `gradient`, `toggle`, `bless`, `openloop`, `blockmesh`, `despeed`, `depined`.  

### 4.1 Trường hợp **chạy lần đầu** hoặc muốn bắt đầu từ zero

- **Reset DB**, xoá profiles, **gán proxy**, và **chạy toàn bộ service**:
  ```bash
  node app.js --reset --proxy --services gradient toggle bless openloop blockmesh despeed depined
  ```
  Lệnh trên sẽ:
  - Reset lại DB và xoá tất cả profile cũ (nếu có).
  - Đọc file `proxy.txt` và `accounts.txt` để gán proxy cho tài khoản.
  - Chạy **toàn bộ** các service (được liệt kê sau tham số `--services`).

### 4.2 Trường hợp **đã có** profiles và **chỉ muốn chạy lại** với cấu hình cũ

- **Không** cần reset DB (để giữ lại profile cũ), **vẫn gán proxy** (hoặc không):
  ```bash
  # Giữ nguyên profile cũ, vẫn gán proxy
  node app.js --proxy --services bless openloop
  ```
  Hoặc:
  ```bash
  # Giữ nguyên profile cũ, bỏ qua bước gán proxy
  node app.js --services bless openloop
  ```
  (Trường hợp này yêu cầu bạn đã gán proxy từ trước.)

Trong cả hai cách trên, DB sẽ **không** bị xoá và các profile cũ vẫn còn. Ứng dụng sẽ tiếp tục chạy kiểm tra/farm theo cấu hình hiện tại.

### 4.3 Tham số `--services`

Bạn có thể chỉ định bất kỳ service nào (một hoặc nhiều), ví dụ:
```bash
node app.js --services gradient toggle
```
hoặc
```bash
node app.js --services bless openloop depined
```
Nếu không truyền `--services`, ứng dụng sẽ báo lỗi vì **cần** biết phải chạy service nào.

## 5. Lưu Ý

- Bảo đảm **Chromium** và **Chromedriver** khớp phiên bản, nếu không có thể xảy ra lỗi lúc chạy tự động.
- Khi sử dụng `--reset`, tất cả dữ liệu và folder `profiles` sẽ bị **xoá** — chỉ dùng khi muốn chạy lại từ đầu.
- Nếu đã có profile và DB (chứa thông tin đăng nhập, proxy, v.v.) thì có thể bỏ qua `--reset`. Chỉ cần gọi `--services` (và tùy chọn `--proxy` nếu muốn cập nhật/gán mới).