/* EXACT house edge by full enumeration of the initial deal.
   No simulation: every (player card, player card, dealer upcard) is enumerated
   with its exact probability, the hand is solved by the shipped solver, and the
   dealer-natural branches are handled explicitly. Precision is the solver's. */
const C = require('./core.js');
const PD = [4,4,4,4,4,4,4,4,4,16];
const RK = ['A','2','3','4','5','6','7','8','9','T'];
const HV = [1,2,3,4,5,6,7,8,9,10];

function edge(R){
  const full = []; for (let i=0;i<10;i++) full[i] = R.decks*PD[i];
  const N0 = full.reduce((a,b)=>a+b,0);
  const memo = new Map();
  let ev = 0;

  for (let a=0;a<10;a++){
    if (!full[a]) continue;
    const pA = full[a]/N0;
    for (let b=0;b<10;b++){
      const c1 = full.slice(); c1[a]--;
      if (!c1[b]) continue;
      const pB = c1[b]/(N0-1);
      for (let u=0;u<10;u++){
        const c2 = c1.slice(); c2[b]--;
        if (!c2[u]) continue;
        const pU = c2[u]/(N0-2);
        const p = pA*pB*pU;
        const counts = c2.slice(); counts[u]--;
        const N = N0-3;

        const key = (a<b?a+''+b:b+''+a) + '|' + u;
        let e = memo.get(key);
        if (e === undefined){
          const hard = HV[a]+HV[b], ace = (a===0||b===0);
          const total = (ace && hard+10<=21) ? hard+10 : hard;
          const playerBJ = (total === 21);
          // Probability the dealer's hole card completes a natural.
          const bjHole = u===0 ? 9 : (u===9 ? 0 : -1);
          const pDBJ = bjHole < 0 ? 0 : counts[bjHole]/N;

          let evNoBJ;
          if (playerBJ) evNoBJ = R.bjPay;
          else evNoBJ = C.evaluate(counts, R, false,
                { cards:[a,b], doubled:false, done:false, split:false }, u, 1).best.ev;

          if (R.hole === 'peek'){
            // Dealer peeks: the natural branch is settled before anyone acts.
            e = pDBJ*(playerBJ ? 0 : -1) + (1-pDBJ)*evNoBJ;
          } else {
            // No hole card: evaluate() already folds the natural risk into its
            // per-action EV, so only the player's own natural needs handling.
            e = playerBJ ? pDBJ*0 + (1-pDBJ)*R.bjPay : evNoBJ;
          }
          memo.set(key, e);
        }
        ev += p*e;
      }
    }
  }
  return -ev*100;   // house edge, %
}

const base = { decks:8,h17:false,das:true,doubleOn:'any',dasOn:'same',maxHands:4,rsa:false,
               hitSplitAces:false,surrender:'none',bjPay:1.5,hole:'peek',pen:0.5,csm:true };
const V = (o) => Object.assign({}, base, o);
const CANDIDATES = {
  'A  8D S17, DAS any, split 4          ': V({}),
  'B  8D S17, NO DAS, split 4           ': V({das:false}),
  'C  8D S17, DAS 10-11 only, split 4   ': V({dasOn:'10-11'}),
  'D  8D S17, DAS 9-11 only, split 4    ': V({dasOn:'9-11'}),
  'E  8D S17, DAS any, split 2          ': V({maxHands:2}),
  'F  8D S17, NO DAS, split 2           ': V({das:false,maxHands:2}),
  'G  8D H17, DAS any, split 4          ': V({h17:true}),
  'H  8D H17, NO DAS, split 4           ': V({h17:true,das:false}),
  'I  8D S17, double 9-11, DAS any      ': V({doubleOn:'9-11'}),
  'J  8D S17, double 10-11, DAS any     ': V({doubleOn:'10-11'}),
  'K  6D S17, DAS any, split 4          ': V({decks:6}),
  'L  8D S17, DAS any, split 4, RSA     ': V({rsa:true}),
};
console.log('Exact house edge by enumerating every opening deal.');
console.log('Stake advertises 99.43% RTP  =>  0.5700% house edge\n');
console.log('  rule set                                exact      RTP     vs 0.5700   rule-table');
for (const [name,R] of Object.entries(CANDIDATES)){
  const t0=Date.now();
  const e = edge(R);
  const d = e - 0.57;
  console.log('  ' + name + (e.toFixed(4)+'%').padStart(9)
    + ((100-e).toFixed(4)+'%').padStart(10)
    + ((d>=0?'+':'') + d.toFixed(4)).padStart(11)
    + (C.houseEdgePct(R).toFixed(2)+'%').padStart(11)
    + (Math.abs(d) < 0.005 ? '   <<< MATCH' : ''));
}
