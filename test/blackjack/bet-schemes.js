/* Replay every betting scheme over one identical recorded stream of hands.
   The cards and the playing decisions are fixed; only the money moves. */
const fs = require('fs');
const key = process.argv[2] || 'casino';
const D = JSON.parse(fs.readFileSync('stream-'+key+'.json','utf8'));

const START = 1000;      // bankroll, in table minimums
const TABLE_MAX = 500;   // table maximum, in table minimums
const HANDS = 2000;      // hands per session
const SESSIONS = +(process.argv[3]||20000);

const ramp = tc => tc < 1 ? 1 : tc < 2 ? 2 : tc < 3 ? 4 : tc < 4 ? 8 : 12;
const edgeOf = tc => (D.base + 0.5*tc)/100;

const SCHEMES = {
  'flat 1 unit':            (tc,bk,ls) => 1,
  'count ramp 1-12':        (tc,bk,ls) => ramp(tc),
  'Kelly on measured edge': (tc,bk,ls) => Math.max(1, bk*Math.max(0,edgeOf(tc))/1.32),
  'Martingale only':        (tc,bk,ls) => Math.pow(2, Math.min(ls,12)),
  'ramp x Martingale':      (tc,bk,ls) => ramp(tc)*Math.pow(2, Math.min(ls,12)),
  'ramp x climb-out':       (tc,bk,ls) => ramp(tc)*Math.min(8, Math.max(1, START/Math.max(bk,1)))
};

// Shoe blocks, so a resampled session keeps real within-shoe count dynamics.
const blocks = [];
{ let cur=[], last=D.shoe[0];
  for (let i=0;i<D.n;i++){
    if (D.shoe[i]!==last){ blocks.push(cur); cur=[]; last=D.shoe[i]; }
    cur.push(i);
  }
  if (cur.length) blocks.push(cur);
}

function session(seq, betFn){
  let bk = START, ls = 0, peak = START, maxDD = 0, wagered = 0, played = 0;
  for (const i of seq){
    if (bk < 1) break;
    let bet = betFn(D.tc[i], bk, ls);
    bet = Math.min(bet, TABLE_MAX, bk);
    if (bet < 1) bet = Math.min(1, bk);
    const net = D.net[i]*bet;
    bk += net; wagered += bet; played++;
    ls = net < 0 ? ls+1 : 0;
    if (bk > peak) peak = bk;
    maxDD = Math.max(maxDD, (peak-bk)/peak);
    if (bk < 1) break;
  }
  return { bk, ruined: bk < 1, maxDD, wagered, played };
}

const pct = (a,q) => a[Math.min(a.length-1, Math.floor(q*a.length))];
console.log('\n══ ' + (key==='casino' ? 'Casino 6D, S17, DAS, LS, 75% penetration'
                                      : 'Evolution 8D, S17, no DAS, 50% penetration'));
console.log('   base house edge ' + D.base + '%   |   ' + SESSIONS.toLocaleString() + ' sessions x '
  + HANDS.toLocaleString() + ' hands   |   bankroll ' + START + ' units, table max ' + TABLE_MAX + '\n');
console.log('   ' + 'scheme'.padEnd(24) + 'mean end'.padStart(10) + 'median'.padStart(9)
  + '5th %ile'.padStart(10) + '95th %ile'.padStart(11) + '   ruin'.padStart(8)
  + '  ahead'.padStart(8) + '   EV/hand'.padStart(11));

// Same resampled sessions for every scheme: common random numbers.
const seqs = [];
for (let s=0;s<SESSIONS;s++){
  const seq=[]; 
  while (seq.length < HANDS){
    const b = blocks[(Math.random()*blocks.length)|0];
    for (const i of b){ seq.push(i); if (seq.length>=HANDS) break; }
  }
  seqs.push(seq);
}
for (const [name, fn] of Object.entries(SCHEMES)){
  const ends=[]; let ruin=0, ahead=0, net=0, wag=0, hands=0, dd=0;
  for (const seq of seqs){
    const r = session(seq, fn);
    ends.push(r.bk);
    if (r.ruined) ruin++;
    if (r.bk > START) ahead++;
    net += r.bk-START; wag += r.wagered; hands += r.played; dd += r.maxDD;
  }
  ends.sort((a,b)=>a-b);
  const mean = ends.reduce((a,b)=>a+b,0)/ends.length;
  console.log('   ' + name.padEnd(24)
    + mean.toFixed(0).padStart(10)
    + pct(ends,0.5).toFixed(0).padStart(9)
    + pct(ends,0.05).toFixed(0).padStart(10)
    + pct(ends,0.95).toFixed(0).padStart(11)
    + (ruin/SESSIONS*100).toFixed(1).padStart(7) + '%'
    + (ahead/SESSIONS*100).toFixed(1).padStart(7) + '%'
    + ((net/wag*100>=0?'+':'') + (net/wag*100).toFixed(3) + '%').padStart(11));
}
console.log('\n   EV/hand is per unit wagered. Ruin = bankroll fell below one table minimum.');
