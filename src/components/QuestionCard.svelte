<script>
  import { onMount, tick } from 'svelte';

  export let q;        // question object
  export let boardKey; // e.g. 'dhaka'
  export let type;     // 'mcq' | 'cq'

  let open = false;
  let cardElement;

  const KEYS = ['ক', 'খ', 'গ', 'ঘ'];

  async function toggle() {
    open = !open;
    if (open) {
      await tick();
      renderMath();
    }
  }

  function renderMath() {
    if (!cardElement) return;
    if (window.MathJax?.typesetPromise) {
      MathJax.typesetPromise([cardElement]).catch(() => {});
    } else {
      // If MathJax isn't ready yet, try again in a bit
      setTimeout(renderMath, 200);
    }
  }

  onMount(() => {
    renderMath();
  });
</script>

<div class="qcard" class:open bind:this={cardElement}>
  <!-- HEADER -->
  <div class="qhdr" on:click={toggle} role="button" tabindex="0"
       on:keydown={(e) => e.key === 'Enter' && toggle()}>
    <span class="qnum" class:cqnum={type === 'cq'}>
      {type === 'mcq' ? `Q${q.n}` : `CQ${q.n}`}
    </span>
    <span class="qtype" class:tmc={type === 'mcq'} class:tcq={type === 'cq'}>
      {type === 'mcq' ? 'MCQ' : 'Creative'}
    </span>
    <div class="qtxt">
      {#if type === 'mcq'}
        <div class="qen">{@html q.en}</div>
        {#if q.bn}<div class="qbn bn">{@html q.bn}</div>{/if}
      {:else}
        <div class="qen"><strong>Stem:</strong> {@html q.stem}</div>
        {#if q.stemBn}<div class="qbn bn"><strong>উদ্দীপক:</strong> {@html q.stemBn}</div>{/if}
        <div class="qch">Chapter: {q.ch}</div>
      {/if}
    </div>
    <span class="ico" aria-hidden="true">▼</span>
  </div>

  <!-- MCQ OPTIONS -->
  {#if type === 'mcq'}
    <div class="opts">
      {#each q.opts as opt, i}
        <div class="opt" class:ok={i === q.ans}>
          <span class="opt-k">{KEYS[i]}.</span>
          <span>{@html opt}</span>
        </div>
      {/each}
    </div>
  {/if}

  <!-- SOLUTION PANEL -->
  {#if open}
    <div class="spanel">
      {#if type === 'mcq'}
        <!-- MCQ solution -->
        <div class="abadge">✓ Answer: {KEYS[q.ans]}</div>
        {#if q.viz}
          <div class="viz-wrap">
            <canvas width="260" height="155"
              use:drawCanvas={{ type: q.viz, data: q.vizData }}></canvas>
          </div>
        {/if}
        <div class="steps">
          {#each q.sol as s}
            {#if s.t}<div class="step"><span class="sn">{s.n || ''}</span><span>{@html s.t}</span></div>{/if}
            {#if s.m}<div class="mblk">\[{s.m}\]</div>{/if}
            {#if s.note}<div class="nbox">{@html s.note}</div>{/if}
          {/each}
        </div>
      {:else}
        <!-- CQ solution -->
        {#if q.viz}
          <div class="viz-wrap">
            <canvas width="270" height="160"
              use:drawCanvas={{ type: q.viz, data: q.vizData }}></canvas>
          </div>
        {/if}
        {#each q.parts as p, pi}
          <div class="cqpart">
            <div class="cqlbl">Part {p.l} <span class="cqm">{p.m} marks</span></div>
            <div class="cqq"><strong>Q:</strong> {@html p.q}</div>
            <div class="abadge">Solution</div>
            <div class="steps">
              {#each p.sol as s}
                {#if s.t}<div class="step"><span class="sn">{s.n || ''}</span><span>{@html s.t}</span></div>{/if}
                {#if s.m}<div class="mblk">\[{s.m}\]</div>{/if}
                {#if s.note}<div class="nbox">{@html s.note}</div>{/if}
              {/each}
            </div>
          </div>
          {#if pi < q.parts.length - 1}<hr class="hdiv" />{/if}
        {/each}
      {/if}
    </div>
  {/if}
</div>

<!-- Canvas visualizer action -->
<script context="module">
  export function drawCanvas(canvas, { type, data }) {
    if (!canvas || !type) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const teal = '#4ec9b0', amb = '#d4a94a', grn = '#5cb85c',
          mut = '#6b7280', rust = '#c25a3b', grid = '#252a38';

    ctx.clearRect(0, 0, W, H);

    if (type === 'triangle') {
      const { a = 3, b = 4, c = 5 } = data || {};
      const sc = Math.min((W - 60) / b, (H - 60) / a);
      const ox = 30, oy = H - 30;
      ctx.strokeStyle = teal; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + b*sc, oy);
      ctx.lineTo(ox + b*sc, oy - a*sc); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = 'rgba(78,201,176,.08)'; ctx.fill();
      ctx.strokeStyle = teal; ctx.lineWidth = 1.5;
      ctx.strokeRect(ox + b*sc - 10, oy - 10, 10, 10);
      ctx.fillStyle = amb; ctx.font = 'bold 11px Space Mono,monospace';
      ctx.fillText(b, ox + b*sc/2 - 8, oy + 16);
      ctx.fillText(a, ox + b*sc + 5, oy - a*sc/2 + 4);
      ctx.fillStyle = teal; ctx.fillText(c, ox + b*sc/2 - 18, oy - a*sc/2 - 8);

    } else if (type === 'venn') {
      const { A = 25, B = 20, AB = 10, total = 40 } = data || {};
      const cx1 = W*.35, cx2 = W*.65, cy = H*.48, r = H*.35;
      ctx.globalAlpha = .15;
      ctx.fillStyle = teal; ctx.beginPath(); ctx.arc(cx1, cy, r, 0, 2*Math.PI); ctx.fill();
      ctx.fillStyle = amb;  ctx.beginPath(); ctx.arc(cx2, cy, r, 0, 2*Math.PI); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = teal; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx1, cy, r, 0, 2*Math.PI); ctx.stroke();
      ctx.strokeStyle = amb;
      ctx.beginPath(); ctx.arc(cx2, cy, r, 0, 2*Math.PI); ctx.stroke();
      ctx.fillStyle = teal; ctx.font = 'bold 11px Space Mono,monospace';
      ctx.fillText('A='+A, cx1 - 18, cy);
      ctx.fillStyle = amb; ctx.fillText('B='+B, cx2 + 2, cy);
      ctx.fillStyle = grn; ctx.font = 'bold 10px Space Mono,monospace';
      ctx.fillText('∩='+AB, W/2 - 10, cy + 3);
      ctx.fillStyle = mut; ctx.font = '9px Space Mono,monospace';
      ctx.fillText('n='+total, W/2 - 12, H - 8);

    } else if (type === 'unitcircle') {
      const { angle = 30 } = data || {};
      const cx = W/2, cy = H/2, r = Math.min(W, H) * .35;
      const rad = angle * Math.PI / 180;
      ctx.strokeStyle = grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(20, cy); ctx.lineTo(W-20, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, 10); ctx.lineTo(cx, H-10); ctx.stroke();
      ctx.strokeStyle = teal; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2*Math.PI); ctx.stroke();
      const px = cx + r*Math.cos(-rad), py = cy + r*Math.sin(-rad);
      ctx.strokeStyle = amb; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
      ctx.setLineDash([3, 3]); ctx.strokeStyle = mut; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, py); ctx.lineTo(px, py); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = amb; ctx.beginPath(); ctx.arc(px, py, 3.5, 0, 2*Math.PI); ctx.fill();
      ctx.fillStyle = teal; ctx.font = '11px Space Mono,monospace';
      ctx.fillText('θ=' + angle + '°', cx + 6, cy - 6);

    } else if (type === 'numline') {
      const { points = [], highlights = [] } = data || {};
      const cy = H/2, pad = 30, range = 5;
      const sc = (W - 2*pad) / (2*range);
      ctx.strokeStyle = mut; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pad, cy); ctx.lineTo(W-pad, cy); ctx.stroke();
      for (let i = -range; i <= range; i++) {
        const x = W/2 + i*sc;
        ctx.strokeStyle = grid; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, cy-5); ctx.lineTo(x, cy+5); ctx.stroke();
        ctx.fillStyle = mut; ctx.font = '9px Space Mono'; ctx.textAlign = 'center';
        ctx.fillText(i, x, cy + 16);
      }
      points.forEach((p, i) => {
        const x = W/2 + p*sc;
        ctx.fillStyle = highlights[i] || teal;
        ctx.beginPath(); ctx.arc(x, cy, 5, 0, 2*Math.PI); ctx.fill();
        ctx.fillStyle = highlights[i] || teal; ctx.font = 'bold 10px Space Mono';
        ctx.fillText(p, x, cy - 10);
      });
      ctx.textAlign = 'left';

    } else if (type === 'coordplane') {
      const { points = [], lines = [] } = data || {};
      const cx = W/2, cy = H/2, sc = 20;
      ctx.strokeStyle = grid; ctx.lineWidth = .7;
      for (let i = -6; i <= 6; i++) {
        ctx.beginPath(); ctx.moveTo(cx+i*sc, 5); ctx.lineTo(cx+i*sc, H-5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, cy+i*sc); ctx.lineTo(W-5, cy+i*sc); ctx.stroke();
      }
      ctx.strokeStyle = mut; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(5, cy); ctx.lineTo(W-5, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, 5); ctx.lineTo(cx, H-5); ctx.stroke();
      lines.forEach(l => {
        ctx.strokeStyle = rust; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(cx+l[0][0]*sc, cy-l[0][1]*sc);
        ctx.lineTo(cx+l[1][0]*sc, cy-l[1][1]*sc); ctx.stroke();
        ctx.setLineDash([]);
      });
      points.forEach(p => {
        ctx.fillStyle = teal; ctx.beginPath(); ctx.arc(cx+p[0]*sc, cy-p[1]*sc, 4, 0, 2*Math.PI); ctx.fill();
        ctx.fillStyle = amb; ctx.font = 'bold 10px Space Mono';
        ctx.fillText(p[2] || `(${p[0]},${p[1]})`, cx+p[0]*sc+5, cy-p[1]*sc-4);
      });

    } else if (type === 'barchart') {
      const { labels = [], values = [], color = teal } = data || {};
      const n = labels.length, bw = (W - 50) / n - 5, maxv = Math.max(...values);
      ctx.strokeStyle = grid; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.moveTo(35, 8); ctx.lineTo(35, H-22); ctx.lineTo(W-8, H-22); ctx.stroke();
      values.forEach((v, i) => {
        const bh = (v/maxv) * (H - 42), x = 38 + i*(bw+5), y = H - 22 - bh;
        ctx.fillStyle = color + '33'; ctx.fillRect(x, y, bw, bh);
        ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, bw, bh);
        ctx.fillStyle = color; ctx.font = '9px Space Mono'; ctx.textAlign = 'center';
        ctx.fillText(v, x + bw/2, y - 3);
        ctx.fillStyle = mut; ctx.font = '8px Space Mono';
        ctx.fillText(labels[i], x + bw/2, H - 10);
      });
      ctx.textAlign = 'left';

    } else if (type === 'histogram') {
      const { labels = [], freq = [] } = data || {};
      const n = labels.length, bw = (W - 45) / n, maxf = Math.max(...freq);
      ctx.strokeStyle = grid; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.moveTo(35, 8); ctx.lineTo(35, H-22); ctx.lineTo(W-8, H-22); ctx.stroke();
      freq.forEach((f, i) => {
        const bh = (f/maxf)*(H-42), x = 36+i*bw, y = H-22-bh;
        ctx.fillStyle = teal + '33'; ctx.fillRect(x, y, bw, bh);
        ctx.strokeStyle = teal; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, bw, bh);
        ctx.fillStyle = teal; ctx.font = '9px Space Mono'; ctx.textAlign = 'center';
        ctx.fillText(f, x+bw/2, y-3);
        ctx.fillStyle = mut; ctx.font = '7px Space Mono';
        ctx.fillText(labels[i], x+bw/2, H-10);
      });
      ctx.textAlign = 'left';

    } else if (type === 'surd_numline') {
      const cy = H/2, pad = 20;
      const vals = [
        {v:1,l:'1'},{v:Math.SQRT2,l:'√2'},{v:Math.sqrt(3),l:'√3'},
        {v:2,l:'2'},{v:Math.sqrt(5),l:'√5'},{v:Math.sqrt(6),l:'√6'},
        {v:Math.sqrt(7),l:'√7'},{v:Math.sqrt(8),l:'2√2'},{v:3,l:'3'}
      ];
      const toX = v => pad + (v - 1) / 2 * (W - 2*pad);
      ctx.strokeStyle = mut; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pad, cy); ctx.lineTo(W-pad, cy); ctx.stroke();
      [1,1.5,2,2.5,3].forEach(n => {
        const x = toX(n);
        ctx.strokeStyle = grid; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, cy-5); ctx.lineTo(x, cy+5); ctx.stroke();
        ctx.fillStyle = mut; ctx.font = '9px Space Mono'; ctx.textAlign = 'center';
        ctx.fillText(n, x, cy+16);
      });
      vals.forEach((p, i) => {
        const x = toX(p.v), isInt = Number.isInteger(p.v);
        ctx.fillStyle = isInt ? mut : teal;
        ctx.beginPath(); ctx.arc(x, cy, isInt ? 4 : 3.5, 0, 2*Math.PI); ctx.fill();
        ctx.fillStyle = isInt ? mut : amb; ctx.font = 'bold 9px Space Mono'; ctx.textAlign = 'center';
        ctx.fillText(p.l, x, i % 2 === 0 ? cy-10 : cy-20);
      });
      ctx.textAlign = 'left';

    } else if (type === 'log_graph') {
      const cx = 35, cy = H-28, sx = 22, sy = 16;
      ctx.strokeStyle = grid; ctx.lineWidth = .7;
      for (let i = 0; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(cx+i*sx,8); ctx.lineTo(cx+i*sx,H-8); ctx.stroke(); }
      ctx.strokeStyle = mut; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx,8); ctx.lineTo(cx,H-8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8,cy); ctx.lineTo(W-8,cy); ctx.stroke();
      ctx.strokeStyle = teal; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 1; i <= 100; i++) {
        const x = cx + i*.9*sx/10, y = cy - Math.log2(i*.5)*sy;
        if (i === 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = amb; ctx.font = 'bold 10px Space Mono'; ctx.fillText('y=log₂x', W-55, 24);

    } else if (type === 'right_triangle_trig') {
      const { opp=3, adj=4, hyp=5, angle=37 } = data || {};
      const sc = Math.min((W-60)/adj, (H-60)/opp);
      const ox = 30, oy = H-30;
      ctx.strokeStyle = teal; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(ox+adj*sc,oy); ctx.lineTo(ox+adj*sc,oy-opp*sc); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = 'rgba(78,201,176,.08)'; ctx.fill();
      ctx.strokeStyle = mut; ctx.lineWidth=1; ctx.strokeRect(ox+adj*sc-9, oy-9, 9, 9);
      ctx.fillStyle = amb; ctx.font = 'bold 10px Space Mono';
      ctx.fillText('adj='+adj, ox+adj*sc/2-15, oy+16);
      ctx.fillText('opp='+opp, ox+adj*sc+5, oy-opp*sc/2+4);
      ctx.fillStyle = teal; ctx.fillText('hyp='+hyp, ox+adj*sc/2-20, oy-opp*sc/2-8);
      ctx.fillStyle = rust; ctx.font = '10px Space Mono'; ctx.fillText('θ='+angle+'°', ox+12, oy-8);

    } else if (type === 'circle_theorem') {
      const cx = W/2, cy = H/2-4, r = Math.min(W,H)*.32;
      ctx.strokeStyle = teal; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx,cy,r,0,2*Math.PI); ctx.stroke();
      ctx.fillStyle = amb; ctx.beginPath(); ctx.arc(cx,cy,3,0,2*Math.PI); ctx.fill();
      const A=[cx+r*Math.cos(2.5),cy+r*Math.sin(2.5)];
      const B=[cx+r*Math.cos(0.5),cy+r*Math.sin(0.5)];
      const P=[cx+r*Math.cos(Math.PI+.3),cy+r*Math.sin(Math.PI+.3)];
      ctx.fillStyle = teal;
      [A,B,P].forEach(pt=>{ ctx.beginPath();ctx.arc(pt[0],pt[1],3.5,0,2*Math.PI);ctx.fill(); });
      ctx.strokeStyle = rust; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(P[0],P[1]); ctx.lineTo(A[0],A[1]); ctx.lineTo(B[0],B[1]); ctx.stroke();
      ctx.strokeStyle = amb; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(A[0],A[1]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(B[0],B[1]); ctx.stroke();
      ctx.fillStyle = mut; ctx.font='9px Space Mono';
      ctx.fillText('O',cx+4,cy-4); ctx.fillText('A',A[0]+4,A[1]); ctx.fillText('B',B[0]+4,B[1]); ctx.fillText('P',P[0]-14,P[1]);
      ctx.fillStyle=amb; ctx.font='bold 9px Space Mono'; ctx.fillText('∠POA=2×∠PBA',5,H-8);
    }
  }
</script>

<style>
  .qcard { border:1px solid var(--bdr);border-radius:3px;overflow:hidden;margin-bottom:.5rem;transition:border-color .2s; }
  .qcard:hover { border-color:var(--bdr2); }
  .qhdr { display:flex;align-items:flex-start;gap:.7rem;padding:.75rem 1rem;background:var(--surf);cursor:pointer;user-select:none;transition:background .15s; }
  .qhdr:hover, .open .qhdr { background:var(--surf2); }
  .qnum { font-size:.6rem;font-weight:700;letter-spacing:.1em;color:var(--teal);background:var(--tdim);border:1px solid var(--tline);padding:.18rem .45rem;border-radius:2px;flex-shrink:0;margin-top:2px;white-space:nowrap; }
  .cqnum { color:var(--vio);background:var(--vdim);border-color:var(--vline); }
  .qtype { font-size:.57rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:.14rem .4rem;border-radius:2px;flex-shrink:0;margin-top:3px; }
  .tmc { color:var(--amb);background:var(--adim);border:1px solid var(--aline); }
  .tcq { color:var(--blu);background:var(--bdim);border:1px solid rgba(106,176,224,.22); }
  .qtxt { flex:1; }
  .qen { font-size:.78rem;color:var(--txt2);line-height:1.62;margin-bottom:.22rem; }
  .qbn { font-size:.82rem;color:var(--mut);line-height:1.62; }
  .qch { font-size:.57rem;color:var(--mut);margin-top:.3rem; }
  .ico { color:var(--mut);font-size:.62rem;margin-left:.4rem;flex-shrink:0;transition:transform .25s; }
  .open .ico { transform:rotate(180deg); }
  /* Options */
  .opts { display:grid;grid-template-columns:1fr 1fr;gap:.28rem;padding:.4rem 1rem .65rem 2.5rem;background:var(--surf); }
  .opt { display:flex;align-items:flex-start;gap:.4rem;font-size:.72rem;color:var(--mut);padding:.25rem .4rem;border-radius:2px;border:1px solid transparent; }
  .opt-k { font-weight:700;font-size:.62rem;flex-shrink:0;margin-top:1px; }
  .opt.ok { color:var(--grn);background:var(--gdim);border-color:var(--gline); }
  .opt.ok .opt-k { color:var(--grn); }
  /* Solution */
  .spanel { border-top:1px solid var(--bdr);background:var(--surf3);padding:.9rem 1rem .9rem 2.5rem; }
  .abadge { display:inline-flex;align-items:center;gap:.35rem;font-size:.58rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--grn);background:var(--gdim);border:1px solid var(--gline);padding:.16rem .55rem;border-radius:2px;margin-bottom:.65rem; }
  .steps { display:flex;flex-direction:column;gap:.3rem; }
  .step { display:flex;gap:.5rem;font-size:.75rem;color:var(--mut);line-height:1.75; }
  .sn { flex-shrink:0;font-size:.58rem;font-weight:700;color:var(--teal);margin-top:4px;min-width:14px; }
  .viz-wrap { margin:.4rem 0; }
  .viz-wrap canvas { border:1px solid var(--bdr);border-radius:3px;background:var(--surf2); }
  /* CQ parts */
  .cqpart { border-bottom:1px solid var(--bdr);padding:.75rem 0; }
  .cqpart:last-child { border-bottom:none; }
  .cqlbl { font-size:.6rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--vio);margin-bottom:.35rem; }
  .cqm { font-size:.56rem;color:var(--mut);background:var(--surf);border:1px solid var(--bdr);padding:.1rem .35rem;border-radius:2px;margin-left:.35rem; }
  .cqq { font-size:.76rem;color:var(--txt2);margin-bottom:.45rem; }
  .hdiv { border:none;border-top:1px solid var(--bdr);margin:.55rem 0; }
  @media (max-width:600px) { .opts{grid-template-columns:1fr;} }
</style>
