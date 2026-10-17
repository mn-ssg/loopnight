import { readFile, writeFile, mkdir } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);

// Order is intentional: these feature files share the original private IIFE scope.
// Do not load them individually with script tags or convert them to ES modules.
const javascript = [
  'js/config.js',
  'js/assets.js',
  'js/course.js',
  'js/rules.js',
  'js/state.js',
  'js/audio.js',
  'js/input.js',
  'js/course-runtime.js',
  'js/player.js',
  'js/powers.js',
  'js/progression.js',
  'js/update.js',
  'js/render/drawing.js',
  'js/render/world.js',
  'js/render/tape-effects.js',
  'js/render/gateway.js',
  'js/render/live.js',
  'js/render/obstacles.js',
  'js/render/hero.js',
  'js/render/hud.js',
  'js/render/title.js',
  'js/render/scene.js',
  'js/game.js',
];
const stylesheets = ['css/base.css', 'css/screen.css', 'css/effects.css'];
const readParts = async paths => (await Promise.all(paths.map(path => readFile(new URL(path, root), 'utf8')))).join('');

const [js, css] = await Promise.all([readParts(javascript), readParts(stylesheets)]);
const bundles = { 'dist/game.js': `(() => {\n${js}})();\n`, 'dist/style.css': css };
// Catch scope collisions and incomplete function extraction before writing output.
new vm.Script(bundles['dist/game.js'], { filename: 'dist/game.js' });

if (process.argv.includes('--check')) {
  for (const [path, expected] of Object.entries(bundles)) {
    let actual;
    try { actual = await readFile(new URL(path, root), 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (actual !== expected) {
      console.error(`${path} is missing or stale. Run npm run build.`);
      process.exitCode = 1;
    }
  }
  if (!process.exitCode) console.log('Static bundles are up to date; JavaScript syntax is valid.');
} else {
  await mkdir(new URL('dist/', root), { recursive: true });
  for (const [path, content] of Object.entries(bundles)) await writeFile(new URL(path, root), content);
  console.log(`Built ${javascript.length} JavaScript files and ${stylesheets.length} CSS files into dist/.`);
}
