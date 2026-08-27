const C = require('./core.js');
const A=(s)=>({stand:'S',hit:'H',double:'D',split:'P',surrender:'R'})[s];
const PD=C.PERDECK;
function fc(r){ const c=[]; for(let i=0;i<10;i++) c[i]=r.decks*PD[i]; return c; }
function best(r,cards,up,counts,handCount=1,split=false){
  const c = counts || fc(r);
  const cc=c.slice();
  for (const x of cards) cc[x]--;
  cc[up]--;
  return A(C.evaluate(cc, r, false, {cards:cards.slice(),doubled:false,done:false,split,surrendered:false}, up, handCount).best.id);
}
const ups=[1,2,3,4,5,6,7,8,9,0], lbl=['2','3','4','5','6','7','8','9','10','A'];

// ---- H17 + late surrender, 6 decks ----
const H17={decks:6,h17:true,das:true,doubleOn:'any',maxHands:4,rsa:true,hitSplitAces:false,
           surrender:'late',bjPay:1.5,hole:'peek',pen:0.75,csm:false};
console.log('=== 6D H17 DAS RSA LS ===');
console.log('      '+lbl.map(s=>s.padStart(3)).join(''));
const rows={ '11':[1,8], '15':[9,4], '16':[9,5], '17':[9,6], 'A,7':[0,6], 'A,8':[0,7], '8,8':[7,7] };
for(const k in rows) console.log(k.padEnd(6)+ups.map(u=>best(H17,rows[k],u).padStart(3)).join(''));

// ---- count deviations: 16 v 10, 15 v 10, 12 v 3, 10 v 10, insurance ----
const S17={decks:6,h17:false,das:true,doubleOn:'any',maxHands:4,rsa:false,hitSplitAces:false,
           surrender:'none',bjPay:1.5,hole:'peek',pen:0.75,csm:false};
console.log('\n=== Deviations: remove low cards to push the true count up ===');
function shoeAtTC(r, targetTC){
  // remove 2..6 (or 10s for negative) until Hi-Lo TC ~ target
  const c=fc(r); const tags=[-1,1,1,1,1,1,0,0,0,-1];
  let rc=0, seen=0;
  const order = targetTC>0 ? [1,2,3,4,5] : [9,0];
  let k=0;
  while(true){
    const left = 52*r.decks - seen;
    const tc = rc/(left/52);
    if (targetTC>0 ? tc>=targetTC : tc<=targetTC) break;
    if (left < 60) break;
    const idx=order[k%order.length]; k++;
    if(!c[idx]) continue;
    c[idx]--; seen++; rc += -tags[idx]*-1===0?0:0; rc += tags[idx]; // removing a card shifts count by +tag
  }
  return {c, tc: rc/((52*r.decks-seen)/52)};
}
for (const t of [0,2,3,4,5,6]){
  const {c,tc}=shoeAtTC(S17,t);
  const r16 = best(S17,[9,5],9,c), r15=best(S17,[9,4],9,c), r12=best(S17,[9,1],2,c),
        r10 = best(S17,[1,7],9,c), r9=best(S17,[1,6],1,c);
  console.log('TC '+tc.toFixed(1).padStart(5)+'  16v10='+r16+'  15v10='+r15+'  12v3='+r12+'  10v10='+r10+'  9v2='+r9);
}
for (const t of [-1,-3,-5]){
  const {c,tc}=shoeAtTC(S17,t);
  console.log('TC '+tc.toFixed(1).padStart(5)+'  13v2='+best(S17,[9,2],1,c)+'  12v4='+best(S17,[9,1],3,c)+'  13v3='+best(S17,[9,2],2,c));
}

// ---- ENHC / OBO effect ----
const OBO=Object.assign({},S17,{hole:'obo',das:false,maxHands:2});
const ENHC=Object.assign({},S17,{hole:'enhc',das:false,maxHands:2});
console.log('\n=== No-hole-card: 11 vs 10, 8,8 vs 10, 11 vs A ===');
for (const [n,r] of [['peek',Object.assign({},S17,{das:false,maxHands:2})],['obo',OBO],['enhc',ENHC]])
  console.log(n.padEnd(6)+' 11v10='+best(r,[1,8],9)+'  8,8v10='+best(r,[7,7],9)+'  11vA='+best(r,[1,8],0)+'  8,8vA='+best(r,[7,7],0));

// ---- timing ----
console.log('\n=== timing (fast mode) ===');
let t0=Date.now(); for(let i=0;i<20;i++) best(S17,[9,5],9); console.log('hard 16 v 10: '+((Date.now()-t0)/20).toFixed(1)+' ms');
t0=Date.now(); for(let i=0;i<10;i++) best(S17,[1,1],5); console.log('pair 2,2 v 7: '+((Date.now()-t0)/10).toFixed(1)+' ms');
t0=Date.now(); for(let i=0;i<5;i++) best(S17,[0,0],0); console.log('pair A,A v A: '+((Date.now()-t0)/5).toFixed(1)+' ms');
