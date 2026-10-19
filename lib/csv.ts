import { linkInput } from "./validation";
export function csvRow(row: Record<string, string>, campaignId: string | null) {
  return linkInput.parse({
    destinationUrl: row.destination_url || "",
    customAlias: row.custom_alias || "",
    title: row.title || "",
    campaignId,
    expiresAt: row.expires_at || null,
    maxClicks: row.max_clicks ? Number(row.max_clicks) : null,
  });
}
