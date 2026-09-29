# Mena – the simplest operational platform for mid-sized contractors (prototype)

Clickable, mobile-first prototype. No build step, no backend, no dependencies:

```bash
python3 -m http.server 8080   # then open http://localhost:8080  (or just open index.html)
```

Sign up (30 seconds), keep "Load demo projects" ticked, and explore. Use the **Acting as** selector in the top bar to
switch between Admin / Manager / Site User / Viewer / Subcontractor. Data lives in `localStorage` (Settings › Reset to start over).

## MVP scope covered

| Spec area | Where |
|---|---|
| Project setup, status (Scoping → Active → Handover → Defects → Completed = lifecycle) | Projects |
| Roles: Admin, Manager, Site User, Viewer (+ limited-visibility subcontractors) | Team, "Acting as" |
| Daily site diary (labour, work, weather, deliveries, visitors, blockers, incidents, photos) | Project › Diary, ⊕ |
| Photo capture with date/time/user stamp, attach to diary/issue | ⊕ Take photo, camera input |
| Tasks / issues / snags: owner, status, due, priority, photo, cost-impact tag | Issues |
| Comments & @mentions on issues, diary, photos | any detail view |
| Dashboard: active projects, overdue, blockers, recent photos, diary completion | Home |
| Reports/exports: diary, issue list (PDF via print, CSV), photo pack | Project › Overview / report views |
| Notifications: assignment, mention, overdue (in-app; email simulated) | Inbox |
| Files attached to project or issue | Project › Files, issue detail |
| Checklists: scoping, safety walk, QA, handover; failed items → issues | Project › Checklists |
| Milestones only (no scheduling) | Project › Overview |
| Search across projects, issues, photos, diary | top bar |
| Audit trail (created/updated/closed by, timestamps) | issue detail, Settings |
| Localisation: EN / DE, EUR, local date formats | Settings |
| Transparent flat pricing | Settings › Plan & pricing |

## The "smart" layer (rule-based stand-ins, ready to swap for an LLM)
- **Quick note → structured diary**: type/dictate one sentence; labour, weather, deliveries, blockers, incidents are extracted.
- **Auto-tagging + priority/cost suggestion** while writing an issue.
- **Mena insights** on Home: missing diaries, overdue items, recurring blockers, milestones at risk, incidents.
- **Ask Mena**: plain-language questions over your project data ("blockers this week", "overdue on Docklands").

## Not in the prototype (by design)
Real auth/email, server sync, offline mode, integrations, scheduling, procurement, commercials.
