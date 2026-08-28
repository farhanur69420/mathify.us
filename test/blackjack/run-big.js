const S = require('./sim.js');
const CORE = require('./core.js');
const STAKE = { decks:8,h17:false,das:true,doubleOn:'any',dasOn:'10-11',maxHands:4,rsa:false,
                hitSplitAces:false,surrender:'none',bjPay:1.5,hole:'peek',pen:0.5,csm:true };
const N = +(process.argv[2]||1000000);
const engine = (hand,up,hc,isSplit,removed) => S.engineDecide(hand,up,hc,STAKE,removed,isSplit,true);
const chart  = (hand,up,hc,isSplit) => S.chartDecide(hand,up,hc,STAKE);

let eNet=0,eSq=0, cNet=0,cSq=0, dNet=0,dSq=0, n=0;
const t0=Date.now();
for (let i=0;i<N;i++){
  const shoe = S.makeShoe(STAKE.decks);
  // Identical card sequence for both strategies: common random numbers.
  const rE = S.playRound(shoe.slice(), STAKE, 'csm', new Array(10).fill(0), engine);
  const rC = S.playRound(shoe.slice(), STAKE, 'csm', new Array(10).fill(0), chart);
  eNet+=rE.net; eSq+=rE.net*rE.net;
  cNet+=rC.net; cSq+=rC.net*rC.net;
  const d=rE.net-rC.net; dNet+=d; dSq+=d*d;
  n++;
  if (n % 200000 === 0) process.stdout.write('  ' + (n/1000) + 'k hands, ' + ((Date.now()-t0)/1000).toFixed(0) + 's\n');
}
const rep = (lbl,net,sq)=>{
  const ev=net/n, sd=Math.sqrt(Math.max(0,sq/n-ev*ev)), se=sd/Math.sqrt(n);
  console.log(lbl.padEnd(28) + (ev*100>=0?'+':'') + (ev*100).toFixed(4) + '%   95% CI ±'
    + (1.96*se*100).toFixed(4) + '   sd ' + sd.toFixed(3));
  return {ev,se};
};
console.log('\n' + n.toLocaleString() + ' hands, identical shoes dealt to both strategies\n');
console.log('Rule-table house edge for this rule set: -' + CORE.houseEdgePct(STAKE).toFixed(2) + '%\n');
const e=rep('ENGINE realised EV/hand', eNet,eSq);
const c=rep('published chart EV/hand', cNet,cSq);
const d=rep('paired difference (E-C)', dNet,dSq);
const st=S.stats();
console.log('\ncache ' + (st.hits/st.calls*100).toFixed(1) + '% hits over ' + st.calls.toLocaleString()
  + ' decisions, ' + st.size.toLocaleString() + ' distinct states');
console.log('total ' + ((Date.now()-t0)/1000/60).toFixed(1) + ' min');
