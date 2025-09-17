import { NextRequest } from "next/server";
import { sendEmail } from "@/lib/sendEmail";
import { xlsxEmail } from "@/lib/xlsxEmail";
import { checkBounceEmails, BounceCheckOptions } from "@/lib/checkBounce";

export async function POST(req: NextRequest) {
  const signal = req.signal;
  const formData = await req.formData();
  const subject = formData.get("subject") as string;
  const body = formData.get("body") as string;
  const file = formData.get("file") as File;
  const senderEmail = formData.get("senderEmail") as string;
  const senderPassword = formData.get("senderPassword") as string;

  const buffer = Buffer.from(await file.arrayBuffer());
  const emailList = xlsxEmail(buffer);
  const encoder = new TextEncoder();
  const startTime = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await sendEmail({
          senderEmail,
          senderPassword,
          subject,
          body,
          recipients: emailList,
          onProgress: (log) => controller.enqueue(encoder.encode(log)),
          signal,
        });

        if (signal.aborted) {
          controller.enqueue(encoder.encode("[알림] 작업이 중단되었습니다.\n"));
          return;
        }

        controller.enqueue(
          encoder.encode(
            "[알림] 최종 반송 메일을 확인 중입니다 (15초 대기)...\n"
          )
        );
        await new Promise((resolve) => setTimeout(resolve, 15000));

        if (signal.aborted) {
          controller.enqueue(encoder.encode("[알림] 작업이 중단되었습니다.\n"));
          return;
        }

        const options: BounceCheckOptions = {
          senderEmail,
          senderPassword,
          since: startTime,
        };
        const finalBounces = await checkBounceEmails(options);

        if (finalBounces.length > 0) {
          const bounceLog = finalBounces.join("\n");
          controller.enqueue(encoder.encode(bounceLog + "\n"));
        }
      } catch (error) {
        console.error("send-email API 오류:", error);
        controller.enqueue(
          encoder.encode("[오류] 전체 작업 중 문제가 발생했습니다.\n")
        );
      } finally {
        // [수정] finally 블록에서 모든 작업이 끝난 후, 딱 한 번만 완료 메시지를 보냅니다.
        if (!signal.aborted) {
          controller.enqueue(
            encoder.encode("[알림] 모든 작업이 완료되었습니다.\n")
          );
          controller.close();
        }
      }
    },
    cancel() {
      console.log("스트림이 클라이언트에 의해 취소되었습니다.");
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
