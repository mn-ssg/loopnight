import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);

// Only the test VM can inspect the original private scope. The shipped API stays unchanged.
export async function loadGame({ width = 1920, height = 1080, stored = {} } = {}) {
  const html = await readFile(new URL('index.html', root), 'utf8');
  const entry = html.match(/<script src="([^"]+)"/)[1];
  const source = await readFile(process.env.GAME_SOURCE || new URL(entry, root), 'utf8');
  const listeners = new Map(), storage = new Map(Object.entries(stored)), frames = [];
  const on = (name, fn) => listeners.set(name, [...(listeners.get(name) || []), fn]);
  const dispatch = (name, event = {}) => {
    for (const fn of listeners.get(name) || []) fn(event);
  };
  const noop = () => {};
  const canvas = () => {
    const context = new Proxy({
      measureText: text => ({ width: text.length * 8 }),
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
      getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    }, { get: (target, key) => key in target ? target[key] : noop });
    return { width: 1920, height: 1080, style: {}, getContext: () => context };
  };
  const cv = canvas();
  let seed = 123456789;
  const math = Object.create(Math);
  math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const sandbox = {
    console: { table: noop }, Math: math,
    innerWidth: width, innerHeight: height, devicePixelRatio: 1,
    document: { hidden: false, getElementById: () => cv, createElement: canvas, addEventListener: on },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    Image: class { width = 0; set src(value) { this.path = value; queueMicrotask(() => this.onerror()); } },
    // Missing images/audio and unavailable Web Audio are existing supported fallback paths.
    fetch: async () => ({ ok: false, status: 404 }),
    performance: { now: () => 0 }, addEventListener: on,
    requestAnimationFrame: fn => frames.push(fn), setTimeout: noop, setInterval: noop,
  };
  sandbox.window = sandbox;
  const hooks = `globalThis.__gameTest = {
    get state() { return S; }, get mode() { return mode; },
    get width() { return W; }, get held() { return held; },
    update, render, nextLap, openPick, damage, hurt, score, lapCfg, validateLap,
  };`;
  assertWrapped(source);
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, `${hooks}\n})();`), sandbox);
  // Flush image readiness and the startup Promise.race without wall-clock timers.
  await new Promise(resolve => setImmediate(resolve));
  const game = sandbox.__gameTest;
  return {
    game, cv, storage, api: sandbox.LOOPNIGHT,
    step(count = 1) { for (let i = 0; i < count; i++) game.update(); },
    key(code, type = 'keydown', extra = {}) {
      dispatch(type, { code, repeat: false, metaKey: false, ctrlKey: false, altKey: false, preventDefault: noop, ...extra });
    },
    visibility(hidden) { sandbox.document.hidden = hidden; dispatch('visibilitychange'); },
    resize(w, h) { sandbox.innerWidth = w; sandbox.innerHeight = h; dispatch('resize'); },
    frame(time) { const fn = frames.shift(); if (!fn) throw new Error('Animation loop did not start'); fn(time); },
  };
}

function assertWrapped(source) {
  if (!source.startsWith('(() => {\n') || !/\}\)\(\);\s*$/.test(source)) {
    throw new Error('Expected the original private IIFE runtime');
  }
}
