import { describe, it } from "node:test";
import { assertMatchesNvim, type NvimParityCase } from "./nvim-oracle.js";

const BASIC_PARITY_CASES: NvimParityCase[] = [
  {
    name: "0 moves to the start of the line",
    initial: { text: "alpha beta", cursor: { line: 0, col: 5 } },
    keys: ["0"],
  },
  {
    name: "w moves to the next word start",
    initial: { text: "foo bar baz", cursor: { line: 0, col: 0 } },
    keys: ["w"],
  },
  {
    name: "x deletes the character under the cursor",
    initial: { text: "hello", cursor: { line: 0, col: 0 } },
    keys: ["x"],
  },
  {
    name: "dw deletes through the following word gap",
    initial: { text: "foo bar baz", cursor: { line: 0, col: 0 } },
    keys: ["d", "w"],
  },
  {
    name: "dd deletes the current line linewise",
    initial: { text: "one\ntwo\nthree", cursor: { line: 1, col: 0 } },
    keys: ["d", "d"],
  },
];

const KNOWN_BUG_CASES: NvimParityCase[] = [
  {
    name: "x on the final character moves the cursor back",
    initial: { text: "hello", cursor: { line: 0, col: 0 } },
    keys: ["e", "x"],
  },
  {
    name: "$ moves to the last character, not past EOL",
    initial: { text: "hello", cursor: { line: 0, col: 0 } },
    keys: ["$"],
  },
  {
    name: "$x deletes the last character",
    initial: { text: "hello", cursor: { line: 0, col: 0 } },
    keys: ["$", "x"],
  },
];

describe("nvim parity smoke", () => {
  for (const testCase of BASIC_PARITY_CASES) {
    it(testCase.name, async () => {
      await assertMatchesNvim(testCase);
    });
  }
});

describe("nvim parity known bugs", () => {
  for (const testCase of KNOWN_BUG_CASES) {
    it(testCase.name, async () => {
      await assertMatchesNvim(testCase);
    });
  }
});
