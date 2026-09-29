'use strict';
/* Mena core: state, permissions, helpers, rule-based "AI", demo data.
   Everything runs in the browser and persists to localStorage (prototype). */

const KEY = 'mena.proto.v1';
const ROLES = ['Admin', 'Manager', 'Site User', 'Viewer'];
const STATUS = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed' };
const PRIO = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
const PSTATUS = { scoping: 'Scoping', active: 'Active', handover: 'Handover', defects: 'Defects period', completed: 'Completed' };
const WEATHER = ['Sunny', 'Cloudy', 'Rain', 'Wind', 'Frost', 'Snow'];
const WICON = { Sunny: '☀️', Cloudy: '☁️', Rain: '🌧️', Wind: '💨', Frost: '❄️', Snow: '🌨️' };

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- i18n (English + German to show localisation) ---------- */
const DE = {
  'Home': 'Start', 'Projects': 'Projekte', 'Issues': 'Mängel', 'Ask Mena': 'Mena fragen', 'Inbox': 'Postfach', 'Team': 'Team', 'Settings': 'Einstellungen', 'More': 'Mehr',
  'Active projects': 'Aktive Projekte', 'Open issues': 'Offene Punkte', 'Overdue': 'Überfällig', 'Diary completion (7d)': 'Bautagebuch (7T)',
  'Daily log': 'Bautagebuch', 'Report issue': 'Mangel melden', 'Take photo': 'Foto aufnehmen', 'Photos': 'Fotos', 'Files': 'Dateien', 'Checklists': 'Checklisten',
  'Overview': 'Übersicht', 'Save': 'Speichern', 'Cancel': 'Abbrechen', 'New project': 'Neues Projekt', 'Name': 'Name', 'Client': 'Auftraggeber', 'Location': 'Standort',
  'Start': 'Beginn', 'End': 'Ende', 'Status': 'Status', 'Priority': 'Priorität', 'Owner': 'Verantwortlich', 'Due': 'Fällig', 'Title': 'Titel', 'Description': 'Beschreibung',
  'Weather': 'Wetter', 'Labour on site': 'Personal auf der Baustelle', 'Work completed': 'Erledigte Arbeiten', 'Deliveries': 'Lieferungen', 'Visitors': 'Besucher',
  'Blockers': 'Behinderungen', 'Incidents / near misses': 'Vorfälle / Beinahe-Unfälle', 'Comments': 'Kommentare', 'Add comment': 'Kommentar senden',
  'Open': 'Offen', 'In progress': 'In Arbeit', 'Resolved': 'Erledigt', 'Closed': 'Geschlossen', 'Low': 'Niedrig', 'Medium': 'Mittel', 'High': 'Hoch', 'Critical': 'Kritisch',
  'Scoping': 'Angebot/Aufmaß', 'Active': 'Aktiv', 'Handover': 'Übergabe', 'Defects period': 'Gewährleistung', 'Completed': 'Abgeschlossen',
  'Milestones': 'Meilensteine', 'Export': 'Export', 'Search': 'Suche', 'Language': 'Sprache', 'Plan & pricing': 'Tarif & Preise', 'Mena insights': 'Mena-Einblicke',
  'Recent photos': 'Neueste Fotos', 'Last update': 'Letzte Aktualisierung', 'Recent activity': 'Letzte Aktivität', 'Invite': 'Einladen', 'Sign up': 'Registrieren',
  'Start free': 'Kostenlos starten', 'Company name': 'Firmenname', 'Your name': 'Ihr Name', 'Work email': 'Geschäftliche E-Mail', 'Load demo projects': 'Demo-Projekte laden',
  'New issue': 'Neuer Mangel', 'Type': 'Art', 'Cost impact': 'Kostenrelevant', 'Structure it': 'Strukturieren', 'Quick note': 'Kurznotiz', 'Nothing yet': 'Noch nichts',
  'Good morning': 'Guten Morgen', 'Acting as': 'Ansicht als', 'Audit trail': 'Änderungsverlauf', 'Mark all read': 'Alle gelesen', 'Health': 'Zustand',
  'Snag': 'Restmangel', 'Task': 'Aufgabe', 'Issue': 'Mangel', 'Value': 'Auftragswert', 'Team members': 'Teammitglieder', 'Diary': 'Tagebuch'
};
const lang = () => (S && S.lang) || 'en';
const t = s => (lang() === 'de' && DE[s]) || s;
const loc = () => (lang() === 'de' ? 'de-DE' : 'en-IE');
const money = n => new Intl.NumberFormat(loc(), { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtDate = d => (d ? new Intl.DateTimeFormat(loc(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(d)) : '–');
const fmtShort = d => (d ? new Intl.DateTimeFormat(loc(), { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(d)) : '–');
const fmtTime = ts => new Intl.DateTimeFormat(loc(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));

/* ---------- dates ---------- */
const iso = d => d.toISOString().slice(0, 10);
const today = () => iso(new Date());
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return iso(x); };
const diffDays = (a, b) => Math.round((new Date(a) - new Date(b)) / 864e5);
const isWeekday = d => { const w = new Date(d + 'T00:00:00Z').getUTCDay(); return w !== 0 && w !== 6; };

/* ---------- state ---------- */
let S = load();
function load() {
  try { const r = JSON.parse(localStorage.getItem(KEY)); if (r) return r; } catch (e) { /* ignore */ }
  return { org: null, lang: 'en', me: null, users: [], projects: [], diary: [], photos: [], issues: [], comments: [], checklists: [], files: [], audit: [], notes: [], notified: {}, seq: 1 };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
  catch (e) { toast('Storage is full – remove some photos (prototype stores locally)'); return false; }
}
const uid = p => p + (S.seq++).toString(36) + Math.random().toString(36).slice(2, 5);
const by = id => S.users.find(u => u.id === id);
const proj = id => S.projects.find(p => p.id === id);
const me = () => by(S.me);
const pname = id => (proj(id) || {}).name || '?';
const uname = id => (by(id) || {}).name || '–';

function log(action, refType, refId, text, projectId) {
  S.audit.unshift({ id: uid('a'), at: Date.now(), by: S.me, action, refType, refId, text, projectId });
  S.audit = S.audit.slice(0, 500);
}
function notify(to, text, link) {
  if (!to || to === S.me) return;
  S.notes.unshift({ id: uid('n'), to, text, link, at: Date.now(), read: false });
}

/* ---------- permissions ---------- */
const role = () => (me() || {}).role;
const isSub = () => !!(me() || {}).sub;
const can = {
  write: () => ['Admin', 'Manager', 'Site User'].includes(role()),
  manage: () => ['Admin', 'Manager'].includes(role()),
  admin: () => role() === 'Admin'
};
const isOpen = i => i.status === 'open' || i.status === 'in_progress';
const isOverdue = i => isOpen(i) && i.due && i.due < today();
const visibleIssues = () => (isSub() ? S.issues.filter(i => i.owner === S.me) : S.issues);
const visibleProjects = () => (isSub() ? S.projects.filter(p => S.issues.some(i => i.projectId === p.id && i.owner === S.me)) : S.projects);
const diaryFor = (pid, date) => S.diary.find(d => d.projectId === pid && d.date === date);
const labourTotal = d => (d.labour || []).reduce((a, l) => a + (+l.count || 0), 0);

/* ---------- rule-based intelligence (swap for an LLM later) ---------- */
const TAGRULES = {
  safety: /safety|fall|edge|harness|injur|hazard|ppe|exposed|guard|unsafe|scaffold|trip|near miss/i,
  quality: /crack|defect|uneven|finish|paint|poor|misalign|snag|damage|stain|chip|scratch/i,
  water: /leak|damp|water|flood|wet|puddle|drain/i,
  mep: /electr|cable|plumb|pipe|duct|hvac|socket|lighting|sprinkler|panel/i,
  structure: /concrete|slab|rebar|steel|beam|column|foundation|formwork|screed/i,
  delivery: /deliver|late|shortage|supplier|missing|order|lorry|truck/i,
  weather: /rain|wind|frost|storm|snow|flood/i,
  design: /drawing|rfi|clash|design|spec|clarif/i,
  cost: /variation|extra|additional|rework|re-work|cost|change order|overrun/i
};
function aiTag(text) {
  const tags = Object.keys(TAGRULES).filter(k => TAGRULES[k].test(text));
  let priority = 'medium';
  if (/safety|leak|flood|exposed|injur|collapse|critical|urgent|fall/i.test(text)) priority = 'high';
  else if (/minor|cosmetic|touch.?up|tidy|low/i.test(text)) priority = 'low';
  return { tags, priority, cost: tags.includes('cost') };
}

const TRADE_STEMS = { brick: 'Bricklayers', labour: 'Labourers', electric: 'Electricians', plumb: 'Plumbers', carpent: 'Carpenters', steel: 'Steel fixers', plaster: 'Plasterers', scaffold: 'Scaffolders', crane: 'Crane operators', paint: 'Painters', roof: 'Roofers', groundwork: 'Groundworkers', join: 'Joiners', supervis: 'Supervisors', weld: 'Welders', tile: 'Tilers', driver: 'Drivers', fitter: 'Fitters' };
function parseQuickNote(text) {
  const out = { labour: [], work: [], deliveries: [], visitors: [], blockers: [], incidents: [], weather: '' };
  text.split(/[\n;.]|,(?!\d)/).map(s => s.trim()).filter(Boolean).forEach(seg => {
    const l = seg.toLowerCase();
    const m = l.match(/^(\d+)\s*(?:x\s*)?([a-z ]{3,24})$/);
    const stem = m && Object.keys(TRADE_STEMS).find(k => m[2].includes(k));
    if (m && stem) { out.labour.push({ trade: TRADE_STEMS[stem], count: +m[1] }); return; }
    const w = /rain|shower|drizzle/.test(l) ? 'Rain' : /frost|freez|\bice\b/.test(l) ? 'Frost' : /snow/.test(l) ? 'Snow' : /windy|gale|high wind/.test(l) ? 'Wind' : /sunny|sun all day|dry and bright/.test(l) ? 'Sunny' : '';
    if (w && !out.weather) out.weather = w;
    if (w && l.split(/\s+/).length <= 5 && !/stop|delay|block|halt/.test(l)) return; // pure weather remark
    if (/injur|incident|near miss|accident|fell|struck|first aid/.test(l)) out.incidents.push(seg);
    else if (/block|delay|waiting|broken|cannot|can't|no access|stopped|down\b|late\b|missing|clash/.test(l)) out.blockers.push(seg);
    else if (/deliver|arrived|lorry|truck|drop.?off/.test(l)) out.deliveries.push(seg);
    else if (/visit|inspector|client|architect|engineer|building control|walkround/.test(l)) out.visitors.push(seg);
    else out.work.push(seg);
  });
  return out;
}

function diarySummary(d) {
  const bits = [];
  const n = labourTotal(d);
  if (n) bits.push(`${n} on site`);
  if (d.weather) bits.push(d.weather.toLowerCase());
  if (d.work) bits.push(d.work.split(/[.\n]/)[0].trim().toLowerCase());
  let s = bits.join(', ');
  s = s.charAt(0).toUpperCase() + s.slice(1) + '.';
  if (d.blockers) s += ` Blocked: ${d.blockers.split(/[.\n]/)[0].trim()}.`;
  if (d.incidents) s += ' ⚠ Incident logged.';
  return s;
}

function health(p) {
  const iss = S.issues.filter(i => i.projectId === p.id);
  const od = iss.filter(isOverdue).length;
  const crit = iss.filter(i => isOpen(i) && ['high', 'critical'].includes(i.priority)).length;
  const recent = S.diary.filter(d => d.projectId === p.id && d.date >= addDays(today(), -3));
  const blockers = recent.filter(d => d.blockers).length;
  const inc = recent.filter(d => d.incidents).length;
  const missing = p.status === 'active' && isWeekday(today()) && !diaryFor(p.id, today()) && !diaryFor(p.id, addDays(today(), -1)) ? 1 : 0;
  const score = od * 2 + crit + blockers * 2 + inc * 3 + missing;
  return { score, level: score >= 6 ? 'red' : score >= 3 ? 'amber' : 'green', od, crit, blockers, inc };
}

function diaryCompletion() {
  const act = S.projects.filter(p => p.status === 'active');
  let due = 0, done = 0;
  for (let k = 1; k <= 7; k++) {
    const d = addDays(today(), -k);
    if (!isWeekday(d)) continue;
    act.forEach(p => { if (d >= p.start) { due++; if (diaryFor(p.id, d)) done++; } });
  }
  return due ? Math.round(done / due * 100) : 100;
}

function insights() {
  const out = [];
  const t0 = today();
  const missing = S.projects.filter(p => p.status === 'active' && isWeekday(t0) && !diaryFor(p.id, t0));
  if (missing.length) out.push({ level: 'warn', text: `No site diary yet today on ${missing.map(p => p.name).join(', ')}.`, link: `#/p/${missing[0].id}/diary` });
  const od = S.issues.filter(isOverdue).sort((a, b) => a.due.localeCompare(b.due));
  if (od.length) out.push({ level: 'bad', text: `${od.length} overdue item${od.length > 1 ? 's' : ''}. Oldest: “${od[0].title}” (${diffDays(t0, od[0].due)} days late).`, link: '#/issues?f=overdue' });
  const words = {};
  S.diary.filter(d => d.date >= addDays(t0, -7) && d.blockers).forEach(d =>
    (d.blockers.toLowerCase().match(/[a-z]{4,}/g) || []).filter(w => !['with', 'that', 'from', 'this', 'were', 'have', 'been', 'waiting', 'delay', 'delayed', 'access'].includes(w)).forEach(w => (words[w] = (words[w] || 0) + 1)));
  const top = Object.entries(words).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 2) out.push({ level: 'warn', text: `“${top[0]}” keeps appearing in blockers (${top[1]}× this week) – worth escalating.`, link: '#/ask?q=blockers this week' });
  S.projects.forEach(p => S.diary.filter(d => d.projectId === p.id && d.date >= addDays(t0, -1) && d.incidents).forEach(d => out.push({ level: 'bad', text: `Incident logged on ${p.name} (${fmtShort(d.date)}): ${d.incidents.slice(0, 80)}`, link: `#/p/${p.id}/diary` })));
  S.projects.forEach(p => (p.milestones || []).filter(m => !m.done && m.date >= t0 && m.date <= addDays(t0, 14)).forEach(m => {
    const risky = S.issues.filter(i => i.projectId === p.id && isOpen(i) && ['high', 'critical'].includes(i.priority)).length;
    if (risky) out.push({ level: 'warn', text: `Milestone “${m.name}” on ${p.name} is in ${diffDays(m.date, t0)} days with ${risky} high-priority item${risky > 1 ? 's' : ''} open.`, link: `#/p/${p.id}` });
  }));
  const costly = S.issues.filter(i => isOpen(i) && i.cost).length;
  if (costly) out.push({ level: '', text: `${costly} open item${costly > 1 ? 's are' : ' is'} tagged cost-impacting – review before they become variations.`, link: '#/issues?f=cost' });
  return out;
}

/* ---------- export ---------- */
function toCSV(rows) {
  return '﻿' + rows.map(r => r.map(c => { const s = String(c ?? ''); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
}
function download(name, text, type = 'text/csv;charset=utf-8') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- images / files ---------- */
function shrink(file, max = 1280) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => res(null);
      img.src = r.result;
    };
    r.onerror = () => res(null);
    r.readAsDataURL(file);
  });
}
function readFile(file) {
  return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(file); });
}
function svgPhoto(label, hue) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue},45%,72%)"/><stop offset="1" stop-color="hsl(${hue},30%,45%)"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/><rect x="60" y="200" width="150" height="280" fill="#0003"/><rect x="230" y="120" width="120" height="360" fill="#0004"/><rect x="370" y="240" width="200" height="240" fill="#0003"/><g stroke="#fff8" stroke-width="4"><path d="M230 120V60M230 60h260M490 60v90"/></g><text x="24" y="452" font-family="sans-serif" font-size="28" fill="#fff" font-weight="700">${label}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/* ---------- demo data ---------- */
function seedDemo() {
  const T = today(), d = n => addDays(T, n);
  const U = (name, role, extra = {}) => ({ id: uid('u'), name, role, email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com', ...extra });
  const tom = U('Tom Brandt', 'Manager'), luca = U('Luca Moretti', 'Site User', { title: 'Site foreman' }),
    mia = U('Mia Schneider', 'Site User', { title: 'Site engineer' }), sara = U('Sara Novak', 'Viewer', { title: 'Client rep' }),
    jan = U('Jan de Vries', 'Site User', { sub: true, company: 'DV Electrical' }), pat = U('Pat Byrne', 'Site User', { sub: true, company: 'Byrne Plastering' });
  S.users.push(tom, luca, mia, sara, jan, pat);
  const P = (name, client, location, status, start, end, value, team, ms) => ({ id: uid('p'), name, client, location, status, start, end, value, team, milestones: ms.map(([n, dt, done]) => ({ id: uid('m'), name: n, date: dt, done: !!done })) });
  const admin = S.me;
  const p1 = P('Rhein Logistics Hub', 'Rhein Logistik AG', 'Cologne, DE', 'active', d(-120), d(150), 42000000, [admin, tom.id, luca.id, mia.id, jan.id], [['Foundations complete', d(-60), 1], ['Frame topped out', d(9)], ['Envelope watertight', d(60)], ['Practical completion', d(150)]]);
  const p2 = P('Docklands Residences – Block B', 'Liffey Homes', 'Dublin, IE', 'active', d(-200), d(75), 18500000, [admin, tom.id, luca.id, pat.id, sara.id], [['Second fix complete', d(12)], ['Snagging start', d(45)], ['Handover', d(75)]]);
  const p3 = P('Amstel Office Refit', 'Amstel Vastgoed', 'Amsterdam, NL', 'handover', d(-160), d(20), 6200000, [admin, tom.id, mia.id, sara.id], [['Fit-out complete', d(-10), 1], ['Client walkround', d(5)], ['Handover pack issued', d(20)]]);
  const p4 = P('Weesp Care Home – tender', 'Zorg Groep Noord', 'Weesp, NL', 'scoping', d(30), d(400), 24000000, [admin, tom.id], [['Site survey', d(6)], ['Tender submission', d(21)]]);
  S.projects.push(p1, p2, p3, p4);

  const D = (p, off, author, weather, labour, work, deliveries, visitors, blockers, incidents, ph) => {
    const date = d(off); if (!isWeekday(date)) return;
    const photos = (ph || []).map(([label, hue]) => { const id = uid('ph'); S.photos.push({ id, projectId: p.id, src: svgPhoto(label, hue), caption: label, tags: ['diary'], by: author, at: Date.parse(date + 'T14:00:00Z'), refType: 'diary' }); return id; });
    S.diary.push({ id: uid('d'), projectId: p.id, date, weather, labour: labour.map(([trade, count]) => ({ trade, count })), work, deliveries, visitors, blockers, incidents, photos, by: author, at: Date.parse(date + 'T16:30:00Z') });
  };
  D(p1, -6, luca.id, 'Cloudy', [['Steel fixers', 12], ['Labourers', 8], ['Crane operators', 2]], 'Level 2 columns rebar complete; formwork to grid C-F.', 'Rebar delivery 10:00 (14t)', '', '', '', [['L2 columns rebar', 200]]);
  D(p1, -5, luca.id, 'Rain', [['Steel fixers', 10], ['Labourers', 6], ['Crane operators', 2]], 'Formwork to grid C-F 70%. Pour postponed due to rain.', '', 'Structural engineer site visit', 'Pour delayed – heavy rain, pump booking lost', '', [['Formwork grid C-F', 210]]);
  D(p1, -4, luca.id, 'Cloudy', [['Steel fixers', 12], ['Labourers', 9], ['Crane operators', 2], ['Electricians', 4]], 'Level 2 slab pour completed (86 m³).', 'Concrete 7×8 m³', '', '', '', [['L2 slab pour', 30]]);
  D(p1, -3, mia.id, 'Sunny', [['Carpenters', 8], ['Labourers', 8], ['Electricians', 6]], 'Striking of L1 soffit; MEP first fix east zone.', '', 'Client PM walk-round', 'Tower crane down 3 hours – waiting for inspector', '', [['MEP first fix east', 175]]);
  D(p1, -2, luca.id, 'Cloudy', [['Carpenters', 8], ['Labourers', 8], ['Electricians', 6], ['Crane operators', 2]], 'Precast panels delivered; erection begins grid A.', 'Precast panels ×14', '', 'Precast supplier late – 2 of 14 panels missing', '', [['Precast panels', 20]]);
  D(p1, -1, luca.id, 'Wind', [['Carpenters', 6], ['Labourers', 7], ['Crane operators', 2]], 'Panel erection paused above 45 km/h wind. Ground works to loading dock.', '', '', 'Crane stood down – wind', 'Near miss: unsecured formwork tie dropped from L2, no injury', [['Loading dock ground works', 90]]);
  D(p2, -6, luca.id, 'Rain', [['Plasterers', 6], ['Electricians', 4], ['Painters', 3]], 'Plastering L4 corridors; second fix electrics L3.', '', '', '', '', [['L4 plastering', 45]]);
  D(p2, -5, luca.id, 'Cloudy', [['Plasterers', 6], ['Electricians', 5], ['Painters', 4]], 'Plastering L4 apartments 401-404.', 'Plasterboard 120 sheets', '', '', '', []);
  D(p2, -4, luca.id, 'Cloudy', [['Plasterers', 6], ['Electricians', 5], ['Painters', 4], ['Joiners', 3]], 'Door linings L3 started. Paint touch-ups L2.', '', 'Clerk of works', 'Waiting on lift commissioning certificate', '', [['Door linings L3', 20]]);
  D(p2, -3, tom.id, 'Sunny', [['Plasterers', 4], ['Electricians', 5], ['Painters', 5], ['Joiners', 4]], 'L3 apartments second fix electrics 60%.', 'Sockets and switches', '', 'Lift commissioning certificate still outstanding', '', []);
  D(p2, -2, luca.id, 'Cloudy', [['Electricians', 5], ['Painters', 6], ['Joiners', 4]], 'L2 painting complete. L3 door furniture.', '', 'Building control', 'Lift certificate outstanding – no lift access for materials', '', [['L2 painting done', 160]]);
  D(p3, -3, mia.id, 'Cloudy', [['Painters', 4], ['Fitters', 3]], 'Final decoration floors 2-3; signage install.', '', 'Client site rep', '', '', []);

  const I = (p, title, desc, type, priority, status, owner, due, cost, ph, tags, off = -3, author) => {
    const photos = (ph || []).map(([label, hue]) => { const id = uid('ph'); S.photos.push({ id, projectId: p.id, src: svgPhoto(label, hue), caption: label, tags: tags || [], by: author || luca.id, at: Date.now() - 864e5 * Math.abs(off), refType: 'issue' }); return id; });
    const id = uid('i');
    S.issues.push({ id, projectId: p.id, title, desc, type, priority, status, owner, due, cost: !!cost, tags: tags || aiTag(title + ' ' + desc).tags, photos, created: Date.now() - 864e5 * Math.abs(off), createdBy: author || luca.id, closedBy: status === 'closed' ? tom.id : null });
    S.audit.push({ id: uid('a'), at: Date.now() - 864e5 * Math.abs(off), by: author || luca.id, action: 'created', refType: 'issue', refId: id, text: title, projectId: p.id });
    return id;
  };
  const i1 = I(p1, 'Missing edge protection on L2 east', 'Guardrail removed for panel lifting and not reinstated. Fall hazard.', 'issue', 'critical', 'open', luca.id, d(-1), 0, [['L2 east edge', 25]], ['safety'], -2);
  I(p1, 'Precast panels 13–14 not delivered', 'Supplier confirms slot next week. Erection sequence impacted, possible extra crane hire.', 'issue', 'high', 'in_progress', tom.id, d(3), 1, [], ['delivery', 'cost'], -2);
  I(p1, 'Crane inspection certificate expires Friday', 'Book third-party re-inspection before expiry.', 'task', 'high', 'open', mia.id, d(2), 0, [], ['safety'], -1);
  I(p1, 'Socket positions clash with duct route – grid D', 'RFI raised, need design clarification before first fix continues.', 'issue', 'medium', 'open', jan.id, d(-2), 1, [['Duct clash grid D', 280]], ['design', 'mep', 'cost'], -4);
  I(p2, 'Lift commissioning certificate outstanding', 'Blocking material access to L3–L5. Chase lift contractor.', 'issue', 'high', 'open', tom.id, d(-3), 1, [], ['delivery'], -6);
  I(p2, 'Cracked plaster corridor L4 near 402', 'Hairline cracks ~1.2m. Re-skim before paint.', 'snag', 'medium', 'open', pat.id, d(5), 0, [['Plaster crack L4', 15]], ['quality'], -2);
  I(p2, 'Paint touch-up stairwell B', 'Cosmetic scuffs on landing walls.', 'snag', 'low', 'open', pat.id, d(10), 0, [], ['quality'], -1);
  I(p2, 'Water stain on ceiling apartment 306', 'Damp patch under bathroom 406. Possible leak from waste pipe.', 'issue', 'high', 'in_progress', luca.id, d(1), 0, [['Ceiling stain 306', 210]], ['water', 'mep'], -3);
  I(p3, 'Door closer missing – Fire door 2.14', 'Needs fitting before fire inspection.', 'snag', 'medium', 'open', mia.id, d(4), 0, [], ['safety'], -2);
  I(p3, 'Client requested extra power outlets meeting room 2.03', 'Approved verbally – need written variation.', 'task', 'medium', 'resolved', tom.id, d(-5), 1, [], ['cost'], -9);
  S.comments.push({ id: uid('c'), refType: 'issue', refId: i1, by: tom.id, text: '@Luca please reinstall today and photograph once done.', at: Date.now() - 36e5 * 20 });
  notify(luca.id, 'Tom Brandt mentioned you on “Missing edge protection on L2 east”', '#/i/' + i1);

  const items = ['Access routes clear and signed', 'Edge protection in place', 'PPE worn by all operatives', 'Waste segregated', 'Fire extinguishers accessible', 'Temporary electrics safe'];
  S.checklists.push({ id: uid('cl'), projectId: p1.id, name: 'Weekly safety walk', items: items.map((tx, k) => ({ t: tx, v: k === 1 ? 'no' : 'yes', note: k === 1 ? 'L2 east open edge' : '' })), by: luca.id, at: Date.now() - 864e5 * 2 });
  S.projects.forEach(p => { p.team = [...new Set(p.team)]; });
}

const CHECKLIST_TEMPLATES = {
  'Site scoping / pre-start': ['Site access & logistics confirmed', 'Utilities located and marked', 'Ground conditions / survey reviewed', 'Neighbours & permits checked', 'Welfare and storage area agreed', 'Hazards recorded (asbestos, height, traffic)'],
  'Weekly safety walk': ['Access routes clear and signed', 'Edge protection in place', 'PPE worn by all operatives', 'Waste segregated', 'Fire extinguishers accessible', 'Temporary electrics safe'],
  'QA – concrete pour': ['Formwork checked and clean', 'Rebar cover verified', 'Concrete delivery note matches spec', 'Slump / cube samples taken', 'Curing plan in place'],
  'Handover / snag walk': ['All snags closed or accepted', 'O&M manuals collected', 'Certificates uploaded (electrical, fire, lift)', 'Client walkround signed', 'Keys and access handed over', 'Defects period contacts issued']
};
