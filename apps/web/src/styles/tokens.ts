export const tokens = {
  colors: {
    primary: {
      50: "#EEF2FF",
      400: "#6366F1",
      600: "#4338CA",
      900: "#1E1B4B",
    },
    secondary: {
      50: "#F0FDFA",
      400: "#2DD4BF",
      600: "#0D9488",
    },
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#3B82F6",
  },
  border: {
    default: "rgba(99, 102, 241, 0.12)",
    strong: "rgba(99, 102, 241, 0.28)",
    focus: "rgba(99, 102, 241, 0.60)",
  },
  background: {
    page: "linear-gradient(135deg, #F8F7FF 0%, #F0F4FF 50%, #F4F0FF 100%)",
    surface: "rgba(255, 255, 255, 0.72)",
    card: "rgba(255, 255, 255, 0.88)",
    glass: "rgba(255, 255, 255, 0.60)",
  },
  glassmorphism: {
    backdropFilter: "blur(20px) saturate(180%)",
  },
} as const;
