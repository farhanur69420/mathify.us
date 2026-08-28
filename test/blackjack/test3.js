const C=require('./core.js');
const A=s=>({stand:'S',hit:'H',double:'D',split:'P',surrender:'R'})[s];
const PD=C.PERDECK, ups=[1,2,3,4,5,6,7,8,9,0], lbl=['2','3','4','5','6','7','8','9','10','A'];
function best(r,cards,up,hc=1){
  C.S.rules=r;
  const c=[]; for(let i=0;i<10;i++) c[i]=r.decks*PD[i];
  for(const x of cards) c[x]--; c[up]--;
  return A(C.evaluate(c,r,false,{cards:cards.slice(),doubled:false,done:false,split:false},up,hc).best.id);
}
const base={decks:8,h17:false,doubleOn:'any',maxHands:4,rsa:false,hitSplitAces:false,
            surrender:'none',bjPay:1.5,hole:'peek',pen:0.5,csm:true};
const DAS   = Object.assign({},base,{das:true,  dasOn:'same'});
const NODAS = Object.assign({},base,{das:false, dasOn:'same'});
const STAKE = Object.assign({},base,{das:true,  dasOn:'10-11'});

const pairs=[[1,'2,2'],[2,'3,3'],[3,'4,4'],[5,'6,6'],[6,'7,7'],[8,'9,9']];
for (const [name,r] of [['DAS any',DAS],['Stake (DAS 10-11)',STAKE],['no DAS',NODAS]]){
  console.log('\n=== '+name+'  (8D S17, split to 4) ===');
  console.log('      '+lbl.map(s=>s.padStart(3)).join(''));
  for (const [i,l] of pairs) console.log(l.padEnd(6)+ups.map(u=>best(r,[i,i],u).padStart(3)).join(''));
}
console.log('\n=== house edge from rule table ===');
const P = {
 'Stake Originals (8D S17 DAS10-11 split4)': STAKE,
 'Evolution Live (8D S17 noDAS split2 OBO)': Object.assign({},base,{das:false,dasOn:'same',maxHands:2,hole:'obo',csm:false}),
 'Pragmatic Live (8D S17 noDAS split2 peek)': Object.assign({},base,{das:false,dasOn:'same',maxHands:2,csm:false}),
 'Playtech/Ezugi (8D S17 DAS split4)': Object.assign({},base,{das:true,dasOn:'same',csm:false}),
};
for(const k in P) console.log(k.padEnd(44)+C.houseEdgePct(P[k]).toFixed(2)+'%   RTP '+(100-C.houseEdgePct(P[k])).toFixed(2)+'%');

console.log('\n=== speed: worst-case cells (fast mode) ===');
for (const [n,r] of [['Stake',STAKE],['Evolution',Object.assign({},base,{das:false,dasOn:'same',maxHands:2,hole:'obo'})]]){
  let t=Date.now(); for(let i=0;i<10;i++) best(r,[9,5],9); const h=(Date.now()-t)/10;
  t=Date.now(); for(let i=0;i<10;i++) best(r,[1,1],5); const p=(Date.now()-t)/10;
  t=Date.now(); for(let i=0;i<5;i++)  best(r,[0,0],0); const a=(Date.now()-t)/5;
  console.log(n.padEnd(10)+'16v10 '+h.toFixed(1)+'ms   2,2v7 '+p.toFixed(1)+'ms   A,Av A '+a.toFixed(1)+'ms');
}
console.log('\n=== full chart build cost (340 cells) ===');
const HC={5:[1,2],6:[1,3],7:[1,4],8:[1,5],9:[1,6],10:[1,7],11:[1,8],12:[9,1],13:[9,2],14:[9,3],15:[9,4],16:[9,5],17:[9,6],18:[9,7],19:[9,8]};
let t0=Date.now(), n=0;
for(const k in HC) for(const u of ups){ best(STAKE,HC[k],u); n++; }
for(let x=1;x<=8;x++) for(const u of ups){ best(STAKE,[0,x],u); n++; }
for(let i=0;i<10;i++) for(const u of ups){ best(STAKE,[i,i],u); n++; }
console.log(n+' cells in '+(Date.now()-t0)+'ms total');
