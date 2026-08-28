const S = require('./sim.js');
const STAKE = { decks:8,h17:false,das:true,doubleOn:'any',dasOn:'10-11',maxHands:4,rsa:false,
                hitSplitAces:false,surrender:'none',bjPay:1.5,hole:'peek',pen:0.5,csm:true };

function run(label, decider, n, rules){
  let net=0, sq=0, hands=0, wagered=0, splits=0, dbl=0, bj=0;
  const t0=Date.now();
  for (let i=0;i<n;i++){
    const shoe = S.makeShoe(rules.decks);      // fresh shoe every hand: CSM
    const removed = new Array(10).fill(0);
    const r = S.playRound(shoe, rules, 'csm', removed, decider(rules));
    net += r.net; sq += r.net*r.net; hands++; wagered += r.wagered;
    if (r.hands>1) splits++;
    if (r.wagered > r.hands) dbl++;
    if (r.resolved==='playerBJ') bj++;
  }
  const ev = net/hands;
  const sd = Math.sqrt(sq/hands - ev*ev);
  const se = sd/Math.sqrt(hands);
  console.log(label.padEnd(26)
    + 'EV/hand ' + (ev*100>=0?'+':'') + (ev*100).toFixed(3) + '%'
    + '  ±' + (se*100*1.96).toFixed(3)
    + '   sd ' + sd.toFixed(3)
    + '   split ' + (splits/hands*100).toFixed(1) + '%'
    + '  dbl ' + (dbl/hands*100).toFixed(1) + '%'
    + '  BJ ' + (bj/hands*100).toFixed(2) + '%'
    + '   ' + ((Date.now()-t0)/1000).toFixed(0) + 's');
  return {ev, se};
}
const N = +(process.argv[2]||50000);
console.log('Stake Originals rules: 8 decks, S17, double any two, DAS on 10-11 only,');
console.log('split to 4, split aces one card, BJ 3:2, dealer peeks, fresh shoe every hand.');
console.log('Rule-table house edge for this set: ' + require('./core.js').houseEdgePct(STAKE).toFixed(2) + '%\n');
console.log(N.toLocaleString() + ' hands per strategy, flat 1-unit bets:\n');

const engine = rules => (hand,up,hc,isSplit,removed) =>
  S.engineDecide(hand,up,hc,rules,removed,isSplit,true);
const chart  = rules => (hand,up,hc,isSplit) => S.chartDecide(hand,up,hc,rules);
const mimic  = rules => (hand) => S.tot(hand) < 17 ? 'hit' : 'stand';

const e = run('ENGINE (shipped solver)', engine, N, STAKE);
const c = run('control: published chart', chart, N, STAKE);
const m = run('control: mimic dealer',   mimic, N, STAKE);
const st = S.stats();
console.log('\ndecision cache: ' + st.hits.toLocaleString() + '/' + st.calls.toLocaleString()
  + ' hits (' + (st.hits/st.calls*100).toFixed(1) + '%), ' + st.size.toLocaleString() + ' distinct states solved');
const d = (e.ev-c.ev), dse = Math.sqrt(e.se**2 + c.se**2);
console.log('engine − chart: ' + (d*100>=0?'+':'') + (d*100).toFixed(3) + '% ± ' + (dse*100*1.96).toFixed(3) + ' (95% CI)');
