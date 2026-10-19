import QRCode from "qrcode";
import { requireUser } from "@/lib/auth";
import { ownLink } from "@/lib/links";
import { shortUrl } from "@/lib/metadata";
import { fail } from "@/lib/errors";
import { uuid } from "@/lib/validation";
export async function GET(r: Request, c: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const link = await ownLink(u.id, uuid.parse((await c.params).id));
    const buffer = await QRCode.toBuffer(shortUrl(link.shortCode, true), {
      width: 640,
      margin: 3,
      errorCorrectionLevel: "M",
    });
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="linkpulse-${link.shortCode}.png"`,
      },
    });
  } catch (e) {
    return fail(e);
  }
}
