const src = require('fs').readFileSync('stats.js','utf8').split('console.log')[0];
eval(src);
const twoSided = z => erfc(Math.abs(z)/Math.SQRT2);
const PD=[4,4,4,4,4,4,4,4,4,16];
const P0 = 16/52;   // ten-valued frequency in a fair shoe

// Targeted test: is the ten-valued group appearing at the right rate?
function tenZ(obsTens, n){ return (obsTens - n*P0)/Math.sqrt(n*P0*(1-P0)); }

// Smallest distortion the test can catch 80% of the time at alpha
function detectable(n, alpha){
  const zA = { 0.05:1.959964, 0.01:2.575829, 0.001:3.290527 }[alpha];
  return (zA + 0.841621)*Math.sqrt(P0*(1-P0)/n);
}
console.log('Minimum shift in the 30.77% ten frequency that the targeted test');
console.log('catches 80% of the time (two-sided):\n');
console.log('  cards      a=.05     a=.01    a=.001');
for (const n of [60,120,208,500,1000,5000,20000])
  console.log('  ' + String(n).padStart(6) + '  ' +
    [0.05,0.01,0.001].map(a => (detectable(n,a)*100).toFixed(2).padStart(8) + 'pt').join(''));

console.log('\nSimulated power, shoe dealing tens at a reduced rate, alpha=.01:');
console.log('  shortfall     n=120    n=500   n=2000  n=10000');
for (const rel of [0.05,0.10,0.25]){
  const p1 = P0*(1-rel);
  const row = [120,500,2000,10000].map(n => {
    let hit=0; const T=4000;
    for(let t=0;t<T;t++){
      let tens=0; for(let k=0;k<n;k++) if(Math.random()<p1) tens++;
      if (twoSided(tenZ(tens,n)) < 0.01) hit++;
    }
    return (hit/T*100).toFixed(1).padStart(8)+'%';
  });
  console.log('  ' + ((rel*100)+'% fewer').padEnd(12) + row.join(''));
}
console.log('\nSame, but the omnibus 10-category chi-square (alpha=.01):');
function chiP(obs,n){ let chi=0; for(let i=0;i<10;i++){const E=n*PD[i]/52; chi+=(obs[i]-E)**2/E;} return chiSqP(chi,9); }
for (const rel of [0.10,0.25]){
  const row = [120,500,2000].map(n => {
    let hit=0; const T=2000;
    const w=PD.map((v,i)=> i===9 ? v*(1-rel) : v); const tot=w.reduce((a,b)=>a+b,0);
    for(let t=0;t<T;t++){
      const obs=new Array(10).fill(0);
      for(let k=0;k<n;k++){ let r=Math.random()*tot, i=0; while(r>w[i]){r-=w[i];i++;} obs[i]++; }
      if (chiP(obs,n) < 0.01) hit++;
    }
    return (hit/T*100).toFixed(1).padStart(8)+'%';
  });
  console.log('  ' + ((rel*100)+'% fewer').padEnd(12) + row.join(''));
}
