/**
 * Motion Button Component (v2.8)
 * 
 * Enhanced button with tactile feedback using framer-motion.
 * Wraps native button with scale animation on tap.
 */

import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

interface MotionButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  /** Button content */
  children: ReactNode;
  /** Disable tap animation */
  disableTap?: boolean;
}

/**
 * Motion Button with scale feedback on tap
 */
export function MotionButton({ 
  children, 
  disableTap = false,
  ...props 
}: MotionButtonProps) {
  if (disableTap) {
    return <button {...(props as any)}>{children}</button>;
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

