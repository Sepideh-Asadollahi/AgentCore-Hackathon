"use client";

import {useEffect, useRef, useState} from "react";
import {beatById, beatFromSignals, CINEMATIC_BEATS, type CinematicBeatId} from "./cinematic-beats";

/** Beats cycled while the live API call is in flight (server runs synchronously). */
export const LIVE_RUN_BEAT_CYCLE: CinematicBeatId[] = [
  "request",
  "routing",
  "dialogue",
  "conflict",
  "approval",
  "frontend-handoff",
];

export function useCinematicPlayback(input: {
  reducedMotion: boolean;
  autoPlay: boolean;
  busy: boolean;
  hasRun: boolean;
  runEpoch: string;
  ticketCount: number;
  messageCount: number;
  conflictCount: number;
  awaitingApproval: boolean;
  completed: boolean;
  hasFrontendHandoff: boolean;
}) {
  const [manualBeat, setManualBeat] = useState<CinematicBeatId | null>(null);
  const [liveCycleIndex, setLiveCycleIndex] = useState(0);
  const [autoPlayIndex, setAutoPlayIndex] = useState(0);
  const autoPlayStartedForEpoch = useRef("");

  const signalBeat = beatFromSignals({
    hasRun: input.hasRun,
    ticketCount: input.ticketCount,
    messageCount: input.messageCount,
    conflictCount: input.conflictCount,
    awaitingApproval: input.awaitingApproval,
    completed: input.completed,
    hasFrontendHandoff: input.hasFrontendHandoff,
  });

  useEffect(() => {
    if (!input.busy) {
      setLiveCycleIndex(0);
      return;
    }
    if (input.reducedMotion) return;
    const interval = window.setInterval(() => {
      setLiveCycleIndex(prev => (prev + 1) % LIVE_RUN_BEAT_CYCLE.length);
    }, 1100);
    return () => window.clearInterval(interval);
  }, [input.busy, input.reducedMotion]);

  useEffect(() => {
    if (!input.autoPlay || !input.hasRun || input.busy || input.reducedMotion) return;
    if (autoPlayStartedForEpoch.current !== input.runEpoch) {
      autoPlayStartedForEpoch.current = input.runEpoch;
      setAutoPlayIndex(0);
    }
    const interval = window.setInterval(() => {
      setAutoPlayIndex(prev => Math.min(prev + 1, CINEMATIC_BEATS.length - 1));
    }, 2800);
    return () => window.clearInterval(interval);
  }, [input.autoPlay, input.hasRun, input.busy, input.reducedMotion, input.runEpoch]);

  useEffect(() => {
    if (!manualBeat || input.busy) return;
    const signalIndex = beatById(signalBeat).index;
    const manualIndex = beatById(manualBeat).index;
    if (input.autoPlay && manualIndex < autoPlayIndex) return;
    if (signalIndex > manualIndex) setManualBeat(null);
  }, [signalBeat, manualBeat, input.busy, input.autoPlay, autoPlayIndex]);

  let activeBeatId: CinematicBeatId;
  if (input.busy) {
    activeBeatId = LIVE_RUN_BEAT_CYCLE[liveCycleIndex] ?? "routing";
  } else if (manualBeat) {
    activeBeatId = manualBeat;
  } else if (input.autoPlay && input.hasRun) {
    activeBeatId = CINEMATIC_BEATS[autoPlayIndex]?.id ?? signalBeat;
  } else {
    activeBeatId = signalBeat;
  }

  const beat = beatById(activeBeatId);

  return {
    beat,
    activeBeatId,
    setManualBeat,
    advanceBeat: () => {
      const next = CINEMATIC_BEATS[Math.min(beat.index + 1, CINEMATIC_BEATS.length - 1)];
      setManualBeat(next.id);
    },
    retreatBeat: () => {
      const prev = CINEMATIC_BEATS[Math.max(beat.index - 1, 0)];
      setManualBeat(prev.id);
    },
    resetPlayback: () => {
      setManualBeat(null);
      setAutoPlayIndex(0);
      setLiveCycleIndex(0);
      autoPlayStartedForEpoch.current = "";
    },
  };
}
