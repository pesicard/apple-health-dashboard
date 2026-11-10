/* Apple Health Dashboard v1.1.0 — https://github.com/pesicard/apple-health-dashboard — MIT License */
(() => {
  if (window.__hd && window.__hd.v >= 1) return;
  let P = 'sensor.my_iphone_';
  const KM2MI = 0.621371;
  const hm = h => { const m = Math.round(h * 60); return Math.floor(m / 60) + 'h ' + (m % 60) + 'm'; };
  const M = {
    steps:  { id: P + 'health_steps', name: 'Steps', emoji: '👟', agg: 'change', unit: 'steps', dec: 0, tgt: [7000, null], good: 'up', col: '#FF5C9A', per: 'day', what: 'steps a day' },
    active: { id: P + 'active_energy', name: 'Active energy', emoji: '🔥', agg: 'change', unit: 'kcal', dec: 0, tgt: [300, null], good: 'up', col: '#FF8A5C', per: 'day', what: 'active calories a day' },
    dist:   { id: P + 'walking_running_distance', name: 'Distance', emoji: '🚶‍♀️', agg: 'change', unit: 'mi', scale: KM2MI, dec: 2, tgt: null, good: 'up', col: '#E46FD8', per: 'day', what: 'miles a day' },
    sleep:  { id: P + 'sleep_duration', name: 'Sleep', emoji: '🌙', agg: 'max', unit: 'h', scale: 1 / 60, dec: 1, fmt: hm, tgtLabel: '7–9 h', tgt: [7, 9], good: 'up', col: '#9C7BF2', per: 'night', what: 'hours of sleep a night' },
    deep:   { id: P + 'deep_sleep', name: 'Deep sleep', emoji: '💤', agg: 'max', unit: 'min', dec: 0, tgt: null, good: 'up', col: '#6E5BD8', per: 'night', what: 'minutes of deep sleep' },
    hr:     { id: P + 'heart_rate', name: 'Heart rate', emoji: '💓', agg: 'mean', band: true, unit: 'bpm', dec: 0, tgt: null, good: 'flat', col: '#FF5C9A', per: 'day', what: 'average heart rate' },
    rhr:    { id: P + 'resting_heart_rate', name: 'Resting heart', emoji: '❤️', agg: 'mean', band: true, unit: 'bpm', dec: 0, tgt: [60, 100], good: 'down', col: '#E8457A', per: 'day', what: 'resting heart rate' },
    whr:    { id: P + 'walking_heart_rate_average', name: 'Walking heart', emoji: '🚶‍♀️', agg: 'mean', band: true, unit: 'bpm', dec: 0, tgt: null, good: 'down', col: '#FF8DB8', per: 'day', what: 'walking heart rate' },
    hrv:    { id: P + 'heart_rate_variability', name: 'HRV', emoji: '💗', agg: 'mean', band: true, unit: 'ms', dec: 0, tgt: null, good: 'up', col: '#F178B6', per: 'day', what: 'heart rate variability' },
    spo2:   { id: P + 'blood_oxygen', name: 'Blood oxygen', emoji: '🫧', agg: 'mean', band: true, unit: '%', dec: 0, tgt: [95, 100], good: 'up', col: '#5DB8E8', per: 'day', what: 'blood oxygen' },
    resp:   { id: P + 'respiratory_rate', name: 'Breathing', emoji: '🌬️', agg: 'mean', band: true, unit: '/min', dec: 1, tgt: [12, 20], good: 'flat', col: '#5DCAA5', per: 'day', what: 'breaths a minute' },
    vo2:    { id: P + 'vo2_max', name: 'VO₂ max', emoji: '🏃‍♀️', agg: 'mean', unit: '', dec: 1, tgt: null, good: 'up', col: '#B37BF2', per: 'day', what: 'cardio fitness' },
    btemp:  { id: '', name: 'Bedroom temperature', emoji: '🛏️', agg: 'mean', band: true, unit: '°F', dec: 0, tgt: [65, 68], good: 'flat', col: '#F6C46A', per: 'day', what: 'bedroom temperature' },
    co2:    { id: '', name: 'Indoor CO₂', emoji: '🫧', agg: 'max', unit: 'ppm', dec: 0, tgt: [400, 1000], good: 'down', col: '#9AD0F5', per: 'day', what: 'peak CO₂' }
  };
  const ORDER = ['sleep', 'deep', 'steps', 'dist', 'active', 'vo2', 'rhr', 'hr', 'whr', 'hrv', 'spo2', 'resp', 'btemp', 'co2'];
  const RANGES = [[7, '7D'], [30, '30D'], [90, '90D'], [365, '1Y']];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function fmt(m, v) {
    if (v == null || !isFinite(v)) return '—';
    if (m.fmt) return m.fmt(v);
    const a = Math.abs(v);
    return a >= 1000 ? Math.round(v).toLocaleString() : (+v.toFixed(m.dec)).toString();
  }
  const withUnit = (m, v) => m.fmt ? fmt(m, v) : fmt(m, v) + (m.unit ? (m.unit === '%' || m.unit === '°F' ? '' : ' ') + m.unit : '');
  const tgtText = m => m.tgtLabel || (m.tgt[1] != null ? fmt(m, m.tgt[0]) + '–' + withUnit(m, m.tgt[1]) : withUnit(m, m.tgt[0]) + '+');
  const dshort = t => new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  // rows: [{t, v, lo, hi}] ordered; returns stats
  function compute(m, cur, prev) {
    const vals = cur.map(r => r.v);
    const n = vals.length;
    const S = { n };
    if (!n) return S;
    S.avg = vals.reduce((a, b) => a + b, 0) / n;
    let iMax = 0, iMin = 0;
    vals.forEach((v, i) => { if (v > vals[iMax]) iMax = i; if (v < vals[iMin]) iMin = i; });
    S.hi = vals[iMax]; S.hiT = cur[iMax].t; S.lo = vals[iMin]; S.loT = cur[iMin].t;
    S.latest = vals[n - 1]; S.latestT = cur[n - 1].t;
    const pv = prev.map(r => r.v);
    if (pv.length) { S.pavg = pv.reduce((a, b) => a + b, 0) / pv.length; S.delta = S.pavg ? (S.avg - S.pavg) / Math.abs(S.pavg) * 100 : null; }
    const t = m.tgt;
    if (t) {
      const lo = t[0], hi = t[1];
      const isOn = v => (lo == null || v >= lo) && (hi == null || v <= hi);
      S.on = vals.filter(isOn).length;
      S.below = vals.filter(v => lo != null && v < lo).length;
      S.above = vals.filter(v => hi != null && v > hi).length;
      // streaks
      let best = 0, run = 0; vals.forEach(v => { run = isOn(v) ? run + 1 : 0; best = Math.max(best, run); });
      S.streak = best;
      let curRun = 0; for (let i = n - 1; i >= 0 && isOn(vals[i]); i--) curRun++;
      S.curStreak = curRun;
      // shortfall (for lower-bound goals) / excess (for upper bound)
      if (lo != null) { const gaps = vals.map(v => Math.max(0, lo - v)); S.shortTot = gaps.reduce((a, b) => a + b, 0); S.shortAvg = S.shortTot / n; S.gapLatest = Math.max(0, lo - S.latest); }
      if (hi != null) { const ex = vals.map(v => Math.max(0, v - hi)); S.overTot = ex.reduce((a, b) => a + b, 0); S.overAvg = S.overTot / n; }
      S.progress = lo != null ? Math.min(1, S.avg / lo) : null;
    }
    return S;
  }

  function verdict(m, S) {
    if (!S.n) return 'No data yet for this period. It fills in as your phone sends readings.';
    const per = m.per, t = m.tgt;
    const parts = [];
    if (t) {
      if (t[0] != null && t[1] == null) {
        parts.push('You reached ' + withUnit(m, t[0]) + ' on ' + S.on + ' of ' + S.n + ' ' + per + 's.');
        if (S.shortAvg > (m.tgt && m.tgt[0] ? m.tgt[0] * 0.01 : 0)) parts.push('On average you were ' + withUnit(m, S.shortAvg) + ' short each ' + per + (m.agg === 'change' ? ' (' + withUnit(m, S.shortTot) + ' total).' : '.'));
      } else {
        const tt = tgtText(m);
        parts.push(S.on + ' of ' + S.n + ' ' + per + 's were inside the target ' + tt + '.');
        if (S.below) parts.push(S.below + ' ' + per + (S.below > 1 ? 's' : '') + ' below.');
        if (S.above) parts.push(S.above + ' ' + per + (S.above > 1 ? 's' : '') + ' above.');
        if (m.k === 'sleep' && S.shortAvg > (m.tgt && m.tgt[0] ? m.tgt[0] * 0.01 : 0)) parts.push('Short nights add up to about ' + hm(S.shortAvg * 7) + ' of missed sleep a week (' + hm(S.shortAvg) + ' a night on average).');
      }
      if (S.curStreak > 1) parts.push('Current streak: ' + S.curStreak + ' ' + per + 's on target.');
    } else {
      parts.push('Your ' + m.what + ' averaged ' + withUnit(m, S.avg) + ', ranging from ' + withUnit(m, S.lo) + ' to ' + withUnit(m, S.hi) + '.');
    }
    if (S.delta != null && Math.abs(S.delta) >= 2) {
      const better = m.good === 'flat' ? null : (S.delta > 0) === (m.good === 'up');
      parts.push((S.delta > 0 ? 'Up ' : 'Down ') + Math.abs(S.delta).toFixed(0) + '% from the previous period' + (better == null ? '.' : better ? ', a good direction.' : ', the wrong direction.'));
    }
    return parts.join(' ');
  }

  function chart(m, cur, S, W, H) {
    const pad = { l: 52, r: 18, t: 22, b: 30 };
    if (!cur.length) return '<svg viewBox="0 0 ' + W + ' ' + H + '"><text x="' + W / 2 + '" y="' + H / 2 + '" text-anchor="middle" fill="currentColor" opacity=".6">No data yet</text></svg>';
    const ys = [];
    cur.forEach(r => { ys.push(r.v); if (r.lo != null) ys.push(r.lo); if (r.hi != null) ys.push(r.hi); });
    if (m.tgt) { if (m.tgt[0] != null) ys.push(m.tgt[0]); if (m.tgt[1] != null && m.tgt[1] < Math.max(...ys) * 1.6) ys.push(m.tgt[1]); }
    let lo = Math.min(...ys), hi = Math.max(...ys); if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const sp = hi - lo; lo -= sp * 0.08; hi += sp * 0.12; if (m.agg === 'change' && lo < 0) lo = 0;
    const t0 = cur[0].t, t1 = cur[cur.length - 1].t;
    const X = t => pad.l + (cur.length === 1 ? 0.5 : (t - t0) / (t1 - t0)) * (W - pad.l - pad.r);
    const Y = v => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">';
    // grid
    for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4, y = Y(v); s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + y + '" y2="' + y + '" class="grid"/><text x="' + (pad.l - 8) + '" y="' + (y + 4) + '" text-anchor="end" class="ax">' + esc(fmt(m, v)) + '</text>'; }
    // target band
    if (m.tgt) {
      const a = m.tgt[1] != null ? Math.min(m.tgt[1], hi) : hi, b = m.tgt[0] != null ? Math.max(m.tgt[0], lo) : lo;
      if (a > b) { const ya = Y(a), yb = Y(b); s += '<rect x="' + pad.l + '" y="' + ya + '" width="' + (W - pad.l - pad.r) + '" height="' + (yb - ya) + '" class="tg"/>'; }
      if (m.tgt[0] != null && m.tgt[0] >= lo && m.tgt[0] <= hi) s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + Y(m.tgt[0]) + '" y2="' + Y(m.tgt[0]) + '" class="tgl"/><text x="' + (pad.l + 6) + '" y="' + (Y(m.tgt[0]) - 6) + '" class="tgt">target ' + esc(tgtText(m)) + '</text>';
    }
    // daily low-high band
    const banded = cur.filter(r => r.lo != null && r.hi != null);
    if (m.band && banded.length > 1) {
      const top = banded.map(r => X(r.t).toFixed(1) + ',' + Y(r.hi).toFixed(1)).join(' ');
      const bot = banded.slice().reverse().map(r => X(r.t).toFixed(1) + ',' + Y(r.lo).toFixed(1)).join(' ');
      s += '<polygon points="' + top + ' ' + bot + '" class="band" style="fill:' + m.col + '"/>';
    }
    // average line
    const ay = Y(S.avg);
    s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + ay + '" y2="' + ay + '" class="avg" style="stroke:' + m.col + '"/><text x="' + (W - pad.r - 4) + '" y="' + (ay - 6) + '" text-anchor="end" class="avgt" style="fill:' + m.col + '">avg ' + esc(withUnit(m, S.avg)) + '</text>';
    // line
    const pts = cur.map(r => [X(r.t), Y(r.v)]);
    if (pts.length > 1) {
      s += '<path d="M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (H - pad.b) + ' L' + pts[0][0].toFixed(1) + ' ' + (H - pad.b) + ' Z" class="area" style="fill:' + m.col + '"/>';
      s += '<path d="M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + '" class="ln" style="stroke:' + m.col + '"/>';
    }
    // points, colored by target
    const isOn = v => !m.tgt || ((m.tgt[0] == null || v >= m.tgt[0]) && (m.tgt[1] == null || v <= m.tgt[1]));
    if (cur.length <= 120) cur.forEach((r, i) => { s += '<circle cx="' + pts[i][0].toFixed(1) + '" cy="' + pts[i][1].toFixed(1) + '" r="' + (cur.length > 45 ? 2.5 : 4) + '" class="' + (isOn(r.v) ? 'on' : 'off') + '"><title>' + esc(dshort(r.t) + ': ' + withUnit(m, r.v) + (r.lo != null && m.band ? ' (low ' + fmt(m, r.lo) + ', high ' + fmt(m, r.hi) + ')' : '')) + '</title></circle>'; });
    // high / low labels
    const lab = (v, t, up) => { const x = X(t), y = Y(v); const anchor = x > W * 0.8 ? 'end' : x < W * 0.2 ? 'start' : 'middle'; return '<text x="' + x + '" y="' + (up ? y - 10 : y + 18) + '" text-anchor="' + anchor + '" class="hl">' + (up ? '↑ ' : '↓ ') + esc(withUnit(m, v)) + ' · ' + esc(new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })) + '</text>'; };
    if (cur.length > 1) { s += lab(S.hi, S.hiT, true); if (S.loT !== S.hiT) s += lab(S.lo, S.loT, false); }
    // x labels
    const n = Math.min(6, cur.length);
    for (let i = 0; i < n; i++) { const r = cur[Math.round(i * (cur.length - 1) / Math.max(1, n - 1))]; s += '<text x="' + X(r.t) + '" y="' + (H - 8) + '" text-anchor="middle" class="ax">' + esc(new Date(r.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })) + '</text>'; }
    return s + '</svg>';
  }

  function statsHTML(m, S) {
    if (!S.n) return '';
    const box = (lab, val, sub, cls) => '<div class="st ' + (cls || '') + '"><span>' + lab + '</span><b>' + val + '</b><small>' + (sub || '') + '</small></div>';
    let h = box('Average', esc(withUnit(m, S.avg)), S.delta != null && Math.abs(S.delta) >= 0.5 ? (S.delta >= 0 ? '▲ ' : '▼ ') + Math.abs(S.delta).toFixed(0) + '% vs previous' : S.delta != null ? 'same as previous' : 'first period');
    h += box('↑ High', esc(withUnit(m, S.hi)), esc(dshort(S.hiT)));
    h += box('↓ Low', esc(withUnit(m, S.lo)), esc(dshort(S.loT)));
    if (m.tgt) {
      h += box('On target', S.on + ' of ' + S.n, m.per + 's · best streak ' + S.streak, S.on / S.n >= 0.7 ? 'good' : S.on / S.n >= 0.4 ? 'mid' : 'bad');
      if (S.shortAvg != null && S.shortAvg > (m.tgt && m.tgt[0] ? m.tgt[0] * 0.01 : 0)) h += box('Missed by', esc(withUnit(m, S.shortAvg)), 'per ' + m.per + (m.agg === 'change' || m.k === 'sleep' ? ' · ' + esc(withUnit(m, S.shortTot)) + ' total' : ''), 'bad');
      else if (S.overAvg != null && S.overAvg > 0) h += box('Over by', esc(withUnit(m, S.overAvg)), 'per ' + m.per + ' on average', 'bad');
      else h += box('Missed by', '0', 'right on target', 'good');
    }
    return '<div class="stats">' + h + '</div>';
  }

  function progressHTML(m, S) {
    if (!m.tgt || m.tgt[0] == null || !S.n) return '';
    const p = Math.max(0, Math.min(1, S.avg / m.tgt[0]));
    return '<div class="prog"><div class="pl"><span>Average vs target</span><b>' + Math.round(p * 100) + '%</b></div><div class="pb"><i style="width:' + (p * 100).toFixed(1) + '%"></i></div>' +
      '<div class="pl sm"><span>' + esc(withUnit(m, S.avg)) + ' average</span><span>goal ' + esc(tgtText(m)) + '</span></div></div>';
  }

  const CSS = ':host{all:initial}' +
    '.ov{position:fixed;inset:0;z-index:9999;background:rgba(14,4,16,.62);backdrop-filter:blur(4px);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 14px;font-family:var(--paper-font-body1_-_font-family,Roboto,system-ui,sans-serif);color:#FBE7EF}' +
    '.pn{width:min(1000px,100%);border-radius:24px;padding:20px 22px;background:linear-gradient(160deg,#3E1636,#241029);box-shadow:0 20px 60px rgba(0,0,0,.5),inset 0 0 0 1px rgba(255,156,194,.25)}' +
    '.pn.steam{border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.5),inset 0 0 0 2px #B8865B,inset 0 0 0 4px #2C1234,inset 0 0 0 5px rgba(232,180,160,.55)}.steam h1,.steam .st b{font-family:"Cinzel",Georgia,serif;letter-spacing:1px}' +
    '.hd{display:flex;align-items:center;gap:12px;flex-wrap:wrap}h1{margin:0;font-size:22px;font-weight:700}h1 span{margin-right:6px}' +
    '.seg{margin-left:auto;display:inline-flex;padding:3px;border-radius:999px;background:rgba(255,255,255,.07)}.seg button{all:unset;cursor:pointer;font-size:12.5px;font-weight:700;padding:6px 12px;border-radius:999px;color:#D9B3C4}.seg button.on{background:linear-gradient(120deg,#FF8DB8,#B79CFF);color:#2A0F24}' +
    '.x{all:unset;cursor:pointer;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(255,255,255,.08);margin-left:6px}.x:hover{background:rgba(255,255,255,.16)}' +
    '.now{display:flex;gap:22px;flex-wrap:wrap;align-items:baseline;margin:12px 0 4px}.now .big{font-size:34px;font-weight:800}.now .lbl{font-size:12px;color:#D9B3C4;text-transform:uppercase;letter-spacing:.6px;display:block}.now .pill{font-size:13px;font-weight:700;padding:4px 12px;border-radius:999px}' +
    '.good{color:#8FE3C6}.mid{color:#F6C46A}.bad{color:#FF9CC2}.pill.good{background:rgba(93,202,165,.18)}.pill.mid{background:rgba(239,159,39,.18)}.pill.bad{background:rgba(255,92,154,.18)}' +
    '.ch{margin-top:8px;border-radius:16px;background:rgba(255,255,255,.04);padding:6px 4px 0}.ch svg{width:100%;height:var(--chh,340px);display:block}' +
    '.grid{stroke:rgba(255,255,255,.08);stroke-dasharray:3 4}.ax{font-size:11px;fill:#C9A6B8}.tg{fill:rgba(93,202,165,.12)}.tgl{stroke:rgba(93,202,165,.9);stroke-width:1.5;stroke-dasharray:6 5}.tgt{font-size:11px;font-weight:700;fill:#8FE3C6}' +
    '.band{opacity:.16}.avg{stroke-width:1.5;stroke-dasharray:4 5;opacity:.8}.avgt{font-size:11px;font-weight:700}.area{opacity:.13}.ln{fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}' +
    'circle.on{fill:#8FE3C6;stroke:#1d3b31;stroke-width:1}circle.off{fill:#FF9CC2;stroke:#3b1d2c;stroke-width:1}.hl{font-size:12px;font-weight:800;fill:#FBE7EF;paint-order:stroke;stroke:#2A0F24;stroke-width:4px}' +
    '.leg{display:flex;gap:16px;flex-wrap:wrap;font-size:11.5px;color:#D9B3C4;margin:8px 4px 0}.leg i{display:inline-block;width:14px;height:8px;border-radius:3px;margin-right:6px;vertical-align:middle}' +
    '.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px}.st{border-radius:14px;padding:10px 12px;background:rgba(255,255,255,.05)}.st span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:#D9B3C4}.st b{display:block;font-size:20px;margin-top:2px}.st small{font-size:11.5px;color:#D9B3C4}' +
    '.st.good b{color:#8FE3C6}.st.mid b{color:#F6C46A}.st.bad b{color:#FF9CC2}' +
    '.prog{margin-top:12px}.pl{display:flex;justify-content:space-between;font-size:12.5px;font-weight:700}.pl.sm{font-size:11.5px;font-weight:500;color:#D9B3C4;margin-top:4px}.pb{height:10px;border-radius:6px;background:rgba(255,255,255,.08);margin-top:6px;overflow:hidden}.pb i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#FF5C9A,#B79CFF)}' +
    '.say{margin-top:14px;padding:12px 14px;border-radius:14px;background:rgba(255,214,232,.07);font-size:14px;line-height:1.5}' +
    '.jump{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}.jump button{all:unset;cursor:pointer;font-size:12px;font-weight:600;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.06);color:#F2D3E2}.jump button.on{background:rgba(255,141,184,.3)}' +
    '.ld{padding:80px;text-align:center;color:#D9B3C4}' + '.ov.inl{position:static;inset:auto;z-index:auto;background:none;backdrop-filter:none;-webkit-backdrop-filter:none;padding:0;display:block;overflow:visible}.ov.inl .pn{width:auto;box-sizing:border-box;box-shadow:inset 0 0 0 1px rgba(255,156,194,.25)}.ov.inl .x{display:none}.ov.inl.flat .pn,.ov.inl.flat .pn.steam{background:none;box-shadow:none;padding:10px 0 0;border-radius:0}.ov.inl.flat h1{font-size:16px}.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:10px;margin-bottom:16px}.tile{border-radius:18px;padding:12px;background:linear-gradient(160deg,color-mix(in srgb,var(--c) 18%,transparent),color-mix(in srgb,var(--c) 6%,transparent));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 30%,transparent);cursor:pointer;transition:transform .15s,box-shadow .15s}.tile:hover{transform:translateY(-2px)}.tile.on{box-shadow:inset 0 0 0 2px var(--c),0 0 14px color-mix(in srgb,var(--c) 45%,transparent)}.ti{font-size:18px}.tv{font-size:22px;font-weight:600;margin-top:4px;color:var(--primary-text-color,#FBE7EF)}.tv small{font-size:11px;font-weight:500;margin-left:3px;color:var(--secondary-text-color,#D9B3C4)}.tl{font-size:11px;color:var(--secondary-text-color,#D9B3C4);text-transform:uppercase;letter-spacing:.4px;margin-top:2px}h1 small{font-size:13px;font-weight:600;color:#D9B3C4}.tgtl{font-size:13px;color:#D9B3C4}.tgtl b{color:#FBE7EF}.pill{font-size:13px;font-weight:700;padding:4px 12px;border-radius:999px}.ov.inl .pn{background:linear-gradient(145deg,rgba(255,92,154,.10),rgba(156,123,242,.08));box-shadow:0 6px 22px rgba(228,111,216,.12),inset 0 0 0 1px rgba(255,156,194,.28);padding:18px}.ch{margin-top:6px}' + '.ov,.ov *{font-family:Roboto,"Segoe UI",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;-webkit-font-smoothing:antialiased}.tv{font-size:24px;color:#FFF1F7}.tv small{font-size:12.5px;color:#EBD3DF}.tl,.st span{font-size:12.5px;color:#EBD3DF;letter-spacing:.3px}.st b{font-size:22px;color:#FFF1F7}.st small,.pl.sm,.leg,.tgtl,h1 small{font-size:13.5px;color:#EBD3DF}.pl{font-size:14px}.say{font-size:15.5px;color:#FFF1F7}.seg button{font-size:14px;color:#EBD3DF}h1{font-size:24px;color:#FFF1F7}.ax{font-size:13px;fill:#E6CEDB}.tgt,.avgt{font-size:13px}.hl{font-size:14px}' + '.tile{position:relative}.dial{position:absolute;top:8px;right:8px;width:42px;height:42px}.tile .tv{margin-top:20px}' + '.tile.r-ok{box-shadow:inset 0 0 0 2.5px #23A07A}.tile.r-bad{box-shadow:inset 0 0 0 2.5px #E0457F}.tile.r-na{box-shadow:inset 0 0 0 2.5px #E8B023}.tile.on.r-ok{box-shadow:inset 0 0 0 4px #23A07A,0 0 16px rgba(35,160,122,.55)}.tile.on.r-bad{box-shadow:inset 0 0 0 4px #E0457F,0 0 16px rgba(224,69,127,.55)}.tile.on.r-na{box-shadow:inset 0 0 0 4px #E8B023,0 0 16px rgba(232,176,35,.55)}.tile.on{transform:translateY(-2px)}.rl{display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--secondary-text-color);margin:-6px 2px 14px}.rl i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px}.rl i.ok{background:#23A07A}.rl i.bad{background:#E0457F}.rl i.na{background:#E8B023}' + '.info{margin-top:12px;padding:12px 14px;border-radius:14px;background:rgba(127,127,127,.09);font-size:14.5px;line-height:1.55;color:var(--primary-text-color)}.info p{margin:6px 0}.ih{display:flex;justify-content:space-between;align-items:center;gap:10px}.ir{margin-top:4px}.ib{all:unset;cursor:pointer;font-size:13px;font-weight:600;color:var(--secondary-text-color);padding:3px 10px;border-radius:999px;background:rgba(127,127,127,.13)}.info.sm{padding:6px 8px;background:none}' + '.ov{color:var(--primary-text-color)}h1,.tv,.st b,.say,.tgtl b,.pl{color:var(--primary-text-color)}.tv small,.tl,.st span,.st small,.pl.sm,.leg,.tgtl,h1 small,.seg button,.ld{color:var(--secondary-text-color)}.seg button.on{color:#2A0F24}.good,.st.good b{color:#23A07A}.mid,.st.mid b{color:#D08A10}.bad,.st.bad b{color:#E0457F}.pill.good{background:rgba(35,160,122,.15)}.pill.bad{background:rgba(224,69,127,.14)}.st,.say{background:rgba(127,127,127,.09)}.seg{background:rgba(127,127,127,.13)}.pb{background:rgba(127,127,127,.18)}.ch{background:rgba(127,127,127,.05)}.grid{stroke:rgba(127,127,127,.28)}.ax{fill:var(--secondary-text-color)}.hl{fill:var(--primary-text-color);stroke:var(--card-background-color,#fff);stroke-width:5px}.tgt{fill:#23A07A}.tgl{stroke:#23A07A}.tg{fill:rgba(35,160,122,.10)}circle.on{fill:#2FB88D;stroke:#fff}circle.off{fill:#E8578E;stroke:#fff}.ov.inl .pn.steam{box-shadow:inset 0 0 0 2px #B8865B,inset 0 0 0 4px #2C1234,inset 0 0 0 5px rgba(232,180,160,.55)}';

  const INFO = {
    sleep: { what: 'How long you were actually asleep last night, as recorded by your phone or watch.', good: 'Adults do best with 7–9 hours a night, most nights.', help: 'same bedtime every night, a dark cool room (65–68°F), no caffeine after noon, screens off an hour before bed', hurt: 'late caffeine or alcohol, stress, a warm or stuffy room, an irregular schedule' },
    steps: { what: 'How many steps you have taken so far today.', good: '7,000+ a day is linked with real health benefits. More is better, up to about 10,000.', help: 'short walks after meals, taking the stairs, walking while on calls, keeping your phone on you', hurt: 'long stretches of sitting; leaving your phone behind also means steps go uncounted' },
    active: { what: 'Calories you burned by moving today, on top of what your body burns at rest.', good: '300+ kcal a day is your Move goal.', help: 'brisk walking, housework, anything that gets your heart rate up', hurt: 'mostly-sitting days' },
    rhr: { what: 'Your heart rate when you are completely at rest, usually measured while sitting still or asleep.', good: '60–100 bpm is the normal range. Lower within that usually means a fitter heart. A jump of 5+ above your usual is worth noticing.', help: 'regular walking or cardio, good sleep, drinking enough water', hurt: 'stress, poor sleep, illness, alcohol, dehydration' },
    hrv: { what: 'Heart rate variability: the tiny changes in timing between heartbeats. More variation means your body is rested and relaxed.', good: 'Higher is better. Compare it to YOUR normal, not other people: everyone\'s range is different and it drops with age.', help: 'good sleep, staying hydrated, easy days, slow deep breathing', hurt: 'stress, alcohol, getting sick, very hard workouts, late heavy meals' },
    hr: { what: 'Your heart rate through the day, during whatever you are doing.', good: 'It naturally goes up with activity and down with rest. Resting heart is the number to watch for trends.', help: '', hurt: 'If it is unusually high while you are sitting still, or comes with dizziness or chest pain, call your doctor.' },
    spo2: { what: 'Blood oxygen: the percentage of oxygen your blood is carrying.', good: '95–100% is normal. Wrist readings can dip a little if the watch is loose or you are moving.', help: '', hurt: 'Readings under 92% at rest, or with shortness of breath, are a reason to call your doctor.' },
    resp: { what: 'Breaths per minute, usually measured while you sleep.', good: '12–20 breaths a minute at rest is normal. A jump from your usual can be an early sign of getting sick.', help: 'relaxed, slow breathing; treating congestion', hurt: 'fever, illness, anxiety, a stuffy room' },
    deep: { what: 'Time spent in deep sleep, the stage where your body repairs muscles and strengthens your immune system. Watches estimate this.', good: 'About 1–1.5 hours a night (roughly 15–20% of your sleep) is typical.', help: 'a regular sleep schedule, exercise earlier in the day, a cool dark room', hurt: 'alcohol, late heavy meals, caffeine, short nights' },
    dist: { what: 'How many miles you walked or ran today.', good: 'No set target. Watch the trend: more days moving is the goal.', help: 'adding a short walk to your routine', hurt: 'mostly-sitting days' },
    vo2: { what: 'VO₂ max: an estimate of how much oxygen your body can use during exercise. It is the best single measure of cardio fitness.', good: 'Higher is better. The Health app shows how yours compares for your age; climbing over months means you are getting fitter.', help: 'brisk walks where you breathe harder, hills, short faster intervals', hurt: 'long inactive stretches' },
    whr: { what: 'Your average heart rate while walking.', good: 'Lower over time at the same pace means you are getting fitter.', help: 'regular walking', hurt: 'heat, stress, illness, poor sleep' },
    btemp: { what: 'The temperature in your bedroom.', good: '65–68°F is the best range for sleep.', help: 'lowering the thermostat at night, a fan, lighter bedding', hurt: 'a warm room makes sleep lighter and more restless' },
    co2: { what: 'Carbon dioxide in the air indoors. It builds up from breathing in a closed room.', good: 'Under 1,000 ppm is good. Above about 1,500 ppm, rooms feel stuffy and can cause headaches, drowsiness and poorer sleep.', help: 'cracking a window, running the HVAC fan, leaving the door open', hurt: 'a closed-up room, more people or pets in it' }
  };
  window.__hdInfo = INFO;
  for (const k in M) M[k].suf = M[k].id.startsWith(P) ? M[k].id.slice(P.length) : null;
  window.__hdConfigure = o => { if (o.prefix) for (const k in M) if (M[k].suf) M[k].id = o.prefix + M[k].suf; M.btemp.id = o.btemp || ''; M.co2.id = o.co2 || ''; if (o.celsius) { M.btemp.unit = '°C'; M.btemp.tgt = [18, 20]; INFO.btemp.good = '18–20°C is the best range for sleep.'; INFO.sleep.help = INFO.sleep.help.replace('65–68°F', '18–20°C'); } };
  window.__hdDialP = (k, raw) => { const m = M[k]; if (!m || !m.tgt || raw == null || !isFinite(raw)) return null; const v = raw * (m.scale || 1), lo = m.tgt[0], hi = m.tgt[1]; if ((lo == null || v >= lo) && (hi == null || v <= hi)) return 1; if (lo != null && v < lo) return Math.max(0, Math.min(1, v / lo)); return Math.max(0, Math.min(1, hi / v)); };
  window.__hdDial = (k, raw) => {
    const p = window.__hdDialP(k, raw); if (p == null) return '';
    const N = 24, lit = p >= 1 ? N : Math.min(N - 1, Math.round(p * N));
    const hx = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const R = hx('#E0457F'), A = hx('#E8B023'), G = hx('#23A07A');
    const mix = (a, b, t) => 'rgb(' + a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',') + ')';
    const col = t => t < 0.5 ? mix(R, A, t / 0.5) : mix(A, G, (t - 0.5) / 0.5);
    let s = '<svg class="dial" viewBox="0 0 40 40" aria-label="' + (p >= 1 ? 'in range' : Math.round(p * 100) + '% of the way to goal') + '">';
    for (let i = 0; i < N; i++) { const a = (-90 + i * 360 / N) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a); s += '<line x1="' + (20 + 13.5 * c).toFixed(2) + '" y1="' + (20 + 13.5 * sn).toFixed(2) + '" x2="' + (20 + 18.5 * c).toFixed(2) + '" y2="' + (20 + 18.5 * sn).toFixed(2) + '" stroke="' + (i < lit ? col(i / (N - 1)) : 'rgba(127,127,127,.28)') + '" stroke-width="2.2" stroke-linecap="round"/>'; }
    s += '<text x="20" y="' + (p >= 1 ? 24.5 : 23.5) + '" text-anchor="middle" style="font:700 ' + (p >= 1 ? 13 : 9.5) + 'px Roboto,system-ui,sans-serif;fill:' + (p >= 1 ? '#23A07A' : 'var(--primary-text-color)') + '">' + (p >= 1 ? '✓' : Math.round(p * 100) + '%') + '</text></svg>';
    return s;
  };
  window.__hdRingFor = (k, raw) => { const m = M[k]; if (!m || !m.tgt || raw == null || !isFinite(raw)) return 'r-na'; const v = raw * (m.scale || 1); return ((m.tgt[0] == null || v >= m.tgt[0]) && (m.tgt[1] == null || v <= m.tgt[1])) ? 'r-ok' : 'r-bad'; };
  class HD {
    constructor() { this.v = 1; this.range = 30; try { this.range = +localStorage.getItem('hd_range') || 30; } catch (e) {} }
    has(k) { return !!M[k]; }
    open(k, hass) {
      if (!M[k]) return;
      this.k = k; this.h = hass || (document.querySelector('home-assistant') || {}).hass; { const cs = [...(window.__hdCards || [])].filter(c => c.isConnected && c.d); const tg = cs.find(c => c.d.group && c.d.group.includes(k)) || cs.find(c => !c.d.group); if (tg && tg.d !== this) { this.close(); tg.d.open(k, this.h); return; } } if (this.inl && this.inl.isConnected) { this.close(); this._dim(); this.load();  return; }
      if (!this.host) {
        this.host = document.createElement('div'); this.host.id = 'health-detail-host';
        this.root = this.host.attachShadow({ mode: 'open' });
        this._esc = e => { if (e.key === 'Escape') this.close(); };
      }
      if (!this.host.isConnected) { document.body.appendChild(this.host); document.addEventListener('keydown', this._esc); }
      this.data = null; this.render(); this.load();
    }
    _dim() { const R = this.inl && this.inl.isConnected ? this.inl.shadowRoot : this.root; const pn = R && R.querySelector('.pn'); if (!this.data || !pn) { this.data = null; this.render(); return; } pn.style.transition = 'opacity .15s'; pn.style.opacity = '.55'; }
    close() { if (this.host) this.host.remove(); document.removeEventListener('keydown', this._esc); }
    async load() {
      const m = Object.assign({ k: this.k }, M[this.k]), h = this.h, days = this.range, tok = (this.tok = (this.tok || 0) + 1);
      const end = new Date(); end.setHours(24, 0, 0, 0);
      const start = new Date(end.getTime() - days * 2 * 864e5);
      try {
        const res = await h.callWS({ type: 'recorder/statistics_during_period', start_time: start.toISOString(), end_time: end.toISOString(), statistic_ids: [m.id], period: days > 120 ? 'week' : 'day', types: ['mean', 'min', 'max', 'change'] });
        if (tok !== this.tok) return;
        const sc = m.scale || 1;
        let rows = (res[m.id] || []).map(r => {
          let v = m.agg === 'change' ? r.change : m.agg === 'max' ? r.max : r.mean;
          if (v == null || !isFinite(v) || (m.agg === 'change' && v === 0)) return null;
          const t = typeof r.start === 'number' ? r.start : new Date(r.start).getTime();
          return { t, v: v * sc, lo: r.min != null ? r.min * sc : null, hi: r.max != null ? r.max * sc : null };
        }).filter(Boolean);
        // today's running total: trust the live sensor if it is ahead of the stats
        const st = h.states[m.id], today0 = new Date(); today0.setHours(0, 0, 0, 0);
        if (m.agg === 'change' && st && isFinite(parseFloat(st.state)) && days <= 120) {
          const live = parseFloat(st.state) * sc, last = rows[rows.length - 1];
          if (last && last.t >= today0.getTime()) { if (live > last.v) last.v = live; } else rows.push({ t: today0.getTime(), v: live, lo: null, hi: null });
        }
        const cut = end.getTime() - days * 864e5;
        this.data = { m, cur: rows.filter(r => r.t >= cut), prev: rows.filter(r => r.t < cut) };
      } catch (e) { this.data = { m, cur: [], prev: [], err: String(e && e.message || e) }; }
      this.render(); if (this.inl && this.inl.isConnected && this.data) { this.inl.style.display = 'block'; const hh = this.inl.offsetHeight; if (hh > (parseFloat(this.inl.style.minHeight) || 0)) this.inl.style.minHeight = hh + 'px'; }
    }
    render() {
      if (this.h && !(M[this.k] && M[this.k].id && this.h.states[M[this.k].id])) { const f = ORDER.find(k => (!this.group || this.group.includes(k)) && M[k].id && this.h.states[M[k].id]); if (f && f !== this.k) { this.k = f; this.data = null; setTimeout(() => this.load(), 0); } }
      const m = Object.assign({ k: this.k }, M[this.k]);
      const H = this.h;
      const R = this.inl && this.inl.isConnected ? this.inl.shadowRoot : this.root;
      if (!R) return;
      const steam = !!(H && H.states['input_boolean.steampunk_style'] && H.states['input_boolean.steampunk_style'].state === 'on');
      const liveOf = k => { const s = H && H.states[M[k].id]; return s && isFinite(parseFloat(s.state)) ? parseFloat(s.state) * (M[k].scale || 1) : null; };
      const live = liveOf(this.k);
      const W = this.inl && this.inl.isConnected ? Math.max(320, Math.round(this.inl.getBoundingClientRect().width - (this.flat ? 8 : 40))) : 960;
      const keys = ORDER.filter(k => (!this.group || this.group.includes(k)) && H && M[k].id && H.states[M[k].id]);
      const tv = k => { const v = liveOf(k), mm = Object.assign({ k }, M[k]); if (v == null) return '—'; if (mm.fmt) return esc(mm.fmt(v)); return esc(fmt(mm, v)) + (mm.unit ? '<small>' + esc(mm.unit) + '</small>' : ''); };
      const tiles = '<div class="tiles">' + keys.map(k => '<div class="tile ' + window.__hdRingFor(k, H && H.states[M[k].id] ? parseFloat(H.states[M[k].id].state) : null) + (k === this.k ? ' on' : '') + '" data-j="' + k + '" title="' + esc(INFO[k] ? INFO[k].what : '') + '" style="--c:' + M[k].col + '"><div class="ti">' + M[k].emoji + '</div>' + window.__hdDial(k, H && H.states[M[k].id] ? parseFloat(H.states[M[k].id].state) : null) + '<div class="tv">' + tv(k) + '</div><div class="tl">' + esc(M[k].name) + '</div></div>').join('') + '</div><div class="rl"><span><i class="ok"></i>in range</span><span><i class="bad"></i>out of range</span><span><i class="na"></i>no target</span></div>';
      let status = '';
      if (m.tgt && live != null) {
        const t = m.tgt;
        const on = (t[0] == null || live >= t[0]) && (t[1] == null || live <= t[1]);
        const low = t[0] != null && live < t[0];
        const gap = low ? t[0] - live : t[1] != null && live > t[1] ? live - t[1] : 0;
        status = '<span class="tgtl">Target <b>' + esc(tgtText(m)) + '</b></span><span class="pill ' + (on ? 'good' : 'bad') + '">' + (on ? '✓ on target now' : (low ? '▼ ' : '▲ ') + esc(withUnit(m, gap)) + (low ? ' short now' : ' over now')) + '</span>';
      } else if (m.tgt) status = '<span class="tgtl">Target <b>' + esc(tgtText(m)) + '</b></span>';
      const rl = (RANGES.find(x => x[0] === this.range) || [0, ''])[1];
      const head = '<div class="hd"><h1><span>' + m.emoji + '</span>' + esc(m.name) + ' <small>· ' + rl + ' averages</small></h1>' + status +
        '<div class="seg">' + RANGES.map(([n, l]) => '<button data-r="' + n + '" class="' + (n === this.range ? 'on' : '') + '">' + l + '</button>').join('') + '</div><button class="x" title="Close">✕</button></div>';
      let body = '<div class="ld">Loading ' + esc(m.name) + '…</div>';
      if (this.data) {
        const S = compute(m, this.data.cur, this.data.prev);
        const leg = '<div class="leg"><span><i style="background:' + m.col + '"></i>' + (m.agg === 'change' ? 'daily total' : m.agg === 'max' ? 'nightly value' : 'daily average') + '</span>' + (m.band ? '<span><i style="background:' + m.col + ';opacity:.3"></i>daily low–high</span>' : '') + (m.tgt ? '<span><i style="background:rgba(93,202,165,.35)"></i>target</span><span><i style="background:#8FE3C6;border-radius:50%;width:8px"></i>on target</span><span><i style="background:#FF9CC2;border-radius:50%;width:8px"></i>missed</span>' : '') + '<span><i style="border-top:2px dashed ' + m.col + ';height:0"></i>average</span></div>';
        body = (this.data.err ? '<div class="say bad">' + esc(this.data.err) + '</div>' : '') +
          statsHTML(m, S) + progressHTML(m, S) +
          '<div class="say">💬 ' + esc(verdict(m, S)) + '</div>' +
          leg + '<div class="ch" style="--chh:' + (this.H || 340) + 'px">' + chart(m, this.data.cur, S, W, this.H || 340) + '</div>';
      }
      if (this.infoOpen == null) { try { this.infoOpen = localStorage.getItem('hd_info') !== '0'; } catch (e) { this.infoOpen = true; } }
      const I = INFO[this.k];
      const info = !I ? '' : this.infoOpen ? '<div class="info"><div class="ih"><b>ⓘ What is ' + esc(m.name) + '?</b><button class="ib">hide ▲</button></div><p>' + esc(I.what) + '</p><div class="ir">👍 ' + esc(I.good) + '</div>' + (I.help ? '<div class="ir">⬆ Better with: ' + esc(I.help) + '</div>' : '') + (I.hurt ? '<div class="ir">' + (I.help ? '⬇ Worse with: ' : '⚠️ ') + esc(I.hurt) + '</div>' : '') + '</div>' : '<div class="info sm"><button class="ib">ⓘ What is ' + esc(m.name) + '? show ▼</button></div>';
      R.innerHTML = '<style>' + CSS + '</style><div class="ov' + (R !== this.root ? ' inl' : '') + (this.flat ? ' flat' : '') + '"><div class="pn' + (steam ? ' steam' : '') + '">' + tiles + head + info + body + '</div></div>';
      const r = R;
      r.querySelectorAll('.ib').forEach(b => b.addEventListener('click', () => { this.infoOpen = !this.infoOpen; try { localStorage.setItem('hd_info', this.infoOpen ? '1' : '0'); } catch (e) {} if (this.inl) this.inl.style.minHeight = ''; this.render(); }));
      r.querySelector('.ov').addEventListener('click', e => { if (e.target.classList.contains('ov')) this.close(); });
      r.querySelector('.x').addEventListener('click', () => this.close());
      r.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { this.range = +b.dataset.r; try { localStorage.setItem('hd_range', this.range); } catch (e) {} r.querySelectorAll('[data-r]').forEach(x => x.classList.toggle('on', x === b)); this._dim(); this.load(); }));
      r.querySelectorAll('[data-j]').forEach(b => b.addEventListener('click', () => { this.k = b.dataset.j; r.querySelectorAll('[data-j]').forEach(x => x.classList.toggle('on', x === b)); this._dim(); this.load(); }));
    }
  }
  window.__hd = new HD(); if (!customElements.get('health-detail-card')) customElements.define('health-detail-card', class extends HTMLElement { setConfig(c) { this.c = c || {}; } getCardSize() { return 9; } set hass(h) { if (!this.d) { const c = this.c || {}; this.d = new HD(); this.d.inl = this; this.d.group = c.metrics || null; this.d.flat = !!c.flat; this.d.H = c.height || 340; this.d.k = c.metric || 'sleep'; (window.__hdCards = window.__hdCards || new Set()).add(this); } const d = this.d; d.h = h; const pp = this.parentNode; if (pp && pp.querySelectorAll) pp.querySelectorAll(':scope > hui-error-card').forEach(e => e.remove()); if (!this.isConnected) return; if (!this.shadowRoot) this.attachShadow({ mode: 'open' }); if (!this._init) { this._init = true; d.data = null; d.render(); d.load(); } } connectedCallback() { (window.__hdCards = window.__hdCards || new Set()).add(this); if (!this._init) { const hh = (this.d && this.d.h) || (document.querySelector('home-assistant') || {}).hass; if (hh) setTimeout(() => { this.hass = hh; }, 0); } } disconnectedCallback() { setTimeout(() => { if (!this.isConnected && window.__hdCards) window.__hdCards.delete(this); }, 0); } }); window.customCards = window.customCards || []; window.customCards.push({ type: 'health-detail-card', name: 'Health detail card', description: 'Big trend with target, high/low and what you missed' });
  window.__hdTest = { M, compute, verdict, chart, statsHTML, fmt, withUnit };
})();

