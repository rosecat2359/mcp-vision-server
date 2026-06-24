// 设计 tokens — 中文技术风 / 浅底 / 蓝绿强调 / 克制
// 全部 OKLCH。L=亮度 0-1, C=色度, H=色相 0-360。
// 色相带:底色与中性偏 220(微蓝灰),强调色偏 200(青蓝),状态色各自语义。

export const tokens = {
  color: {
    // 底色 —— 近白微蓝灰，非纯白，减少刺眼
    canvas: "oklch(0.985 0.004 240)",      // 页面底
    surface: "oklch(1 0 0)",                // 卡片/面板白
    surfaceSunken: "oklch(0.972 0.005 240)", // 次级面板/表头/输入底
    surfaceRaised: "oklch(0.995 0.002 240)", // 悬浮态

    // 墨色文字 ramp
    ink: "oklch(0.28 0.02 250)",            // 正文主色（≥4.5:1）
    inkStrong: "oklch(0.18 0.02 250)",      // 标题
    inkMuted: "oklch(0.52 0.015 250)",      // 次要文字（≥4.5:1 on surface）
    inkFaint: "oklch(0.68 0.01 250)",       // 占位/极次要

    // 强调色 —— 青蓝（蓝绿之间），用于主操作/选中/链接
    accent: "oklch(0.55 0.12 210)",         // 主强调
    accentHover: "oklch(0.48 0.13 210)",    // 悬停加深
    accentActive: "oklch(0.42 0.14 210)",   // 按下
    accentSoft: "oklch(0.95 0.03 210)",     // 选中底/淡标记
    accentOn: "oklch(0.99 0 0)",            // 强调色上的文字

    // 语义状态色
    success: "oklch(0.60 0.13 155)",        // 在线/成功
    successSoft: "oklch(0.95 0.04 155)",
    warning: "oklch(0.70 0.15 75)",         // 警告
    warningSoft: "oklch(0.95 0.05 75)",
    danger: "oklch(0.58 0.18 25)",          // 离线/错误
    dangerSoft: "oklch(0.95 0.04 25)",
    info: "oklch(0.60 0.12 240)",
    infoSoft: "oklch(0.95 0.03 240)",
  },
  border: {
    default: "oklch(0.90 0.008 250)",       // 默认细边框
    strong: "oklch(0.82 0.012 250)",        // 悬停/分隔
    focus: "oklch(0.55 0.12 210)",          // 聚焦环
  },
  radius: {
    sm: "4px",   // tag/badge
    md: "6px",   // 输入/按钮
    lg: "8px",   // 卡片/面板
    xl: "10px",  // 大容器
    pill: "9999px",
  },
  // 阴影：克制，仅一层细微投影，不与边框叠加
  shadow: {
    panel: "0 1px 2px oklch(0.28 0.02 250 / 0.04)",
    overlay: "0 4px 16px oklch(0.28 0.02 250 / 0.08)",
  },
  duration: {
    fast: "120ms",
    base: "180ms",
  },
  ease: "cubic-bezier(0.22, 1, 0.36, 1)", // ease-out-quart
} as const;
