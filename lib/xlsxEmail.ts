import * as XLSX from "xlsx";

// 엑셀 파일의 buffer를 받아서 이메일 리스트를 추출하는 함수
export function xlsxEmail(buffer: Buffer): string[] {
  const workbook = XLSX.read(buffer, { type: "buffer" }); // 엑셀 파일 읽기
  const sheetName = workbook.SheetNames[0]; // 첫 번째 시트 선택
  const sheet = workbook.Sheets[sheetName]; // 시트 객체
  const data = XLSX.utils.sheet_to_json<{ email: string }>(sheet); // 시트를 JSON 배열로 변환

  // 'email' 열을 기준으로 리스트 추출하고 빈 값은 제거
  return data.map((row) => row.email).filter(Boolean);
}
