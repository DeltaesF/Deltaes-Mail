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
          [{ align: [] }],
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

  const formats = [
    "header",
    "font",
    "list",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "align",
    "blockquote",
    "code-block",
    "link",
    "image",
    "video",
    "hr",
  ];

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

      const editor = editorRef.current?.getEditor();
      if (!editor) return;

      // --- 👇 여기서부터 수정된 로직입니다 ---

      // 1. 선택한 파일로부터 이미지 원본 크기 가져오기
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = async () => {
          const imageWidth = img.width;
          const imageHeight = img.height;

          try {
            // 2. Google Drive에 업로드 후 이미지 URL 받아오기
            const url = await uploadImageToGoogleDrive(file);
            const decodedUrl = url.replace(/&amp;/g, "&");
            console.log("서버로부터 받은 URL:", decodedUrl);
            // 3. 원본 크기를 적용한 <img> 태그 생성
            const imageHtml = `<img src="${decodedUrl}" width="${imageWidth}" height="${imageHeight}" style="width:${imageWidth}px; height:${imageHeight}px;" />`;

            // 4. 현재 커서 위치에 HTML 삽입
            const range = editor.getSelection(true);
            if (range) {
              // insertEmbed 대신 dangerouslyPasteHTML 사용
              editor.clipboard.dangerouslyPasteHTML(range.index, imageHtml);
              editor.setSelection(range.index + 1);
            }
          } catch (error) {
            console.error("Image upload or processing failed:", error);
          }
        };
      };
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
        formats={formats}
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
