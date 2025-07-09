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

    const formData = new FormData();
    formData.append("subject", subject);
    formData.append("body", body);
    formData.append("file", xlsxFile);
    formData.append("senderEmail", selectedEmail);
    formData.append("senderPassword", selectedPassword);

    const res = await fetch("/api/send-email", {
      method: "POST",
      body: formData,
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

    setLoading(false);
    setShowModal(true);
    fireConfetti();
  };

  const successCount = status.filter((line) => line.includes("[성공]")).length;
  const failCount = status.filter((line) => line.includes("[실패]")).length;
  const totalCount = successCount + failCount;

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [status]);

  return (
    <div className="w-full h-11/12 flex items-center justify-center ">
      <div className="w-11/12 max-w-6xl h-[100%] flex items-center justify-center gap-6 ">
        <div className="w-[70%] h-[80%]">
          {/* 발신자 이메일 선택 */}
          <div className="mb-4 ">
            <label className="mb-1 font-medium">보내는 이메일 📧</label>
            {accounts.length === 0 ? (
              <p className="text-red-500 text-sm"></p>
            ) : (
              <select
                className="ml-2 border p-2 cursor-pointer rounded"
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
              className="cursor-pointer rounded  px-2 py-2 bg-gray-500 hover:bg-gray-700 text-white "
            >
              엑셀 파일 선택
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
            placeholder="메일 제목"
            className="bg-gray-200 p-3 w-full mb-4 rounded"
            onChange={(e) => setSubject(e.target.value)}
            value={subject}
          />

          <QuillEditor value={body} onChange={setBody} />

          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded disabled:opacity-50 cursor-pointer"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? "전송 중..." : "메일 전송"}
          </button>
        </div>

        <div className="w-[30%] h-[90%] ">
          <div
            ref={scrollRef}
            className="mt-4 h-[82%] overflow-y-auto rounded bg-gray-200 whitespace-pre-wrap text-sm text-gray-800"
          >
            {status.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
          {status.length > 0 && ( // ✔ status가 하나라도 있으면 요약 통계 출력
            <div className="mt-5 h-[8%]">
              📊 총 {totalCount}명 중 → ✅ {successCount}명 성공, ❌ {failCount}
              명 실패
            </div>
          )}
        </div>
      </div>
      {/* ✅ 전송 완료 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-100 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">✅ 메일 전송 완료</h2>
            {status.length > 0 && ( // ✔ status가 하나라도 있으면 요약 통계 출력
              <div className="text-gray-600">
                <p>
                  모든 메일이 정상적으로 전송되었습니다.
                  <br />
                </p>
                <p className="mt-1">
                  📊 총 {totalCount}명 중 → ✅ {successCount}명 성공, ❌{" "}
                  {failCount}명 실패
                </p>
              </div>
            )}
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
