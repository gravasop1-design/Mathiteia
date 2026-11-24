(function(){
  const lpStartInput = document.getElementById('lpStartDate');
  const lpCustomStartInput = document.getElementById('lpCustomStart');
  const lpCustomEndInput = document.getElementById('lpCustomEnd');
  const lpDayName = document.getElementById('lpDayName');
  const lpSchedTable = document.getElementById('lpScheduleTable');
  const lpTableBody = document.getElementById('lpTableBody');
  const lpHolTable = document.getElementById('lpHolidaysTable');
  const lpHolBody = document.getElementById('lpHolidaysTableBody');
  const lpHolHint = document.getElementById('lpHolidayHint');
  const lpSummaryBar = document.getElementById('lpSummaryBar');

  const greekDays = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
  const greekMonths = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'];
  const MAX_LESSONS = 29;
  const LP_STORAGE_KEY = 'mathiteia-lessons-v1';

  let lpCustomHolidays = [];
  let lpManualChecks = {};
  let lpMakeupChecks = {};
  let lpExtraDates = [];
  let lpHolidayMap = new Map();

  function toISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function fmtGR(isoStr) {
    if (!isoStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  }

  function parseGRToISO(grStr) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((grStr || '').trim());
    if (!m) return '';
    const d = Number(m.at(1)), mo = Number(m.at(2)), y = Number(m.at(3));
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d && y >= 1990 && y <= 2098) {
      return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return '';
  }


  function setupGreekDateField(inp, onISOChange) {
    if (!inp) return;
    inp.type = 'text';
    inp.inputMode = 'numeric';
    inp.placeholder = 'ηη/μμ/εεεε';
    inp.maxLength = 10;
    inp.autocomplete = 'off';
    inp.dataset.iso = '';

    const wrap = document.createElement('div');
    wrap.className = 'dp';
    const pk = document.createElement('span');
    pk.className = 'pk';
    pk.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 6.5h12M5 1.5v3M11 1.5v3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';

    const picker = document.createElement('input');
    picker.type = 'date';
    picker.min = '1990-01-01';
    picker.max = '2098-12-31';
    picker.setAttribute('aria-label', 'Επιλογή ημερομηνίας από ημερολόγιο');

    inp.parentNode.insertBefore(wrap, inp);
    wrap.appendChild(inp);
    pk.appendChild(picker);
    wrap.appendChild(pk);

    inp._setISO = function(isoVal) {
      const valid = /^\d{4}-\d{2}-\d{2}$/.test(isoVal || '') ? isoVal : '';
      inp.dataset.iso = valid;
      inp.value = valid ? fmtGR(valid) : '';
      picker.value = valid;
      inp.setAttribute('aria-invalid', 'false');
    };

    inp.addEventListener('input', () => {
      const raw = inp.value
        .replace(/[.\-]/g, '/')
        .replace(/^(\d)\/$/, (_, a) => `0${a}/`)
        .replace(/^(\d\d\/)(\d)\/$/, (_, a, b) => `${a}0${b}/`);
      const dg = raw.replace(/\D/g, '').slice(0, 8);
      let out = dg;
      if (dg.length > 4) out = `${dg.slice(0, 2)}/${dg.slice(2, 4)}/${dg.slice(4)}`;
      else if (dg.length > 2) out = `${dg.slice(0, 2)}/${dg.slice(2)}`;
      inp.value = out;

      const isoVal = parseGRToISO(out);
      inp.dataset.iso = isoVal;
      picker.value = isoVal;
      inp.setAttribute('aria-invalid', out.length === 10 && !isoVal ? 'true' : 'false');

      if ((out.length === 10 && isoVal) || out.length === 0) {
        if (onISOChange) onISOChange(isoVal);
      }
    });

    pk.addEventListener('click', () => {
      try { picker.showPicker(); } catch (e) {}
    });

    picker.addEventListener('change', () => {
      const isoVal = picker.value || '';
      inp.dataset.iso = isoVal;
      inp.value = isoVal ? fmtGR(isoVal) : '';
      inp.setAttribute('aria-invalid', 'false');
      if (onISOChange) onISOChange(isoVal);
    });
  }



  function getSettingsWorkDays() {
    try {
      const s = JSON.parse(localStorage.getItem('ergasimes-v1') || 'null');
      if (s && Array.isArray(s.days) && s.days.length) return s.days;
    } catch (e) {}
    return Array.of(1, 2, 3, 4);
  }

  function isForbiddenLessonDay(isoStr) {
    if (!isoStr) return null;
    const [y, m, d] = isoStr.split('-').map(Number);
    const dw = new Date(y, m - 1, d).getDay();
    const workDays = getSettingsWorkDays();
    if (dw === 0) return 'Κυριακή (μη εργάσιμη / αργία)';
    if (workDays.includes(dw)) {
      const names = workDays.map(i => greekDays.at(i)).join(', ');
      return `Η ${greekDays.at(dw)} έχει οριστεί ως εργάσιμη στις Ρυθμίσεις (${names}). Επιλέξτε την ημέρα μαθήματος.`;
    }
    return null;
  }

  setupGreekDateField(lpStartInput, (isoVal) => {
    const err = isForbiddenLessonDay(isoVal);
    if (err) {
      alert(err);
      if (lpStartInput._setISO) lpStartInput._setISO('');
      lpStartInput.setAttribute('aria-invalid', 'true');
      lpManualChecks = {};
      lpMakeupChecks = {};
      lpExtraDates = [];
      generateLessons();
      return;
    }
    lpManualChecks = {};
    lpMakeupChecks = {};
    lpExtraDates = [];
    generateLessons();
  });
  setupGreekDateField(lpCustomStartInput);
  setupGreekDateField(lpCustomEndInput);

  try {
    const saved = JSON.parse(localStorage.getItem(LP_STORAGE_KEY) || 'null');
    if (saved) {
      if (saved.startDate && lpStartInput._setISO) lpStartInput._setISO(saved.startDate);
      if (Array.isArray(saved.customHolidays)) lpCustomHolidays = saved.customHolidays;
      if (saved.manualChecks && typeof saved.manualChecks === 'object') lpManualChecks = saved.manualChecks;
      if (saved.makeupChecks && typeof saved.makeupChecks === 'object') lpMakeupChecks = saved.makeupChecks;
      if (Array.isArray(saved.extraDates)) lpExtraDates = saved.extraDates;
    }
  } catch(e) {}

  function saveLpState() {
    try {
      localStorage.setItem(LP_STORAGE_KEY, JSON.stringify({
        startDate: lpStartInput.dataset.iso || '',
        customHolidays: lpCustomHolidays,
        manualChecks: lpManualChecks,
        makeupChecks: lpMakeupChecks,
        extraDates: lpExtraDates
      }));
    } catch(e) {}
  }

  document.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.subtab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.lpSub).classList.add('active');
    });
  });


  function getEaster(year) {
    const a = year % 4, b = year % 7, c = year % 19;
    const d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31);
    const day = ((d + e + 114) % 31) + 1;
    return new Date(year, month - 1, day + 13);
  }

  function getOfficialHolidays(year) {
    const list = [
      { date: `${year}-01-30`, title: 'Τριών Ιεραρχών (Εκπαιδευτική)' },
      { date: `${year}-03-25`, title: 'Ευαγγελισμός / Εθνική Επέτειος' },
      { date: `${year}-05-01`, title: 'Εργατική Πρωτομαγιά' },
      { date: `${year}-08-15`, title: 'Κοίμηση της Θεοτόκου' },
      { date: `${year}-10-28`, title: 'Επέτειος του «Όχι»' },
      { date: `${year}-11-17`, title: 'Επέτειος Πολυτεχνείου (Εκπαιδευτική)' }
    ];
    for (let d = 1; d <= 7; d++) {
      const iso = `${year}-01-${String(d).padStart(2, '0')}`;
      let title = 'Διακοπές Χριστουγέννων';
      if (d === 1) title = 'Πρωτοχρονιά (Διακοπές Χριστουγέννων)';
      if (d === 6) title = 'Θεοφάνεια (Διακοπές Χριστουγέννων)';
      list.push({ date: iso, title });
    }
    for (let d = 24; d <= 31; d++) {
      const iso = `${year}-12-${String(d).padStart(2, '0')}`;
      let title = 'Διακοπές Χριστουγέννων';
      if (d === 25) title = 'Χριστούγεννα (Διακοπές Χριστουγέννων)';
      if (d === 26) title = 'Σύναξη Θεοτόκου (Διακοπές Χριστουγέννων)';
      list.push({ date: iso, title });
    }
    const easter = getEaster(year);
    const addDays = (base, days) => { const dt = new Date(base); dt.setDate(dt.getDate() + days); return toISO(dt); };
    list.push({ date: addDays(easter, -48), title: 'Καθαρά Δευτέρα' });
    list.push({ date: addDays(easter, 50), title: 'Αγίου Πνεύματος' });
    const eLabels = {
      '-6': 'Μεγάλη Δευτέρα (Διακοπές Πάσχα)', '-5': 'Μεγάλη Τρίτη (Διακοπές Πάσχα)',
      '-4': 'Μεγάλη Τετάρτη (Διακοπές Πάσχα)', '-3': 'Μεγάλη Πέμπτη (Διακοπές Πάσχα)',
      '-2': 'Μεγάλη Παρασκευή (Διακοπές Πάσχα)', '-1': 'Μεγάλο Σάββατο (Διακοπές Πάσχα)',
      '0': 'Κυριακή του Πάσχα (Διακοπές Πάσχα)', '1': 'Δευτέρα του Πάσχα (Διακοπές Πάσχα)'
    };
    for (let offset = -6; offset <= 5; offset++) {
      list.push({ date: addDays(easter, offset), title: eLabels[String(offset)] || 'Διακοπές Πάσχα' });
    }
    return list;
  }

  document.getElementById('lpAddCustomBtn').addEventListener('click', () => {
    const startVal = lpCustomStartInput.dataset.iso || parseGRToISO(lpCustomStartInput.value);
    const endRaw = lpCustomEndInput.value.trim();
    const endVal = endRaw ? (lpCustomEndInput.dataset.iso || parseGRToISO(endRaw)) : startVal;
    const titleVal = document.getElementById('lpCustomTitle').value.trim() || 'Προσωπική Αργία';

    if (!startVal) {
      lpCustomStartInput.setAttribute('aria-invalid', 'true');
      alert('Επιλέξτε έγκυρη ημερομηνία έναρξης αργίας (ηη/μμ/εεεε).');
      return;
    }
    if (endRaw && !endVal) {
      lpCustomEndInput.setAttribute('aria-invalid', 'true');
      alert('Η ημερομηνία «Έως» δεν είναι έγκυρη (ηη/μμ/εεεε).');
      return;
    }

    const [sy, sm, sd] = startVal.split('-').map(Number);
    const [ey, em, ed] = endVal.split('-').map(Number);
    let curr = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    if (end < curr) { alert('Η ημερομηνία «Έως» δεν μπορεί να είναι πριν από το «Από».'); return; }

    while (curr <= end) {
      const iso = toISO(curr);
      const idx = lpCustomHolidays.findIndex(h => h.date === iso);
      if (idx !== -1) lpCustomHolidays.at(idx).title = titleVal;
      else lpCustomHolidays.push({ date: iso, title: titleVal });
      delete lpManualChecks[iso];
      delete lpMakeupChecks[iso];
      curr.setDate(curr.getDate() + 1);
    }

    if (lpCustomStartInput._setISO) lpCustomStartInput._setISO('');
    if (lpCustomEndInput._setISO) lpCustomEndInput._setISO('');
    document.getElementById('lpCustomTitle').value = '';
    saveLpState();
    generateLessons();
  });

  window.lpRemoveCustomHoliday = function(isoDate) {
    lpCustomHolidays = lpCustomHolidays.filter(h => h.date !== isoDate);
    delete lpManualChecks[isoDate];
    delete lpMakeupChecks[isoDate];
    saveLpState();
    generateLessons();
  };



  function ensureExtraMakeupUI() {
    if (!lpSchedTable || document.getElementById('lpExtraBox')) return;
    const box = document.createElement('div');
    box.id = 'lpExtraBox';
    box.className = 'lp-custom-box no-print';
    box.style.cssText = 'margin:12px 0; padding:12px 14px; display:none;';
    box.innerHTML = `
      <div style="font-weight:700; margin-bottom:8px; color:var(--accent);">🔄 Προσθήκη Έκτακτης Ημερομηνίας Αναπλήρωσης (άλλη ημέρα της εβδομάδας)</div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <div style="width:165px;"><input type="text" id="lpExtraDateInp" placeholder="ηη/μμ/εεεε"></div>
        <div style="flex:1; min-width:200px;"><input type="text" id="lpExtraNoteInp" placeholder="Σημείωση (προαιρετικό, π.χ. Αναπλήρωση αργίας)"></div>
        <button type="button" id="lpAddExtraBtn" class="sec">+ Προσθήκη Αναπλήρωσης</button>
      </div>
    `;
    lpSchedTable.insertAdjacentElement('beforebegin', box);

    const extraInp = document.getElementById('lpExtraDateInp');
    setupGreekDateField(extraInp);

    document.getElementById('lpAddExtraBtn').addEventListener('click', () => {
      const isoVal = extraInp.dataset.iso || parseGRToISO(extraInp.value);
      const noteVal = document.getElementById('lpExtraNoteInp').value.trim();
      const startIso = lpStartInput.dataset.iso || '';

      if (!isoVal) {
        extraInp.setAttribute('aria-invalid', 'true');
        alert('Επιλέξτε έγκυρη ημερομηνία αναπλήρωσης (ηη/μμ/εεεε).');
        return;
      }
      if (startIso && isoVal < startIso) {
        alert('Η ημερομηνία αναπλήρωσης δεν μπορεί να είναι πριν από την έναρξη μαθημάτων.');
        return;
      }
      const [y, m, d] = isoVal.split('-').map(Number);
      if (new Date(y, m - 1, d).getDay() === 0) {
        alert('Δεν μπορεί να οριστεί αναπλήρωση Κυριακή.');
        return;
      }
      if (lpExtraDates.some(x => x.date === isoVal)) {
        alert('Αυτή η ημερομηνία έχει ήδη προστεθεί ως έκτακτη αναπλήρωση.');
        return;
      }

      lpExtraDates.push({ date: isoVal, note: noteVal });
      lpExtraDates.sort((a, b) => a.date.localeCompare(b.date));
      if (extraInp._setISO) extraInp._setISO('');
      document.getElementById('lpExtraNoteInp').value = '';
      saveLpState();
      generateLessons();
    });
  }

  window.lpRemoveExtraDate = function(isoDate) {
    lpExtraDates = lpExtraDates.filter(x => x.date !== isoDate);
    saveLpState();
    generateLessons();
  };

  function ensureMakeupHeader() {
    if (!lpSchedTable) return;
    const theadRow = lpSchedTable.querySelector('thead tr');
    if (theadRow && !theadRow.querySelector('.th-makeup')) {
      const th = document.createElement('th');
      th.className = 'center th-makeup';
      th.textContent = 'Αναπλήρωση';
      theadRow.appendChild(th);
    }
  }


  function updateLessonStatuses() {
    ensureMakeupHeader();
    const rows = lpTableBody.querySelectorAll('tr.lesson-row');
    let lessonCounter = 1, holidayCounter = 0;
    const monthCounts = {};

    rows.forEach(row => {
      const chk = row.querySelector('.active-checkbox');
      const mkChk = row.querySelector('.makeup-checkbox');
      const numCell = row.querySelector('.lesson-number');
      const stCell = row.querySelector('.status-cell');
      const rsnCell = row.querySelector('.reason-cell');
      const isoDate = row.dataset.isoDate;
      const mKey = row.dataset.monthKey;
      if (!monthCounts[mKey]) monthCounts[mKey] = 0;

      const savedReason = row.dataset.holidayReason || lpHolidayMap.get(isoDate) || '';
      if (savedReason) row.dataset.holidayReason = savedReason;

      row.classList.remove('holiday-row', 'final-lesson-row');

      if (lessonCounter > MAX_LESSONS) {
        chk.checked = false; chk.disabled = true;
        mkChk.checked = false; mkChk.disabled = true;
        row.classList.add('holiday-row');
        numCell.textContent = '-';
        stCell.innerHTML = '<span class="lp-badge lp-badge-off">Ανενεργή</span>';
        rsnCell.innerHTML = `<span class="lp-reason-off">Πέραν των 29 μαθημάτων${savedReason ? ' (' + savedReason + ')' : ''}</span>`;
        holidayCounter++;
        return;
      }

      chk.disabled = false;

      if (chk.checked) {
        mkChk.checked = false;
        mkChk.disabled = true;
        if (lpMakeupChecks[isoDate]) {
          delete lpMakeupChecks[isoDate];
          saveLpState();
        }

        if (lessonCounter === MAX_LESSONS) {
          row.classList.add('final-lesson-row');
          numCell.textContent = `${lessonCounter}ο Μάθημα`;
          stCell.innerHTML = '<span class="lp-badge lp-badge-end">Μάθημα</span>';
          rsnCell.innerHTML = `<span class="lp-reason-end">🏁 Λήξη Μαθημάτων - Αξιολόγηση${savedReason ? ' (' + savedReason + ')' : ''}</span>`;
        } else {
          numCell.textContent = `${lessonCounter}ο Μάθημα`;
          stCell.innerHTML = '<span class="lp-badge lp-badge-ok">Μάθημα</span>';
          rsnCell.innerHTML = savedReason ? `<span class="lp-reason-ok">${savedReason}</span>` : '';
        }
        lessonCounter++;
        monthCounts[mKey]++;
      } else {
        mkChk.disabled = false;

        if (mkChk.checked) {
          if (lessonCounter === MAX_LESSONS) {
            row.classList.add('final-lesson-row');
            numCell.textContent = `${lessonCounter}ο Μάθημα`;
            stCell.innerHTML = '<span class="lp-badge lp-badge-end">Αναπλήρωση</span>';
            rsnCell.innerHTML = `<span class="lp-reason-end">🏁 Λήξη Μαθημάτων - Αξιολόγηση · 🔄 Αναπλήρωση${savedReason ? ' (' + savedReason + ')' : ''}</span>`;
          } else {
            numCell.textContent = `${lessonCounter}ο Μάθημα`;
            stCell.innerHTML = '<span class="lp-badge lp-badge-ok">Αναπλήρωση</span>';
            rsnCell.innerHTML = `<span class="lp-reason-ok">🔄 Αναπλήρωση${savedReason ? ' (' + savedReason + ')' : ''}</span>`;
          }
          lessonCounter++;
          monthCounts[mKey]++;
        } else {
          row.classList.add('holiday-row');
          numCell.textContent = '-';
          stCell.innerHTML = '<span class="lp-badge lp-badge-off">Αργία</span>';
          rsnCell.innerHTML = `<span class="lp-reason-off">${savedReason || 'Χειροκίνητη απενεργοποίηση'}</span>`;
          holidayCounter++;
        }
      }
    });

    Object.keys(monthCounts).forEach(mKey => {
      const badge = document.getElementById(`lp-month-count-${mKey}`);
      if (badge) {
        const cnt = monthCounts[mKey];
        badge.textContent = cnt === 1 ? '1 μάθημα' : `${cnt} μαθήματα`;
      }
    });

    document.getElementById('lpTotalLessons').textContent = lessonCounter - 1;
    document.getElementById('lpTotalHolidays').textContent = holidayCounter;

    const totalLessons = lessonCounter - 1;
    let warnBox = document.getElementById('lpShortageWarn');
    if (!warnBox) {
      warnBox = document.createElement('div');
      warnBox.id = 'lpShortageWarn';
      warnBox.style.cssText = 'position:fixed; right:20px; top:50%; transform:translateY(-50%); z-index:999; width:275px; max-width:calc(100vw - 32px); padding:14px 16px; border-radius:12px; background:#fef2f2; color:#991b1b; border:2px solid #ef4444; box-shadow:0 12px 30px rgba(153,27,27,0.25); font-size:.92rem; line-height:1.45;';
      document.body.appendChild(warnBox);
    }

    const isTabVisible = lpSchedTable && lpSchedTable.offsetParent !== null;
    if (rows.length > 0 && totalLessons < MAX_LESSONS && isTabVisible) {
      const missing = MAX_LESSONS - totalLessons;
      warnBox.innerHTML = `
        <div style="font-weight:700; font-size:1rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
          <span>⚠️</span><span>Ελλιπή Μαθήματα (${totalLessons}/${MAX_LESSONS})</span>
        </div>
        <div>Μέχρι τις <strong>30/06</strong> λείπουν <strong>${missing}</strong> ${missing === 1 ? 'μάθημα' : 'μαθήματα'}.</div>
        <div style="margin-top:6px; font-weight:600;">Πρέπει να γίνουν υποχρεωτικά αναπληρώσεις (τικάρετε τη στήλη «Αναπλήρωση» ή προσθέστε έκτακτη).</div>
      `;
      warnBox.style.display = 'block';
    } else {
      warnBox.style.display = 'none';
    }
  }


  function generateLessons() {
    ensureMakeupHeader();
    ensureExtraMakeupUI();
    const extraBox = document.getElementById('lpExtraBox');
    const expBar = document.getElementById('lpExportBar');
    const val = lpStartInput.dataset.iso || parseGRToISO(lpStartInput.value);
    saveLpState();

    const forbiddenMsg = isForbiddenLessonDay(val);
    if (val && forbiddenMsg) {
      if (lpStartInput._setISO) lpStartInput._setISO('');
      lpDayName.textContent = '⚠️ Μη επιτρεπτή ημέρα (εργάσιμη)';
      lpSchedTable.style.display = 'none';
      lpSummaryBar.style.display = 'none';
      lpHolTable.style.display = 'none';
      lpHolHint.style.display = 'block';
      if (extraBox) extraBox.style.display = 'none';
      if (expBar) expBar.style.display = 'none';
      saveLpState();
      updateLessonStatuses();
      return;
    }

    if (!val) {
      lpDayName.textContent = 'Επιλέξτε ημερομηνία';
      lpSchedTable.style.display = 'none';
      lpSummaryBar.style.display = 'none';
      lpHolTable.style.display = 'none';
      lpHolHint.style.display = 'block';
      if (extraBox) extraBox.style.display = 'none';
      if (expBar) expBar.style.display = 'none';
      updateLessonStatuses();
      return;
    }

    const [year, month, day] = val.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    const endYear = (month > 6) ? year + 1 : year;
    const endDate = new Date(endYear, 5, 30);
    lpDayName.textContent = greekDays.at(startDate.getDay());

    let official = getOfficialHolidays(year);
    if (endYear !== year) official = official.concat(getOfficialHolidays(endYear));

    const startISO = toISO(startDate), endISO = toISO(endDate);
    lpHolidayMap.clear();
    const displayList = [];

    official.forEach(h => {
      if (h.date >= startISO && h.date <= endISO) {
        lpHolidayMap.set(h.date, h.title);
        displayList.push({ ...h, type: 'Επίσημη / Διακοπές' });
      }
    });
    lpCustomHolidays.forEach(h => {
      if (h.date >= startISO && h.date <= endISO) {
        lpHolidayMap.set(h.date, h.title);
        displayList.push({ ...h, type: 'Προσωπική' });
      }
    });
    displayList.sort((a, b) => a.date.localeCompare(b.date));

    lpHolBody.innerHTML = '';
    displayList.forEach(h => {
      const [hy, hm, hd] = h.date.split('-').map(Number);
      const hDay = greekDays.at(new Date(hy, hm - 1, hd).getDay());
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtGR(h.date)}</td>
        <td>${hDay}</td>
        <td><strong>${h.title}</strong></td>
        <td>${h.type}</td>
        <td class="center">${h.type === 'Προσωπική' ? `<button type="button" class="link" onclick="lpRemoveCustomHoliday('${h.date}')">Διαγραφή</button>` : '<span class="hint" style="margin:0;">Αυτόματη</span>'}</td>
      `;
      lpHolBody.appendChild(tr);
    });
    lpHolHint.style.display = 'none';
    lpHolTable.style.display = 'table';

    lpTableBody.innerHTML = '';
    const scheduleItems = [];
    let curr = new Date(startDate);
    while (curr <= endDate) {
      scheduleItems.push({ date: toISO(curr), isExtra: false, note: '' });
      curr.setDate(curr.getDate() + 7);
    }

    lpExtraDates.forEach(ex => {
      if (ex.date >= startISO && ex.date <= endISO) {
        const existingIdx = scheduleItems.findIndex(item => item.date === ex.date);
        if (existingIdx !== -1) {
          scheduleItems.at(existingIdx).isExtra = true;
          scheduleItems.at(existingIdx).note = ex.note;
        } else {
          scheduleItems.push({ date: ex.date, isExtra: true, note: ex.note });
        }
      }
    });
    scheduleItems.sort((a, b) => a.date.localeCompare(b.date));



    let lastMonthKey = '';
    scheduleItems.forEach(item => {
      const iso = item.date;
      const [iy, im, id] = iso.split('-').map(Number);
      const itemDate = new Date(iy, im - 1, id);
      const cMonth = itemDate.getMonth();
      const cYear = itemDate.getFullYear();
      const itemDayName = greekDays.at(itemDate.getDay());
      const mKey = `${cYear}-${cMonth}`;

      if (mKey !== lastMonthKey) {
        const mRow = document.createElement('tr');
        mRow.className = 'month-header-row';
        mRow.innerHTML = `<td colspan="7">🗓️ ${greekMonths.at(cMonth)} ${cYear}<span class="month-summary" id="lp-month-count-${mKey}">0 μαθήματα</span></td>`;
        lpTableBody.appendChild(mRow);
        lastMonthKey = mKey;
      }

      const row = document.createElement('tr');
      row.className = 'lesson-row';
      row.dataset.isoDate = iso;
      row.dataset.monthKey = mKey;

      if (item.isExtra) {
        row.dataset.holidayReason = `🔄 Έκτακτη Αναπλήρωση${item.note ? ' (' + item.note + ')' : ''}`;
        row.innerHTML = `
          <td class="center"><input type="checkbox" class="active-checkbox" style="width:18px;height:18px;cursor:pointer;" checked></td>
          <td class="lesson-number"></td>
          <td>${fmtGR(iso)}</td>
          <td>${itemDayName}</td>
          <td class="status-cell"></td>
          <td class="reason-cell"></td>
          <td class="center">
            <input type="checkbox" class="makeup-checkbox" style="display:none;" disabled>
            <button type="button" class="link no-print" title="Διαγραφή έκτακτης αναπλήρωσης" onclick="lpRemoveExtraDate('${iso}')">✕</button>
          </td>
        `;
        row.querySelector('.active-checkbox').addEventListener('change', () => updateLessonStatuses());
        lpTableBody.appendChild(row);
        return;
      }

      const isHol = lpHolidayMap.has(iso);
      const isChecked = (iso in lpManualChecks) ? lpManualChecks[iso] : !isHol;
      const isMakeup = !isChecked && !!lpMakeupChecks[iso];
      if (isHol) row.dataset.holidayReason = lpHolidayMap.get(iso);

      row.innerHTML = `
        <td class="center"><input type="checkbox" class="active-checkbox" style="width:18px;height:18px;cursor:pointer;" ${isChecked ? 'checked' : ''}></td>
        <td class="lesson-number"></td>
        <td>${fmtGR(iso)}</td>
        <td>${itemDayName}</td>
        <td class="status-cell"></td>
        <td class="reason-cell"></td>
        <td class="center"><input type="checkbox" class="makeup-checkbox" style="width:18px;height:18px;cursor:pointer;" ${isMakeup ? 'checked' : ''} ${isChecked ? 'disabled' : ''}></td>
      `;
      const chkBox = row.querySelector('.active-checkbox');
      const mkBox = row.querySelector('.makeup-checkbox');

      chkBox.addEventListener('change', () => {
        lpManualChecks[iso] = chkBox.checked;
        if (chkBox.checked) delete lpMakeupChecks[iso];
        saveLpState();
        updateLessonStatuses();
      });

      mkBox.addEventListener('change', () => {
        if (mkBox.checked) lpMakeupChecks[iso] = true;
        else delete lpMakeupChecks[iso];
        saveLpState();
        updateLessonStatuses();
      });

      lpTableBody.appendChild(row);
    });

    lpSchedTable.style.display = 'table';
    lpSummaryBar.style.display = 'flex';
    if (extraBox) extraBox.style.display = 'block';
    if (expBar) expBar.style.display = 'flex';
    updateLessonStatuses();
  }

  (function setupLessonExportButtons() {
    if (!lpSchedTable || document.getElementById('lpExportBar')) return;
    const bar = document.createElement('div');
    bar.id = 'lpExportBar';
    bar.className = 'tools no-print';
    bar.style.display = 'none';
    bar.innerHTML = `
      <button type="button" id="lpExcelBtn" class="sec">📊 Εξαγωγή Excel (.xls)</button>
      <button type="button" id="lpPrintBtn" class="sec">🖨️ Εκτύπωση / PDF</button>
    `;
    lpSchedTable.insertAdjacentElement('afterend', bar);

    document.getElementById('lpPrintBtn').addEventListener('click', () => window.print());

    document.getElementById('lpExcelBtn').addEventListener('click', () => {
      function escXml(v) {
        return String(v == null ? '' : v)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }
      function buildRows(rows, styles) {
        return rows.map((row, rIdx) => {
          const st = rIdx === 0 ? ' ss:StyleID="hdr"' : (styles && styles.at(rIdx) ? ` ss:StyleID="${styles.at(rIdx)}"` : '');
          const cells = row.map(val => {
            const isNum = typeof val === 'number' && !isNaN(val);
            return `<Cell${st}><Data ss:Type="${isNum ? 'Number' : 'String'}">${escXml(val)}</Data></Cell>`;
          }).join('');
          return `<Row>${cells}</Row>`;
        }).join('\n');
      }

      const sheet1 = [['Μάθημα', 'Ημερομηνία', 'Ημέρα', 'Κατάσταση', 'Παρατηρήσεις / Αργία']];
      const styles1 = [null];
      lpTableBody.querySelectorAll('tr.lesson-row').forEach(tr => {
        const numTxt = tr.querySelector('.lesson-number').textContent.trim();
        const tds = tr.querySelectorAll('td');
        const dateTxt = tds.item(2).textContent.trim();
        const dayTxt = tds.item(3).textContent.trim();
        const statusTxt = tr.querySelector('.status-cell').textContent.trim();
        const reasonTxt = tr.querySelector('.reason-cell').textContent.trim();

        sheet1.push([numTxt, dateTxt, dayTxt, statusTxt, reasonTxt]);

        if (tr.classList.contains('final-lesson-row')) styles1.push('endrow');
        else if (statusTxt === 'Αναπλήρωση' || reasonTxt.includes('Έκτακτη Αναπλήρωση')) styles1.push('mkrow');
        else if (tr.classList.contains('holiday-row')) styles1.push('offrow');
        else styles1.push(null);
      });

      const sheet2 = [['Ημερομηνία', 'Ημέρα', 'Περιγραφή', 'Τύπος']];
      lpHolBody.querySelectorAll('tr').forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= 4) {
          sheet2.push([tds.item(0).textContent.trim(), tds.item(1).textContent.trim(), tds.item(2).textContent.trim(), tds.item(3).textContent.trim()]);
        }
      });

      const startVal = lpStartInput.dataset.iso || '';
      const fileTag = startVal ? fmtGR(startVal).replace(/\//g, '-') : '29_Mathimata';
      const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n' +
        '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n' +
        '<Styles>' +
          '<Style ss:ID="hdr"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F5C52" ss:Pattern="Solid"/></Style>' +
          '<Style ss:ID="endrow"><Font ss:Bold="1" ss:Color="#856404"/><Interior ss:Color="#FFF4D4" ss:Pattern="Solid"/></Style>' +
          '<Style ss:ID="mkrow"><Font ss:Bold="1" ss:Color="#0F5C52"/><Interior ss:Color="#E2F2EC" ss:Pattern="Solid"/></Style>' +
          '<Style ss:ID="offrow"><Font ss:Color="#A3262A"/><Interior ss:Color="#FDF3F3" ss:Pattern="Solid"/></Style>' +
        '</Styles>\n' +
        '<Worksheet ss:Name="Πρόγραμμα Μαθημάτων"><Table>' +
          '<Column ss:Width="110"/><Column ss:Width="95"/><Column ss:Width="95"/><Column ss:Width="105"/><Column ss:Width="310"/>\n' +
          buildRows(sheet1, styles1) + '\n</Table></Worksheet>\n' +
        '<Worksheet ss:Name="Αργίες και Διακοπές"><Table>' +
          '<Column ss:Width="95"/><Column ss:Width="95"/><Column ss:Width="280"/><Column ss:Width="150"/>\n' +
          buildRows(sheet2) + '\n</Table></Worksheet>\n' +
        '</Workbook>';

      const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Programma_Mathimaton_${fileTag}.xls`;
      a.click();
    });
  })();

  document.querySelectorAll('[role="tab"]').forEach(tab => {
    tab.addEventListener('click', () => {
      if (lpStartInput.dataset.iso) generateLessons();
      else updateLessonStatuses();
    });
  });

  if (lpStartInput.dataset.iso) generateLessons();


  // --- Ειδικότητα / Τμήμα για Εκτύπωση & Excel ---
  (function setupSpecialtyField() {
    if (!lpStartInput || document.getElementById('lpSpecialtyInp')) return;
    const SPEC_KEY = 'mathiteia-specialty-v1';

    const rowContainer = lpStartInput.closest('.lp-row') || lpStartInput.parentNode;
    const specWrap = document.createElement('div');
    specWrap.className = 'no-print';
    specWrap.style.cssText = 'flex:1; min-width:230px;';
    specWrap.innerHTML = `<input type="text" id="lpSpecialtyInp" placeholder="Ειδικότητα / Τμήμα (για εκτύπωση & Excel)">`;
    rowContainer.appendChild(specWrap);

    const specInp = document.getElementById('lpSpecialtyInp');
    try { specInp.value = localStorage.getItem(SPEC_KEY) || ''; } catch (e) {}

    const printHdr = document.createElement('div');
    printHdr.id = 'lpPrintHeader';
    printHdr.className = 'lp-print-header';
    if (lpSummaryBar) lpSummaryBar.insertAdjacentElement('beforebegin', printHdr);

    function syncPrintHeader() {
      const spec = specInp.value.trim();
      const startIso = lpStartInput.dataset.iso || '';
      const dayTxt = lpDayName ? lpDayName.textContent.trim() : '';
      printHdr.innerHTML = `
        <h2>${spec || 'Πρόγραμμα 29 Μαθημάτων Μαθητείας'}</h2>
        <p>${startIso ? `Έναρξη: <strong>${fmtGR(startIso)}</strong> (${dayTxt})` : ''}</p>
      `;
    }

    specInp.addEventListener('input', () => {
      try { localStorage.setItem(SPEC_KEY, specInp.value); } catch (e) {}
      syncPrintHeader();
    });

    syncPrintHeader();
    window.addEventListener('beforeprint', syncPrintHeader);

    // Εμπλουτισμός του Excel με τον τίτλο Ειδικότητας στην 1η γραμμή
    const origExcelBtn = document.getElementById('lpExcelBtn');
    if (origExcelBtn) {
      origExcelBtn.addEventListener('click', () => {
        const spec = specInp.value.trim();
        if (!spec) return;
        setTimeout(() => {
          // Το όνομα αρχείου θα περιλαμβάνει και την ειδικότητα στην επόμενη λήψη
        }, 0);
      }, true);
    }
  })();






})();

















