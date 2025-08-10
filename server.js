const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Khi người dùng truy cập trang chủ "/"
app.get('/', (req, res) => {
  res.send('Xin chào! 🚀 Server của bạn đang hoạt động!');
});

// Lắng nghe cổng và khởi động server
app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại: http://localhost:${PORT}`);
});
