/* ────────────────────────────────────────────────────────────────────────────
   END-TO-END SIMULATION
   The dealer, the shoe, the payouts and the rules below are written from
   scratch and share no code with the engine. The ONLY thing that comes from
   the engine is the decision: evaluate(...).best.id, called exactly as the
   page calls it, on the same remaining-card multiset the page would build.
   ──────────────────────────────────────────────────────────────────────────── */
const C = require('./core.js');
const PD = [4,4,4,4,4,4,4,4,4,16];          // A,2..9,T per deck
const HV = [1,2,3,4,5,6,7,8,9,10];          // ace as 1

// ── independent hand arithmetic ──
function tot(cards){
  let h=0, ace=false;
  for (const c of cards){ h+=HV[c]; if(c===0) ace=true; }
  return (ace && h+10<=21) ? h+10 : h;
}
const soft = cards => { let h=0,a=false; for(const c of cards){h+=HV[c]; if(c===0)a=true;} return a && h+10<=21; };
const natural = cards => cards.length===2 && tot(cards)===21;

// ── independent shoe ──
function makeShoe(decks){
  const s=[];
  for(let i=0;i<10;i++) for(let k=0;k<decks*PD[i];k++) s.push(i);
  for(let i=s.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [s[i],s[j]]=[s[j],s[i]]; }
  return s;
}

// ── independent dealer ──
function dealerDraw(hand, shoe, h17){
  for(;;){
    const t = tot(hand);
    if (t > 21) return 22;
    if (t > 17) return t;
    if (t === 17 && !(h17 && soft(hand))) return 17;
    hand.push(shoe.pop());
  }
}

/* ── DECISION SOURCES ──────────────────────────────────────────────────────
   'engine'  : the shipped solver
   'chart'   : a hardcoded published 8-deck S17 DAS chart (independent control)
   'mimic'   : hit to 17, never double or split (known-bad control)
   ──────────────────────────────────────────────────────────────────────── */
const CH_HARD = { // player total -> dealer 2..9,T,A   (published 4-8 deck S17 DAS)
  5:'HHHHHHHHHH',6:'HHHHHHHHHH',7:'HHHHHHHHHH',8:'HHHHHHHHHH',9:'HDDDDHHHHH',
  10:'DDDDDDDDHH',11:'DDDDDDDDDH',12:'HHSSSHHHHH',13:'SSSSSHHHHH',14:'SSSSSHHHHH',
  15:'SSSSSHHHHH',16:'SSSSSHHHHH',17:'SSSSSSSSSS',18:'SSSSSSSSSS',19:'SSSSSSSSSS',
  20:'SSSSSSSSSS',21:'SSSSSSSSSS' };
const CH_SOFT = {
  13:'HHHDDHHHHH',14:'HHHDDHHHHH',15:'HHDDDHHHHH',16:'HHDDDHHHHH',17:'HDDDDHHHHH',
  18:'SDDDDSSHHH',19:'SSSSSSSSSS',20:'SSSSSSSSSS',21:'SSSSSSSSSS' };
const CH_PAIR = { // rank index -> dealer 2..9,T,A
  0:'PPPPPPPPPP', 9:'SSSSSSSSSS', 8:'PPPPPSPPSS', 7:'PPPPPPPPPP', 6:'PPPPPPHHHH',
  5:'PPPPPHHHHH', 4:'DDDDDDDDHH', 3:'HHHPPHHHHH', 2:'PPPPPPHHHH', 1:'PPPPPPHHHH' };
const UPCOL = { 1:0,2:1,3:2,4:3,5:4,6:5,7:6,8:7,9:8,0:9 };   // rank index -> column

function chartDecide(hand, up, handCount, rules){
  const col = UPCOL[up];
  const t = tot(hand);
  const first = hand.length === 2;
  if (first && hand[0] === hand[1] && handCount < rules.maxHands){
    const a = CH_PAIR[hand[0]][col];
    if (a === 'P') return 'split';
    if (a === 'D') return canDbl(t, hand, rules, false) ? 'double' : 'hit';
    if (a === 'S') return 'stand';
  }
  const row = soft(hand) ? CH_SOFT[t] : CH_HARD[Math.max(5,Math.min(21,t))];
  const a = row ? row[col] : 'S';
  if (a === 'D') return first && canDbl(t, hand, rules, false) ? 'double' : (t>=12?'stand':'hit');
  return a === 'S' ? 'stand' : 'hit';
}
function canDbl(t, hand, rules, isSplit){
  if (hand.length !== 2) return false;
  const spec = isSplit
    ? (rules.das ? ((!rules.dasOn||rules.dasOn==='same') ? rules.doubleOn : rules.dasOn) : null)
    : rules.doubleOn;
  if (spec === null) return false;
  if (spec === '9-11')  return t>=9 && t<=11;
  if (spec === '10-11') return t>=10 && t<=11;
  return true;
}

const cache = new Map();
let calls=0, hits=0;
function engineDecide(hand, up, handCount, rules, removed, isSplit, useCache){
  // Exactly the multiset the page's decisionCounts() would build in CSM mode.
  const counts = [];
  for (let i=0;i<10;i++) counts[i] = rules.decks*PD[i] - removed[i];
  let key;
  if (useCache){
    key = removed.join(',')+'|'+hand.slice().sort().join('')+'|'+up+'|'+handCount+'|'+(isSplit?1:0);
    calls++;
    const c = cache.get(key);
    if (c !== undefined){ hits++; return c; }
  }
  const r = C.evaluate(counts, rules, false,
    { cards:hand.slice(), doubled:false, done:false, split:isSplit }, up, handCount).best.id;
  if (useCache) cache.set(key, r);
  return r;
}

