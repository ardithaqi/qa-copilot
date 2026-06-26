import type { WorkItemTypeSelection } from "@/types/work-item";

export interface SampleWorkItem {
  id: string;
  label: string;
  workItemType: WorkItemTypeSelection;
  text: string;
}

export const SAMPLE_WORK_ITEMS: SampleWorkItem[] = [
  {
    id: "password-reset",
    label: "Password reset",
    workItemType: "feature",
    text: `User story: Password reset via email

As a registered user who forgot my password,
I want to request a reset link by email
so that I can set a new password and sign in again.

Acceptance criteria:
- "Forgot password?" link is available on the login page.
- User enters a registered email and submits the form.
- System sends a reset email with a time-limited link (valid 1 hour).
- Valid link opens a "Set new password" form (password + confirm).
- Password must meet policy: min 8 chars, at least one number.
- After successful reset, user can log in with the new password.
- Used or expired links show a clear error and offer to request a new link.
- Unregistered emails get the same generic success message (no account enumeration).`,
  },
  {
    id: "checkout-bug",
    label: "Checkout bug",
    workItemType: "bug",
    text: `Bug: Discount not applied at checkout

Environment: Staging, Chrome 124, Windows 11
Reporter: QA team

Steps to reproduce:
1. Log in as a user with an active 10% promo code WELCOME10.
2. Add any in-stock item to the cart (price > $20).
3. Go to checkout and enter WELCOME10 in the promo field.
4. Click Apply.

Expected: Cart subtotal shows 10% discount; total updates before payment.
Actual: Promo field shows "Applied" but subtotal and total are unchanged.

Notes:
- Reproduces on mobile Safari as well.
- Issue started after the pricing service deploy on Tuesday.
- Server logs show the discount API returns 200 with discountAmount: 0.`,
  },
  {
    id: "api-rate-limit",
    label: "API rate limit",
    workItemType: "technical_change",
    text: `Technical change: Rate limiting on public API

We are adding rate limits to the public REST API to reduce abuse.

Scope:
- Authenticated requests: 1000 requests / hour per API key.
- Unauthenticated requests: 60 requests / hour per IP.
- When limit exceeded: HTTP 429 with Retry-After header (seconds).
- Existing clients must handle 429 without crashing or infinite retry loops.

Out of scope:
- Admin dashboard for viewing usage (follow-up ticket).
- Changes to webhook delivery.

Rollout: feature flag api_rate_limit_v1, enabled per environment after QA sign-off.`,
  },
];
