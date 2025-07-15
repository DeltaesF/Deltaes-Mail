// pages/api/email-log.ts
import fs from "fs";
import path from "path";

export async function GET() {
  const logPath = path.join(process.cwd(), "send-log.txt");

  try {
    const data = fs.readFileSync(logPath, "utf-8");
    return new Response(JSON.stringify({ logs: data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ logs: null, error: (err as Error).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
