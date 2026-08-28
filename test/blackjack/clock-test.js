/* End-to-end: from the first card you tap to the decision on screen.
   Tap cadence is simulated at human speeds, not machine speed. */
const { chromium } = require('playwright');

const PAGE = 'file:///home/user/mathify.us/public/explore/blackjack-engine/index.html';
const CADENCE = { 'fast (300ms/tap)':300, 'typical (600ms/tap)':600, 'slow (1000ms/tap)':1000 };

(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const errs=[];
  const results = [];

  for (const [label, gap] of Object.entries(CADENCE)){
    const pg = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(PAGE);
    await pg.waitForTimeout(300);
    await pg.click('.mode-opt[data-mode="live"]');
    await pg.selectOption('#su-preset','evo-live');
    await pg.click('#su-go');
    await pg.waitForTimeout(400);

    const tap = async r => { await pg.click(`.key[data-r="${r}"]`); await pg.waitForTimeout(gap); };
    const decisionShown = () => pg.evaluate(() => {
      const t = document.getElementById('rec-action').textContent.trim();
      return t && t !== '—' ? t : null;
    });

    const scenarios = [
      ['dealer 10, you 9+7 (hard 16)',      [9,8,6]],
      ['dealer 6, you A+7 (soft 18)',       [5,0,6]],
      ['dealer 10, you 8+8 (pair - worst)', [9,7,7]],
      ['dealer A, you 10+10 (pair of tens)',[0,9,9]],
    ];
    for (const [name, cards] of scenarios){
      await pg.click('#c-new'); await pg.waitForTimeout(150);
      const t0 = Date.now();
      for (const c of cards) await tap(c);
      // wait until the decision is actually painted
      let act = null, spin = Date.now();
      while (!act && Date.now()-spin < 5000){ act = await decisionShown(); }
      const ms = Date.now()-t0 - gap;      // the final gap is idle time after the answer
      results.push([label, name, act, ms]);
    }
    // one more card after the decision -> next decision
    await pg.click('#c-new'); await pg.waitForTimeout(150);
    for (const c of [9,9,1]) await tap(c);          // dealer 10, you 10+2 = 12
    const t1 = Date.now();
    await pg.click('.key[data-r="2"]');             // hit a 3 -> 15
    let a2=null, s2=Date.now();
    while (!a2 && Date.now()-s2 < 5000){ a2 = await decisionShown(); }
    results.push([label, 'one extra card after a decision', a2, Date.now()-t1]);
    await pg.close();
  }

  console.log('TIME FROM FIRST TAP TO DECISION ON SCREEN   (10.0s budget)\n');
  let worst = 0;
  let cur = '';
  for (const [cad, name, act, ms] of results){
    if (cad !== cur){ console.log('  ' + cad); cur = cad; }
    worst = Math.max(worst, ms);
    const bar = '#'.repeat(Math.round(ms/1000*10));
    console.log('    ' + name.padEnd(36) + (ms/1000).toFixed(2).padStart(6) + 's  '
      + (act||'FAILED').padEnd(9) + ' ' + bar);
  }
  console.log('\n  worst observed: ' + (worst/1000).toFixed(2) + 's   headroom: '
    + ((10000-worst)/1000).toFixed(2) + 's');
  console.log(errs.length ? '\nERRORS: '+errs.join(' | ') : '\nno page errors');
  await b.close();
})();
