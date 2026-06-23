(function () {
  const $ = (id) => document.getElementById(id);
  const nmFrom = {
    nm: (v) => v,
    lbft: (v) => v / 0.737562149,
    kgm: (v) => v / 0.101971621,
  };
  const outFromNm = {
    nm: (v) => v,
    lbft: (v) => v * 0.737562149,
    kgm: (v) => v * 0.101971621,
  };
  const torqueDecimals = { nm: 1, lbft: 1, kgm: 2 };
  const presets = {
    crashday: ['torque-hash-rpm', 'nm', 'Crashday preset active: complete 1000-RPM CRV grid.'],
    assetto: ['rpm-pipe-torque', 'nm', 'Assetto preset active: RPM|Torque in Nm.'],
    beamng: ['beamng-jbeam', 'nm', 'BeamNG preset active: JBeam torque table.'],
    csv: ['csv', 'nm', 'CSV preset active: RPM,Torque rows.'],
  };
  let debounceTimer = 0;

  function num(value) {
    const parsed = Number(String(value).replace(',', '.').replace(/[^\d.+\-eE]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function fmt(value, decimals) {
    if (!Number.isFinite(value)) return '';
    return value.toFixed(decimals).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[ch]);
  }

  function currentInputUnit(text) {
    const lower = String(text || '').toLowerCase();
    if (/\b(lb\s*-?\s*ft|ft\s*-?\s*lb|ftlb|lbft)\b/.test(lower)) return 'lbft';
    if (/\b(kgf?\s*[·.\- ]?\s*m|kgm)\b/.test(lower)) return 'kgm';
    if (/\bn\s*[·.\- ]?\s*m\b|\bnm\b/.test(lower)) return 'nm';
    const select = $('input-torque-unit');
    return select && select.value !== 'auto' ? select.value : 'nm';
  }

  function shouldSwap(a, b, source) {
    const text = String(source || '').toLowerCase();
    if (/rpm|torque|nm|lb\s*-?\s*ft|ft\s*-?\s*lb|lbft|kgm|kgf\s*m|#/.test(text)) return false;
    return a >= 0 && a <= 1500 && b >= 1800 && b <= 30000;
  }

  function parseLine(line, lineNo, assists, invalids) {
    const original = line;
    line = String(line).replace(/\s+\/\/.*$/, '').trim();
    if (!line) return null;

    if (line.includes('#')) {
      const parts = line.split('#');
      const aText = parts[0];
      const bText = parts.slice(1).join('#');
      const a = num(aText);
      const b = num(bText);
      if (a === null || b === null) { invalids.push(lineNo); return null; }
      if (/rpm/i.test(bText)) return { rpm: b, torque: nmFrom[currentInputUnit(aText)](a) };
      if (/rpm/i.test(aText)) return { rpm: a, torque: nmFrom[currentInputUnit(bText)](b) };
      return { rpm: b, torque: nmFrom[currentInputUnit(aText)](a) };
    }

    const parts = line.split(/\s*(?:\||;|,|\t|=>|->|=|:|\/)\s*/).filter(Boolean);
    if (parts.length < 2) {
      const nums = line.match(/[+-]?\d+(?:[.,]\d+)?(?:e[+-]?\d+)?/gi) || [];
      if (nums.length >= 2) parts.push(nums[0], nums[1]);
    }
    if (parts.length < 2) { invalids.push(lineNo); return null; }

    let a = num(parts[0]);
    let b = num(parts[1]);
    if (a === null || b === null) { invalids.push(lineNo); return null; }
    let rpm = a;
    let torque = b;
    if (shouldSwap(a, b, original)) {
      rpm = b;
      torque = a;
      assists.push(`Line ${lineNo}: swapped likely torque/RPM order.`);
    }
    return { rpm, torque: nmFrom[currentInputUnit(line)](torque) };
  }

  function parseText() {
    const textarea = $('powerlut');
    const assists = [];
    const invalids = [];
    const byRpm = new Map();
    (textarea ? textarea.value : '').split(/\r?\n/).forEach((line, index) => {
      const point = parseLine(line, index + 1, assists, invalids);
      if (!point) return;
      let rpm = Math.round(point.rpm * 10) / 10;
      let torque = Math.round(point.torque * 10) / 10;
      if (rpm < 0) { rpm = 0; assists.push(`Line ${index + 1}: clamped negative RPM to 0.`); }
      if (torque < 0) { torque = 0; assists.push(`Line ${index + 1}: clamped negative torque to 0.`); }
      if (byRpm.has(rpm)) assists.push(`Merged duplicate ${fmt(rpm, 0)} RPM entry; later value kept.`);
      byRpm.set(rpm, { rpm, torque });
    });
    return { points: Array.from(byRpm.values()).sort((a, b) => a.rpm - b.rpm), assists, invalids };
  }

  function interp(points, rpm) {
    if (!points.length) return 0;
    const src = points[0].rpm > 0 ? [{ rpm: 0, torque: 0 }].concat(points) : points;
    if (rpm <= src[0].rpm) return src[0].torque;
    if (rpm >= src[src.length - 1].rpm) return src[src.length - 1].torque;
    for (let i = 0; i < src.length - 1; i += 1) {
      const l = src[i], r = src[i + 1];
      if (rpm === l.rpm) return l.torque;
      if (rpm === r.rpm) return r.torque;
      if (rpm > l.rpm && rpm < r.rpm) return l.torque + ((rpm - l.rpm) / (r.rpm - l.rpm)) * (r.torque - l.torque);
    }
    return 0;
  }

  function outputPoints(points, format) {
    if (format !== 'torque-hash-rpm') return points;
    const maxRpm = points.length ? Math.floor(points[points.length - 1].rpm / 1000) * 1000 : 0;
    const out = [];
    for (let rpm = 0; rpm <= maxRpm; rpm += 1000) out.push({ rpm, torque: interp(points, rpm) });
    return out;
  }

  function formatOutput(points) {
    const format = ($('output-format') || {}).value || 'rpm-pipe-torque';
    const unit = ($('output-torque-unit') || {}).value || 'nm';
    const rows = outputPoints(points, format);
    const t = (nm) => fmt(outFromNm[unit](nm), torqueDecimals[unit] || 1);
    if (format === 'torque-hash-rpm') return rows.map((p) => `${t(p.torque)} # RPM = ${fmt(p.rpm, 0)}`).join('\n');
    if (format === 'csv') return rows.map((p) => `${fmt(p.rpm, 0)},${t(p.torque)}`).join('\n');
    if (format === 'beamng-jbeam') return '"torque": [\n    ["rpm", "torque"],\n' + rows.map((p) => `    [${fmt(p.rpm, 0)}, ${t(p.torque)}]`).join(',\n') + '\n  ]';
    if (format === 'json-array') return JSON.stringify(rows.map((p) => [Number(fmt(p.rpm, 0)), Number(t(p.torque))]));
    if (format === 'json-objects') return JSON.stringify(rows.map((p) => ({ rpm: Number(fmt(p.rpm, 0)), torqueNm: Number(t(p.torque)) })), null, 2);
    return rows.map((p) => `${fmt(p.rpm, 0)}|${t(p.torque)}`).join('\n');
  }

  function powerBhp(p) { return (p.rpm * p.torque) / ((745.699872 / Math.PI / 2) * 60); }

  function selectedRpm() {
    const label = $('selected-point');
    const match = label && label.textContent.match(/^(\d+(?:\.\d+)?) RPM/);
    return match ? Number(match[1]) : null;
  }

  function writePoints(points) {
    const textarea = $('powerlut');
    if (!textarea) return;
    textarea.value = points.map((p) => `${fmt(p.rpm, 0)}|${fmt(p.torque, 1)}`).join('\n');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function addPoint() {
    const { points } = parseText();
    if (!points.length) return writePoints([{ rpm: 0, torque: 0 }, { rpm: 1000, torque: 0 }]);
    const sel = selectedRpm();
    let rpm = points[points.length - 1].rpm + 1000;
    if (sel !== null) {
      const i = points.findIndex((p) => Math.round(p.rpm) === Math.round(sel));
      if (i >= 0 && points[i + 1]) rpm = (points[i].rpm + points[i + 1].rpm) / 2;
      else if (i >= 0) rpm = points[i].rpm + 1000;
    }
    points.push({ rpm: Math.max(0, Math.round(rpm)), torque: interp(points, rpm) });
    writePoints(points.sort((a, b) => a.rpm - b.rpm));
  }

  function deletePoint() {
    const { points } = parseText();
    const rpm = selectedRpm();
    if (rpm === null) return setStatus('Select a point first, then delete it.', true);
    if (points.length <= 2) return setStatus('Keep at least two points so the curve remains usable.', true);
    writePoints(points.filter((p) => Math.round(p.rpm) !== Math.round(rpm)));
    setStatus('Deleted selected point.');
  }

  function setStatus(text, warn) {
    const el = $('output-status');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('has-warning', !!warn);
  }

  function updateWorkbench() {
    const parsed = parseText();
    const points = parsed.points;
    const preview = $('output-preview');
    const log = $('assist-log');
    const summary = $('curve-summary');
    const format = ($('output-format') || {}).value || '';
    if (preview) {
      const out = formatOutput(points);
      preview.textContent = out.length > 12000 ? out.slice(0, 12000) + '\n\n…preview truncated. Copy output still copies the full text.' : out || 'No output yet.';
    }
    if (log) {
      const items = parsed.invalids.length ? [`Ignored invalid line(s): ${parsed.invalids.join(', ')}.`].concat(parsed.assists) : parsed.assists;
      log.innerHTML = items.length ? '<strong>Assisted fixes</strong><ul>' + items.slice(0, 8).map((x) => `<li>${escapeHtml(x)}</li>`).join('') + '</ul>' : '<span class="assist-good">No assisted fixes needed.</span>';
      log.classList.toggle('has-warning', !!items.length);
    }
    if (summary) {
      if (!points.length) summary.innerHTML = '<span class="summary-warning">No usable curve points yet.</span>';
      else {
        const peakT = points.reduce((a, b) => (b.torque > a.torque ? b : a), points[0]);
        const peakP = points.reduce((a, b) => (powerBhp(b) > powerBhp(a) ? b : a), points[0]);
        const rows = outputPoints(points, format);
        summary.innerHTML = `<div><strong>${points.length}</strong><span>source points</span></div><div><strong>${fmt(points[points.length - 1].rpm, 0)}</strong><span>max RPM</span></div><div><strong>${fmt(peakT.torque, 1)} Nm</strong><span>peak torque @ ${fmt(peakT.rpm, 0)} RPM</span></div><div><strong>${fmt(powerBhp(peakP), 1)} bhp</strong><span>peak power @ ${fmt(peakP.rpm, 0)} RPM</span></div><div><strong>Ready</strong><span>${format === 'torque-hash-rpm' ? `Crashday grid: ${rows.length} rows` : `Output points: ${rows.length}`}</span></div>`;
      }
    }
    if (format === 'torque-hash-rpm') setStatus(`Crashday output valid: ${outputPoints(points, format).length} rows from 0 RPM.`);
  }

  function bind() {
    ['powerlut', 'output-format', 'output-torque-unit', 'input-torque-unit'].forEach((id) => {
      const el = $(id);
      if (el) el.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(updateWorkbench, 80); });
      if (el) el.addEventListener('change', updateWorkbench);
    });
    const preset = $('game-preset');
    if (preset) preset.addEventListener('change', () => {
      const p = presets[preset.value];
      if (!p) return;
      if ($('output-format')) $('output-format').value = p[0];
      if ($('output-torque-unit')) $('output-torque-unit').value = p[1];
      setStatus(p[2]);
      updateWorkbench();
    });
    if ($('add-point')) $('add-point').addEventListener('click', addPoint);
    if ($('delete-point')) $('delete-point').addEventListener('click', deletePoint);
    setTimeout(updateWorkbench, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
}());
