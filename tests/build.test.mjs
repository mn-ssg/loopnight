import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);

test('feature sources build into the checked-in static runtime without dependencies', () => {
  const script = new URL('scripts/build.mjs', root);
  assert.ok(existsSync(script), 'A build entry for feature files is required');
  execFileSync(process.execPath, [fileURLToPath(script), '--check'], { cwd: root });
  new vm.Script(readFileSync(new URL('dist/game.js', root), 'utf8'));
});

test('HTML references the complete static bundles and preserves the canvas', () => {
  const html = readFileSync(new URL('index.html', root), 'utf8');
  assert.match(html, /<script src="dist\/game\.js"><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="dist\/style\.css">/);
  assert.match(html, /<canvas id="game" width="1920" height="1080" aria-label="LOOP NIGHT 게임 화면"><\/canvas>/);
  for (const [, path] of html.matchAll(/(?:src|href)="((?:dist\/)[^"]+)"/g)) {
    assert.ok(existsSync(new URL(path, root)), `Missing static file: ${path}`);
  }
});
