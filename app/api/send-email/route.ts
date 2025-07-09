// import { NextRequest } from "next/server";
// import { sendEmail } from "@/lib/sendEmail";
// import { xlsxEmail } from "@/lib/xlsxEmail";

// export async function POST(req: NextRequest) {
//   const formData = await req.formData();
//   const subject = formData.get("subject") as string;
//   const body = formData.get("body") as string;
//   const file = formData.get("file") as File;

//   // 환경 변수에서 이메일 계정 정보 가져오기
//   const senderEmail = process.env.GMAIL_USER!;
//   const senderPassword = process.env.GMAIL_PASS!;

//   // 엑셀 파일 내용을 Buffer로 변환
//   const buffer = Buffer.from(await file.arrayBuffer());
//   const emailList = xlsxEmail(buffer); // 이메일 주소 파싱

//   const encoder = new TextEncoder();

//   const stream = new ReadableStream({
//     async start(controller) {
//       await sendEmail({
//         senderEmail,
//         senderPassword,
//         subject,
//         body,
//         recipients: emailList,
//         onProgress: (log) => {
//           controller.enqueue(encoder.encode(log));
//         },
//       });

//       controller.close();
//     },
//   });

//   return new Response(stream, {
//     headers: { "Content-Type": "text/plain; charset=utf-8" },
//   });
// }

import { sendEmail } from "@/lib/sendEmail";
import { xlsxEmail } from "@/lib/xlsxEmail";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const subject = formData.get("subject") as string;
  const body = formData.get("body") as string;
  const file = formData.get("file") as File;

  const senderEmail = formData.get("senderEmail") as string;
  const senderPassword = formData.get("senderPassword") as string;

  const buffer = Buffer.from(await file.arrayBuffer());
  const emailList = xlsxEmail(buffer);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      await sendEmail({
        senderEmail,
        senderPassword,
        subject,
        body,
        recipients: emailList,
        onProgress: (log) => {
          controller.enqueue(encoder.encode(log));
        },
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
