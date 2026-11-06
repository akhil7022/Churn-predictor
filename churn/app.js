/* AUREUS — interface controller */
(function () {
  const E = window.Engine, D = E.D;
  const $ = (id) => document.getElementById(id);
  const INK = '#0a0a0a', BLUE = '#2952ff', RED = '#d92020', YEL = '#ffc400', CON = '#d8d4cb';
  const tierColor = (p) => p >= 60 ? RED : p >= 30 ? YEL : BLUE;

  /* ───────── state ───────── */
  const PRESETS = {
    loyal:   { age: 45, tenure: 48, usage: 22, calls: 0, delay: 1,  spend: 1000, last: 6,  contract_length: 'Annual',    subscription_type: 'Premium', gender: 'Male' },
    atrisk:  { age: 27, tenure: 14, usage: 8,  calls: 3, delay: 18, spend: 620, last: 19, contract_length: 'Quarterly', subscription_type: 'Basic',   gender: 'Female' },
    churner: { age: 28, tenure: 6,  usage: 4,  calls: 6, delay: 25, spend: 250, last: 24, contract_length: 'Monthly',   subscription_type: 'Basic',   gender: 'Male' },
  };
  let state = JSON.parse(localStorage.getItem('aureus-customer') || 'null') || { age: 38, tenure: 24, usage: 12, calls: 4, delay: 18, spend: 520, last: 17, contract_length: 'Quarterly', subscription_type: 'Basic', gender: 'Female' };
  let lastPct = 0;

  /* ───────── ticker ───────── */
  const tick = ['440,832 customers analysed', 'Monthly contract → 100% churn', '5+ support calls → 94.7% churn', 'Payment 21+ days late → 100% churn', 'Spend under $500 → 100% churn', 'Age 51+ → 100% churn', 'Annual & quarterly → 46% churn', '100 trees · depth 15'];
  const tHtml = tick.map(t => `<span>${t}</span><span class="x">✕</span>`).join('');
  $('ticker').innerHTML = tHtml + tHtml;

  /* ───────── sliders ───────── */
  const HELP = {
    age: 'How old the customer is', tenure: 'Months as a customer', usage: 'Times they use the product per month',
    calls: 'Complaints filed with support', delay: 'Days their last payment was late', spend: 'Lifetime revenue from them',
    last: 'Days since you last talked to them',
  };
  const sl = $('sliders');
  Object.entries(E.FEATS).forEach(([k, F]) => {
    const d = document.createElement('div'); d.className = 'field';
    d.innerHTML = `<div class="field-top"><label for="in-${k}">${F.label}<small>${HELP[k]}</small></label><div class="val" id="val-${k}"></div></div>
      <input type="range" id="in-${k}" min="${F.min}" max="${F.max}" step="${F.step}">
      <div class="hint" id="hint-${k}"><span class="bar"><i></i></span><span>Dataset churn at this value: <b></b></span></div>`;
    sl.appendChild(d);
    d.querySelector('input').addEventListener('input', (e) => { state[k] = +e.target.value; clearPreset(); update(); });
  });
  document.querySelectorAll('.seg').forEach(seg => {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      state[seg.dataset.key] = b.dataset.v; clearPreset(); update();
    });
  });
  const SEG_NOTE = {
    contract_length: { Monthly: ['100% churned', 1], Quarterly: ['46.0% churned', 0], Annual: ['46.1% churned', 0] },
    subscription_type: { Basic: ['58.2% — little effect', 0], Standard: ['56.1% — little effect', 0], Premium: ['55.9% — little effect', 0] },
    gender: { Female: ['66.7% churned', 1], Male: ['49.1% churned', 0] },
  };

  function syncInputs() {
    Object.keys(E.FEATS).forEach(k => {
      const F = E.FEATS[k], v = state[k], inp = $('in-' + k);
      inp.value = v;
      inp.style.setProperty('--p', ((v - F.min) / (F.max - F.min) * 100) + '%');
      $('val-' + k).innerHTML = F.unit === '$' ? `<sup>$</sup>${v}` : `${v}<sup>${F.unit}</sup>`;
      const r = E.bucketRate(k, v), h = $('hint-' + k);
      h.querySelector('i').style.width = r + '%';
      h.querySelector('b').textContent = r + '%';
      h.classList.toggle('hot', r >= 90);
    });
    document.querySelectorAll('.seg').forEach(seg => {
      const key = seg.dataset.key;
      seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === state[key]));
      const n = SEG_NOTE[key][state[key]], el = $('note-' + key);
      el.textContent = n[0]; el.classList.toggle('hot', !!n[1]);
    });
  }

  /* ───────── rendering a score ───────── */
  function renderScore(pct, res, src) {
    const box = $('risk-score');
    const from = { v: lastPct };
    gsap.to(from, { v: pct, duration: .7, ease: 'power3.out', onUpdate: () => { box.innerHTML = Math.round(from.v) + '<span class="pct">%</span>'; } });
    lastPct = pct;
    box.style.color = pct >= 60 ? RED : pct >= 30 ? INK : BLUE;
    $('risk-progress').style.width = Math.max(2, pct) + '%';
    $('risk-progress').style.background = tierColor(pct);
    $('risk-src').textContent = src;
    $('globe-pct').textContent = Math.round(pct) + '%';
    $('globe-pct').style.color = pct >= 60 ? RED : pct >= 30 ? INK : BLUE;

    const badge = $('risk-badge'), rec = $('recommendation-text');
    if (pct >= 60) {
      badge.className = 't-crit'; badge.innerHTML = 'Tier<b>Critical</b>';
      rec.innerHTML = `<b>Critical</b>Severe dissatisfaction signals${state.calls >= 4 ? ` — ${state.calls} support complaints filed` : ''}. Dispatch an account executive within 2 hours and offer a 20% contract-extension discount.`;
    } else if (pct >= 30) {
      badge.className = 't-mod'; badge.innerHTML = 'Tier<b>Watch</b>';
      rec.innerHTML = `<b>Watch</b>Engagement is slipping. Enrol them in the 3-part tutorial email series and offer a 1-click Annual upgrade with a $50 bonus credit.`;
    } else {
      badge.className = 't-stable'; badge.innerHTML = 'Tier<b>Stable</b>';
      rec.innerHTML = `<b>Stable</b>Healthy account. Target for Premium cross-sell or milestone reward badges — and invite to the beta cohort.`;
    }
    updateGlobeState(pct);
  }

  function renderPath(res) {
    const ol = $('path');
    ol.innerHTML = res.trace.map((s, i) => {
      const r = E.ruleText(s);
      return `<li style="animation-delay:${i * 60}ms">${r.q} <em>${r.you}</em><span class="ok" style="background:${s.yes ? 'var(--paper)' : 'var(--ink)'};color:${s.yes ? 'var(--ink)' : 'var(--yellow)'}">${s.yes ? 'YES' : 'NO'}</span></li>`;
    }).join('') + `<li class="leaf" style="animation-delay:${res.trace.length * 60}ms">Customers like this <em>${res.leaf[1].toLocaleString()} in training</em><span class="ok" style="background:${tierColor(res.leaf[0] * 100)};color:${res.leaf[0] >= .3 && res.leaf[0] < .6 ? INK : '#fff'}">${Math.round(res.leaf[0] * 100)}% LEFT</span></li>`;
  }

  function renderLever() {
    const L = E.bestLever(state), el = $('lever');
    if (!L) { el.className = 'lever none'; el.innerHTML = `<div class="big">✓</div><p>No single change lowers this score meaningfully — this customer is already as safe as the model can tell.</p><span></span>`; return; }
    el.className = 'lever';
    el.innerHTML = `<div class="big">−${Math.round(L.drop)}</div><p><strong>${L.txt}.</strong><br>Risk would fall to ${Math.round(L.after)}%.</p><button type="button" id="apply-lever">Apply</button>`;
    $('apply-lever').onclick = () => { state[L.key] = L.to; clearPreset(); update(); $('result-box').classList.remove('flash'); void $('result-box').offsetWidth; $('result-box').classList.add('flash'); };
  }

  function renderForest(res) {
    const f = $('forest'); if (!f.children.length) f.innerHTML = '<i></i>'.repeat(100);
    let yes = 0;
    [...f.children].forEach((t, i) => { const v = res.votes[i] >= .5; yes += v; t.className = v ? 'v1' : 'v0'; });
    $('vote-lab').textContent = `Forest ballot — ${yes} churn / ${100 - yes} stay`;
    $('vote-cap').innerHTML = `For the customer currently in the terminal, <em>${yes} of 100 trees</em> vote they will leave.`;
  }

  let deb;
  function update() {
    localStorage.setItem('aureus-customer', JSON.stringify(state));
    syncInputs();
    const res = E.score(state);
    renderScore(res.pct, res, 'LIVE · DISTILLED TREE');
    renderPath(res); renderForest(res);
    clearTimeout(deb); deb = setTimeout(renderLever, 60);
    return res;
  }

  /* ───────── presets ───────── */
  function clearPreset() { document.querySelectorAll('.preset').forEach(p => p.classList.remove('selected')); }
  window.loadPreset = function (type, el) {
    state = { ...PRESETS[type] };
    clearPreset();
    (el || document.querySelector(`.preset[onclick*="${type}"]`))?.classList.add('selected');
    speedMultiplier = 5; setTimeout(() => speedMultiplier = 1, 900);
    update();
  };

  /* ───────── full forest submit ───────── */
  $('predict-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button[type=submit]');
    btn.classList.add('loading'); speedMultiplier = 6;
    const payload = { Age: state.age, Tenure: state.tenure, Usage_Frequency: state.usage, Support_Calls: state.calls, Payment_Delay: state.delay, Total_Spend: state.spend, Contract_Length: state.contract_length, Subscription_Type: state.subscription_type, Gender: state.gender };
    let pct, src;
    try {
      const r = await fetch('/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json(); pct = Number(j.churn_probability); src = 'FLASK · FULL RANDOM FOREST';
      if (isNaN(pct)) throw 0;
    } catch (err) {
      await new Promise(r => setTimeout(r, 650));
      pct = E.score(state).pct; src = 'PREVIEW · DISTILLED TREE';
    }
    btn.classList.remove('loading');
    setTimeout(() => speedMultiplier = 1, 1200);
    renderScore(pct, null, src);
    $('result-box').classList.remove('flash'); void $('result-box').offsetWidth; $('result-box').classList.add('flash');
  });

  /* ───────── THREE.JS globe ───────── */
  let scene, camera, renderer, globe, globeMaterial, inner, ring, dots;
  window.speedMultiplier = 1.0;
  let targetColor = new THREE.Color(INK);
  let drag = null, dragVel = { x: 0, y: 0 };

  function init3D() {
    const c = $('three-canvas-container'); if (!c) return;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, c.clientWidth / c.clientHeight, .1, 1000);
    camera.position.z = 5.2;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    renderer.setSize(c.clientWidth, c.clientHeight);
    c.appendChild(renderer.domElement);

    globeMaterial = new THREE.MeshBasicMaterial({ color: INK, wireframe: true, transparent: true, opacity: .9 });
    globe = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 2), globeMaterial);
    inner = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 0), new THREE.MeshBasicMaterial({ color: BLUE, wireframe: true, transparent: true, opacity: .55 }));
    globe.add(inner);
    const rg = new THREE.TorusGeometry(2.25, .012, 6, 120);
    ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: INK }));
    ring.rotation.x = 1.2; ring.rotation.y = .3;
    const pg = new THREE.BufferGeometry(); const N = 120, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; pos[i * 3] = Math.cos(a) * 2.25; pos[i * 3 + 1] = Math.sin(a) * 2.25; pos[i * 3 + 2] = 0; }
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dots = new THREE.Points(pg, new THREE.PointsMaterial({ color: RED, size: .07 }));
    ring.add(dots);
    scene.add(globe); scene.add(ring);

    c.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', e => { if (!drag) return; dragVel.y = (e.clientX - drag.x) * .01; dragVel.x = (e.clientY - drag.y) * .01; drag = { x: e.clientX, y: e.clientY }; });
    c.addEventListener('pointerup', () => drag = null);
    window.addEventListener('resize', () => { const w = c.clientWidth, h = c.clientHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); });
    animate();
  }
  function animate() {
    requestAnimationFrame(animate);
    if (globe) {
      globe.rotation.y += .006 * speedMultiplier + dragVel.y;
      globe.rotation.x += .003 * speedMultiplier + dragVel.x;
      dragVel.x *= .92; dragVel.y *= .92;
      inner.rotation.y -= .02 * speedMultiplier; inner.rotation.z += .01 * speedMultiplier;
      ring.rotation.z += .004 * speedMultiplier;
      globeMaterial.color.lerp(targetColor, .05);
    }
    renderer.render(scene, camera);
  }
  function updateGlobeState(p) {
    const b = $('globe-status-badge'), st = $('globe-stamp');
    if (!globe) return;
    if (p >= 60) {
      targetColor = new THREE.Color(RED); b.textContent = 'RED / CRITICAL'; b.className = 's-crit';
      st.innerHTML = 'HIGH<br><b>RISK</b>'; st.style.background = RED;
      gsap.fromTo(globe.scale, { x: 1, y: 1, z: 1 }, { x: 1.25, y: 1.25, z: 1.25, duration: .5, yoyo: true, repeat: 1 });
    } else if (p >= 30) {
      targetColor = new THREE.Color('#c79600'); b.textContent = 'AMBER / WATCH'; b.className = 's-mod';
      st.innerHTML = 'ON<br><b>WATCH</b>'; st.style.background = YEL; st.style.color = INK;
      gsap.to(globe.scale, { x: 1.05, y: 1.05, z: 1.05, duration: .4 });
    } else {
      targetColor = new THREE.Color(BLUE); b.textContent = 'BLUE / STABLE'; b.className = 's-stable';
      st.innerHTML = 'ALL<br><b>CLEAR</b>'; st.style.background = BLUE;
      gsap.to(globe.scale, { x: 1, y: 1, z: 1, duration: .4 });
    }
    if (p < 30 || p >= 60) st.style.color = '#f5f0e6';
  }

  /* ───────── EVIDENCE ───────── */
  const SIG = {
    calls:    { name: 'Support calls', g: D.calls, x: 'calls filed', big: '5<small>+ calls</small>', text: 'Up to 2 calls, churn sits near 30%. It climbs at 3–4, then hits <b>94.7% at 5</b> and 100% from 6 onward. This is the model’s #1 feature.' },
    delay:    { name: 'Payment delay', g: D.delay, x: 'days late', big: '21<small>+ days</small>', text: 'Flat at ~46% for anyone paying within 20 days. From day 21 every single customer churned.' },
    contract: { name: 'Contract length', g: D.contract, x: 'contract', big: '100<small>% monthly</small>', text: 'Every Monthly customer left. Quarterly and Annual are identical at ~46% — the length beyond monthly doesn’t matter.' },
    spend:    { name: 'Total spend', g: D.spend, x: 'lifetime $', big: '$500<small> line</small>', text: 'Below $500 in lifetime spend, churn is 100%. Above it, churn drops to ~41% and stays flat.' },
    age:      { name: 'Age', g: D.age, x: 'age band', big: '51<small>+ yrs</small>', text: 'Churn falls gently from 56% (18–25) to 40% (46–50) — then every customer over 50 churned.' },
    last:     { name: 'Last interaction', g: D.last, x: 'days since contact', big: '16<small>+ days</small>', text: 'Customers you haven’t spoken to in over 15 days churn at 66% vs 49% — a softer but real step.' },
    gender:   { name: 'Gender', g: D.gender, x: 'gender', big: '+17.6<small> pts</small>', text: 'Female customers churn at 66.7% vs 49.1% for male customers in this dataset.' },
    tenure:   { name: 'Tenure', g: D.tenure, x: 'months', big: '~flat', text: 'Tenure barely moves churn (54–63%). The model gives it under 1% importance.' },
    usage:    { name: 'Usage frequency', g: D.usage, x: 'uses / month', big: '~flat', text: 'Light users churn a little more (61%) than heavy users (55%) — a weak signal.' },
    sub:      { name: 'Subscription tier', g: D.sub, x: 'tier', big: '~flat', text: 'Basic, Standard and Premium all churn at 56–58%. Tier is the least useful feature.' },
  };
  let evChart, cntChart, evKey = 'calls';
  const chips = $('ev-chips');
  Object.entries(SIG).forEach(([k, s]) => {
    const b = document.createElement('button'); b.className = 'chip' + (k === evKey ? ' on' : ''); b.textContent = s.name; b.dataset.k = k;
    b.onclick = () => { evKey = k; chips.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b)); drawEvidence(); };
    chips.appendChild(b);
  });
  const apexBase = { toolbar: { show: false }, fontFamily: 'Archivo Narrow, sans-serif', animations: { enabled: true, easing: 'easeout', speed: 600 } };
  function drawEvidence() {
    const s = SIG[evKey];
    $('ev-title').textContent = s.name; $('ev-big').innerHTML = s.big; $('ev-text').innerHTML = s.text;
    $('ev-lab').textContent = `Churn rate by ${s.x}`;
    const cols = s.g.rate.map(tierColor);
    const opt = {
      series: [{ name: 'Churn rate', data: s.g.rate }],
      chart: { ...apexBase, type: 'bar', height: 400 },
      plotOptions: { bar: { columnWidth: '78%', distributed: true, borderRadius: 0 } },
      colors: cols, legend: { show: false },
      stroke: { show: true, width: 3, colors: [INK] },
      dataLabels: { enabled: true, formatter: v => v + '%', offsetY: -22, style: { colors: [INK], fontSize: '13px', fontWeight: 800, fontFamily: 'Archivo' } },
      xaxis: { categories: s.g.labels, labels: { style: { colors: INK, fontSize: '13px', fontWeight: 700 } }, axisBorder: { color: INK, height: 3 }, axisTicks: { show: false } },
      yaxis: { max: 110, tickAmount: 5, labels: { formatter: v => Math.round(v) + '%', style: { colors: INK, fontWeight: 700 } } },
      grid: { borderColor: 'rgba(10,10,10,.15)', strokeDashArray: 4 },
      annotations: { yaxis: [{ y: D.rate, borderColor: INK, strokeDashArray: 6, label: { text: `Overall ${D.rate}%`, borderColor: INK, style: { background: INK, color: CON, fontFamily: 'Archivo Narrow', fontWeight: 700 } } }] },
      tooltip: { y: { formatter: (v, o) => `${v}% churned · ${s.g.count[o.dataPointIndex].toLocaleString()} customers` } },
    };
    opt.plotOptions.bar.dataLabels = { position: 'top' };
    if (!evChart) { evChart = new ApexCharts($('chart-evidence'), opt); evChart.render(); } else evChart.updateOptions(opt, true, true);
    const copt = {
      series: [{ name: 'Customers', data: s.g.count }],
      chart: { ...apexBase, type: 'bar', height: 150 }, colors: [INK],
      plotOptions: { bar: { columnWidth: '70%' } }, dataLabels: { enabled: false },
      xaxis: { categories: s.g.labels, labels: { style: { colors: INK, fontSize: '10px', fontWeight: 700 } } },
      yaxis: { labels: { formatter: v => v >= 1000 ? Math.round(v / 1000) + 'k' : v, style: { colors: INK } } },
      grid: { borderColor: 'rgba(10,10,10,.12)' },
    };
    if (!cntChart) { cntChart = new ApexCharts($('chart-count'), copt); cntChart.render(); } else cntChart.updateOptions(copt, true, true);
  }
  const CLIFFS = [
    { k: 'Support calls', v: '5+', p: '94.7–100% churn once a customer files a 5th complaint.', set: { calls: 5 }, sig: 'calls' },
    { k: 'Payment delay', v: '21d', p: 'Any payment more than 20 days late → 100% churn.', set: { delay: 22 }, sig: 'delay' },
    { k: 'Contract', v: 'Monthly', p: 'All 87,104 monthly customers in the data churned.', set: { contract_length: 'Monthly' }, sig: 'contract' },
    { k: 'Total spend', v: '<$500', p: 'Lifetime spend under $500 → 100% churn.', set: { spend: 450 }, sig: 'spend' },
    { k: 'Age', v: '51+', p: 'Every customer over 50 churned in this dataset.', set: { age: 55 }, sig: 'age' },
    { k: 'Last interaction', v: '16d+', p: 'Silence past 15 days lifts churn from 49% → 66%.', set: { last: 20 }, sig: 'last' },
  ];
  $('cliffs').innerHTML = CLIFFS.map((c, i) => `<button class="cliff" data-i="${i}"><div class="k">${c.k}</div><div class="v r">${c.v}</div><p>${c.p}</p><div class="k" style="margin-top:12px;color:var(--blue)">Test on loyal VIP ↗</div></button>`).join('');
  $('cliffs').addEventListener('click', e => {
    const b = e.target.closest('.cliff'); if (!b) return;
    const c = CLIFFS[+b.dataset.i];
    state = { ...PRESETS.loyal, ...c.set }; clearPreset();
    switchTab('tab-oracle'); setTimeout(() => { update(); window.scrollTo({ top: $('predict-form').getBoundingClientRect().top + scrollY - 160, behavior: 'smooth' }); }, 300);
  });
  document.querySelectorAll('.cliff').forEach(c => c.addEventListener('mouseenter', () => {
    const s = CLIFFS[+c.dataset.i].sig; if (SIG[s] && evChart && evKey !== s) { evKey = s; chips.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x.dataset.k === s)); drawEvidence(); }
  }));

  /* ───────── MODEL ───────── */
  let fiChart;
  function drawFI() {
    if (fiChart) return;
    const names = ['Support calls', 'Total spend', 'Age', 'Contract: monthly', 'Payment delay', 'Last interaction', 'Gender: male', 'Tenure', 'Contract: quarterly', 'Usage frequency', 'Tier: standard', 'Tier: premium'];
    const vals = [29.2, 22.0, 13.9, 13.8, 12.2, 3.6, 3.5, .7, .7, .3, .1, .1];
    fiChart = new ApexCharts($('chart-feature-weights'), {
      series: [{ name: 'Importance', data: vals }],
      chart: { ...apexBase, type: 'bar', height: 420 },
      plotOptions: { bar: { horizontal: true, barHeight: '70%', distributed: true, dataLabels: { position: 'top' } } },
      colors: vals.map((v, i) => i < 5 ? (i === 0 ? RED : BLUE) : INK), legend: { show: false },
      dataLabels: { enabled: true, formatter: v => v + '%', offsetX: 30, style: { colors: [INK], fontFamily: 'Archivo', fontWeight: 800, fontSize: '13px' } },
      xaxis: { categories: names, max: 34, labels: { formatter: v => v + '%', style: { colors: INK, fontWeight: 700 } } },
      yaxis: { labels: { style: { colors: INK, fontSize: '13px', fontWeight: 700 } } },
      grid: { borderColor: 'rgba(10,10,10,.12)' }, tooltip: { y: { formatter: v => v + '% of split importance' } },
    });
    fiChart.render();
  }
  $('log-body').innerHTML = E.LOG.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3].toLocaleString()}</td></tr>`).join('');

  /* ───────── ROI ───────── */
  const ROI = [
    { id: 'cust', label: 'At-risk customers', help: 'How many accounts the model flags', min: 1000, max: 50000, step: 1000, v: 10000, fmt: v => v.toLocaleString() },
    { id: 'arpu', label: 'Revenue per customer', help: 'Average annual revenue each brings', min: 100, max: 3000, step: 50, v: 650, fmt: v => '$' + v.toLocaleString() },
    { id: 'rate', label: 'Win-back rate', help: 'Share your retention team actually saves', min: 5, max: 60, step: 1, v: 25, fmt: v => v + '%' },
  ];
  $('roi-sliders').innerHTML = ROI.map(r => `<div class="field"><div class="field-top"><label for="roi-${r.id}">${r.label}<small>${r.help}</small></label><div class="val" id="roi-${r.id}-val"></div></div><input type="range" id="roi-${r.id}" min="${r.min}" max="${r.max}" step="${r.step}" value="${r.v}"></div>`).join('');
  $('people').innerHTML = '<i></i>'.repeat(100);
  let roiShown = { v: 0 };
  function calculateROI() {
    const v = {}; ROI.forEach(r => { const inp = $('roi-' + r.id); v[r.id] = +inp.value; $('roi-' + r.id + '-val').textContent = r.fmt(v[r.id]); inp.style.setProperty('--p', ((v[r.id] - r.min) / (r.max - r.min) * 100) + '%'); });
    const total = Math.round(v.cust * v.arpu * v.rate / 100);
    gsap.to(roiShown, { v: total, duration: .6, ease: 'power3.out', onUpdate: () => $('roi-total').textContent = '$' + Math.round(roiShown.v).toLocaleString() });
    $('roi-formula').innerHTML = `<span>${v.cust.toLocaleString()} customers</span><b class="op">×</b><span>$${v.arpu.toLocaleString()}</span><b class="op">×</b><span>${v.rate}% saved</span>`;
    [...$('people').children].forEach((p, i) => p.classList.toggle('saved', i < v.rate));
    const saved = Math.round(v.cust * v.rate / 100);
    $('roi-copy').innerHTML = `Each square is 1% of your at-risk group. Winning back <b>${saved.toLocaleString()}</b> customers keeps <b>$${(total / 1e6).toFixed(2)}M</b> of recurring revenue a year that would otherwise walk out.`;
  }
  ROI.forEach(r => $('roi-' + r.id).addEventListener('input', calculateROI));
  calculateROI();

  /* ───────── TABS + hyperdrive ───────── */
  const WARP = { 'tab-oracle': 'Predict', 'tab-evidence': 'Evidence', 'tab-diagnostics': 'Model', 'tab-roi': 'ROI', 'tab-strategy': 'Act' };
  window.switchTab = function (tabId, instant = false) {
    const g = $('galaxy-transition');
    if (!instant && g) {
      $('warp-word').textContent = WARP[tabId];
      g.classList.remove('is-traveling'); void g.offsetWidth; g.classList.add('is-traveling');
      setTimeout(() => switchTab(tabId, true), 300);
      setTimeout(() => g.classList.remove('is-traveling'), 720);
      return;
    }
    localStorage.setItem('aureus-tab', tabId);
    document.querySelectorAll('.page-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    const next = $(tabId); next.classList.remove('hidden', 'page-enter'); void next.offsetWidth; next.classList.add('page-enter');
    next.querySelectorAll('.box, .section-head, .preset, .cliff, .step, .pipe, .chips').forEach((el, i) => {
      el.classList.remove('stagger-in'); el.style.animationDelay = Math.min(i * 55, 440) + 'ms'; void el.offsetWidth; el.classList.add('stagger-in');
    });
    $('btn-' + tabId.replace('tab-', ''))?.classList.add('active');
    window.scrollTo({ top: 0 });
    if (tabId === 'tab-evidence') setTimeout(drawEvidence, 50);
    if (tabId === 'tab-diagnostics') setTimeout(drawFI, 50);
    if (tabId === 'tab-oracle' && renderer) setTimeout(() => window.dispatchEvent(new Event('resize')), 30);
  };

  /* ───────── CHAT ───────── */
  window.toggleChatbot = function () {
    const w = $('chat-window'); w.classList.toggle('hidden');
    $('chatbot-wrapper').classList.toggle('chat-open', !w.classList.contains('hidden'));
    if (!w.classList.contains('hidden')) $('chat-input').focus();
  };
  function addMsg(html, who) {
    const m = document.createElement('div'); m.className = 'msg ' + who; m.innerHTML = html;
    $('chat-messages').appendChild(m); $('chat-messages').scrollTop = 1e6; return m;
  }
  const md = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
  async function handleChat(text) {
    addMsg(text.replace(/</g, '&lt;'), 'me');
    const t = addMsg('• • •', 'bot typing');
    let reply = null;
    try {
      const r = await fetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) });
      const j = await r.json(); reply = md(j.reply);
    } catch (e) {
      reply = E.localChat(text);
      if (!reply && window.genspark?.complete) {
        try {
          const facts = 'Dataset: 440,832 customers, overall churn 56.7%. Monthly contract 100% churn; Annual 46.1%, Quarterly 46.0%. Support calls 0-2 ~30%, 3: 41.6%, 4: 58.5%, 5: 94.7%, 6+: 100%. Payment delay >20 days 100%, else ~46%. Total spend <$500 100%, else ~41%. Age 51+ 100%, 46-50 39.6%, 18-25 56.4%. Female 66.7% vs male 49.1%. Last interaction >15 days 66% vs 49%. Tenure, usage, tier barely matter. Feature importance: support calls 29%, spend 22%, age 14%, monthly contract 14%, payment delay 12%. Current customer in terminal: ' + JSON.stringify(state) + ', risk ' + lastPct + '%.';
          reply = md(await window.genspark.complete(`You are a concise retention analyst for a churn prediction dashboard. Use only these facts: ${facts}\nAnswer in under 90 words, plain sentences, use **bold** for key numbers.\nQuestion: ${text}`));
        } catch (e2) { reply = null; }
      }
      if (!reply) reply = "Try asking: <em>Which age group churns the most?</em> · <em>What contract is safest?</em> · <em>How do support calls affect churn?</em> · <em>How can we reduce churn?</em>";
    }
    t.remove(); addMsg(reply, 'bot');
  }
  $('chat-form').addEventListener('submit', e => { e.preventDefault(); const i = $('chat-input'); if (!i.value.trim()) return; handleChat(i.value.trim()); i.value = ''; });
  window.sendQuickChat = handleChat;

  /* ───────── ambient motion ───────── */
  const orb = $('motion-orb'), orb2 = $('motion-orb-two');
  window.addEventListener('pointermove', e => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    orb.style.left = e.clientX + 'px'; orb.style.top = e.clientY + 'px';
    orb2.style.left = e.clientX * .72 + 'px'; orb2.style.top = e.clientY * .72 + 'px';
  }, { passive: true });
  document.addEventListener('click', e => {
    const b = e.target.closest('.btn, #chat-toggle-btn'); if (!b) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height), sp = document.createElement('span');
    sp.className = 'ripple'; sp.style.width = sp.style.height = s + 'px';
    sp.style.left = (e.clientX - r.left - s / 2) + 'px'; sp.style.top = (e.clientY - r.top - s / 2) + 'px';
    b.appendChild(sp); setTimeout(() => sp.remove(), 700);
  });
  VanillaTilt.init(document.querySelectorAll('[data-tilt]'), { glare: true, 'max-glare': .25, speed: 300, perspective: 1000 });

  /* ───────── boot ───────── */
  window.addEventListener('load', () => {
    init3D();
    switchTab(localStorage.getItem('aureus-tab') || 'tab-oracle', true);
    update();
  });
})();
