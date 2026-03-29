// components/Avatar.tsx
"use client";

/**
 * Circular avatar with initials, styled like iOS Wallet contact icons.
 * Color is deterministically picked from a hash of the name.
 */

const PALETTE = [
  "#FF6B6B", // coral
  "#5B8DEF", // blue
  "#FF9F43", // orange
  "#A55EEA", // purple
  "#26DE81", // green
  "#FC5C65", // red-pink
  "#45AAF2", // sky blue
  "#FD9644", // tangerine
  "#2BCBBA", // teal
  "#D980FA", // lavender
  "#778CA3", // slate
  "#4B7BEC", // royal blue
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";

  const first = parts[0][0]?.toUpperCase() ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0]?.toUpperCase() ?? "" : "";

  return first + last || first;
}

type AvatarProps = {
  name: string;
  size?: number;
};

export function Avatar({ name, size = 40 }: AvatarProps) {
  const initials = getInitials(name);
  const bg = PALETTE[hashName(name) % PALETTE.length];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: "#fff",
          fontSize: size * 0.4,
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: -0.3,
        }}
      >
        {initials}
      </span>
    </div>
  );
}
