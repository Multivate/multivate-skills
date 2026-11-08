const PALETTE = [
  { from: "#14A88A", to: "#08766D", shadow: "rgba(8, 118, 109, 0.3)" },
  { from: "#F4A340", to: "#D84E79", shadow: "rgba(216, 78, 121, 0.3)" },
  { from: "#F16B52", to: "#CD405D", shadow: "rgba(205, 64, 93, 0.3)" },
  { from: "#9167F4", to: "#5540C8", shadow: "rgba(85, 64, 200, 0.3)" },
  { from: "#2871E8", to: "#122B69", shadow: "rgba(18, 43, 105, 0.3)" },
  { from: "#F4A340", to: "#D84E79", shadow: "rgba(216, 78, 121, 0.3)" },
  { from: "#E85C9A", to: "#A72F75", shadow: "rgba(167, 47, 117, 0.3)" },
  { from: "#45A86B", to: "#286543", shadow: "rgba(40, 101, 67, 0.3)" },
];

export function personAvatarStyle(name: string) {
  let index = 0;
  for (const char of name) index = (index + char.charCodeAt(0)) % PALETTE.length;
  const { from, to, shadow } = PALETTE[index];
  return {
    background: `linear-gradient(145deg, ${from}, ${to})`,
    boxShadow: `0 2px 7px ${shadow}`,
  };
}

export function avatarFontSize(className: string) {
  const heightClass = className.match(/(?:^|\s)h-(\d+(?:\.\d+)?)(?:\s|$)/);
  const heightPx = Number(heightClass?.[1] ?? 9) * 4;
  return `${heightPx * 0.42}px`;
}
