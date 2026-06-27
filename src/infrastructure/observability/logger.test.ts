import { test } from "node:test";
import assert from "node:assert/strict";

import { Logger, type Level } from "./logger";
import type { ErrorTracker } from "./error-tracker";

function capture() {
  const lines: Array<{ level: Level; line: string }> = [];
  return {
    lines,
    out: (level: Level, line: string) => lines.push({ level, line }),
  };
}

test("emits structured JSON with level, msg and fields", () => {
  const sink = capture();
  const log = new Logger({ json: true, minLevel: 0, out: sink.out });
  log.info("hello", { shopId: "s1" });

  assert.equal(sink.lines.length, 1);
  assert.equal(sink.lines[0].level, "info");
  const obj = JSON.parse(sink.lines[0].line);
  assert.equal(obj.level, "info");
  assert.equal(obj.msg, "hello");
  assert.equal(obj.shopId, "s1");
  assert.ok(obj.time, "includes a timestamp");
});

test("suppresses lines below the minimum level", () => {
  const sink = capture();
  // min = warn(30): debug/info dropped, warn/error kept.
  const log = new Logger({ json: true, minLevel: 30, out: sink.out });
  log.debug("d");
  log.info("i");
  log.warn("w");
  log.error("e");

  assert.deepEqual(
    sink.lines.map((l) => l.level),
    ["warn", "error"],
  );
});

test("captureException logs at error level and forwards to the tracker", () => {
  const sink = capture();
  const seen: unknown[] = [];
  const tracker: ErrorTracker = { capture: (e) => seen.push(e) };
  const log = new Logger({ json: true, minLevel: 0, out: sink.out, tracker });

  const boom = new Error("kaboom");
  log.captureException(boom, { route: "/x" });

  assert.equal(sink.lines.length, 1);
  assert.equal(sink.lines[0].level, "error");
  const obj = JSON.parse(sink.lines[0].line);
  assert.match(obj.msg, /kaboom/);
  assert.equal(obj.route, "/x");
  assert.equal(obj.err.message, "kaboom");
  assert.deepEqual(seen, [boom], "forwarded the original error to the tracker");
});

test("a throwing tracker never breaks captureException", () => {
  const sink = capture();
  const tracker: ErrorTracker = {
    capture: () => {
      throw new Error("tracker down");
    },
  };
  const log = new Logger({ json: true, minLevel: 0, out: sink.out, tracker });

  assert.doesNotThrow(() => log.captureException(new Error("x")));
  assert.equal(sink.lines.length, 1, "still logged despite the tracker failing");
});

test("pretty (non-JSON) format is compact and human-readable", () => {
  const sink = capture();
  const log = new Logger({ json: false, minLevel: 0, out: sink.out });
  log.warn("careful", { n: 2 });
  assert.equal(sink.lines[0].line, '[warn] careful {"n":2}');
});
