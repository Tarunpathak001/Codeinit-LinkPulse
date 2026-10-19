import { UAParser } from "ua-parser-js";
export function requestMetadata(request: Request, visitor: string) {
  const agent = request.headers.get("user-agent") || "";
  const ua = new UAParser(agent).getResult();
  let referrerHost: string | null = null;
  try {
    referrerHost = new URL(request.headers.get("referer") || "").hostname;
  } catch {}
  const src = new URL(request.url).searchParams.get("src");
  return {
    source:
      src === "qr"
        ? "QR"
        : referrerHost
          ? "Referral"
          : src
            ? "Other"
            : "Direct",
    referrerHost,
    deviceType:
      ua.device.type === "mobile"
        ? "Mobile"
        : ua.device.type === "tablet"
          ? "Tablet"
          : ua.browser.name
            ? "Desktop"
            : "Unknown",
    browser: ua.browser.name || "Unknown",
    operatingSystem: ua.os.name || "Unknown",
    countryCode: null,
    isProbableBot:
      /bot|crawler|spider|preview|curl|wget|headless/i.test(agent) ||
      /prefetch|prerender/i.test(
        [
          request.headers.get("purpose"),
          request.headers.get("sec-purpose"),
        ].join(" "),
      ),
    anonymousVisitorId: visitor,
  };
}
export function shortUrl(code: string, qr = false) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL is required");
  return new URL("/" + code + (qr ? "?src=qr" : ""), base).toString();
}
