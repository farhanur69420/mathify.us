/* Same game, varying how many other people are at the table. Their cards feed
   the count exactly as the page's "Log other seats" does. */
const S = require('./sim.js');
const HILO=[-1,1,1,1,1,1,0,0,0,-1];
const BASE = { decks:6,h17:false,das:true,doubleOn:'any',dasOn:'same',maxHands:4,rsa:false,
               hitSplitAces:false,surrender:'late',bjPay:1.5,hole:'peek',pen:0.75,csm:false };
const N = +(process.argv[2]||60000);
const BUCKETS=[-99,-2,-1,0,1,2,3,4,99];
const bl = i => BUCKETS[i]===-99?'TC < -2':BUCKETS[i+1]===99?'TC >= +4'
  :'TC '+(BUCKETS[i]>=0?'+':'')+BUCKETS[i]+' to '+(BUCKETS[i+1]>=0?'+':'')+BUCKETS[i+1];

for (const [label, sb, sa] of [['heads-up (no other players)',0,0],
                               ['2 other players (1 before, 1 after)',1,1],
                               ['5 other players (3 before, 2 after)',3,2]]){
  const R = Object.assign({}, BASE, { seatsBefore:sb, seatsAfter:sa });
  const total = R.decks*52;
  let shoe=[], removed=new Array(10).fill(0), rc=0, dealt=0, shoes=0;
  const newShoe=()=>{ shoe=S.makeShoe(R.decks); removed=new Array(10).fill(0); rc=0; dealt=0; shoes++; };
  newShoe();
  const bk = BUCKETS.slice(0,-1).map(()=>({n:0,net:0,sq:0}));
  let net=0, sq=0, hands=0, cardsSeen=0;
  const t0=Date.now();
  for (let i=0;i<N;i++){
    if (dealt >= R.pen*total || shoe.length < 60){ newShoe(); }
    let before=0; for(let k=0;k<10;k++) before+=removed[k];
    const tc = rc/Math.max((total-before)/52, 0.25);
    const r = S.playRound(shoe, R, 'live', removed,
      (h,up,hc,isSplit,rem)=>S.engineDecide(h,up,hc,R,rem,isSplit,false));
    let after=0, nrc=0;
    for(let k=0;k<10;k++){ after+=removed[k]; nrc+=HILO[k]*removed[k]; }
    cardsSeen += after-before; rc=nrc; dealt=after;
    let bi=0; while (bi<bk.length-1 && tc>=BUCKETS[bi+1]) bi++;
    bk[bi].n++; bk[bi].net+=r.net; bk[bi].sq+=r.net*r.net;
    net+=r.net; sq+=r.net*r.net; hands++;
  }
  const ev=net/hands, sd=Math.sqrt(Math.max(0,sq/hands-ev*ev));
  console.log('\n══ ' + label);
  console.log('   ' + hands.toLocaleString() + ' hands, ' + shoes.toLocaleString() + ' shoes, '
    + (hands/shoes).toFixed(1) + ' hands per shoe, ' + (cardsSeen/hands).toFixed(1) + ' cards seen per round, '
    + ((Date.now()-t0)/1000).toFixed(0) + 's');
  console.log('   flat-bet EV/hand ' + (ev*100>=0?'+':'') + (ev*100).toFixed(3)
    + '%  (95% CI ±' + (1.96*sd/Math.sqrt(hands)*100).toFixed(3) + ')');
  console.log('   ' + 'bucket'.padEnd(13) + 'hands'.padStart(8) + '  share' + '   flat EV'.padStart(11));
  bk.forEach((b,i)=>{ if(!b.n) return;
    const e=b.net/b.n;
    console.log('   ' + bl(i).padEnd(13) + b.n.toLocaleString().padStart(8)
      + ' ' + (b.n/hands*100).toFixed(1).padStart(5) + '%'
      + ((e*100>=0?'+':'')+(e*100).toFixed(2)+'%').padStart(11)
      + (e>0?'  <= profitable':''));
  });
}
