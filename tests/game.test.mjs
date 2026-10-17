import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './helpers/game-runtime.mjs';

async function playing() {
  const runtime = await loadGame();
  runtime.key('Enter');
  runtime.step(56);
  return runtime;
}

test('title starts on a key and finishes the existing entrance transition', async () => {
  const runtime = await loadGame();
  assert.equal(runtime.game.mode, 'title');
  runtime.frame(0);
  runtime.key('Enter', 'keydown', { ctrlKey: true });
  assert.equal(runtime.game.mode, 'title');
  runtime.key('Enter');
  assert.equal(runtime.game.mode, 'play');
  assert.equal(runtime.game.state.enter.t, 0);
  runtime.step(56);
  assert.equal(runtime.game.state.enter, null);
  assert.equal(runtime.game.state.cam, 0);
  assert.equal(runtime.game.state.hp, 5);
});

test('Space jumps twice, ignores key repeat and cuts a released jump', async () => {
  const runtime = await playing();
  runtime.key('Space'); runtime.step();
  assert.equal(runtime.game.state.jumps, 1);
  assert.ok(runtime.game.state.vy < 0);
  runtime.key('Space', 'keydown', { repeat: true }); runtime.step();
  assert.equal(runtime.game.state.jumps, 1);
  runtime.key('Space', 'keyup'); runtime.step();
  assert.equal(runtime.game.held, false);
  runtime.key('Space'); runtime.step();
  assert.equal(runtime.game.state.jumps, 2);
  runtime.key('Space', 'keyup'); runtime.key('Space'); runtime.step();
  assert.equal(runtime.game.state.jumps, 2);
});

test('holding Space produces a higher first jump than tapping', async () => {
  const held = await playing(), tap = await playing();
  held.key('Space'); tap.key('Space'); held.step(); tap.step();
  tap.key('Space', 'keyup');
  held.step(10); tap.step(10);
  assert.ok(held.game.state.y < tap.game.state.y);
});

test('hidden tab pauses progress and Space resumes', async () => {
  const runtime = await playing();
  runtime.visibility(true);
  assert.equal(runtime.game.mode, 'pause');
  const before = runtime.game.state.d;
  runtime.step(30);
  assert.equal(runtime.game.state.d, before);
  runtime.visibility(false); runtime.key('Space'); runtime.step();
  assert.equal(runtime.game.mode, 'play');
  assert.ok(runtime.game.state.d > before);
});

for (const [key, property, duration] of [['ArrowLeft', 'climax', 108], ['ArrowRight', 'drive', 300], ['ArrowUp', 'clean', 150]]) {
  test(`${key} selects the existing ability and records the choice`, async () => {
    const runtime = await playing();
    runtime.game.openPick(); runtime.key(key);
    assert.equal(runtime.game.state.pick, null);
    assert.equal(runtime.game.state[property], duration);
    assert.equal(runtime.game.state.freeze, 8);
    assert.equal(JSON.parse(runtime.storage.get('loopnight-picks')).length, 1);
    runtime.game.render();
  });
}

test('lap transition preserves echo, wear, perfect bonus and warp', async () => {
  const runtime = await playing();
  runtime.game.nextLap();
  assert.equal(runtime.game.state.lap, 2);
  assert.equal(runtime.game.state.wear, 1);
  assert.equal(runtime.game.state.ghosts.length, 1);
  assert.equal(runtime.game.state.pts, 1000);
  assert.ok(runtime.game.state.warp);
  runtime.game.render();
});

test('damage triggers rewind, then fatal damage saves records and allows restart', async () => {
  const runtime = await playing();
  runtime.game.hurt(() => {}, { t: 'B' });
  assert.equal(runtime.game.state.hp, 4);
  assert.equal(runtime.game.state.pendingRewind, true);
  runtime.game.state.total = 1230;
  for (let i = 0; i < 4; i++) runtime.game.damage();
  assert.equal(runtime.game.mode, 'over');
  assert.equal(runtime.storage.get('loopnight-best'), '123');
  assert.equal(JSON.parse(runtime.storage.get('loopnight-hits'))[0].fatal, true);
  runtime.key('Space');
  assert.equal(runtime.game.mode, 'over');
  runtime.step(46); runtime.key('Space');
  assert.equal(runtime.game.mode, 'play');
  assert.equal(runtime.game.state.hp, 5);
});

test('resize retains aspect-ratio bounds and logical height', async () => {
  const runtime = await loadGame();
  assert.equal(runtime.game.width, 480);
  runtime.resize(2560, 1080);
  assert.equal(runtime.game.width, 630);
  assert.equal(runtime.cv.width, 2520);
  runtime.resize(400, 900);
  assert.equal(runtime.game.width, 432);
  assert.equal(runtime.cv.style.height, '250px');
  runtime.game.render();
});

test('public diagnostics still validate courses and clear logs without clearing the best score', async () => {
  const runtime = await loadGame({ stored: { 'loopnight-best': '456', 'loopnight-picks': '[]' } });
  assert.deepEqual(Object.keys(runtime.api), ['log', 'validate', 'clear']);
  runtime.api.validate(12);
  for (let lap = 1; lap <= 12; lap++) {
    assert.ok(runtime.game.validateLap(lap).n > 0);
    assert.ok(runtime.game.lapCfg(lap).speed <= 4.9);
  }
  runtime.api.clear();
  assert.equal(runtime.api.log(), 0);
  assert.equal(runtime.storage.get('loopnight-best'), '456');
  assert.equal(runtime.storage.get('loopnight-hits'), '[]');
});
