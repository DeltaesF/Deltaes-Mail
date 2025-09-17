import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

export interface SendEmailOptions {
  senderEmail: string;
  senderPassword: string;
  subject: string;
  body: string;
  recipients: string[];
  onProgress: (log: string) => void;
  signal?: AbortSignal; // 중단 신호를 받을 수 있도록 추가
}

export async function sendEmail({
  senderEmail,
  senderPassword,
  subject,
  body,
  recipients,
  onProgress,
  signal,
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

  const logPath = path.join(process.cwd(), "send-log.txt");

  for (const email of recipients) {
    // [수정 3] 매번 이메일을 보내기 전에 중단 신호가 왔는지 확인합니다.
    if (signal?.aborted) {
      const logMsg = "[알림] 사용자에 의해 전송이 중단되었습니다.";
      // 중단 로그는 파일에 기록하지 않고, 화면에만 표시합니다.
      onProgress(logMsg + "\n");
      break; // 중단 신호가 있으면 for 루프를 즉시 탈출합니다.
    }

    try {
      await transporter.sendMail({
        from: senderEmail,
        to: email,
        subject,
        html: styledHtml,
        envelope: {
          from: senderEmail,
          to: email,
        },
      });

      const logMsg = `[성공] ${email}`;
      fs.appendFileSync(logPath, `${new Date().toISOString()} ${logMsg}\n`);
      onProgress(logMsg + "\n");
    } catch (e: unknown) {
      let errMsg = "Unknown error";

      if (e instanceof Error) {
        errMsg = e.message;
      }

      const logMsg = `[실패] ${email}: ${errMsg}`;
      fs.appendFileSync(logPath, `${new Date().toISOString()} ${logMsg}\n`);
      onProgress(logMsg + "\n");
    }
  }
}