class HealthInsightsCard extends HTMLElement {
  setConfig(c) {
    this._c = Object.assign({
      hrv: 'sensor.my_iphone_heart_rate_variability',
      rhr: 'sensor.my_iphone_resting_heart_rate',
      sleep: 'sensor.my_iphone_sleep_duration',
      sleep_goal: 420,
      bedroom_temp: null,
      co2: null,
      sync_prefix: 'sensor.my_iphone_',
      ideal_low: 65, ideal_high: 68
    }, c || {});
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._render();
  }
  set hass(h) {
    const first = !this._h;
    this._h = h;
    const sp = !!(h.states['input_boolean.steampunk_style'] && h.states['input_boolean.steampunk_style'].state === 'on');
    const sig = [this._c.hrv, this._c.rhr, this._c.sleep].map(e => (h.states[e] || {}).state).join('|');
    if (sp !== this._sp) { this._sp = sp; this._render(); }
    if (first || sig !== this._sig) { this._sig = sig; this._load(); }
    const now = Date.now();
    if (!this._lastTick || now - this._lastTick > 60000) { this._lastTick = now; this._render(); }
  }
  connectedCallback() { if (!this._timer) this._timer = setInterval(() => this._load(), 15 * 60000); }
  disconnectedCallback() { clearInterval(this._timer); this._timer = null; }
  getCardSize() { return 6; }
  getGridOptions() { return { columns: 'full', rows: 'auto' }; }

