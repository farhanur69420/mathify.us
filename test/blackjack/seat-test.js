/* Does what other players show actually change the engine's answer?
   Player hand and dealer upcard are held fixed. The only thing that varies is
   the pile of cards other seats have exposed. */
const S = require('./sim.js');
const C = require('./core.js');
const RK = ['A','2','3','4','5','6','7','8','9','10'];
const R = { decks:6,h17:false,das:true,doubleOn:'any',dasOn:'same',maxHands:4,rsa:false,
            hitSplitAces:false,surrender:'none',bjPay:1.5,hole:'peek',pen:0.75,csm:false };
const HILO = [-1,1,1,1,1,1,0,0,0,-1];

// Build a `removed` array: your two cards, the dealer upcard, plus whatever the
// other seats have shown.
function scene(hand, up, others){
  const rem = new Array(10).fill(0);
  for (const c of hand) rem[c]++;
  rem[up]++;
  for (const c of others) rem[c]++;
  return rem;
}
function tc(rem){
  let rc=0, seen=0;
  for (let i=0;i<10;i++){ rc += HILO[i]*rem[i]; seen += rem[i]; }
  return rc/Math.max((R.decks*52-seen)/52, 0.25);
}
const rep = n => { const a=[]; for (let i=0;i<n;i++) a.push([1,2,3,4][i%4]); return a; };   // 2,3,4,5...
const tens = n => new Array(n).fill(9);

const CASES = [
  ['hard 16 vs 10', [9,5], 9],
  ['hard 12 vs 3',  [9,1], 2],
  ['hard 10 vs 10', [9,0].slice(0,0).concat([1,7]), 9],   // 2+8
  ['hard 13 vs 2',  [9,2], 1],
  ['A,7 vs 2',      [0,6], 1]
];
const PILES = [
  ['nobody else at the table', []],
  ['other seats showed 12 low cards (2-5)', rep(12)],
  ['other seats showed 24 low cards (2-5)', rep(24)],
  ['other seats showed 40 low cards (2-5)', rep(40)],
  ['other seats showed 20 tens', tens(20)],
];
const NAME = { stand:'STAND', hit:'HIT', double:'DOUBLE', split:'SPLIT', surrender:'SURR' };

for (const [label, hand, up] of CASES){
  console.log('\n' + label + '   (your cards and the upcard never change)');
  let base = null;
  for (const [pl, others] of PILES){
    const rem = scene(hand, up, others);
    const act = S.engineDecide(hand, up, 1, R, rem, false, false);
    if (base === null) base = act;
    console.log('   ' + pl.padEnd(40)
      + 'TC ' + (tc(rem)>=0?'+':'') + tc(rem).toFixed(1).padStart(5)
      + '   -> ' + NAME[act].padEnd(7)
      + (act !== base ? '  <= CHANGED' : ''));
  }
}
