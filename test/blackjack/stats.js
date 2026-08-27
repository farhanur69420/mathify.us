// Standalone check of the statistics helpers before they go in the page.
function lgamma(x){
  const g=[676.5203681218851,-1259.1392167224028,771.32342877765313,
           -176.61502916214059,12.507343278686905,-0.13857109526572012,
           9.9843695780195716e-6,1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI/Math.sin(Math.PI*x)) - lgamma(1-x);
  x -= 1;
  let a = 0.99999999999980993; const t = x + 7.5;
  for (let i=0;i<8;i++) a += g[i]/(x+i+1);
  return 0.5*Math.log(2*Math.PI) + (x+0.5)*Math.log(t) - t + Math.log(a);
}
function gser(a,x){
  let sum=1/a, del=sum, ap=a;
  for (let n=0;n<800;n++){ ap++; del *= x/ap; sum += del;
    if (Math.abs(del) < Math.abs(sum)*1e-14) break; }
  return sum*Math.exp(-x + a*Math.log(x) - lgamma(a));
}
function gcf(a,x){
  const FPMIN=1e-300, EPS=1e-14;
  let b=x+1-a, c=1/FPMIN, d=1/b, h=d;
  for (let i=1;i<=800;i++){
    const an=-i*(i-a);
    b+=2; d=an*d+b; if (Math.abs(d)<FPMIN) d=FPMIN;
    c=b+an/c;       if (Math.abs(c)<FPMIN) c=FPMIN;
    d=1/d; const del=d*c; h*=del;
    if (Math.abs(del-1)<EPS) break;
  }
  return Math.exp(-x + a*Math.log(x) - lgamma(a))*h;
}
function gammaQ(a,x){ if (x<=0) return 1; return x < a+1 ? 1-gser(a,x) : gcf(a,x); }
function chiSqP(chi2, df){ return Math.max(0, Math.min(1, gammaQ(df/2, chi2/2))); }
function erfc(x){
  const z=Math.abs(x), t=2/(2+z), ty=4*t-2;
  const cof=[-1.3026537197817094,6.4196979235649026e-1,1.9476473204185836e-2,
    -9.561514786808631e-3,-9.46595344482036e-4,3.66839497852761e-4,
    4.2523324806907e-5,-2.0278578112534e-5,-1.624290004647e-6,
    1.303655835580e-6,1.5626441722e-8,-8.5238095915e-8,6.529054439e-9,
    5.059343495e-9,-9.91364156e-10,-2.27365122e-10,9.6467911e-11];
  let d=0,dd=0;
  for (let j=cof.length-1;j>0;j--){ const tmp=d; d=ty*d-dd+cof[j]; dd=tmp; }
  const ans=t*Math.exp(-z*z + 0.5*(cof[0]+ty*d)-dd);
  return x>=0 ? ans : 2-ans;
}
const twoSided = z => erfc(Math.abs(z)/Math.SQRT2);

console.log('--- chi-square upper tail, df=9 (reference values) ---');
const ref9 = { 3.325:0.950, 4.168:0.900, 8.343:0.500, 14.684:0.100, 16.919:0.050, 21.666:0.010, 27.877:0.001 };
for (const k in ref9) console.log('  chi2='+String(k).padStart(7)+'  ours '+chiSqP(+k,9).toFixed(4)+'   expected '+ref9[k].toFixed(4));
console.log('--- chi-square df=1 ---');
for (const [k,v] of [[3.841,0.05],[6.635,0.01],[10.828,0.001]])
  console.log('  chi2='+String(k).padStart(7)+'  ours '+chiSqP(k,1).toFixed(4)+'   expected '+v);
console.log('--- two-sided normal p ---');
for (const [z,v] of [[1,0.3173],[1.96,0.0500],[2.576,0.0100],[3,0.0027],[3.291,0.0010]])
  console.log('  z='+String(z).padStart(6)+'  ours '+twoSided(z).toFixed(4)+'   expected '+v);

// Calibration: simulate fair 8-deck shoes and confirm the flag rate matches alpha.
const PD=[4,4,4,4,4,4,4,4,4,16];
function fairShoe(d){ const s=[]; for(let i=0;i<10;i++) for(let k=0;k<d*PD[i];k++) s.push(i);
  for(let i=s.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[s[i],s[j]]=[s[j],s[i]];} return s; }
function auditLive(obs,n,decks){
  const N=52*decks; let chi=0;
  for(let i=0;i<10;i++){ const E=n*PD[i]/52; chi += (obs[i]-E)*(obs[i]-E)/E; }
  const chiC = chi*(N-1)/Math.max(N-n,1);
  return chiSqP(chiC,9);
}
for (const n of [60,120,208]){
  let flag05=0, flag01=0, flag001=0; const T=20000;
  for(let t=0;t<T;t++){
    const s=fairShoe(8), obs=new Array(10).fill(0);
    for(let k=0;k<n;k++) obs[s[k]]++;
    const p=auditLive(obs,n,8);
    if(p<0.05)flag05++; if(p<0.01)flag01++; if(p<0.001)flag001++;
  }
  console.log('fair 8-deck, n='+String(n).padStart(3)+' cards seen  ->  flagged at p<.05: '
    +(flag05/T*100).toFixed(2)+'%   p<.01: '+(flag01/T*100).toFixed(2)+'%   p<.001: '+(flag001/T*100).toFixed(3)+'%');
}
// Power: a shoe with 25% of its tens quietly removed.
function riggedShoe(d,frac){
  const s=fairShoe(d); const out=[]; let drop=Math.round(d*16*frac);
  for(const c of s){ if(c===9&&drop>0){drop--;continue;} out.push(c); }
  for(let i=out.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
for (const frac of [0.10,0.25]){
  let hit=0; const T=5000, n=120;
  for(let t=0;t<T;t++){ const s=riggedShoe(8,frac), obs=new Array(10).fill(0);
    for(let k=0;k<n;k++) obs[s[k]]++;
    if(auditLive(obs,n,8)<0.01) hit++; }
  console.log('shoe missing '+(frac*100)+'% of its tens, n=120  ->  caught at p<.01: '+(hit/T*100).toFixed(1)+'%');
}
