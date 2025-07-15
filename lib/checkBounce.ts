import imaps from "imap-simple";
import { simpleParser } from "mailparser";

export const checkBounceEmails = async (
  senderEmail: string,
  senderPassword: string,
  searchSince: string
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

  let connection;
  try {
    connection = await imaps.connect({ imap: config.imap });
    await connection.openBox("INBOX");

    // [수정 1] 검색 조건: 'UNSEEN'을 제거하고, 'FROM' 기준으로 변경
    const searchCriteria = [
      "ALL", // 'UNSEEN' 대신 모든 메일을 대상으로 검색
      ["SINCE", searchSince], // 전달받은 시각 이후의 메일만 검색
      ["FROM", "mailer-daemon"], // 제목보다 발신자 기준이 더 안정적
    ];
    const fetchOptions = { bodies: [""], markSeen: true };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const bouncedEmails: string[] = [];

    // 이메일 주소를 찾는 정규식
    const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

    for (const message of messages) {
      const all = message.parts.find((part) => part.which === "");
      if (!all || !all.body) {
        bouncedEmails.push(`[반송됨] 본문 파싱 실패`);
        continue;
      }
      const parsed = await simpleParser(all.body);
      const text = parsed.text || "";

      // [수정 2] 정규식으로 본문에서 이메일 주소들을 찾음
      const matches = text.match(emailRegex);

      if (matches) {
        // 찾은 이메일 중, 자신의 이메일과 mailer-daemon을 제외한 첫 번째 이메일을 반송 주소로 간주
        const bounced = matches.find(
          (email) =>
            !email.includes(senderEmail) && !email.includes("mailer-daemon")
        );

        if (bounced) {
          bouncedEmails.push(`[반송됨] ${bounced}`);
        } else {
          bouncedEmails.push(
            `[반송됨] 상세 주소 미확인 (본문: ${text.substring(0, 100)}...)`
          );
        }
      } else {
        bouncedEmails.push(`[반송됨] 상세 주소 미확인`);
      }
    }

    await connection.end();
    return bouncedEmails;
  } catch (err) {
    console.error("IMAP 연결 또는 처리 중 오류 발생:", err);

    // [수정 1] 'err'가 Error 인스턴스인지 확인하여 타입을 좁힙니다.
    if (err instanceof Error) {
      if (err.message.includes("Invalid credentials")) {
        return [
          "[오류] 이메일 또는 비밀번호가 잘못되었습니다. 앱 비밀번호를 사용했는지 확인하세요.",
        ];
      }
    }
    return ["[오류] 반송 메일을 확인하는 중 문제가 발생했습니다."];
  } finally {
    // [수정 2] 'state' 속성 확인 로직을 제거하고, connection 객체의 존재 여부만 확인합니다.
    if (connection) {
      await connection.end();
    }
  }
};
