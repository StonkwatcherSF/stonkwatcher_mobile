
export const COLORS = {
  // Brand colors
  stonkBlue: "#22396F",
  stonkLightB: "#D3D7E2",
  stonkDarkB: "#131F3D",
  stonkDarkestB: "#070B15",

  stonkGreen: "#BBDC12",
  stonkLightG: "#F1F8D0",
  stonkDarkG: "#242A03",
  stonkDarkestG: "#131602",
  stonkAccent: "#499A13",

  // Neutral colors
  white: "#FFFFFF",
  grey: "#C0C0C0",
  shark: "#969595",
  charcoal: "#585757",
  black: "#101010",

  // Utility colors
  buy: "#00D492",
  buyBorder: "#E6FFF6",
  buyBackground: "#002D1F",

  sell: "#FF5945",
  sellBorder: "#FFEBE7",
  sellBackground: "#33100B",
} as const;

export const FONTS = {
  regular: "GoogleSansFlex",
} as const;

export const GRADIENTS = {
  tokens: [
    COLORS.black,
    COLORS.stonkDarkestG,
  ] as const,
};
