import { NextRequest } from "next/server";
import { sendEmail } from "@/lib/sendEmail";
import { xlsxEmail } from "@/lib/xlsxEmail";
import { checkBounceEmails } from "@/lib/checkBounce";

export async function POST(req: NextRequest) {
  // [수정 1] 프론트엔드에서 보낸 '중단 신호'를 받습니다.
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
  let bounceCheckInterval: NodeJS.Timeout | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      // 주기적으로 반송 메일을 확인하는 작업을 시작합니다.
      bounceCheckInterval = setInterval(async () => {
        try {
          const bounces = await checkBounceEmails(senderEmail, senderPassword);
          if (bounces.length > 0) {
            const bounceLog = bounces.join("\n");
            controller.enqueue(encoder.encode(bounceLog + "\n"));
          }
        } catch (error) {
          console.error("주기적 반송 메일 확인 중 오류:", error);
        }
      }, 8000); // 8초마다 확인

      try {
        // 메인 이메일 발송 작업을 실행하며, '중단 신호'를 함께 전달합니다.
        await sendEmail({
          senderEmail,
          senderPassword,
          subject,
          body,
          recipients: emailList,
          onProgress: (log) => {
            controller.enqueue(encoder.encode(log));
          },
          signal, // [수정 2] AbortSignal을 sendEmail 함수로 전달
        });

        // [수정 3] 전송이 중단되었다면, 최종 확인 절차를 건너뜁니다.
        if (signal.aborted) {
          return; // finally 블록에서 정리 후 종료됩니다.
        }

        // --- 모든 작업이 끝난 후 최종 확인 절차 ---
        clearInterval(bounceCheckInterval);
        bounceCheckInterval = undefined; // 정리되었음을 표시

        controller.enqueue(
          encoder.encode("[알림] 최종 반송 메일을 확인 중입니다...\n")
        );

        // 12초 대기 중에도 중단 신호를 받을 수 있도록 처리
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 12000);
          signal.addEventListener("abort", () => {
            clearTimeout(timeout);
            resolve(null); // 중단되면 즉시 resolve
          });
        });

        if (signal.aborted) return;

        // 마지막으로 반송 메일을 한 번 더 확인합니다.
        const finalBounces = await checkBounceEmails(
          senderEmail,
          senderPassword
        );
        if (finalBounces.length > 0) {
          const bounceLog = finalBounces.join("\n");
          controller.enqueue(encoder.encode(bounceLog + "\n"));
        }
      } finally {
        // [수정 4] 작업이 끝나거나 중단되었을 때 항상 정리합니다.
        if (bounceCheckInterval) {
          clearInterval(bounceCheckInterval);
        }
        // 작업이 중단되지 않고 정상적으로 끝났을 때만 스트림을 닫습니다.
        if (!signal.aborted) {
          controller.close();
        }
      }
    },
    cancel() {
      // [수정 5] 프론트엔드가 연결을 끊으면(중단하면) 실행됩니다.
      if (bounceCheckInterval) {
        clearInterval(bounceCheckInterval);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
