"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import {Button} from "@/components/animate-ui/components/buttons/button";
import {api, OrgPolicyChallenge, OrgPolicyIntakeSession, Scenario} from "../lib/api";
import {defaultCandidateIds, firstPendingChallenge} from "../lib/org-policy-intake";
import {
  panelClass,
  wsAlertError,
  wsEmpty,
  wsFieldControl,
  wsFieldLabel,
  wsMeta,
  wsStep,
} from "@/lib/workspace-ui";

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
    <section className={panelClass()} aria-labelledby="org-policy-intake-heading">
      <div className={wsStep}>Policy intake</div>
      <h2 id="org-policy-intake-heading" className="text-base font-semibold text-foreground">
        Org policy intake (guided)
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Describe your business process in plain language. The control plane proposes policy tags and challenges; after you resolve them,
        org policies become retrievable evidence for Policy Guardian.
      </p>
      <label className={wsFieldLabel}>
        Process narrative
        <textarea
          className={wsFieldControl}
          value={narrative}
          onChange={e => setNarrative(e.target.value)}
          rows={4}
          disabled={disabled || busy}
        />
      </label>
      <label className={wsFieldLabel}>
        Constraints (optional)
        <textarea
          className={wsFieldControl}
          value={constraints}
          onChange={e => setConstraints(e.target.value)}
          rows={2}
          disabled={disabled || busy}
          placeholder="e.g. no cross-project memory, English docs only"
        />
      </label>
      <Button onClick={analyze} disabled={disabled || busy || !scenario || narrative.length < 20} className="mt-2">
        Analyze workflow
      </Button>
      {error && (
        <p className={`${wsAlertError} mt-3`} role="alert">
          {error}
        </p>
      )}
      {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}
      {session && (
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <h3 className="font-medium text-foreground">Requirements digest</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              {session.requirements_digest.map(line => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-foreground">Candidate policies</h3>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              {session.candidate_policies.map(c => (
                <li key={c.candidate_id}>
                  <strong className="text-foreground">{c.title}</strong> — <code>{c.policy_tag}</code> ({c.source}, risk {c.risk})
                </li>
              ))}
            </ul>
          </div>
          {pendingChallenge ? (
            <div className="rounded-lg border border-border bg-background p-3">
              <h3 className="font-medium">Challenge ({pendingChallenge.type})</h3>
              <p className="mt-1 text-muted-foreground">{pendingChallenge.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingChallenge.options.map(opt => (
                  <Button
                    key={opt.option_id}
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => resolveChallenge(pendingChallenge, opt.option_id)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <Button disabled={busy} onClick={activateSelected}>
              Activate adopted policies
            </Button>
          )}
        </div>
      )}
      {activePolicies.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-foreground">Active org policies</h3>
          <ul className={`${wsMeta} mt-2 space-y-1`}>
            {activePolicies.map(p => (
              <li key={p.evidence_id}>
                <code>{p.evidence_id}</code> — {p.title} (<code>{p.policy_tag}</code>)
              </li>
            ))}
          </ul>
        </div>
      )}
      {!session && !error && narrative.length < 20 && (
        <div className={`${wsEmpty} mt-4`}>Enter at least 20 characters to analyze.</div>
      )}
    </section>
  );
}
