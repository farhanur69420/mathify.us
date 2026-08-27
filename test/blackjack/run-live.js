const S = require('./sim.js');
const CORE = require('./core.js');
const PD=[4,4,4,4,4,4,4,4,4,16];
const HILO=[-1,1,1,1,1,1,0,0,0,-1];

const CONFIGS = {
  'Evolution 8D, S17, no DAS, split 2, 50% pen': {
    decks:8,h17:false,das:false,doubleOn:'any',dasOn:'same',maxHands:2,rsa:false,
    hitSplitAces:false,surrender:'none',bjPay:1.5,hole:'obo',pen:0.50,csm:false },
  'Casino 6D, S17, DAS, late surrender, 75% pen': {
    decks:6,h17:false,das:true,doubleOn:'any',dasOn:'same',maxHands:4,rsa:false,
    hitSplitAces:false,surrender:'late',bjPay:1.5,hole:'peek',pen:0.75,csm:false }
};
// A conventional 1-12 ramp. Deliberately not the page's Kelly function, so the
// count itself is what is being tested rather than a bankroll setting.
function spread(tc){ return tc < 1 ? 1 : tc < 2 ? 2 : tc < 3 ? 4 : tc < 4 ? 8 : 12; }
const BUCKETS = [-99,-2,-1,0,1,2,3,4,99];
const bLabel = i => {
  const lo=BUCKETS[i], hi=BUCKETS[i+1];
  if (lo===-99) return 'TC < -2';
  if (hi===99)  return 'TC >= +4';
  return 'TC ' + (lo>=0?'+':'') + lo + ' to ' + (hi>=0?'+':'') + hi;
};

const N = +(process.argv[2]||300000);
for (const [name, R] of Object.entries(CONFIGS)){
  const total = R.decks*52;
  let shoe=[], removed=new Array(10).fill(0), rc=0, dealt=0;
  const newShoe = () => { shoe=S.makeShoe(R.decks); removed=new Array(10).fill(0); rc=0; dealt=0; };
  newShoe();

  const bk = BUCKETS.slice(0,-1).map(()=>({n:0,net:0,sq:0,wag:0,wnet:0}));
  let flatNet=0, flatSq=0, rampNet=0, rampWag=0, hands=0, shoes=1;
  const t0=Date.now();

  for (let i=0;i<N;i++){
    if (dealt >= R.pen*total){ newShoe(); shoes++; }
    const before = removed.reduce((a,b)=>a+b,0);
    const decksLeft = Math.max((total-before)/52, 0.25);
    const tc = rc/decksLeft;
    const bet = spread(tc);

    const decide = (hand,up,hc,isSplit,rem) => S.engineDecide(hand,up,hc,R,rem,isSplit,false);
    const r = S.playRound(shoe, R, 'live', removed, decide);

    // update the running count from whatever the round exposed
    let after = 0;
    for (let k=0;k<10;k++) after += removed[k];
    rc = 0; for (let k=0;k<10;k++) rc += HILO[k]*removed[k];
    dealt = after;

    let bi=0; while (bi<bk.length-1 && tc >= BUCKETS[bi+1]) bi++;
    bk[bi].n++; bk[bi].net += r.net; bk[bi].sq += r.net*r.net;
    bk[bi].wag += bet; bk[bi].wnet += bet*r.net;
    flatNet += r.net; flatSq += r.net*r.net;
    rampNet += bet*r.net; rampWag += bet;
    hands++;
    if (shoe.length < 30){ newShoe(); shoes++; }
  }
  const fev=flatNet/hands, fsd=Math.sqrt(Math.max(0,flatSq/hands-fev*fev)), fse=fsd/Math.sqrt(hands);
  console.log('\n══ ' + name);
  console.log('   rule-table house edge -' + CORE.houseEdgePct(R).toFixed(2)
    + '%   |   ' + hands.toLocaleString() + ' hands over ' + shoes.toLocaleString() + ' shoes   |   '
    + ((Date.now()-t0)/1000).toFixed(0) + 's');
  console.log('   flat-bet realised EV/hand   ' + (fev*100>=0?'+':'') + (fev*100).toFixed(3)
    + '%  (95% CI ±' + (1.96*fse*100).toFixed(3) + ')');
  console.log('   1-12 ramp, per unit wagered ' + (rampNet/rampWag*100>=0?'+':'')
    + (rampNet/rampWag*100).toFixed(3) + '%   profit/hand ' + (rampNet/hands).toFixed(4) + ' units');
  console.log('   realised EV by true count at the start of the round:');
  console.log('   ' + 'bucket'.padEnd(14) + 'hands'.padStart(9) + '   share' + '  flat EV/hand'.padStart(15) + '   95% CI');
  bk.forEach((b,i)=>{
    if (!b.n) return;
    const ev=b.net/b.n, sd=Math.sqrt(Math.max(0,b.sq/b.n-ev*ev)), ci=1.96*sd/Math.sqrt(b.n);
    const mark = ev>0 ? '  <= profitable' : '';
    console.log('   ' + bLabel(i).padEnd(14) + b.n.toLocaleString().padStart(9)
      + '  ' + (b.n/hands*100).toFixed(1).padStart(5) + '%'
      + ((ev*100>=0?'+':'') + (ev*100).toFixed(2) + '%').padStart(15)
      + '   ±' + (ci*100).toFixed(2) + mark);
  });
}
