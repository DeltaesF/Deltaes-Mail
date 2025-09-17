"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const pages = ["/", "/send"];
  return (
    <div className="rounded-tl-2xl rounded-tr-2xl pt-3 pb-3 w-full border-b bg-[#5BBAFF]">
      <div className="flex items-center justify-between px-6">
        <h1 className="text-2xl">
          <div className="w-[120px] h-auto">
            <Link href="/">
              <img
                src="/img/logo2.avif"
                className="w-full h-full object-cover"
                alt="logo"
              />
            </Link>
          </div>
        </h1>
        <div className="flex gap-2">
          {pages.map((page, i) => (
            <Link key={i} href={page}>
              <div
                className={`rounded-full w-5 h-5 cursor-pointer transition-colors ${
                  pathname === page ? "bg-red-400" : "bg-white"
                }`}
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
