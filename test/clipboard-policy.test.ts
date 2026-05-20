import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_CLIPBOARD_MIRROR_POLICY,
  readPiVimBooleanSetting,
  readPiVimClipboardMirrorSetting,
  readPiVimModeColors,
  resolveClipboardMirrorPolicy,
} from "../clipboard-policy.js";

describe("clipboard mirror policy resolver", () => {
  it("defaults missing clipboard mirror policy to all", () => {
    assert.deepEqual(resolveClipboardMirrorPolicy(undefined), {
      policy: DEFAULT_CLIPBOARD_MIRROR_POLICY,
    });
  });

  it("accepts all supported clipboard mirror policy values", () => {
    assert.deepEqual(resolveClipboardMirrorPolicy("all"), { policy: "all" });
    assert.deepEqual(resolveClipboardMirrorPolicy("yank"), { policy: "yank" });
    assert.deepEqual(resolveClipboardMirrorPolicy("never"), {
      policy: "never",
    });
  });

  it("normalizes clipboard mirror policy casing and whitespace", () => {
    assert.deepEqual(resolveClipboardMirrorPolicy("YANK"), { policy: "yank" });
    assert.deepEqual(resolveClipboardMirrorPolicy(" never "), {
      policy: "never",
    });
  });

  it("falls back to all and reports invalid clipboard mirror strings", () => {
    const result = resolveClipboardMirrorPolicy("delete");

    assert.equal(result.policy, "all");
    assert.match(result.warning ?? "", /delete/);
    assert.match(result.warning ?? "", /all, yank, never/);
  });

  it("escapes invalid clipboard mirror strings in warnings", () => {
    const result = resolveClipboardMirrorPolicy("delete\n\x1b[31m");

    assert.equal(result.policy, "all");
    assert.equal((result.warning ?? "").includes("\n"), false);
    assert.equal((result.warning ?? "").includes("\x1b"), false);
    assert.match(result.warning ?? "", /"delete\\n\\u001b\[31m"/);
  });

  it("falls back to all and reports non-string clipboard mirror values safely", () => {
    const result = resolveClipboardMirrorPolicy({ mode: "yank" });

    assert.equal(result.policy, "all");
    assert.match(result.warning ?? "", /object/);
    assert.match(result.warning ?? "", /all, yank, never/);
  });
});

describe("piVim mode color settings reader", () => {
  it("returns undefined when mode colors are missing", () => {
    assert.equal(readPiVimModeColors(undefined, undefined), undefined);
    assert.equal(readPiVimModeColors({ piVim: {} }, { piVim: {} }), undefined);
  });

  it("reads partial mode color settings", () => {
    assert.deepEqual(
      readPiVimModeColors(
        { piVim: { modeColors: { insert: " borderMuted " } } },
        {},
      ),
      { insert: "borderMuted" },
    );
  });

  it("reads all three mode color settings", () => {
    assert.deepEqual(
      readPiVimModeColors(
        {
          piVim: {
            modeColors: {
              insert: "muted",
              normal: "primary",
              ex: "warning",
            },
          },
        },
        {},
      ),
      { insert: "muted", normal: "primary", ex: "warning" },
    );
  });

  it("drops non-string mode color leaves", () => {
    assert.deepEqual(
      readPiVimModeColors(
        {
          piVim: { modeColors: { insert: "muted", normal: 42, ex: "warning" } },
        },
        {},
      ),
      { insert: "muted", ex: "warning" },
    );
  });

  it("drops malformed mode color tokens", () => {
    assert.deepEqual(
      readPiVimModeColors(
        {
          piVim: {
            modeColors: {
              insert: "red;evil",
              normal: "_bad",
              ex: "warn-ing_1",
            },
          },
        },
        {},
      ),
      { ex: "warn-ing_1" },
    );
  });

  it("merges project mode color settings over global per leaf", () => {
    assert.deepEqual(
      readPiVimModeColors(
        {
          piVim: {
            modeColors: {
              insert: "globalInsert",
              normal: "globalNormal",
              ex: "globalEx",
            },
          },
        },
        { piVim: { modeColors: { ex: "projectEx" } } },
      ),
      { insert: "globalInsert", normal: "globalNormal", ex: "projectEx" },
    );
  });
});

