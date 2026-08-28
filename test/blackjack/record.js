/* Record a stream of real hands once. The betting scheme cannot change the
   cards or the decisions, and net scales linearly with the base bet, so every
   scheme can be replayed over the identical stream afterwards — exact pairing,
   and the expensive part runs only once. */
const S = require('./sim.js');
const HILO=[-1,1,1,1,1,1,0,0,0,-1];
const CONFIGS = {
  evo: { decks:8,h17:false,das:false,doubleOn:'any',dasOn:'same',maxHands:2,rsa:false,
         hitSplitAces:false,surrender:'none',bjPay:1.5,hole:'obo',pen:0.50,csm:false, base:-0.67 },
  casino: { decks:6,h17:false,das:true,doubleOn:'any',dasOn:'same',maxHands:4,rsa:false,
            hitSplitAces:false,surrender:'late',bjPay:1.5,hole:'peek',pen:0.75,csm:false, base:-0.33 }
};
const N = +(process.argv[3]||250000);
const key = process.argv[2];
const R = CONFIGS[key];
const total = R.decks*52;
let shoe=[], removed=new Array(10).fill(0), rc=0, dealt=0, shoeId=0;
const newShoe=()=>{ shoe=S.makeShoe(R.decks); removed=new Array(10).fill(0); rc=0; dealt=0; shoeId++; };
newShoe();
const tcs=new Float32Array(N), nets=new Float32Array(N), sid=new Int32Array(N), seen=new Int32Array(N);
const t0=Date.now();
for (let i=0;i<N;i++){
  if (dealt >= R.pen*total || shoe.length < 30){ newShoe(); }
  let before=0; for(let k=0;k<10;k++) before+=removed[k];
  const decksLeft = Math.max((total-before)/52, 0.25);
  tcs[i] = rc/decksLeft; sid[i] = shoeId; seen[i] = before;
  const r = S.playRound(shoe, R, 'live', removed,
    (hand,up,hc,isSplit,rem)=>S.engineDecide(hand,up,hc,R,rem,isSplit,false));
  nets[i] = r.net;                      // net per 1 unit of base bet
  let after=0, nrc=0;
  for(let k=0;k<10;k++){ after+=removed[k]; nrc+=HILO[k]*removed[k]; }
  rc=nrc; dealt=after;
  if ((i+1)%50000===0) process.stdout.write('  '+key+' '+((i+1)/1000)+'k  '+((Date.now()-t0)/1000).toFixed(0)+'s\n');
}
require('fs').writeFileSync('stream-'+key+'.json', JSON.stringify({
  key, base:R.base, n:N, tc:Array.from(tcs).map(x=>+x.toFixed(3)),
  net:Array.from(nets).map(x=>+x.toFixed(3)), shoe:Array.from(sid), seen:Array.from(seen)
}));
let s=0; for(let i=0;i<N;i++) s+=nets[i];
console.log(key+' done: '+N.toLocaleString()+' hands, flat EV '+(s/N*100).toFixed(3)+'%, '
  +shoeId+' shoes, '+((Date.now()-t0)/1000/60).toFixed(1)+' min');
