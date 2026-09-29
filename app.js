'use strict';
/* Mena UI: router, views, forms. Depends on core.js */

let pend = [];            // photos captured in the currently open form
let chat = [];            // Ask Mena conversation (in memory)
let lastProject = null;   // remembered for quick-add

/* ---------- small ui helpers ---------- */
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600);
}
const pill = (txt, cls = '') => `<span class="pill ${cls}">${esc(txt)}</span>`;
const prioPill = p => pill(t(PRIO[p]), { critical: 'bad', high: 'warn', medium: 'info', low: '' }[p]);
const statusPill = s => pill(t(STATUS[s]), { open: 'info', in_progress: 'warn', resolved: 'ok', closed: '' }[s]);
const pstatusPill = s => pill(t(PSTATUS[s]), { active: 'ok', scoping: 'info', handover: 'warn', defects: 'warn', completed: '' }[s]);
const opts = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${esc(k)}" ${k === sel ? 'selected' : ''}>${esc(t(v))}</option>`).join('');
const projOpts = sel => visibleProjects().map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
const empty = (title, sub, btn = '') => `<div class="empty"><b>${esc(title)}</b>${esc(sub)}<div style="margin-top:12px">${btn}</div></div>`;
const thumbs = ids => (ids || []).length ? `<div class="thumbs">${ids.map(id => { const p = S.photos.find(x => x.id === id); return p ? `<img src="${p.src}" alt="${esc(p.caption)}" data-a="photo" data-id="${id}" loading="lazy">` : ''; }).join('')}</div>` : '';
const nl2 = s => esc(s).replace(/\n/g, '<br>');

function openModal(html) { const m = $('#modal'); m.innerHTML = html; if (!m.open) m.showModal(); }
function closeModal() {
  const m = $('#modal'); if (m.open) m.close(); pend = [];
  if (location.hash.startsWith('#/i/')) location.hash = '#/issues';
}
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
$('#modal').addEventListener('cancel', () => { pend = []; });
const mform = (name, title, body, cta = 'Save') => `<form data-form="${name}" autocomplete="off"><div class="mh"><h2>${esc(title)}</h2><button type="button" class="btn sm right" data-a="close" aria-label="Close">✕</button></div><div class="mb">${body}</div><div class="mf"><button type="button" class="btn" data-a="close">${t('Cancel')}</button><button class="btn primary">${t(cta)}</button></div></form>`;
const field = (label, name, val = '', attr = '') => `<label>${t(label)}<input name="${name}" value="${esc(val)}" ${attr}></label>`;
const area = (label, name, val = '', attr = '') => `<label>${t(label)}<textarea name="${name}" ${attr}>${esc(val)}</textarea></label>`;

/* ---------- router ---------- */
const NAV = [['', 'Home', '⌂'], ['projects', 'Projects', '▦'], ['issues', 'Issues', '⚑'], ['ask', 'Ask Mena', '✦'], ['inbox', 'Inbox', '✉']];
function route() {
  const [path, qs] = location.hash.slice(2).split('?');
  return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs || '') };
}
function unread() { return S.notes.filter(n => n.to === S.me && !n.read).length; }

function render() {
  const app = $('#app');
  if (!S.org) { app.innerHTML = vSignup(); return; }
  const { parts, q } = route();
  const [a, b, c] = parts;
  let body;
  if (!a) body = isSub() ? vSubHome() : vDashboard();
  else if (a === 'projects') body = vProjects();
  else if (a === 'p') body = vProject(b, c || 'overview');
  else if (a === 'issues' || a === 'i') body = vIssues(q);
  else if (a === 'search') body = vSearch(q.get('q') || '');
  else if (a === 'ask') body = vAsk(q.get('q'));
  else if (a === 'inbox') body = vInbox();
  else if (a === 'team') body = vTeam();
  else if (a === 'settings') body = vSettings();
  else if (a === 'report') body = vReport(b, c);
  else body = vDashboard();
  const on = ['', 'projects', 'issues', 'ask', 'inbox'].includes(a || '') ? a || '' : a === 'p' ? 'projects' : a === 'i' ? 'issues' : 'settings';
  const n = unread();
  const nav = NAV.map(([h, l, ic]) => `<a href="#/${h}" class="${on === h ? 'on' : ''}"><span class="ic">${ic}</span>${t(l)}${h === 'inbox' && n ? `<span class="badge">${n}</span>` : ''}</a>`).join('');
  const users = S.users.map(u => `<option value="${u.id}" ${u.id === S.me ? 'selected' : ''}>${esc(u.name)} · ${u.sub ? 'Subcontractor' : u.role}</option>`).join('');
  app.innerHTML = `<div class="shell">
    <aside class="side"><div class="brand"><i></i>Mena</div><nav class="nav">${nav}
      ${can.manage() ? `<a href="#/team" class="${on === 'settings' && a === 'team' ? 'on' : ''}"><span class="ic">☺</span>${t('Team')}</a>` : ''}
      <a href="#/settings" class="${a === 'settings' ? 'on' : ''}"><span class="ic">⚙</span>${t('Settings')}</a></nav>
      <div class="muted small" style="margin-top:auto;padding:10px">${esc(S.org.name)}</div></aside>
    <div class="main"><header class="top">
      <form data-form="search" class="grow row" style="flex-wrap:nowrap"><input type="search" name="q" placeholder="${t('Search')} – projects, issues, photos, diary" aria-label="Search" value="${esc(a === 'search' ? q.get('q') || '' : '')}"></form>
      <a href="#/inbox" class="btn sm" aria-label="Inbox">🔔${n ? `<span class="badge">${n}</span>` : ''}</a>
      <select data-a="switch" aria-label="${t('Acting as')}" style="width:auto;max-width:200px" title="${t('Acting as')} (demo)">${users}</select>
    </header><main class="page">${body}</main></div></div>
    <nav class="bottom"><a href="#/" class="${on === '' ? 'on' : ''}"><span class="ic">⌂</span>${t('Home')}</a>
      <a href="#/projects" class="${on === 'projects' ? 'on' : ''}"><span class="ic">▦</span>${t('Projects')}</a>
      <a href="#/" data-a="quick" style="color:var(--brand)"><span class="ic" style="font-size:30px">⊕</span></a>
      <a href="#/issues" class="${on === 'issues' ? 'on' : ''}"><span class="ic">⚑</span>${t('Issues')}</a>
      <a href="#/settings" class="${on === 'settings' ? 'on' : ''}"><span class="ic">☰</span>${t('More')}</a></nav>
    ${can.write() && !isSub() ? `<button class="fab" data-a="quick" aria-label="Quick add">+</button>` : ''}`;
  if (a === 'i' && !$('#modal').open) openIssue(b);
  if (a === 'ask') { const l = $('#chatlog'); if (l) l.scrollTop = l.scrollHeight; }
}
window.addEventListener('hashchange', () => { render(); scrollTo(0, 0); });

/* ---------- signup / onboarding ---------- */
function vSignup() {
  return `<form data-form="signup" class="auth"><div class="brand" style="padding:0"><i></i>Mena</div>
  <div><h1>Run your sites in one simple place</h1><p class="muted">Sign up, create a project, invite your team – start logging site ops today. No training needed.</p></div>
  ${field('Company name', 'company', '', 'required autofocus placeholder="e.g. Nordbau Construction"')}
  ${field('Your name', 'name', '', 'required')}
  ${field('Work email', 'email', '', 'type="email" required')}
  <label class="inline"><input type="checkbox" name="demo" checked> ${t('Load demo projects')}</label>
  <button class="btn primary">${t('Start free')}</button>
  <p class="muted small">Prototype: data stays in this browser. Flat pricing, unlimited users – see Settings › Plan.</p></form>`;
}

