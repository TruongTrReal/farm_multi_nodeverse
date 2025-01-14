const request = require("request");
require("console-stamp")(console, {
  format: ":date(yyyy/mm/dd HH:MM:ss.l)",
});

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36";


async function testProxy(proxyUrl) {
    console.log("-> Đang kiểm tra kết nối proxy...", proxyUrl);
  
    return new Promise((resolve, reject) => {
      const options = {
        url: "https://api.ipify.org?format=json",
        proxy: proxyUrl,
        timeout: 10000,
        headers: {
          "User-Agent": USER_AGENT,
        },
      };
  
      request(options, (error, response, body) => {
        if (error) {
          console.error("-> Kiểm tra proxy thất bại:", error.message);
          return reject(error);
        }
  
        if (response.statusCode !== 200) {
          console.error(
            "-> Kiểm tra proxy thất bại! Mã trạng thái:",
            response.statusCode
          );
          return reject(
            new Error(
              `Kiểm tra proxy thất bại! Mã trạng thái: ${response.statusCode}`
            )
          );
        }
  
        try {
          const data = JSON.parse(body);
          console.log("-> Kiểm tra proxy thành công! IP:", data.ip);
          resolve(data.ip);
        } catch (e) {
          console.error(
            "-> Kiểm tra proxy thất bại! Không thể phân tích phản hồi:",
            body
          );
          reject(e);
        }
      });
    });
  }

async function convertProxyUrl(proxyUrl) {
console.log("-> Đang chuyển đổi địa chỉ proxy...");
try {
    const url = new URL(proxyUrl);
    const protocol = url.protocol.replace(":", "");
    const username = url.username;
    const password = url.password;
    const host = url.hostname;
    const port = url.port;

    // Nếu là proxy socks5, thử chuyển đổi sang http
    if (protocol === "socks5") {
    console.log("-> Phát hiện proxy SOCKS5, thử chuyển đổi sang HTTP...");
    const httpProxy = `http://${username}:${password}@${host}:${port}`;
    console.log("-> Địa chỉ proxy đã chuyển đổi:", httpProxy);
    return httpProxy;
    }

    return proxyUrl;
} catch (error) {
    console.error("-> Chuyển đổi địa chỉ proxy thất bại:", error.message);
    return proxyUrl;
}
}

// export module proxy
module.exports = {
testProxy,
convertProxyUrl,
};