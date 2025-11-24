/**
 * Page Transition Component (v2.8)
 * 
 * Wraps view content with smooth fade-in animation using framer-motion.
 */

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PageTransitionProps {
  /** Content to animate */
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  );
}

