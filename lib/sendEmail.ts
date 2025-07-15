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
}

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

  const logPath = path.join(process.cwd(), "send-log.txt");

  for (const email of recipients) {
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
      onProgress(logMsg);
    } catch (e: unknown) {
      let errMsg = "Unknown error";

      if (e instanceof Error) {
        errMsg = e.message;
      }

      const logMsg = `[실패] ${email}: ${errMsg}`;
      fs.appendFileSync(logPath, `${new Date().toISOString()} ${logMsg}\n`);
      onProgress(logMsg);
    }
  }
}
