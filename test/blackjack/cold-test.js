/* Worst realistic case: a mid-range phone, opened at the table, first hand
   entered while the background chart and edge enumeration are still running. */
const { chromium } = require('playwright');
const PAGE = 'file:///home/user/mathify.us/public/explore/blackjack-engine/index.html';

(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  console.log('COLD START, first hand entered immediately, 600ms between taps\n');
  console.log('  CPU      mode        scenario                       to decision   result');
  for (const rate of [1, 4, 6]){
    for (const mode of ['csm','live']){
      const pg = await b.newPage({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
      const cdp = await pg.context().newCDPSession(pg);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      await pg.goto(PAGE);
      await pg.waitForTimeout(250);
      await pg.click(`.mode-opt[data-mode="${mode}"]`);
      await pg.click('#su-go');
      // NO settle time: start tapping the instant the UI appears, while the
      // chart and the exact-edge enumeration are both still churning.
      const t0 = Date.now();
      for (const c of [9,7,7]){                      // dealer 10, you 8+8 (pair: worst compute)
        await pg.click(`.key[data-r="${c}"]`);
        await pg.waitForTimeout(600);
      }
      let act=null, s=Date.now();
      while (!act && Date.now()-s < 15000){
        act = await pg.evaluate(() => { const t=document.getElementById('rec-action').textContent.trim();
          return t && t!=='—' ? t : null; });
      }
      const ms = Date.now()-t0-600;
      const busy = await pg.evaluate(() => ({
        chart: typeof chart!=='undefined' ? chart.queue.length : -1,
        edge: typeof edgeTask!=='undefined' ? edgeTask.queue.length : -1 }));
      console.log('  ' + (rate+'x').padEnd(9) + mode.padEnd(12)
        + 'pair 8,8 vs 10 (cold)'.padEnd(31)
        + (ms/1000).toFixed(2).padStart(8) + 's   ' + (act||'FAILED')
        + '   [background still queued: chart ' + busy.chart + ', edge ' + busy.edge + ']');
      await pg.close();
    }
  }
  console.log('\n  10.0s budget. 4x throttling ~ a mid-range Android; 6x ~ an older phone.');
  await b.close();
})();
