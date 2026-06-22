"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { CSSProperties } from "react";
import { TYPE_COLORS, TYPE_LABELS_PT, TYPE_ORDER, typeIconUrl } from "@/lib/typeMeta";

export default function TypeOrbGrid() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
      className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-6 md:grid-cols-9"
    >
      {TYPE_ORDER.map((t) => {
        const color = TYPE_COLORS[t];
        return (
          <motion.div
            key={t}
            variants={{
              hidden: { opacity: 0, y: 16, scale: 0.8 },
              visible: { opacity: 1, y: 0, scale: 1 },
            }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="group flex flex-col items-center gap-1.5"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 transition-transform duration-200 group-hover:scale-110 sm:h-16 sm:w-16"
              style={
                {
                  background: `radial-gradient(circle at 50% 35%, ${color}, ${color}aa)`,
                  boxShadow: `0 6px 22px -6px ${color}`,
                  "--accent": color,
                } as CSSProperties
              }
            >
              <Image
                src={typeIconUrl(t)}
                alt={TYPE_LABELS_PT[t]}
                width={34}
                height={34}
                className="drop-shadow"
                unoptimized
              />
            </div>
            <span className="text-xs font-semibold text-white/85">
              {TYPE_LABELS_PT[t]}
            </span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