  _num(e) { const s = this._h && this._h.states[e]; const v = s ? parseFloat(s.state) : NaN; return isNaN(v) ? null : v; }

  async _load() {
    const h = this._h, c = this._c;
    if (!h || this._busy) return;
    this._busy = true;
    try {
      const dayMs = 864e5;
      const today0 = new Date(); today0.setHours(0, 0, 0, 0);
      const st = await h.callWS({ type: 'recorder/statistics_during_period', start_time: new Date(today0 - 30 * dayMs).toISOString(), end_time: today0.toISOString(), statistic_ids: [c.hrv, c.rhr], period: 'day', types: ['mean'] }).catch(() => ({}));
      const avg = id => { const a = (st[id] || []).map(x => x.mean).filter(v => v != null && !isNaN(v)); if (!a.length) return null; const s2 = a.slice().sort((x, y) => x - y); const q = p => s2[Math.round(p * (s2.length - 1))]; return { v: a.reduce((s, x) => s + x, 0) / a.length, n: a.length, lo: s2.length >= 3 ? q(0.1) : null, hi: s2.length >= 3 ? q(0.9) : null }; };
      const base = { hrv: avg(c.hrv), rhr: avg(c.rhr) };
      // nightly sleep: last numeric value per local day over 14 days
      const hist = await h.callWS({ type: 'history/history_during_period', start_time: new Date(today0 - 13 * dayMs).toISOString(), entity_ids: [c.sleep], minimal_response: true, no_attributes: true }).catch(() => ({}));
      const pts = (hist[c.sleep] || []).map(p => ({ v: parseFloat(p.s), t: (p.lu || p.lc) * 1000 })).filter(p => !isNaN(p.v) && p.t);
      const nights = [];
      for (let i = 13; i >= 0; i--) {
        const d0 = new Date(today0.getTime() - i * dayMs), d1 = new Date(d0.getTime() + dayMs);
        const inDay = pts.filter(p => p.t >= d0 && p.t < d1);
        nights.push({ d: d0, v: inDay.length ? inDay[inDay.length - 1].v : null });
      }
      if (nights[13].v == null) { const cur = this._num(c.sleep); if (cur != null) nights[13].v = cur; }
      // bedroom overnight: 10pm yesterday to 8am today
      const n0 = new Date(today0.getTime() - 2 * 3600e3), n1 = new Date(today0.getTime() + 8 * 3600e3);
      const bh = await h.callWS({ type: 'history/history_during_period', start_time: n0.toISOString(), end_time: new Date(Math.min(Date.now(), n1)).toISOString(), entity_ids: [c.bedroom_temp, c.co2].filter(Boolean), minimal_response: true, no_attributes: true }).catch(() => ({}));
      const series = id => (bh[id] || []).map(p => ({ v: parseFloat(p.s), t: (p.lu || p.lc) * 1000 })).filter(p => !isNaN(p.v));
      const tw = (arr, end) => { // time-weighted average
        if (!arr.length) return null; let sum = 0, tot = 0;
        for (let i = 0; i < arr.length; i++) { const a = Math.max(arr[i].t, n0.getTime()); const b = i + 1 < arr.length ? arr[i + 1].t : end; if (b > a) { sum += arr[i].v * (b - a); tot += b - a; } }
        return tot ? sum / tot : arr[arr.length - 1].v;
      };
      const endT = Math.min(Date.now(), n1.getTime());
      const tS = series(c.bedroom_temp), cS = series(c.co2);
      let over = 0;
      for (let i = 0; i < cS.length; i++) { const a = Math.max(cS[i].t, n0.getTime()); const b = i + 1 < cS.length ? cS[i + 1].t : endT; if (cS[i].v >= 1000 && b > a) over += b - a; }
      const bedroom = {
        tAvg: tw(tS, endT), tMin: tS.length ? Math.min(...tS.map(p => p.v)) : null, tMax: tS.length ? Math.max(...tS.map(p => p.v)) : null,
        cPeak: cS.length ? Math.max(...cS.map(p => p.v)) : null, cAvg: tw(cS, endT), cOver: over / 60000
      };
      this._d = { base, nights, bedroom };
    } catch (e) { this._d = this._d || { err: String(e) }; }
    this._busy = false;
    this._render();
  }

