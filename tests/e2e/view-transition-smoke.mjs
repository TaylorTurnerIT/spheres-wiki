#!/usr/bin/env node
/**
 * Browser smoke test for V79: capture a direct /feats/ -> /power/ transition,
 * record Astro lifecycle/style evidence, and reject additive root compositing.
 *
 * Requires an already-built site served at VIEW_TRANSITION_BASE_URL. Set
 * VIEW_TRANSITION_CAPTURE=1 to retain screencast frames for visual inspection.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";

const BASE_URL = (
  process.env.VIEW_TRANSITION_BASE_URL ?? "http://127.0.0.1:4321/spheres-wiki"
).replace(/\/+$/, "");
const BASE_PATH = new URL(`${BASE_URL}/`).pathname.replace(/\/+$/, "");
const FROM_ROUTE = "/feats/";
const TO_ROUTE = "/power/";
const FROM_PATH = `${BASE_PATH}${FROM_ROUTE}`;
const TO_PATH = `${BASE_PATH}${TO_ROUTE}`;
const RUNS = Math.max(
  1,
  Number.parseInt(process.env.VIEW_TRANSITION_RUNS ?? "3", 10) || 3,
);
const ARTIFACT_DIR = path.resolve(
  process.env.VIEW_TRANSITION_ARTIFACT_DIR ?? "test-results/view-transition",
);
const CAPTURE = process.env.VIEW_TRANSITION_CAPTURE === "1";
const WAIT_MS = 450;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ].filter(Boolean);
  const executable = candidates.find((candidate) => existsSync(candidate));
  if (!executable) {
    throw new Error(
      "Chrome not found; set CHROME_PATH before running the browser smoke test",
    );
  }
  return executable;
}

async function startCapture(page, run) {
  if (!CAPTURE) return async () => {};

  const client = await page.createCDPSession();
  const runDir = path.join(ARTIFACT_DIR, `run-${run}`);
  await mkdir(runDir, { recursive: true });
  const writes = [];
  let frame = 0;
  let active = true;
  client.on("Page.screencastFrame", ({ data, sessionId }) => {
    void client.send("Page.screencastFrameAck", { sessionId });
    if (!active || frame >= 32) return;
    const target = path.join(runDir, `${String(frame++).padStart(2, "0")}.png`);
    writes.push(writeFile(target, Buffer.from(data, "base64")));
  });
  await client.send("Page.startScreencast", {
    format: "png",
    quality: 90,
    maxWidth: 1280,
    maxHeight: 900,
    everyNthFrame: 1,
  });
  return async () => {
    active = false;
    await client.send("Page.stopScreencast").catch(() => {});
    await Promise.all(writes);
    await client.detach().catch(() => {});
  };
}

async function waitForTarget(page) {
  await page.waitForFunction(
    (targetPath) =>
      location.pathname === targetPath &&
      document.querySelector(`.content-area[data-system="power"]`),
    { timeout: 15_000 },
    TO_PATH,
  );
  await delay(WAIT_MS);
}

function validateLifecycle(trace, run) {
  const names = trace.events.map((event) => event.name);
  const required = [
    "astro:before-preparation",
    "astro:after-preparation",
    "astro:before-swap",
    "astro:after-swap",
    "astro:page-load",
  ];
  let previous = -1;
  for (const name of required) {
    const index = names.indexOf(name);
    assert(
      index > previous,
      `run ${run}: missing or out-of-order ${name}: ${names.join(" → ")}`,
    );
    previous = index;
  }

  if (trace.native) {
    assert(
      names.includes("view-transition-start"),
      `run ${run}: native View Transition did not start`,
    );
    assert(
      names.includes("view-transition-finished"),
      `run ${run}: native View Transition did not finish`,
    );
  }
}

function validateTargetStyle(trace, run) {
  const swap = trace.events.find((event) => event.name === "astro:after-swap");
  assert(
    swap?.style?.targetSystem === "power",
    `run ${run}: target system was not styled at after-swap`,
  );
  assert(
    swap.style.stylesheetsReady,
    `run ${run}: target stylesheet was not ready at after-swap`,
  );
}

function isBadFrame(frame) {
  const live = frame.live;
  return [
    !live.hasMain,
    live.mainDisplay === "none",
    live.mainVisibility === "hidden",
    live.mainOpacity === "0",
    !live.viewportElement,
  ].some(Boolean);
}

function validateLiveFrames(trace, run) {
  const targetFrames = trace.frames.filter((frame) => frame.path === TO_PATH);
  assert(
    targetFrames.length > 0,
    `run ${run}: no target-page frame was sampled`,
  );
  const badFrames = trace.frames.filter(isBadFrame);
  assert(
    badFrames.length === 0,
    `run ${run}: blank or unstyled live-DOM frame at ${badFrames[0]?.t}ms`,
  );
}

function validateCompositing(trace, run) {
  const pseudoFrames = trace.frames.filter((frame) => frame.old || frame.new);
  const additiveFrame = pseudoFrames.find((frame) =>
    [frame.old, frame.new].some(
      (pseudo) => pseudo?.mixBlendMode === "plus-lighter",
    ),
  );
  assert(
    !additiveFrame,
    `run ${run}: root transition still uses additive plus-lighter compositing at ${additiveFrame?.t}ms`,
  );
}

function validateTrace(trace, run) {
  validateLifecycle(trace, run);
  validateTargetStyle(trace, run);
  validateLiveFrames(trace, run);
  validateCompositing(trace, run);
}

async function run() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const report = {
    baseUrl: BASE_URL,
    from: FROM_PATH,
    to: TO_PATH,
    runs: [],
    capture: CAPTURE,
  };
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });

  try {
    await page.evaluateOnNewDocument(() => {
      const state = { events: [], frames: [], native: false, sampling: false };
      window.__spheresTransitionProbe = state;

      function mainSnapshot() {
        const main = document.querySelector("main");
        if (!main) {
          return {
            hasMain: false,
            mainDisplay: undefined,
            mainVisibility: undefined,
            mainOpacity: undefined,
          };
        }
        const style = getComputedStyle(main);
        return {
          hasMain: true,
          mainDisplay: style.display,
          mainVisibility: style.visibility,
          mainOpacity: style.opacity,
        };
      }

      function contentSnapshot() {
        const content = document.querySelector(".content-area");
        if (!content) return { targetSystem: null, systemColor: "" };
        return {
          targetSystem: content.getAttribute("data-system"),
          systemColor: getComputedStyle(content)
            .getPropertyValue("--clr-ns")
            .trim(),
        };
      }

      function stylesheetsReady() {
        return [...document.querySelectorAll('link[rel="stylesheet"]')].every(
          (link) => Boolean(link.sheet),
        );
      }

      function viewportElement() {
        return Boolean(
          document.elementFromPoint(
            innerWidth / 2,
            Math.min(200, innerHeight - 1),
          ),
        );
      }

      function styleSnapshot() {
        return {
          ...mainSnapshot(),
          ...contentSnapshot(),
          stylesheetsReady: stylesheetsReady(),
          viewportElement: viewportElement(),
        };
      }

      function pseudoSnapshot(pseudo) {
        try {
          const style = getComputedStyle(document.documentElement, pseudo);
          return {
            opacity: style.opacity,
            animationName: style.animationName,
            mixBlendMode: style.mixBlendMode,
          };
        } catch {
          return null;
        }
      }

      function record(name, event) {
        state.events.push({
          name,
          t: performance.now(),
          path: location.pathname,
          from: event?.from?.pathname,
          to: event?.to?.pathname,
          style: styleSnapshot(),
        });
        if (name === "astro:before-preparation") {
          state.sampling = true;
          state.sampleStart = performance.now();
          const sample = () => {
            const t = performance.now();
            state.frames.push({
              t: t - state.sampleStart,
              path: location.pathname,
              live: styleSnapshot(),
              old: pseudoSnapshot("::view-transition-old(root)"),
              new: pseudoSnapshot("::view-transition-new(root)"),
            });
            if (state.sampling && t - state.sampleStart < 900)
              requestAnimationFrame(sample);
            else state.sampling = false;
          };
          requestAnimationFrame(sample);
        }
      }

      for (const name of [
        "astro:before-preparation",
        "astro:after-preparation",
        "astro:before-swap",
        "astro:after-swap",
        "astro:page-load",
      ]) {
        document.addEventListener(name, (event) => record(name, event));
      }

      const native = document.startViewTransition?.bind(document);
      state.native = Boolean(native);
      if (native) {
        document.startViewTransition = (callback) => {
          record("view-transition-start");
          const transition = native(callback);
          transition.finished.then(
            () => record("view-transition-finished"),
            () => record("view-transition-finished-error"),
          );
          return transition;
        };
      }
    });

    for (let run = 1; run <= RUNS; run += 1) {
      await page.goto(`${BASE_URL}${FROM_ROUTE}`, { waitUntil: "load" });
      await delay(250);
      const stopCapture = await startCapture(page, run);
      try {
        await page.evaluate((targetHref) => {
          const state = window.__spheresTransitionProbe;
          state.events = [];
          state.frames = [];
          const link = [...document.querySelectorAll("a")].find(
            (candidate) => candidate.getAttribute("href") === targetHref,
          );
          if (!link) throw new Error("power tab link not found");
          link.click();
        }, TO_PATH);
        await waitForTarget(page);
        const trace = await page.evaluate(
          () => window.__spheresTransitionProbe,
        );
        report.runs.push(trace);
        validateTrace(trace, run);
      } finally {
        await stopCapture();
      }
    }
  } finally {
    await writeFile(
      path.join(ARTIFACT_DIR, "report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    await browser.close();
  }

  console.log(
    `View Transition smoke passed: ${RUNS} run(s), artifacts at ${path.relative(process.cwd(), path.join(ARTIFACT_DIR, "report.json"))}`,
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
