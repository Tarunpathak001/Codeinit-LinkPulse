export type RuleLink = {
  isActive: boolean;
  expiresAt: Date | string | null;
  maxClicks: number | null;
  acceptedRedirectCount: number;
  passwordProtected: boolean;
  disabledAt?: Date | string | null;
};
export type Reason =
  | "NOT_FOUND"
  | "DISABLED"
  | "EXPIRED"
  | "CLICK_LIMIT_REACHED"
  | "PASSWORD_REQUIRED"
  | "ALLOWED";
export const explanations: Record<Reason, string> = {
  NOT_FOUND: "This short link does not exist.",
  DISABLED: "This link is no longer available.",
  EXPIRED: "This link has expired.",
  CLICK_LIMIT_REACHED: "This link has reached its maximum number of visits.",
  PASSWORD_REQUIRED: "Enter the access password to continue.",
  ALLOWED: "All rules passed. This visit can redirect.",
};
export function evaluateRedirect(
  link: RuleLink | null,
  context: { now: Date; passwordSatisfied: boolean },
) {
  const reason: Reason = !link
    ? "NOT_FOUND"
    : !link.isActive || link.disabledAt
      ? "DISABLED"
      : link.expiresAt &&
          new Date(link.expiresAt).getTime() <= context.now.getTime()
        ? "EXPIRED"
        : link.maxClicks !== null &&
            link.acceptedRedirectCount >= link.maxClicks
          ? "CLICK_LIMIT_REACHED"
          : link.passwordProtected && !context.passwordSatisfied
            ? "PASSWORD_REQUIRED"
            : "ALLOWED";
  return {
    decision:
      reason === "ALLOWED"
        ? ("ALLOW" as const)
        : reason === "PASSWORD_REQUIRED"
          ? ("PASSWORD_REQUIRED" as const)
          : ("DENY" as const),
    reason,
    explanation: explanations[reason],
  };
}
