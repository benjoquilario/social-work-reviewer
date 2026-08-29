import { Query } from "../appwrite"
import { assertContentConfigured, listAll } from "../db"
import { formatMoney, type SubscriptionPlanDocument } from "../schema"

/**
 * ─── Plans ────────────────────────────────────────────────────────────────
 *
 * Section 6. `subscription_plans` is `app_readonly` — any signed-in member can
 * read it, nobody writes it from a client — so the prices a member sees come
 * from the CMS rather than from a constant in a screen.
 *
 * **The stored price is a placeholder.** `ProductDetails.getFormattedPrice()`
 * from Play Billing is localized, reflects regional pricing, and is the amount
 * actually charged; the moment it arrives it wins. The number here exists for
 * the admin's own reporting and for the instant before Play answers.
 *
 * Prices are whole pesos. `299` means ₱299 — there are no centavos.
 */

export type SubscriptionPlan = {
  id: string
  name: string
  code: string | null
  description: string
  /** What you hand Play Billing. Uniquely indexed, so it maps to one plan. */
  googleProductId: string
  googleBasePlanId: string | null
  /** Whole units. Display with `formattedPrice`, not raw. */
  price: number
  currency: string
  /** The stored price, formatted. Superseded by Play's own string. */
  formattedPrice: string
  durationDays: number
  isRecurring: boolean
  features: string[]
  isPopular: boolean
  order: number
}

export function toSubscriptionPlan(
  row: SubscriptionPlanDocument
): SubscriptionPlan {
  const price = row.price ?? 0
  const currency = row.currency?.trim() || "PHP"

  return {
    id: row.$id,
    name: row.name ?? "Membership",
    code: row.code?.trim() || null,
    description: row.description?.trim() ?? "",
    googleProductId: row.googleProductId,
    googleBasePlanId: row.googleBasePlanId?.trim() || null,
    price,
    currency,
    formattedPrice: formatMoney(price, currency),
    durationDays: row.durationDays ?? 30,
    isRecurring: row.isRecurring !== false,
    features: Array.isArray(row.features) ? row.features.filter(Boolean) : [],
    isPopular: row.isPopular === true,
    order: row.order ?? 1,
  }
}

/** Active plans, in the order the CMS put them. Backed by `idx_plan_active_order`. */
export async function listSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  assertContentConfigured()

  const rows = await listAll(
    "subscription_plans",
    [Query.equal("isActive", true), Query.orderAsc("order")],
    { label: "subscription plans" }
  )

  return rows.map(toSubscriptionPlan)
}

/**
 * "per month", "per year", "one time" — from `durationDays`.
 *
 * Approximate on purpose: a 30-day plan and a 31-day plan are both "monthly"
 * to a member, and the exact period is Play's to state at the point of charge.
 */
export function describeBillingPeriod(plan: SubscriptionPlan) {
  if (!plan.isRecurring) {
    return "one time"
  }

  if (plan.durationDays >= 360) {
    return "per year"
  }

  if (plan.durationDays >= 85) {
    return "per quarter"
  }

  if (plan.durationDays >= 28) {
    return "per month"
  }

  return `every ${plan.durationDays} days`
}

/**
 * What one month of this plan costs, for a "₱25/month billed yearly" line.
 *
 * Returns null for a one-off plan and for anything shorter than a month, where
 * a monthly equivalent would be a number nobody is ever charged.
 */
export function getMonthlyEquivalent(plan: SubscriptionPlan) {
  if (!plan.isRecurring || plan.durationDays < 28) {
    return null
  }

  const months = plan.durationDays / 30

  return months <= 1
    ? null
    : formatMoney(Math.round(plan.price / months), plan.currency)
}

/**
 * The saving against the cheapest monthly plan, as a percentage.
 *
 * Computed from what the CMS actually charges rather than assumed. The old
 * screen hardcoded "20% off", which stopped being true the first time somebody
 * changed a price in the dashboard — and nobody would have noticed.
 */
export function getYearlySavingPercent(
  plan: SubscriptionPlan,
  plans: SubscriptionPlan[]
) {
  if (!plan.isRecurring || plan.durationDays < 360) {
    return null
  }

  const monthly = plans
    .filter((other) => other.isRecurring && other.durationDays < 40)
    .sort((left, right) => left.price - right.price)[0]

  if (!monthly || monthly.price <= 0) {
    return null
  }

  const yearAtMonthlyRate = monthly.price * 12
  const saving = yearAtMonthlyRate - plan.price

  return saving > 0 ? Math.round((saving / yearAtMonthlyRate) * 100) : null
}
