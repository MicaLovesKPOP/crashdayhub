(function () {
  const $ = (id) => document.getElementById(id);
  const NF = { nm: (v) => v, lbft: (v) => v / 0.737562149, kgm: (v) => v / 0.101971621 };
  const OF = { nm: (v) => v, lbft: (v) => v * 0.737562149, kgm: (v) => v * 0.101971621 };
  const DEC = { nm: 1, lbft: 1, kgm: 2 };
  const PRE = {
    crashday: ['torque-hash-rpm', 'nm', 'Crashday preset active: complete 1000-RPM CRV grid.'],
    assetto: ['rpm-pipe-torque', 'nm', 'Assetto preset active: RPM|Torque in Nm.'],
    beamng: ['beamng-jbeam', 'nm', 'BeamNG preset active: JBeam torque table.'],
    csv: ['csv', 'nm', 'CSV preset active: RPM,Torque rows.'],
  };

  let tmr = 0;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  }

  function num(v) {
    v = Number(String(v).replace(',', '.').replace(/[^0-9.+\-eE]/g, ''));
    return Number.isFinite(v) ? v : null;
  }

  function fmt(v, d) {
    return Number.isFinite(v) ? v.toFixed(d).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : '';
  }

  function unit(s) {
    s = String(s || '').toLowerCase();
    if (/lb\s*-?\s*ft|ft\s*-?\s*lb|lbft|ftlb/.test(s)) return 'lbft';
    if (/kgf?\s*[·.\- ]?\s*m|kgm/.test(s)) return 'kgm';
    if (/n\s*[·.\- ]?\s*m|\bnm\b/.test(s)) return 'nm';
    const e = $('input-torque-unit');
    return e && e.value !== 'auto' ? e.value : 'nm';
  }

  function swap(a, b, s) {
    s = String(s || '').toLowerCase();
    return !/rpm|torque|nm|lbft|ftlb|kgm|kgf|#/.test(s) && a >= 0 && a <= 1500 && b >= 1800 && b <= 30000;
  }

  function line(s, i, fix, bad) {
    const raw = s;
    s = String(s).replace(/\s+\/\/.*$/, '').trim();
    if (!s) return null;

    let a, b, parts;
    if (s.includes('#')) {
      parts = s.split('#');
      a = num(parts[0]);
      b = num(parts.slice(1).join('#'));
      if (a == null || b == null) {
        bad.push(i);
        return null;
      }
      return /rpm/i.test(parts[0])
        ? { rpm: a, torque: NF[unit(parts.slice(1).join('#'))](b) }
        : { rpm: b, torque: NF[unit(parts[0])](a) };
    }

    parts = s.split(/\s*(?:\||;|,|\t|=>|->|=|:|\/)\s*/).filter(Boolean);
    if (parts.length < 2) parts = s.match(/[+-]?\d+(?:[.,]\d+)?(?:e[+-]?\d+)?/gi) || [];
    if (parts.length < 2) {
      bad.push(i);
      return null;
    }

    a = num(parts[0]);
    b = num(parts[1]);
    if (a == null || b == null) {
      bad.push(i);
      return null;
    }

    let rpm = a;
    let trq = b;
    if (swap(a, b, raw)) {
      rpm = b;
      trq = a;
      fix.push(`Line ${i}: swapped likely torque/RPM order.`);
    }
    return { rpm, torque: NF[unit(s)](trq) };
  }

  function parse() {
    const fix = [];
    const bad = [];
    const m = new Map();
    const txt = $('powerlut');
    (txt ? txt.value : '').split(/\r?\n/).forEach((l, idx) => {
      const p = line(l, idx + 1, fix, bad);
      if (!p) return;
      let r = Math.round(p.rpm * 10) / 10;
      let q = Math.round(p.torque * 10) / 10;
      if (r < 0) {
        r = 0;
        fix.push(`Line ${idx + 1}: clamped negative RPM to 0.`);
      }
      if (q < 0) {
        q = 0;
        fix.push(`Line ${idx + 1}: clamped negative torque to 0.`);
      }
      if (m.has(r)) fix.push(`Merged duplicate ${fmt(r, 0)} RPM entry; later value kept.`);
      m.set(r, { rpm: r, torque: q });
    });
    return { points: [...m.values()].sort((a, b) => a.rpm - b.rpm), fix, bad };
  }

  function ip(ps, r) {
    if (!ps.length) return 0;
    ps = ps[0].rpm > 0 ? [{ rpm: 0, torque: 0 }, ...ps] : ps;
    if (r <= ps[0].rpm) return ps[0].torque;
    if (r >= ps.at(-1).rpm) return ps.at(-1).torque;
    for (let i = 0; i < ps.length - 1; i += 1) {
      const a = ps[i];
      const b = ps[i + 1];
      if (r >= a.rpm && r <= b.rpm) return a.torque + ((r - a.rpm) / (b.rpm - a.rpm)) * (b.torque - a.torque);
    }
    return 0;
  }

  function outPts(ps, f) {
    if (f !== 'torque-hash-rpm') return ps;
    const max = ps.length ? Math.floor(ps.at(-1).rpm / 1000) * 1000 : 0;
    const out = [];
    for (let r = 0; r <= max; r += 1000) out.push({ rpm: r, torque: ip(ps, r) });
    return out;
  }

  function output(ps) {
    const f = ($('output-format') || {}).value || 'rpm-pipe-torque';
    const u = ($('output-torque-unit') || {}).value || 'nm';
    const rows = outPts(ps, f);
    const toT = (n) => fmt(OF[u](n), DEC[u] || 1);
    if (f === 'torque-hash-rpm') return rows.map((p) => `${toT(p.torque)} # RPM = ${fmt(p.rpm, 0)}`).join('\n');
    if (f === 'csv') return rows.map((p) => `${fmt(p.rpm, 0)},${toT(p.torque)}`).join('\n');
    if (f === 'beamng-jbeam') return '"torque": [\n    ["rpm", "torque"],\n' + rows.map((p) => `    [${fmt(p.rpm, 0)}, ${toT(p.torque)}]`).join(',\n') + '\n  ]';
    if (f === 'json-array') return JSON.stringify(rows.map((p) => [+fmt(p.rpm, 0), +toT(p.torque)]));
    if (f === 'json-objects') return JSON.stringify(rows.map((p) => ({ rpm: +fmt(p.rpm, 0), torqueNm: +toT(p.torque) })), null, 2);
    return rows.map((p) => `${fmt(p.rpm, 0)}|${toT(p.torque)}`).join('\n');
  }

  function status(s, w) {
    const e = $('output-status');
    if (e) {
      e.textContent = s || '';
      e.classList.toggle('has-warning', !!w);
    }
  }

  function power(p) {
    return (p.rpm * p.torque) / ((745.699872 / Math.PI / 2) * 60);
  }

  function writePoints(points) {
    const txt = $('powerlut');
    if (!txt) return;
    txt.value = points.map((p) => `${fmt(p.rpm, 0)}|${fmt(p.torque, 1)}`).join('\n');
    txt.dispatchEvent(new Event('input', { bubbles: true }));
    setTimeout(update, 90);
  }

  function selectedRpm() {
    const label = ($('selected-point') || {}).textContent || '';
    const match = label.match(/([0-9]+(?:\.[0-9]+)?)\s*RPM/i);
    return match ? Number(match[1]) : null;
  }

  function uniqueRpm(points, rpm) {
    let r = Math.max(0, Math.round(rpm));
    const exists = () => points.some((p) => Math.abs(p.rpm - r) < 0.5);
    while (exists()) r += 100;
    return r;
  }

  function addPoint() {
    const p = parse();
    const ps = p.points;
    if (!ps.length) {
      writePoints([{ rpm: 0, torque: 0 }, { rpm: 1000, torque: 100 }]);
      status('Added starter curve points.');
      return;
    }

    const srpm = selectedRpm();
    let insert = null;
    if (srpm != null) {
      const idx = ps.reduce((best, point, i) => Math.abs(point.rpm - srpm) < Math.abs(ps[best].rpm - srpm) ? i : best, 0);
      const a = ps[idx];
      const b = ps[idx + 1];
      if (b) insert = { rpm: (a.rpm + b.rpm) / 2, torque: (a.torque + b.torque) / 2 };
      else insert = { rpm: a.rpm + 1000, torque: a.torque };
    } else if (ps.length >= 2) {
      let best = 0;
      for (let i = 1; i < ps.length - 1; i += 1) {
        if (ps[i + 1].rpm - ps[i].rpm > ps[best + 1].rpm - ps[best].rpm) best = i;
      }
      const a = ps[best];
      const b = ps[best + 1];
      insert = { rpm: (a.rpm + b.rpm) / 2, torque: (a.torque + b.torque) / 2 };
    } else {
      insert = { rpm: ps[0].rpm + 1000, torque: ps[0].torque };
    }

    insert.rpm = uniqueRpm(ps, insert.rpm);
    writePoints([...ps, insert].sort((a, b) => a.rpm - b.rpm));
    status(`Added point at ${fmt(insert.rpm, 0)} RPM.`);
  }

  function deleteSelected() {
    const srpm = selectedRpm();
    if (srpm == null) {
      status('Select a graph point before deleting.', true);
      return;
    }
    const p = parse();
    const ps = p.points;
    if (ps.length <= 2) {
      status('Keep at least 2 curve points.', true);
      return;
    }
    let best = 0;
    for (let i = 1; i < ps.length; i += 1) {
      if (Math.abs(ps[i].rpm - srpm) < Math.abs(ps[best].rpm - srpm)) best = i;
    }
    const removed = ps[best];
    ps.splice(best, 1);
    writePoints(ps);
    status(`Deleted point at ${fmt(removed.rpm, 0)} RPM.`);
  }

  function update() {
    const p = parse();
    const ps = p.points;
    const f = ($('output-format') || {}).value || '';
    const prev = $('output-preview');
    const log = $('assist-log');
    const sum = $('curve-summary');
    const txt = output(ps);

    if (prev) prev.textContent = txt || 'No output yet.';

    if (log) {
      const items = (p.bad.length ? [`Ignored invalid line(s): ${p.bad.join(', ')}.`] : []).concat(p.fix);
      log.innerHTML = items.length
        ? '<strong>Assisted fixes</strong><ul>' + items.slice(0, 8).map((x) => `<li>${esc(x)}</li>`).join('') + '</ul>'
        : '<span class="assist-good">No assisted fixes needed.</span>';
      log.classList.toggle('has-warning', !!items.length);
    }

    if (sum) {
      if (!ps.length) sum.innerHTML = '<span class="summary-warning">No usable curve points yet.</span>';
      else {
        const tq = ps.reduce((a, b) => (b.torque > a.torque ? b : a), ps[0]);
        const pw = ps.reduce((a, b) => (power(b) > power(a) ? b : a), ps[0]);
        const rows = outPts(ps, f);
        sum.innerHTML = `<div><strong>${ps.length}</strong><span>source points</span></div><div><strong>${fmt(ps.at(-1).rpm, 0)}</strong><span>max RPM</span></div><div><strong>${fmt(tq.torque, 1)} Nm</strong><span>peak torque @ ${fmt(tq.rpm, 0)} RPM</span></div><div><strong>${fmt(power(pw), 1)} bhp</strong><span>peak power @ ${fmt(pw.rpm, 0)} RPM</span></div><div><strong>Ready</strong><span>${f === 'torque-hash-rpm' ? `Crashday grid: ${rows.length} rows` : `Output points: ${rows.length}`}</span></div>`;
      }
    }

    if (f === 'torque-hash-rpm') status(`Crashday output valid: ${outPts(ps, f).length} rows from 0 RPM.`);
  }

  function copy(e) {
    const txt = ($('output-preview') || {}).textContent || '';
    if (!txt || txt === 'No output yet.') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    (navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(txt) : Promise.reject())
      .then(() => status('Copied live preview output.'))
      .catch(() => {
        const a = document.createElement('textarea');
        a.style.position = 'fixed';
        a.style.top = '-9999px';
        a.value = txt;
        document.body.appendChild(a);
        a.focus();
        a.select();
        try {
          document.execCommand('copy');
          status('Copied live preview output.');
        } catch (_) {
          status('Copy failed. Select the preview and copy manually.', true);
        }
        a.remove();
      });
  }

  function bind() {
    ['powerlut', 'output-format', 'output-torque-unit', 'input-torque-unit'].forEach((id) => {
      const e = $(id);
      if (e) {
        e.addEventListener('input', () => {
          clearTimeout(tmr);
          tmr = setTimeout(update, 80);
        });
        e.addEventListener('change', update);
      }
    });

    const gp = $('game-preset');
    if (gp) gp.addEventListener('change', () => {
      const p = PRE[gp.value];
      if (!p) return;
      if ($('output-format')) $('output-format').value = p[0];
      if ($('output-torque-unit')) $('output-torque-unit').value = p[1];
      status(p[2]);
      update();
    });

    const cp = $('copy-output');
    if (cp) cp.addEventListener('click', copy, true);

    const add = $('add-point');
    if (add) add.addEventListener('click', addPoint);

    const del = $('delete-point');
    if (del) del.addEventListener('click', deleteSelected);

    setTimeout(update, 250);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', bind) : bind();
}());