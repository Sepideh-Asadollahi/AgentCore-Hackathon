"use client";

import {useEffect, useId, useRef, useState} from "react";
import {cn} from "@/lib/utils";

type Props = {
  chart: string;
  className?: string;
  /** Highlight node index (0-based), synced with story selection. */
  activeStepIndex?: number | null;
};

let mermaidInit = false;

export function AgentInteractionMermaidChart({chart, className, activeStepIndex}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/:/g, "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    async function render() {
      const el = containerRef.current;
      if (!el) return;
      try {
        const mermaid = (await import("mermaid")).default;
        if (!mermaidInit) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "dark",
            securityLevel: "loose",
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true,
              curve: "basis",
              padding: 12,
              nodeSpacing: 36,
              rankSpacing: 48,
            },
          });
          mermaidInit = true;
        }
        const {svg} = await mermaid.render(`agent-flow-${reactId}-${Date.now()}`, chart);
        if (cancelled) return;
        el.innerHTML = svg;
        if (activeStepIndex != null && activeStepIndex >= 0) {
          const node = el.querySelector(`#m${activeStepIndex}, [id*="m${activeStepIndex}"]`);
          node?.classList.add("opacity-100");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Mermaid render failed");
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [chart, reactId, activeStepIndex]);

  if (error) {
    return (
      <pre className={cn("overflow-x-auto rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs", className)}>
        {error}
        {"\n\n"}
        {chart}
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "mermaid-agent-flow w-full overflow-x-auto [&_svg]:mx-auto [&_svg]:max-w-full [&_svg]:h-auto",
        className,
      )}
      aria-label="Agent interaction flow diagram"
    />
  );
}
