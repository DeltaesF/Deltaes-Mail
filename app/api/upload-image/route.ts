import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

// 환경 변수
const GOOGLE_FOLDER_ID = process.env.GOOGLE_DRIVE_EMAIL_FOLDER_ID!;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n");

// Google 인증
const auth = new google.auth.JWT({
  email: SERVICE_ACCOUNT_EMAIL,
  key: PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/drive"],
});
const drive = google.drive({ version: "v3", auth });

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // 업로드할 파일 메타데이터
    const fileMeta = {
      name: file.name,
      parents: [GOOGLE_FOLDER_ID],
    };

    const media = {
      mimeType: file.type,
      body: Readable.from(buffer),
    };

    // 파일 업로드
    const uploadRes = await drive.files.create({
      requestBody: fileMeta,
      media,
      fields: "id",
    });

    const fileId = uploadRes.data.id;

    // 공개 권한 부여
    await drive.permissions.create({
      fileId: fileId!,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // <img> 태그에 바로 사용 가능한 직접 콘텐츠 링크
    const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    console.log("Embeddable fileUrl: ", publicUrl);

    return NextResponse.json({ url: publicUrl });
  } catch (error: unknown) {
    console.error("Google Drive Upload Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
