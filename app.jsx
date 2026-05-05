// Project Pipeline — ACT 916 — semanal funnel (clients × metrics version)
const { useState, useEffect, useMemo, useRef, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "layout": "stack",
  "theme": "linear",
  "gapIntensity": 2
}/*EDITMODE-END*/;

// ---------- Helpers ----------
const uid = () => Math.random().toString(36).slice(2, 9);

function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week: weekNum };
}
function weekRange(year, week) {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const monday = new Date(simple);
  if (simple.getUTCDay() <= 4) monday.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  else monday.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: monday, end: sunday };
}
function fmtDate(d) {
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}
function weekKey(year, week) { return `${year}-W${String(week).padStart(2,'0')}`; }

// ---------- Factories ----------
function newMetric(seed = {}) {
  return {
    id: uid(),
    label: seed.label || '',
    targetDesc: seed.targetDesc || '',
    actualDesc: seed.actualDesc || '',
    goal: seed.goal ?? 1,
    actual: seed.actual ?? 0,
    thisWeek: seed.thisWeek ?? 0,
  };
}
function newClient(seed = {}) {
  return {
    id: uid(),
    name: seed.name || '',
    metrics: seed.metrics || [ newMetric() ],
  };
}
function newProject(seed = {}) {
  return {
    id: uid(),
    title: seed.title || '',
    note: seed.note || '',
    clients: seed.clients || [ newClient() ],
  };
}

// ---------- Default seed ----------
function seedRows() {
  const prodMetrics = (gP=1, gC=3) => [
    newMetric({ label: '# producciones',        targetDesc: 'Producción semanal',   goal: gP }),
    newMetric({ label: '# contenido exportado',  targetDesc: 'Contenido publicado',  goal: gC }),
  ];

  return [
    newProject({
      title: 'ACT 916 — Producción',
      note: 'Producción + contenido semanal',
      clients: [
        newClient({ name: 'Kubrolan',   metrics: prodMetrics(1,3) }),
        newClient({ name: 'Kubirgosis', metrics: prodMetrics(1,3) }),
        newClient({ name: 'Hourse',     metrics: prodMetrics(1,3) }),
        newClient({ name: 'J&O',        metrics: prodMetrics(1,3) }),
        newClient({ name: 'Argi Casa',  metrics: prodMetrics(1,3) }),
      ],
    }),
    newProject({
      title: 'Vaquero Fresa',
      clients: [
        newClient({ name: 'Vaquero Fresa', metrics: [
          newMetric({ label: '# producciones',        targetDesc: 'Producción semanal',        goal: 1 }),
          newMetric({ label: '# contenido exportado',  targetDesc: '8× contenido / semana',    goal: 8 }),
        ]}),
      ],
    }),
    newProject({
      title: 'Nievales / clientes',
      clients: [
        newClient({ name: 'Nievales',           metrics: [ newMetric({ label: '# juntas', targetDesc: '1 junta semanal', goal: 1 }) ] }),
        newClient({ name: 'Pajitos / clientes', metrics: [ newMetric({ label: '# juntas', targetDesc: '1 junta semanal', goal: 1 }) ] }),
        newClient({ name: 'Clientes nuevos',    metrics: [ newMetric({ label: '# juntas', targetDesc: '1 junta semanal', goal: 1 }) ] }),
      ],
    }),
    newProject({
      title: 'ACT 916 — Cuotas',
      note: 'Plan de acción',
      clients: [
        newClient({ name: 'Theo Salazar', metrics: [ newMetric({ label: 'Plan de acción', targetDesc: '1 plan/seguimiento', goal: 1 }) ] }),
        newClient({ name: 'Patzcanto',    metrics: [ newMetric({ label: 'Plan de acción', targetDesc: '1 plan/seguimiento', goal: 1 }) ] }),
        newClient({ name: 'Rebt Funds',   metrics: [ newMetric({ label: 'Plan de acción', targetDesc: '1 plan/seguimiento', goal: 1 }) ] }),
        newClient({ name: 'David GZZ',    metrics: [ newMetric({ label: 'Plan de acción', targetDesc: '1 plan/seguimiento', goal: 1 }) ] }),
      ],
    }),
    newProject({
      title: 'Cajón Woes',
      clients: [
        newClient({ name: 'General', metrics: [
          newMetric({ label: '# casos menores', targetDesc: 'Caso menor', goal: 1 }),
          newMetric({ label: '# casos big',     targetDesc: 'Caso big',   goal: 1 }),
        ]}),
      ],
    }),
    newProject({
      title: 'Política — Luna',
      clients: [
        newClient({ name: 'Luna', metrics: [
          newMetric({ label: '# substacks',     targetDesc: 'Substack semanal',    goal: 1 }),
          newMetric({ label: '# videos largos', targetDesc: 'Video largo semanal', goal: 1 }),
          newMetric({ label: '# videos cortos', targetDesc: '2 videos cortos',     goal: 2 }),
          newMetric({ label: '# cameos',        targetDesc: '1 cameo semanal',     goal: 1 }),
          newMetric({ label: '# propuestas',    targetDesc: '1 propuesta semanal', goal: 1 }),
        ]}),
      ],
    }),
    newProject({
      title: 'Aritech',
      note: 'Gestión',
      clients: [
        newClient({ name: 'Aritech', metrics: [ newMetric({ label: 'Gestión', targetDesc: 'Gestión continua', goal: 1 }) ] }),
      ],
    }),
  ];
}

