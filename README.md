# Farm Multi Nodeverse

Tự động hóa quá trình farming trong Nodeverse với nhiều tài khoản và proxy.

## Cài Đặt

1. **Login user (nodeerse)**:
   đăng nhập vào tài khoản `nodeerse`:
   ```bash
   su - nodeerse
   ```

2. **Clone repository**:
   ```bash
   git clone https://github.com/TruongTrReal/farm_multi_nodeverse
   cd farm_multi_nodeverse
   ```

3. **Cài đặt các phụ thuộc**:
   ```bash
   npm install
   ```

## Kiểm Tra và Cài Đặt Chromium và Chromedriver

4. **Kiểm tra phiên bản Chromium**:
   Kiểm tra nếu Chromium đã được cài đặt:
   ```bash
   chromium --version
   ```
   Nếu chưa có, cài đặt Chromium:
   ```bash
   sudo apt install chromium-browser
   ```

5. **Kiểm tra và cài đặt Chromedriver**:
   Kiểm tra nếu Chromedriver đã được cài đặt:
   ```bash
   chromedriver --version
   ```
   Nếu chưa có, cài đặt Chromedriver:
   ```bash
   sudo apt install chromium-chromedriver
   ```

6. **Đảm bảo đường dẫn đúng**:
   Kiểm tra đường dẫn của Chromium và Chromedriver:
   ```bash
   which chromium
   which chromedriver
   ```
   Đảm bảo rằng đường dẫn là `/usr/bin/chromium` và `/usr/bin/chromedriver`.

7. **Thay đổi đường dẫn nếu cần**:
   Nếu đường dẫn khác, mở file `node_handler/automation.js` và thay đổi đường dẫn `binaryPath` cho đúng với đường dẫn của bạn:
   ```javascript
   binaryPath: '/usr/bin/chromium', // Thay đổi nếu cần
   ```

## Cấu Hình

8. **Cấu hình tài khoản**:
   Chỉnh sửa file `config/accounts.txt` theo định dạng `email:mật khẩu`:
   ```bash
   nano config/accounts.txt
   ```

9. **Cấu hình proxy**:
   Chỉnh sửa file `config/proxy.txt` với các proxy theo định dạng `ip:port:username:password`:
   ```bash
   nano config/proxy.txt
   ```

## Chạy Ứng Dụng

10. **Lọc proxy và gán nhiệm vụ**:
   ```bash
   node get.js
   node account.js
   ```

11. **Bắt đầu quá trình farming**:
   ```bash
   node app.js
   ```

## Lưu Ý

- Đảm bảo **chromedriver** khớp với phiên bản Chromium của bạn.
- Có thể chạy ở **chế độ headless** bằng cách thay đổi tùy chọn trong script.