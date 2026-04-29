import { SettingsManager } from "@mariozechner/pi-coding-agent";

const CLIPBOARD_MIRROR_POLICY_VALUES = ["all", "yank", "never"] as const;

export type ClipboardMirrorPolicy =
  (typeof CLIPBOARD_MIRROR_POLICY_VALUES)[number];
export type RegisterWriteSource = "mutation" | "yank";

export const DEFAULT_CLIPBOARD_MIRROR_POLICY: ClipboardMirrorPolicy = "all";

type ClipboardMirrorPolicyResult = {
  policy: ClipboardMirrorPolicy;
  warning?: string;
};

export type PiVimSettings = {
  clipboardMirror?: unknown;
};

type UnknownRecord = Record<string, unknown>;
type PiVimSettingsReader = (cwd: string) => PiVimSettings;

const EXPECTED_CLIPBOARD_MIRROR_POLICY_VALUES =
  CLIPBOARD_MIRROR_POLICY_VALUES.join(", ");

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function ownsProperty(value: UnknownRecord, property: string): boolean {
  return Object.hasOwn(value, property);
}

function isClipboardMirrorPolicy(value: string): value is ClipboardMirrorPolicy {
  return (CLIPBOARD_MIRROR_POLICY_VALUES as readonly string[]).includes(value);
}

function describeValueType(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}

function describeValue(value: unknown): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (value === null) {
    return "null";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "bigint") {
    return String(value);
  }

  if (typeof value === "symbol") {
    return String(value);
  }

  if (typeof value === "function") {
    return "[function]";
  }

  if (Array.isArray(value)) {
    return "[array]";
  }

  if (typeof value === "object") {
    return "[object]";
  }

  return "undefined";
}

function invalidClipboardMirrorPolicyWarning(value: unknown): string {
  return `Invalid piVim.clipboardMirror value ${describeValue(
    value,
  )} (type ${describeValueType(
    value,
  )}); expected one of: ${EXPECTED_CLIPBOARD_MIRROR_POLICY_VALUES}. Falling back to ${DEFAULT_CLIPBOARD_MIRROR_POLICY}.`;
}

function getPiVimSettings(settings: unknown): UnknownRecord | undefined {
  if (!isObject(settings)) {
    return undefined;
  }

  const piVim = settings.piVim;
  if (!isObject(piVim)) {
    return undefined;
  }

  return piVim;
}

export function resolveClipboardMirrorPolicy(
  value: unknown,
): ClipboardMirrorPolicyResult {
  if (value === undefined) {
    return { policy: DEFAULT_CLIPBOARD_MIRROR_POLICY };
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (isClipboardMirrorPolicy(normalized)) {
      return { policy: normalized };
    }
  }

  return {
    policy: DEFAULT_CLIPBOARD_MIRROR_POLICY,
    warning: invalidClipboardMirrorPolicyWarning(value),
  };
}

export function readPiVimClipboardMirrorSetting(
  globalSettings: unknown,
  projectSettings: unknown,
): unknown | undefined {
  const projectPiVim = getPiVimSettings(projectSettings);
  if (projectPiVim && ownsProperty(projectPiVim, "clipboardMirror")) {
    return projectPiVim.clipboardMirror;
  }

  const globalPiVim = getPiVimSettings(globalSettings);
  if (globalPiVim && ownsProperty(globalPiVim, "clipboardMirror")) {
    return globalPiVim.clipboardMirror;
  }

  return undefined;
}

function readPiVimSettingsFromDisk(cwd: string): PiVimSettings {
  const settingsManager = SettingsManager.create(cwd);
  const clipboardMirror = readPiVimClipboardMirrorSetting(
    settingsManager.getGlobalSettings(),
    settingsManager.getProjectSettings(),
  );

  return { clipboardMirror };
}

let piVimSettingsReader: PiVimSettingsReader = readPiVimSettingsFromDisk;

export function readPiVimSettings(cwd: string): PiVimSettings {
  return piVimSettingsReader(cwd);
}

export function setPiVimSettingsReaderForTests(
  reader: PiVimSettingsReader,
): () => void {
  const previousReader = piVimSettingsReader;
  piVimSettingsReader = reader;

  return () => {
    piVimSettingsReader = previousReader;
  };
}
