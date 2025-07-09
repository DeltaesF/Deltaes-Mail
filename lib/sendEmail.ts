import nodemailer from "nodemailer";

export interface SendEmailOptions {
  senderEmail: string;
  senderPassword: string;
  subject: string;
  body: string;
  recipients: string[];
  onProgress: (log: string) => void; // 실시간 로그 콜백
}

// 하나씩 메일 전송하고 실시간 콜백으로 상태 반환
export async function sendEmail({
  senderEmail,
  senderPassword,
  subject,
  body,
  recipients,
  onProgress,
}: SendEmailOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: senderEmail,
      pass: senderPassword,
    },
  });

  const styledHtml = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          p { margin: 0 0 10px; }
          strong { font-weight: bold; }
          em { font-style: italic; }
          u { text-decoration: underline; }
          ol { list-style-type: decimal; padding-left: 1.2em; }
          ul { list-style-type: disc; padding-left: 1.2em; }
          li { margin-bottom: 5px; }
        </style>
      </head>
      <body>
        ${body}
      </body>
    </html>
  `;

  for (const email of recipients) {
    try {
      await transporter.sendMail({
        from: senderEmail,
        to: email,
        subject,
        html: styledHtml,
      });

      onProgress(`[성공] ${email}\n`);
    } catch (e: unknown) {
      let errorMessage = "Unknown error";
      if (e instanceof Error) errorMessage = e.message;
      onProgress(`[실패] ${email}: ${errorMessage}\n`);
    }
  }
}
