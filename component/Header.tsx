import Link from "next/link";

export default function Header() {
  return (
    <div className="mt-2 p-2 w-full border-b">
      <h1 className="ml-6 text-2xl">
        <Link href="/">로고</Link>
      </h1>
    </div>
  );
}
