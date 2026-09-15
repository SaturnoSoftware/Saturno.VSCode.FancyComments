/**
 * FANCYCMNT-0046: measured, not estimated. This extension has no per-keystroke hook (no
 * `onDidChangeTextDocument` handler) - the hot path is `buildCommentBlock`/`buildCommentLine`,
 * run once per command invocation (build, toggle, edit-comment-block). That invocation is what
 * gets measured here; "cost per keystroke" in the review task's original framing does not apply
 * literally, since nothing here runs on every keystroke.
 */
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { buildCommentBlock, buildCommentLine, CommentSyntax } from "../Source/formatting";

const cStyleSyntax: CommentSyntax = {
  singleLineStart: "//",
  singleLineEnd: "",
  multiLineStart: "/*",
  multiLineMiddle: "*",
  multiLineEnd: "*/",
};

function median(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function timeCallMicros(fn: () => void, iterations: number): number {
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    fn();
    const end = process.hrtime.bigint();
    samples.push(Number(end - start) / 1000); // ns -> us
  }
  return median(samples);
}

describe("formatting latency (measured)", () => {
  it("buildCommentBlock: median call time is well under one editor frame", () => {
    const text = "A comment block roughly the size of a real docstring, several sentences\nlong, so the measurement is not dominated by function-call overhead alone.";
    const micros = timeCallMicros(() => buildCommentBlock(cStyleSyntax, "  ", text), 2000);
    console.log(`  buildCommentBlock: median ${micros.toFixed(2)}us over 2000 calls`);
    // 1000us (1ms) leaves two orders of magnitude of margin below the ~16ms budget of a single
    // 60fps editor frame - a real regression guard, not a tight bound chasing a benchmark number.
    assert.ok(micros < 1000, `buildCommentBlock median ${micros.toFixed(2)}us exceeds the 1000us guard`);
  });

  it("buildCommentLine: median call time is well under one editor frame", () => {
    const micros = timeCallMicros(() => buildCommentLine(cStyleSyntax, "A representative separator label"), 2000);
    console.log(`  buildCommentLine: median ${micros.toFixed(2)}us over 2000 calls`);
    assert.ok(micros < 1000, `buildCommentLine median ${micros.toFixed(2)}us exceeds the 1000us guard`);
  });
});
