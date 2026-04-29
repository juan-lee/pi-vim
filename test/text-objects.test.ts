import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isEscapedDelimiter,
  normalizeDelimiterKey,
  resolveDelimitedTextObjectRange,
  resolveQuoteObjectRange,
  resolveWordTextObjectRange,
} from "../text-objects.js";

describe("resolveWordTextObjectRange", () => {
  it("resolves an inner word on the current line", () => {
    assert.deepEqual(resolveWordTextObjectRange("foo bar", 0, 1, "i"), {
      startAbs: 0,
      endAbs: 3,
    });
  });

  it("prefers trailing whitespace for aw", () => {
    assert.deepEqual(resolveWordTextObjectRange("foo bar", 10, 1, "a"), {
      startAbs: 10,
      endAbs: 14,
    });
  });

  it("includes leading whitespace for aw when no trailing whitespace exists", () => {
    assert.deepEqual(resolveWordTextObjectRange("foo bar", 0, 5, "a"), {
      startAbs: 3,
      endAbs: 7,
    });
  });

  it("chooses the next word from whitespace, or the previous word when there is no next word", () => {
    assert.deepEqual(resolveWordTextObjectRange("foo   bar", 0, 3, "i"), {
      startAbs: 6,
      endAbs: 9,
    });
    assert.deepEqual(resolveWordTextObjectRange("foo   ", 0, 4, "i"), {
      startAbs: 0,
      endAbs: 3,
    });
  });

  it("includes intervening whitespace for counted inner word objects", () => {
    assert.deepEqual(resolveWordTextObjectRange("foo bar baz", 0, 1, "i", 2), {
      startAbs: 0,
      endAbs: 7,
    });
  });

  it("uses contiguous non-whitespace runs for WORD semantics", () => {
    assert.deepEqual(resolveWordTextObjectRange("path/to-file", 0, 5, "i", 1, "WORD"), {
      startAbs: 0,
      endAbs: 12,
    });
  });

  it("does not cross newline boundaries", () => {
    assert.deepEqual(resolveWordTextObjectRange("foo\nbar", 0, 1, "i", 2), {
      startAbs: 0,
      endAbs: 3,
    });
  });

  it("returns null for empty or whitespace-only lines", () => {
    assert.equal(resolveWordTextObjectRange("", 0, 0, "i"), null);
    assert.equal(resolveWordTextObjectRange("   ", 0, 1, "a"), null);
  });
});

describe("normalizeDelimiterKey", () => {
  it("normalizes quote delimiter keys", () => {
    assert.deepEqual(normalizeDelimiterKey("\""), {
      type: "quote",
      open: "\"",
      close: "\"",
    });
    assert.deepEqual(normalizeDelimiterKey("'"), {
      type: "quote",
      open: "'",
      close: "'",
    });
    assert.deepEqual(normalizeDelimiterKey("`"), {
      type: "quote",
      open: "`",
      close: "`",
    });
  });

  it("returns null for unsupported delimiter keys", () => {
    assert.equal(normalizeDelimiterKey("x"), null);
    assert.equal(resolveDelimitedTextObjectRange("x", 0, "i", "x"), null);
  });
});

describe("resolveQuoteObjectRange", () => {
  const cases = [
    {
      name: "double quotes",
      text: 'say "hello" now',
      quote: "\"",
      cursorAbs: 6,
      inner: { startAbs: 5, endAbs: 10 },
      around: { startAbs: 4, endAbs: 11 },
    },
    {
      name: "single quotes",
      text: "say 'hello' now",
      quote: "'",
      cursorAbs: 6,
      inner: { startAbs: 5, endAbs: 10 },
      around: { startAbs: 4, endAbs: 11 },
    },
    {
      name: "backticks",
      text: "run `build` now",
      quote: "`",
      cursorAbs: 6,
      inner: { startAbs: 5, endAbs: 10 },
      around: { startAbs: 4, endAbs: 11 },
    },
  ];

  for (const quoteCase of cases) {
    it(`resolves inside and around ${quoteCase.name}`, () => {
      assert.deepEqual(
        resolveQuoteObjectRange(quoteCase.text, quoteCase.cursorAbs, "i", quoteCase.quote),
        quoteCase.inner,
      );
      assert.deepEqual(
        resolveDelimitedTextObjectRange(quoteCase.text, quoteCase.cursorAbs, "a", quoteCase.quote),
        quoteCase.around,
      );
    });
  }

  it("counts the cursor on either quote delimiter as contained", () => {
    const text = 'say "hello" now';

    assert.deepEqual(resolveDelimitedTextObjectRange(text, 4, "i", "\""), {
      startAbs: 5,
      endAbs: 10,
    });
    assert.deepEqual(resolveDelimitedTextObjectRange(text, 10, "a", "\""), {
      startAbs: 4,
      endAbs: 11,
    });
  });

  it("ignores escaped quotes with an odd number of preceding backslashes", () => {
    const text = String.raw`\"skip\" "yes"`;

    assert.equal(text[1], "\"");
    assert.equal(text[7], "\"");
    assert.equal(text[9], "\"");
    assert.equal(text[13], "\"");
    assert.equal(isEscapedDelimiter(text, 1), true);
    assert.equal(isEscapedDelimiter(text, 7), true);
    assert.deepEqual(resolveDelimitedTextObjectRange(text, 10, "i", "\""), {
      startAbs: 10,
      endAbs: 13,
    });
  });

  it("keeps one, two, and three preceding backslashes distinct", () => {
    assert.equal(isEscapedDelimiter(String.raw`\"`, 1), true);
    assert.equal(isEscapedDelimiter(String.raw`\\"`, 2), false);
    assert.equal(isEscapedDelimiter(String.raw`\\\"`, 3), true);
  });

  it("does not cross newline boundaries", () => {
    const text = '"one\n"two"';

    assert.equal(resolveDelimitedTextObjectRange(text, 2, "i", "\""), null);
    assert.deepEqual(resolveDelimitedTextObjectRange(text, 6, "i", "\""), {
      startAbs: 6,
      endAbs: 9,
    });
  });

  it("returns an empty inner range for empty quotes", () => {
    const text = 'say "" now';

    assert.deepEqual(resolveDelimitedTextObjectRange(text, 4, "i", "\""), {
      startAbs: 5,
      endAbs: 5,
    });
    assert.deepEqual(resolveDelimitedTextObjectRange(text, 5, "a", "\""), {
      startAbs: 4,
      endAbs: 6,
    });
  });
});