/* ---------- dashboard ---------- */
function projectCard(p) {
  const h = health(p), iss = S.issues.filter(i => i.projectId === p.id);
  const last = S.diary.filter(d => d.projectId === p.id).sort((a, b) => b.date.localeCompare(a.date))[0];
  const pct = Math.max(0, Math.min(100, Math.round(diffDays(today(), p.start) / Math.max(1, diffDays(p.end, p.start)) * 100)));
  return `<div class="card link col" data-a="go" data-to="/p/${p.id}">
    <div class="row"><span class="dot ${h.level === 'green' ? '' : h.level}" title="${t('Health')}: ${h.level}"></span><h3 class="grow">${esc(p.name)}</h3>${pstatusPill(p.status)}</div>
    <div class="muted small">${esc(p.client)} · ${esc(p.location)}</div>
    <div class="bar" title="Time elapsed ${pct}%"><i style="width:${pct}%"></i></div>
    <div class="row small"><span><b>${iss.filter(isOpen).length}</b> open</span><span class="${h.od ? '' : 'muted'}" style="${h.od ? 'color:var(--bad);font-weight:700' : ''}"><b>${h.od}</b> overdue</span><span class="muted right">${t('Last update')}: ${last ? fmtShort(last.date) : '–'}</span></div></div>`;
}
function vDashboard() {
  const t0 = today(), act = S.projects.filter(p => p.status !== 'completed');
  const iss = S.issues, od = iss.filter(isOverdue).length;
  const ins = insights();
  const photos = [...S.photos].sort((a, b) => b.at - a.at).slice(0, 8);
  const ms = S.projects.flatMap(p => (p.milestones || []).filter(m => !m.done && m.date >= t0).map(m => ({ ...m, p }))).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  return `<div><h1>${t('Good morning')}, ${esc(me().name.split(' ')[0])}</h1><div class="muted">${fmtDate(t0)} · ${esc(S.org.name)}</div></div>
  <div class="kpis"><div class="kpi"><b>${S.projects.filter(p => p.status === 'active').length}</b><span>${t('Active projects')}</span></div>
    <div class="kpi"><b>${iss.filter(isOpen).length}</b><span>${t('Open issues')}</span></div>
    <div class="kpi ${od ? 'bad' : ''}"><b>${od}</b><span>${t('Overdue')}</span></div>
    <div class="kpi"><b>${diaryCompletion()}%</b><span>${t('Diary completion (7d)')}</span></div></div>
  <div class="ai"><h2><span class="spark">✦</span> ${t('Mena insights')}</h2><div class="col" style="margin-top:10px">
    ${ins.length ? ins.slice(0, 5).map(i => `<a class="insight ${i.level}" href="${i.link}" style="color:var(--ink)">${i.level === 'bad' ? '🔴' : i.level === 'warn' ? '🟠' : '🔹'}<span>${esc(i.text)}</span></a>`).join('') : '<div class="muted">All quiet – nothing needs attention.</div>'}</div></div>
  <div><div class="row" style="margin-bottom:10px"><h2>${t('Projects')}</h2><a class="right small" href="#/projects">All →</a></div>
    ${act.length ? `<div class="grid g2">${act.map(projectCard).join('')}</div>` : empty('Create your first project', 'It takes 20 seconds: name, client, dates.', can.manage() ? `<button class="btn primary" data-a="newProject">+ ${t('New project')}</button>` : '')}</div>
  <div class="grid g2">
    <div class="card"><h2>${t('Recent photos')}</h2><div class="photos" style="margin-top:10px">${photos.length ? photos.map(p => `<img src="${p.src}" alt="${esc(p.caption)}" data-a="photo" data-id="${p.id}">`).join('') : '<span class="muted">${t("Nothing yet")}</span>'}</div></div>
    <div class="card"><h2>${t('Milestones')}</h2><div class="list" style="margin-top:6px">${ms.map(m => `<div class="row"><div class="grow"><div class="t">${esc(m.name)}</div><div class="muted small">${esc(m.p.name)}</div></div><b>${fmtShort(m.date)}</b></div>`).join('') || '<span class="muted">–</span>'}</div>
    <h2 style="margin-top:14px">${t('Recent activity')}</h2><div class="list small" style="margin-top:6px">${S.audit.slice(0, 5).map(a => `<div><b>${esc(uname(a.by))}</b> ${esc(a.action)} ${esc(a.refType)} “${esc((a.text || '').slice(0, 50))}” <span class="muted">${fmtTime(a.at)}</span></div>`).join('')}</div></div></div>`;
}
function vSubHome() {
  const mine = visibleIssues().filter(isOpen);
  return `<div><h1>Hello, ${esc(me().name.split(' ')[0])}</h1><div class="muted">${esc(me().company || '')} · Subcontractor view – you only see items assigned to you</div></div>
  <div class="card"><h2>Your open items (${mine.length})</h2><div class="list">${mine.map(i => issueRow(i, true)).join('') || empty('Nothing assigned', 'You are all caught up.')}</div></div>`;
}

