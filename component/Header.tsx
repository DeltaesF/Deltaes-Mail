import Link from "next/link";

export default function Header() {
  return (
    <div className="mt-2 p-2 w-full border-b">
      <h1 className="ml-6 text-2xl">
        <Link href="/">
          <div className="w-[10%] h-full bg-gray-500 ">
            <img src="/img/logo2.avif" className="w-full h-full object-cover" />
          </div>
        </Link>
      </h1>
    </div>
  );
}
