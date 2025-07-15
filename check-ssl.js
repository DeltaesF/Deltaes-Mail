const tls = require("tls");

tls
  .connect(
    {
      host: "imap.gmail.com",
      port: 993,
      rejectUnauthorized: true,
    },
    () => {
      console.log("✅ SSL 인증 성공 (imap.gmail.com 연결 안전)");
    }
  )
  .on("error", (err) => {
    console.error("❌ SSL 인증 실패:", err.message);
  });
