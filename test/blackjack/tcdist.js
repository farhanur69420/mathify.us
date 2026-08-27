/* Analytic true-count distribution, checked against the recorded streams.
   With n of N cards seen, the Hi-Lo running count is a sum of n tags drawn
   without replacement: mean 0, variance n*s2*(N-n)/(N-1) with s2 = 40/52.
   TC = RC / ((N-n)/52), so Var(TC) = 52^2 * s2 * n / ((N-1)(N-n)). */
const S2 = 40/52;
function tcModel(decks, pen, betFn, baseEdgePct){
  const N = decks*52, maxN = Math.floor(pen*N);
  let eBet=0, eBet2=0, eProfit=0, w=0;
  for (let n=1;n<=maxN;n++){
    const varTC = 52*52*S2*n/((N-1)*(N-n));
    const sd = Math.sqrt(varTC);
    // integrate over the normal TC density in 0.25 steps
    for (let z=-4.5; z<=4.5; z+=0.05){
      const tc = z*sd;
      const dens = Math.exp(-z*z/2)*0.05;
      const bet = betFn(tc);
      const edge = (baseEdgePct + 0.5*tc)/100;
      eBet += dens*bet; eBet2 += dens*bet*bet; eProfit += dens*bet*edge; w += dens;
    }
  }
  return { avgBet:eBet/w, avgBet2:eBet2/w, profitPerHand:eProfit/w,
           sdPerHand: Math.sqrt(eBet2/w*1.32) };
}
const ramp = tc => tc<1?1:tc<2?2:tc<3?4:tc<4?8:12;

console.log('model vs simulation (1-12 count ramp)\n');
const cases = [
  ['Casino 6D 75% pen', 6, 0.75, -0.33, 0.0281, 3.87],
  ['Evolution 8D 50% pen', 8, 0.50, -0.67, -0.0070, 2.28]
];
for (const [name,d,pen,base,simProfit,simSd] of cases){
  const m = tcModel(d, pen, ramp, base);
  console.log(name);
  console.log('   avg bet          ' + m.avgBet.toFixed(3) + ' units');
  console.log('   profit/hand      model ' + (m.profitPerHand>=0?'+':'') + m.profitPerHand.toFixed(4)
    + '   simulated ' + (simProfit>=0?'+':'') + simProfit.toFixed(4));
  console.log('   sd/hand          model ' + m.sdPerHand.toFixed(2) + '   simulated ' + simSd.toFixed(2));
  const e = m.profitPerHand, v = m.sdPerHand*m.sdPerHand;
  if (e>0){
    console.log('   N0               ' + Math.round(v/(e*e)).toLocaleString() + ' hands');
    for (const B of [500,1000,2000,5000])
      console.log('   RoR at ' + String(B).padStart(5) + ' units  ' + (Math.exp(-2*e*B/v)*100).toFixed(1) + '%');
    console.log('   bankroll for 5% RoR   ' + Math.round(-v*Math.log(0.05)/(2*e)).toLocaleString() + ' units');
  } else console.log('   negative expectation: ruin is certain given enough hands');
  console.log();
}
