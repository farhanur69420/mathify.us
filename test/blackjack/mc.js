const C=require('./core.js');
const R={decks:8,h17:false,das:true,doubleOn:'any',maxHands:4,rsa:false,hitSplitAces:false,
         surrender:'none',bjPay:1.5,hole:'peek',pen:0.5,csm:false};
const HARDV=[1,2,3,4,5,6,7,8,9,10], PD=C.PERDECK;

function solverEV(cards,up,id){
  const c=[]; for(let i=0;i<10;i++) c[i]=R.decks*PD[i];
  for(const x of cards) c[x]--; c[up]--;
  const r=C.evaluate(c,R,false,{cards:cards.slice(),doubled:false,done:false,split:false},up,1);
  const a=r.acts.find(a=>a.id===id); return a.ev;
}
// ---- independent simulator ----
function mkShoe(remove){ const s=[]; for(let i=0;i<10;i++) for(let k=0;k<R.decks*PD[i];k++) s.push(i);
  for(const x of remove){ const j=s.indexOf(x); s.splice(j,1); } return s; }
function draw(s){ const j=(Math.random()*s.length)|0; const v=s[j]; s[j]=s[s.length-1]; s.pop(); return v; }
function best(h,a){ return (a&&h+10<=21)?h+10:h; }
function dealerFinal(s,up){
  // hole card, rejecting naturals (peek rule => conditioned on no dealer BJ)
  let hard=HARDV[up], ace=up===0, hole;
  while(true){ hole=draw(s);
    const t=best(hard+HARDV[hole], ace||hole===0);
    if (t===21 && (up===0||up===9)) { s.push(hole); continue; } // reject natural, resample
    break; }
  hard+=HARDV[hole]; ace=ace||hole===0;
  while(true){ const t=best(hard,ace);
    if (t>21) return 22;
    if (t>17) return t;
    if (t===17 && !(R.h17 && ace && hard+10<=21)) return 17;
    const c=draw(s); hard+=HARDV[c]; ace=ace||c===0; }
}
function mcStand(cards,up,total,n){
  let sum=0;
  for(let k=0;k<n;k++){ const s=mkShoe(cards.concat([up])); const d=dealerFinal(s,up);
    sum += d>21 ? 1 : d>total ? -1 : d<total ? 1 : 0; }
  return sum/n;
}
function mcDouble(cards,up,hard,ace,n){
  let sum=0;
  for(let k=0;k<n;k++){ const s=mkShoe(cards.concat([up]));
    const c=draw(s); const h=hard+HARDV[c], a=ace||c===0, t=best(h,a);
    if(t>21){ sum-=2; continue; }
    const d=dealerFinal(s,up);
    sum += 2*(d>21?1:d>t?-1:d<t?1:0); }
  return sum/n;
}
const N=2000000;
console.log('case                 action    solver        MC     diff   (MC ±'+(1/Math.sqrt(N)).toFixed(4)+')');
const rows=[
  ['16(10,6) v 10',[9,5],9,'stand',16],
  ['12(10,2) v 4', [9,1],3,'stand',12],
  ['18(10,8) v 9', [9,7],8,'stand',18],
  ['17(10,7) v A', [9,6],0,'stand',17],
  ['13(10,3) v 6', [9,2],5,'stand',13],
  ['20(10,10) v A',[9,9],0,'stand',20],
];
for(const [n,cards,up,act,tot] of rows){
  const sv=solverEV(cards,up,act), mc=mcStand(cards,up,tot,N);
  console.log(n.padEnd(20)+act.padEnd(8)+sv.toFixed(4).padStart(9)+mc.toFixed(4).padStart(10)+(sv-mc).toFixed(4).padStart(9));
}
const drows=[
  ['11(6,5) v 10',[5,4],9,11,false],
  ['10(6,4) v 10',[5,3],9,10,false],
  ['9(4,5) v 3',  [3,4],2, 9,false],
  ['A,7 v 4',     [0,6],3, 8,true ],
];
for(const [n,cards,up,hard,ace] of drows){
  const sv=solverEV(cards,up,'double'), mc=mcDouble(cards,up,hard,ace,N);
  console.log(n.padEnd(20)+'double'.padEnd(8)+sv.toFixed(4).padStart(9)+mc.toFixed(4).padStart(10)+(sv-mc).toFixed(4).padStart(9));
}
