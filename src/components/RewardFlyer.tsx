import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';

interface FlyerProps {
  id: number;
  type: 'tp' | 'gem';
  startX: number;
  startY: number;
  onComplete: (id: number) => void;
}

export function RewardFlyer({ id, type, startX, startY, onComplete }: FlyerProps) {
  // Target: Top-right area where your Header stats usually sit
  const endX = window.innerWidth * 0.8; 
  const endY = 40; 

  return createPortal(
    <motion.div
      initial={{ x: startX, y: startY, opacity: 0, scale: 0.5 }}
      animate={{ 
        x: endX, 
        y: endY, 
        opacity: [0, 1, 1, 0], // Fade in, stay visible, fade out at the end
        scale: [0.5, 1.5, 1, 0.5], // Pop up, normalize, shrink into the header
      }}
      transition={{ 
        duration: 1.2, 
        ease: "easeOut",
        times: [0, 0.2, 0.8, 1] 
      }}
      onAnimationComplete={() => onComplete(id)}
      className="fixed top-0 left-0 z-9999 pointer-events-none text-4xl select-none filter drop-shadow-lg"
    >
      {type === 'gem' ? '💎' : '⏳'}
    </motion.div>,
    document.body
  );
}