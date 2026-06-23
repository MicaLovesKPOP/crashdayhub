function main() {
  const textarea = document.getElementById('powerlut');
  const parseStatus = document.getElementById('parse-status');
  const importStatus = document.getElementById('import-status');
  const outputStatus = document.getElementById('output-status');
  const selectedPointLabel = document.getElementById('selected-point');
  const themeToggle = document.getElementById('theme-toggle');
  const fileImport = document.getElementById('file-import');
  const graphElement = document.getElementById('result-torque');
  const inputTorqueUnitSelect = document.getElementById('input-torque-unit');
  const curveModeSelect = document.getElementById('curve-mode');
  const torqueDisplaySelect = document.getElementById('torque-display-unit');
  const powerDisplaySelect = document.getElementById('power-display-unit');
  const outputFormatSelect = document.getElementById('output-format');
  const outputTorqueUnitSelect = document.getElementById('output-torque-unit');
  const copyOutputButton = document.getElementById('copy-output');

  if (!textarea || !parseStatus || !selectedPointLabel || !graphElement) {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<div style="background:#ffdddd;color:#111;padding:10px;font-weight:bold;">Missing required HTML elements.</div>',
    );
    return;
  }

  let chart = null;
  let curvePoints = [];
  let selectedPointId = null;
  let selectedPointResetSnapshot = null;
  let isProgrammaticTextareaUpdate = false;
  let dragState = null;
  let axisFreezeState = null;
  let keyboardAxisFreezeActive = false;
  let lastImportedFormat = 'rpm-pipe-torque';

  const THEME_STORAGE_KEY = 'crvCurveEditorTheme';
  const INPUT_TORQUE_STORAGE_KEY = 'crvCurveEditorInputTorqueUnit';
  const CURVE_MODE_STORAGE_KEY = 'crvCurveEditorCurveMode';
  const TORQUE_DISPLAY_STORAGE_KEY = 'crvCurveEditorTorqueDisplayUnit';
  const POWER_DISPLAY_STORAGE_KEY = 'crvCurveEditorPowerDisplayUnit';
  const OUTPUT_FORMAT_STORAGE_KEY = 'crvCurveEditorOutputFormat';
  const OUTPUT_TORQUE_UNIT_STORAGE_KEY = 'crvCurveEditorOutputTorqueUnit';

  const systemThemeQuery = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: light)')
    : null;

  const TORQUE_UNITS = {
    nm: {
      label: 'Nm',
      jsonKey: 'torqueNm',
      toNm: function (value) {
        return value;
      },
      fromNm: function (value) {
        return value;
      },
      decimals: 1,
    },
    lbft: {
      label: 'lb-ft',
      jsonKey: 'torqueLbFt',
      toNm: function (value) {
        return value / 0.737562149;
      },
      fromNm: function (value) {
        return value * 0.737562149;
      },
      decimals: 1,
    },
    kgm: {
      label: 'kgm',
      jsonKey: 'torqueKgm',
      toNm: function (value) {
        return value / 0.101971621;
      },
      fromNm: function (value) {
        return value * 0.101971621;
      },
      decimals: 2,
    },
  };

  const POWER_UNITS = {
    bhp: {
      label: 'bhp',
      fromBhp: function (value) {
        return value;
      },
      decimals: 1,
    },
    ps: {
      label: 'PS',
      fromBhp: function (value) {
        return value * 1.013869665;
      },
      decimals: 1,
    },
    kw: {
      label: 'kW',
      fromBhp: function (value) {
        return value * 0.745699872;
      },
      decimals: 1,
    },
  };

  const AcMath = {
    torqueNmToPowerBhp: function (torqueNm, rpm) {
      const bhpToWatts = 745.699872;
      return (rpm * torqueNm) / ((bhpToWatts / Math.PI / 2) * 60);
    },
  };

  function getStorageItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function setStorageItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // localStorage can be blocked inside some iframe/browser setups.
    }
  }

  function getSavedTheme() {
    const savedTheme = getStorageItem(THEME_STORAGE_KEY);
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : null;
  }

  function getSystemTheme() {
    return systemThemeQuery && systemThemeQuery.matches ? 'light' : 'dark';
  }

  function getCurrentTheme() {
    return document.documentElement.dataset.theme || getSystemTheme();
  }

  function updateThemeToggleLabel(theme) {
    if (!themeToggle) return;

    themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    themeToggle.setAttribute(
      'aria-label',
      theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
    );
  }

  function applyTheme(theme, options) {
    const shouldSave = options && options.save;

    document.documentElement.dataset.theme = theme;
    updateThemeToggleLabel(theme);

    if (shouldSave) {
      setStorageItem(THEME_STORAGE_KEY, theme);
    }

    if (chart) {
      renderGraph();
    }
  }

  function setupThemeToggle() {
    applyTheme(getSavedTheme() || getSystemTheme(), { save: false });

    if (themeToggle) {
      themeToggle.addEventListener('click', function () {
        const nextTheme = getCurrentTheme() === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme, { save: true });
      });
    }

    if (systemThemeQuery) {
      const handleSystemThemeChange = function () {
        if (!getSavedTheme()) {
          applyTheme(getSystemTheme(), { save: false });
        }
      };

      if (typeof systemThemeQuery.addEventListener === 'function') {
        systemThemeQuery.addEventListener('change', handleSystemThemeChange);
      } else if (typeof systemThemeQuery.addListener === 'function') {
        systemThemeQuery.addListener(handleSystemThemeChange);
      }
    }
  }

  function setupControls() {
    const savedInputTorqueUnit = getStorageItem(INPUT_TORQUE_STORAGE_KEY);
    const savedCurveMode = getStorageItem(CURVE_MODE_STORAGE_KEY);
    const savedTorqueDisplay = getStorageItem(TORQUE_DISPLAY_STORAGE_KEY);
    const savedPowerDisplay = getStorageItem(POWER_DISPLAY_STORAGE_KEY);
    const savedOutputFormat = getStorageItem(OUTPUT_FORMAT_STORAGE_KEY);
    const savedOutputTorqueUnit = getStorageItem(
      OUTPUT_TORQUE_UNIT_STORAGE_KEY,
    );

    if (
      inputTorqueUnitSelect &&
      (savedInputTorqueUnit === 'auto' || TORQUE_UNITS[savedInputTorqueUnit])
    ) {
      inputTorqueUnitSelect.value = savedInputTorqueUnit;
    }

    if (
      curveModeSelect &&
      (savedCurveMode === 'line' || savedCurveMode === 'spline')
    ) {
      curveModeSelect.value = savedCurveMode;
    }

    if (torqueDisplaySelect && TORQUE_UNITS[savedTorqueDisplay]) {
      torqueDisplaySelect.value = savedTorqueDisplay;
    }

    if (powerDisplaySelect && POWER_UNITS[savedPowerDisplay]) {
      powerDisplaySelect.value = savedPowerDisplay;
    }

    if (outputFormatSelect && savedOutputFormat) {
      const optionExists = Array.from(outputFormatSelect.options).some(
        function (option) {
          return option.value === savedOutputFormat;
        },
      );

      if (optionExists) {
        outputFormatSelect.value = savedOutputFormat;
      }
    }

    if (outputTorqueUnitSelect && TORQUE_UNITS[savedOutputTorqueUnit]) {
      outputTorqueUnitSelect.value = savedOutputTorqueUnit;
    }

    if (inputTorqueUnitSelect) {
      inputTorqueUnitSelect.addEventListener('change', function () {
        setStorageItem(INPUT_TORQUE_STORAGE_KEY, getInputTorqueUnit());
        readTextareaAndRender();
        setOutputStatus('');
      });
    }

    if (curveModeSelect) {
      curveModeSelect.addEventListener('change', function () {
        setStorageItem(CURVE_MODE_STORAGE_KEY, getCurveMode());
        renderGraph();
      });
    }

    if (torqueDisplaySelect) {
      torqueDisplaySelect.addEventListener('change', function () {
        setStorageItem(TORQUE_DISPLAY_STORAGE_KEY, getTorqueDisplayUnit());
        releaseAxesAfterEdit();
        renderGraph();
      });
    }

    if (powerDisplaySelect) {
      powerDisplaySelect.addEventListener('change', function () {
        setStorageItem(POWER_DISPLAY_STORAGE_KEY, getPowerDisplayUnit());
        releaseAxesAfterEdit();
        renderGraph();
      });
    }

    if (outputFormatSelect) {
      outputFormatSelect.addEventListener('change', function () {
        setStorageItem(OUTPUT_FORMAT_STORAGE_KEY, outputFormatSelect.value);
        setOutputStatus('');
      });
    }

    if (outputTorqueUnitSelect) {
      outputTorqueUnitSelect.addEventListener('change', function () {
        setStorageItem(OUTPUT_TORQUE_UNIT_STORAGE_KEY, getOutputTorqueUnit());
        setOutputStatus('');
      });
    }

    if (copyOutputButton) {
      copyOutputButton.addEventListener('click', copyOutputToClipboard);
    }
  }

  function getInputTorqueUnit() {
    const value = inputTorqueUnitSelect ? inputTorqueUnitSelect.value : 'auto';
    return value === 'auto' || TORQUE_UNITS[value] ? value : 'auto';
  }

  function getCurveMode() {
    const value = curveModeSelect ? curveModeSelect.value : 'spline';
    return value === 'line' ? 'line' : 'spline';
  }

  function getTorqueDisplayUnit() {
    const value = torqueDisplaySelect ? torqueDisplaySelect.value : 'nm';
    return TORQUE_UNITS[value] ? value : 'nm';
  }

  function getPowerDisplayUnit() {
    const value = powerDisplaySelect ? powerDisplaySelect.value : 'bhp';
    return POWER_UNITS[value] ? value : 'bhp';
  }

  function getOutputTorqueUnit() {
    const value = outputTorqueUnitSelect ? outputTorqueUnitSelect.value : 'nm';
    return TORQUE_UNITS[value] ? value : 'nm';
  }

  function getOutputFormat() {
    const value = outputFormatSelect
      ? outputFormatSelect.value
      : 'same-as-imported';
    return value || 'same-as-imported';
  }

  function resolveOutputFormat() {
    const outputFormat = getOutputFormat();
    return outputFormat === 'same-as-imported'
      ? lastImportedFormat
      : outputFormat;
  }

  function convertTorqueFromNm(valueNm, unitKey) {
    const unit = TORQUE_UNITS[unitKey] || TORQUE_UNITS.nm;
    return unit.fromNm(valueNm);
  }

  function convertTorqueToNm(value, unitKey) {
    const unit = TORQUE_UNITS[unitKey] || TORQUE_UNITS.nm;
    return unit.toNm(value);
  }

  function convertPowerFromBhp(valueBhp, unitKey) {
    const unit = POWER_UNITS[unitKey] || POWER_UNITS.bhp;
    return unit.fromBhp(valueBhp);
  }

  function getTorqueUnitLabel(unitKey) {
    const unit = TORQUE_UNITS[unitKey] || TORQUE_UNITS.nm;
    return unit.label;
  }

  function getTorqueUnitJsonKey(unitKey) {
    const unit = TORQUE_UNITS[unitKey] || TORQUE_UNITS.nm;
    return unit.jsonKey;
  }

  function getPowerUnitLabel(unitKey) {
    const unit = POWER_UNITS[unitKey] || POWER_UNITS.bhp;
    return unit.label;
  }

  function getTorqueUnitDecimals(unitKey) {
    const unit = TORQUE_UNITS[unitKey] || TORQUE_UNITS.nm;
    return unit.decimals;
  }

  function getPowerUnitDecimals(unitKey) {
    const unit = POWER_UNITS[unitKey] || POWER_UNITS.bhp;
    return unit.decimals;
  }

  function getCssVar(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  function getChartTheme() {
    return {
      text: getCssVar('--chart-text'),
      muted: getCssVar('--chart-muted'),
      grid: getCssVar('--chart-grid'),
      tooltipBg: getCssVar('--tooltip-bg'),
      tooltipBorder: getCssVar('--tooltip-border'),
      torque: getCssVar('--torque-color'),
      power: getCssVar('--power-color'),
      selectedRing: getCssVar('--selected-ring'),
    };
  }

  function makeId() {
    return Math.random().toString(36).slice(2);
  }

  function cleanNumberString(value) {
    return String(value)
      .trim()
      .replace(',', '.')
      .replace(/[^\d.+\-eE]/g, '');
  }

  function parseNumber(value) {
    const cleaned = cleanNumberString(value);
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
  }

  function extractFirstNumber(text) {
    const match = String(text).match(/[+-]?\d+(?:[.,]\d+)?(?:e[+-]?\d+)?/i);
    return match ? parseNumber(match[0]) : null;
  }

  function detectTorqueUnitFromText(text) {
    const normalized = String(text).toLowerCase();

    if (/\b(lb\s*-?\s*ft|ft\s*-?\s*lb|ftlb|lbft)\b/.test(normalized)) {
      return 'lbft';
    }

    if (/\b(kgf?\s*[·.\- ]?\s*m|kgm)\b/.test(normalized)) {
      return 'kgm';
    }

    if (/\bn\s*[·.\- ]?\s*m\b|\bnm\b/.test(normalized)) {
      return 'nm';
    }

    return null;
  }

  function resolveInputTorqueUnit(textThatMayContainUnit) {
    const explicitUnit = detectTorqueUnitFromText(textThatMayContainUnit);

    if (explicitUnit) {
      return explicitUnit;
    }

    const selectedUnit = getInputTorqueUnit();

    if (selectedUnit !== 'auto') {
      return selectedUnit;
    }

    return 'nm';
  }

  function stripLineComment(line) {
    return String(line)
      .replace(/\s+\/\/.*$/, '')
      .trim();
  }

  function makeParsedPair(rpm, torqueValue, torqueUnit, formatType) {
    const unit = torqueUnit || 'nm';

    return {
      rpm: rpm,
      torque: convertTorqueToNm(torqueValue, unit),
      formatType: formatType || 'rpm-pipe-torque',
      torqueUnit: unit,
    };
  }

  function parsePairFromLine(line) {
    const original = line;
    line = stripLineComment(line);

    if (!line) return null;

    if (line.includes('#')) {
      const hashParts = line.split('#');
      const beforeHash = hashParts[0].trim();
      const afterHash = hashParts.slice(1).join('#').trim();

      const beforeNumber = extractFirstNumber(beforeHash);
      const afterNumber = extractFirstNumber(afterHash);

      const beforeMentionsRpm = /\brpm\b/i.test(beforeHash);
      const afterMentionsRpm = /\brpm\b/i.test(afterHash);
      const beforeMentionsTorque =
        /\b(torque|nm|lb\s*-?\s*ft|ft\s*-?\s*lb|lbft|kgm|kgf\s*m)\b/i.test(
          beforeHash,
        );
      const afterMentionsTorque =
        /\b(torque|nm|lb\s*-?\s*ft|ft\s*-?\s*lb|lbft|kgm|kgf\s*m)\b/i.test(
          afterHash,
        );

      if (beforeNumber !== null && afterNumber !== null) {
        if (afterMentionsRpm && !beforeMentionsRpm) {
          return makeParsedPair(
            afterNumber,
            beforeNumber,
            resolveInputTorqueUnit(beforeHash),
            'torque-hash-rpm',
          );
        }

        if (beforeMentionsRpm && !afterMentionsRpm) {
          return makeParsedPair(
            beforeNumber,
            afterNumber,
            resolveInputTorqueUnit(afterHash),
            'rpm-hash-torque',
          );
        }

        if (beforeMentionsTorque && !afterMentionsTorque) {
          return makeParsedPair(
            afterNumber,
            beforeNumber,
            resolveInputTorqueUnit(beforeHash),
            'torque-hash-rpm',
          );
        }

        if (afterMentionsTorque && !beforeMentionsTorque) {
          return makeParsedPair(
            beforeNumber,
            afterNumber,
            resolveInputTorqueUnit(afterHash),
            'rpm-hash-torque',
          );
        }

        return makeParsedPair(
          beforeNumber,
          afterNumber,
          resolveInputTorqueUnit(afterHash || line),
          'rpm-hash-torque',
        );
      }

      line = beforeHash;
    }

    if (!line) return null;

    const explicitDelimiterPattern = /\s*(?:\||;|\t|=>|->|=|:|\/)\s*/;
    const explicitParts = line.split(explicitDelimiterPattern).filter(Boolean);

    if (explicitParts.length >= 2) {
      const rpm = parseNumber(explicitParts[0]);
      const torqueText = explicitParts.slice(1).join(' ');
      const torque = parseNumber(torqueText);
      const torqueUnit = resolveInputTorqueUnit(torqueText || line);

      if (rpm !== null && torque !== null) {
        return makeParsedPair(
          rpm,
          torque,
          torqueUnit,
          line.includes(',') ? 'csv' : 'rpm-pipe-torque',
        );
      }
    }

    const commaPair = line.match(
      /^\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:[.,]\d+)?)\s*$/,
    );

    if (commaPair) {
      const rpm = parseNumber(commaPair[1]);
      const torque = parseNumber(commaPair[2]);

      if (rpm !== null && torque !== null) {
        return makeParsedPair(rpm, torque, resolveInputTorqueUnit(line), 'csv');
      }
    }

    const numbers = line.match(/[+-]?\d+(?:[.,]\d+)?(?:e[+-]?\d+)?/gi);

    if (numbers && numbers.length >= 2) {
      const rpm = parseNumber(numbers[0]);
      const torque = parseNumber(numbers[1]);

      if (rpm !== null && torque !== null) {
        return makeParsedPair(
          rpm,
          torque,
          resolveInputTorqueUnit(line),
          'space-separated',
        );
      }
    }

    if (!numbers || numbers.length === 0) {
      return null;
    }

    return {
      invalid: true,
      line: original,
    };
  }

  function getDominantFormat(formatCounts) {
    let bestFormat = 'rpm-pipe-torque';
    let bestCount = 0;

    Object.keys(formatCounts).forEach(function (format) {
      if (formatCounts[format] > bestCount) {
        bestFormat = format;
        bestCount = formatCounts[format];
      }
    });

    if (bestFormat === 'space-separated') return 'rpm-pipe-torque';
    return bestFormat;
  }

  function parseLut(text) {
    const lines = text.split(/\r?\n/);
    const parsed = [];
    const invalidLines = [];
    const formatCounts = {};

    lines.forEach(function (line, index) {
      const result = parsePairFromLine(line);

      if (!result) return;

      if (result.invalid) {
        invalidLines.push(index + 1);
        return;
      }

      parsed.push({
        id: makeId(),
        rpm: result.rpm,
        torque: result.torque,
      });

      formatCounts[result.formatType] =
        (formatCounts[result.formatType] || 0) + 1;
    });

    parsed.sort(function (a, b) {
      return a.rpm - b.rpm;
    });

    return {
      points: parsed,
      invalidLines: invalidLines,
      likelyFormat: getDominantFormat(formatCounts),
    };
  }

  function makeImportedPoints(points) {
    return points
      .map(function (point) {
        return {
          id: makeId(),
          rpm: Number(point.rpm),
          torque: Number(point.torque),
        };
      })
      .filter(function (point) {
        return (
          Number.isFinite(point.rpm) &&
          Number.isFinite(point.torque) &&
          point.rpm >= 0 &&
          point.torque >= 0
        );
      })
      .sort(function (a, b) {
        return a.rpm - b.rpm;
      });
  }

  function isPlausibleTorqueCurve(points) {
    if (!Array.isArray(points) || points.length < 2) return false;

    const cleanPoints = points.filter(function (point) {
      return Number.isFinite(point.rpm) && Number.isFinite(point.torque);
    });

    if (cleanPoints.length < 2) return false;

    const maxRpm = Math.max.apply(
      null,
      cleanPoints.map(function (point) {
        return point.rpm;
      }),
    );
    const maxTorque = Math.max.apply(
      null,
      cleanPoints.map(function (point) {
        return point.torque;
      }),
    );

    if (maxRpm < 500 || maxRpm > 30000) return false;
    if (maxTorque <= 0 || maxTorque > 10000) return false;

    return true;
  }

  function normalizeArrayCurve(value, path) {
    if (!Array.isArray(value) || value.length < 2) return null;

    const pathText = Array.isArray(path) ? path.join('.') : '';
    const pathTorqueUnit = resolveInputTorqueUnit(pathText);

    const points = value
      .map(function (item) {
        if (Array.isArray(item) && item.length >= 2) {
          if (typeof item[0] === 'string' && /rpm/i.test(item[0])) {
            return null;
          }

          return {
            rpm: Number(item[0]),
            torque: convertTorqueToNm(Number(item[1]), pathTorqueUnit),
          };
        }

        if (item && typeof item === 'object') {
          let rpm = null;
          let torque = null;
          let torqueUnit = resolveInputTorqueUnit(
            item.unit || item.torqueUnit || pathText,
          );

          if (item.rpm !== undefined) rpm = item.rpm;
          else if (item.RPM !== undefined) rpm = item.RPM;
          else if (item.x !== undefined) rpm = item.x;
          else if (item.X !== undefined) rpm = item.X;
          else if (item.engineRpm !== undefined) rpm = item.engineRpm;
          else if (item.engineRPM !== undefined) rpm = item.engineRPM;

          if (item.torque !== undefined) torque = item.torque;
          else if (item.Torque !== undefined) torque = item.Torque;
          else if (item.torqueNm !== undefined) {
            torque = item.torqueNm;
            torqueUnit = 'nm';
          } else if (item.nm !== undefined) {
            torque = item.nm;
            torqueUnit = 'nm';
          } else if (item.Nm !== undefined) {
            torque = item.Nm;
            torqueUnit = 'nm';
          } else if (item.NM !== undefined) {
            torque = item.NM;
            torqueUnit = 'nm';
          } else if (item.torqueLbFt !== undefined) {
            torque = item.torqueLbFt;
            torqueUnit = 'lbft';
          } else if (item.lbft !== undefined) {
            torque = item.lbft;
            torqueUnit = 'lbft';
          } else if (item.lb_ft !== undefined) {
            torque = item.lb_ft;
            torqueUnit = 'lbft';
          } else if (item.ftlb !== undefined) {
            torque = item.ftlb;
            torqueUnit = 'lbft';
          } else if (item.torqueKgm !== undefined) {
            torque = item.torqueKgm;
            torqueUnit = 'kgm';
          } else if (item.kgm !== undefined) {
            torque = item.kgm;
            torqueUnit = 'kgm';
          } else if (item.y !== undefined) torque = item.y;
          else if (item.Y !== undefined) torque = item.Y;

          return {
            rpm: Number(rpm),
            torque: convertTorqueToNm(Number(torque), torqueUnit),
          };
        }

        return null;
      })
      .filter(Boolean);

    return isPlausibleTorqueCurve(points) ? points : null;
  }

  function scoreCurveCandidate(path, points) {
    const pathText = path.join('.').toLowerCase();
    let score = 0;

    score += Math.min(points.length, 30);

    if (pathText.includes('torque')) score += 100;
    if (pathText.includes('nm')) score += 40;
    if (pathText.includes('curve')) score += 25;
    if (pathText.includes('lut')) score += 20;
    if (pathText.includes('engine')) score += 15;

    if (pathText.includes('powercurve')) score -= 120;
    if (pathText.includes('power_curve')) score -= 120;
    if (pathText.includes('bhp')) score -= 90;
    if (pathText.includes('hp')) score -= 70;
    if (pathText.includes('kw')) score -= 70;

    const rpmValues = points.map(function (point) {
      return point.rpm;
    });
    const torqueValues = points.map(function (point) {
      return point.torque;
    });

    const maxRpm = Math.max.apply(null, rpmValues);
    const maxTorque = Math.max.apply(null, torqueValues);

    if (maxRpm >= 4000 && maxRpm <= 12000) score += 20;
    if (maxTorque >= 50 && maxTorque <= 2000) score += 20;

    const mostlyIncreasing = rpmValues.slice(1).filter(function (rpm, index) {
      return rpm >= rpmValues[index];
    }).length;

    if (mostlyIncreasing >= rpmValues.length - 2) score += 20;

    return score;
  }

  function findTorqueCurveInJson(value) {
    const candidates = [];

    function visit(currentValue, path) {
      if (typeof currentValue === 'string') {
        const parsedText = parseLut(currentValue);

        if (isPlausibleTorqueCurve(parsedText.points)) {
          candidates.push({
            path: path,
            points: parsedText.points,
            score: scoreCurveCandidate(path, parsedText.points) + 30,
            format: parsedText.likelyFormat,
          });
        }

        return;
      }

      const normalizedArray = normalizeArrayCurve(currentValue, path);

      if (normalizedArray) {
        candidates.push({
          path: path,
          points: normalizedArray,
          score: scoreCurveCandidate(path, normalizedArray),
          format: 'json-array',
        });
      }

      if (!currentValue || typeof currentValue !== 'object') return;

      Object.keys(currentValue).forEach(function (key) {
        visit(currentValue[key], path.concat(key));
      });
    }

    visit(value, []);
    candidates.sort(function (a, b) {
      return b.score - a.score;
    });

    return candidates[0] || null;
  }

  function extractTorqueCurveFromFileText(text, fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const trimmed = text.trim();

    if (
      extension === 'json' ||
      trimmed.startsWith('{') ||
      trimmed.startsWith('[')
    ) {
      try {
        const json = JSON.parse(text);
        const candidate = findTorqueCurveInJson(json);

        if (candidate) {
          return {
            points: makeImportedPoints(candidate.points),
            source: candidate.path.length
              ? candidate.path.join('.')
              : 'JSON root',
            format: candidate.format || 'json-array',
          };
        }
      } catch (error) {
        // Fall back to raw LUT parsing below.
      }
    }

    const parsedText = parseLut(text);

    if (isPlausibleTorqueCurve(parsedText.points)) {
      return {
        points: makeImportedPoints(parsedText.points),
        source: 'raw text / LUT',
        format: parsedText.likelyFormat || 'rpm-pipe-torque',
      };
    }

    return null;
  }

  function importTorqueCurveFromText(text, fileName) {
    const result = extractTorqueCurveFromFileText(text, fileName);

    if (!result || !result.points.length) {
      if (importStatus) {
        importStatus.textContent =
          'Could not find a usable torque curve in "' + fileName + '".';
        importStatus.classList.add('has-warning');
      }

      return;
    }

    curvePoints = result.points;
    selectedPointId = null;
    selectedPointResetSnapshot = null;
    lastImportedFormat = result.format || 'rpm-pipe-torque';

    writePointsToTextarea();
    readTextareaAndRender({ preserveLastImportedFormat: true });

    if (importStatus) {
      importStatus.textContent =
        'Imported ' +
        result.points.length +
        ' points from "' +
        fileName +
        '" using ' +
        result.source +
        '. Input torque assumption: ' +
        getInputTorqueUnitLabel() +
        '.';
      importStatus.classList.remove('has-warning');
    }
  }

  function importTorqueCurveFile(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (event) {
      importTorqueCurveFromText(event.target.result, file.name);
    };

    reader.onerror = function () {
      if (importStatus) {
        importStatus.textContent = 'Could not read "' + file.name + '".';
        importStatus.classList.add('has-warning');
      }
    };

    reader.readAsText(file);
  }

  function getInputTorqueUnitLabel() {
    const selected = getInputTorqueUnit();
    return selected === 'auto'
      ? 'auto / explicit units / Nm fallback'
      : getTorqueUnitLabel(selected);
  }

  function setInputTorqueUnitSilently(unit) {
    if (!inputTorqueUnitSelect) return;

    if (unit === 'auto' || TORQUE_UNITS[unit]) {
      inputTorqueUnitSelect.value = unit;
    }
  }

  function formatNumber(value, decimals) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return '';
    }

    if (decimals <= 0) {
      return String(Math.round(number));
    }

    return number
      .toFixed(decimals)
      .replace(/(\.\d*?)0+$/, '$1')
      .replace(/\.$/, '');
  }

  function formatPoint(point) {
    const rpm = formatNumber(point.rpm, 0);
    const torque = formatNumber(point.torque, 1);
    return rpm + '|' + torque;
  }

  function writePointsToTextarea() {
    isProgrammaticTextareaUpdate = true;
    textarea.value = curvePoints.map(formatPoint).join('\n');
    isProgrammaticTextareaUpdate = false;

    // The editor writes the textarea in canonical RPM|Nm format.
    // Reset the input assumption so future parses do not reinterpret canonical Nm as another unit.
    setInputTorqueUnitSilently('auto');
  }

  function getSortedCurvePoints() {
    return curvePoints.slice().sort(function (a, b) {
      return a.rpm - b.rpm;
    });
  }

  function getCrashdayInterpolationPoints() {
    const points = getSortedCurvePoints();

    if (!points.length) {
      return [{ rpm: 0, torque: 0 }];
    }

    if (points[0].rpm > 0) {
      return [{ rpm: 0, torque: 0 }].concat(points);
    }

    return points;
  }

  function getInterpolatedTorqueNmAtRpm(targetRpm) {
    const points = getCrashdayInterpolationPoints();

    if (!points.length) return 0;

    if (targetRpm <= points[0].rpm) {
      return points[0].torque;
    }

    if (targetRpm >= points[points.length - 1].rpm) {
      return points[points.length - 1].torque;
    }

    for (let index = 0; index < points.length - 1; index += 1) {
      const left = points[index];
      const right = points[index + 1];

      if (targetRpm === left.rpm) {
        return left.torque;
      }

      if (targetRpm === right.rpm) {
        return right.torque;
      }

      if (targetRpm > left.rpm && targetRpm < right.rpm) {
        const span = right.rpm - left.rpm;

        if (span <= 0) {
          return left.torque;
        }

        const ratio = (targetRpm - left.rpm) / span;
        return left.torque + (right.torque - left.torque) * ratio;
      }
    }

    return 0;
  }

  function getCrashdayMaxRpm() {
    const points = getSortedCurvePoints();

    if (!points.length) return 0;

    const highestRpm = Math.max.apply(
      null,
      points.map(function (point) {
        return point.rpm;
      }),
    );

    return Math.max(0, Math.floor(highestRpm / 1000) * 1000);
  }

  function makeCrashdayOutputPoints() {
    const maxRpm = getCrashdayMaxRpm();
    const outputPoints = [];

    for (let rpm = 0; rpm <= maxRpm; rpm += 1000) {
      outputPoints.push({
        rpm: rpm,
        torque: getInterpolatedTorqueNmAtRpm(rpm),
      });
    }

    return outputPoints;
  }

  function formatOutputTorque(torqueNm, unitKey) {
    const value = convertTorqueFromNm(torqueNm, unitKey);
    return formatNumber(value, getTorqueUnitDecimals(unitKey));
  }

  function getOutputPointsForFormat(format) {
    return format === 'torque-hash-rpm'
      ? makeCrashdayOutputPoints()
      : getSortedCurvePoints();
  }

  function formatOutputCurve() {
    const format = resolveOutputFormat();
    const torqueUnit = getOutputTorqueUnit();
    const outputPoints = getOutputPointsForFormat(format);

    if (format === 'torque-hash-rpm') {
      return outputPoints
        .map(function (point) {
          return (
            formatOutputTorque(point.torque, torqueUnit) +
            ' # RPM = ' +
            formatNumber(point.rpm, 0)
          );
        })
        .join('\n');
    }

    if (format === 'rpm-hash-torque') {
      return outputPoints
        .map(function (point) {
          return (
            formatNumber(point.rpm, 0) +
            ' # ' +
            formatOutputTorque(point.torque, torqueUnit)
          );
        })
        .join('\n');
    }

    if (format === 'csv') {
      return outputPoints
        .map(function (point) {
          return (
            formatNumber(point.rpm, 0) +
            ',' +
            formatOutputTorque(point.torque, torqueUnit)
          );
        })
        .join('\n');
    }

    if (format === 'beamng-jbeam') {
      const rows = outputPoints.map(function (point) {
        return (
          '    [' +
          formatNumber(point.rpm, 0) +
          ', ' +
          formatOutputTorque(point.torque, torqueUnit) +
          ']'
        );
      });

      return (
        '"torque": [\n' +
        '    ["rpm", "torque"],\n' +
        rows.join(',\n') +
        '\n' +
        '  ]'
      );
    }

    if (format === 'json-array') {
      return JSON.stringify(
        outputPoints.map(function (point) {
          return [
            Number(formatNumber(point.rpm, 0)),
            Number(formatOutputTorque(point.torque, torqueUnit)),
          ];
        }),
      );
    }

    if (format === 'json-objects') {
      return JSON.stringify(
        outputPoints.map(function (point) {
          const object = {
            rpm: Number(formatNumber(point.rpm, 0)),
          };
          object[getTorqueUnitJsonKey(torqueUnit)] = Number(
            formatOutputTorque(point.torque, torqueUnit),
          );
          return object;
        }),
        null,
        2,
      );
    }

    return outputPoints
      .map(function (point) {
        return (
          formatNumber(point.rpm, 0) +
          '|' +
          formatOutputTorque(point.torque, torqueUnit)
        );
      })
      .join('\n');
  }

  function setOutputStatus(message, isWarning) {
    if (!outputStatus) return;

    outputStatus.textContent = message || '';
    outputStatus.classList.toggle('has-warning', !!isWarning);
  }

  function copyTextFallback(text) {
    const temporaryTextarea = document.createElement('textarea');
    temporaryTextarea.style.position = 'fixed';
    temporaryTextarea.style.top = '-9999px';
    temporaryTextarea.value = text;
    document.body.appendChild(temporaryTextarea);
    temporaryTextarea.focus();
    temporaryTextarea.select();

    try {
      document.execCommand('copy');
      setOutputStatus('Copied output to clipboard.');
    } catch (error) {
      setOutputStatus(
        'Could not copy automatically. Select and copy the output manually.',
        true,
      );
      window.prompt('Copy output:', text);
    } finally {
      document.body.removeChild(temporaryTextarea);
    }
  }

  function copyOutputToClipboard() {
    const output = formatOutputCurve();

    if (!output) {
      setOutputStatus('No curve points to copy.', true);
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(output)
        .then(function () {
          const format = resolveOutputFormat();
          const note =
            format === 'torque-hash-rpm'
              ? ' Copied Crashday output as a complete 1000-RPM grid.'
              : '';
          setOutputStatus('Copied output to clipboard.' + note);
        })
        .catch(function () {
          copyTextFallback(output);
        });
    } else {
      copyTextFallback(output);
    }
  }

  function getSelectedPoint() {
    return (
      curvePoints.find(function (point) {
        return point.id === selectedPointId;
      }) || null
    );
  }

  function updateSelectedPointLabel() {
    const point = getSelectedPoint();
    const torqueUnit = getTorqueDisplayUnit();
    const powerUnit = getPowerDisplayUnit();

    if (!point) {
      selectedPointLabel.textContent = 'No point selected';
      selectedPointLabel.classList.remove('is-active');
      return;
    }

    const torqueDisplay = convertTorqueFromNm(point.torque, torqueUnit);
    const powerDisplay = convertPowerFromBhp(
      AcMath.torqueNmToPowerBhp(point.torque, point.rpm),
      powerUnit,
    );

    selectedPointLabel.textContent =
      formatNumber(point.rpm, 0) +
      ' RPM · ' +
      formatNumber(torqueDisplay, getTorqueUnitDecimals(torqueUnit)) +
      ' ' +
      getTorqueUnitLabel(torqueUnit) +
      ' · ' +
      formatNumber(powerDisplay, getPowerUnitDecimals(powerUnit)) +
      ' ' +
      getPowerUnitLabel(powerUnit);

    selectedPointLabel.classList.add('is-active');
  }

  function getChartSeriesData() {
    const chartTheme = getChartTheme();
    const torqueUnit = getTorqueDisplayUnit();
    const powerUnit = getPowerDisplayUnit();

    return {
      torque: curvePoints.map(function (point) {
        return {
          x: point.rpm,
          y: convertTorqueFromNm(point.torque, torqueUnit),
          id: point.id,
          marker: {
            enabled: true,
            radius: point.id === selectedPointId ? 7 : 4,
            lineWidth: point.id === selectedPointId ? 3 : 1,
            lineColor:
              point.id === selectedPointId
                ? chartTheme.selectedRing
                : undefined,
          },
        };
      }),

      power: curvePoints.map(function (point) {
        return {
          x: point.rpm,
          y: convertPowerFromBhp(
            AcMath.torqueNmToPowerBhp(point.torque, point.rpm),
            powerUnit,
          ),
          linkedPointId: point.id,
          marker: {
            enabled: false,
          },
        };
      }),
    };
  }

  function getMaxY(points) {
    if (!Array.isArray(points) || !points.length) {
      return 0;
    }

    return Math.max.apply(
      null,
      points.map(function (point) {
        return Number(point.y) || 0;
      }),
    );
  }

  function getMaxX(points) {
    if (!Array.isArray(points) || !points.length) {
      return 0;
    }

    return Math.max.apply(
      null,
      points.map(function (point) {
        return Number(point.x) || 0;
      }),
    );
  }

  function getNiceTickStep(rawStep) {
    if (!Number.isFinite(rawStep) || rawStep <= 0) {
      return 1;
    }

    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;

    if (normalized <= 1) return 1 * magnitude;
    if (normalized <= 2) return 2 * magnitude;
    if (normalized <= 2.5) return 2.5 * magnitude;
    if (normalized <= 5) return 5 * magnitude;

    return 10 * magnitude;
  }

  function getNiceAxisMax(value) {
    if (!Number.isFinite(value) || value <= 0) {
      return 10;
    }

    const paddedValue = value * 1.04;
    const tickStep = getNiceTickStep(paddedValue / 5);

    return Math.ceil(paddedValue / tickStep) * tickStep;
  }

  function getNiceRpmAxisMax(value) {
    if (!Number.isFinite(value) || value <= 0) {
      return 1000;
    }

    return Math.ceil(value / 1000) * 1000;
  }

  function getStableAxisMaxes(seriesData) {
    const data = seriesData || getChartSeriesData();

    return {
      rpm: getNiceRpmAxisMax(getMaxX(data.torque)),
      torque: getNiceAxisMax(getMaxY(data.torque)),
      power: getNiceAxisMax(getMaxY(data.power)),
    };
  }

  function applyStableAxisExtremes(seriesData) {
    if (!chart || axisFreezeState) {
      return;
    }

    const axisMaxes = getStableAxisMaxes(seriesData);

    chart.xAxis[0].setExtremes(0, axisMaxes.rpm, false, false);
    chart.yAxis[0].setExtremes(0, axisMaxes.torque, false, false);

    if (chart.yAxis[1]) {
      chart.yAxis[1].setExtremes(0, axisMaxes.power, false, false);
    }
  }

  function updateSeriesOnly() {
    if (!chart) return;

    const data = getChartSeriesData();

    chart.series[0].setData(data.torque, false, false, false);
    chart.series[1].setData(data.power, false, false, false);

    applyStableAxisExtremes(data);

    chart.redraw(false);
    updateSelectedPointLabel();
  }

  function focusChartForKeyboard() {
    if (!chart || !chart.container) return;

    chart.container.setAttribute('tabindex', '0');

    setTimeout(function () {
      chart.container.focus({ preventScroll: true });
    }, 0);
  }

  function setSelectedPoint(id) {
    const isNewSelection = selectedPointId !== id;
    selectedPointId = id;

    const point = getSelectedPoint();

    if (
      point &&
      (isNewSelection ||
        !selectedPointResetSnapshot ||
        selectedPointResetSnapshot.id !== point.id)
    ) {
      selectedPointResetSnapshot = {
        id: point.id,
        rpm: point.rpm,
        torque: point.torque,
      };
    }

    updateSeriesOnly();
    focusChartForKeyboard();
  }

  function clampPoint(point) {
    point.rpm = Math.max(0, point.rpm);
    point.torque = Math.max(0, point.torque);
  }

  function sortPointsKeepSelection() {
    curvePoints.sort(function (a, b) {
      return a.rpm - b.rpm;
    });
  }

  function updatePointById(id, newRpm, newTorqueNm, options) {
    const point = curvePoints.find(function (pointItem) {
      return pointItem.id === id;
    });

    if (!point) return;

    point.rpm = newRpm;
    point.torque = newTorqueNm;

    clampPoint(point);
    sortPointsKeepSelection();

    if (!options || options.writeTextarea !== false) {
      writePointsToTextarea();
    }

    updateSeriesOnly();
  }

  function readTextareaAndRender(options) {
    const parsed = parseLut(textarea.value);
    curvePoints = parsed.points;

    if (!options || !options.preserveLastImportedFormat) {
      lastImportedFormat = parsed.likelyFormat || 'rpm-pipe-torque';
    }

    if (
      !curvePoints.some(function (point) {
        return point.id === selectedPointId;
      })
    ) {
      selectedPointId = null;
      selectedPointResetSnapshot = null;
    }

    const inputUnitLabel = getInputTorqueUnitLabel();

    if (parsed.invalidLines.length) {
      parseStatus.textContent =
        'Parsed ' +
        curvePoints.length +
        ' points. Input torque: ' +
        inputUnitLabel +
        '. Ignored invalid line(s): ' +
        parsed.invalidLines.join(', ') +
        '.';
      parseStatus.classList.add('has-warning');
    } else {
      parseStatus.textContent =
        'Parsed ' +
        curvePoints.length +
        ' points. Input torque: ' +
        inputUnitLabel +
        '.';
      parseStatus.classList.remove('has-warning');
    }

    renderGraph();
  }

  function renderGraph() {
    const data = getChartSeriesData();
    const axisMaxes = getStableAxisMaxes(data);
    const chartTheme = getChartTheme();
    const torqueUnit = getTorqueDisplayUnit();
    const powerUnit = getPowerDisplayUnit();
    const torqueLabel = getTorqueUnitLabel(torqueUnit);
    const powerLabel = getPowerUnitLabel(powerUnit);
    const curveType = getCurveMode();

    if (chart) {
      chart.destroy();
    }

    chart = Highcharts.chart('result-torque', {
      accessibility: {
        enabled: false,
      },

      chart: {
        type: curveType,
        alignTicks: false,
        backgroundColor: 'transparent',
        animation: false,
        spacing: [18, 18, 18, 18],
        style: {
          fontFamily:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          color: chartTheme.text,
        },
      },

      credits: {
        enabled: false,
      },

      title: {
        text: '',
      },

      legend: {
        itemStyle: {
          color: chartTheme.text,
          fontWeight: '700',
        },
        itemHoverStyle: {
          color: chartTheme.text,
        },
      },

      xAxis: {
        min: 0,
        max: axisMaxes.rpm,
        title: {
          text: 'RPM',
          style: {
            color: chartTheme.muted,
            fontWeight: '700',
          },
        },
        startOnTick: false,
        endOnTick: false,
        tickAmount: 6,
        gridLineWidth: 1,
        gridLineColor: chartTheme.grid,
        lineColor: chartTheme.grid,
        tickColor: chartTheme.grid,
        labels: {
          style: {
            color: chartTheme.muted,
          },
        },
      },

      yAxis: [
        {
          title: {
            text: 'Torque (' + torqueLabel + ')',
            style: {
              color: chartTheme.muted,
              fontWeight: '700',
            },
          },
          min: 0,
          max: axisMaxes.torque,
          startOnTick: false,
          endOnTick: false,
          tickAmount: 6,
          gridLineColor: chartTheme.grid,
          labels: {
            format: '{value} ' + torqueLabel,
            style: {
              color: chartTheme.muted,
            },
          },
        },
        {
          title: {
            text: 'Power (' + powerLabel + ')',
            style: {
              color: chartTheme.muted,
              fontWeight: '700',
            },
          },
          min: 0,
          max: axisMaxes.power,
          startOnTick: false,
          endOnTick: false,
          tickAmount: 6,
          gridLineColor: chartTheme.grid,
          labels: {
            format: '{value} ' + powerLabel,
            style: {
              color: chartTheme.muted,
            },
          },
          opposite: true,
        },
      ],

      tooltip: {
        shared: true,
        backgroundColor: chartTheme.tooltipBg,
        borderColor: chartTheme.tooltipBorder,
        borderRadius: 12,
        shadow: false,
        style: {
          color: chartTheme.text,
        },
        headerFormat: 'RPM: <b>{point.x:.0f}</b><br>',
        pointFormat:
          '<span style="color:{point.color}">●</span> {series.name}: ' +
          '<b>{point.y:.2f}</b> {series.tooltipOptions.valueSuffix}<br>',
      },

      plotOptions: {
        series: {
          animation: false,
          lineWidth: 3,
          states: {
            inactive: {
              opacity: 1,
            },
          },
        },

        line: {
          marker: {
            enabled: true,
            symbol: 'circle',
          },
        },

        spline: {
          marker: {
            enabled: true,
            symbol: 'circle',
          },
        },
      },

      series: [
        {
          name: 'Torque',
          type: curveType,
          color: chartTheme.torque,
          data: data.torque,
          tooltip: {
            valueSuffix: torqueLabel,
          },
          point: {
            events: {
              click: function () {
                setSelectedPoint(this.options.id);
              },
            },
          },
        },
        {
          name: 'Power',
          type: curveType,
          color: chartTheme.power,
          yAxis: 1,
          data: data.power,
          tooltip: {
            valueSuffix: powerLabel,
          },
          enableMouseTracking: true,
          marker: {
            enabled: false,
          },
        },
      ],
    });

    if (chart && chart.container) {
      chart.container.setAttribute('tabindex', '0');
    }

    installChartMouseHandlers();
    updateSelectedPointLabel();
  }

  function getPointerValues(event) {
    const normalized = chart.pointer.normalize(event);
    const rpm = chart.xAxis[0].toValue(normalized.chartX, true);
    const torqueDisplay = chart.yAxis[0].toValue(normalized.chartY, true);

    return { rpm: rpm, torqueDisplay: torqueDisplay };
  }

  function roundToStep(value, step) {
    return Math.round(value / step) * step;
  }

  function clampValue(value, min, max) {
    if (!Number.isFinite(value)) return min;
    if (Number.isFinite(min) && value < min) return min;
    if (Number.isFinite(max) && value > max) return max;
    return value;
  }

  function freezeAxesForEdit() {
    if (!chart || axisFreezeState) return;

    axisFreezeState = {
      xMin: chart.xAxis[0].min,
      xMax: chart.xAxis[0].max,
      torqueMin: chart.yAxis[0].min,
      torqueMax: chart.yAxis[0].max,
      powerMin: chart.yAxis[1] ? chart.yAxis[1].min : null,
      powerMax: chart.yAxis[1] ? chart.yAxis[1].max : null,
    };

    chart.xAxis[0].setExtremes(
      axisFreezeState.xMin,
      axisFreezeState.xMax,
      false,
      false,
    );
    chart.yAxis[0].setExtremes(
      axisFreezeState.torqueMin,
      axisFreezeState.torqueMax,
      false,
      false,
    );

    if (chart.yAxis[1]) {
      chart.yAxis[1].setExtremes(
        axisFreezeState.powerMin,
        axisFreezeState.powerMax,
        false,
        false,
      );
    }

    chart.redraw(false);
  }

  function releaseAxesAfterEdit() {
    if (!chart) {
      axisFreezeState = null;
      return;
    }

    axisFreezeState = null;

    // Do not release back to Highcharts auto-scaling.
    // Re-apply our own stable, rounded axis limits so the graph does not jump
    // between a nice rounded max and a tighter raw max after clicks/edits.
    applyStableAxisExtremes();
    chart.redraw(false);
  }

  function clampPointToFrozenAxes(rpm, torqueDisplay) {
    if (!axisFreezeState) {
      return {
        rpm: rpm,
        torqueDisplay: torqueDisplay,
      };
    }

    return {
      rpm: clampValue(rpm, axisFreezeState.xMin, axisFreezeState.xMax),
      torqueDisplay: clampValue(
        torqueDisplay,
        axisFreezeState.torqueMin,
        axisFreezeState.torqueMax,
      ),
    };
  }

  function getNearestTorquePoint(event, maxDistancePx) {
    if (!chart || !chart.series || !chart.series[0]) return null;

    maxDistancePx = maxDistancePx || 18;

    const normalized = chart.pointer.normalize(event);
    let bestPoint = null;
    let bestDistance = maxDistancePx;

    chart.series[0].points.forEach(function (highchartsPoint) {
      if (
        typeof highchartsPoint.plotX !== 'number' ||
        typeof highchartsPoint.plotY !== 'number'
      ) {
        return;
      }

      const pointScreenX = chart.plotLeft + highchartsPoint.plotX;
      const pointScreenY = chart.plotTop + highchartsPoint.plotY;

      const dx = normalized.chartX - pointScreenX;
      const dy = normalized.chartY - pointScreenY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= bestDistance) {
        bestDistance = distance;
        bestPoint = highchartsPoint;
      }
    });

    return bestPoint;
  }

  function installChartMouseHandlers() {
    if (!chart || !chart.container) return;

    chart.container.addEventListener('mousedown', function (event) {
      const highchartsPoint = getNearestTorquePoint(event);

      if (!highchartsPoint) return;

      event.preventDefault();
      startDraggingPoint(highchartsPoint, event);
    });

    chart.container.addEventListener('mousemove', function (event) {
      if (dragState) {
        chart.container.style.cursor = 'grabbing';
        return;
      }

      const highchartsPoint = getNearestTorquePoint(event);
      chart.container.style.cursor = highchartsPoint ? 'grab' : 'default';
    });
  }

  function startDraggingPoint(highchartsPoint, event) {
    const pointId = highchartsPoint.options.id;
    const point = curvePoints.find(function (pointItem) {
      return pointItem.id === pointId;
    });

    if (!point) return;

    setSelectedPoint(point.id);
    freezeAxesForEdit();

    const pointerValues = getPointerValues(event);
    const torqueUnit = getTorqueDisplayUnit();

    dragState = {
      id: point.id,
      startMouseRpm: pointerValues.rpm,
      startMouseTorqueDisplay: pointerValues.torqueDisplay,
      startPointRpm: point.rpm,
      startPointTorqueDisplay: convertTorqueFromNm(point.torque, torqueUnit),
      torqueUnit: torqueUnit,
      changed: false,
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', stopDraggingPoint);
  }

  function getMouseDragMode(event) {
    if (event.altKey) return 'rpm';
    if (event.shiftKey) return 'free';
    return 'torque';
  }

  function handleDragMove(event) {
    if (!dragState || !chart) return;

    event.preventDefault();

    const pointerValues = getPointerValues(event);

    let deltaRpm = pointerValues.rpm - dragState.startMouseRpm;
    let deltaTorqueDisplay =
      pointerValues.torqueDisplay - dragState.startMouseTorqueDisplay;

    const mode = getMouseDragMode(event);

    if (mode === 'torque') {
      deltaRpm = 0;
    }

    if (mode === 'rpm') {
      deltaTorqueDisplay = 0;
    }

    let newRpm = roundToStep(dragState.startPointRpm + deltaRpm, 1);
    let newTorqueDisplay = roundToStep(
      dragState.startPointTorqueDisplay + deltaTorqueDisplay,
      0.1,
    );

    const clampedPoint = clampPointToFrozenAxes(newRpm, newTorqueDisplay);

    newRpm = roundToStep(clampedPoint.rpm, 1);
    newTorqueDisplay = roundToStep(clampedPoint.torqueDisplay, 0.1);

    updatePointById(
      dragState.id,
      newRpm,
      convertTorqueToNm(newTorqueDisplay, dragState.torqueUnit),
      {
        writeTextarea: false,
      },
    );

    dragState.changed = true;
  }

  function stopDraggingPoint() {
    const changed = dragState && dragState.changed;

    dragState = null;

    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', stopDraggingPoint);

    if (chart && chart.container) {
      chart.container.style.cursor = 'default';
    }

    if (changed) {
      writePointsToTextarea();
    }

    releaseAxesAfterEdit();
    updateSeriesOnly();
  }

  function getKeyboardStepMultiplier(event) {
    if (event.shiftKey) return 10;
    if (event.ctrlKey || event.metaKey) return 5;
    if (event.altKey) return 0.1;
    return 1;
  }

  function isTypingTarget(target) {
    if (!target) return false;

    const tagName = target.tagName;

    return (
      tagName === 'TEXTAREA' ||
      tagName === 'INPUT' ||
      tagName === 'SELECT' ||
      target.isContentEditable
    );
  }

  function stopDragWithoutWriting() {
    dragState = null;

    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', stopDraggingPoint);

    if (chart && chart.container) {
      chart.container.style.cursor = 'default';
    }

    releaseAxesAfterEdit();
  }

  function resetSelectedPointToSelectionStart() {
    const point = getSelectedPoint();

    if (
      !point ||
      !selectedPointResetSnapshot ||
      selectedPointResetSnapshot.id !== point.id
    ) {
      return false;
    }

    stopDragWithoutWriting();

    updatePointById(
      point.id,
      selectedPointResetSnapshot.rpm,
      selectedPointResetSnapshot.torque,
      {
        writeTextarea: true,
      },
    );

    focusChartForKeyboard();

    return true;
  }

  function handleKeyboardNudge(event) {
    if (isTypingTarget(event.target)) return;

    const point = getSelectedPoint();

    if (event.key === 'Escape') {
      if (point && resetSelectedPointToSelectionStart()) {
        event.preventDefault();
        event.stopPropagation();
      }

      return;
    }

    if (!point) return;

    const arrowKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!arrowKeys.includes(event.key)) return;

    event.preventDefault();
    event.stopPropagation();

    freezeAxesForEdit();
    keyboardAxisFreezeActive = true;

    const torqueUnit = getTorqueDisplayUnit();
    const multiplier = getKeyboardStepMultiplier(event);
    const rpmStep = 100 * multiplier;
    const torqueStep = 1 * multiplier;

    let newRpm = point.rpm;
    let newTorqueDisplay = convertTorqueFromNm(point.torque, torqueUnit);

    if (event.key === 'ArrowLeft') {
      newRpm -= rpmStep;
    }

    if (event.key === 'ArrowRight') {
      newRpm += rpmStep;
    }

    if (event.key === 'ArrowUp') {
      newTorqueDisplay += torqueStep;
    }

    if (event.key === 'ArrowDown') {
      newTorqueDisplay -= torqueStep;
    }

    newRpm = roundToStep(newRpm, 1);
    newTorqueDisplay = roundToStep(newTorqueDisplay, 0.1);

    const clampedPoint = clampPointToFrozenAxes(newRpm, newTorqueDisplay);

    newRpm = roundToStep(clampedPoint.rpm, 1);
    newTorqueDisplay = roundToStep(clampedPoint.torqueDisplay, 0.1);

    updatePointById(
      point.id,
      newRpm,
      convertTorqueToNm(newTorqueDisplay, torqueUnit),
      {
        writeTextarea: true,
      },
    );

    focusChartForKeyboard();
  }

  function handleKeyboardNudgeRelease(event) {
    const arrowKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

    if (!keyboardAxisFreezeActive || !arrowKeys.includes(event.key)) {
      return;
    }

    keyboardAxisFreezeActive = false;

    releaseAxesAfterEdit();
    updateSeriesOnly();
    focusChartForKeyboard();
  }

  textarea.addEventListener('input', function () {
    if (!isProgrammaticTextareaUpdate) {
      readTextareaAndRender();
      setOutputStatus('');
    }
  });

  textarea.addEventListener('dragover', function (event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  });

  textarea.addEventListener('drop', function (event) {
    event.preventDefault();

    const file = event.dataTransfer.files[0];
    if (!file) return;

    importTorqueCurveFile(file);
  });

  if (fileImport) {
    fileImport.addEventListener('change', function (event) {
      const file = event.target.files && event.target.files[0];
      importTorqueCurveFile(file);
      event.target.value = '';
    });
  }

  window.addEventListener('keydown', handleKeyboardNudge, true);
  window.addEventListener('keyup', handleKeyboardNudgeRelease, true);

  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(function () {
      if (chart) {
        window.requestAnimationFrame(function () {
          chart.reflow();
        });
      }
    });

    resizeObserver.observe(graphElement);
  } else {
    window.addEventListener('resize', function () {
      if (chart) {
        chart.reflow();
      }
    });
  }

  setupThemeToggle();
  setupControls();
  readTextareaAndRender();
}

function startAppWhenReady() {
  if (typeof Highcharts !== 'undefined') {
    main();
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://code.highcharts.com/highcharts.js';

  script.onload = function () {
    main();
  };

  script.onerror = function () {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<div style="background:#ffdddd;color:#111;padding:10px;font-weight:bold;">Failed to load Highcharts.</div>',
    );
  };

  document.head.appendChild(script);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startAppWhenReady);
} else {
  startAppWhenReady();
}
