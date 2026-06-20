import type { EventType, Severity } from "@/lib/types";

export const C = {
  bg: "#0B0F14",
  panel: "#111823",
  panel2: "#0E141D",
  raised: "#16202C",
  border: "#1E2A38",
  borderSoft: "#172230",
  text: "#E6EDF3",
  muted: "#7E8C9C",
  faint: "#566372",
  accent: "#34E5D0",
} as const;

export const SEV: Record<Severity, { color: string; glow: string; label: string }> = {
  critical: { color: "#FF5160", glow: "rgba(255,81,96,.22)", label: "Critical" },
  high: { color: "#FF9F40", glow: "rgba(255,159,64,.20)", label: "High" },
  medium: { color: "#FFD23F", glow: "rgba(255,210,63,.18)", label: "Medium" },
  low: { color: "#4FB7FF", glow: "rgba(79,183,255,.18)", label: "Low" },
};

export const TYPE_META: Record<EventType, { label: string; dot: string; icon: string }> = {
  prompt: { label: "Prompt", dot: "#7E8C9C", icon: "›_" },
  response: { label: "AI response", dot: "#8C9CFF", icon: "✦" },
  code_change: { label: "Code change", dot: "#9AE6B4", icon: "±" },
  tool_call: { label: "Tool call", dot: "#FFB454", icon: "⌘" },
};

export const riskColor = (s: number) =>
  s >= 75 ? SEV.critical.color : s >= 50 ? SEV.high.color : s >= 25 ? SEV.medium.color : SEV.low.color;

export const riskBand = (s: number) =>
  s >= 75 ? "Critical" : s >= 50 ? "Elevated" : s >= 25 ? "Watch" : "Nominal";

export const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const hhmmss = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-GB", { hour12: false });
