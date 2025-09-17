"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";

const fireConfetti = () => {
  confetti({
    particleCount: 200,
    spread: 150,
    origin: { y: 0.7 },
  });
};

interface EmailAccount {
  email: string;
  pass: string;
}

const QuillEditor = dynamic(() => import("@/component/QuillEditor"), {
  ssr: false,
});

export default function SendEmailPage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string[]>([]);

  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedPassword, setSelectedPassword] = useState("");

  const [showModal, setShowModal] = useState(false);

  // const [lastSentTimestamp, setLastSentTimestamp] = useState<string | null>(
  //   null
  // );
  // [수정 1] AbortController를 관리하기 위한 ref를 추가합니다.
  const abortControllerRef = useRef<AbortController | null>(null);

  // 📌 서버에서 발신자 계정 목록을 불러오기
  useEffect(() => {
    const fetchAccounts = async () => {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      setAccounts(data);
      if (data.length > 0) {
        setSelectedEmail(data[0].email);
        setSelectedPassword(data[0].pass);
      }
    };
    fetchAccounts();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setXlsxFile(file);
  };

  const handleSubmit = async () => {
    if (!xlsxFile || !subject || !body) {
      alert("제목, 내용, 엑셀 파일을 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    setStatus([]);

    // [수정 2] 새로운 AbortController를 생성합니다.
    abortControllerRef.current = new AbortController();

    const formData = new FormData();
    formData.append("subject", subject);
    formData.append("body", body);
    formData.append("file", xlsxFile);
    formData.append("senderEmail", selectedEmail);
    formData.append("senderPassword", selectedPassword);

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        body: formData,
        // [수정 3] 생성된 '중단 신호'를 fetch 요청에 전달합니다.
        signal: abortControllerRef.current.signal,
      });

      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        setStatus((prev) => [...prev, ...text.trim().split("\n")]);
      }

      setStatus((prev) => [...prev, "[알림] 모든 작업이 완료되었습니다."]);
      setShowModal(true);
      fireConfetti();
    } catch (error) {
      // [수정] 'error'가 Error 인스턴스인지 확인하여 타입을 좁힙니다.
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Fetch aborted by user.");
      } else {
        console.error("An error occurred during fetch:", error);
        setStatus((prev) => [
          ...prev,
          "[오류] 전송 중 예상치 못한 오류가 발생했습니다.",
        ]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // [수정 5] 전송을 중단하는 함수를 새로 만듭니다.
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus((prev) => [
        ...prev,
        "[알림] 사용자에 의해 전송이 중지되었습니다.",
      ]);
    }
  };

  // // ✅ 서버 로그를 status에 추가
  // const fetchLogs = async () => {
  //   const res = await fetch("/api/log");
  //   const data = await res.json();

  //   if (data.logs) {
  //     const lines = data.logs.split("\n").filter(Boolean);
  //     setStatus((prev) => [
  //       ...prev,
  //       "--- 📑 서버에 저장된 발송 로그 ---",
  //       ...lines,
  //     ]);
  //   } else {
  //     setStatus((prev) => [
  //       ...prev,
  //       "[오류] 서버 로그를 불러오는 데 실패했습니다.",
  //     ]);
  //   }
  // };

  // [핵심 수정] 복잡한 필터링 로직을 모두 제거하여 단순화합니다.
  // const handleCheckBounce = async () => {
  //   setStatus((prev) => [...prev, "[알림] 도착한 반송 메일을 확인합니다..."]);

  //   const res = await fetch("/api/check-bounce", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       senderEmail: selectedEmail,
  //       senderPassword: selectedPassword,
  //     }),
  //   });

  //   const data = await res.json();

  //   // "확인 중" 메시지만 지우고, 백엔드가 보내준 결과만 그대로 추가합니다.
  //   // 백엔드가 오직 '새로운' 메일만 보내주므로, 프론트에서는 더 이상 필터링할 필요가 없습니다.
  //   setStatus((prev) => {
  //     const filteredLog = prev.filter(
  //       (line) => !line.includes("반송 메일을 확인합니다")
  //     );
  //     if (data?.bounces?.length) {
  //       return [...filteredLog, ...data.bounces];
  //     } else {
  //       return [...filteredLog, "[알림] 새로 도착한 반송 메일이 없습니다."];
  //     }
  //   });
  // };

  const successCount = status.filter((line) => line.includes("[성공]")).length;
  const failCount = status.filter((line) => line.includes("[실패]")).length;
  const bounceCount = status.filter((line) => line.includes("[반송됨]")).length;
  const totalCount = successCount + failCount;

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [status]);

  return (
    <div className="w-full h-11/12 flex flex-col items-center justify-start ">
      <h1 className="text-3xl text-[#6e6e6e] font-bold mt-7 border-b-4 border-[#5BBAFF] pb-1 w-1/6 text-center">
        MAIL
      </h1>
      <div className="w-11/12 max-w-6xl h-[100%] flex gap-6 mt-8">
        <div className="w-[70%] h-[80%]">
          {/* 발신자 이메일 선택 */}
          <div className="mb-4 ">
            <label className="ml-2 mb-1 font-bold text-[#6e6e6e]">
              e-mail 📧
            </label>
            {accounts.length === 0 ? (
              <p className="text-red-500 text-sm"></p>
            ) : (
              <select
                className="ml-2 p-2 cursor-pointer border rounded-2xl border-[#C6C5C5]"
                value={selectedEmail}
                onChange={(e) => {
                  const selected = accounts.find(
                    (a) => a.email === e.target.value
                  );
                  if (selected) {
                    setSelectedEmail(selected.email);
                    setSelectedPassword(selected.pass);
                  }
                }}
              >
                {accounts.map((acc, i) => (
                  <option key={i} value={acc.email}>
                    {acc.email}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="file-upload"
              className="cursor-pointer rounded  px-5 py-2 bg-[#5BBAFF] hover:bg-[#7ac5fa] text-white rounded-2xl"
            >
              excel-mail
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleFileChange}
            />
            {xlsxFile && (
              <div className="ml-2 text-sm text-gray-700 inline-block">
                📎 선택된 파일:{" "}
                <span className="font-medium">{xlsxFile.name}</span>
              </div>
            )}
          </div>

          <input
            type="text"
            placeholder="메일 제목을 입력해주세요."
            className="bg-gray-100 p-3 w-full mb-4 rounded"
            onChange={(e) => setSubject(e.target.value)}
            value={subject}
          />

          <QuillEditor value={body} onChange={setBody} />

          {/* [수정 6] loading 상태에 따라 버튼의 기능과 텍스트가 바뀌도록 수정합니다. */}
          <button
            className={`w-full text-white py-3 rounded disabled:opacity-50 cursor-pointer ${
              loading
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-[#5BBAFF] hover:bg-[#7ac5fa]"
            }`}
            onClick={loading ? handleStop : handleSubmit}
          >
            {loading ? "전송 중지" : "메일 전송"}
          </button>
        </div>

        <div className="w-[30%] h-[90%]">
          <div
            ref={scrollRef}
            className="mt-4 h-[90%] overflow-y-auto rounded-3xl bg-white border border-gray-200 whitespace-pre-wrap text-sm text-gray-800 flex flex-col"
          >
            <div className="text-center p-3 bg-[#5BBAFF] text-white font-bold">
              send list
            </div>
            <div className="flex-1 p-2 overflow-y-auto">
              {status.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.includes("[실패]")
                      ? "text-red-500"
                      : line.includes("[반송됨]")
                      ? "text-orange-500 font-semibold"
                      : line.includes("[알림]")
                      ? "text-blue-500"
                      : "text-green-600"
                  }
                >
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* --- [수정 3] 요약 정보에 '반송' 건수를 추가합니다. --- */}
          {status.length > 0 && (
            <div className="mt-4 h-[8%] text-sm">
              <p>📊 총 {totalCount}건 발송 시도</p>
              <p>
                ✅ {successCount}건 성공, ❌ {failCount}건 실패, 📮{" "}
                {bounceCount}건 반송
              </p>
            </div>
          )}

          {/* {status.length > 0 && (
            <div className="mt-4 h-[8%]">
              📊 총 {totalCount}명 중 → ✅ {successCount}명 성공, ❌ {failCount}
              명 실패
            </div>
          )}

          <button
            onClick={handleCheckBounce}
            className="mt-2 w-full py-2 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
          >
            📮 반송 메일 확인
          </button> */}
        </div>
      </div>

      {/* 완료 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-100 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">✅ 모든 작업 완료</h2>
            <div className="text-gray-600">
              <p>📤 메일 전송 및 실시간 반송 확인이 모두 끝났습니다.</p>
              <p className="mt-1">
                📊 총 {totalCount}건 발송 시도 → ✅ {successCount}건 성공, ❌{" "}
                {failCount}건 실패, 📮 {bounceCount}건 반송
              </p>
            </div>
            <button
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => setShowModal(false)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
