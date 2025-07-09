"use client";

import "react-quill-new/dist/quill.snow.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type QuillType from "quill";
import ReactQuill from "react-quill-new";

declare global {
  interface Window {
    Quill: typeof QuillType;
  }
}

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function QuillEditor({ value, onChange }: QuillEditorProps) {
  const [mounted, setMounted] = useState(false);
  const editorRef = useRef<ReactQuill | null>(null);

  console.log(value);

  useEffect(() => {
    setMounted(true);
  }, []);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          ["bold", "italic", "underline", "strike"], // 굵게, 기울임 등
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image"], // ✅ 링크 삽입 버튼
          ["clean"], // 서식 제거
        ],
        handlers: {
          image: imageHandler,
        },
      },
    }),
    []
  );

  async function uploadImageToGoogleDrive(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload-image", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("이미지 업로드 실패");
    }

    const data = await res.json();
    console.log(data);
    return data.url; // 서버가 반환한 이미지 URL
  }

  // 이미지 버튼 눌렀을 때 실행되는 핸들러
  async function imageHandler() {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;

      const file = input.files[0];

      // Google Drive에 업로드 후 이미지 URL 받아오기
      const url = await uploadImageToGoogleDrive(file);
      const decodedUrl = url.replace(/&amp;/g, "&");

      const editor = editorRef.current?.getEditor();
      if (!editor) return;

      const range = editor.getSelection(true);
      if (range) {
        editor.insertEmbed(range.index, "image", decodedUrl);
        editor.setSelection(range.index + 1);
      }
    };
  }

  if (!mounted) return null;

  return (
    <div className="h-[22rem] mb-14 bg-gray-100 rounded ">
      <ReactQuill
        ref={editorRef}
        value={value}
        onChange={onChange}
        modules={modules}
        theme="snow"
        className="h-full"
      />
      <style jsx global>{`
        .ql-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          background-color: var(--color-gray-100);
        }
        .ql-editor {
          flex: 1;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}
