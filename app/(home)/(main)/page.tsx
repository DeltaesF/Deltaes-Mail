import Link from "next/link";

export default function Home() {
  return (
    <div className="w-full h-11/12 flex items-center justify-center ">
      <div className="w-10/12 h-[80%] flex items-center justify-center">
        <div className="flex w-full max-w-7xl gap-20 items-center justify-center">
          <div className="w-[30%] h-full flex flex-col gap-16">
            <div className="w-[70%] h-full bg-gray-500 ">
              <img
                src="/img/logo2.avif"
                className="w-full h-full object-cover"
              />
            </div>
            <p>
              당사 시스템은 엑셀 파일에 기재된 이메일 주소를 기반으로, 구글
              이메일 사용 시 <br />
              일일 최대 500건의 메일을 간편하게 전송할 수 있도록 지원합니다.
            </p>
            <Link href="/send">
              <button className="bg-black text-white p-[10px_40px] w-fit cursor-pointer animate-pulse rounded">
                시작하기
              </button>
            </Link>
          </div>
          <div className="w-[70%] h-full">
            <img
              src="/img/mainbanner.webp"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
