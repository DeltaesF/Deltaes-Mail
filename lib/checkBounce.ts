import imaps, { ImapSimple, Message } from "imap-simple";
import { simpleParser, ParsedMail } from "mailparser";
import stream from "stream";

export interface BounceCheckOptions {
  senderEmail: string;
  senderPassword: string;
  since: Date;
}

export const checkBounceEmails = async (
  options: BounceCheckOptions
): Promise<string[]> => {
  const { senderEmail, senderPassword, since } = options;

  const config = {
    imap: {
      user: senderEmail,
      password: senderPassword,
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      authTimeout: 10000,
      tlsOptions: {
        rejectUnauthorized: false,
      },
    },
  };

  let connection: ImapSimple | undefined;

  try {
    connection = await imaps.connect({ imap: config.imap });
    await connection.openBox("INBOX");

    // [핵심 수정] "UNSEEN" 조건을 제거합니다.
    // 이제 메일을 다른 기기에서 읽었더라도, 시간만 맞으면 모두 가져옵니다.
    const searchCriteria = [
      ["FROM", "mailer-daemon@googlemail.com"],
      ["SINCE", since.toISOString()],
    ];

    // 가져온 메일은 다음 검색에 잡히지 않도록 '읽음'으로 표시합니다.
    const fetchOptions = { bodies: [""], markSeen: true };

    const messages = (await connection.search(
      searchCriteria,
      fetchOptions
    )) as Message[];

    const bouncedEmails: string[] = [];

    for (const message of messages) {
      const all = message.parts.find((part) => part.which === "");
      if (!all || !all.body) continue;

      const mailStream = stream.Readable.from(all.body);
      const parsed: ParsedMail = await simpleParser(mailStream);
      const text = parsed.text || "";

      const regex =
        /delivery to the following recipient failed permanently:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
      const match = text.match(regex);

      if (match && match[1]) {
        bouncedEmails.push(`[반송됨] ${match[1]}`);
      }
    }

    return bouncedEmails;
  } catch (err) {
    console.error("IMAP 연결 또는 처리 중 오류 발생:", err);
    if (err instanceof Error) {
      if (err.message.includes("Invalid credentials")) {
        return [
          "[오류] 이메일 또는 비밀번호가 잘못되었습니다. 앱 비밀번호를 사용했는지 확인하세요.",
        ];
      }
      if (err.message.includes("timed out")) {
        return ["[오류] G메일 서버 연결에 실패했습니다. (타임아웃)"];
      }
    }
    return ["[오류] 반송 메일을 확인하는 중 문제가 발생했습니다."];
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};
