import { NextRequest, NextResponse } from "next/server";
import { checkBounceEmails } from "@/lib/checkBounce";

export async function POST(req: NextRequest) {
  try {
    const { senderEmail, senderPassword, searchSince } = await req.json();

    if (!senderEmail || !senderPassword || !searchSince) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    const bounces = await checkBounceEmails(
      senderEmail,
      senderPassword,
      searchSince
    );

    return NextResponse.json({ bounces });
  } catch (error) {
    console.error("반송 메일 확인 중 오류:", error);
    return NextResponse.json({ error: "반송 메일 확인 실패" }, { status: 500 });
  }
}
