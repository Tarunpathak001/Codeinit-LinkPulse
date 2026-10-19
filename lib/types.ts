export type ClientLink = {
  id: string;
  title: string;
  shortCode: string;
  destinationUrl: string;
  campaignId: string | null;
  isActive: boolean;
  expiresAt: string | null;
  maxClicks: number | null;
  acceptedRedirectCount: number;
  passwordProtected: boolean;
  disabledAt: string | null;
  disabledReason: string | null;
  createdAt: string;
};
export type Campaign = {
  id: string;
  name: string;
  description: string;
  linkCount: number;
  active: number;
  accepted: number;
};
export type Analytics = {
  previousAccepted: number;
  growthPercent: number | null;
  accepted: number;
  ordinary: number;
  bots: number;
  unique: number;
  blocked: number;
  daily: { date: string; visits: number; bots: number }[];
  dimensions: {
    source: string;
    device: string;
    browser: string;
    count: number;
  }[];
  recent: {
    id: number;
    code: string;
    at: string;
    source: string;
    device: string;
    browser: string;
    bot: boolean;
  }[];
  top: { id: string; code: string; title: string; count: number }[];
};
