import { SettingsManager } from "@mariozechner/pi-coding-agent";
export type ClipboardMirrorPolicy = "all" | "yank" | "never";
export type RegisterWriteSource = "mutation" | "yank";
export const DEFAULT_CLIPBOARD_MIRROR_POLICY: ClipboardMirrorPolicy = "all";
export type ModeColorSettings = {
  insert?: string;
  normal?: string;
  ex?: string;
};
export type PiVimSettings = {
  clipboardMirror?: unknown;
  modeColors?: ModeColorSettings;
  syncBorderColorWithMode?: boolean;
};
const D = DEFAULT_CLIPBOARD_MIRROR_POLICY,
  M = Symbol(),
  C = ["insert", "normal", "ex"] as const,
  T = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const rec = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
function fmt(v: unknown) {
  const type = v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
  try {
    return `${JSON.stringify(v) ?? type} (type ${type})`;
  } catch {
    return `(type ${type})`;
  }
}
function get(s: unknown, k: keyof PiVimSettings): unknown {
  if (!rec(s) || !Object.hasOwn(s, "piVim")) return M;
  const p = s.piVim;
  if (!rec(p)) return p;
  return Object.hasOwn(p, k) ? p[k] : M;
}
function colors(v: unknown) {
  if (!rec(v)) return;
  const r: ModeColorSettings = {};
  for (const k of C) {
    const x = v[k],
      t = typeof x === "string" ? x.trim() : "";
    if (T.test(t)) r[k] = t;
  }
  return Object.keys(r)[0] ? r : undefined;
}
export function resolveClipboardMirrorPolicy(value: unknown) {
  if (value === undefined) return { policy: D };
  const p = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (p === "all" || p === "yank" || p === "never")
    return { policy: p as ClipboardMirrorPolicy };
  return {
    policy: D,
    warning: `Invalid piVim.clipboardMirror ${fmt(value)}; expected all, yank, never.`,
  };
}
export function readPiVimClipboardMirrorSetting(g: unknown, p: unknown) {
  let v = get(p, "clipboardMirror");
  if (v !== M) return v;
  v = get(g, "clipboardMirror");
  return v === M ? undefined : v;
}
export function readPiVimModeColors(g: unknown, p: unknown) {
  const r = {
    ...colors(get(g, "modeColors")),
    ...colors(get(p, "modeColors")),
  };
  return Object.keys(r)[0] ? r : undefined;
}
export function readPiVimBooleanSetting(
  g: unknown,
  p: unknown,
  k: "syncBorderColorWithMode",
) {
  const v = get(p, k);
  if (v !== M) return typeof v === "boolean" ? v : undefined;
  const w = get(g, k);
  return typeof w === "boolean" ? w : undefined;
}
function disk(cwd: string): PiVimSettings {
  const s = SettingsManager.create(cwd),
    g = s.getGlobalSettings(),
    p = s.getProjectSettings();
  return {
    clipboardMirror: readPiVimClipboardMirrorSetting(g, p),
    modeColors: readPiVimModeColors(g, p),
    syncBorderColorWithMode: readPiVimBooleanSetting(
      g,
      p,
      "syncBorderColorWithMode",
    ),
  };
}
let reader = disk;
export function readPiVimSettings(cwd: string) {
  return reader(cwd);
}
export function setPiVimSettingsReaderForTests(next: typeof disk) {
  const prev = reader;
  reader = next;
  return () => {
    reader = prev;
  };
}
