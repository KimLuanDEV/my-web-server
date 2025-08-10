const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Cho phép Express phục vụ file tĩnh từ thư mục "public"
app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại: http://localhost:${PORT}`);
});