  _readiness() {
    const c = this._c, d = this._d || {}, b = d.base || {};
    const hrv = this._num(c.hrv), rhr = this._num(c.rhr), sl = this._num(c.sleep);
    const parts = [];
    const clamp = x => Math.max(0, Math.min(100, x));
    const hm = m => Math.floor(m / 60) + 'h ' + Math.round(m % 60) + 'm';
    const nv = (d.nights || []).map(n => n.v).filter(v => v != null).sort((x, y) => x - y);
    const sq = p => nv.length >= 3 ? nv[Math.round(p * (nv.length - 1))] : null;
    if (hrv != null && b.hrv) parts.push({ k: 'HRV', w: 0.4, s: clamp((hrv / b.hrv.v - 0.6) / 0.5 * 100), now: hrv.toFixed(0) + ' ms', val: hrv, nlo: b.hrv.lo, nhi: b.hrv.hi, fmt: v => v.toFixed(0), base: b.hrv.v.toFixed(0) });
    if (rhr != null && b.rhr) parts.push({ k: 'Resting heart', w: 0.3, s: clamp((b.rhr.v - rhr + 8) / 13 * 100), now: rhr.toFixed(0) + ' bpm', val: rhr, nlo: b.rhr.lo, nhi: b.rhr.hi, tlo: 60, thi: 100, fmt: v => v.toFixed(0), base: b.rhr.v.toFixed(0) });
    if (sl != null) parts.push({ k: 'Sleep', w: 0.3, s: clamp(sl / c.sleep_goal * 100), now: hm(sl), val: sl, nlo: sq(0.1), nhi: sq(0.9), tlo: c.sleep_goal, thi: 540, fmt: hm, base: Math.round(c.sleep_goal / 60) + 'h goal' });
    if (!parts.length) return null;
    const wsum = parts.reduce((s, p) => s + p.w, 0);
    const score = Math.round(parts.reduce((s, p) => s + p.s * p.w, 0) / wsum);
    const label = score >= 75 ? 'Ready to go' : score >= 55 ? 'Steady day' : 'Take it easy';
    const days = Math.max(b.hrv ? b.hrv.n : 0, b.rhr ? b.rhr.n : 0);
    return { score, label, parts, days };
  }
  _sync() {
    const h = this._h; if (!h) return null;
    const ids = Object.keys(h.states).filter(e => e.startsWith(this._c.sync_prefix) && /heart|sleep|steps|energy|oxygen|respir|hrv|variability/.test(e));
    const t = Math.max(...ids.map(e => new Date(h.states[e].last_updated).getTime()).filter(x => !isNaN(x)));
    if (!isFinite(t)) return null;
    const m = Math.round((Date.now() - t) / 60000);
    const txt = m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago';
    return { m, txt, lvl: m > 720 ? 'bad' : m > 180 ? 'warn' : 'ok' };
  }

