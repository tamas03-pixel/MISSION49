import { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Target, Dumbbell, TrendingUp, Terminal, Check, Camera, Plus, Download,
  Upload, RotateCcw, AlertTriangle, Trash2, X,
} from 'lucide-react';

const THEME = {
  bg: '#000000',
  surface: '#0A0F0C',
  surfaceAlt: '#111813',
  border: '#1E2B22',
  borderBright: '#2A3D2E',
  text: '#EAF2EC',
  textMuted: '#5C7060',
  green: '#00FF66',
  greenDim: '#0F5C30',
  red: '#FF3B30',
  orange: '#FF8C00',
  white: '#FFFFFF',
};

const START_DATE = '2026-07-15';
const TOTAL_DAYS = 49;

const TASKS = [
  { key: 'kondi', label: 'KONDI' },
  { key: 'kardio', label: 'KARDIÓ', hasText: true },
  { key: 'dieta', label: 'DIÉTA' },
  { key: 'lepes', label: '10.000 LÉPÉS' },
  { key: 'kreatin', label: 'KREATIN' },
];

const PENALTY_MAP = {
  kondi: '50 fekvőtámasz',
  kardio: '+3000 lépés',
  dieta: '100 guggolás',
  lepes: '+5000 lépés',
  kreatin: '25 fekvőtámasz',
};

const QUOTES = [
  ['JELENTKEZZ SZOLGÁLATRA.', 'A MOTIVÁCIÓ ELMÚLIK. A FEGYELEM MARAD.', 'MISSION ACCEPTED.'],
  ['MA SENKI NEM FOG HELYETTED DOLGOZNI.', 'REPORT FOR DUTY.', 'NINCS KIFOGÁS, CSAK TELJESÍTÉS.'],
  ['A TÜKÖR NEM HAZUDIK.', 'DISCIPLINE > MOTIVATION.', 'MINDEN NAP SZÁMÍT.'],
  ['NEM ÉRZED — MEGCSINÁLOD.', 'A FÉLÚT NEM SZÁMÍT.', 'TARTSD A TEMPÓT.'],
  ['A GYENGESÉG IDEIGLENES. A FELADÁS VÉGLEGES.', 'NÉZZ SZEMBE A NAPPAL.', 'NO EXCUSES.'],
  ['MÁR TÖBBET TELJESÍTETTÉL, MINT A LEGTÖBBEN VALAHA.', 'NE ÁLLJ MEG MOST.', 'A CÉL LÁTHATÓ TÁVOLSÁGBAN.'],
  ['AZ UTOLSÓ HÉT. NE HAGYD CSERBEN MAGAD.', 'FINISH THE MISSION.', 'ÍRD MEG A SAJÁT FINAL REPORTODAT.'],
];

