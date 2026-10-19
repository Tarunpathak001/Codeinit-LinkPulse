import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function fail(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  if (error instanceof AppError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  console.error(
    "Request failed",
    error instanceof Error ? error.message : "Unknown failure",
  );
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      if (origin === new URL(appUrl).origin) return;
    } catch {}
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (
    vercelUrl &&
    (origin === `https://${vercelUrl}` || origin === `http://${vercelUrl}`)
  ) {
    return;
  }

  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    if (
      origin === `${proto}://${host}` ||
      origin === `https://${host}` ||
      origin === `http://${host}`
    ) {
      return;
    }
  }

  throw new AppError("Invalid request origin", 403);
}
export async function body(request: Request) {
  const text = await request.text();
  if (text.length > 100_000) throw new AppError("Request too large", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("Invalid JSON");
  }
}
