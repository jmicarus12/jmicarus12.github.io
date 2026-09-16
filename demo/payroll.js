/* ===============================================================
   Payroll calculator demo.

   The arithmetic mirrors PayrollService::store() from a Laravel CMS
   I built for a security agency. Rules, per shift:

     rendered  = whole hours between time in and time out
     >= 4 hrs  -> credits one full day at the daily rate
                  (+ incentive and 13th-month per-day amounts, if enabled)
     >  8 hrs  -> each extra hour paid at the contract overtime rate
     holiday   -> adds daily rate x holiday percentage
     night     -> flat night rate for a shift inside the night window,
                  pro-rated at nightRate/8 per overlapping hour otherwise

   Then, once per cut-off: cash bond always comes off; SSS, Pag-IBIG and
   PhilHealth only on the cut-off that ends the month.

   No network, no server. State lives in localStorage on this device only.
   =============================================================== */

const KEY = 'bb-payroll-demo-v1';

const DEFAULTS = {
  contract: {
    salary_rate: 610,
    overtime_pay: 125,
    night_diff_rate: 80,
    thirteen_month_rate: 8.33,
    incentive_leave_rate: 2.08,
    holiday_pay: 100,
    sss: 500,
    pag_ibig: 100,
    phil_health: 250,
    cashbond: 100,
  },
  flags: { incentive: true, thirteenth: true, nightdiff: true, monthend: false },
  shifts: [],
};

const NIGHT_START = 22;   // 22:00
const NIGHT_END = 6;      // 06:00 next day

let state = load();

/* ---------- persistence (localStorage can throw; never let it break the page) ---------- */

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const saved = JSON.parse(raw);
    return {
      contract: { ...DEFAULTS.contract, ...(saved.contract || {}) },
      flags: { ...DEFAULTS.flags, ...(saved.flags || {}) },
      shifts: Array.isArray(saved.shifts) ? saved.shifts : [],
    };
  } catch (err) {
    return structuredClone(DEFAULTS);
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    /* private window, blocked site data - the calculator still works, it just
       will not remember anything next visit. */
  }
}

/* ---------- the rules ---------- */

/** Whole hours between two HH:MM strings, wrapping past midnight. */
function hoursBetween(timeIn, timeOut) {
  const [inH, inM] = String(timeIn).split(':').map(Number);
  const [outH, outM] = String(timeOut).split(':').map(Number);
  if ([inH, inM, outH, outM].some(Number.isNaN)) return 0;
  let mins = (outH * 60 + outM) - (inH * 60 + inM);
  if (mins <= 0) mins += 24 * 60;               // shift crossed midnight
  return Math.floor(mins / 60);                 // PHP diffInHours truncates too
}

/** Hours of a shift that fall inside the 22:00-06:00 night window. */
function nightHours(timeIn, hours) {
  const start = Number(String(timeIn).split(':')[0]);
  if (Number.isNaN(start)) return 0;
  let overlap = 0;
  for (let i = 0; i < hours; i++) {
    const hour = (start + i) % 24;
    if (hour >= NIGHT_START || hour < NIGHT_END) overlap++;
  }
  return overlap;
}

function compute() {
  const c = state.contract;
  const f = state.flags;
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  const out = {
    days: 0, hours: 0, overtimeHours: 0, nightDays: 0,
    base: 0, overtime: 0, night: 0, incentive: 0, thirteenth: 0, holiday: 0,
    cashbond: 0, sss: 0, pag_ibig: 0, phil_health: 0,
    rows: [],
  };

  state.shifts.forEach((s) => {
    const rendered = hoursBetween(s.in, s.out);
    out.hours += rendered;

    const credited = rendered >= 4;
    let ot = 0;

    if (credited) {
      out.days += 1;
      out.base += num(c.salary_rate);

      if (f.incentive) out.incentive += num(c.incentive_leave_rate);
      if (f.thirteenth) out.thirteenth += num(c.thirteen_month_rate);

      if (f.nightdiff) {
        const inWindow = nightHours(s.in, rendered);
        if (inWindow >= 8) {
          out.night += num(c.night_diff_rate);
          out.nightDays += 1;
        } else if (inWindow > 0) {
          out.night += (num(c.night_diff_rate) / 8) * inWindow;
          out.nightDays += 1;
        }
      }

      if (rendered > 8) {
        ot = rendered - 8;
        out.overtimeHours += ot;
        out.overtime += ot * num(c.overtime_pay);
      }

      if (s.holiday) {
        out.holiday += num(c.salary_rate) * (num(c.holiday_pay) / 100);
      }
    }

    out.rows.push({ ...s, rendered, credited, ot });
  });

  const earned = out.base + out.overtime + out.night + out.incentive + out.thirteenth + out.holiday;

  // Deductions only apply once any time was rendered at all.
  if (out.hours > 0) {
    out.cashbond = num(c.cashbond);
    if (f.monthend) {
      out.sss = num(c.sss);
      out.pag_ibig = num(c.pag_ibig);
      out.phil_health = num(c.phil_health);
    }
  }

  out.gross = earned;
  out.deducted = out.cashbond + out.sss + out.pag_ibig + out.phil_health;
  out.net = earned - out.deducted;
  return out;
}

