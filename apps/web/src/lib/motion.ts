// 克制动效 —— 仅状态过渡，无 spring / 无入场编排 / 无心跳
// 时长 120-180ms，ease-out-quart。产品 UI 中动效传达状态，不做装饰。

import type { Variants, Transition } from "framer-motion";

// 统一过渡：快、稳、不弹
const easeOut: Transition = { duration: 0.16, ease: [0.22, 1, 0.36, 1] };

// 轻量入场 —— 仅 opacity，不位移不缩放（避免编排感）
export const pageTransition: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: easeOut },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export const pageTransitionConfig: Transition = easeOut;

// 列表项入场 —— 极轻 opacity，可选轻微 y，无错峰编排（避免 reflex）
export const cardReveal: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: easeOut,
  },
};

// 弹窗 —— 尺寸微变 + 透明度，无弹簧
export const modalSpring: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: easeOut },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.1 } },
};

export const modalSpringConfig: Transition = easeOut;

// 悬停 —— 删除 scale/y 浮起。产品 UI 不需要装饰性悬浮。
// 保留导出名以兼容现有引用，但置为 no-op。
export const hoverLift = {};

// 状态点 —— 删除持续心跳。状态用颜色表达，不用永动动画。
export const statusPulse = {};
