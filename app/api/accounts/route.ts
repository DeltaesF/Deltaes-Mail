// app/api/accounts/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const raw = process.env.GMAIL_ACCOUNTS;
  try {
    const accounts = JSON.parse(raw || "[]");
    return NextResponse.json(accounts);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
