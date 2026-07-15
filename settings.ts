import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONFIG_DIR_NAME,
  getAgentDir,
  MAIN_CONFIG_FILENAMES,
} from "@earendil-works/pi-utils";
import { YAML } from "bun";

export type ModeColorSettings = {
  insert?: string;
  normal?: string;
  ex?: string;
};

export type ModeChangeSettings = {
  insert?: string;
  normal?: string;
};

export type PiVimSettings = {
  clipboardMirror?: unknown;
  modeColors?: ModeColorSettings;
  modeChange?: ModeChangeSettings;
  syncBorderColorWithMode?: boolean;
};

const M = Symbol(),
  C = ["insert", "normal", "ex"] as const,
  MC = ["insert", "normal"] as const,
  T = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const rec = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

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

function modeChange(v: unknown): ModeChangeSettings | undefined {
  if (!rec(v)) return;
  const r: ModeChangeSettings = {};
  for (const k of MC) {
    const x = v[k];
    if (typeof x !== "string") continue;
    const t = x.trim();
    if (t.length > 0) r[k] = t;
  }
  return Object.keys(r)[0] ? r : undefined;
}

export function readPiVimClipboardMirrorSetting(g: unknown, p: unknown) {
  let v = get(p, "clipboardMirror");
  if (v !== M) return v;
  v = get(g, "clipboardMirror");
  return v === M ? undefined : v;
}

export function readPiVimModeColors(g: unknown, p: unknown) {
  const v = get(p, "modeColors");
  // Project settings are a whole-setting override. If a project checks in an
  // invalid modeColors value, fall back to pi-vim defaults instead of leaking a
  // developer's global colors into that project.
  if (v !== M) return colors(v);
  const w = get(g, "modeColors");
  return colors(w);
}

export function readPiVimModeChange(g: unknown, p: unknown) {
  void p;
  // modeChange executes a shell command, so only the user-global settings file
  // is trusted. Project settings may be checked into a repo; treating them as
  // executable hook config would let a checkout run arbitrary commands when the
  // editor changes mode.
  const v = get(g, "modeChange");
  return modeChange(v);
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

function readConfigFile(filePath: string): Record<string, unknown> {
  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return {};
  }
  if (filePath.endsWith(".json")) {
    try {
      const parsed = JSON.parse(content);
      return typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  try {
    const parsed = YAML.parse(content);
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function disk(cwd: string): PiVimSettings {
  const agentDir = getAgentDir();
  let g: Record<string, unknown> = {};
  for (const filename of MAIN_CONFIG_FILENAMES) {
    g = { ...g, ...readConfigFile(join(agentDir, filename)) };
  }
  const projectDir = join(cwd, CONFIG_DIR_NAME);
  const p: Record<string, unknown> = {
    ...readConfigFile(join(projectDir, "settings.json")),
    ...readConfigFile(join(projectDir, "config.yml")),
    ...readConfigFile(join(projectDir, "config.yaml")),
  };
  return {
    clipboardMirror: readPiVimClipboardMirrorSetting(g, p),
    modeColors: readPiVimModeColors(g, p),
    modeChange: readPiVimModeChange(g, p),
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
