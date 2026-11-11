'use client';

import { motion, useReducedMotion } from 'motion/react';

export const Reveal = ({ children }: { children: React.ReactNode }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div className="reveal" initial={{ y: 4 }}
      animate={reduceMotion ? undefined : { y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
};