// ---------- Status ----------
function metricStatus(m) {
  if (!m.goal || m.goal <= 0) return { kind: 'none', label: 'Sin meta', pct: 0, gap: 0 };
  const pct = Math.min(1, m.actual / m.goal);
  const gap = Math.max(0, m.goal - m.actual);
  if (pct >= 0.8) return { kind: 'on', label: 'On track', pct, gap };
  if (pct >= 0.4) return { kind: 'at', label: 'At risk', pct, gap };
  return { kind: 'off', label: 'Off track', pct, gap };
}
function clientStatus(c) {
  let g=0, a=0;
  c.metrics.forEach(m => { g += m.goal||0; a += m.actual||0; });
  if (g <= 0) return { kind:'none', label:'Sin meta', pct:0, goal:0, actual:0, gap:0 };
  const pct = Math.min(1, a/g);
  const gap = Math.max(0, g - a);
  if (pct >= 0.8) return { kind:'on', label:'On track', pct, goal:g, actual:a, gap };
  if (pct >= 0.4) return { kind:'at', label:'At risk', pct, goal:g, actual:a, gap };
  return { kind:'off', label:'Off track', pct, goal:g, actual:a, gap };
}
function projectStatus(p) {
  let g=0, a=0;
  p.clients.forEach(c => c.metrics.forEach(m => { g += m.goal||0; a += m.actual||0; }));
  if (g <= 0) return { kind:'none', label:'Sin meta', pct:0, goal:0, actual:0, gap:0 };
  const pct = Math.min(1, a/g);
  const gap = Math.max(0, g - a);
  if (pct >= 0.8) return { kind:'on', label:'On track', pct, goal:g, actual:a, gap };
  if (pct >= 0.4) return { kind:'at', label:'At risk', pct, goal:g, actual:a, gap };
  return { kind:'off', label:'Off track', pct, goal:g, actual:a, gap };
}

// ---------- Storage ----------
const STORAGE_KEY = 'pipeline.act916.v3';
function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}
function saveStore(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
}

// ---------- Icons ----------
const Icon = {
  ChevL:    () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 4l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  ChevR:    () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  ChevDown: () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Arrow:    () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Plus:     () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v10M3 8h10" strokeLinecap="round"/></svg>,
  Trash:    () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 5h10M6.5 5V3.5h3V5M5 5l.5 8h5L11 5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Camera:   () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="4" width="12" height="9" rx="1.5"/><circle cx="8" cy="8.5" r="2.2"/><path d="M5.5 4l1-1.2h3l1 1.2"/></svg>,
  Focus:    () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5V3h2M11 3h2v2M13 11v2h-2M5 13H3v-2" strokeLinecap="round"/><circle cx="8" cy="8" r="2"/></svg>,
  X:        () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/></svg>,
  Check:    () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8.5l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Sparkle:  () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M8 2v4M8 10v4M2 8h4M10 8h4" strokeLinecap="round"/></svg>,
};

// ---------- Editable text ----------
function Editable({ value, onChange, placeholder, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.textContent !== (value || '')) {
      ref.current.textContent = value || '';
    }
  }, [value]);

  return (
    <span
      ref={ref}
      className={`editable ${className || ''} ${!value ? 'empty' : ''}`}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder || ''}
      spellCheck={false}
      onInput={(e) => onChange(e.currentTarget.textContent)}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
      onPaste={(e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
      }}
    />
  );
}

