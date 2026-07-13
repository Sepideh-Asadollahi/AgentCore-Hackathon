"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import {api, OrgPolicyChallenge, OrgPolicyIntakeSession, Scenario} from "../lib/api";
import {defaultCandidateIds, firstPendingChallenge} from "../lib/org-policy-intake";

type Props = {
  scenario: Scenario | null;
  disabled?: boolean;
};

export function OrgPolicyIntakePanel({scenario, disabled}: Props) {
  const [narrative, setNarrative] = useState("");
  const [constraints, setConstraints] = useState("");
  const [session, setSession] = useState<OrgPolicyIntakeSession | null>(null);
  const [activePolicies, setActivePolicies] = useState<{evidence_id: string; policy_tag: string; title: string}[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const pendingChallenge = useMemo(() => firstPendingChallenge(session), [session]);

  const loadPolicies = useCallback(async () => {
    try {
      setActivePolicies(await api.listOrgPolicies());
    } catch {
      setActivePolicies([]);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  useEffect(() => {
    if (!scenario) return;
    setNarrative(
      `Our workflow for "${scenario.title}": ${scenario.governance_rules.join(" ")} ` +
        `We require policies ${scenario.required_policies.join(", ")} before merge.`,
    );
  }, [scenario?.scenario_id]);

  async function analyze() {
    if (!scenario) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api.analyzeOrgPolicyIntake(scenario.scenario_id, narrative, constraints);
      setSession(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  }

  async function resolveChallenge(challenge: OrgPolicyChallenge, optionId: string) {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      setSession(await api.resolveOrgPolicyChallenge(session.intake_session_id, challenge.challenge_id, optionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve challenge");
    } finally {
      setBusy(false);
    }
  }

  async function activateSelected() {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const adopted = defaultCandidateIds(session);
      const result = await api.activateOrgPolicyIntake(session.intake_session_id, adopted);
      setSession(result.intake_session);
      setMessage(`Activated ${result.activated_policies.length} org policy evidence item(s). Policy Guardian will retrieve them on the next run.`);
      await loadPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="org-policy-intake" aria-labelledby="org-policy-intake-heading">
      <h2 id="org-policy-intake-heading">Org policy intake (guided)</h2>
      <p className="hint">
        Describe your business process in plain language. The control plane proposes policy tags and challenges; after you resolve them,
        org policies become retrievable evidence for Policy Guardian (LLM-managed summaries, human activation).
      </p>
      <label>
        Process narrative
        <textarea
          value={narrative}
          onChange={e => setNarrative(e.target.value)}
          rows={4}
          disabled={disabled || busy}
        />
      </label>
      <label>
        Constraints (optional)
        <textarea
          value={constraints}
          onChange={e => setConstraints(e.target.value)}
          rows={2}
          disabled={disabled || busy}
          placeholder="e.g. no cross-project memory, English docs only"
        />
      </label>
      <div className="row">
        <button type="button" onClick={analyze} disabled={disabled || busy || !scenario || narrative.length < 20}>
          Analyze workflow
        </button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {message && <p className="success">{message}</p>}
      {session && (
        <div className="intake-results">
          <h3>Requirements digest</h3>
          <ul>{session.requirements_digest.map(line => <li key={line}>{line}</li>)}</ul>
          <h3>Candidate policies</h3>
          <ul>
            {session.candidate_policies.map(c => (
              <li key={c.candidate_id}>
                <strong>{c.title}</strong> — <code>{c.policy_tag}</code> ({c.source}, risk {c.risk})
              </li>
            ))}
          </ul>
          {pendingChallenge ? (
            <div className="challenge-card">
              <h3>Challenge ({pendingChallenge.type})</h3>
              <p>{pendingChallenge.summary}</p>
              <div className="challenge-options">
                {pendingChallenge.options.map(opt => (
                  <button
                    key={opt.option_id}
                    type="button"
                    disabled={busy}
                    onClick={() => resolveChallenge(pendingChallenge, opt.option_id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button type="button" className="primary" disabled={busy} onClick={activateSelected}>
              Activate adopted policies
            </button>
          )}
        </div>
      )}
      {activePolicies.length > 0 && (
        <div className="active-org-policies">
          <h3>Active org policies</h3>
          <ul>
            {activePolicies.map(p => (
              <li key={p.evidence_id}>
                <code>{p.evidence_id}</code> — {p.title} (<code>{p.policy_tag}</code>)
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
