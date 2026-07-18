import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface CheerEvent {
  id: string;
  type: "spark" | "coffee" | "applause" | "rocket";
  senderName: string;
}

interface Particle {
  id: string;
  emoji: string;
  x: number; // starting horizontal position percentage (0-100)
  size: number; // font size in px
  duration: number; // animation duration in seconds
  drift: number; // horizontal drift amount
}

interface CheerOverlaysProps {
  activeCheer: CheerEvent | null;
  onAnimationComplete: () => void;
}

const EMOJI_MAP = {
  spark: "⚡",
  coffee: "☕",
  applause: "🏆",
  rocket: "🚀",
};

export const CheerOverlays: React.FC<CheerOverlaysProps> = ({
  activeCheer,
  onAnimationComplete,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!activeCheer) return;

    const emoji = EMOJI_MAP[activeCheer.type] || "⭐";
    
    // Spawn 15 particles with randomized values
    const newParticles: Particle[] = Array.from({ length: 15 }).map((_, i) => ({
      id: `${activeCheer.id}-p-${i}`,
      emoji,
      x: 10 + Math.random() * 80, // Random start between 10% and 90% width
      size: 24 + Math.random() * 24, // Size between 24px and 48px
      duration: 2 + Math.random() * 2, // Duration between 2s and 4s
      drift: -50 + Math.random() * 100, // Drift left or right by up to 50px
    }));

    setParticles((prev) => [...prev, ...newParticles]);

    // Clean up particles after the longest animation completes
    const timer = setTimeout(() => {
      setParticles([]);
      onAnimationComplete();
    }, 4500);

    return () => clearTimeout(timer);
  }, [activeCheer, onAnimationComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: "100vh", x: `${p.x}vw`, scale: 0.5 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: "-10vh",
              x: `calc(${p.x}vw + ${p.drift}px)`,
              scale: [0.5, 1.2, 1, 0.8],
              rotate: [0, Math.random() > 0.5 ? 45 : -45],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: p.duration,
              ease: "easeOut",
            }}
            style={{
              position: "absolute",
              fontSize: `${p.size}px`,
              filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15))",
            }}
          >
            {p.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
