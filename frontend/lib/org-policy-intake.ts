import type {OrgPolicyChallenge, OrgPolicyIntakeSession} from "./api";

export function firstPendingChallenge(session: OrgPolicyIntakeSession | null): OrgPolicyChallenge | null {
  if (!session?.challenges?.length) return null;
  return session.challenges.find(challenge => !challenge.resolved) ?? null;
}

export function allChallengesResolved(session: OrgPolicyIntakeSession | null): boolean {
  if (!session?.challenges?.length) return true;
  return session.challenges.every(challenge => challenge.resolved);
}

export function defaultCandidateIds(session: OrgPolicyIntakeSession | null): string[] {
  if (!session?.candidate_policies?.length) return [];
  return session.candidate_policies.map(candidate => candidate.candidate_id);
}
