"use client";

import { motion } from "framer-motion";

// Transição suave a cada navegação. Animamos só a opacidade para não criar
// um "containing block" de transform que quebraria o fundo fixo das páginas.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
