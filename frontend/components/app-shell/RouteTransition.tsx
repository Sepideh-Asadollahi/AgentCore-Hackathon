"use client";

/**
 * Route enter/exit motion for workspace pages.
 *
 * Architecture (do not regress):
 * - Mount ONLY inside AppShell main column — never wrap {children} again in app/(app)/layout.tsx.
 * - Do not nest AnimatePresence / motion wrappers around page content elsewhere.
 * - Avoid initial opacity: 0 on page chrome; failed or stacked animations left the main area invisible
 *   while the sidebar/header still rendered (see frontend/docs/ui-shell-layout.md).
 */

import {usePathname} from "next/navigation";
import {AnimatePresence, motion} from "motion/react";
import {usePrefersReducedMotion} from "@/lib/use-prefers-reduced-motion";

export function RouteTransition({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{y: 8}}
        animate={{y: 0}}
        exit={{y: -6}}
        transition={{duration: 0.18, ease: "easeOut"}}
        className="min-h-0 w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