function isoDate(d) { return d.toISOString().slice(0, 10); }
function addDays(dateStr, n) { const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return isoDate(d); }
function today() { return isoDate(new Date()); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function dayNumOf(dateStr) {
  return Math.floor((new Date(dateStr) - new Date(START_DATE)) / 86400000) + 1;
}
function weekIndexOf(dateStr) {
  return clamp(Math.floor((dayNumOf(dateStr) - 1) / 7), 0, 6);
}

function emptyChecklist() { return { kondi: false, kardio: false, kardioText: '', dieta: false, lepes: false, kreatin: false }; }

function resizeImageToBase64(file, maxWidth = 260, quality = 0.55) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const STORAGE_KEY = 'mission49-v1';

function defaultData() {
  return { checklist: {}, penaltyDone: {}, weeklyWeights: {}, photos: {}, workouts: [] };
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState(defaultData());
  const [tab, setTab] = useState('mission');
  const [booted, setBooted] = useState(false);
  const [bootLines, setBootLines] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData({ ...defaultData(), ...JSON.parse(raw) });
    } catch (e) { /* first run */ }
    setLoaded(true);
  }, []);

  const persist = useCallback((next) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { if (loaded) persist(data); }, [data, loaded, persist]);

  const BOOT_SEQ = ['INITIALIZING...', 'LOADING OPERATOR PROFILE...', 'SYNCING MISSION DATA...', 'MISSION READY.'];
  useEffect(() => {
    if (!loaded) return;
    let i = 0;
    setBootLines([]);
    const iv = setInterval(() => {
      i++;
      setBootLines(BOOT_SEQ.slice(0, i));
      if (i >= BOOT_SEQ.length) {
        clearInterval(iv);
        setTimeout(() => setBooted(true), 550);
      }
    }, 420);
    return () => clearInterval(iv);
  }, [loaded]);

  if (!loaded) return <Shell><div style={{ color: THEME.green }} className="num-font">LOADING…</div></Shell>;

  const dNum = clamp(dayNumOf(today()), 1, TOTAL_DAYS);
  const wIdx = weekIndexOf(today());
  const isComplete = dayNumOf(today()) > TOTAL_DAYS;

  if (!booted) {
    return (
      <Shell>
        <div className="num-font" style={{ color: THEME.green, fontSize: '14px', letterSpacing: '0.05em' }}>
          {bootLines.map((l, i) => (
            <div key={i} className="mb-2">
              &gt; {l}
              {i === bootLines.length - 1 && <span className="cursor-blink">▊</span>}
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  return (
    <div style={{ background: THEME.bg, color: THEME.text, fontFamily: "'Share Tech Mono', monospace", minHeight: '100vh' }} className="pb-20">
      <GlobalStyle />
      {tab === 'mission' && <MissionTab data={data} setData={setData} dNum={dNum} wIdx={wIdx} isComplete={isComplete} />}
      {tab === 'training' && <TrainingTab data={data} setData={setData} />}
      {tab === 'progress' && <ProgressTab data={data} setData={setData} wIdx={wIdx} />}
      {tab === 'command' && <CommandTab data={data} setData={setData} dNum={dNum} wIdx={wIdx} isComplete={isComplete} />}
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

function Shell({ children }) {
  return (
    <div style={{ background: THEME.bg, minHeight: '100vh' }} className="flex items-center justify-center px-6">
      <GlobalStyle />
      {children}
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Share+Tech+Mono&display=swap');
      .num-font { font-family: 'Share Tech Mono', monospace; }
      .display-font { font-family: 'Rajdhani', sans-serif; font-weight: 700; }
      .cursor-blink { animation: blink 1s step-start infinite; }
      @keyframes blink { 50% { opacity: 0; } }
      @keyframes scan { 0% { background-position: 0 0; } 100% { background-position: 0 40px; } }
      .scanlines::before {
        content: ''; position: absolute; inset: 0; pointer-events: none;
        background: repeating-linear-gradient(0deg, rgba(0,255,102,0.025) 0px, rgba(0,255,102,0.025) 1px, transparent 1px, transparent 3px);
      }
      input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    `}</style>
  );
}

function HUD({ dNum, wIdx, streak, score }) {
  return (
    <div className="px-5 pt-7 pb-5 relative scanlines" style={{ borderBottom: `1px solid ${THEME.border}` }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: THEME.green, letterSpacing: '0.2em' }}>OPERATION: DISCIPLINE</span>
        <span className="text-xs" style={{ color: THEME.textMuted }}>7 WEEK CHALLENGE</span>
      </div>
      <div className="display-font" style={{ fontSize: '2.4rem', lineHeight: 1, color: THEME.white, letterSpacing: '0.02em' }}>
        DAY {dNum}<span style={{ color: THEME.textMuted, fontSize: '1.4rem' }}>/{TOTAL_DAYS}</span>
      </div>
      <div className="flex gap-4 mt-3 num-font text-xs">
        <HudChip label="WEEK" value={`${wIdx + 1}/7`} color={THEME.orange} />
        <HudChip label="STREAK" value={streak} color={THEME.green} />
        <HudChip label="SCORE" value={`${score}%`} color={score >= 60 ? THEME.green : THEME.red} />
      </div>
    </div>
  );
}
function HudChip({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded" style={{ background: THEME.surfaceAlt, border: `1px solid ${THEME.border}` }}>
      <span style={{ color: THEME.textMuted }}>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}

function getPenaltiesForDate(dateStr, data) {
  if (dateStr <= START_DATE) return [];
  const prev = addDays(dateStr, -1);
  const prevC = data.checklist[prev];
  if (!prevC) return [];
  return TASKS.filter((t) => !prevC[t.key]).map((t) => ({ key: t.key, label: t.label, penalty: PENALTY_MAP[t.key] }));
}

function computeStreak(data, uptoDateStr) {
  let streak = 0;
  let d = uptoDateStr;
  while (d >= START_DATE) {
    const c = data.checklist[d];
    if (c && c.kondi && c.kardio && c.dieta && c.lepes && c.kreatin) { streak++; d = addDays(d, -1); }
    else break;
  }
  return streak;
}

function computeMissionScore(data, dNum, wIdx) {
  const dates = Array.from({ length: dNum }, (_, i) => addDays(START_DATE, i));
  let sum = 0;
  dates.forEach((d) => {
    const c = data.checklist[d];
    const done = c ? TASKS.filter((t) => c[t.key]).length : 0;
    sum += done / TASKS.length;
  });
  const checklistAvg = dNum ? sum / dNum : 0;
  const streak = computeStreak(data, today());
  const streakScore = Math.min(streak, 10) / 10;

  const weeksElapsed = wIdx + 1;
  const weighIns = Array.from({ length: weeksElapsed }, (_, i) => i).filter((i) => data.weeklyWeights[i] != null).length;
  const weighRatio = weeksElapsed ? weighIns / weeksElapsed : 0;

  const photoWeeks = Array.from({ length: weeksElapsed }, (_, i) => i).filter((i) => {
    const p = data.photos[i];
    return p && p.front && p.side && p.back;
  }).length;
  const photoRatio = weeksElapsed ? photoWeeks / weeksElapsed : 0;

  let penaltyMiss = 0;
  for (let i = 1; i < dNum; i++) {
    const d = addDays(START_DATE, i);
    const pens = getPenaltiesForDate(d, data);
    pens.forEach((p) => { if (!(data.penaltyDone[d] && data.penaltyDone[d][p.key])) penaltyMiss++; });
  }

  const raw = checklistAvg * 50 + streakScore * 20 + weighRatio * 15 + photoRatio * 15 - penaltyMiss * 1.5;
  return Math.round(clamp(raw, 0, 100));
}

function rankFor(score) {
  if (score >= 90) return 'S';
  if (score >= 75) return 'A';
  if (score >= 55) return 'B';
  if (score >= 35) return 'C';
  return 'D';
}

function MissionTab({ data, setData, dNum, wIdx, isComplete }) {
  const t = today();
  const checklist = data.checklist[t] || emptyChecklist();
  const penalties = getPenaltiesForDate(t, data);
  const penaltyDone = data.penaltyDone[t] || {};
  const streak = computeStreak(data, t);
  const score = computeMissionScore(data, dNum, wIdx);
  const quote = QUOTES[Math.min(wIdx, QUOTES.length - 1)][dNum % QUOTES[Math.min(wIdx, QUOTES.length - 1)].length];
  const isSunday = new Date(t + 'T00:00:00').getDay() === 0;
  const weekWeightSet = data.weeklyWeights[wIdx] != null;

  function setChecklist(next) {
    setData((prev) => ({ ...prev, checklist: { ...prev.checklist, [t]: next } }));
  }
  function toggleTask(key) {
    setChecklist({ ...checklist, [key]: !checklist[key] });
  }
  function togglePenalty(key) {
    setData((prev) => ({ ...prev, penaltyDone: { ...prev.penaltyDone, [t]: { ...(prev.penaltyDone[t] || {}), [key]: !(prev.penaltyDone[t] || {})[key] } } }));
  }

  if (isComplete) return <FinalReport data={data} dNum={49} wIdx={6} />;

  return (
    <div>
      <HUD dNum={dNum} wIdx={wIdx} streak={streak} score={score} />

      <div className="px-5 pt-5">
        <div className="rounded-lg px-4 py-3 num-font text-xs" style={{ background: THEME.surface, border: `1px solid ${THEME.borderBright}`, color: THEME.green, letterSpacing: '0.05em' }}>
          &gt; {quote}
        </div>
      </div>

      {isSunday && !weekWeightSet && (
        <div className="px-5 pt-4">
          <div className="rounded-lg px-4 py-3 flex items-center justify-between" style={{ background: `${THEME.orange}14`, border: `1px solid ${THEME.orange}` }}>
            <span className="text-xs num-font" style={{ color: THEME.orange }}>VASÁRNAPI RUTIN: HETI MÉRÉS ESEDÉKES</span>
          </div>
        </div>
      )}

      {penalties.length > 0 && (
        <div className="px-5 pt-4">
          <div className="rounded-lg px-4 py-3" style={{ background: `${THEME.red}12`, border: `1px solid ${THEME.red}` }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} color={THEME.red} />
              <span className="text-xs num-font" style={{ color: THEME.red, letterSpacing: '0.1em' }}>PENALTY ASSIGNED</span>
            </div>
            {penalties.map((p) => {
              const done = !!penaltyDone[p.key];
              return (
                <button key={p.key} onClick={() => togglePenalty(p.key)} className="w-full flex items-center justify-between py-1.5 text-sm">
                  <span style={{ color: done ? THEME.textMuted : THEME.text, textDecoration: done ? 'line-through' : 'none' }}>
                    {p.label} kimaradt → {p.penalty}
                  </span>
                  <span className="rounded flex items-center justify-center" style={{ width: 20, height: 20, background: done ? THEME.red : 'transparent', border: `1px solid ${THEME.red}` }}>
                    {done && <Check size={12} color={THEME.bg} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-5 pt-5">
        <div className="text-xs mb-2" style={{ color: THEME.textMuted, letterSpacing: '0.15em' }}>DAILY CHECKLIST</div>
        <div className="flex flex-col gap-2">
          {TASKS.map((task) => {
            const active = !!checklist[task.key];
            return (
              <div key={task.key} className="rounded-lg" style={{ background: active ? `${THEME.green}10` : THEME.surface, border: `1px solid ${active ? THEME.green : THEME.border}` }}>
                <button onClick={() => toggleTask(task.key)} className="w-full flex items-center justify-between px-4 py-3.5">
                  <span className="display-font" style={{ fontSize: '1rem', color: active ? THEME.green : THEME.text, letterSpacing: '0.03em' }}>{task.label}</span>
                  <span className="rounded flex items-center justify-center" style={{ width: 24, height: 24, background: active ? THEME.green : 'transparent', border: `1.5px solid ${active ? THEME.green : THEME.textMuted}` }}>
                    {active && <Check size={14} color={THEME.bg} strokeWidth={3} />}
                  </span>
                </button>
                {task.hasText && active && (
                  <div className="px-4 pb-3">
                    <input
                      value={checklist.kardioText}
                      onChange={(e) => setChecklist({ ...checklist, kardioText: e.target.value })}
                      placeholder="pl. futás, séta, úszás, bicikli..."
                      className="w-full rounded px-3 py-2 text-sm outline-none num-font"
                      style={{ background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, color: THEME.text }}
                    />
                  </div>
                )}
                {task.key === 'kreatin' && (
                  <div className="px-4 pb-3 text-xs num-font" style={{ color: THEME.textMuted }}>emlékeztető: 07:00 · 21:00</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <HistoryStrip data={data} t={t} />
    </div>
  );
}

function HistoryStrip({ data, t }) {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  return (
    <div className="px-5 pt-6">
      <div className="text-xs mb-2" style={{ color: THEME.textMuted, letterSpacing: '0.15em' }}>UTOLSÓ 7 NAP</div>
      <div className="grid grid-cols-7 gap-1.5">
        {dates.map((d) => {
          if (d < START_DATE) return <div key={d} />;
          const c = data.checklist[d];
          const n = c ? TASKS.filter((tk) => c[tk.key]).length : 0;
          const isToday = d === t;
          return (
            <div key={d} className="rounded flex flex-col items-center py-1.5" style={{ background: THEME.surface, border: `1px solid ${isToday ? THEME.green : THEME.border}` }}>
              <span style={{ fontSize: '9px', color: THEME.textMuted }}>{d.slice(8, 10)}</span>
              <div className="flex gap-0.5 mt-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} style={{ width: 3, height: 3, borderRadius: 999, background: i < n ? THEME.green : THEME.border }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrainingTab({ data, setData }) {
  const [form, setForm] = useState({ date: today(), exercise: '', sets: '', reps: '', weight: '', note: '' });
  const [selectedExercise, setSelectedExercise] = useState(null);

  function addWorkout() {
    if (!form.exercise.trim()) return;
    const entry = { id: Date.now(), ...form, sets: form.sets || '', reps: form.reps || '', weight: form.weight ? parseFloat(form.weight) : null };
    setData((prev) => ({ ...prev, workouts: [entry, ...prev.workouts] }));
    setForm({ date: today(), exercise: '', sets: '', reps: '', weight: '', note: '' });
  }
  function deleteWorkout(id) {
    setData((prev) => ({ ...prev, workouts: prev.workouts.filter((w) => w.id !== id) }));
  }

  const exerciseNames = [...new Set(data.workouts.map((w) => w.exercise))];
  const active = selectedExercise || exerciseNames[0];
  const chartData = data.workouts
    .filter((w) => w.exercise === active && w.weight != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({ date: w.date.slice(5), weight: w.weight }));

  return (
    <div className="px-5 pt-7">
      <div className="flex items-center gap-2 mb-1">
        <Dumbbell size={18} color={THEME.orange} />
        <span className="display-font text-xl" style={{ color: THEME.white }}>TRAINING LOG</span>
      </div>
      <div className="text-xs mb-5" style={{ color: THEME.textMuted, letterSpacing: '0.1em' }}>SAJÁT EDZÉSNAPOK ÉS GYAKORLATOK</div>

      <div className="rounded-lg p-4 mb-6" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded px-2 py-2 text-sm num-font outline-none" style={inputStyle} />
          <input placeholder="Gyakorlat (pl. Fekvenyomás)" value={form.exercise} onChange={(e) => setForm({ ...form, exercise: e.target.value })} className="rounded px-2 py-2 text-sm num-font outline-none" style={inputStyle} />
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <input placeholder="Sorozat" value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} className="rounded px-2 py-2 text-sm num-font outline-none" style={inputStyle} />
          <input placeholder="Ismétlés" value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} className="rounded px-2 py-2 text-sm num-font outline-none" style={inputStyle} />
          <input type="number" placeholder="Súly (kg)" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="rounded px-2 py-2 text-sm num-font outline-none" style={inputStyle} />
        </div>
        <input placeholder="Megjegyzés (opcionális)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full rounded px-2 py-2 text-sm num-font outline-none mb-3" style={inputStyle} />
        <button onClick={addWorkout} className="w-full rounded py-2.5 flex items-center justify-center gap-2 display-font" style={{ background: THEME.orange, color: THEME.bg }}>
          <Plus size={16} /> HOZZÁAD
        </button>
      </div>

      {exerciseNames.length > 0 && (
        <div className="mb-6">
          <div className="text-xs mb-2" style={{ color: THEME.textMuted, letterSpacing: '0.15em' }}>FEJLŐDÉS</div>
          <div className="flex gap-2 overflow-x-auto mb-3 pb-1">
            {exerciseNames.map((name) => (
              <button key={name} onClick={() => setSelectedExercise(name)} className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap num-font"
                style={{ background: active === name ? THEME.orange : THEME.surface, color: active === name ? THEME.bg : THEME.textMuted, border: `1px solid ${active === name ? THEME.orange : THEME.border}` }}>
                {name}
              </button>
            ))}
          </div>
          {chartData.length > 1 ? (
            <div className="rounded-lg p-3" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={THEME.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: THEME.textMuted, fontSize: 10 }} axisLine={{ stroke: THEME.border }} tickLine={false} />
                  <YAxis tick={{ fill: THEME.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, fontSize: 12 }} labelStyle={{ color: THEME.textMuted }} />
                  <Line type="monotone" dataKey="weight" stroke={THEME.orange} strokeWidth={2} dot={{ r: 3, fill: THEME.orange }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-xs num-font" style={{ color: THEME.textMuted }}>Legalább 2 bejegyzés kell a grafikonhoz.</div>
          )}
        </div>
      )}

      <div className="text-xs mb-2" style={{ color: THEME.textMuted, letterSpacing: '0.15em' }}>NAPLÓ</div>
      <div className="flex flex-col gap-2">
        {data.workouts.map((w) => (
          <div key={w.id} className="rounded-lg px-3 py-2.5 flex items-center justify-between" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
            <div>
              <div className="text-sm display-font" style={{ color: THEME.text }}>{w.exercise}</div>
              <div className="text-xs num-font" style={{ color: THEME.textMuted }}>
                {w.date} · {w.sets || '–'}×{w.reps || '–'} {w.weight ? `· ${w.weight}kg` : ''} {w.note ? `· ${w.note}` : ''}
              </div>
            </div>
            <button onClick={() => deleteWorkout(w.id)} style={{ color: THEME.textMuted }}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle = { background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, color: THEME.text };

function ProgressTab({ data, setData, wIdx }) {
  const weightEntries = Object.entries(data.weeklyWeights).sort((a, b) => Number(a[0]) - Number(b[0]));
  const chartData = weightEntries.map(([w, val]) => ({ week: `H${Number(w) + 1}`, weight: val }));
  const [inputVal, setInputVal] = useState('');
  const fileRef = useRef({});

  function saveWeight() {
    const v = parseFloat(inputVal.replace(',', '.'));
    if (isNaN(v) || v <= 0) return;
    setData((prev) => ({ ...prev, weeklyWeights: { ...prev.weeklyWeights, [wIdx]: v } }));
    setInputVal('');
  }

  async function handlePhoto(slot, file) {
    if (!file) return;
    const b64 = await resizeImageToBase64(file);
    setData((prev) => ({ ...prev, photos: { ...prev.photos, [wIdx]: { ...(prev.photos[wIdx] || {}), [slot]: b64 } } }));
  }

  const reports = [];
  for (let i = 1; i <= wIdx; i++) {
    const cur = data.weeklyWeights[i];
    const prev = data.weeklyWeights[i - 1];
    if (cur == null || prev == null) continue;
    const diff = cur - prev;
    let verdict;
    if (diff <= -1) verdict = 'Kiváló.';
    else if (diff <= -0.2) verdict = 'Rendben, haladsz.';
    else if (diff <= 0) verdict = 'A fogyás lassult. Valószínűleg vízvisszatartás.';
    else verdict = 'Súlynövekedés. Vizsgáld át a hetet.';
    reports.push({ week: i + 1, diff, verdict });
  }

  return (
    <div className="px-5 pt-7">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp size={18} color={THEME.green} />
        <span className="display-font text-xl" style={{ color: THEME.white }}>PROGRESS</span>
      </div>
      <div className="text-xs mb-5" style={{ color: THEME.textMuted, letterSpacing: '0.1em' }}>HETI MÉRÉS ÉS FOTÓK</div>

      <div className="flex gap-2 mb-4">
        <input type="number" step="0.1" inputMode="decimal" value={inputVal} onChange={(e) => setInputVal(e.target.value)}
          placeholder={data.weeklyWeights[wIdx] != null ? `${data.weeklyWeights[wIdx]} kg (rögzítve)` : `${wIdx + 1}. heti súly (kg)`}
          className="flex-1 rounded-lg px-3 py-2.5 text-sm num-font outline-none" style={inputStyle} />
        <button onClick={saveWeight} className="px-5 rounded-lg display-font" style={{ background: THEME.green, color: THEME.bg }}>MENTÉS</button>
      </div>

      {chartData.length > 1 && (
        <div className="rounded-lg p-3 mb-6" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={THEME.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: THEME.textMuted, fontSize: 10 }} axisLine={{ stroke: THEME.border }} tickLine={false} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: THEME.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={{ background: THEME.surfaceAlt, border: `1px solid ${THEME.border}`, fontSize: 12 }} labelStyle={{ color: THEME.textMuted }} />
              <Line type="monotone" dataKey="weight" stroke={THEME.green} strokeWidth={2} dot={{ r: 3, fill: THEME.green }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="text-xs mb-2" style={{ color: THEME.textMuted, letterSpacing: '0.15em' }}>{wIdx + 1}. HETI FOTÓK</div>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {['front', 'side', 'back'].map((slot) => {
          const label = slot === 'front' ? 'ELÖL' : slot === 'side' ? 'OLDAL' : 'HÁTUL';
          const img = data.photos[wIdx] && data.photos[wIdx][slot];
          return (
            <div key={slot}>
              <button
                onClick={() => fileRef.current[slot] && fileRef.current[slot].click()}
                className="w-full aspect-square rounded-lg flex flex-col items-center justify-center overflow-hidden"
                style={{ background: THEME.surface, border: `1px dashed ${THEME.border}` }}
              >
                {img ? <img src={img} alt={label} className="w-full h-full object-cover" /> : <Camera size={20} color={THEME.textMuted} />}
              </button>
              <input ref={(el) => (fileRef.current[slot] = el)} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhoto(slot, e.target.files[0])} />
              <div className="text-center text-xs mt-1 num-font" style={{ color: THEME.textMuted }}>{label}</div>
            </div>
          );
        })}
      </div>

      {reports.length > 0 && (
        <div>
          <div className="text-xs mb-2" style={{ color: THEME.textMuted, letterSpacing: '0.15em' }}>HETI JELENTÉSEK</div>
          <div className="flex flex-col gap-2">
            {reports.map((r) => (
              <div key={r.week} className="rounded-lg px-3 py-2.5" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs num-font" style={{ color: THEME.textMuted }}>WEEK {r.week} REPORT</span>
                  <span className="num-font text-sm" style={{ color: r.diff < 0 ? THEME.green : THEME.red }}>{r.diff > 0 ? '+' : ''}{r.diff.toFixed(1)} kg</span>
                </div>
                <div className="text-sm" style={{ color: THEME.text }}>{r.verdict}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CommandTab({ data, setData, dNum, wIdx, isComplete }) {
  const score = computeMissionScore(data, dNum, wIdx);
  const rank = rankFor(score);
  const streak = computeStreak(data, today());
  const totals = TASKS.reduce((acc, t) => {
    acc[t.key] = Object.values(data.checklist).filter((c) => c && c[t.key]).length;
    return acc;
  }, {});
  const weightEntries = Object.entries(data.weeklyWeights).sort((a, b) => Number(a[0]) - Number(b[0]));
  const startW = weightEntries.length ? weightEntries[0][1] : null;
  const nowW = weightEntries.length ? weightEntries[weightEntries.length - 1][1] : null;

  let penaltyTotal = 0, penaltyDoneCount = 0;
  for (let i = 1; i < dNum; i++) {
    const d = addDays(START_DATE, i);
    getPenaltiesForDate(d, data).forEach((p) => {
      penaltyTotal++;
      if (data.penaltyDone[d] && data.penaltyDone[d][p.key]) penaltyDoneCount++;
    });
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mission49-export.json'; a.click();
    URL.revokeObjectURL(url);
  }
  function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        setData({ ...defaultData(), ...parsed });
      } catch (err) { console.error('invalid file'); }
    };
    reader.readAsText(file);
  }
  function resetAll() {
    if (!window.confirm('MINDEN ADAT TÖRLÉSE. Biztosan folytatod?')) return;
    setData(defaultData());
  }

  return (
    <div className="px-5 pt-7">
      <div className="flex items-center gap-2 mb-1">
        <Terminal size={18} color={THEME.green} />
        <span className="display-font text-xl" style={{ color: THEME.white }}>COMMAND</span>
      </div>
      <div className="text-xs mb-5" style={{ color: THEME.textMuted, letterSpacing: '0.1em' }}>STATUS REPORT</div>

      {isComplete && <FinalReport data={data} dNum={49} wIdx={6} embedded />}

      <div className="rounded-lg p-4 mb-5 text-center" style={{ background: THEME.surface, border: `1px solid ${THEME.borderBright}` }}>
        <div className="text-xs" style={{ color: THEME.textMuted, letterSpacing: '0.2em' }}>CURRENT RANK</div>
        <div className="display-font" style={{ fontSize: '3.5rem', color: rank === 'S' || rank === 'A' ? THEME.green : rank === 'D' ? THEME.red : THEME.orange, lineHeight: 1.1 }}>{rank}</div>
        <div className="num-font text-sm" style={{ color: THEME.textMuted }}>MISSION SCORE {score}%</div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <Stat label="KEZDŐ SÚLY" value={startW ? `${startW} kg` : '–'} />
        <Stat label="JELENLEGI" value={nowW ? `${nowW} kg` : '–'} />
        <Stat label="LEADOTT" value={startW && nowW ? `${(startW - nowW).toFixed(1)} kg` : '–'} color={startW && nowW && nowW < startW ? THEME.green : THEME.text} />
        <Stat label="STREAK" value={`${streak} nap`} color={THEME.orange} />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {TASKS.map((t) => <Stat key={t.key} label={t.label} value={`${totals[t.key]}x`} />)}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-6">
        <Stat label="BÜNTETÉS TELJESÍTVE" value={`${penaltyDoneCount}/${penaltyTotal}`} color={penaltyDoneCount === penaltyTotal ? THEME.green : THEME.red} />
        <Stat label="EDZÉS BEJEGYZÉS" value={`${data.workouts.length}`} />
      </div>

      <div className="flex flex-col gap-2">
        <button onClick={exportData} className="w-full rounded-lg py-2.5 flex items-center justify-center gap-2 display-font" style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text }}>
          <Download size={15} /> EXPORT
        </button>
        <label className="w-full rounded-lg py-2.5 flex items-center justify-center gap-2 display-font cursor-pointer" style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text }}>
          <Upload size={15} /> IMPORT
          <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files[0] && importData(e.target.files[0])} />
        </label>
        <button onClick={resetAll} className="w-full rounded-lg py-2.5 flex items-center justify-center gap-2 display-font" style={{ background: `${THEME.red}12`, border: `1px solid ${THEME.red}`, color: THEME.red }}>
          <RotateCcw size={15} /> RESET
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="rounded-lg px-3 py-3" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
      <div style={{ fontSize: '10px', color: THEME.textMuted, letterSpacing: '0.08em' }}>{label}</div>
      <div className="num-font mt-1" style={{ fontSize: '1.15rem', color: color || THEME.text }}>{value}</div>
    </div>
  );
}

function FinalReport({ data, dNum, wIdx, embedded }) {
  const score = computeMissionScore(data, dNum, wIdx);
  const rank = rankFor(score);
  const weightEntries = Object.entries(data.weeklyWeights).sort((a, b) => Number(a[0]) - Number(b[0]));
  const startW = weightEntries.length ? weightEntries[0][1] : null;
  const nowW = weightEntries.length ? weightEntries[weightEntries.length - 1][1] : null;

  const content = (
    <div className="rounded-lg p-5 text-center mb-6" style={{ background: THEME.surface, border: `1px solid ${THEME.green}` }}>
      <div className="display-font" style={{ fontSize: '1.5rem', color: THEME.green, letterSpacing: '0.05em' }}>MISSION COMPLETE</div>
      <div className="text-xs num-font mt-1" style={{ color: THEME.textMuted, letterSpacing: '0.15em' }}>FINAL REPORT</div>
      <div className="grid grid-cols-2 gap-2 mt-4 text-left">
        <Stat label="INITIAL WEIGHT" value={startW ? `${startW} kg` : '–'} />
        <Stat label="FINAL WEIGHT" value={nowW ? `${nowW} kg` : '–'} />
        <Stat label="TOTAL LOSS" value={startW && nowW ? `${(startW - nowW).toFixed(1)} kg` : '–'} color={THEME.green} />
        <Stat label="MISSION SCORE" value={`${score}%`} />
      </div>
      <div className="display-font mt-4" style={{ fontSize: '2.5rem', color: THEME.green }}>RANK {rank}</div>
      <div className="text-xs num-font mt-3" style={{ color: THEME.textMuted }}>
        COMMAND: Mission completed. You earned the result. The next mission is yours.
      </div>
    </div>
  );

  if (embedded) return content;
  return <div className="px-5 pt-7">{content}</div>;
}

function BottomNav({ tab, setTab }) {
  const items = [
    { key: 'mission', label: 'MISSION', icon: Target },
    { key: 'training', label: 'TRAINING', icon: Dumbbell },
    { key: 'progress', label: 'PROGRESS', icon: TrendingUp },
    { key: 'command', label: 'COMMAND', icon: Terminal },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 flex" style={{ background: THEME.surface, borderTop: `1px solid ${THEME.border}` }}>
      {items.map((it) => {
        const Icon = it.icon;
        const active = tab === it.key;
        return (
          <button key={it.key} onClick={() => setTab(it.key)} className="flex-1 flex flex-col items-center gap-1 py-2.5">
            <Icon size={18} color={active ? THEME.green : THEME.textMuted} />
            <span style={{ fontSize: '9px', color: active ? THEME.green : THEME.textMuted, letterSpacing: '0.08em' }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