describe("piVim boolean settings reader", () => {
  it("returns undefined when boolean setting is missing", () => {
    assert.equal(
      readPiVimBooleanSetting(undefined, undefined, "syncBorderColorWithMode"),
      undefined,
    );
    assert.equal(
      readPiVimBooleanSetting(
        { piVim: {} },
        { piVim: {} },
        "syncBorderColorWithMode",
      ),
      undefined,
    );
  });

  it("reads true and false boolean settings", () => {
    assert.equal(
      readPiVimBooleanSetting(
        { piVim: { syncBorderColorWithMode: true } },
        {},
        "syncBorderColorWithMode",
      ),
      true,
    );
    assert.equal(
      readPiVimBooleanSetting(
        { piVim: { syncBorderColorWithMode: false } },
        {},
        "syncBorderColorWithMode",
      ),
      false,
    );
  });

  it("ignores invalid boolean settings", () => {
    assert.equal(
      readPiVimBooleanSetting(
        { piVim: { syncBorderColorWithMode: "true" } },
        {},
        "syncBorderColorWithMode",
      ),
      undefined,
    );
    assert.equal(
      readPiVimBooleanSetting(
        { piVim: { syncBorderColorWithMode: 1 } },
        {},
        "syncBorderColorWithMode",
      ),
      undefined,
    );
    assert.equal(
      readPiVimBooleanSetting(
        { piVim: { syncBorderColorWithMode: null } },
        {},
        "syncBorderColorWithMode",
      ),
      undefined,
    );
  });

  it("lets project boolean settings override global", () => {
    assert.equal(
      readPiVimBooleanSetting(
        { piVim: { syncBorderColorWithMode: true } },
        { piVim: { syncBorderColorWithMode: false } },
        "syncBorderColorWithMode",
      ),
      false,
    );
  });

  it("treats invalid project boolean settings as an override", () => {
    assert.equal(
      readPiVimBooleanSetting(
        { piVim: { syncBorderColorWithMode: true } },
        { piVim: { syncBorderColorWithMode: "false" } },
        "syncBorderColorWithMode",
      ),
      undefined,
    );
  });
});

describe("piVim clipboard mirror settings reader", () => {
  it("returns undefined when global and project settings are missing", () => {
    assert.equal(
      readPiVimClipboardMirrorSetting(undefined, undefined),
      undefined,
    );
    assert.equal(readPiVimClipboardMirrorSetting(null, null), undefined);
    assert.equal(readPiVimClipboardMirrorSetting("bad", 42), undefined);
  });

  it("reads global piVim clipboardMirror when project setting is missing", () => {
    assert.equal(
      readPiVimClipboardMirrorSetting(
        { piVim: { clipboardMirror: "yank" } },
        {},
      ),
      "yank",
    );
  });

  it("lets project piVim clipboardMirror override global", () => {
    assert.equal(
      readPiVimClipboardMirrorSetting(
        { piVim: { clipboardMirror: "never" } },
        { piVim: { clipboardMirror: "all" } },
      ),
      "all",
    );
  });

  it("treats invalid project clipboardMirror as an override instead of falling back to global", () => {
    assert.equal(
      readPiVimClipboardMirrorSetting(
        { piVim: { clipboardMirror: "yank" } },
        { piVim: { clipboardMirror: null } },
      ),
      null,
    );
  });

  it("treats malformed project piVim settings as an override instead of falling back to global", () => {
    const setting = readPiVimClipboardMirrorSetting(
      { piVim: { clipboardMirror: "yank" } },
      { piVim: "bad" },
    );
    const result = resolveClipboardMirrorPolicy(setting);

    assert.equal(setting, "bad");
    assert.equal(result.policy, "all");
    assert.match(result.warning ?? "", /bad/);
    assert.match(result.warning ?? "", /all, yank, never/);
  });
});
