const C = require('./core.js');
const rules = { decks:6,h17:false,das:true,doubleOn:'any',maxHands:4,rsa:false,
                hitSplitAces:false,surrender:'none',bjPay:1.5,hole:'peek',pen:0.75,csm:false };
const A=(s)=>({stand:'S',hit:'H',double:'D',split:'P',surrender:'R'})[s];

function solve(cards, up, handCount=1, split=false){
  const counts = C.freshCounts.call(null);
  // freshCounts uses S.rules.decks -> set it
  return null;
}
C.S.rules = rules;
function fc(){ const c=[]; for(let i=0;i<10;i++) c[i]=rules.decks*C.PERDECK[i]; return c; }
function best(cards, up, handCount=1, split=false){
  const counts = fc();
  for (const r of cards) counts[r]--;
  counts[up]--;
  const hand = { cards:cards.slice(), doubled:false, done:false, split, surrendered:false };
  return A(C.evaluate(counts, rules, false, hand, up, handCount).best.id);
}
const ups=[1,2,3,4,5,6,7,8,9,0]; // idx: 2..9,10,A  -> display order 2..A
const upLabel=['2','3','4','5','6','7','8','9','10','A'];

console.log('HARD  ' + upLabel.map(s=>s.padStart(3)).join(''));
const hards={8:[1,5],9:[1,6],10:[1,7],11:[1,8],12:[9,1],13:[9,2],14:[9,3],15:[9,4],16:[9,5],17:[9,6]};
for (const t of Object.keys(hards)){
  console.log(String(t).padEnd(6)+ups.map(u=>best(hards[t],u).padStart(3)).join(''));
}
console.log('\nSOFT  ' + upLabel.map(s=>s.padStart(3)).join(''));
for (let x=1;x<=8;x++){
  const cards=[0,x];
  console.log(('A,'+(x+1)).padEnd(6)+ups.map(u=>best(cards,u).padStart(3)).join(''));
}
console.log('\nPAIR  ' + upLabel.map(s=>s.padStart(3)).join(''));
const pairs=[[0,'A,A'],[9,'T,T'],[8,'9,9'],[7,'8,8'],[6,'7,7'],[5,'6,6'],[4,'5,5'],[3,'4,4'],[2,'3,3'],[1,'2,2']];
for (const [i,l] of pairs){
  console.log(l.padEnd(6)+ups.map(u=>best([i,i],u).padStart(3)).join(''));
}
