import Link from "next/link";

export default function Home() {
  return (
    <div className="w-full h-11/12 flex items-center justify-center ">
      <div className="w-10/12 h-[80%] flex items-center justify-center">
        <div className="flex w-full max-w-7xl gap-30 items-center justify-center">
          <div className="w-[40%] h-full flex flex-col gap-16">
            {/* <div className="w-[70%] h-full bg-gray-500 ">
              <img
                src="/img/logo2.avif"
                className="w-full h-full object-cover"
              />
            </div> */}

            <div className="pt-6 pb-6 p-4 rounded-xl border border-gray-200 shadow-lg">
              <p>
                당사 시스템은 <strong>엑셀 파일에 기재된 이메일 주소</strong>를
                기반으로,{" "}
                <strong>구글 이메일 계정을 사용하여 일일 최대 500건까지</strong>{" "}
                메일을 간편하게 전송할 수 있도록 지원합니다. <br /> 복잡한 설정
                없이{" "}
                <strong>
                  엑셀 파일만 업로드하면, 대상 목록 전체에 한 번에 메일을 발송할
                  수 있어 시간을 크게 절약할 수 있습니다.
                </strong>{" "}
                또한,{" "}
                <strong>
                  전송 과정에서 발생하는 반송 메일도 즉시 확인 가능
                </strong>
                하여 대규모 이메일 전송 작업을 보다 효율적이고 안전하게 진행할
                수 있습니다.
              </p>
            </div>
            <Link href="/send">
              <button className="bg-[#23a2fd] text-white p-[10px_40px] w-full cursor-pointer animate-pulse rounded">
                시작하기
              </button>
            </Link>
          </div>
          <div className="w-[60%] h-full">
            <img src="/img/mailb.png" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
}