/* ── one round ─────────────────────────────────────────────────────────── */
/* One other seat, played on published basic strategy. Its results are
   irrelevant; only the cards it consumes matter, because those are what a
   counter at the table actually gets to see. */
function playOtherSeat(cards, up, shoe, rules, seeCard){
  const hands = [cards];
  for (let i=0;i<hands.length && i<4;i++){
    const h = hands[i];
    for(;;){
      if (h.length === 1){ const c = shoe.pop(); h.push(c); seeCard(c); }
      if (tot(h) >= 21) break;
      const act = chartDecide(h, up, hands.length, rules);
      if (act === 'stand' || act === 'surrender') break;
      if (act === 'split' && hands.length < rules.maxHands && h.length === 2 && h[0] === h[1]){
        const c = h.pop(); hands.splice(i+1, 0, [c]);
        const d = shoe.pop(); h.push(d); seeCard(d);
        continue;
      }
      const c = shoe.pop(); h.push(c); seeCard(c);
      if (act === 'double' || tot(h) > 21) break;
    }
  }
}

function playRound(shoe, rules, mode, removed, onDecision){
  const bet = 1;
  const seeCard = c => removed[c]++;
  // Seats acting before you: you see their draws before you decide. Seats after
  // you act later, so their draws are invisible at your decision point.
  const nBefore = rules.seatsBefore|0, nAfter = rules.seatsAfter|0;
  const before = [], after = [];
  for (let i=0;i<nBefore;i++) before.push([shoe.pop(), shoe.pop()]);
  const player = [shoe.pop(), shoe.pop()];
  for (let i=0;i<nAfter;i++) after.push([shoe.pop(), shoe.pop()]);
  const up = shoe.pop(), hole = shoe.pop();
  // Every opening card at the table is face up in a shoe game.
  for (const h of before) { seeCard(h[0]); seeCard(h[1]); }
  seeCard(player[0]); seeCard(player[1]);
  for (const h of after)  { seeCard(h[0]); seeCard(h[1]); }
  seeCard(up);                                           // hole card is NOT seen

  const dealerBJ = natural([up,hole]);
  const playerBJ = natural(player);

  // Dealer peeks on an ace or ten before anyone acts.
  if (rules.hole === 'peek' && (up === 0 || up === 9) && dealerBJ){
    seeCard(hole);
    return { net: playerBJ ? 0 : -bet, wagered: bet, hands: 1, resolved:'dealerBJ' };
  }
  if (playerBJ){
    seeCard(hole);
    // A no-hole-card game still pushes two naturals against each other.
    return { net: dealerBJ ? 0 : bet*rules.bjPay, wagered: bet, hands: 1, resolved:'playerBJ' };
  }

  for (const h of before) playOtherSeat(h, up, shoe, rules, seeCard);

  // ── play the player's hand(s) ──
  let hands = [{ cards:player, bet, split:false, done:false, surrendered:false }];
  for (let i=0; i<hands.length; i++){
    const h = hands[i];
    for(;;){
      if (tot(h.cards) > 21) break;
      if (h.split && h.cards.length===1){ h.cards.push(shoe.pop()); seeCard(h.cards[1]); }
      if (h.split && h.cards[0]===0 && !rules.hitSplitAces) break;      // split aces: one card
      if (tot(h.cards) === 21) break;
      const act = onDecision(h.cards, up, hands.length, h.split, removed);
      if (act === 'stand') break;
      if (act === 'surrender'){ h.surrendered = true; break; }
      if (act === 'split' && hands.length < rules.maxHands
          && h.cards.length===2 && h.cards[0]===h.cards[1]
          && (h.cards[0]!==0 || rules.rsa || !h.split)){
        const c = h.cards.pop();
        h.split = true;
        hands.splice(i+1, 0, { cards:[c], bet, split:true, done:false, surrendered:false });
        h.cards.push(shoe.pop()); seeCard(h.cards[1]);
        continue;
      }
      if (act === 'double'){
        h.bet *= 2;
        h.cards.push(shoe.pop()); seeCard(h.cards[h.cards.length-1]);
        break;
      }
      h.cards.push(shoe.pop()); seeCard(h.cards[h.cards.length-1]);      // hit
    }
  }

  for (const h of after) playOtherSeat(h, up, shoe, rules, seeCard);

  // ── dealer ──
  const alive = hands.some(h => !h.surrendered && tot(h.cards) <= 21);
  const dh = [up, hole];
  const dFinal = alive ? dealerDraw(dh, shoe, rules.h17) : tot(dh);
  seeCard(hole);
  for (let k=2;k<dh.length;k++) seeCard(dh[k]);

  // ── resolve ──
  let net = 0, wagered = 0;
  for (const h of hands){
    wagered += h.bet;
    if (h.surrendered){ net -= h.bet/2; continue; }
    const pt = tot(h.cards);
    if (pt > 21){ net -= h.bet; continue; }
    if (dealerBJ && rules.hole !== 'peek'){ net -= (rules.hole==='obo' ? bet : h.bet); continue; }
    if (!alive || dFinal > 21 || pt > dFinal) net += h.bet;
    else if (pt < dFinal) net -= h.bet;
  }
  return { net, wagered, hands: hands.length, resolved:'played' };
}

module.exports = { makeShoe, playRound, playOtherSeat, engineDecide, chartDecide, tot, soft, PD,
                   stats: () => ({calls, hits, size:cache.size}) };
