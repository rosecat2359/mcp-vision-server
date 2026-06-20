import type { Variants, Transition } from "framer-motion";

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.99 },
};

export const pageTransitionConfig: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
};

export const cardReveal: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, type: "spring", stiffness: 300, damping: 24 },
  }),
};

export const modalSpring: Variants = {
  initial: { opacity: 0, scale: 0.92, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
};

export const modalSpringConfig: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
};

export const hoverLift = {
  scale: 1.02,
  y: -2,
  transition: { type: "spring" as const, stiffness: 600 },
};

export const statusPulse = {
  animate: { scale: [1, 1.4, 1], opacity: [1, 0.4, 1] },
  transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
};