// ---------- Number input ----------
function NumInput({ value, onChange, min = 0, className = '' }) {
  const [local, setLocal] = useState(String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setLocal(String(value)); }, [value, editing]);

  const commit = (v) => {
    const trimmed = (v ?? '').toString().trim();
    if (trimmed === '') { onChange(min); return; }
    const n = parseInt(trimmed, 10);
    if (isNaN(n)) { setLocal(String(value)); return; }
    onChange(Math.max(min, n));
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      className={`numinput ${className}`}
      value={local}
      onFocus={(e) => { setEditing(true); e.target.select(); }}
      onChange={(e) => setLocal(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={(e) => { setEditing(false); commit(e.target.value); }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
    />
  );
}

// ---------- Metric row ----------
function MetricRow({ metric, idx, isLast, onPatch, onDelete }) {
  const s = metricStatus(metric);
  const pct = Math.round(s.pct * 100);
  const barColor = s.kind === 'on' ? '#16a34a'
    : s.kind === 'at' ? '#d97706'
    : s.kind === 'off' ? '#dc2626'
    : '#a1a1aa';

  const patch = (field, v) => onPatch({ ...metric, [field]: v });
  const gap = (metric.goal || 0) - (metric.actual || 0);

  return (
    <div className="metric-row">
      <div className="m-tree" aria-hidden>
        <span className={`m-line ${isLast ? 'last' : ''}`}/>
        <span className="m-bullet"/>
      </div>

      {/* Métrica (label) */}
      <div className="m-cell label">
        <Editable value={metric.label} onChange={(v) => patch('label', v)} placeholder="# métrica" />
      </div>

      <div className="m-arrow"><Icon.Arrow /></div>

      {/* Entregable / meta */}
      <div className={`m-cell target ${s.kind === 'off' ? 'is-missing' : ''}`}>
        <div className="m-desc">
          <Editable value={metric.targetDesc} onChange={(v) => patch('targetDesc', v)} placeholder="Entregable / descripción" />
        </div>
        <div className="m-num">
          <NumInput value={metric.goal} onChange={(v) => patch('goal', v)} />
          <span className="m-num-label">meta</span>
        </div>
      </div>

      <div className="m-arrow"><Icon.Arrow /></div>

      {/* Está saliendo */}
      <div className={`m-cell actual ${s.kind === 'off' ? 'is-off' : ''}`}>
        <div className="m-desc">
          <Editable value={metric.actualDesc} onChange={(v) => patch('actualDesc', v)} placeholder="Lo que está saliendo" />
        </div>
        <div className="m-num">
          <NumInput value={metric.actual} onChange={(v) => patch('actual', v)} />
          <span className="m-num-label">acum</span>
        </div>
      </div>

      {/* Discrepancia */}
      <div className="m-cell gap-cell">
        <div className={`gap-num ${gap > 0 ? 'has-gap' : gap < 0 ? 'over' : 'zero'}`}>
          <span className="gap-sign">{gap > 0 ? '−' : gap < 0 ? '+' : '·'}</span>
          <span className="gap-val mono">{Math.abs(gap)}</span>
        </div>
        <div className="gap-bar">
          <div style={{ width: `${pct}%`, background: barColor }} data-status={s.kind} />
        </div>
      </div>

      {/* Semana actual */}
      <div className="m-cell week-cell">
        <div className="week-input-wrap">
          <NumInput value={metric.thisWeek} onChange={(v) => patch('thisWeek', v)} className="big" />
          <span className="m-num-label">esta sem.</span>
        </div>
        {metric.thisWeek > 0 && (
          <div className="week-pulse" aria-hidden />
        )}
      </div>

      <div className="m-actions">
        <button title="Eliminar métrica" onClick={() => onDelete(metric.id)}><Icon.Trash /></button>
      </div>
    </div>
  );
}

// ---------- Client subgroup ----------
function ClientGroup({ client, isLastClient, onPatch, onDelete, collapsed, onToggle }) {
  const s = clientStatus(client);
  const pct = Math.round(s.pct * 100);
  const barColor = s.kind === 'on' ? '#16a34a'
    : s.kind === 'at' ? '#d97706'
    : s.kind === 'off' ? '#dc2626'
    : '#a1a1aa';

  const patchMetric = (m) => onPatch({ ...client, metrics: client.metrics.map(x => x.id === m.id ? m : x) });
  const deleteMetric = (id) => onPatch({ ...client, metrics: client.metrics.filter(x => x.id !== id) });
  const addMetric = () => onPatch({ ...client, metrics: [...client.metrics, newMetric()] });
  const patchName = (v) => onPatch({ ...client, name: v });

  return (
    <div className={`client ${isLastClient ? 'last-client' : ''}`}>
      <div className="client-head">
        <button className={`twirl small ${collapsed ? 'collapsed' : ''}`} onClick={onToggle} aria-label="toggle">
          <Icon.ChevDown />
        </button>
        <div className="client-name">
          <Editable value={client.name} onChange={patchName} placeholder="Cliente / sub-grupo" />
        </div>
        <div className="client-meta">
          <span className="count-pill">{client.metrics.length} {client.metrics.length === 1 ? 'meta' : 'metas'}</span>
        </div>
        <div className="client-progress">
          <span className="mono small">{s.actual}/{s.goal}</span>
          <div className="mini-bar"><div style={{ width: `${pct}%`, background: barColor }}/></div>
        </div>
        <div className="client-status">
          <span className={`status sm ${s.kind}`}><span className="dot"/>{s.label}</span>
        </div>
        <div className="client-actions">
          <button title="Eliminar cliente" onClick={() => {
            if (confirm(`¿Eliminar "${client.name || 'este cliente'}"?`)) onDelete(client.id);
          }}><Icon.Trash /></button>
        </div>
      </div>

      {!collapsed && (
        <div className="metrics">
          {client.metrics.map((m, i) => (
            <MetricRow
              key={m.id}
              metric={m}
              idx={i}
              isLast={i === client.metrics.length - 1}
              onPatch={patchMetric}
              onDelete={deleteMetric}
            />
          ))}
          <button className="add-metric" onClick={addMetric}>
            <Icon.Plus /> Añadir métrica
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Project ----------
function ProjectRow({ project, idx, onPatch, onDelete, focusMode, isPinned, collapsed, onToggleCollapse, clientCollapse, setClientCollapse }) {
  const s = projectStatus(project);
  const pct = Math.round(s.pct * 100);
  const barColor = s.kind === 'on' ? '#16a34a'
    : s.kind === 'at' ? '#d97706'
    : s.kind === 'off' ? '#dc2626'
    : '#a1a1aa';

  const dim = focusMode && !isPinned;
  const pinClass = focusMode && isPinned ? 'focus-pin' : '';

  const patchTitle  = (v) => onPatch({ ...project, title: v });
  const patchNote   = (v) => onPatch({ ...project, note: v });
  const patchClient = (c) => onPatch({ ...project, clients: project.clients.map(x => x.id === c.id ? c : x) });
  const deleteClient = (id) => onPatch({ ...project, clients: project.clients.filter(x => x.id !== id) });
  const addClient = () => onPatch({ ...project, clients: [...project.clients, newClient()] });

  const totalMetrics  = project.clients.reduce((acc,c) => acc + c.metrics.length, 0);
  const totalThisWeek = project.clients.reduce((acc,c) => acc + c.metrics.reduce((a,m) => a + (m.thisWeek||0), 0), 0);

  return (
    <div
      className={`project ${dim ? 'focus-dim' : ''} ${pinClass}`}
      style={{ '--proj-pct': pct, '--proj-bar-color': barColor }}
    >
      <div className="project-head">
        <button className={`twirl ${collapsed ? 'collapsed' : ''}`} onClick={onToggleCollapse} aria-label="toggle">
          <Icon.ChevDown />
        </button>
        <div className="row-num mono">{String(idx + 1).padStart(2, '0')}</div>

        <div className="project-title-wrap">
          <div className="project-title">
            <Editable value={project.title} onChange={patchTitle} placeholder="Título del proyecto" />
          </div>
          <div className="project-note">
            <Editable value={project.note} onChange={patchNote} placeholder="Nota / categoría" />
          </div>
        </div>

        <div className="project-meta">
          <span className="count-pill">{project.clients.length} {project.clients.length === 1 ? 'cliente' : 'clientes'}</span>
          <span className="count-pill">{totalMetrics} {totalMetrics === 1 ? 'métrica' : 'métricas'}</span>
        </div>

        <div className="project-progress">
          <div className="progress-num small">
            <span className="mono">{s.actual}</span>
            <span className="of">/</span>
            <span className="mono">{s.goal}</span>
            {s.gap > 0 && <span className="gap-inline">−{s.gap}</span>}
          </div>
          <div className="progress-bar">
            <div style={{ width: `${pct}%`, background: barColor }} />
          </div>
        </div>

        <div className="project-week">
          <div className="week-mini">
            <span className="mono week-mini-num">+{totalThisWeek}</span>
            <span className="m-num-label">esta sem.</span>
          </div>
        </div>

        <div className="project-status">
          <span className={`status ${s.kind}`}>
            <span className="dot" />
            {s.label}
          </span>
        </div>

        <div className="project-actions">
          <button title="Eliminar proyecto" onClick={() => {
            if (confirm(`¿Eliminar "${project.title || 'este proyecto'}" y todos sus clientes?`)) onDelete(project.id);
          }}><Icon.Trash /></button>
        </div>
      </div>

      {!collapsed && (
        <div className="clients">
          <div className="metric-head">
            <div></div>
            <div>Métrica</div>
            <div></div>
            <div>Entregable / meta</div>
            <div></div>
            <div>Está saliendo</div>
            <div>Discrepancia</div>
            <div>Semana actual</div>
            <div></div>
          </div>
          {project.clients.map((c, i) => (
            <ClientGroup
              key={c.id}
              client={c}
              isLastClient={i === project.clients.length - 1}
              onPatch={patchClient}
              onDelete={deleteClient}
              collapsed={!!clientCollapse[c.id]}
              onToggle={() => setClientCollapse(c.id)}
            />
          ))}
          <button className="add-client" onClick={addClient}>
            <Icon.Plus /> Añadir cliente / sub-grupo
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Notion Panel ----------
function NotionPanel({ week, onIncrementMetric }) {
  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [genDate, setGenDate]     = useState('');
  const [markModal, setMarkModal] = useState(null);
  const [selProj, setSelProj]     = useState('');
  const [selClient, setSelClient] = useState('');
  const [selMetric, setSelMetric] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('notion-tasks.json?t=' + Date.now());
      if (!r.ok) throw new Error('404');
      const data = await r.json();
      setTasks(data.tasks || []);
      setGenDate(data.generated || '');
    } catch { setTasks([]); setGenDate(''); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pending = tasks.filter(t => t.status !== 'Done');
  const byProject = pending.reduce((acc, t) => {
    const k = t.project || '— Sin proyecto asignado';
    (acc[k] = acc[k] || []).push(t);
    return acc;
  }, {});

  const openMark = (task) => {
    setMarkModal(task);
    setSelProj(''); setSelClient(''); setSelMetric('');
  };
  const confirmMark = () => {
    if (!selMetric) return;
    onIncrementMetric(selProj, selClient, selMetric);
    setTasks(prev => prev.map(t => t.id === markModal.id ? { ...t, status: 'Done' } : t));
    setMarkModal(null);
  };

  const curProj   = week.rows.find(p => p.id === selProj);
  const curClient = curProj?.clients.find(c => c.id === selClient);

  return (
    <>
      <div className="notion-panel">
        <div className="notion-panel-header" onClick={() => setCollapsed(c => !c)}>
          <div className="notion-panel-title">
            <span className="notion-icon">N</span>
            Notion To-Dos
            {pending.length > 0 && <span className="notion-badge">{pending.length}</span>}
            {genDate && <span className="notion-gen-date">sync {genDate}</span>}
          </div>
          <div className="notion-panel-actions" onClick={e => e.stopPropagation()}>
            <button className="btn sm ghost" onClick={load} disabled={loading} style={{fontSize:11}}>
              {loading ? '…' : '↻ Sync'}
            </button>
            <span style={{color:'var(--ink-4)', fontSize:12, transform: collapsed ? 'rotate(-90deg)' : 'none', display:'inline-block', transition:'transform .2s'}}>▾</span>
          </div>
        </div>

        {!collapsed && (
          <div className="notion-body">
            {pending.length === 0 ? (
              <div className="notion-empty">
                {tasks.length === 0
                  ? 'notion-tasks.json no encontrado. El sync dominical lo genera automáticamente.'
                  : '✓ Sin tareas pendientes esta semana.'}
              </div>
            ) : (
              Object.entries(byProject).map(([proj, ptasks]) => (
                <div key={proj} className="notion-group">
                  <div className="notion-group-label">{proj}</div>
                  {ptasks.map(task => (
                    <div key={task.id} className="notion-task-row">
                      <span className={`notion-dot ${task.status === 'In progress' ? 'inprog' : 'todo'}`} />
                      <span className="notion-task-name">{task.name}</span>
                      {task.dueDate && <span className="notion-due">{task.dueDate}</span>}
                      {task.priority === 'High' && <span className="notion-hi">High</span>}
                      <button className="notion-plus-btn" onClick={() => openMark(task)}>+1</button>
                    </div>
                  ))}
                </div>
              ))
            )}
            <div className="notion-footer">
              <a href="https://www.notion.so/583b9a4721fa83f49ed2011ccfcaece6" target="_blank" rel="noreferrer">
                Abrir Tasks en Notion ↗
              </a>
            </div>
          </div>
        )}
      </div>

      {markModal && (
        <div className="notion-overlay" onClick={() => setMarkModal(null)}>
          <div className="notion-modal" onClick={e => e.stopPropagation()}>
            <div className="notion-modal-title">¿A qué métrica suma?</div>
            <div className="notion-modal-task">"{markModal.name}"</div>
            <select value={selProj} onChange={e => { setSelProj(e.target.value); setSelClient(''); setSelMetric(''); }}>
              <option value="">Proyecto…</option>
              {week.rows.map(p => <option key={p.id} value={p.id}>{p.title || '(sin título)'}</option>)}
            </select>
            {curProj && (
              <select value={selClient} onChange={e => { setSelClient(e.target.value); setSelMetric(''); }}>
                <option value="">Cliente / grupo…</option>
                {curProj.clients.map(c => <option key={c.id} value={c.id}>{c.name || '(sin nombre)'}</option>)}
              </select>
            )}
            {curClient && (
              <select value={selMetric} onChange={e => setSelMetric(e.target.value)}>
                <option value="">Métrica…</option>
                {curClient.metrics.map(m => <option key={m.id} value={m.id}>{m.label || '(sin label)'}</option>)}
              </select>
            )}
            <div className="notion-modal-actions">
              <button className="btn sm ghost" onClick={() => setMarkModal(null)}>Cancelar</button>
              <button className="btn sm primary" disabled={!selMetric} onClick={confirmMark}>Sumar +1 ✓</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------- Main App ----------
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => {
    const b = document.body;
    b.classList.remove('layout-stack','layout-funnel','layout-cards');
    b.classList.add(`layout-${t.layout}`);
    b.classList.remove('theme-linear','theme-notebook','theme-terminal');
    b.classList.add(`theme-${t.theme}`);
    b.dataset.gapInt = String(t.gapIntensity);
  }, [t.layout, t.theme, t.gapIntensity]);

  const today = new Date();
  const cur = isoWeek(today);
  const initialKey = weekKey(cur.year, cur.week);

  const [store, setStore] = useState(() => {
    const saved = loadStore();
    if (saved && saved.weeks) return saved;
    const seed = {
      currentKey: initialKey,
      weeks: {
        [initialKey]: {
          key: initialKey, year: cur.year, week: cur.week,
          createdAt: Date.now(),
          rows: seedRows(),
          photo: null,
        }
      }
    };
    saveStore(seed);
    return seed;
  });

  const [currentKey, setCurrentKey] = useState(store.currentKey || initialKey);
  const [focusMode, setFocusMode] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [clientCollapse, setClientCollapseState] = useState({});
  const photoInputRef = useRef(null);

  useEffect(() => { saveStore({ ...store, currentKey }); }, [store, currentKey]);
  useEffect(() => { document.body.classList.toggle('focus-mode', focusMode); }, [focusMode]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }, []);

  const week = store.weeks[currentKey];
  const weekKeys = useMemo(() => Object.keys(store.weeks).sort(), [store.weeks]);
  const idx = weekKeys.indexOf(currentKey);

  const stats = useMemo(() => {
    if (!week) return { totalGoal:0, totalActual:0, gap:0, on:0, at:0, off:0, none:0, pct:0, metricCount:0, thisWeek:0 };
    let tg=0, ta=0, on=0, at=0, off=0, none=0, n=0, tw=0;
    week.rows.forEach(p => p.clients.forEach(c => c.metrics.forEach(m => {
      n++;
      tg += m.goal||0; ta += m.actual||0; tw += m.thisWeek||0;
      const ms = metricStatus(m);
      if (ms.kind==='on') on++;
      else if (ms.kind==='at') at++;
      else if (ms.kind==='off') off++;
      else none++;
    })));
    return { totalGoal:tg, totalActual:ta, gap:Math.max(0,tg-ta), on, at, off, none, pct: tg>0 ? ta/tg : 0, metricCount:n, thisWeek:tw };
  }, [week]);

  const mostUrgent = useMemo(() => {
    if (!week) return [];
    return [...week.rows]
      .map(p => ({ p, s: projectStatus(p) }))
      .filter(x => x.s.kind === 'off' && x.s.goal > 0)
      .sort((a,b) => (a.s.actual/a.s.goal) - (b.s.actual/b.s.goal))
      .slice(0, 2);
  }, [week]);

  const updateWeek = (patcher) => {
    setStore(prev => ({ ...prev, weeks: { ...prev.weeks, [currentKey]: patcher(prev.weeks[currentKey]) } }));
  };
  const patchProject  = (newP) => updateWeek(w => ({ ...w, rows: w.rows.map(p => p.id === newP.id ? newP : p) }));
  const deleteProject = (id)   => updateWeek(w => ({ ...w, rows: w.rows.filter(p => p.id !== id) }));
  const addProject    = ()     => updateWeek(w => ({ ...w, rows: [...w.rows, newProject()] }));

  const incrementMetric = (projId, clientId, metricId) => {
    updateWeek(w => ({
      ...w,
      rows: w.rows.map(p => p.id !== projId ? p : {
        ...p,
        clients: p.clients.map(c => c.id !== clientId ? c : {
          ...c,
          metrics: c.metrics.map(m => m.id !== metricId ? m : {
            ...m,
            actual:   (m.actual   || 0) + 1,
            thisWeek: (m.thisWeek || 0) + 1,
          }),
        }),
      }),
    }));
    showToast('✓ Métrica +1');
  };

  const newWeekFromCurrent = () => {
    const wk = week;
    const r = weekRange(wk.year, wk.week);
    const nextStart = new Date(r.start); nextStart.setUTCDate(nextStart.getUTCDate()+7);
    const next = isoWeek(nextStart);
    const k = weekKey(next.year, next.week);
    if (store.weeks[k]) { setCurrentKey(k); showToast('Esa semana ya existe'); return; }
    const newRows = wk.rows.map(p => ({
      ...p, id: uid(),
      clients: p.clients.map(c => ({
        ...c, id: uid(),
        metrics: c.metrics.map(m => ({ ...m, id: uid(), thisWeek: 0 })),
      })),
    }));
    setStore(prev => ({
      ...prev,
      currentKey: k,
      weeks: { ...prev.weeks, [k]: { key:k, year:next.year, week:next.week, createdAt: Date.now(), rows:newRows, photo:null } }
    }));
    setCurrentKey(k);
    showToast('Nueva semana creada (acumulado conservado)');
  };

  const goWeek = (dir) => {
    if (idx === -1) return;
    const next = idx + dir;
    if (next < 0 || next >= weekKeys.length) return;
    setCurrentKey(weekKeys[next]);
  };

  const onPhotoChosen = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      updateWeek(w => ({ ...w, photo: e.target.result }));
      showToast('Foto guardada');
    };
    reader.readAsDataURL(file);
  };
  const removePhoto = () => updateWeek(w => ({ ...w, photo: null }));

  const collapseAll = () => {
    const next = {};
    week.rows.forEach(p => { next[p.id] = true; });
    setCollapsed(next);
  };
  const expandAll = () => setCollapsed({});
  const setClientCollapse = (id) => setClientCollapseState(prev => ({ ...prev, [id]: !prev[id] }));

  if (!week) return <div style={{padding:40}}>Sin datos.</div>;
  const range = weekRange(week.year, week.week);

  return (
    <div className="app">
      {/* TOPBAR */}
      <div className="topbar">
        <div className="brand">
          <div className="logo-mark">P</div>
          <div>
            <div className="brand-name">Project Pipeline — ACT 916</div>
            <div className="brand-sub">Embudo semanal · input → debe salir → está saliendo</div>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn ghost" onClick={() => setFocusMode(f => !f)}>
            <Icon.Focus /> {focusMode ? 'Salir de Focus' : 'Focus mode'}
          </button>
          <button className="btn" onClick={() => {
            if (confirm('¿Resetear todos los datos guardados?')) {
              localStorage.removeItem(STORAGE_KEY); location.reload();
            }
          }}>Reset</button>
          <button className="btn primary" onClick={newWeekFromCurrent}>
            <Icon.Plus /> Nueva semana
          </button>
        </div>
      </div>

      {/* WEEK BAR */}
      <div className="week-bar">
        <div className="week-nav">
          <button onClick={() => goWeek(-1)} disabled={idx <= 0}><Icon.ChevL /></button>
          <button onClick={() => goWeek(1)} disabled={idx >= weekKeys.length-1}><Icon.ChevR /></button>
        </div>
        <div className="week-label">
          <div className="week-label-row">
            <span className="week-num">Semana {week.week}, {week.year}</span>
            <span className="week-range mono">{fmtDate(range.start)} – {fmtDate(range.end)}</span>
          </div>
          <div className="week-meta">
            {week.rows.length} proyectos · {stats.metricCount} métricas · {stats.totalActual}/{stats.totalGoal} acum · +{stats.thisWeek} esta semana
          </div>
        </div>
        <div className="week-list">
          {weekKeys.map(k => {
            const w = store.weeks[k];
            return (
              <button key={k} className={`week-pill ${k===currentKey?'active':''}`} onClick={() => setCurrentKey(k)}>
                W{w.week}
              </button>
            );
          })}
        </div>
      </div>

      {focusMode && mostUrgent.length > 0 && (
        <div className="focus-banner">
          <div>
            <div className="label">Esta semana solo importa esto</div>
            <div className="text">
              {mostUrgent.map((x,i) => (
                <span key={x.p.id}>
                  {i>0 && <span style={{color:'#52525b'}}> · </span>}
                  <em>{x.p.title || 'Sin título'}</em>
                  <span style={{color:'#a1a1aa', marginLeft:6, fontSize:13}} className="mono">
                    {x.s.actual}/{x.s.goal}
                  </span>
                </span>
              ))}
            </div>
          </div>
          <Icon.Sparkle />
        </div>
      )}

      {/* SUMMARY */}
      <div className="summary">
        <div className="stat">
          <div className="stat-label">Acumulado / Meta</div>
          <div className="stat-value">{stats.totalActual}<span className="unit">/ {stats.totalGoal}</span></div>
          <div className="stat-bar"><div style={{
            width: `${Math.round(stats.pct*100)}%`,
            background: stats.pct>=0.8?'#16a34a': stats.pct>=0.4?'#d97706':'#dc2626'
          }}/></div>
        </div>
        <div className="stat">
          <div className="stat-label">Discrepancia (gap)</div>
          <div className="stat-value" style={{color: stats.gap>0 ? '#b91c1c' : '#15803d'}}>
            {stats.gap}<span className="unit">unidades pendientes</span>
          </div>
          <div className="stat-bar"><div style={{
            width: `${stats.totalGoal>0 ? Math.round((stats.gap/stats.totalGoal)*100):0}%`,
            background: '#dc2626'
          }}/></div>
        </div>
        <div className="stat">
          <div className="stat-label">Esta semana</div>
          <div className="stat-value" style={{color:'#4f46e5'}}>+{stats.thisWeek}<span className="unit">producido</span></div>
          <div className="stat-bar"><div style={{width:'100%', background:'#4f46e5'}}/></div>
        </div>
        <div className="stat">
          <div className="stat-label">Métricas por estado</div>
          <div className="stat-value" style={{fontSize:18, gap:14}}>
            <span style={{color:'#15803d'}}>● {stats.on}</span>
            <span style={{color:'#a16207'}}>● {stats.at}</span>
            <span style={{color:'#b91c1c'}}>● {stats.off}</span>
          </div>
          <div className="stat-bar" style={{display:'flex', gap:0}}>
            {(() => {
              const total = Math.max(1, stats.on+stats.at+stats.off+stats.none);
              return (
                <>
                  <div style={{width:`${(stats.on/total)*100}%`, background:'#16a34a'}}/>
                  <div style={{width:`${(stats.at/total)*100}%`, background:'#d97706'}}/>
                  <div style={{width:`${(stats.off/total)*100}%`, background:'#dc2626'}}/>
                  <div style={{width:`${(stats.none/total)*100}%`, background:'#d4d4d8'}}/>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* PHOTO STRIP */}
      <div className="photo-strip">
        <div className="photo-thumb" onClick={() => week.photo && setPhotoOpen(true)}>
          {week.photo
            ? <img src={week.photo} alt="Cuaderno" />
            : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-4)'}}><Icon.Camera /></div>}
        </div>
        <div className="photo-meta">
          <div>
            <div className="photo-title">Foto del cuaderno · Semana {week.week}</div>
            <div className="photo-sub">
              {week.photo
                ? 'Click para ver grande. Corrige los textos abajo si interpreté mal.'
                : 'Sube tu foto semanal del cuaderno como referencia.'}
            </div>
          </div>
          <div className="photo-actions">
            <input ref={photoInputRef} type="file" accept="image/*" className="sr-only"
              onChange={(e) => onPhotoChosen(e.target.files?.[0])} />
            <button className="btn sm" onClick={() => photoInputRef.current?.click()}>
              <Icon.Camera /> {week.photo ? 'Reemplazar' : 'Subir foto'}
            </button>
            {week.photo && <button className="btn sm ghost" onClick={removePhoto}>Quitar</button>}
          </div>
        </div>
      </div>

      {/* NOTION TO-DOS */}
      <NotionPanel week={week} onIncrementMetric={incrementMetric} />

      {/* PIPELINE */}
      <div className="pipeline">
        <div className="pipeline-toolbar">
          <div className="pipeline-title">Pipeline</div>
          <div className="toolbar-actions">
            <button className="btn sm ghost" onClick={collapseAll}>Colapsar todo</button>
            <button className="btn sm ghost" onClick={expandAll}>Expandir todo</button>
          </div>
        </div>

        {week.rows.map((p, i) => (
          <ProjectRow
            key={p.id}
            project={p}
            idx={i}
            onPatch={patchProject}
            onDelete={deleteProject}
            focusMode={focusMode}
            isPinned={mostUrgent.some(x => x.p.id === p.id)}
            collapsed={!!collapsed[p.id]}
            onToggleCollapse={() => setCollapsed(c => ({ ...c, [p.id]: !c[p.id] }))}
            clientCollapse={clientCollapse}
            setClientCollapse={setClientCollapse}
          />
        ))}

        <button className="add-row" onClick={addProject}>
          <Icon.Plus /> Añadir proyecto
        </button>
      </div>

      {photoOpen && week.photo && (
        <div className="photo-overlay" onClick={() => setPhotoOpen(false)}>
          <button className="close" onClick={() => setPhotoOpen(false)}><Icon.X /></button>
          <img src={week.photo} alt="Cuaderno" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {toast && <div className="toast"><Icon.Check /> {toast}</div>}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Layout" />
        <TweakRadio label="Disposición" value={t.layout}
          options={['stack','funnel','cards']}
          onChange={(v) => setTweak('layout', v)} />
        <TweakSection label="Apariencia" />
        <TweakRadio label="Tema" value={t.theme}
          options={['linear','notebook','terminal']}
          onChange={(v) => setTweak('theme', v)} />
        <TweakSection label="Énfasis del gap" />
        <TweakSlider label="Intensidad de discrepancia" value={t.gapIntensity}
          min={0} max={3} step={1}
          onChange={(v) => setTweak('gapIntensity', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
