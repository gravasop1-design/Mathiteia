(function(){
  const lpStartInput = document.getElementById('lpStartDate');
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
  let lpHolidayMap = new Map();

  try {
    const saved = JSON.parse(localStorage.getItem(LP_STORAGE_KEY) || 'null');
    if (saved) {
      if (saved.startDate) lpStartInput.value = saved.startDate;
      if (Array.isArray(saved.customHolidays)) lpCustomHolidays = saved.customHolidays;
      if (saved.manualChecks && typeof saved.manualChecks === 'object') lpManualChecks = saved.manualChecks;
      if (saved.makeupChecks && typeof saved.makeupChecks === 'object') lpMakeupChecks = saved.makeupChecks;
    }
  } catch(e) {}

  function saveLpState() {
    try {
      localStorage.setItem(LP_STORAGE_KEY, JSON.stringify({
        startDate: lpStartInput.value,
        customHolidays: lpCustomHolidays,
        manualChecks: lpManualChecks,
        makeupChecks: lpMakeupChecks
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

  function toISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function fmtGR(isoStr) {
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  }
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
    const startVal = document.getElementById('lpCustomStart').value;
    const endVal = document.getElementById('lpCustomEnd').value || startVal;
    const titleVal = document.getElementById('lpCustomTitle').value.trim() || 'Προσωπική Αργία';
    if (!startVal) { alert('Επιλέξτε ημερομηνία έναρξης αργίας.'); return; }
    const [sy, sm, sd] = startVal.split('-').map(Number);
    const [ey, em, ed] = endVal.split('-').map(Number);
    let curr = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    if (end < curr) { alert('Η ημερομηνία «Έως» δεν μπορεί να είναι πριν από το «Από».'); return; }
    while (curr <= end) {
      const iso = toISO(curr);
      const idx = lpCustomHolidays.findIndex(h => h.date === iso);
      if (idx !== -1) lpCustomHolidays[idx].title = titleVal;
      else lpCustomHolidays.push({ date: iso, title: titleVal });
      delete lpManualChecks[iso];
      delete lpMakeupChecks[iso];
      curr.setDate(curr.getDate() + 1);
    }
    document.getElementById('lpCustomStart').value = '';
    document.getElementById('lpCustomEnd').value = '';
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

      // Αν έχουν ήδη συμπληρωθεί τα 29 μαθήματα
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
        // Κανονικό ενεργό μάθημα -> η Αναπλήρωση είναι απενεργοποιημένη
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
        // Ανενεργή γραμμή -> επιτρέπεται το τικάρισμα της Αναπλήρωσης
        mkChk.disabled = false;

        if (mkChk.checked) {
          // Έγινε αναπλήρωση σε ανενεργή μέρα -> μετράει ως Μάθημα!
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
          // Παραμένει Αργία / Ανενεργή
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
  }

  function generateLessons() {
    ensureMakeupHeader();
    const val = lpStartInput.value;
    saveLpState();
    if (!val) {
      lpDayName.textContent = 'Επιλέξτε ημερομηνία';
      lpSchedTable.style.display = 'none';
      lpSummaryBar.style.display = 'none';
      lpHolTable.style.display = 'none';
      lpHolHint.style.display = 'block';
      return;
    }

    const [year, month, day] = val.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    const endYear = (month > 6) ? year + 1 : year;
    const endDate = new Date(endYear, 5, 30);
    const dayName = greekDays[startDate.getDay()];
    lpDayName.textContent = dayName;

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
      const hDay = greekDays[new Date(hy, hm - 1, hd).getDay()];
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
    let curr = new Date(startDate);
    let lastMonthKey = '';

    while (curr <= endDate) {
      const iso = toISO(curr);
      const cMonth = curr.getMonth();
      const cYear = curr.getFullYear();
      const mKey = `${cYear}-${cMonth}`;

      if (mKey !== lastMonthKey) {
        const mRow = document.createElement('tr');
        mRow.className = 'month-header-row';
        mRow.innerHTML = `<td colspan="7">🗓️ ${greekMonths[cMonth]} ${cYear}<span class="month-summary" id="lp-month-count-${mKey}">0 μαθήματα</span></td>`;
        lpTableBody.appendChild(mRow);
        lastMonthKey = mKey;
      }

      const isHol = lpHolidayMap.has(iso);
      const isChecked = (iso in lpManualChecks) ? lpManualChecks[iso] : !isHol;
      const isMakeup = !isChecked && !!lpMakeupChecks[iso];
      const row = document.createElement('tr');
      row.className = 'lesson-row';
      row.dataset.isoDate = iso;
      row.dataset.monthKey = mKey;
      if (isHol) row.dataset.holidayReason = lpHolidayMap.get(iso);

      row.innerHTML = `
        <td class="center"><input type="checkbox" class="active-checkbox" style="width:18px;height:18px;cursor:pointer;" ${isChecked ? 'checked' : ''}></td>
        <td class="lesson-number"></td>
        <td>${fmtGR(iso)}</td>
        <td>${dayName}</td>
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
      curr.setDate(curr.getDate() + 7);
    }

    updateLessonStatuses();
    lpSchedTable.style.display = 'table';
    lpSummaryBar.style.display = 'flex';
  }

  lpStartInput.addEventListener('change', () => {
    lpManualChecks = {};
    lpMakeupChecks = {};
    generateLessons();
  });

  if (lpStartInput.value) generateLessons();
})();