/* ---------- projects ---------- */
function vProjects() {
  const ps = visibleProjects();
  return `<div class="row"><h1 class="grow">${t('Projects')}</h1>${can.manage() ? `<button class="btn primary" data-a="newProject">+ ${t('New project')}</button>` : ''}</div>
  ${ps.length ? `<div class="grid g2">${ps.map(projectCard).join('')}</div>` : empty('No projects yet', 'Create a project to start.', can.manage() ? `<button class="btn primary" data-a="newProject">+ ${t('New project')}</button>` : '')}`;
}
function vProject(id, tab) {
  const p = proj(id); if (!p) return empty('Project not found', '');
  lastProject = id;
  const sub = isSub();
  const tabs = sub ? [['issues', 'Issues']] : [['overview', 'Overview'], ['diary', 'Diary'], ['issues', 'Issues'], ['photos', 'Photos'], ['checklists', 'Checklists'], ['files', 'Files']];
  if (sub) tab = 'issues';
  const h = health(p);
  const head = `<div class="card col"><div class="row"><span class="dot ${h.level === 'green' ? '' : h.level}"></span><h1 class="grow">${esc(p.name)}</h1>${pstatusPill(p.status)}${can.manage() ? `<button class="btn sm" data-a="editProject" data-id="${p.id}">Edit</button>` : ''}</div>
    <div class="muted">${esc(p.client)} · ${esc(p.location)} · ${fmtDate(p.start)} → ${fmtDate(p.end)}${p.value && !sub ? ' · ' + money(p.value) : ''}</div></div>
    <div class="tabs">${tabs.map(([k, l]) => `<a href="#/p/${id}/${k}" class="${tab === k ? 'on' : ''}">${t(l)}</a>`).join('')}</div>`;
  const body = { overview: tOverview, diary: tDiary, issues: tIssues, photos: tPhotos, checklists: tChecklists, files: tFiles }[tab] || tOverview;
  return head + body(p);
}
function tOverview(p) {
  const iss = S.issues.filter(i => i.projectId === p.id);
  const latest = S.diary.filter(d => d.projectId === p.id).sort((a, b) => b.date.localeCompare(a.date))[0];
  const h = health(p);
  return `<div class="kpis"><div class="kpi"><b>${iss.filter(isOpen).length}</b><span>${t('Open issues')}</span></div><div class="kpi ${h.od ? 'bad' : ''}"><b>${h.od}</b><span>${t('Overdue')}</span></div>
    <div class="kpi"><b>${h.crit}</b><span>High priority</span></div><div class="kpi"><b>${iss.filter(i => i.cost && isOpen(i)).length}</b><span>${t('Cost impact')}</span></div></div>
  <div class="grid g2"><div class="card"><div class="row"><h2 class="grow">${t('Milestones')}</h2>${can.manage() ? `<button class="btn sm" data-a="addMilestone" data-id="${p.id}">+</button>` : ''}</div><div class="list">
    ${(p.milestones || []).sort((a, b) => a.date.localeCompare(b.date)).map(m => `<label class="inline" style="padding:10px 0"><input type="checkbox" data-a="toggleMs" data-id="${p.id}" data-m="${m.id}" ${m.done ? 'checked' : ''} ${can.manage() ? '' : 'disabled'}><span class="grow" style="${m.done ? 'text-decoration:line-through;color:var(--mute)' : ''}">${esc(m.name)}</span><span class="muted small">${fmtShort(m.date)}</span></label>`).join('') || '<div class="muted">–</div>'}</div></div>
  <div class="card"><h2>${t('Team members')}</h2><div class="list">${p.team.map(id => by(id)).filter(Boolean).map(u => `<div class="row"><div class="grow"><div class="t">${esc(u.name)}</div><div class="muted small">${esc(u.company || u.title || '')}</div></div>${pill(u.sub ? 'Subcontractor' : u.role)}</div>`).join('')}</div></div></div>
  <div class="card"><h2>Latest diary</h2>${latest ? `<div class="item" data-a="diary" data-id="${latest.id}" style="margin-top:8px"><div class="grow"><b>${fmtDate(latest.date)}</b> ${WICON[latest.weather] || ''}<div class="muted">${esc(diarySummary(latest))}</div></div></div>` : empty('No diary yet', 'Log today in under a minute.', can.write() ? `<button class="btn primary" data-a="newDiary" data-id="${p.id}">+ ${t('Daily log')}</button>` : '')}</div>
  <div class="card"><h2>${t('Export')}</h2><div class="row" style="margin-top:8px"><a class="btn sm" href="#/report/diary/${p.id}">Site diary</a><a class="btn sm" href="#/report/issues/${p.id}">Issue list</a><a class="btn sm" href="#/report/photos/${p.id}">Photo pack</a></div></div>`;
}
function tDiary(p) {
  const ds = S.diary.filter(d => d.projectId === p.id).sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="row"><h2 class="grow">${t('Daily log')}</h2>${can.write() ? `<button class="btn primary" data-a="newDiary" data-id="${p.id}">+ ${t('Daily log')}</button>` : ''}<a class="btn sm" href="#/report/diary/${p.id}">PDF / CSV</a></div>
  <div class="card list">${ds.map(d => `<div class="item" data-a="diary" data-id="${d.id}"><div class="grow col" style="gap:4px"><div class="row"><b>${fmtDate(d.date)}</b><span>${WICON[d.weather] || ''}</span>${pill(labourTotal(d) + ' on site')}${d.blockers ? pill('Blocker', 'warn') : ''}${d.incidents ? pill('Incident', 'bad') : ''}<span class="muted small right">${esc(uname(d.by))}</span></div><div class="muted">${esc(diarySummary(d))}</div>${thumbs(d.photos)}</div></div>`).join('') || empty('No diary entries', 'The daily log is the heartbeat of the site.')}</div>`;
}
function issueRow(i, showProj) {
  const od = isOverdue(i);
  return `<div class="item" data-a="issue" data-id="${i.id}"><div class="grow col" style="gap:4px"><div class="t">${esc(i.title)}</div>
    <div class="row">${statusPill(i.status)}${prioPill(i.priority)}${i.type !== 'issue' ? pill(t(i.type === 'snag' ? 'Snag' : 'Task')) : ''}${i.cost ? pill('€ impact', 'warn') : ''}${od ? pill('Overdue', 'bad') : ''}<span class="muted small">${showProj ? esc(pname(i.projectId)) + ' · ' : ''}${esc(uname(i.owner))} · ${fmtShort(i.due)}</span></div></div>${(i.photos || [])[0] ? thumbs([i.photos[0]]) : ''}</div>`;
}
function tIssues(p) {
  const list = visibleIssues().filter(i => i.projectId === p.id).sort((a, b) => (isOpen(b) - isOpen(a)) || (a.due || '9').localeCompare(b.due || '9'));
  return `<div class="row"><h2 class="grow">${t('Issues')}</h2>${can.write() && !isSub() ? `<button class="btn primary" data-a="newIssue" data-id="${p.id}">+ ${t('New issue')}</button>` : ''}<a class="btn sm" href="#/report/issues/${p.id}">PDF / CSV</a></div>
  <div class="card list">${list.map(i => issueRow(i)).join('') || empty('No issues', 'Nice – or nobody has reported any yet.')}</div>`;
}
function tPhotos(p) {
  const ph = S.photos.filter(x => x.projectId === p.id).sort((a, b) => b.at - a.at);
  return `<div class="row"><h2 class="grow">${t('Photos')}</h2>${can.write() ? `<button class="btn primary" data-a="newPhoto" data-id="${p.id}">📷 ${t('Take photo')}</button>` : ''}<a class="btn sm" href="#/report/photos/${p.id}">Photo pack</a></div>
  <div class="card">${ph.length ? `<div class="photos">${ph.map(x => `<img src="${x.src}" alt="${esc(x.caption)}" data-a="photo" data-id="${x.id}" loading="lazy">`).join('')}</div>` : empty('No photos yet', 'Every photo is stamped with date, time and person.')}</div>`;
}
function tChecklists(p) {
  const cl = S.checklists.filter(c => c.projectId === p.id).sort((a, b) => b.at - a.at);
  return `<div class="row"><h2 class="grow">${t('Checklists')}</h2>${can.write() ? `<button class="btn primary" data-a="newChecklist" data-id="${p.id}">+ Start checklist</button>` : ''}</div>
  <div class="card list">${cl.map(c => { const n = c.items.filter(i => i.v === 'no').length, y = c.items.filter(i => i.v === 'yes').length; return `<div class="item" data-a="checklist" data-id="${c.id}"><div class="grow"><div class="t">${esc(c.name)}</div><div class="muted small">${fmtTime(c.at)} · ${esc(uname(c.by))}</div></div>${pill(y + '/' + c.items.length + ' ✓', 'ok')}${n ? pill(n + ' failed', 'bad') : ''}</div>`; }).join('') || empty('No checklists run', 'Scoping, safety walk, QA and handover templates included.')}</div>`;
}
function tFiles(p) {
  const fs = S.files.filter(f => f.projectId === p.id && !f.refId);
  return `<div class="row"><h2 class="grow">${t('Files')}</h2>${can.write() ? `<label class="btn primary" style="cursor:pointer;color:var(--brand-ink)">+ Attach file<input type="file" class="hide" data-file="${p.id}"></label>` : ''}</div>
  <div class="card list">${fs.map(f => `<div class="row"><span>📄</span><div class="grow"><a href="${f.data}" download="${esc(f.name)}" class="t">${esc(f.name)}</a><div class="muted small">${(f.size / 1024).toFixed(0)} KB · ${esc(uname(f.by))} · ${fmtTime(f.at)}</div></div></div>`).join('') || empty('No files', 'Attach drawings, permits, certificates (max 1.5 MB in this prototype).')}</div>`;
}

/* ---------- issues (global) ---------- */
function vIssues(q) {
  const f = q.get('f') || 'open', pid = q.get('p') || '';
  let l = visibleIssues();
  if (pid) l = l.filter(i => i.projectId === pid);
  if (f === 'open') l = l.filter(isOpen); else if (f === 'overdue') l = l.filter(isOverdue);
  else if (f === 'mine') l = l.filter(i => i.owner === S.me && isOpen(i)); else if (f === 'cost') l = l.filter(i => i.cost && isOpen(i));
  else if (f === 'closed') l = l.filter(i => !isOpen(i));
  l.sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const chip = (k, lb) => `<a class="chip ${f === k ? 'on' : ''}" style="${f === k ? 'background:var(--brand);color:var(--brand-ink)' : ''}" href="#/issues?f=${k}${pid ? '&p=' + pid : ''}">${lb}</a>`;
  return `<div class="row"><h1 class="grow">${t('Issues')}</h1>${can.write() && !isSub() ? `<button class="btn primary" data-a="newIssue">+ ${t('New issue')}</button>` : ''}</div>
  <div class="chips">${chip('open', t('Open'))}${chip('overdue', t('Overdue'))}${chip('mine', 'Mine')}${chip('cost', t('Cost impact'))}${chip('closed', 'Done')}${chip('all', 'All')}</div>
  <div class="card list">${l.map(i => issueRow(i, true)).join('') || empty('Nothing here', 'No items match this filter.')}</div>`;
}

/* ---------- detail modals ---------- */
function commentsBlock(type, id) {
  const cs = S.comments.filter(c => c.refType === type && c.refId === id).sort((a, b) => a.at - b.at);
  const names = S.users.map(u => u.name.split(' ')[0]);
  return `<div class="col"><h3>${t('Comments')} (${cs.length})</h3>${cs.map(c => `<div class="card" style="padding:10px"><div class="small"><b>${esc(uname(c.by))}</b> <span class="muted">${fmtTime(c.at)}</span></div><div>${esc(c.text).replace(/@(\w+)/g, '<b style="color:var(--brand)">@$1</b>')}</div></div>`).join('')}
  ${can.write() ? `<form data-form="comment" class="col"><input type="hidden" name="type" value="${type}"><input type="hidden" name="id" value="${id}"><textarea name="text" placeholder="Write a comment… use @${esc(names[1] || 'name')} to mention" required style="min-height:56px"></textarea><button class="btn primary sm" style="align-self:flex-end">${t('Add comment')}</button></form>` : ''}</div>`;
}
function openIssue(id) {
  const i = S.issues.find(x => x.id === id); if (!i) { location.hash = '#/issues'; return; }
  const canEdit = can.write() && !(isSub() && i.owner !== S.me);
  const hist = S.audit.filter(a => a.refType === 'issue' && a.refId === id).slice(0, 8);
  const fs = S.files.filter(f => f.refId === id);
  const owners = S.users.map(u => `<option value="${u.id}" ${u.id === i.owner ? 'selected' : ''}>${esc(u.name)}${u.company ? ' · ' + esc(u.company) : ''}</option>`).join('');
  openModal(`<div class="mh"><h2 class="grow">${esc(i.title)}</h2>${canEdit && !isSub() ? `<button class="btn sm" data-a="editIssue" data-id="${id}">Edit</button>` : ''}<button class="btn sm" data-a="close">✕</button></div>
  <div class="mb"><div class="row">${statusPill(i.status)}${prioPill(i.priority)}${i.cost ? pill('€ impact', 'warn') : ''}${isOverdue(i) ? pill('Overdue', 'bad') : ''}${(i.tags || []).map(x => `<span class="tag">#${esc(x)}</span>`).join('')}</div>
  <div class="muted small">${esc(pname(i.projectId))} · ${t('Due')} ${fmtDate(i.due)} · created ${fmtTime(i.created)} by ${esc(uname(i.createdBy))}</div>
  <p style="margin:0">${nl2(i.desc || '')}</p>${(i.photos || []).length ? `<div class="photos">${i.photos.map(pid => { const p = S.photos.find(x => x.id === pid); return p ? `<img src="${p.src}" alt="" data-a="photo" data-id="${pid}">` : ''; }).join('')}</div>` : ''}
  ${canEdit ? `<div class="grid g3"><label>${t('Status')}<select data-a="setStatus" data-id="${id}">${Object.entries(STATUS).filter(([k]) => k !== 'closed' || can.manage()).map(([k, v]) => `<option value="${k}" ${k === i.status ? 'selected' : ''}>${t(v)}</option>`).join('')}</select></label>
    ${!isSub() ? `<label>${t('Owner')}<select data-a="setOwner" data-id="${id}">${owners}</select></label>` : ''}</div>` : ''}
  <div class="col"><div class="row"><h3 class="grow">${t('Files')}</h3>${canEdit ? `<label class="btn sm" style="cursor:pointer">+ Attach<input type="file" class="hide" data-file="${i.projectId}" data-ref="${id}"></label>` : ''}</div>${fs.map(f => `<a href="${f.data}" download="${esc(f.name)}">📄 ${esc(f.name)}</a>`).join('') || '<span class="muted small">–</span>'}</div>
  ${commentsBlock('issue', id)}
  <div class="col"><h3>${t('Audit trail')}</h3><div class="small muted">${hist.map(a => `${fmtTime(a.at)} · ${esc(uname(a.by))} ${esc(a.action)}`).join('<br>')}</div></div></div>`);
}
function openDiary(id) {
  const d = S.diary.find(x => x.id === id); if (!d) return;
  const sec = (l, v) => v ? `<div><h3>${t(l)}</h3><div>${nl2(v)}</div></div>` : '';
  openModal(`<div class="mh"><h2 class="grow">${esc(pname(d.projectId))} · ${fmtDate(d.date)}</h2>${can.write() ? `<button class="btn sm" data-a="editDiary" data-id="${id}">Edit</button>` : ''}<button class="btn sm" data-a="close">✕</button></div>
  <div class="mb"><div class="row">${WICON[d.weather] || ''} ${esc(d.weather || '')} ${pill(labourTotal(d) + ' on site')}<span class="muted small">by ${esc(uname(d.by))}, ${fmtTime(d.at)}</span></div>
  <div class="ai small"><span class="spark">✦</span> ${esc(diarySummary(d))}</div>
  <div>${(d.labour || []).map(l => pill(`${l.count} ${l.trade}`)).join(' ')}</div>
  ${sec('Work completed', d.work)}${sec('Deliveries', d.deliveries)}${sec('Visitors', d.visitors)}${sec('Blockers', d.blockers)}${sec('Incidents / near misses', d.incidents)}${thumbs(d.photos)}
  ${commentsBlock('diary', id)}</div>`);
}
function openPhoto(id) {
  const p = S.photos.find(x => x.id === id); if (!p) return;
  openModal(`<div class="mh"><h2 class="grow">${esc(p.caption || 'Photo')}</h2><button class="btn sm" data-a="close">✕</button></div><div class="mb"><img src="${p.src}" alt="${esc(p.caption)}" style="width:100%;border-radius:10px">
  <div class="muted small">${esc(pname(p.projectId))} · 📅 ${fmtTime(p.at)} · 👤 ${esc(uname(p.by))}</div><div>${(p.tags || []).map(x => `<span class="tag">#${esc(x)}</span>`).join(' ')}</div>${commentsBlock('photo', id)}</div>`);
}
function reopen(type, id) { ({ issue: openIssue, diary: openDiary, photo: openPhoto }[type])(id); }

function openChecklist(id) {
  const c = S.checklists.find(x => x.id === id); if (!c) return;
  const fails = c.items.filter(i => i.v === 'no');
  openModal(`<div class="mh"><h2 class="grow">${esc(c.name)}</h2><button class="btn sm" data-a="close">✕</button></div><div class="mb"><div class="muted small">${esc(pname(c.projectId))} · ${fmtTime(c.at)} · ${esc(uname(c.by))}</div>
  <div>${c.items.map((it, k) => `<div class="check"><span class="grow">${esc(it.t)}${it.note ? `<div class="muted small">${esc(it.note)}</div>` : ''}</span>${it.v === 'yes' ? pill('Pass', 'ok') : it.v === 'no' ? pill('Fail', 'bad') : pill('N/A')}</div>`).join('')}</div>
  ${fails.length && can.write() ? `<button class="btn primary" data-a="raiseFails" data-id="${id}">Raise ${fails.length} issue${fails.length > 1 ? 's' : ''} from failed items</button>` : ''}</div>`);
}

/* ---------- search / ask / inbox / team / settings / report ---------- */
function searchAll(q) {
  const l = q.toLowerCase().trim(); if (!l) return { projects: [], issues: [], photos: [], diary: [] };
  const has = (...a) => a.some(x => String(x || '').toLowerCase().includes(l));
  const vp = new Set(visibleProjects().map(p => p.id));
  return {
    projects: visibleProjects().filter(p => has(p.name, p.client, p.location)),
    issues: visibleIssues().filter(i => has(i.title, i.desc, (i.tags || []).join(' '), pname(i.projectId))),
    photos: isSub() ? [] : S.photos.filter(p => vp.has(p.projectId) && has(p.caption, (p.tags || []).join(' '))),
    diary: isSub() ? [] : S.diary.filter(d => vp.has(d.projectId) && has(d.work, d.deliveries, d.visitors, d.blockers, d.incidents))
  };
}
function vSearch(q) {
  const r = searchAll(q);
  const n = r.projects.length + r.issues.length + r.photos.length + r.diary.length;
  return `<h1>${t('Search')}: “${esc(q)}”</h1>${!n ? empty('No results', 'Try a project name, a trade, or a word from a diary entry.') : ''}
  ${r.projects.length ? `<div class="grid g2">${r.projects.map(projectCard).join('')}</div>` : ''}
  ${r.issues.length ? `<div class="card"><h2>${t('Issues')}</h2><div class="list">${r.issues.map(i => issueRow(i, true)).join('')}</div></div>` : ''}
  ${r.diary.length ? `<div class="card"><h2>${t('Diary')}</h2><div class="list">${r.diary.map(d => `<div class="item" data-a="diary" data-id="${d.id}"><div><b>${esc(pname(d.projectId))} · ${fmtShort(d.date)}</b><div class="muted">${esc(diarySummary(d))}</div></div></div>`).join('')}</div></div>` : ''}
  ${r.photos.length ? `<div class="card"><h2>${t('Photos')}</h2><div class="photos">${r.photos.map(p => `<img src="${p.src}" alt="${esc(p.caption)}" data-a="photo" data-id="${p.id}">`).join('')}</div></div>` : ''}`;
}

function answer(q) {
  const l = q.toLowerCase(), t0 = today();
  const p = S.projects.find(p => p.name.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3 && !['office', 'block'].includes(w)).some(w => l.includes(w)));
  const scope = p ? S.issues.filter(i => i.projectId === p.id) : S.issues;
  const iss = arr => arr.length ? `<div class="list">${arr.slice(0, 6).map(i => `<div><a href="#/i/${i.id}"><b>${esc(i.title)}</b></a><div class="muted small">${esc(pname(i.projectId))} · ${esc(uname(i.owner))} · due ${fmtShort(i.due)}</div></div>`).join('')}</div>` : '<div class="muted">None 🎉</div>';
  if (/overdue|late|behind/.test(l) && !/deliver/.test(l)) { const r = scope.filter(isOverdue); return `<b>${r.length} overdue item${r.length === 1 ? '' : 's'}${p ? ' on ' + esc(p.name) : ''}:</b>${iss(r)}`; }
  if (/block|delay|stuck/.test(l)) {
    const r = S.diary.filter(d => d.blockers && d.date >= addDays(t0, -7) && (!p || d.projectId === p.id)).sort((a, b) => b.date.localeCompare(a.date));
    return `<b>${r.length} blocker${r.length === 1 ? '' : 's'} logged in the last 7 days:</b><div class="list">${r.map(d => `<div><a data-a="diary" data-id="${d.id}" href="javascript:void 0"><b>${esc(pname(d.projectId))} · ${fmtShort(d.date)}</b></a><div>${esc(d.blockers)}</div></div>`).join('') || '<div class="muted">None</div>'}</div>`;
  }
  if (/diary|log|missing|submitted/.test(l)) { const m = S.projects.filter(p => p.status === 'active' && !diaryFor(p.id, t0)); return m.length ? `<b>No diary yet today:</b> ${m.map(p => `<a href="#/p/${p.id}/diary">${esc(p.name)}</a>`).join(', ')}` : 'Every active project has today’s diary. ✅'; }
  if (/safety|incident|near miss|accident/.test(l)) {
    const inc = S.diary.filter(d => d.incidents && (!p || d.projectId === p.id));
    return `<b>${inc.length} incident/near-miss entr${inc.length === 1 ? 'y' : 'ies'}</b><div class="list">${inc.map(d => `<div><b>${esc(pname(d.projectId))} · ${fmtShort(d.date)}</b><div>${esc(d.incidents)}</div></div>`).join('')}</div><b>Open safety items:</b>${iss(scope.filter(i => isOpen(i) && (i.tags || []).includes('safety')))}`;
  }
  if (/cost|variation|money|€|budget/.test(l)) return `<b>Cost-impacting open items:</b>${iss(scope.filter(i => i.cost && isOpen(i)))}`;
  if (/labour|headcount|people|workers|on site/.test(l)) {
    const rows = S.projects.filter(p => p.status === 'active').map(p => { const d = S.diary.filter(x => x.projectId === p.id).sort((a, b) => b.date.localeCompare(a.date))[0]; return `<div>${esc(p.name)}: <b>${d ? labourTotal(d) : '–'}</b> <span class="muted small">${d ? '(' + fmtShort(d.date) + ')' : ''}</span></div>`; });
    return `<b>Latest labour counts:</b><div class="list">${rows.join('')}</div>`;
  }
  if (/photo|picture|image/.test(l)) { const ph = S.photos.filter(x => !p || x.projectId === p.id).sort((a, b) => b.at - a.at).slice(0, 6); return `<b>Latest photos${p ? ' – ' + esc(p.name) : ''}:</b><div class="photos" style="margin-top:8px">${ph.map(x => `<img src="${x.src}" alt="" data-a="photo" data-id="${x.id}">`).join('')}</div>`; }
  if (p && /status|summary|how|update|going/.test(l)) {
    const h = health(p), d = S.diary.filter(x => x.projectId === p.id).sort((a, b) => b.date.localeCompare(a.date))[0];
    return `<b>${esc(p.name)}</b> is <b>${h.level}</b>: ${scope.filter(isOpen).length} open items, ${h.od} overdue, ${h.crit} high-priority. ${d ? 'Latest diary (' + fmtShort(d.date) + '): ' + esc(diarySummary(d)) : 'No diary yet.'}`;
  }
  if (/my|mine|assigned/.test(l)) return `<b>Assigned to you:</b>${iss(S.issues.filter(i => i.owner === S.me && isOpen(i)))}`;
  const r = searchAll(q), n = r.issues.length + r.diary.length + r.photos.length + r.projects.length;
  return n ? `I found ${n} match${n > 1 ? 'es' : ''}. <a href="#/search?q=${encodeURIComponent(q)}">Open results →</a>` : 'I couldn’t find that. Try “overdue issues”, “blockers this week”, “who hasn’t logged today?” or a project name.';
}
function vAsk(q) {
  if (q && !chat.length) { chat.push({ me: 1, html: esc(q) }, { html: answer(q) }); }
  const sugg = ['Overdue issues', 'Blockers this week', 'Missing diaries today', 'Safety incidents', 'Cost-impacting items', 'Labour on site', 'Rhein status'];
  return `<div><h1><span class="spark">✦</span> ${t('Ask Mena')}</h1><div class="muted">Ask about your sites in plain language. Prototype uses built-in rules; production connects an LLM over your project data.</div></div>
  <div class="card col"><div class="chat" id="chatlog" style="max-height:52vh;overflow:auto">${chat.map(m => `<div class="msg ${m.me ? 'me' : 'bot'}">${m.html}</div>`).join('') || '<div class="muted">Try one of these:</div>'}</div>
  <div class="chips">${sugg.map(s => `<span class="chip" data-a="ask" data-q="${esc(s)}">${esc(s)}</span>`).join('')}</div>
  <form data-form="ask" class="row" style="flex-wrap:nowrap"><input name="q" placeholder="e.g. what’s overdue on Docklands?" required><button class="btn primary">Ask</button></form></div>`;
}
function vInbox() {
  const ns = S.notes.filter(n => n.to === S.me);
  return `<div class="row"><h1 class="grow">${t('Inbox')}</h1><button class="btn sm" data-a="readAll">${t('Mark all read')}</button></div>
  <div class="card list">${ns.map(n => `<a class="item" href="${n.link || '#/'}" data-a="read" data-id="${n.id}" style="color:var(--ink)"><span>${n.read ? '' : '🔵'}</span><div class="grow"><div class="${n.read ? '' : 't'}">${esc(n.text)}</div><div class="muted small">${fmtTime(n.at)} · also emailed</div></div></a>`).join('') || empty('All caught up', 'Assignments, mentions and overdue reminders land here (and by email).')}</div>`;
}
function vTeam() {
  return `<div class="row"><h1 class="grow">${t('Team')}</h1>${can.admin() ? `<button class="btn primary" data-a="invite">+ ${t('Invite')}</button>` : ''}</div>
  <div class="card list">${S.users.map(u => `<div class="row"><div class="grow"><div class="t">${esc(u.name)}</div><div class="muted small">${esc(u.email)}${u.company ? ' · ' + esc(u.company) : ''}${u.pending ? ' · invited' : ''}</div></div>
    ${can.admin() && !u.sub ? `<select data-a="setRole" data-id="${u.id}" style="width:auto">${ROLES.map(r => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}</select>` : pill(u.sub ? 'Subcontractor · limited' : u.role)}</div>`).join('')}</div>
  <div class="card small muted"><b>Roles.</b> Admin: everything incl. team &amp; billing · Manager: projects, closing issues · Site User: diary, issues, photos, checklists · Viewer: read-only (clients, directors). Subcontractors see only items assigned to them.</div>`;
}
function vSettings() {
  return `<h1>${t('Settings')}</h1>
  <div class="card col"><h2>${t('Language')} &amp; region</h2><select data-a="lang" style="max-width:260px"><option value="en" ${lang() === 'en' ? 'selected' : ''}>English (EUR, DD Mon YYYY)</option><option value="de" ${lang() === 'de' ? 'selected' : ''}>Deutsch (EUR, DE-Format)</option></select></div>
  <div class="card col"><h2>${t('Plan & pricing')}</h2><div class="price">€1,190 <span class="muted small" style="font-weight:400">/ month · billed annually (€14,280/yr)</span></div>
    <div>Flat price. Unlimited users &amp; subcontractors, up to 30 active projects, all modules, AI included. No per-seat fees, no setup fee, cancel anytime.</div><div class="muted small">Typical mid-size contractors pay €10k–€25k / year across several tools – Mena replaces the diary, snagging, photo and checklist apps.</div></div>
  <div class="card col"><h2>${t('Audit trail')}</h2><div class="list small">${S.audit.slice(0, 12).map(a => `<div>${fmtTime(a.at)} · <b>${esc(uname(a.by))}</b> ${esc(a.action)} ${esc(a.refType)} “${esc((a.text || '').slice(0, 60))}”</div>`).join('')}</div></div>
  <div class="card col"><h2>Prototype data</h2><div class="row"><button class="btn" data-a="loadDemo">Load demo projects</button><button class="btn danger" data-a="reset">Reset everything</button></div></div>`;
}

function vReport(type, pid) {
  const p = proj(pid); if (!p) return empty('Not found', '');
  const bar = `<div class="row noprint"><a class="btn sm" href="#/p/${pid}">← Back</a><button class="btn primary sm" data-a="print">Print / Save PDF</button>${type !== 'photos' ? `<button class="btn sm" data-a="csv" data-type="${type}" data-id="${pid}">CSV</button>` : ''}</div>`;
  const head = `<div><h1>${esc(p.name)} – ${{ diary: 'Site diary', issues: 'Issue list', photos: 'Photo pack' }[type]}</h1><div class="muted">${esc(p.client)} · ${esc(p.location)} · generated ${fmtTime(Date.now())} by ${esc(me().name)}</div></div>`;
  if (type === 'diary') return bar + head + S.diary.filter(d => d.projectId === pid).sort((a, b) => a.date.localeCompare(b.date)).map(d => `<div class="card" style="break-inside:avoid"><h3>${fmtDate(d.date)} · ${esc(d.weather || '')} · ${labourTotal(d)} on site</h3><div>${(d.labour || []).map(l => `${l.count} ${esc(l.trade)}`).join(', ')}</div><p>${nl2(d.work || '')}</p>${d.deliveries ? `<div><b>Deliveries:</b> ${esc(d.deliveries)}</div>` : ''}${d.visitors ? `<div><b>Visitors:</b> ${esc(d.visitors)}</div>` : ''}${d.blockers ? `<div><b>Blockers:</b> ${esc(d.blockers)}</div>` : ''}${d.incidents ? `<div><b>Incidents:</b> ${esc(d.incidents)}</div>` : ''}<div class="muted small">Recorded by ${esc(uname(d.by))}, ${fmtTime(d.at)}</div></div>`).join('');
  if (type === 'issues') return bar + head + `<div class="card"><table><tr><th>Title</th><th>Status</th><th>Priority</th><th>Owner</th><th>Due</th></tr>${S.issues.filter(i => i.projectId === pid).map(i => `<tr><td>${esc(i.title)}</td><td>${t(STATUS[i.status])}</td><td>${t(PRIO[i.priority])}</td><td>${esc(uname(i.owner))}</td><td>${fmtDate(i.due)}</td></tr>`).join('')}</table></div>`;
  return bar + head + `<div class="grid g3">${S.photos.filter(x => x.projectId === pid).sort((a, b) => a.at - b.at).map(x => `<div style="break-inside:avoid"><img src="${x.src}" alt="" style="width:100%;border-radius:8px"><div class="small"><b>${esc(x.caption)}</b><br><span class="muted">${fmtTime(x.at)} · ${esc(uname(x.by))}</span></div></div>`).join('')}</div>`;
}

/* ---------- forms ---------- */
function labourRow(trade = '', count = '') {
  return `<div class="row lrow" style="flex-wrap:nowrap"><input name="trade" list="trades" placeholder="Trade" value="${esc(trade)}"><input name="count" type="number" min="0" placeholder="#" value="${esc(count)}" style="width:80px"><button type="button" class="btn sm" data-a="delRow" aria-label="Remove">✕</button></div>`;
}
function photoInput() {
  return `<div class="col"><label class="btn" style="cursor:pointer">📷 ${t('Take photo')} / add<input type="file" accept="image/*" capture="environment" multiple class="hide" data-photos></label><div id="pthumbs" class="thumbs"></div></div>`;
}
function projectForm(p = {}) {
  const team = S.users.map(u => `<label class="inline"><input type="checkbox" name="team" value="${u.id}" ${(p.team || [S.me]).includes(u.id) ? 'checked' : ''}>${esc(u.name)} <span class="muted small">${u.sub ? esc(u.company) : u.role}</span></label>`).join('');
  return `<input type="hidden" name="id" value="${p.id || ''}">${field('Name', 'name', p.name, 'required')}<div class="grid g2">${field('Client', 'client', p.client)}${field('Location', 'location', p.location)}</div>
  <div class="grid g3">${field('Start', 'start', p.start || today(), 'type="date" required')}${field('End', 'end', p.end || addDays(today(), 180), 'type="date" required')}${field('Value', 'value', p.value || '', 'type="number" placeholder="€"')}</div>
  <label>${t('Status')}<select name="status">${opts(PSTATUS, p.status || 'active')}</select></label><div class="col" style="gap:6px"><b class="small muted">${t('Team members')}</b>${team}</div>`;
}
function issueForm(i = {}, pid) {
  const owners = S.users.map(u => `<option value="${u.id}" ${u.id === (i.owner || '') ? 'selected' : ''}>${esc(u.name)}${u.company ? ' · ' + esc(u.company) : ''}</option>`).join('');
  return `<input type="hidden" name="id" value="${i.id || ''}"><label>${t('Title')}<input name="title" value="${esc(i.title || '')}" required placeholder="What's wrong / what needs doing?"></label>
  ${area('Description', 'desc', i.desc)}<div id="aihint" class="ai small hide"></div>
  <label>${t('Projects').replace(/s$/, '')}<select name="projectId">${projOpts(i.projectId || pid || lastProject)}</select></label>
  <div class="grid g3"><label>${t('Type')}<select name="type"><option value="issue" ${i.type === 'issue' ? 'selected' : ''}>${t('Issue')}</option><option value="snag" ${i.type === 'snag' ? 'selected' : ''}>${t('Snag')}</option><option value="task" ${i.type === 'task' ? 'selected' : ''}>${t('Task')}</option></select></label>
  <label>${t('Priority')}<select name="priority">${opts(PRIO, i.priority || 'medium')}</select></label>${field('Due', 'due', i.due || addDays(today(), 7), 'type="date"')}</div>
  <label>${t('Owner')}<select name="owner">${owners}</select></label>
  <label class="inline"><input type="checkbox" name="cost" ${i.cost ? 'checked' : ''}> ${t('Cost impact')}</label>${i.id ? '' : photoInput()}`;
}
function diaryForm(d = {}, pid) {
  const rows = (d.labour && d.labour.length ? d.labour : [{}, {}]).map(l => labourRow(l.trade, l.count)).join('');
  return `<input type="hidden" name="id" value="${d.id || ''}"><input type="hidden" name="projectId" value="${d.projectId || pid}">
  <div class="ai col" style="gap:8px"><b><span class="spark">✦</span> ${t('Quick note')}</b><textarea id="qn" placeholder="Just type or dictate: 8 bricklayers, 4 labourers, poured slab L2, rebar delivery 10am, rain in the afternoon, crane down for inspection" style="min-height:64px"></textarea><button type="button" class="btn sm" data-a="structure" style="align-self:flex-start">${t('Structure it')}</button></div>
  <div class="grid g2">${field('Start', 'date', d.date || today(), 'type="date" required').replace(t('Start'), 'Date')}<label>${t('Weather')}<select name="weather">${WEATHER.map(w => `<option ${w === (d.weather || 'Cloudy') ? 'selected' : ''} value="${w}">${WICON[w]} ${w}</option>`).join('')}</select></label></div>
  <div class="col" style="gap:6px"><b class="small muted">${t('Labour on site')}</b><div id="labour" class="col" style="gap:6px">${rows}</div><button type="button" class="btn sm" data-a="addRow" style="align-self:flex-start">+ Trade</button><datalist id="trades">${Object.values(TRADE_STEMS).map(x => `<option value="${x}">`).join('')}</datalist></div>
  ${area('Work completed', 'work', d.work)}${area('Deliveries', 'deliveries', d.deliveries, 'style="min-height:52px"')}${area('Visitors', 'visitors', d.visitors, 'style="min-height:52px"')}${area('Blockers', 'blockers', d.blockers, 'style="min-height:52px"')}${area('Incidents / near misses', 'incidents', d.incidents, 'style="min-height:52px"')}${photoInput()}`;
}
function quickMenu() {
  openModal(`<div class="mh"><h2 class="grow">Quick add</h2><button class="btn sm" data-a="close">✕</button></div><div class="mb"><div class="sw">
    <button class="btn" data-a="newDiary"><span>📝</span>${t('Daily log')}</button><button class="btn" data-a="newIssue"><span>⚑</span>${t('Report issue')}</button><button class="btn" data-a="newPhoto"><span>📷</span>${t('Take photo')}</button></div></div>`);
}
function pickProject(cb) {
  const vp = visibleProjects();
  const id = lastProject && proj(lastProject) ? lastProject : (vp[0] || {}).id;
  if (!id) { toast('Create a project first'); return; }
  cb(id);
}

const FORMS = {
  signup(fd) {
    const admin = { id: uid('u'), name: fd.get('name').trim(), role: 'Admin', email: fd.get('email').trim() };
    S.org = { name: fd.get('company').trim() }; S.users = [admin]; S.me = admin.id;
    if (fd.get('demo')) seedDemo();
    log('signed up', 'org', 'org', S.org.name); save(); location.hash = '#/'; render();
    if (!fd.get('demo')) toast('Welcome! Create your first project, then invite your team.');
  },
  search(fd) { location.hash = '#/search?q=' + encodeURIComponent(fd.get('q')); },
  ask(fd) { const q = fd.get('q'); chat.push({ me: 1, html: esc(q) }, { html: answer(q) }); render(); },
  comment(fd) {
    const type = fd.get('type'), id = fd.get('id'), text = fd.get('text').trim(); if (!text) return;
    S.comments.push({ id: uid('c'), refType: type, refId: id, by: S.me, text, at: Date.now() });
    const link = type === 'issue' ? '#/i/' + id : '#/';
    (text.match(/@(\w+)/g) || []).forEach(m => { const u = S.users.find(u => u.name.toLowerCase().startsWith(m.slice(1).toLowerCase())); if (u) notify(u.id, `${me().name} mentioned you: “${text.slice(0, 60)}”`, link); });
    if (type === 'issue') { const i = S.issues.find(x => x.id === id); if (i) notify(i.owner, `${me().name} commented on “${i.title}”`, link); log('commented on', 'issue', id, i.title, i.projectId); }
    save(); reopen(type, id);
  },
  project(fd) {
    const id = fd.get('id'), team = fd.getAll('team');
    const data = { name: fd.get('name').trim(), client: fd.get('client'), location: fd.get('location'), start: fd.get('start'), end: fd.get('end'), value: +fd.get('value') || 0, status: fd.get('status'), team };
    if (id) { Object.assign(proj(id), data); log('updated', 'project', id, data.name, id); }
    else { const p = { id: uid('p'), milestones: [], ...data }; S.projects.push(p); log('created', 'project', p.id, p.name, p.id); lastProject = p.id; location.hash = '#/p/' + p.id; }
    closeModal(); save(); render(); toast('Project saved');
  },
  milestone(fd) { proj(fd.get('id')).milestones.push({ id: uid('m'), name: fd.get('name'), date: fd.get('date'), done: false }); closeModal(); save(); render(); },
  async issue(fd) {
    const id = fd.get('id'), owner = fd.get('owner'), title = fd.get('title').trim();
    const ai = aiTag(title + ' ' + fd.get('desc'));
    const data = { title, desc: fd.get('desc'), projectId: fd.get('projectId'), type: fd.get('type'), priority: fd.get('priority'), due: fd.get('due'), owner, cost: !!fd.get('cost') };
    if (id) {
      const i = S.issues.find(x => x.id === id); if (i.owner !== owner) notify(owner, `${me().name} assigned you “${title}”`, '#/i/' + id);
      Object.assign(i, data, { tags: ai.tags }); log('updated', 'issue', id, title, i.projectId);
    } else {
      const nid = uid('i'), photos = await savePhotos(data.projectId, title, ai.tags, 'issue');
      S.issues.push({ id: nid, ...data, status: 'open', tags: ai.tags, photos, created: Date.now(), createdBy: S.me });
      log('created', 'issue', nid, title, data.projectId); notify(owner, `${me().name} assigned you “${title}”`, '#/i/' + nid);
    }
    lastProject = data.projectId; closeModal(); save(); render(); toast('Issue saved – owner notified');
  },
  async diary(fd) {
    const id = fd.get('id'), pid = fd.get('projectId'), date = fd.get('date');
    const trades = fd.getAll('trade'), counts = fd.getAll('count');
    const labour = trades.map((tr, k) => ({ trade: tr.trim(), count: +counts[k] || 0 })).filter(l => l.trade && l.count);
    const data = { date, weather: fd.get('weather'), labour, work: fd.get('work'), deliveries: fd.get('deliveries'), visitors: fd.get('visitors'), blockers: fd.get('blockers'), incidents: fd.get('incidents') };
    const photos = await savePhotos(pid, 'Diary ' + date, ['diary'], 'diary');
    let e = id ? S.diary.find(x => x.id === id) : diaryFor(pid, date);
    if (e) { Object.assign(e, data, { photos: [...(e.photos || []), ...photos] }); log('updated', 'diary', e.id, date, pid); }
    else { e = { id: uid('d'), projectId: pid, ...data, photos, by: S.me, at: Date.now() }; S.diary.push(e); log('created', 'diary', e.id, date, pid); }
    if (data.incidents) S.users.filter(u => u.role === 'Admin' || u.role === 'Manager').forEach(u => notify(u.id, `Incident logged on ${pname(pid)}: ${data.incidents.slice(0, 60)}`, '#/p/' + pid + '/diary'));
    lastProject = pid; closeModal(); save(); render(); toast('Diary saved');
  },
  async photo(fd) {
    const pid = fd.get('projectId'), cap = fd.get('caption') || 'Site photo';
    const n = (await savePhotos(pid, cap, aiTag(cap).tags, 'photo')).length;
    lastProject = pid; closeModal(); save(); render(); toast(n + ' photo(s) saved with time & user stamp');
  },
  checklist(fd) {
    const name = fd.get('template'), pid = fd.get('projectId');
    const items = CHECKLIST_TEMPLATES[name].map((tx, k) => ({ t: tx, v: fd.get('v' + k) || 'na', note: fd.get('n' + k) || '' }));
    const c = { id: uid('cl'), projectId: pid, name, items, by: S.me, at: Date.now() };
    S.checklists.push(c); log('completed', 'checklist', c.id, name, pid); closeModal(); save(); render(); toast('Checklist saved');
  },
  invite(fd) {
    const sub = !!fd.get('sub');
    S.users.push({ id: uid('u'), name: fd.get('name').trim(), email: fd.get('email').trim(), role: sub ? 'Site User' : fd.get('role'), sub, company: fd.get('company') || '', pending: true });
    log('invited', 'user', '', fd.get('name')); closeModal(); save(); render(); toast('Invite sent (simulated email)');
  }
};

async function savePhotos(projectId, caption, tags, refType) {
  const ids = [];
  for (const src of pend) { const id = uid('ph'); S.photos.push({ id, projectId, src, caption, tags, by: S.me, at: Date.now(), refType }); ids.push(id); }
  pend = []; return ids;
}

/* ---------- events ---------- */
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault(); FORMS[f.dataset.form](new FormData(f), f);
});
document.addEventListener('input', e => {
  const f = e.target.closest('form[data-form="issue"]'); if (!f || !['title', 'desc'].includes(e.target.name)) return;
  const txt = f.title.value + ' ' + f.desc.value, ai = aiTag(txt), box = $('#aihint');
  if (!ai.tags.length || txt.trim().length < 6) { box.classList.add('hide'); return; }
  box.classList.remove('hide');
  box.innerHTML = `<span class="spark">✦</span> Suggested: ${ai.tags.map(x => '#' + x).join(' ')} · priority <b>${ai.priority}</b> <button type="button" class="btn sm" data-a="applyAi" data-p="${ai.priority}" data-c="${ai.cost ? 1 : ''}">Apply</button>`;
});
document.addEventListener('change', async e => {
  const el = e.target;
  if (el.matches('[data-photos]')) {
    for (const f of el.files) { const s = await shrink(f); if (s) pend.push(s); }
    $('#pthumbs').innerHTML = pend.map(s => `<img src="${s}" alt="">`).join(''); return;
  }
  if (el.matches('[data-file]')) {
    const f = el.files[0]; if (!f) return;
    if (f.size > 1.5e6) { toast('File too large for prototype (max 1.5 MB)'); return; }
    S.files.push({ id: uid('f'), projectId: el.dataset.file, refType: el.dataset.ref ? 'issue' : 'project', refId: el.dataset.ref || '', name: f.name, size: f.size, data: await readFile(f), by: S.me, at: Date.now() });
    log('attached', 'file', '', f.name, el.dataset.file); if (save()) { el.dataset.ref ? openIssue(el.dataset.ref) : render(); toast('File attached'); } return;
  }
  const a = el.dataset.a;
  if (a === 'switch') { S.me = el.value; save(); location.hash = '#/'; render(); }
  if (a === 'lang') { S.lang = el.value; save(); render(); }
  if (a === 'setRole') { const u = by(el.dataset.id); u.role = el.value; log('changed role of', 'user', u.id, u.name); save(); toast('Role updated'); }
  if (a === 'setStatus') {
    const i = S.issues.find(x => x.id === el.dataset.id); i.status = el.value;
    if (el.value === 'closed') i.closedBy = S.me;
    log('set status ' + el.value + ' on', 'issue', i.id, i.title, i.projectId); notify(i.createdBy, `${me().name} set “${i.title}” to ${STATUS[i.status]}`, '#/i/' + i.id); save(); openIssue(i.id); render();
  }
  if (a === 'setOwner') { const i = S.issues.find(x => x.id === el.dataset.id); i.owner = el.value; log('reassigned', 'issue', i.id, i.title, i.projectId); notify(i.owner, `${me().name} assigned you “${i.title}”`, '#/i/' + i.id); save(); openIssue(i.id); toast('Reassigned – owner notified'); }
  if (a === 'toggleMs') { const m = proj(el.dataset.id).milestones.find(x => x.id === el.dataset.m); m.done = el.checked; log(m.done ? 'completed' : 'reopened', 'milestone', m.id, m.name, el.dataset.id); save(); render(); }
  if (a === 'tplPick') { const p = el.closest('form'); $('#tplitems').innerHTML = tplItems(el.value); }
});
const tplItems = name => CHECKLIST_TEMPLATES[name].map((tx, k) => `<div class="check"><span class="grow">${esc(tx)}</span><div class="seg" data-seg="${k}"><input type="hidden" name="v${k}" value="yes"><button type="button" class="on y" data-a="seg" data-v="yes">✓</button><button type="button" data-a="seg" data-v="no" class="n">✗</button><button type="button" data-a="seg" data-v="na" class="na">–</button></div></div><input name="n${k}" placeholder="Note (optional)" class="hide" data-note="${k}">`).join('');

const ACT = {
  close: closeModal,
  go(el) { location.hash = '#' + el.dataset.to; },
  quick: (el, ev) => { ev.preventDefault(); quickMenu(); },
  newProject() { openModal(mform('project', 'New project', projectForm())); },
  editProject(el) { openModal(mform('project', 'Edit project', projectForm(proj(el.dataset.id)))); },
  addMilestone(el) { openModal(mform('milestone', 'Milestone', `<input type="hidden" name="id" value="${el.dataset.id}">${field('Name', 'name', '', 'required')}${field('Due', 'date', addDays(today(), 14), 'type="date" required')}`)); },
  newIssue(el) { pend = []; pickProject(pid => openModal(mform('issue', 'New issue', issueForm({}, el.dataset.id || pid)))); },
  editIssue(el) { openModal(mform('issue', 'Edit issue', issueForm(S.issues.find(i => i.id === el.dataset.id)))); },
  newDiary(el) { pend = []; pickProject(pid => openModal(mform('diary', t('Daily log'), diaryForm({}, el.dataset.id || pid)))); },
  editDiary(el) { pend = []; openModal(mform('diary', t('Daily log'), diaryForm(S.diary.find(d => d.id === el.dataset.id)))); },
  newPhoto(el) { pend = []; pickProject(pid => openModal(mform('photo', t('Take photo'), `<label>${t('Projects').replace(/s$/, '')}<select name="projectId">${projOpts(el.dataset.id || pid)}</select></label>${photoInput()}${field('Description', 'caption', '', 'placeholder="What does this show?"')}`))); },
  newChecklist(el) {
    const names = Object.keys(CHECKLIST_TEMPLATES);
    openModal(mform('checklist', 'Start checklist', `<input type="hidden" name="projectId" value="${el.dataset.id}"><label>Template<select name="template" data-a="tplPick">${names.map(n => `<option>${esc(n)}</option>`).join('')}</select></label><div id="tplitems">${tplItems(names[0])}</div>`));
  },
  seg(el) {
    const seg = el.closest('.seg'), k = seg.dataset.seg;
    seg.querySelector('input').value = el.dataset.v;
    $$('button', seg).forEach(b => b.classList.remove('on')); el.classList.add('on');
    const note = $(`[data-note="${k}"]`); note.classList.toggle('hide', el.dataset.v !== 'no');
  },
  invite() { openModal(mform('invite', 'Invite to team', `${field('Name', 'name', '', 'required')}${field('Work email', 'email', '', 'type="email" required')}<label>Role<select name="role">${ROLES.map(r => `<option ${r === 'Site User' ? 'selected' : ''}>${r}</option>`).join('')}</select></label><label class="inline"><input type="checkbox" name="sub"> Subcontractor (sees only items assigned to them)</label>${field('Company name', 'company')}`, 'Invite')); },
  issue(el) { openIssue(el.dataset.id); },
  diary(el) { openDiary(el.dataset.id); },
  photo(el) { openPhoto(el.dataset.id); },
  checklist(el) { openChecklist(el.dataset.id); },
  addRow() { $('#labour').insertAdjacentHTML('beforeend', labourRow()); },
  delRow(el) { el.closest('.lrow').remove(); },
  applyAi(el) { const f = el.closest('form'); f.priority.value = el.dataset.p; if (el.dataset.c) f.cost.checked = true; },
  structure() {
    const txt = $('#qn').value; if (!txt.trim()) return;
    const r = parseQuickNote(txt), f = $('#modal form');
    const join = (a, b) => a.value = [a.value, ...b].filter(Boolean).join('\n');
    if (r.weather) f.weather.value = r.weather;
    join(f.work, r.work); join(f.deliveries, r.deliveries); join(f.visitors, r.visitors); join(f.blockers, r.blockers); join(f.incidents, r.incidents);
    if (r.labour.length) $('#labour').innerHTML = r.labour.map(l => labourRow(l.trade, l.count)).join('');
    toast('Structured – review and save');
  },
  raiseFails(el) {
    const c = S.checklists.find(x => x.id === el.dataset.id);
    c.items.filter(i => i.v === 'no').forEach(it => { const ai = aiTag(it.t + ' ' + it.note); const id = uid('i'); S.issues.push({ id, projectId: c.projectId, title: it.t + ' – failed', desc: `From checklist “${c.name}”. ${it.note}`, type: 'snag', priority: ai.priority === 'medium' ? 'high' : ai.priority, status: 'open', owner: S.me, due: addDays(today(), 3), cost: false, tags: ai.tags, photos: [], created: Date.now(), createdBy: S.me }); log('created', 'issue', id, it.t, c.projectId); });
    save(); closeModal(); render(); toast('Issues raised');
  },
  ask(el) { const q = el.dataset.q; chat.push({ me: 1, html: esc(q) }, { html: answer(q) }); render(); },
  read(el) { const n = S.notes.find(x => x.id === el.dataset.id); if (n) { n.read = true; save(); } },
  readAll() { S.notes.filter(n => n.to === S.me).forEach(n => n.read = true); save(); render(); },
  print() { window.print(); },
  csv(el) {
    const { type, id } = el.dataset, p = proj(id);
    const rows = type === 'issues'
      ? [['Title', 'Type', 'Status', 'Priority', 'Owner', 'Due', 'Cost impact', 'Tags', 'Created by', 'Created']].concat(S.issues.filter(i => i.projectId === id).map(i => [i.title, i.type, i.status, i.priority, uname(i.owner), i.due, i.cost ? 'yes' : '', (i.tags || []).join(' '), uname(i.createdBy), new Date(i.created).toISOString()]))
      : [['Date', 'Weather', 'Labour total', 'Labour detail', 'Work', 'Deliveries', 'Visitors', 'Blockers', 'Incidents', 'By']].concat(S.diary.filter(d => d.projectId === id).sort((a, b) => a.date.localeCompare(b.date)).map(d => [d.date, d.weather, labourTotal(d), (d.labour || []).map(l => l.count + ' ' + l.trade).join('; '), d.work, d.deliveries, d.visitors, d.blockers, d.incidents, uname(d.by)]));
    download(`${p.name.replace(/\W+/g, '_')}_${type}_${today()}.csv`, toCSV(rows));
  },
  loadDemo() { if (S.projects.length && !confirm('Add demo projects to existing data?')) return; seedDemo(); save(); render(); toast('Demo data loaded'); },
  reset() { if (confirm('Delete all local data and start over?')) { localStorage.removeItem(KEY); location.hash = '#/'; location.reload(); } }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT' && el.type !== 'button') return;
  if (el.matches('input[type=checkbox]')) return;
  const fn = ACT[el.dataset.a]; if (fn) fn(el, e);
});

/* overdue reminders: once per issue per day */
function remindOverdue() {
  S.issues.filter(isOverdue).forEach(i => {
    const k = i.id + today(); if (S.notified[k]) return; S.notified[k] = 1;
    S.notes.unshift({ id: uid('n'), to: i.owner, text: `Overdue: “${i.title}” was due ${fmtShort(i.due)}`, link: '#/i/' + i.id, at: Date.now(), read: false });
  });
  S.notes = S.notes.slice(0, 200); save();
}
if (S.org) remindOverdue();
render();