  _render() {
    if (!this.shadowRoot || !this._c) return;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const sp = this._sp, c = this._c, d = this._d;
    const r = this._h ? this._readiness() : null;
    const sy = this._sync();
    const accent = '#FF8DB8';
    const brassPanel = 'background:linear-gradient(160deg,rgba(84,30,66,.94),rgba(44,18,52,.94));box-shadow:0 10px 26px rgba(20,4,18,.45),inset 0 0 0 2px #B8865B,inset 0 0 0 4px rgba(44,18,52,.95),inset 0 0 0 5px rgba(232,180,160,.55);border-radius:16px;';
    const softPanel = 'background:linear-gradient(145deg,rgba(255,92,154,.10),rgba(156,123,242,.08));box-shadow:0 6px 22px rgba(228,111,216,.12),inset 0 0 0 1px rgba(255,156,194,.28);border-radius:24px;';
    const head = sp ? 'font-family:"Cinzel",Georgia,serif;letter-spacing:1.2px;color:#F2C6B4;' : '';
    let css = ':host{display:block}' +
      '.grid{display:grid;grid-template-columns:1.25fr 1.15fr 1fr;gap:12px}' +
      '@media (max-width:1000px){.grid{grid-template-columns:1fr 1fr}.ready{grid-column:1 / -1}}' +
      '@media (max-width:640px){.grid{grid-template-columns:1fr}}' +
      '.p{position:relative;overflow:hidden;padding:16px 16px 14px;color:var(--primary-text-color);' + (sp ? brassPanel + '--primary-text-color:#FBE7EF;--secondary-text-color:#D9B3C4;' : softPanel) + '}' +
      'h2{margin:0 0 10px;font-size:15px;font-weight:' + (sp ? 700 : 600) + ';display:flex;align-items:center;gap:8px;' + head + '}h2 .r{margin-left:auto;font-size:11.5px;font-weight:600;font-family:inherit}' +
      '.sub{font-size:12px;color:var(--secondary-text-color)}' +
      '.ready .top{display:flex;align-items:center;gap:16px}' +
      '.dial{position:relative;width:96px;height:96px;flex:0 0 96px}.dial svg{transform:rotate(-90deg)}.dial b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700' + (sp ? ';font-family:"Cinzel",Georgia,serif;color:#F2C6B4' : '') + '}' +
      '.lab{font-size:20px;font-weight:700;margin-bottom:2px' + (sp ? ';font-family:"Cinzel",Georgia,serif;color:#F2C6B4' : '') + '}' +
      '.rows{margin-top:12px;display:grid;gap:6px}.row{display:grid;grid-template-columns:110px 1fr auto;align-items:center;gap:10px;font-size:12.5px}' +
      '.trk{position:relative;height:10px;border-radius:5px;background:rgba(255,255,255,.10)}.trk i,.lg{position:absolute;display:block}' +
      '.trk .tg,.lg.tg{top:-2px;bottom:-2px;border:1px dashed rgba(93,202,165,.85);border-radius:6px;background:rgba(93,202,165,.10)}.trk .nm,.lg.nm{top:1px;bottom:1px;border-radius:4px;background:rgba(183,156,255,.5)}' +
      '.trk .dt{top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#fff}' +
      '.rleg2{display:flex;gap:12px;margin-top:8px;font-size:10.5px;color:var(--secondary-text-color)}.rleg2 span{display:flex;align-items:center;gap:5px}.lg{position:relative!important;width:14px;height:8px;top:auto!important;bottom:auto!important}.lg.dt{width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px #FF8DB8}' +
      '.strip span b.mk{position:absolute;top:-15px;left:50%;transform:translateX(-50%);font-size:10px;font-weight:700;white-space:nowrap;color:var(--primary-text-color)}' +
      '.v{font-weight:700;white-space:nowrap}.v small{font-weight:500;color:var(--secondary-text-color)}' +
      '.strip{display:grid;grid-template-columns:repeat(14,1fr);gap:4px;align-items:end;height:92px;margin-top:6px;position:relative}' +
      '.strip .goal{position:absolute;left:0;right:0;border-top:1px dashed rgba(255,214,232,.45)}' +
      '.strip span{display:block;border-radius:4px 4px 2px 2px;min-height:3px;position:relative}' +
      '.strip span.none{background:repeating-linear-gradient(45deg,rgba(255,255,255,.08) 0 3px,transparent 3px 6px);height:100%!important;opacity:.6}' +
      '.days{display:grid;grid-template-columns:repeat(14,1fr);gap:4px;margin-top:4px;font-size:9.5px;text-align:center;color:var(--secondary-text-color)}' +
      '.stats{display:flex;gap:14px;margin-top:10px;font-size:12px;flex-wrap:wrap}.stats b{font-size:15px;display:block;color:var(--primary-text-color)}' +
      '.bed{display:grid;gap:10px}.tile{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:center;padding:9px 10px;border-radius:12px;background:rgba(255,214,232,.07)}' +
      '.tile .ic{font-size:20px;text-align:center}.tile b{font-size:16px}.tile .tag{display:inline-block;margin-left:6px;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:7px}' +
      '.ok{background:rgba(93,202,165,.2);color:#8FE3C6}.warn{background:rgba(239,159,39,.22);color:#F6C46A}.bad{background:rgba(255,92,154,.22);color:#FF9CC2}' +
      '.sync{position:absolute;top:14px;right:16px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px}' +
      '.tip{margin-top:10px;font-size:12px;line-height:1.4;padding:8px 10px;border-radius:10px;background:rgba(255,214,232,.07)}';
    // readiness
    let ready = '<div class="p ready"><h2>🧭 Today\'s readiness' + (sy ? '<span class="r sync ' + sy.lvl + '">synced ' + esc(sy.txt) + '</span>' : '') + '</h2>';
    if (!r) ready += '<div class="sub">Waiting for heart and sleep data…</div>';
    else {
      const col = r.score >= 75 ? '#5DCAA5' : r.score >= 55 ? '#F6C46A' : accent;
      const C = 2 * Math.PI * 40;
      ready += '<div class="top"><div class="dial"><svg width="96" height="96"><circle cx="48" cy="48" r="40" fill="none" stroke="' + (sp ? 'rgba(184,134,91,.35)' : 'rgba(255,255,255,.1)') + '" stroke-width="9"/><circle cx="48" cy="48" r="40" fill="none" stroke="' + col + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + (C * r.score / 100).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg><b>' + r.score + '</b></div>' +
        '<div><div class="lab" style="color:' + (sp ? '#F2C6B4' : col) + '">' + esc(r.label) + '</div><div class="sub">Compared with your own ' + (r.days ? r.days + '-day' : '') + ' normal</div></div></div>';
      const trk = p => {
        const vs = [p.val, p.nlo, p.nhi, p.tlo, p.thi].filter(v => v != null && isFinite(v));
        let a = Math.min(...vs), z = Math.max(...vs); if (z - a < 1e-9) { a -= 1; z += 1; } const pd = (z - a) * 0.08; a -= pd; z += pd;
        const P = v => ((v - a) / (z - a) * 100).toFixed(1) + '%';
        const col = p.s >= 85 ? '#5DCAA5' : p.s >= 55 ? '#F6C46A' : accent;
        return '<div class="trk">' + (p.tlo != null ? '<i class="tg" style="left:' + P(p.tlo) + ';right:calc(100% - ' + P(p.thi != null ? p.thi : z) + ')"></i>' : '') +
          (p.nlo != null && p.nhi != null ? '<i class="nm" style="left:' + P(p.nlo) + ';width:calc(' + P(p.nhi) + ' - ' + P(p.nlo) + ')"></i>' : '') +
          '<i class="dt" style="left:' + P(p.val) + ';box-shadow:0 0 0 2px ' + col + '"></i></div>';
      };
      ready += '<div class="rows">' + r.parts.map(p => '<div class="row"><span>' + esc(p.k) + '</span>' + trk(p) + '<span class="v">' + esc(p.now) + ' <small>· ' +
        (p.nlo != null ? 'norm ' + esc(p.fmt(p.nlo)) + '–' + esc(p.fmt(p.nhi)) : (p.k === 'Sleep' ? esc(p.base) : 'usual ' + esc(p.base))) + '</small></span></div>').join('') + '</div>';
      ready += '<div class="rleg2"><span><i class="lg nm"></i>your normal</span><span><i class="lg tg"></i>target</span><span><i class="lg dt"></i>today</span></div>';
      const low = r.parts.filter(p => p.s < 55).map(p => p.k === 'HRV' ? 'HRV' : p.k.toLowerCase());
      ready += '<div class="tip">' + (r.score >= 75 ? 'Your body looks recovered. A good day to get moving.' : r.score >= 55 ? 'A normal day. Keep a steady pace.' : 'Recovery is low' + (low.length ? ' (' + esc(low.join(' and ')) + ')' : '') + '. Go easy today and aim for an earlier night.') + '</div>';
    }
    if (r) ready += '<details class="rexp"' + (this._rexp ? ' open' : '') + '><summary>ⓘ How this score works</summary><p>Readiness compares today with your own last 30 days. HRV counts for 40%, resting heart 30%, and last night\'s sleep 30%. Higher HRV, a lower resting heart and more sleep than your normal push the score up.</p><p>75+ = recovered, a good day to push · 55–74 = a normal day · under 55 = recovery is low, take it easy.</p></details>';
    ready += '</div>';
    // sleep strip
    let strip = '<div class="p"><h2>🌙 Last 14 nights</h2>';
    if (!d || !d.nights) strip += '<div class="sub">Loading sleep history…</div>';
    else {
      const vals = d.nights.map(n => n.v).filter(v => v != null);
      if (vals.length < 3) strip += '<div class="sub">Your sleep history fills in over the next few nights.</div>';
      const mx = Math.max(c.sleep_goal * 1.15, ...vals) * 1.12;
      const sMin = vals.length ? Math.min(...vals) : null, sMax = vals.length ? Math.max(...vals) : null;
      const iMin = d.nights.findIndex(n => n.v === sMin), iMax = d.nights.findIndex(n => n.v === sMax);
      const hm2 = m => Math.floor(m / 60) + 'h ' + Math.round(m % 60) + 'm';
      const dn = i => i === 13 ? 'last night' : d.nights[i].d.toLocaleDateString([], { weekday: 'short' });
      strip += '<div class="strip" style="margin-top:18px"><div class="goal" style="bottom:' + (c.sleep_goal / mx * 100).toFixed(1) + '%"></div>' + d.nights.map((n, i) => n.v == null ? '<span class="none" title="no data"></span>' :
        '<span title="' + hm2(n.v) + '" style="height:' + (n.v / mx * 100).toFixed(1) + '%;background:' + (n.v >= c.sleep_goal * 0.95 ? 'linear-gradient(#8FE3C6,#5DCAA5)' : n.v >= 360 ? 'linear-gradient(#FFD08A,#EF9F27)' : 'linear-gradient(#FFB3D1,#FF5C9A)') + '">' + (vals.length > 1 && i === iMax ? '<b class="mk">↑</b>' : vals.length > 1 && i === iMin ? '<b class="mk">↓</b>' : '') + '</span>').join('') + '</div>';
      strip += '<div class="days">' + d.nights.map((n, i) => '<span>' + (i === 13 ? 'Last' : n.d.toLocaleDateString([], { weekday: 'narrow' })) + '</span>').join('') + '</div>';
      const avgS = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
      const hit = vals.filter(v => v >= c.sleep_goal * 0.95).length;
      const debt = vals.slice(-7).reduce((s, v) => s + Math.max(0, c.sleep_goal - v), 0);
      strip += '<div class="stats"><span><b>' + (avgS ? Math.floor(avgS / 60) + 'h ' + Math.round(avgS % 60) + 'm' : '—') + '</b>average</span><span><b>' + hit + ' / ' + vals.length + '</b>nights at goal</span><span><b>' + (debt / 60).toFixed(1) + 'h</b>short this week</span></div>' +
        (vals.length > 1 ? '<div class="stats" style="margin-top:6px"><span><b>↓ ' + hm2(sMin) + '</b>shortest · ' + esc(dn(iMin)) + '</span><span><b>↑ ' + hm2(sMax) + '</b>longest · ' + esc(dn(iMax)) + '</span></div>' : '');
      strip += '<div class="sub" style="margin-top:6px">Dashed line = ' + Math.round(c.sleep_goal / 60) + 'h goal · striped = no data from phone</div>';
    }
    strip += '</div>';
    // bedroom
    let bed = '<div class="p"><h2>🛏️ Bedroom last night</h2>';
    const b = d && d.bedroom;
    if (!b) bed += '<div class="sub">Loading…</div>';
    else {
      const tl = b.tAvg == null ? null : (b.tAvg > c.ideal_high + 3 ? 'bad' : b.tAvg > c.ideal_high ? 'warn' : b.tAvg < c.ideal_low - 2 ? 'warn' : 'ok');
      const cl = b.cPeak == null ? null : (b.cPeak >= 1500 ? 'bad' : b.cPeak >= 1000 ? 'warn' : 'ok');
      bed += '<div class="bed">' +
        '<div class="tile"><span class="ic">🌡️</span><div><b>' + (b.tAvg != null ? b.tAvg.toFixed(0) + '°' : '—') + '</b>' + (tl ? '<span class="tag ' + tl + '">' + (tl === 'ok' ? 'comfy' : b.tAvg > c.ideal_high ? 'too warm' : 'cool') + '</span>' : '') +
        '<div class="sub">' + (b.tMin != null ? 'avg 10 pm–8 am · ' + b.tMin.toFixed(0) + '–' + b.tMax.toFixed(0) + '°' : 'no readings yet; fills in after your first night') + ' · sleep best at ' + c.ideal_low + '–' + c.ideal_high + '°</div></div></div>' +
        '<div class="tile"><span class="ic">🫧</span><div><b>' + (b.cPeak != null ? Math.round(b.cPeak).toLocaleString() + ' ppm' : '—') + '</b>' + (cl ? '<span class="tag ' + cl + '">' + (cl === 'ok' ? 'fresh' : cl === 'warn' ? 'stuffy' : 'very stuffy') + '</span>' : '') +
        '<div class="sub">peak CO₂ overnight · ' + (b.cPeak == null ? 'no readings yet; fills in after your first night' : b.cOver >= 1 ? Math.round(b.cOver / 60 * 10) / 10 + ' h above 1,000' : 'never above 1,000') + '</div></div></div>' +
        '</div>';
      const tips = [];
      if (b.tAvg != null && b.tAvg > c.ideal_high) tips.push('Set the bedroom a few degrees cooler at night');
      if (b.cPeak != null && b.cPeak >= 1000) tips.push('crack a window or run the fan overnight to bring CO₂ down');
      if (tips.length) bed += '<div class="tip">💡 ' + esc(tips.join('; ')) + '.</div>';
    }
    bed += '</div>';
    if (!c.bedroom_temp && !c.co2) bed = '';
    this.shadowRoot.innerHTML = '<style>' + css + '.row,.bed .tile,.grid>.p:nth-child(2){cursor:pointer}.rexp{margin-top:10px;font-size:13.5px;line-height:1.5}.rexp summary{cursor:pointer;font-weight:600;color:var(--secondary-text-color)}.rexp p{margin:6px 0 0}</style><div class="grid">' + ready + strip + bed + '</div>'; { const dt = this.shadowRoot.querySelector('.rexp'); if (dt) dt.addEventListener('toggle', () => { this._rexp = dt.open; }); } { const R = this.shadowRoot, H = this._h, go = (el, k) => el && el.addEventListener('click', e => { e.stopPropagation(); if (window.__hd) window.__hd.open(k, H); }); R.querySelectorAll('.ready .row').forEach(el => { const tx = (el.firstElementChild ? el.firstElementChild.textContent : '').toLowerCase(); go(el, tx.includes('hrv') ? 'hrv' : tx.includes('rest') || tx.includes('heart') ? 'rhr' : 'sleep'); }); go(R.querySelector('.grid>.p:nth-child(2)'), 'sleep'); R.querySelectorAll('.bed .tile').forEach(el => go(el, /co/i.test(el.textContent) && /ppm/i.test(el.textContent) ? 'co2' : 'btemp')); }
  }
}
if (!customElements.get('health-insights-card')) customElements.define('health-insights-card', HealthInsightsCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'health-insights-card', name: 'Health insights card', description: 'Readiness, 14-night sleep strip, bedroom conditions, sync status' });


