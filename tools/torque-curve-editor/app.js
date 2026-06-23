(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const src = $('src');
  const parseBox = $('parse');
  const selected = $('selected');
  const chartEl = $('chart');
  const inUnit = $('inUnit');
  const mode = $('mode');
  const torqueUnit = $('torqueUnit');
  const powerUnit = $('powerUnit');
  const outFmt = $('outFmt');
  const outUnit = $('outUnit');
  const outStatus = $('outStatus');
  const file = $('file');

  let chart = null;
  let points = [];
  let selectedId = null;
  let drag = null;
  let uid = 1;

  const TORQUE = {
    nm: { label: 'Nm', decimals: 1, toNm: (v) => v, fromNm: (v) => v },
    lbft: { label: 'lb-ft', decimals: 1, toNm: (v) => v / 0.737562149, fromNm: (v) => v * 0.737562149 },
    kgm: { label: 'kgm', decimals: 2, toNm: (v) => v / 0.101971621, fromNm: (v) => v * 0.101971621 }
  };

  const POWER = {
    bhp: { label: 'bhp', decimals: 1, fromBhp: (v) => v },
    ps: { label: 'PS', decimals: 1, fromBhp: (v) => v * 1.013869665 },
    kw: { label: 'kW', decimals: 1, fromBhp: (v) => v * 0.745699872 }
  };

  function num(value) {
    const cleaned = String(value).trim().replace(',', '.').replace(/[^\d.+\-eE]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function fmt(value, decimals) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '';
    if (!decimals) return String(Math.round(number));
    return number.toFixed(decimals).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  function unitFromText(text) {
    const t = String(text).toLowerCase();
    if (/\b(lb\s*-?\s*ft|ft\s*-?\s*lb|lbft|ftlb)\b/.test(t)) return 'lbft';
    if (/\b(kgf?\s*[·.\- ]?\s*m|kgm)\b/.test(t)) return 'kgm';
    if (/\bn\s*[·.\- ]?\s*m\b|\bnm\b/.test(t)) return 'nm';
    return null;
  }

  function resolveInputUnit(text) {
    return unitFromText(text) || (inUnit.value === 'auto' ? 'nm' : inUnit.value);
  }

  function toNm(value, unit) {
    return (TORQUE[unit] || TORQUE.nm).toNm(value);
  }

  function fromNm(value, unit) {
    return (TORQUE[unit] || TORQUE.nm).fromNm(value);
  }

  function powerBhp(torqueNm, rpm) {
    return rpm * torqueNm / 7127.013;
  }

  function makePoint(rpm, torque, unit) {
    return {
      id: 'p' + uid++,
      rpm: Math.max(0, rpm),
      nm: Math.max(0, toNm(torque, unit || 'nm'))
    };
  }

  function parseLine(line) {
    const raw = line;
    line = String(line).replace(/\s+\/\/.*$/, '').trim();
    if (!line) return null;

    if (line.includes('#')) {
      const parts = line.split('#');
      const before = parts[0];
      const after = parts.slice(1).join('#');
      const nBefore = num(before);
      const nAfter = num(after);
      const beforeRpm = /rpm/i.test(before);
      const afterRpm = /rpm/i.test(after);
      if (nBefore !== null && nAfter !== null) {
        if (afterRpm && !beforeRpm) return makePoint(nAfter, nBefore, resolveInputUnit(before));
        if (beforeRpm && !afterRpm) return makePoint(nBefore, nAfter, resolveInputUnit(after));
        return makePoint(nAfter, nBefore, resolveInputUnit(before));
      }
    }

    let bits = line.split(/\s*(?:\||;|,|\t|=>|->|=|:)\s*/).filter(Boolean);
    if (bits.length >= 2) {
      const rpm = num(bits[0]);
      const torque = num(bits.slice(1).join(' '));
      if (rpm !== null && torque !== null) return makePoint(rpm, torque, resolveInputUnit(bits.slice(1).join(' ')));
    }

    bits = line.match(/[+-]?\d+(?:[.,]\d+)?(?:e[+-]?\d+)?/gi);
    if (bits && bits.length >= 2) {
      const rpm = num(bits[0]);
      const torque = num(bits[1]);
      if (rpm !== null && torque !== null) return makePoint(rpm, torque, resolveInputUnit(raw));
    }

    return null;
  }

  function readText() {
    uid = 1;
    points = [];
    const bad = [];

    src.value.split(/\r?\n/).forEach((line, index) => {
      const point = parseLine(line);
      if (point) points.push(point);
      else if (line.trim()) bad.push(index + 1);
    });

    points.sort((a, b) => a.rpm - b.rpm);
    if (!points.some((p) => p.id === selectedId)) selectedId = null;

    parseBox.textContent = 'Parsed ' + points.length + ' points' + (bad.length ? '. Ignored line(s): ' + bad.join(', ') + '.' : '.');
    parseBox.className = 'status ' + (bad.length ? 'warn' : '');
    render();
  }

  function seriesData() {
    const tq = torqueUnit.value;
    const pw = powerUnit.value;
    return {
      torque: points.map((p) => ({
        x: p.rpm,
        y: fromNm(p.nm, tq),
        id: p.id,
        marker: {
          enabled: true,
          radius: p.id === selectedId ? 7 : 4,
          lineWidth: p.id === selectedId ? 3 : 1,
          lineColor: p.id === selectedId ? '#fff' : undefined
        }
      })),
      power: points.map((p) => ({
        x: p.rpm,
        y: POWER[pw].fromBhp(powerBhp(p.nm, p.rpm)),
        id: p.id,
        marker: { enabled: false }
      }))
    };
  }

  function maxValue(items, key) {
    return Math.max(0, ...items.map((x) => Number(x[key]) || 0));
  }

  function tickStep(value) {
    if (value <= 0) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(value)));
    const x = value / mag;
    return (x <= 1 ? 1 : x <= 2 ? 2 : x <= 2.5 ? 2.5 : x <= 5 ? 5 : 10) * mag;
  }

  function niceMax(value) {
    if (value <= 0) return 10;
    const step = tickStep(value * 1.04 / 5);
    return Math.ceil(value * 1.04 / step) * step;
  }

  function rpmMax() {
    return Math.max(1000, Math.ceil(maxValue(points, 'rpm') / 1000) * 1000);
  }

  function updateSelectedLabel() {
    const point = points.find((p) => p.id === selectedId);
    if (!point) {
      selected.textContent = 'No point selected';
      selected.className = 'pill';
      return;
    }
    const tq = torqueUnit.value;
    const pw = powerUnit.value;
    selected.textContent = fmt(point.rpm, 0) + ' RPM · ' + fmt(fromNm(point.nm, tq), TORQUE[tq].decimals) + ' ' + TORQUE[tq].label + ' · ' + fmt(POWER[pw].fromBhp(powerBhp(point.nm, point.rpm)), POWER[pw].decimals) + ' ' + POWER[pw].label;
    selected.className = 'pill on';
  }

  function applyAxes(data, redraw) {
    chart.xAxis[0].setExtremes(0, rpmMax(), false, false);
    chart.yAxis[0].setExtremes(0, niceMax(maxValue(data.torque, 'y')), false, false);
    chart.yAxis[1].setExtremes(0, niceMax(maxValue(data.power, 'y')), false, false);
    if (redraw) chart.redraw(false);
  }

  function updateChart() {
    if (!chart) return render();
    const data = seriesData();
    chart.series[0].setData(data.torque, false, false, false);
    chart.series[1].setData(data.power, false, false, false);
    chart.yAxis[0].update({ title: { text: 'Torque (' + TORQUE[torqueUnit.value].label + ')' }, labels: { format: '{value} ' + TORQUE[torqueUnit.value].label } }, false);
    chart.yAxis[1].update({ title: { text: 'Power (' + POWER[powerUnit.value].label + ')' }, labels: { format: '{value} ' + POWER[powerUnit.value].label } }, false);
    applyAxes(data, true);
    updateSelectedLabel();
  }

  function render() {
    const data = seriesData();
    if (chart) chart.destroy();
    chart = Highcharts.chart(chartEl, {
      accessibility: { enabled: false },
      chart: { type: mode.value, animation: false, backgroundColor: 'transparent', alignTicks: false, style: { fontFamily: 'Inter, system-ui, sans-serif' } },
      credits: { enabled: false },
      title: { text: '' },
      legend: { itemStyle: { color: '#f8fafc', fontWeight: '700' } },
      xAxis: { min: 0, max: rpmMax(), title: { text: 'RPM' }, gridLineWidth: 1, gridLineColor: '#273244', labels: { style: { color: '#a6b0c3' } } },
      yAxis: [
        { min: 0, max: niceMax(maxValue(data.torque, 'y')), startOnTick: false, endOnTick: false, tickAmount: 6, title: { text: 'Torque (' + TORQUE[torqueUnit.value].label + ')' }, gridLineColor: '#273244', labels: { format: '{value} ' + TORQUE[torqueUnit.value].label, style: { color: '#a6b0c3' } } },
        { min: 0, max: niceMax(maxValue(data.power, 'y')), startOnTick: false, endOnTick: false, tickAmount: 6, opposite: true, title: { text: 'Power (' + POWER[powerUnit.value].label + ')' }, gridLineColor: '#273244', labels: { format: '{value} ' + POWER[powerUnit.value].label, style: { color: '#a6b0c3' } } }
      ],
      tooltip: { shared: true, backgroundColor: '#111827', borderColor: '#374151', style: { color: '#f8fafc' }, headerFormat: 'RPM: <b>{point.x:.0f}</b><br>' },
      plotOptions: { series: { animation: false, lineWidth: 3, states: { inactive: { opacity: 1 } } } },
      series: [
        { name: 'Torque', type: mode.value, color: '#60a5fa', data: data.torque, point: { events: { click: function () { selectedId = this.options.id; updateChart(); } } } },
        { name: 'Power', type: mode.value, color: '#22c55e', yAxis: 1, data: data.power, marker: { enabled: false } }
      ]
    });
    installDragHandlers();
    updateSelectedLabel();
  }

  function writeCanonical() {
    src.value = points.slice().sort((a, b) => a.rpm - b.rpm).map((p) => fmt(p.rpm, 0) + '|' + fmt(p.nm, 1)).join('\n');
    inUnit.value = 'auto';
  }

  function nearestPoint(event) {
    const e = chart.pointer.normalize(event);
    let best = null;
    let bestDistance = 18;
    chart.series[0].points.forEach((p) => {
      if (typeof p.plotX !== 'number' || typeof p.plotY !== 'number') return;
      const dx = e.chartX - (chart.plotLeft + p.plotX);
      const dy = e.chartY - (chart.plotTop + p.plotY);
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = p;
      }
    });
    return best;
  }

  function pointerValues(event) {
    const e = chart.pointer.normalize(event);
    return {
      rpm: chart.xAxis[0].toValue(e.chartX, true),
      torque: chart.yAxis[0].toValue(e.chartY, true)
    };
  }

  function installDragHandlers() {
    chart.container.addEventListener('mousedown', (event) => {
      const hp = nearestPoint(event);
      if (!hp) return;
      event.preventDefault();
      selectedId = hp.options.id;
      const point = points.find((p) => p.id === selectedId);
      const pointer = pointerValues(event);
      drag = { id: selectedId, startRpm: pointer.rpm, startTorque: pointer.torque, pointRpm: point.rpm, pointTorque: fromNm(point.nm, torqueUnit.value), unit: torqueUnit.value };
      updateSelectedLabel();
    });
    chart.container.addEventListener('mousemove', (event) => {
      chart.container.style.cursor = drag ? 'grabbing' : nearestPoint(event) ? 'grab' : 'default';
    });
  }

  function moveDrag(event) {
    if (!drag || !chart) return;
    event.preventDefault();
    const pointer = pointerValues(event);
    const point = points.find((p) => p.id === drag.id);
    if (!point) return;
    let rpm = drag.pointRpm + (pointer.rpm - drag.startRpm);
    let torque = drag.pointTorque + (pointer.torque - drag.startTorque);
    if (!event.shiftKey) rpm = drag.pointRpm;
    if (event.altKey) torque = drag.pointTorque;
    point.rpm = Math.max(0, Math.round(rpm));
    point.nm = Math.max(0, toNm(Math.round(torque * 10) / 10, drag.unit));
    points.sort((a, b) => a.rpm - b.rpm);
    updateChart();
  }

  function stopDrag() {
    if (!drag) return;
    drag = null;
    writeCanonical();
    readText();
  }

  function interpolatedNm(rpm) {
    let arr = points.slice().sort((a, b) => a.rpm - b.rpm);
    if (!arr.length) return 0;
    if (arr[0].rpm > 0) arr = [{ rpm: 0, nm: 0 }].concat(arr);
    if (rpm <= arr[0].rpm) return arr[0].nm;
    if (rpm >= arr[arr.length - 1].rpm) return arr[arr.length - 1].nm;
    for (let i = 0; i < arr.length - 1; i++) {
      const left = arr[i];
      const right = arr[i + 1];
      if (rpm >= left.rpm && rpm <= right.rpm) {
        const ratio = (rpm - left.rpm) / (right.rpm - left.rpm || 1);
        return left.nm + (right.nm - left.nm) * ratio;
      }
    }
    return 0;
  }

  function outputPoints() {
    if (outFmt.value !== 'crv') return points.slice().sort((a, b) => a.rpm - b.rpm);
    const maxRpm = Math.floor(maxValue(points, 'rpm') / 1000) * 1000;
    const arr = [];
    for (let rpm = 0; rpm <= maxRpm; rpm += 1000) arr.push({ rpm, nm: interpolatedNm(rpm) });
    return arr;
  }

  function outputText() {
    const unit = outUnit.value;
    const arr = outputPoints();
    if (outFmt.value === 'crv') return arr.map((p) => fmt(fromNm(p.nm, unit), TORQUE[unit].decimals) + ' # RPM = ' + fmt(p.rpm, 0)).join('\n');
    if (outFmt.value === 'csv') return arr.map((p) => fmt(p.rpm, 0) + ',' + fmt(fromNm(p.nm, unit), TORQUE[unit].decimals)).join('\n');
    if (outFmt.value === 'beamng') return '"torque": [\n    ["rpm", "torque"],\n' + arr.map((p) => '    [' + fmt(p.rpm, 0) + ', ' + fmt(fromNm(p.nm, unit), TORQUE[unit].decimals) + ']').join(',\n') + '\n  ]';
    if (outFmt.value === 'json') return JSON.stringify(arr.map((p) => ({ rpm: Math.round(p.rpm), torque: Number(fmt(fromNm(p.nm, unit), TORQUE[unit].decimals)), unit: TORQUE[unit].label })), null, 2);
    return arr.map((p) => fmt(p.rpm, 0) + '|' + fmt(fromNm(p.nm, unit), TORQUE[unit].decimals)).join('\n');
  }

  $('copy').addEventListener('click', () => {
    const text = outputText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        outStatus.textContent = 'Copied output to clipboard.';
        outStatus.className = 'status ok';
      }).catch(() => window.prompt('Copy output:', text));
    } else {
      window.prompt('Copy output:', text);
    }
  });

  src.addEventListener('input', readText);
  [inUnit, mode, torqueUnit, powerUnit].forEach((el) => el.addEventListener('change', readText));
  [outFmt, outUnit].forEach((el) => el.addEventListener('change', () => { outStatus.textContent = ''; }));
  file.addEventListener('change', (event) => {
    const picked = event.target.files && event.target.files[0];
    if (!picked) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      src.value = e.target.result;
      readText();
    };
    reader.readAsText(picked);
    event.target.value = '';
  });

  document.addEventListener('mousemove', moveDrag);
  document.addEventListener('mouseup', stopDrag);

  readText();
})();
