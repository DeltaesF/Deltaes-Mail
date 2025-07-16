import { NextRequest, NextResponse } from "next/server";
import { checkBounceEmails } from "@/lib/checkBounce";

export async function POST(req: NextRequest) {
  try {
    // 시간 관련 파라미터를 받지 않습니다.
    const { senderEmail, senderPassword } = await req.json();

    if (!senderEmail || !senderPassword) {
      return NextResponse.json(
        { error: "이메일 계정 정보 누락" },
        { status: 400 }
      );
    }

    // 파라미터 없이 함수를 호출합니다.
    const bounces = await checkBounceEmails(senderEmail, senderPassword);

    return NextResponse.json({ bounces });
  } catch (error) {
    console.error("반송 메일 확인 중 오류:", error);
    return NextResponse.json(
      { error: "서버에서 반송 메일을 확인하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
