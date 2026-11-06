/* AUREUS churn engine — client-side scoring distilled from churn_model.pkl
   Tree format: [feature, threshold, left, right, n] | leaf [p, n] */
(function () {
  const D = window.CHURN_DATA;

  const FEATS = {
    age:     { label: 'Age',               unit: 'yrs', min: 18, max: 65,   step: 1,  jit: 4 },
    tenure:  { label: 'Tenure',            unit: 'mo',  min: 1,  max: 60,   step: 1,  jit: 6 },
    usage:   { label: 'Usage frequency',   unit: '/mo', min: 1,  max: 30,   step: 1,  jit: 3 },
    calls:   { label: 'Support calls',     unit: '',    min: 0,  max: 10,   step: 1,  jit: 1 },
    delay:   { label: 'Payment delay',     unit: 'd',   min: 0,  max: 30,   step: 1,  jit: 3 },
    spend:   { label: 'Total spend',       unit: '$',   min: 100,max: 1000, step: 10, jit: 70 },
    last:    { label: 'Last interaction',  unit: 'd ago',min: 1, max: 30,   step: 1,  jit: 3 },
  };

  // seeded noise → a deterministic 100-tree "forest" of jittered views of the customer
  let s = 1337; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const NOISE = Array.from({ length: 100 }, () => Object.keys(FEATS).map(() => rnd() * 2 - 1));

  function toVec(c) {
    return {
      age: c.age, tenure: c.tenure, usage: c.usage, calls: c.calls, delay: c.delay,
      spend: c.spend, last: c.last,
      male: c.gender === 'Male' ? 1 : 0,
      monthly: c.contract_length === 'Monthly' ? 1 : 0,
      tier: { Basic: 0, Standard: 1, Premium: 2 }[c.subscription_type] ?? 0,
    };
  }
  function leaf(v, node, trace) {
    while (node.length > 2) {
      const [f, t, l, r, n] = node;
      const yes = v[f] <= t;
      if (trace) trace.push({ f, t, v: v[f], yes, n });
      node = yes ? l : r;
    }
    return node;
  }

  function score(c) {
    const base = toVec(c);
    const keys = Object.keys(FEATS);
    const votes = []; let sum = 0;
    NOISE.forEach((nz, i) => {
      const v = { ...base };
      if (i > 0) keys.forEach((k, j) => {
        const F = FEATS[k];
        v[k] = Math.min(F.max, Math.max(F.min, base[k] + Math.round(nz[j] * F.jit * (k === 'calls' ? 1.25 : 1))));
      });
      const p = leaf(v, D.tree)[0];
      votes.push(p); sum += p;
    });
    const trace = []; const lf = leaf(base, D.tree, trace);
    return { pct: Math.round((sum / votes.length) * 1000) / 10, votes, trace, leaf: lf };
  }

  // Human-readable rule for a split
  function ruleText(step) {
    const t = step.t;
    switch (step.f) {
      case 'calls':   return { q: `Support calls ≤ ${Math.floor(t)}?`, you: step.v + ' calls' };
      case 'spend':   return { q: `Total spend ≤ $${Math.round(t)}?`, you: '$' + step.v };
      case 'delay':   return { q: `Pays within ${Math.floor(t)} days?`, you: step.v + ' days' };
      case 'age':     return { q: `Age ≤ ${Math.floor(t)}?`, you: step.v + ' yrs' };
      case 'last':    return { q: `Contacted in last ${Math.floor(t)} days?`, you: step.v + ' days' };
      case 'tenure':  return { q: `Tenure ≤ ${Math.floor(t)} months?`, you: step.v + ' mo' };
      case 'usage':   return { q: `Uses ≤ ${Math.floor(t)}× a month?`, you: step.v + '×' };
      case 'monthly': return { q: 'Not on a monthly contract?', you: step.v ? 'Monthly' : 'Longer' };
      case 'male':    return { q: 'Customer is female?', you: step.v ? 'Male' : 'Female' };
      case 'tier':    return { q: `Tier below ${['Basic','Standard','Premium'][Math.ceil(t)]}?`, you: ['Basic','Standard','Premium'][step.v] };
    }
    return { q: step.f, you: step.v };
  }

  // Search the single most effective, actionable change
  function bestLever(c) {
    const base = score(c).pct;
    const cands = [];
    for (let k = 0; k < c.calls; k++) cands.push({ key: 'calls', to: k, txt: `Resolve tickets: support calls ${c.calls} → ${k}` });
    if (c.delay > 0) [0, 5, 10, 15, 20].filter(x => x < c.delay).forEach(x => cands.push({ key: 'delay', to: x, txt: `Collect payment sooner: ${c.delay} → ${x} days late` }));
    if (c.contract_length === 'Monthly') ['Quarterly', 'Annual'].forEach(x => cands.push({ key: 'contract_length', to: x, txt: `Move from Monthly to ${x} contract` }));
    if (c.spend < 600) [550, 600, 700].forEach(x => cands.push({ key: 'spend', to: x, txt: `Grow spend: $${c.spend} → $${x}` }));
    if (c.last > 10) [5, 10].forEach(x => cands.push({ key: 'last', to: x, txt: `Reach out: last contact ${c.last} → ${x} days ago` }));
    if (c.usage < 15) cands.push({ key: 'usage', to: 15, txt: `Boost usage: ${c.usage} → 15 / month` });
    if (c.subscription_type !== 'Premium') cands.push({ key: 'subscription_type', to: 'Premium', txt: 'Upgrade tier to Premium' });
    let best = null;
    cands.forEach(cd => {
      const p = score({ ...c, [cd.key]: cd.to }).pct;
      const drop = base - p;
      // prefer bigger drops; tie-break toward smaller (cheaper) changes = first found
      if (drop > 0.5 && (!best || drop > best.drop + 0.5)) best = { ...cd, drop: Math.round(drop * 10) / 10, after: p };
    });
    return best;
  }

  function bucketRate(key, val) {
    const map = { calls: D.calls, delay: D.delay, age: D.age, spend: D.spend, tenure: D.tenure, usage: D.usage, last: D.last };
    const g = map[key]; if (!g) return null;
    for (let i = 0; i < g.labels.length; i++) {
      const lb = g.labels[i];
      if (!lb.includes('-')) { if (+lb === val) return g.rate[i]; continue; }
      const [a, b] = lb.split('-').map(Number);
      if (val >= a && val <= b) return g.rate[i];
    }
    return g.rate[g.rate.length - 1];
  }

  // Local mirror of app.py /chat (used when the Flask backend is unavailable)
  function localChat(q) {
    q = q.toLowerCase();
    if (['age', 'old', 'young', 'demographic', 'group'].some(w => q.includes(w)))
      return "<strong>Age group churn (440,832 customers)</strong><br>• 41–50: <strong>~40%</strong> — your most loyal cohort.<br>• 18–25: <strong>56.4%</strong>.<br>• 26–40: 45–52%.<br>• 51+: <strong>100%</strong> churned in this dataset.<br><br>Takeaway: customers over 50 need simpler onboarding and proactive check-ins.";
    if (['contract', 'monthly', 'annual', 'subscription', 'quarter'].some(w => q.includes(w)))
      return "<strong>Contract breakdown</strong><br>• Monthly: <strong>100% churn</strong>.<br>• Annual: <strong>46.1%</strong>.<br>• Quarterly: <strong>46.0%</strong>.<br><br>Recommendation: offer a $50 credit or 15% discount to move Monthly subscribers onto Annual.";
    if (['support', 'call', 'complaint', 'service', 'ticket'].some(w => q.includes(w)))
      return "<strong>Support complaints impact</strong><br>• 0–2 calls: ~30% churn (healthy).<br>• 3–4 calls: 41.6% → 58.5% (escalating).<br>• 5 calls: <strong>94.7%</strong>. 6+: <strong>100%</strong>.<br><br>Action: trigger VIP concierge outreach at the 4th call.";
    if (['pay', 'delay', 'late', 'bill'].some(w => q.includes(w)))
      return "<strong>Payment delay</strong><br>Up to 20 days late, churn sits flat at ~46%. From 21 days it's <strong>100%</strong>.<br><br>Action: friendly reminders at day 10 and day 15.";
    if (['spend', 'money', 'revenue', 'value'].some(w => q.includes(w)))
      return "<strong>Total spend</strong><br>Every customer under <strong>$500</strong> lifetime spend churned. Above $500, churn drops to ~41%.<br><br>Action: nudge low spenders past $500 with bundles.";
    if (['reduce', 'measure', 'action', 'strategy', 'prevent', 'fix', 'help'].some(w => q.includes(w)))
      return "<strong>Top 4 measures to reduce churn</strong><br>1. Convert Monthly buyers to Annual contracts.<br>2. Assign a VIP account manager after the 3rd ticket.<br>3. Payment reminders before the 20-day threshold.<br>4. Dedicated onboarding for customers aged 46+.";
    return null;
  }

  const LOG = [
    ['basket', 'Same customer + product on different dates', 'Kept — real repeat purchases', 24],
    ['basket', 'basket_date stored as text', 'Converted to datetime', 15000],
    ['basket', 'basket_count > 5 (99.5th pct)', 'Flagged, kept — bulk buys', 54],
    ['customers', "sex = 'kvkktalepsilindi' / UNKNOWN", "Recoded to 'Unknown' (not guessed)", 9],
    ['customers', 'Age < 18 or > 100 (5, 123, 2022, −34…)', 'Set missing → median 32, flagged', 7451],
    ['customers', 'Tenure outside 1.5×IQR', 'Plausible — kept', 558],
    ['training', 'Completely empty row', 'Dropped', 1],
    ['training', 'Numeric columns stored as float', 'Converted to int', 440832],
    ['test', 'Numeric types', 'Confirmed int', 64374],
    ['train vs test', 'CustomerIDs appear in both files', 'Kept — separate numbering, 0 identical', 62995],
  ];

  window.Engine = { FEATS, score, ruleText, bestLever, bucketRate, localChat, LOG, D };
})();
