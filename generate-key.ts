// 이 파일은 사용자별 인증 정보를 생성하는 개발자 전용 도구입니다.
import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * 32자리의 암호학적으로 안전한 랜덤 문자열을 생성합니다.
 * @returns {string} 생성된 API 키 스타일의 비밀번호
 */
function generateSecurePassword(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * 라이선스 정보를 담은 .env 파일을 생성하는 메인 함수
 */
function createEnvFile() {
  // process.argv 배열은 명령어 인수를 담고 있습니다.
  // 예: "npm run generate-key -- 00:1A:2B:3C:4D:5E"
  // process.argv[0] = node 경로
  // process.argv[1] = 스크립트 경로
  // process.argv[2] = 전달한 MAC 주소
  const userMacAddress = process.argv[2];

  if (!userMacAddress) {
    console.error("\n오류: MAC 주소를 입력해야 합니다.");
    console.log("사용 예시: npm run generate-key -- 00:1A:2B:3C:4D:5E\n");
    return;
  }

  const newPassword = generateSecurePassword();

  // 기존 .env 파일의 내용을 읽어옵니다.
  const baseEnvPath = path.join(__dirname, ".env");
  const baseEnvContent = fs.existsSync(baseEnvPath)
    ? fs.readFileSync(baseEnvPath, "utf-8")
    : "";

  // 새로운 라이선스 정보를 추가합니다.
  const newEnvContent = [
    baseEnvContent,
    `\n# --- 사용자 라이선스 정보 ---`,
    `LICENSED_MAC_ADDRESS=${userMacAddress}`,
    `APP_PASSWORD=${newPassword}`,
  ].join("\n");

  // .env 파일에 덮어씁니다.
  fs.writeFileSync(baseEnvPath, newEnvContent);

  console.log("\n✅ 성공! .env 파일에 아래 정보가 저장되었습니다.");
  console.log("--------------------------------------------------");
  console.log(`   MAC 주소: ${userMacAddress}`);
  console.log(`   생성된 비밀번호: ${newPassword}`);
  console.log("--------------------------------------------------");
  console.log('이제 "npm run pack"을 실행하여 사용자 전용 빌드를 생성하세요.');
  console.log(
    "빌드가 완료되면, 생성된 비밀번호를 사용자에게 전달해야 합니다.\n"
  );
}

createEnvFile();