const __RBCSS='.rb{margin-top:8px}.rbt{position:relative;height:10px;border-radius:5px;background:rgba(150,150,150,.16)}.rbt i{position:absolute;display:block}.rbt .tg{top:-2px;bottom:-2px;border:1px dashed rgba(93,202,165,.85);border-radius:6px;background:rgba(93,202,165,.10)}.rbt .nm{top:1px;bottom:1px;border-radius:4px;background:rgba(183,156,255,.5)}.rbt .rg{top:4px;height:2px;border-radius:2px;background:var(--c,#FF5C9A)}.rbt .dt{top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px var(--c,#FF5C9A)}.rbl{display:flex;justify-content:space-between;gap:4px;font-size:10.5px;font-weight:600;color:var(--secondary-text-color);margin-top:3px;white-space:nowrap}.rbn{font-size:10px;color:var(--secondary-text-color);margin-top:2px;line-height:1.3}.rleg{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--secondary-text-color);margin:-2px 0 10px}.rleg i{display:inline-block;vertical-align:middle;margin-right:5px}.sprng{display:flex;justify-content:space-between;font-size:10.5px;font-weight:600;color:var(--secondary-text-color);margin-top:2px}';
function __RB(o){return '';const f=o.fmt||(v=>String(Math.round(v*10)/10));const vals=[o.cur,o.lo,o.hi,o.nlo,o.nhi,o.tlo,o.thi].filter(v=>v!=null&&isFinite(v));if(!vals.length)return '';let a=Math.min(...vals),b=Math.max(...vals);if(b-a<1e-9){a-=1;b+=1}const pd=(b-a)*.08;a-=pd;b+=pd;const P=v=>((v-a)/(b-a)*100).toFixed(1)+'%';let x='<div class="rbt">';if(o.tlo!=null||o.thi!=null){const l=o.tlo!=null?o.tlo:a,r=o.thi!=null?o.thi:b;x+='<i class="tg" style="left:'+P(l)+';right:calc(100% - '+P(r)+')"></i>'}if(o.nlo!=null&&o.nhi!=null)x+='<i class="nm" style="left:'+P(o.nlo)+';width:calc('+P(o.nhi)+' - '+P(o.nlo)+')"></i>';if(o.lo!=null&&o.hi!=null)x+='<i class="rg" style="left:'+P(o.lo)+';width:max(2px,calc('+P(o.hi)+' - '+P(o.lo)+'))"></i>';if(o.cur!=null)x+='<i class="dt" style="left:'+P(o.cur)+'"></i>';x+='</div><div class="rbl"><span>↓ '+(o.lo!=null?f(o.lo):'—')+'</span><span>↑ '+(o.hi!=null?f(o.hi):'—')+'</span></div>'+(o.note?'<div class="rbn">'+o.note+'</div>':'');return '<div class="rb" title="'+String(o.title||'').replace(/"/g,'')+'">'+x+'</div>'}
function __LEG(lohi,dot,norm){return '';return '<div class="rleg"><span><i style="width:16px;height:2px;background:#FF5C9A"></i>'+lohi+'</span>'+(norm?'<span><i style="width:16px;height:8px;border-radius:3px;background:rgba(183,156,255,.5)"></i>'+norm+'</span>':'')+'<span><i style="width:16px;height:8px;border-radius:3px;border:1px dashed rgba(93,202,165,.85)"></i>target</span><span><i style="width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px #FF5C9A"></i>'+dot+'</span></div>'}
class HealthGlowCard extends HTMLElement {
  setConfig(c) {
    const p = (c && c.prefix) || 'sensor.my_iphone_';
    this._c = Object.assign({
      name: '', steps_goal: 7000, move_goal: 300, exercise_goal: 30, sleep_goal: 420, days: 7,
      e: {
        steps: p + 'health_steps', distance: p + 'walking_running_distance', active: p + 'active_energy', resting: p + 'resting_energy',
        exercise: p + 'exercise_time', flights: p + 'flights_climbed', vo2: p + 'vo2_max',
        hr: p + 'heart_rate', rhr: p + 'resting_heart_rate', whr: p + 'walking_heart_rate_average', hrv: p + 'heart_rate_variability',
        spo2: p + 'blood_oxygen', resp: p + 'respiratory_rate',
        sleep: p + 'sleep_duration', awake: p + 'awake', core: p + 'core_sleep', deep: p + 'deep_sleep', rem: p + 'rem_sleep'
      }
    }, c || {});
    if (c && c.entities) this._c.e = Object.assign({}, this._c.e, c.entities);
    this._t = 0;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
  }
  set hass(h) { const __so=!!(h&&h.states['input_boolean.steampunk_style']&&h.states['input_boolean.steampunk_style'].state==='on'); if(__so!==this.__steamOn){this.__steamOn=__so;this._sig=null;this._t=0;if(__so&&!document.getElementById('steam-font')){const l=document.createElement('link');l.id='steam-font';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';document.head.appendChild(l);}}
    this._h = h; if (this._ins) this._ins.hass = h;
    const e = this._c.e;
    const sig = Object.values(e).map(id => (h.states[id] || {}).state).join('|');
    if (sig !== this._sig) { this._sig = sig; this._render(); }
    if (!this._busy && Date.now() - this._t > 900000) { this._t = Date.now(); this._loadHist(); }
  }
  getCardSize() { return 12; }
  getGridOptions() { return { columns: 'full' }; }
  _v(k) { const s = this._h && this._h.states[this._c.e[k]]; const n = s ? parseFloat(s.state) : NaN; return isNaN(n) ? null : n; }
  async _loadHist() {
    this._busy = true;
    const c = this._c, e = c.e;
    const keys = ['rhr', 'hrv', 'vo2', 'steps', 'sleep'];
    try {
      const end = new Date(), start = new Date(end.getTime() - c.days * 864e5);
      const res = await this._h.callWS({ type: 'history/history_during_period', start_time: start.toISOString(), end_time: end.toISOString(),
        entity_ids: keys.map(k => e[k]), minimal_response: true, no_attributes: true, significant_changes_only: false });
      this._hist = {};
      for (const k of keys) {
        this._hist[k] = (res[e[k]] || []).map(x => [((x.lu != null ? x.lu : x.lc) || 0) * 1000, parseFloat(x.s)]).filter(x => !isNaN(x[1]));
      }
      try {
        const t0 = new Date(); t0.setHours(0, 0, 0, 0);
        const rk = ['hr', 'rhr', 'whr', 'hrv', 'spo2', 'resp'];
        const ids = rk.map(k => e[k]);
        const [td, mo] = await Promise.all([
          this._h.callWS({ type: 'recorder/statistics_during_period', start_time: t0.toISOString(), statistic_ids: ids, period: 'day', types: ['min', 'max'] }),
          this._h.callWS({ type: 'recorder/statistics_during_period', start_time: new Date(t0.getTime() - 30 * 864e5).toISOString(), end_time: t0.toISOString(), statistic_ids: ids, period: 'day', types: ['mean'] })]);
        this._rng = {};
        for (const k of rk) { const a = (td[e[k]] || []).slice(-1)[0] || {}; const m = (mo[e[k]] || []).map(x => x.mean).filter(x => x != null).sort((x, y) => x - y); const q = p => m.length >= 3 ? m[Math.round(p * (m.length - 1))] : null; this._rng[k] = { lo: a.min, hi: a.max, nlo: q(0.1), nhi: q(0.9), n: m.length }; }
      } catch (e2) { this._rng = this._rng || {}; }
    } catch (err) { this._hist = null; }
    this._busy = false;
    this._render();
  }
  static spark(pts, w, h, col) {
    if (!pts || pts.length < 2) return '<svg class="sp" viewBox="0 0 ' + w + ' ' + h + '"><line x1="0" y1="' + (h - 2) + '" x2="' + w + '" y2="' + (h - 2) + '" stroke="' + col + '" stroke-opacity=".25" stroke-width="2" stroke-dasharray="3 4" stroke-linecap="round"/><text x="' + (w / 2) + '" y="' + (h / 2 + 2) + '" text-anchor="middle" font-size="11" fill="currentColor" opacity=".55">Fills in over the next few days</text></svg>';
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const X = t => ((t - x0) / ((x1 - x0) || 1)) * (w - 4) + 2, Y = v => h - 3 - ((v - y0) / ((y1 - y0) || 1)) * (h - 6);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
    const id = 'g' + Math.random().toString(36).slice(2, 7);
    return '<svg class="sp" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".35"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + d + ' L' + X(x1).toFixed(1) + ' ' + h + ' L' + X(x0).toFixed(1) + ' ' + h + ' Z" fill="url(#' + id + ')"/><path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="sprng"><span>↓ low ' + (+y0.toFixed(1)) + '</span><span>↑ high ' + (+y1.toFixed(1)) + '</span></div>';
  }
  _rb(k) {
    const r = (this._rng || {})[k] || {}; const cur = this._v(k);
    const T = { hr: [60, 100], rhr: [60, 100], spo2: [95, 100], resp: [12, 20] }[k] || [];
    let lo = r.lo, hi = r.hi;
    if (cur != null) { lo = lo == null ? cur : Math.min(lo, cur); hi = hi == null ? cur : Math.max(hi, cur); }
    const f = v => String(Math.abs(v) >= 20 ? Math.round(v) : Math.round(v * 10) / 10);
    const note = [r.nlo != null ? 'norm ' + f(r.nlo) + '–' + f(r.nhi) : null, T.length ? 'target ' + T[0] + '–' + T[1] : null].filter(Boolean).join(' · ');
    return __RB({ cur, lo, hi, nlo: r.nlo, nhi: r.nhi, tlo: T[0], thi: T[1], fmt: f, note, title: 'Today ' + (lo != null ? f(lo) + ' to ' + f(hi) : 'no readings') + (r.nlo != null ? ' · your usual ' + f(r.nlo) + ' to ' + f(r.nhi) + ' (' + r.n + ' days)' : '') + (T.length ? ' · typical range ' + T[0] + ' to ' + T[1] : '') });
  }
  _render() {
    if (!this.shadowRoot || !this._h) return;
    const c = this._c, v = k => this._v(k), H = this._hist || {};
    const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const hm = m => m == null ? '—' : (Math.floor(m / 60) ? Math.floor(m / 60) + 'h ' : '') + Math.round(m % 60) + 'm';
    const n0 = x => x == null ? '—' : Math.round(x).toLocaleString();
    const hr = new Date().getHours();
    const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    // rings
    const rings = [
      { k: 'active', label: 'Move', goal: c.move_goal, unit: 'kcal', col1: '#FF5C9A', col2: '#FF9CC2' },
      { k: 'steps', label: 'Steps', goal: c.steps_goal, unit: '', col1: '#E46FD8', col2: '#F5A8EE' },
      { k: 'exercise', label: 'Exercise', goal: c.exercise_goal, unit: 'min', col1: '#9C7BF2', col2: '#C9B6FF' }
    ];
    let ringSvg = '<svg class="rings" data-k="steps" style="cursor:pointer" viewBox="0 0 160 160"><defs>' + rings.map((r, i) => '<linearGradient id="rg' + i + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + r.col2 + '"/><stop offset="1" stop-color="' + r.col1 + '"/></linearGradient>').join('') + '</defs>';
    rings.forEach((r, i) => {
      const rad = 66 - i * 19, C = 2 * Math.PI * rad, val = v(r.k), frac = val == null ? 0 : Math.min(val / r.goal, 1);
      ringSvg += '<circle cx="80" cy="80" r="' + rad + '" fill="none" stroke="' + r.col1 + '" stroke-opacity=".14" stroke-width="14"/>' +
        (frac > 0 ? '<circle cx="80" cy="80" r="' + rad + '" fill="none" stroke="url(#rg' + i + ')" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + (C * frac).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 80 80)"/>' : '');
    });
    ringSvg += '<text x="80" y="86" text-anchor="middle" class="hrt">💗</text></svg>';
    const RA = { active: '<b>Burns energy</b> → healthy weight, steadier blood sugar, stronger heart', steps: '<b>Keeps you moving</b> → lower heart-disease risk, better blood pressure and mood', exercise: '<b>Gets your heart pumping</b> → cardio fitness (VO₂ max), lower blood pressure, deeper sleep' };
    const ringLegend = rings.map(r => { const val = v(r.k); return '<div class="rl"><i style="background:linear-gradient(135deg,' + r.col2 + ',' + r.col1 + ')"></i><div><b>' + n0(val) + '</b><span> / ' + r.goal.toLocaleString() + (r.unit ? ' ' + r.unit : '') + '</span><small>' + r.label + '</small></div>' + (RA[r.k] ? '<div class="ra">' + RA[r.k] + '</div>' : '') + '</div>'; }).join('');
    // sleep
    const st = [{ k: 'deep', l: 'Deep', col: '#8E5BD6' }, { k: 'core', l: 'Core', col: '#E46FD8' }, { k: 'rem', l: 'REM', col: '#FF9CC2' }, { k: 'awake', l: 'Awake', col: '#FFD3B5' }];
    const sTot = st.reduce((a, s) => a + (v(s.k) || 0), 0) || 1;
    const sleepMin = v('sleep');
    const sleepBar = '<div class="sbar">' + st.map(s => { const m = v(s.k) || 0; return m ? '<div style="width:' + (m / sTot * 100).toFixed(1) + '%;background:' + s.col + '" title="' + s.l + ' ' + hm(m) + '"></div>' : ''; }).join('') + '</div>';
    const sleepLeg = st.map(s => '<div class="sl"><i style="background:' + s.col + '"></i>' + s.l + '<b>' + hm(v(s.k)) + '</b></div>').join('');
    const sleepPct = sleepMin == null ? 0 : Math.min(sleepMin / c.sleep_goal, 1);
    // heart tiles
    const tile = (k, icon, label, unit, col, extra) => v(k) == null ? '' : '<div class="tile ' + (window.__hdRingFor ? window.__hdRingFor(k, v(k)) : '') + '" data-k="' + k + '" title="' + String((window.__hdInfo && window.__hdInfo[k] && window.__hdInfo[k].what) || '').replace(/"/g, '') + '" style="--c:' + col + '"><div class="ti">' + icon + '</div>' + (window.__hdDial ? window.__hdDial(k, v(k)) : '') + '<div class="tv">' + (v(k) == null ? '—' : (Math.abs(v(k)) >= 20 ? Math.round(v(k)) : Math.round(v(k) * 10) / 10)) + '<small>' + unit + '</small></div><div class="tl">' + label + '</div>' + (extra || '') + this._rb(k) + '</div>';
    const summary = [sleepMin != null ? 'slept ' + hm(sleepMin) : null, v('rhr') != null ? 'resting heart ' + Math.round(v('rhr')) : null, v('steps') != null ? n0(v('steps')) + ' steps so far' : null].filter(Boolean).join(' · ');
    this.shadowRoot.innerHTML = '<style>' +
      ':host{--p1:#FF5C9A;--p2:#E46FD8;--p3:#9C7BF2}' +
      '.wrap{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:stretch}@media(max-width:1000px){.wrap{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:680px){.wrap{grid-template-columns:minmax(0,1fr)}}' +
      '.card{position:relative;border-radius:24px;padding:18px 18px 16px;background:linear-gradient(145deg,rgba(255,92,154,.10),rgba(156,123,242,.08));box-shadow:0 6px 22px rgba(228,111,216,.12),inset 0 0 0 1px rgba(255,156,194,.28);overflow:hidden;color:var(--primary-text-color)}' +
      '.card:before{content:"";position:absolute;width:180px;height:180px;right:-60px;top:-70px;border-radius:50%;background:radial-gradient(circle,rgba(255,156,194,.35),transparent 70%);pointer-events:none}' +
      '.hero{grid-column:1/-1;background:linear-gradient(120deg,#FF8DB8 0%,#E98AE0 50%,#B79CFF 100%);color:#3B0F33;box-shadow:0 10px 30px rgba(228,111,216,.35)}' +
      '.hero:before{background:radial-gradient(circle,rgba(255,255,255,.35),transparent 70%)}' +
      '.hero h1{margin:0;font-size:26px;font-weight:600;letter-spacing:.2px;text-shadow:0 1px 10px rgba(255,255,255,.45)}.hero p{margin:6px 0 0;font-size:14px;font-weight:500;opacity:.85}' +
      '.spark{position:absolute;right:22px;top:14px;font-size:30px;opacity:.9;animation:tw 3s ease-in-out infinite}@keyframes tw{50%{transform:scale(1.15) rotate(8deg);opacity:.6}}' +
      'h2{margin:0 0 12px;font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px}h2 span{font-size:18px}' +
      '.rw{display:flex;align-items:center;gap:18px}.rw>div:last-child{flex:1;min-width:0}.rl>div:nth-child(2){flex:none;min-width:96px}.rl{flex-wrap:wrap}.ra{flex:1 1 190px;min-width:0;margin-left:14px;padding-left:14px;border-left:2px solid rgba(232,69,122,.25);font-size:13px;line-height:1.4;color:var(--secondary-text-color)}.ra b{color:var(--primary-text-color);font-weight:600}.rings{width:150px;height:150px;flex:none}.hrt{font-size:22px}' +
      '.rl{display:flex;gap:10px;align-items:center;margin:8px 0}.rl i{width:14px;height:14px;border-radius:50%;flex:none}.rl b{font-size:18px}.rl span{font-size:12px;color:var(--secondary-text-color)}.rl small{display:block;font-size:11px;color:var(--secondary-text-color);letter-spacing:.4px;text-transform:uppercase}' +
      '.big{font-size:34px;font-weight:600;background:linear-gradient(90deg,var(--p1),var(--p3));-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1.1}' +
      '.goal{font-size:12px;color:var(--secondary-text-color);margin:2px 0 12px}' +
      '.sbar{display:flex;height:18px;border-radius:9px;overflow:hidden;gap:2px;background:rgba(150,150,150,.12)}.sbar div{height:100%}' +
      '.sleg{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;margin-top:12px}.sl{display:flex;align-items:center;gap:7px;font-size:13px}.sl i{width:10px;height:10px;border-radius:3px}.sl b{margin-left:auto;font-weight:600}' +
      '.prog{height:6px;border-radius:3px;background:rgba(255,92,154,.15);margin-top:12px;overflow:hidden}.prog div{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--p1),var(--p3))}' +
      '.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:10px}.heartc{grid-column:1/-1}.hz{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:18px;align-items:end}.hz .trend{margin-top:0}.hz .sp{height:90px}@media(max-width:760px){.hz{grid-template-columns:1fr}}' +
      '.tile{border-radius:18px;padding:12px;background:linear-gradient(160deg,color-mix(in srgb,var(--c) 18%,transparent),color-mix(in srgb,var(--c) 6%,transparent));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 30%,transparent);cursor:pointer;transition:transform .15s}.tile:hover{transform:translateY(-2px)}.tile{position:relative}.dial{position:absolute;top:8px;right:8px;width:42px;height:42px}.tile .tv{margin-top:20px}.tile.r-ok{box-shadow:inset 0 0 0 2.5px #23A07A}.tile.r-bad{box-shadow:inset 0 0 0 2.5px #E0457F}.tile.r-na{box-shadow:inset 0 0 0 2.5px #E8B023}' +
      '.ti{font-size:18px}.tv{font-size:22px;font-weight:600;margin-top:4px}.tv small{font-size:11px;font-weight:500;margin-left:3px;color:var(--secondary-text-color)}.tl{font-size:11px;color:var(--secondary-text-color);text-transform:uppercase;letter-spacing:.4px;margin-top:2px}' +
      '.beat{display:inline-block;animation:bt 1.1s ease-in-out infinite}@keyframes bt{0%,100%{transform:scale(1)}15%{transform:scale(1.25)}30%{transform:scale(1)}45%{transform:scale(1.15)}}' +
      '.sp{width:100%;height:46px;margin-top:8px;display:block}' +
      '.trend{margin-top:12px}.trend .lab{display:flex;justify-content:space-between;font-size:12px;color:var(--secondary-text-color)}' +
      __RBCSS + '.mini{display:flex;gap:10px;margin-top:10px}.mini div{flex:1;border-radius:14px;padding:10px;background:rgba(255,156,194,.12);font-size:12px;color:var(--secondary-text-color)}.mini b{display:block;font-size:17px;color:var(--primary-text-color)}' +
      (this.__steamOn ? '.card{background:linear-gradient(160deg,rgba(84,30,66,.94),rgba(44,18,52,.94)) !important;box-shadow:0 10px 26px rgba(20,4,18,.45),inset 0 0 0 2px #B8865B,inset 0 0 0 4px rgba(44,18,52,.95),inset 0 0 0 5px rgba(232,180,160,.55) !important;border-radius:16px !important;--primary-text-color:#FBE7EF;--secondary-text-color:#D9B3C4;color:#FBE7EF;}.hero{box-shadow:0 12px 30px rgba(20,4,18,.45),inset 0 0 0 3px #B8865B,inset 0 0 0 5px rgba(255,236,224,.55),inset 0 0 0 6px #8A5A3C !important;border-radius:16px !important}.hero h1,.hero .big,.card h2,.card h3,.card .hd{font-family:"Cinzel",Georgia,serif !important;letter-spacing:1px;}.card h2,.card h3{color:#F2C6B4 !important}.tile,.mini,.hz{background:rgba(255,214,232,.07) !important;box-shadow:inset 0 0 0 1px rgba(232,180,160,.25) !important}' : '') + '</style><div class="wrap">' +
      '<div class="card hero"><div class="spark">✨</div><h1>' + greet + (c.name ? ', ' + esc(c.name) : '') + ' 💖</h1><p>' + (summary ? 'You ' + esc(summary) : 'Your health data will appear here as your phone checks in.') + '</p></div>' +
      '<div class="card"><h2><span>💗</span>Today\'s rings</h2><div class="rw">' + ringSvg + '<div>' + ringLegend + '</div></div>' +
      '<div class="mini"><div><b>' + ((v('distance') == null ? null : v('distance') * 0.621371) == null ? '—' : (Math.round((v('distance') == null ? null : v('distance') * 0.621371) * 100) / 100)) + ' mi</b>distance</div><div><b>' + n0(v('resting')) + '</b>resting kcal</div><div><b>' + n0(v('flights')) + '</b>flights</div></div></div>' +
      '<div class="card" data-k="sleep"><h2><span>🌙</span>Last night\'s sleep</h2><div class="big">' + hm(sleepMin) + '</div><div class="goal">goal ' + hm(c.sleep_goal) + ' · ' + Math.round(sleepPct * 100) + '% there</div>' + sleepBar + '<div class="sleg">' + sleepLeg + '</div>' +
      '<div class="prog"><div style="width:' + (sleepPct * 100).toFixed(0) + '%"></div></div></div>' +
      '<div class="card" data-k="vo2" style="cursor:pointer"><h2><span>🦋</span>Fitness</h2><div class="big">' + (v('vo2') == null ? '—' : v('vo2')) + '<small style="font-size:14px;-webkit-text-fill-color:var(--secondary-text-color)"> VO₂ max</small></div><div class="goal">mL/kg·min · cardio fitness</div>' +
      '<div class="trend"><div class="lab"><span>VO₂ max trend</span><span></span></div>' + HealthGlowCard.spark(H.vo2, 300, 46, '#9C7BF2') + '</div>' +
      '<div class="trend"><div class="lab"><span>HRV · ' + c.days + ' days</span><span>' + (v('hrv') == null ? '' : Math.round(v('hrv')) + ' ms') + '</span></div>' + HealthGlowCard.spark(H.hrv, 300, 46, '#E46FD8') + '</div></div>' +
      '<div id="insslot"></div><div class="card heartc"' + (['hr', 'rhr', 'whr', 'hrv', 'spo2', 'resp'].some(k => v(k) != null) ? '' : ' style="display:none"') + '><h2><span class="beat">❤️</span>Heart & breathing</h2>' + __LEG('today low–high', 'now', 'your normal (30 days)') + '<div class="hz"><div class="tiles">' +
      tile('hr', '<span class="beat">💓</span>', 'Heart rate', 'bpm', '#FF5C9A') + tile('rhr', '🌸', 'Resting', 'bpm', '#E46FD8') + tile('whr', '🚶‍♀️', 'Walking avg', 'bpm', '#FF8DB8') +
      tile('hrv', '🎀', 'HRV', 'ms', '#9C7BF2') + tile('spo2', '🫧', 'Blood oxygen', '%', '#B79CFF') + tile('resp', '🌬️', 'Breathing', '/min', '#F5A8EE') + '</div>' +
      '</div></div>' +
      '</div>';
    { const ph = this.shadowRoot.getElementById('hbslot'); if (ph) { if (customElements.get('health-detail-card')) { if (!this._hb) { this._hb = document.createElement('health-detail-card'); this._hb.setConfig({ metric: 'rhr', metrics: ['rhr', 'hr', 'whr', 'hrv', 'spo2', 'resp'], flat: true, height: 280 }); } ph.replaceWith(this._hb); this._hb.hass = this._h; } else if (!this._hbw) { this._hbw = 1; customElements.whenDefined('health-detail-card').then(() => { this._sig = null; this._t = 0; if (this._h) this.hass = this._h; }); } } }
    { const ph = this.shadowRoot.getElementById('insslot'); if (ph) { if (customElements.get('health-insights-card')) { if (!this._ins) { this._ins = document.createElement('health-insights-card'); this._ins.setConfig(Object.assign({ type: 'custom:health-insights-card' }, this._c.insights || {})); this._ins.style.gridColumn = '1 / -1'; this._ins.style.display = 'block'; this._ins.style.minWidth = '0'; } ph.replaceWith(this._ins); this._ins.hass = this._h; } else if (!this._insw) { this._insw = 1; customElements.whenDefined('health-insights-card').then(() => { this._sig = null; this._t = 0; if (this._h) this.hass = this._h; }); } } }
    this.shadowRoot.querySelectorAll('[data-k]').forEach(el => el.addEventListener('click', () => {
      if (window.__hd && window.__hd.has(el.dataset.k)) { window.__hd.open(el.dataset.k, this._hass || this._h); return; } const id = c.e[el.dataset.k]; if (!id) return;
      const ev = new Event('hass-more-info', { bubbles: true, composed: true }); ev.detail = { entityId: id }; this.dispatchEvent(ev);
    }));
  }
}
if (!customElements.get('health-glow-card')) customElements.define('health-glow-card', HealthGlowCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'health-glow-card', name: 'Health glow card', description: 'Pretty pink Apple Health summary' });
if (typeof module !== 'undefined') module.exports = HealthGlowCard;

(() => {
  const VERSION = '1.1.0';
  class AppleHealthDashboard extends HTMLElement {
    setConfig(c) {
      if (!c || !c.phone) throw new Error('Set "phone" to your iPhone\'s name in Home Assistant. Example: phone: my_iphone (for sensors like sensor.my_iphone_heart_rate).');
      const phone = String(c.phone).replace(/^sensor\./, '').replace(/_$/, '');
      this._cfg = Object.assign({ steps_goal: 7000, move_goal: 300, exercise_goal: 30, sleep_goal: 420 }, c, { prefix: 'sensor.' + phone + '_' });
      this._ready = false;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = '<style>:host{display:block}.ahd{display:grid;gap:12px}</style><div class="ahd"></div>';
      this._wrap = this.shadowRoot.querySelector('.ahd');
      this._glow = null; this._detail = null;
    }
    _build(h) {
      const c = this._cfg;
      const tState = c.bedroom_temperature && h.states[c.bedroom_temperature];
      const celsius = !!(tState && /C/i.test((tState.attributes || {}).unit_of_measurement || ''));
      window.__hdConfigure && window.__hdConfigure({ prefix: c.prefix, btemp: c.bedroom_temperature, co2: c.bedroom_co2, celsius });
      this._glow = document.createElement('health-glow-card');
      this._glow.setConfig({
        prefix: c.prefix, name: c.name || '', steps_goal: c.steps_goal, move_goal: c.move_goal, exercise_goal: c.exercise_goal, sleep_goal: c.sleep_goal,
        insights: { hrv: c.prefix + 'heart_rate_variability', rhr: c.prefix + 'resting_heart_rate', sleep: c.prefix + 'sleep_duration', sleep_goal: c.sleep_goal,
          bedroom_temp: c.bedroom_temperature || null, co2: c.bedroom_co2 || null, sync_prefix: c.prefix, ideal_low: celsius ? 18 : 65, ideal_high: celsius ? 20 : 68 }
      });
      this._detail = document.createElement('health-detail-card');
      this._detail.setConfig({ metric: 'sleep' });
      this._wrap.append(this._glow, this._detail);
      this._ready = true;
    }
    set hass(h) {
      if (!this._ready) this._build(h);
      this._glow.hass = h; this._detail.hass = h;
    }
    getCardSize() { return 30; }
    getGridOptions() { return { columns: 'full' }; }
    static getStubConfig() { return { phone: 'my_iphone' }; }
  }
  if (!customElements.get('apple-health-dashboard')) customElements.define('apple-health-dashboard', AppleHealthDashboard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'apple-health-dashboard', name: 'Apple Health Dashboard', description: 'Your Apple Health data from the Home Assistant iPhone app: readiness, rings, sleep, heart, goals and a big trend graph.', preview: false, documentationURL: 'https://github.com/pesicard/apple-health-dashboard' });
  console.info('%c APPLE-HEALTH-DASHBOARD %c v' + VERSION + ' ', 'color:#fff;background:#E8457A;font-weight:700', 'color:#E8457A;background:#fff');
})();
