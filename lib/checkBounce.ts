import imaps, { ImapSimple, Message } from "imap-simple";
import { simpleParser } from "mailparser";

export const checkBounceEmails = async (
  senderEmail: string,
  senderPassword: string
): Promise<string[]> => {
  const config = {
    imap: {
      user: senderEmail,
      password: senderPassword,
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      authTimeout: 3000,
      tlsOptions: {
        rejectUnauthorized: false,
      },
    },
  };

  let connection: ImapSimple | undefined;

  try {
    connection = await imaps.connect({ imap: config.imap });
    await connection.openBox("INBOX");

    // [핵심 수정] "UNSEEN"으로 아직 읽지 않은 메일만 검색합니다.
    const searchCriteria = ["UNSEEN", ["FROM", "mailer-daemon"]];

    // [핵심 수정] 'markSeen: true'로, 가져온 메일은 자동으로 '읽음' 처리되게 합니다.
    const fetchOptions = { bodies: [""], markSeen: true, struct: true };

    const messages = (await connection.search(
      searchCriteria,
      fetchOptions
    )) as Message[];

    const bouncedEmails: string[] = [];
    const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

    for (const message of messages) {
      const all = message.parts.find((part) => part.which === "");
      if (!all || !all.body) {
        bouncedEmails.push(`[반송됨] 본문 파싱 실패`);
        continue;
      }
      const parsed = await simpleParser(all.body);
      const text = parsed.text || "";
      const matches = text.match(emailRegex);

      if (matches) {
        const bounced = matches.find(
          (email) =>
            !email.includes(senderEmail) && !email.includes("mailer-daemon")
        );
        if (bounced) {
          bouncedEmails.push(`[반송됨] ${bounced}`);
        } else {
          bouncedEmails.push(`[반송됨] 상세 주소 미확인`);
        }
      } else {
        bouncedEmails.push(`[반송됨] 상세 주소 미확인`);
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
    }
    return ["[오류] 반송 메일을 확인하는 중 문제가 발생했습니다."];
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};
