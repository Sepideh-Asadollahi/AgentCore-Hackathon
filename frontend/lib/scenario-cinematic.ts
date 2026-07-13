import type {CinematicBeatId} from "./cinematic-beats";
import type {Scenario} from "./api";

const DOMAIN_LABELS: Record<string, string> = {
  revenue_and_billing: "Revenue & billing",
  security_and_identity: "Security & identity",
  payments_and_reliability: "Payments & reliability",
  software_engineering_api: "Software engineering / API",
  human_resources: "Human resources",
  privacy_and_compliance: "Privacy & compliance",
  human_resources_and_security: "HR & security",
};

export function domainLabel(domain: string): string {
  return DOMAIN_LABELS[domain] ?? domain.replaceAll("_", " ");
}

/** Scenario-specific copy for the “request” beat (others use shared orchestration narration). */
export function scenarioBeatNarration(scenario: Scenario | null, beatId: CinematicBeatId): string | null {
  if (!scenario || beatId !== "request") return null;
  const byId: Record<string, string> = {
    "pricing-refactor":
      "A checkout tax refactor reads like cleanup work. Evidence may hide revenue risk if base_price changes before tax is applied.",
    "password-migration":
      "Replacing SHA256 with Argon2 is standard hardening—unless legacy users lose access when verification is cut over too early.",
    "payment-memory":
      "Fixing PayPal timeout retries is urgent, but stale memory and missing idempotency keys have caused duplicate charges before.",
    "checkout-api-refactor":
      "Refactoring the checkout handler looks internal—unless the JSON response drops taxIncluded and breaks mobile clients.",
    "hr-compensation-export":
      "A manager CSV export for annual reviews can accidentally ship salary, bonus, and national_id without HR/Legal gates.",
    "gdpr-erasure-automation":
      "Automating GDPR erasure on ticket close must not hard-delete invoices the finance retention policy still requires.",
    "vendor-access-offboarding":
      "HR may mark a contractor terminated while SSO removal waits in a separate ticket—Security policy demands four-hour revocation.",
  };
  return byId[scenario.scenario_id] ?? `Domain ${domainLabel(scenario.domain)}: ${scenario.default_request.slice(0, 160)}…`;
}

export function scenarioBeatCaption(scenario: Scenario | null): string {
  if (!scenario) return "Demo scenario";
  return `${domainLabel(scenario.domain)} · ${scenario.scenario_id}`;
}