/* ---------- rendering ---------- */

const peso = (n) => '₱' + (Number(n) || 0).toLocaleString('en-PH', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

function lines(target, items) {
  const el = document.getElementById(target);
  const shown = items.filter((i) => i.always || Math.abs(i.value) > 0.004);
  if (!shown.length) {
    el.innerHTML = '<p class="none">Nothing yet.</p>';
    return;
  }
  el.innerHTML = shown.map((i) => (
    '<dt>' + i.label + (i.note ? '<small>' + i.note + '</small>' : '') + '</dt>' +
    '<dd class="' + (Math.abs(i.value) > 0.004 ? '' : 'zero') + '">' + peso(i.value) + '</dd>'
  )).join('');
}

function renderShifts(rows) {
  const body = document.querySelector('#shift-table tbody');
  const empty = document.getElementById('shift-empty');
  document.querySelector('#shift-table').closest('.tablewrap').hidden = rows.length === 0;
  empty.hidden = rows.length > 0;

  body.innerHTML = '';
  rows.forEach((r, i) => {
    const tr = document.createElement('tr');

    const cell = (child) => { const td = document.createElement('td'); td.appendChild(child); return td; };
    const input = (type, value, field) => {
      const el = document.createElement('input');
      el.type = type;
      el.value = value || '';
      el.dataset.index = i;
      el.dataset.field = field;
      return el;
    };

    tr.appendChild(cell(input('date', r.date, 'date')));
    tr.appendChild(cell(input('time', r.in, 'in')));
    tr.appendChild(cell(input('time', r.out, 'out')));

    const hrs = document.createElement('td');
    hrs.className = 'num';
    hrs.textContent = r.rendered;
    tr.appendChild(hrs);

    const credit = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'credit ' + (r.credited ? 'full' : 'none');
    badge.textContent = r.credited ? '1 DAY' : 'NO DAY';
    credit.appendChild(badge);
    tr.appendChild(credit);

    const ot = document.createElement('td');
    ot.className = 'num';
    const otSpan = document.createElement('span');
    otSpan.className = 'ot' + (r.ot ? '' : ' zero');
    otSpan.textContent = r.ot ? '+' + r.ot + 'h' : '—';
    ot.appendChild(otSpan);
    tr.appendChild(ot);

    const hol = document.createElement('td');
    const holBox = document.createElement('input');
    holBox.type = 'checkbox';
    holBox.checked = !!r.holiday;
    holBox.dataset.index = i;
    holBox.dataset.field = 'holiday';
    holBox.setAttribute('aria-label', 'Holiday');
    hol.appendChild(holBox);
    tr.appendChild(hol);

    const del = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'iconbtn';
    btn.dataset.remove = i;
    btn.setAttribute('aria-label', 'Remove shift');
    btn.textContent = '×';
    del.appendChild(btn);
    tr.appendChild(del);

    body.appendChild(tr);
  });
}

function render() {
  const r = compute();
  renderShifts(r.rows);

  lines('earnings', [
    { label: 'Basic pay', note: r.days + ' day' + (r.days === 1 ? '' : 's') + ' × ' + peso(state.contract.salary_rate), value: r.base, always: true },
    { label: 'Overtime', note: r.overtimeHours + ' hour' + (r.overtimeHours === 1 ? '' : 's'), value: r.overtime },
    { label: 'Night differential', note: r.nightDays + ' shift' + (r.nightDays === 1 ? '' : 's'), value: r.night },
    { label: 'Holiday pay', value: r.holiday },
    { label: '13th month', value: r.thirteenth },
    { label: 'Incentive leave', value: r.incentive },
  ]);

  lines('deductions', [
    { label: 'Cash bond', note: 'every cut-off', value: r.cashbond, always: true },
    { label: 'SSS', note: state.flags.monthend ? 'month-end' : 'not this cut-off', value: r.sss, always: true },
    { label: 'Pag-IBIG', note: state.flags.monthend ? 'month-end' : 'not this cut-off', value: r.pag_ibig, always: true },
    { label: 'PhilHealth', note: state.flags.monthend ? 'month-end' : 'not this cut-off', value: r.phil_health, always: true },
  ]);

  document.getElementById('out-days').textContent = r.days;
  document.getElementById('out-hours').textContent = r.hours;
  document.getElementById('out-gross').textContent = peso(r.gross);
  document.getElementById('out-net').textContent = peso(r.net);

  save();
}

/* ---------- wiring ---------- */

function sampleCutoff() {
  // A 15-day cut-off: mostly 8h days, a couple of 10h overtime shifts,
  // one 5h short day (still a full day's credit) and a night shift.
  const pattern = [
    { in: '06:00', out: '14:00' },
    { in: '06:00', out: '14:00' },
    { in: '14:00', out: '00:00' },
    { in: '06:00', out: '14:00' },
    { in: '22:00', out: '06:00' },
    { in: '06:00', out: '11:00' },
    { in: '14:00', out: '22:00' },
  ];
  const out = [];
  for (let day = 1; day <= 15; day++) {
    if (day % 7 === 0) continue;                       // rest day
    const p = pattern[(day - 1) % pattern.length];
    out.push({
      date: '2026-09-' + String(day).padStart(2, '0'),
      in: p.in, out: p.out, holiday: false,
    });
  }
  return out;
}

document.addEventListener('DOMContentLoaded', () => {
  // contract inputs
  Object.keys(DEFAULTS.contract).forEach((field) => {
    const el = document.getElementById(field);
    if (!el) return;
    el.value = state.contract[field];
    el.addEventListener('input', () => {
      state.contract[field] = el.value === '' ? 0 : Number(el.value);
      render();
    });
  });

  // flag toggles
  const flagIds = { f_incentive: 'incentive', f_thirteenth: 'thirteenth', f_nightdiff: 'nightdiff', f_monthend: 'monthend' };
  Object.entries(flagIds).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = !!state.flags[key];
    el.addEventListener('change', () => { state.flags[key] = el.checked; render(); });
  });

  // shift table edits (delegated, so new rows work without rebinding)
  const table = document.getElementById('shift-table');
  table.addEventListener('input', (e) => {
    const { index, field } = e.target.dataset;
    if (index === undefined) return;
    const shift = state.shifts[Number(index)];
    if (!shift) return;
    shift[field] = field === 'holiday' ? e.target.checked : e.target.value;
    render();
  });
  table.addEventListener('change', (e) => {
    if (e.target.dataset.field === 'holiday') {
      const shift = state.shifts[Number(e.target.dataset.index)];
      if (shift) { shift.holiday = e.target.checked; render(); }
    }
  });
  table.addEventListener('click', (e) => {
    const idx = e.target.dataset.remove;
    if (idx === undefined) return;
    state.shifts.splice(Number(idx), 1);
    render();
  });

  document.getElementById('add-shift').addEventListener('click', () => {
    const last = state.shifts[state.shifts.length - 1];
    let date = '2026-09-01';
    if (last && last.date) {
      const d = new Date(last.date + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      date = d.toISOString().slice(0, 10);
    }
    state.shifts.push({ date, in: '06:00', out: '14:00', holiday: false });
    render();
  });

  document.getElementById('load-sample').addEventListener('click', () => {
    state.shifts = sampleCutoff();
    render();
  });

  document.getElementById('clear-shifts').addEventListener('click', () => {
    state.shifts = [];
    render();
  });

  document.getElementById('reset-all').addEventListener('click', () => {
    state = structuredClone(DEFAULTS);
    state.shifts = sampleCutoff();
    Object.keys(DEFAULTS.contract).forEach((f) => {
      const el = document.getElementById(f);
      if (el) el.value = state.contract[f];
    });
    Object.entries(flagIds).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.checked = !!state.flags[key];
    });
    render();
  });

  // first visit gets the sample so the page is never empty
  if (!state.shifts.length) state.shifts = sampleCutoff();
  render();
});
