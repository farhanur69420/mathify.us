/* Pull the engine out of the shipped page so the tests exercise the real code
   rather than a copy. Everything above the INPUT section is pure logic with no
   DOM dependency: constants, shoe arithmetic, the solver and the edge model. */
const fs = require('fs'), path = require('path');
const PAGE = path.join(__dirname, '../../public/explore/blackjack-engine/index.html');
const js = fs.readFileSync(PAGE, 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const cut = js.indexOf('/* ═══════════════════ INPUT');
if (cut < 0) throw new Error('INPUT marker not found — did the page structure change?');
fs.writeFileSync(path.join(__dirname, 'core.js'),
  js.slice(0, cut) + '\nmodule.exports={evaluate,freshCounts,S,PERDECK,houseEdgePct};\n');
console.log('core.js extracted from the shipped page');
