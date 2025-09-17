import { NextRequest, NextResponse } from "next/server";
// [수정 1] BounceCheckOptions 인터페이스를 함께 import 합니다.
import { checkBounceEmails, BounceCheckOptions } from "@/lib/checkBounce";

export async function POST(req: NextRequest) {
  try {
    const { senderEmail, senderPassword } = await req.json();

    if (!senderEmail || !senderPassword) {
      return NextResponse.json(
        { error: "이메일 계정 정보 누락" },
        { status: 400 }
      );
    }

    // [수정 2] checkBounceEmails 함수에 전달할 options 객체를 생성합니다.
    // 이 API는 독립적으로 실행되므로, 지난 24시간 동안의 반송 메일을 확인하도록 설정합니다.
    const options: BounceCheckOptions = {
      senderEmail,
      senderPassword,
      since: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24시간 전
    };

    // [수정 3] 인자 2개 대신, options 객체 하나만 전달합니다.
    const bounces = await checkBounceEmails(options);

    return NextResponse.json({ bounces });
  } catch (error) {
    console.error("반송 메일 확인 중 오류:", error);
    return NextResponse.json(
      { error: "서버에서 반송 메일을 확인하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
