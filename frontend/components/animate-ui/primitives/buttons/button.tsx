'use client';

import * as React from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';

import { Slot, type WithAsChild } from '@/components/animate-ui/primitives/animate/slot';

type ButtonProps = WithAsChild<
  HTMLMotionProps<'button'> & {
    hoverScale?: number;
    tapScale?: number;
  }
>;

function Button({
  hoverScale = 1.05,
  tapScale = 0.95,
  asChild = false,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot whileTap={{ scale: tapScale }} whileHover={{ scale: hoverScale }} {...props} />
    );
  }

  // ponytail: native <button> — motion.button dropped React onClick handlers in this Next/React stack
  return <button type="button" {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)} />;
}

export { Button, type ButtonProps };
