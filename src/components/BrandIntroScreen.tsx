import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface BrandIntroScreenProps {
  onComplete: () => void;
}

const INTRO_TEXT = 'BRAND LENS – BEHIND THE ANALYSIS';
const SUB_SENTENCE_WORDS = [
  '',
  '',
  '',
  '',
  '',
  '',
] as const;

export const BrandIntroScreen: React.FC<BrandIntroScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'fade-in' | 'zoom-out'>('fade-in');

  useEffect(() => {
    const zoomTimer = setTimeout(() => {
      setPhase('zoom-out');
    }, 1850);

    const finishTimer = setTimeout(() => {
      onComplete();
    }, 2650);

    return () => {
      clearTimeout(zoomTimer);
      clearTimeout(finishTimer);
    };
  }, [onComplete]);

  const characters = Array.from(INTRO_TEXT);

  return (
    <motion.div
      role="region"
      aria-label="BrandLens Intro Animation"
      onClick={onComplete}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 bg-black text-white flex flex-col items-center justify-center px-6 select-none overflow-hidden cursor-pointer"
      style={{ perspective: '1200px' }}
    >
      {/* 3D Depth & Zoom-Out Wrapper */}
      <motion.div
        animate={
          phase === 'zoom-out'
            ? {
                scale: 0.58,
                opacity: 0,
                filter: 'blur(8px)',
                y: -8,
              }
            : {
                scale: 1,
                opacity: 1,
                filter: 'blur(0px)',
                y: 0,
              }
        }
        transition={{
          duration: 0.82,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="w-full max-w-[96vw] text-center space-y-5"
      >
        <div className="text-[11px] font-mono uppercase tracking-[0.35em] text-white/50">
          EXPLAINABLE BRAND STUDIO
        </div>

        {/* Letter-by-letter fade-in animation — strictly aligned on a single straight row */}
        <motion.h1
          aria-label={INTRO_TEXT}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.036,
                delayChildren: 0.08,
              },
            },
          }}
          className="text-[clamp(0.75rem,2.35vw,2.35rem)] font-bold tracking-[0.12em] text-white leading-none flex flex-nowrap items-center justify-center whitespace-nowrap"
        >
          {characters.map((char, index) => (
            <motion.span
              key={index}
              variants={{
                hidden: { opacity: 0, y: 6, filter: 'blur(4px)' },
                visible: {
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  transition: {
                    duration: 0.34,
                    ease: [0.16, 1, 0.3, 1],
                  },
                },
              }}
              className={
                char === ' '
                  ? 'inline-block w-[0.42em] shrink-0'
                  : 'inline-block shrink-0'
              }
            >
              {char}
            </motion.span>
          ))}
        </motion.h1>

        {/* Lightly displayed word-by-word sentence right above the loading line */}
        <motion.p
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.14,
                delayChildren: 0.45,
              },
            },
          }}
          className="text-xs sm:text-sm font-light tracking-[0.14em] text-white/55 flex flex-wrap items-center justify-center gap-x-2"
        >
          {SUB_SENTENCE_WORDS.map((word, idx) => (
            <motion.span
              key={idx}
              variants={{
                hidden: { opacity: 0, y: 8, filter: 'blur(4px)' },
                visible: {
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  transition: {
                    duration: 0.42,
                    ease: [0.16, 1, 0.3, 1],
                  },
                },
              }}
              className={idx >= 3 ? 'text-white/40' : 'text-white/65'}
            >
              {word}
            </motion.span>
          ))}
        </motion.p>

        {/* Minimal monochrome progress loading line placed below the word-by-word sentence */}
        <div className="w-48 h-[1.5px] bg-white/15 mx-auto overflow-hidden rounded-full mt-2">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.35, ease: 'easeInOut' }}
            className="h-full bg-white"
          />
        </div>
      </motion.div>
    </motion.div>
  );
};
