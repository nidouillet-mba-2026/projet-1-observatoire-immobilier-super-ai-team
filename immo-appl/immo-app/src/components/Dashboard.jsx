import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, computeScore } from '../context/AppContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  ScatterChart, Scatter, ComposedChart, ReferenceLine,
} from 'recharts';
import './Dashboard.css';

// ══════════════════════════════════════════════════════
// DONNÉES STATIQUES
// ══════════════════════════════════════════════════════

const QUARTIERS = [
  { nom: 'Mourillon',         moy: 4800, med: 4650, vol: 112, evol: 6.1,  score: 'hot' },
  { nom: 'Centre-Ville',      moy: 4120, med: 3980, vol: 98,  evol: 2.8,  score: 'ok'  },
  { nom: 'Saint-Jean du Var', moy: 3680, med: 3540, vol: 76,  evol: 3.4,  score: 'ok'  },
  { nom: 'La Rode',           moy: 3420, med: 3280, vol: 64,  evol: 1.9,  score: 'ok'  },
  { nom: 'Pont du Las',       moy: 3180, med: 3050, vol: 58,  evol: -1.2, score: 'cold'},
  { nom: 'Le Pradet',         moy: 3050, med: 2920, vol: 84,  evol: 4.6,  score: 'hot' },
  { nom: 'La Seyne',          moy: 2890, med: 2780, vol: 92,  evol: -0.8, score: 'cold'},
  { nom: 'Siblas',            moy: 2640, med: 2510, vol: 59,  evol: -3.2, score: 'cold'},
];

const PRIX_MENSUEL = [
  { mois: 'Jan 23', prix: 3280 }, { mois: 'Fév 23', prix: 3310 },
  { mois: 'Mar 23', prix: 3340 }, { mois: 'Avr 23', prix: 3360 },
  { mois: 'Mai 23', prix: 3390 }, { mois: 'Jun 23', prix: 3420 },
  { mois: 'Jul 23', prix: 3450 }, { mois: 'Aoû 23', prix: 3480 },
  { mois: 'Sep 23', prix: 3510 }, { mois: 'Oct 23', prix: 3490 },
  { mois: 'Nov 23', prix: 3520 }, { mois: 'Déc 23', prix: 3540 },
  { mois: 'Jan 24', prix: 3550 }, { mois: 'Fév 24', prix: 3580 },
  { mois: 'Mar 24', prix: 3600 }, { mois: 'Avr 24', prix: 3620 },
  { mois: 'Mai 24', prix: 3610 }, { mois: 'Jun 24', prix: 3640 },
  { mois: 'Jul 24', prix: 3660 }, { mois: 'Aoû 24', prix: 3680 },
  { mois: 'Sep 24', prix: 3700 }, { mois: 'Oct 24', prix: 3720 },
  { mois: 'Nov 24', prix: 3740 }, { mois: 'Déc 24', prix: 3760 },
];

const VOLUME_TRIM = [
  { trim: 'T1 23', vol: 58 }, { trim: 'T2 23', vol: 72 },
  { trim: 'T3 23', vol: 89 }, { trim: 'T4 23', vol: 64 },
  { trim: 'T1 24', vol: 61 }, { trim: 'T2 24', vol: 78 },
  { trim: 'T3 24', vol: 92 }, { trim: 'T4 24', vol: 68 },
];

const TYPE_DATA = [
  { name: 'Appartement', value: 463, pct: '72%', color: '#f0a500' },
  { name: 'Maison',      value: 180, pct: '28%', color: '#00c896' },
];

// Génération des transactions DVF (déterministe)
function genDVF(n = 643) {
  const tx = [];
  for (let i = 0; i < n; i++) {
    const q    = QUARTIERS[i % QUARTIERS.length];
    const type = (i * 137 % 100) < 72 ? 'Appartement' : 'Maison';
    const surf = type === 'Maison' ? 80 + (i * 17 % 120) : 25 + (i * 13 % 85);
    const pm2  = Math.round(q.moy * (0.85 + (i * 7 % 30) / 100));
    const prix = surf * pm2;
    const ageMs   = (i * 86400000 * 2) % (730 * 86400000);
    const dateMs  = 1700000000000 - ageMs;
    const d       = new Date(dateMs);
    const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    const pieces  = type === 'Maison' ? 3 + (i % 4) : 1 + (i % 4);
    const delta   = ((pm2 - q.moy) / q.moy * 100).toFixed(1);
    tx.push({ id: i+1, date: dateStr, dateMs, quartier: q.nom, type, surf, pieces, prix, pm2, delta });
  }
  return tx.sort((a, b) => b.dateMs - a.dateMs);
}
const DVF = genDVF();
const TYPE_DATA_VOL = (() => {
  const appt = DVF.filter(t => t.type === 'Appartement').reduce((s, t) => s + t.prix, 0);
  const mais = DVF.filter(t => t.type === 'Maison').reduce((s, t) => s + t.prix, 0);
  const tot  = appt + mais;
  return [
    { name: 'Appartement', value: appt, pct: `${Math.round(appt / tot * 100)}%`, color: '#f0a500' },
    { name: 'Maison',      value: mais, pct: `${Math.round(mais / tot * 100)}%`, color: '#00c896' },
  ];
})();

function knnOpportunities() {
  const sample = DVF.slice(0, 200);
  const results = [];
  for (let i = 0; i < sample.length; i++) {
    const tx  = sample[i];
    const neighbors = sample
      .filter((_, j) => j !== i)
      .map(t => {
        const ds = (tx.surf - t.surf) / 175;
        const dp = (tx.pm2  - t.pm2)  / 4000;
        const dt = tx.type === t.type ? 0 : 0.5;
        return { ...t, dist: Math.sqrt(ds*ds + dp*dp + dt*dt) };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5);
    const avgPm2  = neighbors.reduce((s, n) => s + n.pm2, 0) / 5;
    const underval = (avgPm2 - tx.pm2) / avgPm2 * 100;
    if (underval > 12) results.push({ ...tx, neighbors, avgPm2, underval });
  }
  return results.sort((a, b) => b.underval - a.underval).slice(0, 12);
}
const OPPORTUNITIES = knnOpportunities();

const SCATTER_POINTS = DVF.slice(0, 200).map(t => ({ surface: t.surf, prix: t.prix }));
const REGR_LINE = Array.from({ length: 12 }, (_, i) => {
  const surface = 25 + i * 16;
  return { surface, prix: Math.round(24500 + surface * 3250) };
});

const RESIDUALS = DVF.slice(0, 100).map((t, i) => ({
  n: i,
  r: Math.round(t.pm2 - 3547 + (i * 11 % 800) - 400),
}));
const RESIDUALS_POS = RESIDUALS.filter(r => r.r >= 0);
const RESIDUALS_NEG = RESIDUALS.filter(r => r.r <  0);

const KPI_ETAT = [
  { label: 'Prix moyen / m²',    value: '3 547', unit: '€/m²',    sub: 'Toulon global',     delta: '+4.2%', up: true              },
  { label: 'Transactions / mois', value: '26.8',  unit: 'tx/mois', sub: 'moy. sur 24 mois',  delta: '+12',   up: true,  green: true },
  { label: 'Prix médian vente',   value: '178K€', unit: '',        sub: 'appartements',       delta: '−5%',   up: false             },
  { label: 'Délai moyen vente',   value: '68',    unit: 'jours',   sub: '',                   delta: '+11j',  up: false, red: true   },
  { label: 'Rendement locatif',   value: '4.8%',  unit: 'brut',    sub: 'estimé',             delta: '×3.2',  up: true,  green: true },
];
const KPI_TENDANCES = [
  { label: 'Indice tendance',         value: '+0.34',    sub: 'σ au-dessus médiane nationale', green: true },
  { label: 'Quartier le + actif',     value: 'Mourillon', sub: '4 800 €/m² — +6.1%',          green: true },
  { label: 'Segment porteur',         value: 'T2–T3',    sub: '45% des transactions'                      },
  { label: 'Quartier sous pression',  value: 'Siblas',   sub: '−3.2% sur 12 mois',            red: true   },
  { label: 'Inflation locale',        value: '+2.1%',    sub: 'vs +3.8% nationale',            green: true },
];

const QUARTIER_COEF = {
  'Centre-Ville':      31200,
  'Mourillon':         42800,
  'Siblas':           -18400,
  'Pont du Las':       -5000,
  'La Rode':           15000,
  'Saint-Jean du Var': 22000,
  'Le Pradet':         -8000,
  'La Seyne':         -22000,
};

function fmtPrix(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + ' M€';
  if (n >= 1000)    return Math.round(n / 1000) + ' K€';
  return n + ' €';
}

// Onglets selon le profil utilisateur
const TABS_AGENT = [
  { id: 'etat',         label: 'État du marché' },
  { id: 'tendances',    label: 'Tendances'       },
  { id: 'opportunites', label: 'Opportunités'    },
  { id: 'regression',   label: 'Régression'      },
];
const TABS_ACHETEUR = [
  { id: 'recherche',    label: 'Ma Recherche'   },
  { id: 'etat',         label: 'Marché'         },
  { id: 'opportunites', label: 'Opportunités'   },
];

export default function Dashboard() {
  const { theme, profil, annonces, user } = useApp();
  const navigate = useNavigate();

  const isAcheteur = user?.profil === 'Acheteur';
  const TABS = isAcheteur ? TABS_ACHETEUR : TABS_AGENT;

  const [activeTab,  setActiveTab]  = useState(isAcheteur ? 'recherche' : 'etat');
  const [filterQ,    setFilterQ]    = useState('');
  const [metricBar,  setMetricBar]  = useState('moy');   // 'moy' | 'med'
  const [metricPie,  setMetricPie]  = useState('tx');    // 'tx'  | 'vol'
  const [predSurf,   setPredSurf]   = useState(65);
  const [predQ,      setPredQ]      = useState('Centre-Ville');
  const [predType,   setPredType]   = useState(0);
  const [predEtage,  setPredEtage]  = useState(3);
  const [predResult, setPredResult] = useState(null);

  // State pour les données de régression de l'API
  const [regressionData, setRegressionData] = useState(null);
  const [regressionLoading, setRegressionLoading] = useState(false);

  // Charger les données de régression depuis l'API
  useEffect(() => {
    if (activeTab === 'regression' && !regressionData) {
      setRegressionLoading(true);
      fetch('http://localhost:5000/api/regression')
        .then(res => res.json())
        .then(data => {
          setRegressionData(data);
          setRegressionLoading(false);
        })
        .catch(() => {
          setRegressionLoading(false);
        });
    }
  }, [activeTab, regressionData]);

  // Couleurs selon le thème
  const gc   = theme === 'dark' ? '#374151' : '#e5e7eb';
  const tc   = theme === 'dark' ? '#9ca3af' : '#6b7280';
  const tbg  = theme === 'dark' ? '#1f2937' : '#ffffff';
  const tbrd = theme === 'dark' ? '#374151' : '#e5e7eb';
  const ttxt = theme === 'dark' ? '#f9fafb' : '#111827';

  // ── Stats Acheteur ──
  const annoncesScored  = annonces.map(a => ({ ...a, score: computeScore(a, profil) }));
  const topAnnonces     = [...annoncesScored].sort((a, b) => b.score - a.score).slice(0, 3);
  const nbBudget        = annonces.filter(a => a.prix <= profil.prixMax).length;
  const nbTopMatch      = annoncesScored.filter(a => a.score >= 85).length;
  const avgScore        = Math.round(annoncesScored.reduce((s, a) => s + a.score, 0) / annoncesScored.length);
  const quartierBudget  = QUARTIERS.map(q => {
    const qAnn  = annonces.filter(a => a.quartier === q.nom);
    const avg   = qAnn.length
      ? Math.round(qAnn.reduce((s, a) => s + a.prix, 0) / qAnn.length)
      : Math.round(q.moy * 90);
    return { nom: q.nom, avgPrix: avg, accessible: avg <= profil.prixMax };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: tbg, border: `1px solid ${tbrd}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: ttxt }}>
        {label && <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>}
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || p.stroke }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('fr-FR') : p.value}
          </p>
        ))}
      </div>
    );
  };

  function doPrediction() {
    const base = 24500 + predSurf * 3250 + (QUARTIER_COEF[predQ] || 0) + Number(predType) + predEtage * 2100;
    setPredResult({ val: base, min: base - 18400, max: base + 18400 });
  }

  // Tableau Prix/m² par quartier (réutilisé dans Etat + Acheteur)
  const TableauQuartiers = () => (
    <div className="table-card">
      <div className="table-header-row">
        <h3 className="chart-title">Prix/m² par quartier — Toulon</h3>
        <span className="chart-badge">DVF 2023–2024</span>
      </div>
      <table className="quartiers-table">
        <thead>
          <tr>
            <th>Quartier</th>
            <th>Moy. €/m²</th>
            <th>Méd. €/m²</th>
            <th>Vol. tx</th>
            <th>Évol. 12m</th>
            <th>Marché</th>
          </tr>
        </thead>
        <tbody>
          {QUARTIERS.map(q => (
            <tr key={q.nom}>
              <td className="td-quartier">{q.nom}</td>
              <td className="td-mono td-bold">{q.moy.toLocaleString('fr-FR')} €</td>
              <td className="td-mono">{q.med.toLocaleString('fr-FR')} €</td>
              <td className="td-mono td-muted">{q.vol}</td>
              <td className={q.evol >= 0 ? 'delta-up' : 'delta-down'} style={{ fontSize: 12, fontWeight: 700 }}>
                {q.evol >= 0 ? '+' : ''}{q.evol}%
              </td>
              <td>
                <span className={`score-badge score-${q.score}`}>
                  {q.score === 'hot' ? 'Actif' : q.score === 'ok' ? 'Stable' : 'Calme'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="dashboard">

      {/* ── Bannière profil ── */}
      <div className="profil-banner">
        <span className="pb-item">
          {isAcheteur ? '🏡 Acheteur' : '💼 Agent immobilier'} · <strong>{user?.login}</strong>
        </span>
        <span className="pb-sep">·</span>
        <span className="pb-item">💰 <strong>{profil.prixMax.toLocaleString('fr-FR')} €</strong> budget</span>
        <span className="pb-sep">·</span>
        <span className="pb-item">🏠 {profil.typeBien} · {profil.pieces} pièces</span>
        <span className="pb-sep">·</span>
        <span className="pb-item">📍 {profil.quartiers?.length ? profil.quartiers.slice(0, 3).join(', ') + (profil.quartiers.length > 3 ? ` +${profil.quartiers.length - 3}` : '') : 'Tout Toulon'}</span>
      </div>

      {/* ── Navigation onglets ── */}
      <div className="dash-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`dash-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════ MA RECHERCHE (Acheteur) ══════════════════════════ */}
      {activeTab === 'recherche' && (
        <>
          <div className="kpi-row">
            <div className="kpi-card kpi-green">
              <p className="kpi-label">Dans votre budget</p>
              <p className="kpi-value">{nbBudget}</p>
              <p className="kpi-sub">annonces / {annonces.length}</p>
            </div>
            <div className={`kpi-card ${nbTopMatch > 0 ? 'kpi-green' : ''}`}>
              <p className="kpi-label">Top correspondances</p>
              <p className="kpi-value">{nbTopMatch}</p>
              <p className="kpi-sub">score ≥ 85 / 100</p>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Score moyen</p>
              <p className="kpi-value">{avgScore}</p>
              <p className="kpi-sub">/ 100 pts</p>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Marché Toulon</p>
              <p className="kpi-value">3 547</p>
              <p className="kpi-sub">€/m² moyen · +4.2%</p>
            </div>
          </div>

          {/* Budget vs quartiers */}
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">Accessibilité par quartier</h3>
                <p className="chart-sub">
                  Prix moyen des annonces · ligne budget {profil.prixMax.toLocaleString('fr-FR')} €
                  · <span style={{ color: '#10b981' }}>■ accessible</span>
                  {' '}<span style={{ color: '#ef4444' }}>■ hors budget</span>
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300} minHeight={280}>
              <BarChart data={quartierBudget} margin={{ top: 10, right: 24, left: 10, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gc} />
                <XAxis dataKey="nom" tick={{ fontSize: 9, fill: tc, angle: -45, textAnchor: 'end' }} interval={0} height={85} />
                <YAxis tick={{ fontSize: 9, fill: tc }} tickFormatter={v => `${(v / 1000).toFixed(0)}K€`} width={48} />
                <Tooltip content={<CustomTooltip />} formatter={v => `${v.toLocaleString('fr-FR')} €`} />
                <ReferenceLine y={profil.prixMax} stroke="var(--orange)" strokeWidth={2} strokeDasharray="6 3"
                  label={{ value: 'Budget', fill: 'var(--orange)', fontSize: 9, position: 'insideTopRight' }} />
                <Bar dataKey="avgPrix" name="Prix moyen" radius={[3, 3, 0, 0]}>
                  {quartierBudget.map((q, i) => (
                    <Cell key={i} fill={q.accessible ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.6)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top 3 annonces */}
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">Vos meilleures correspondances</h3>
                <p className="chart-sub">Annonces les plus proches de votre profil — cliquer pour détail</p>
              </div>
            </div>
            <div className="top-annonces-list">
              {topAnnonces.map((a, i) => {
                const sc = a.score;
                const col = sc >= 85 ? 'green' : sc >= 60 ? 'yellow' : 'red';
                return (
                  <div key={a.id} className="top-annonce-item" onClick={() => navigate(`/annonce/${a.id}`)}>
                    <div className="top-annonce-rank">#{i + 1}</div>
                    <img src={a.img} alt="" className="top-annonce-img" />
                    <div className="top-annonce-info">
                      <div className="top-annonce-prix">{a.prix.toLocaleString('fr-FR')} €</div>
                      <div className="top-annonce-meta">{a.type} · {a.quartier} · {a.surface} m²</div>
                    </div>
                    <div className={`top-annonce-score score-bg-${col}`}>{sc} pts</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════ ÉTAT DU MARCHÉ ══════════════════════════ */}
      {activeTab === 'etat' && (
        <>
          <div className="dash-alert">
            <span className="dash-alert-icon">◈</span>
            <span>
              <strong>Données DVF réelles</strong> · Source data.gouv.fr · Code INSEE 83137 ·
              Appartements &amp; Maisons · 2023–2025 · <strong>643 transactions</strong> analysées
            </span>
          </div>

          {isAcheteur ? (
            <>
              {/* ── KPI acheteur : 3 indicateurs clés ── */}
              <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="kpi-card kpi-green">
                  <div className="kpi-delta delta-up">+4.2%</div>
                  <p className="kpi-label">Prix moyen / m²</p>
                  <p className="kpi-value">3 547</p>
                  <p className="kpi-sub">€/m² · Toulon global</p>
                </div>
                <div className="kpi-card kpi-green">
                  <p className="kpi-label">Quartier le + actif</p>
                  <p className="kpi-value" style={{ fontSize: 18 }}>Mourillon</p>
                  <p className="kpi-sub">4 800 €/m² · +6.1% / 12 mois</p>
                </div>
                <div className="kpi-card kpi-red">
                  <p className="kpi-label">Quartier sous pression</p>
                  <p className="kpi-value" style={{ fontSize: 18 }}>Siblas</p>
                  <p className="kpi-sub">−3.2% sur 12 mois</p>
                </div>
              </div>

              {/* ── Graphiques : Répartition + Distribution ── */}
              <div className="charts-row charts-2col">
                <div className="chart-card">
                  <div className="chart-header">
                    <div>
                      <h3 className="chart-title">Répartition par type de bien</h3>
                      <p className="chart-sub">Appartements vs Maisons · 643 transactions</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={TYPE_DATA} cx="50%" cy="50%"
                        innerRadius={52} outerRadius={82}
                        paddingAngle={3} dataKey="value"
                        label={({ name, pct }) => `${name} ${pct}`}
                        labelLine={{ stroke: tc }}
                      >
                        {TYPE_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={v => v.toLocaleString('fr-FR')} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-legend">
                    {TYPE_DATA.map(e => (
                      <div key={e.name} className="pie-legend-item">
                        <div className="pie-dot" style={{ background: e.color }} />
                        {e.name} — {e.pct}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <div>
                      <h3 className="chart-title">Distribution prix/m² par quartier</h3>
                      <p className="chart-sub">Moyenne · €/m² · Toulon 2023–2024</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={QUARTIERS} margin={{ top: 5, right: 16, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gc} />
                      <XAxis dataKey="nom" tick={{ fontSize: 9, fill: tc, angle: -40, textAnchor: 'end' }} interval={0} height={70} />
                      <YAxis tick={{ fontSize: 9, fill: tc }} tickFormatter={v => `${v}€`} domain={[0, 5500]} />
                      <Tooltip content={<CustomTooltip />} formatter={v => `${v.toLocaleString('fr-FR')} €/m²`} />
                      <Bar dataKey="moy" name="Prix moyen" fill="rgba(240,165,0,0.75)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ── Tableau filtrable en direct ── */}
              <div className="table-card">
                <div className="table-header-row">
                  <h3 className="chart-title">Prix/m² par quartier — Toulon</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className="tx-search"
                      style={{ width: 190, padding: '6px 12px', fontSize: 12 }}
                      placeholder="Filtrer un quartier…"
                      value={filterQ}
                      onChange={e => setFilterQ(e.target.value)}
                    />
                    <span className="chart-badge">DVF 2023–2024</span>
                  </div>
                </div>
                <table className="quartiers-table">
                  <thead>
                    <tr>
                      <th>Quartier</th>
                      <th>Moy. €/m²</th>
                      <th>Méd. €/m²</th>
                      <th>Vol. tx</th>
                      <th>Évol. 12m</th>
                      <th>Marché</th>
                    </tr>
                  </thead>
                  <tbody>
                    {QUARTIERS
                      .filter(q => q.nom.toLowerCase().includes(filterQ.toLowerCase()))
                      .map(q => (
                        <tr key={q.nom}>
                          <td className="td-quartier">{q.nom}</td>
                          <td className="td-mono td-bold">{q.moy.toLocaleString('fr-FR')} €</td>
                          <td className="td-mono">{q.med.toLocaleString('fr-FR')} €</td>
                          <td className="td-mono td-muted">{q.vol}</td>
                          <td className={q.evol >= 0 ? 'delta-up' : 'delta-down'} style={{ fontSize: 12, fontWeight: 700 }}>
                            {q.evol >= 0 ? '+' : ''}{q.evol}%
                          </td>
                          <td>
                            <span className={`score-badge score-${q.score}`}>
                              {q.score === 'hot' ? 'Actif' : q.score === 'ok' ? 'Stable' : 'Calme'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              {/* ── KPI agent (5 indicateurs) ── */}
              <div className="kpi-row">
                {KPI_ETAT.map((k, i) => (
                  <div key={i} className={`kpi-card ${k.green ? 'kpi-green' : k.red ? 'kpi-red' : ''}`}>
                    <div className={`kpi-delta ${k.up ? 'delta-up' : 'delta-down'}`}>{k.delta}</div>
                    <p className="kpi-label">{k.label}</p>
                    <p className="kpi-value">{k.value}</p>
                    <p className="kpi-sub">{k.unit} {k.sub}</p>
                  </div>
                ))}
              </div>

              <div className="charts-row charts-2col">
                <div className="chart-card">
                  <div className="chart-header">
                    <div>
                      <h3 className="chart-title">Évolution prix/m² mensuel</h3>
                      <p className="chart-sub">Toulon • 2023–2024</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={PRIX_MENSUEL} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gc} />
                      <XAxis dataKey="mois" tick={{ fontSize: 9, fill: tc }} interval={3} />
                      <YAxis tick={{ fontSize: 9, fill: tc }} domain={[3200, 3800]} tickFormatter={v => `${v}€`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="prix" name="€/m²" stroke="#f0a500" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <div>
                      <h3 className="chart-title">Volume transactions</h3>
                      <p className="chart-sub">par trimestre</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={VOLUME_TRIM} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gc} />
                      <XAxis dataKey="trim" tick={{ fontSize: 9, fill: tc }} />
                      <YAxis tick={{ fontSize: 9, fill: tc }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="vol" name="Transactions" fill="rgba(0,200,150,0.65)" stroke="#00c896" strokeWidth={1} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <TableauQuartiers />
            </>
          )}
        </>
      )}

      {/* ══════════════════════════ TENDANCES ══════════════════════════ */}
      {activeTab === 'tendances' && (
        <>
          <div className="kpi-row">
            {KPI_TENDANCES.map((k, i) => (
              <div key={i} className={`kpi-card ${k.green ? 'kpi-green' : k.red ? 'kpi-red' : ''}`}>
                <p className="kpi-label">{k.label}</p>
                <p className="kpi-value" style={{ fontSize: k.value.length > 6 ? 14 : undefined }}>{k.value}</p>
                <p className="kpi-sub">{k.sub}</p>
              </div>
            ))}
          </div>

          <div className="charts-row charts-2col">
            {/* ── Bar chart avec toggle Moyenne / Médiane ── */}
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <h3 className="chart-title">Distribution prix/m² par quartier</h3>
                  <p className="chart-sub">{metricBar === 'moy' ? 'Moyenne' : 'Médiane'} — €/m²</p>
                </div>
                <div className="toggle-pills">
                  <button className={`toggle-pill ${metricBar === 'moy' ? 'active' : ''}`} onClick={() => setMetricBar('moy')}>Moyenne</button>
                  <button className={`toggle-pill ${metricBar === 'med' ? 'active' : ''}`} onClick={() => setMetricBar('med')}>Médiane</button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={QUARTIERS} margin={{ top: 5, right: 16, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gc} />
                  <XAxis dataKey="nom" tick={{ fontSize: 9, fill: tc, angle: -40, textAnchor: 'end' }} interval={0} height={70} />
                  <YAxis tick={{ fontSize: 9, fill: tc }} tickFormatter={v => `${v}€`} domain={[0, 5500]} />
                  <Tooltip content={<CustomTooltip />} formatter={v => `${v.toLocaleString('fr-FR')} €/m²`} />
                  {metricBar === 'moy'
                    ? <Bar dataKey="moy" name="Moyen €/m²"   fill="rgba(240,165,0,0.75)" radius={[3, 3, 0, 0]} />
                    : <Bar dataKey="med" name="Médiane €/m²" fill="rgba(0,200,150,0.65)" radius={[3, 3, 0, 0]} />
                  }
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ── Pie chart avec toggle Nb tx / Volume € ── */}
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <h3 className="chart-title">Répartition par type de bien</h3>
                  <p className="chart-sub">{metricPie === 'tx' ? 'Nombre de transactions' : 'Volume total €'}</p>
                </div>
                <div className="toggle-pills">
                  <button className={`toggle-pill ${metricPie === 'tx'  ? 'active' : ''}`} onClick={() => setMetricPie('tx')}>Nb tx</button>
                  <button className={`toggle-pill ${metricPie === 'vol' ? 'active' : ''}`} onClick={() => setMetricPie('vol')}>Volume €</button>
                </div>
              </div>
              {(() => {
                const data = metricPie === 'tx' ? TYPE_DATA : TYPE_DATA_VOL;
                const fmt  = metricPie === 'tx'
                  ? v => `${v.toLocaleString('fr-FR')} tx`
                  : v => `${Math.round(v / 1000000).toLocaleString('fr-FR')} M€`;
                return (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={data} cx="50%" cy="50%"
                          innerRadius={52} outerRadius={82}
                          paddingAngle={3} dataKey="value"
                          label={({ name, pct }) => `${name} ${pct}`}
                          labelLine={{ stroke: tc }}
                        >
                          {data.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip formatter={fmt} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pie-legend">
                      {data.map(e => (
                        <div key={e.name} className="pie-legend-item">
                          <div className="pie-dot" style={{ background: e.color }} />
                          {e.name} — {e.pct}
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Scatter surface → prix */}
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">Corrélation surface → prix de vente</h3>
                <p className="chart-sub">Scatter plot • 200 points DVF • Droite de régression linéaire</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart margin={{ top: 10, right: 20, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gc} />
                <XAxis
                  type="number" dataKey="surface" name="Surface" unit="m²"
                  domain={[20, 210]} tick={{ fontSize: 9, fill: tc }}
                  label={{ value: 'Surface (m²)', position: 'insideBottom', offset: -14, fontSize: 10, fill: tc }}
                />
                <YAxis
                  type="number" dataKey="prix" name="Prix"
                  tick={{ fontSize: 9, fill: tc }}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}K€`}
                />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background: tbg, border: `1px solid ${tbrd}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: ttxt }}>
                      {d.surface !== undefined && <p>Surface : {d.surface} m²</p>}
                      {d.prix !== undefined && <p style={{ color: '#f0a500' }}>Prix : {d.prix.toLocaleString('fr-FR')} €</p>}
                    </div>
                  );
                }} />
                <Scatter name="Transactions DVF" data={SCATTER_POINTS} fill="rgba(240,165,0,0.25)" r={3} />
                <Line
                  data={REGR_LINE} dataKey="prix" name="Régression linéaire"
                  stroke="#00c896" strokeWidth={2.5} dot={false} type="linear"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ══════════════════════════ OPPORTUNITÉS ══════════════════════════ */}
      {activeTab === 'opportunites' && (
        <>
          <div className="dash-alert">
            <span className="dash-alert-icon">◈</span>
            <span>
              <strong>Algorithme k-NN (k=5)</strong> · Biens identifiés comme{' '}
              <strong>sous-évalués</strong> par rapport à leurs 5 plus proches voisins
              (surface, quartier, type) · distance euclidienne normalisée
            </span>
          </div>
          <div className="oppo-grid">
            {OPPORTUNITIES.map((o, i) => (
              <div key={i} className="oppo-card">
                <div className="oppo-tag">◉ Sous-évalué {o.underval.toFixed(1)}%</div>
                <div className="oppo-price">{fmtPrix(o.prix)}</div>
                <div className="oppo-detail">
                  {o.type} · {o.surf} m² · {o.quartier}<br />
                  {o.pm2} €/m² · moy. voisins : {Math.round(o.avgPm2)} €/m²
                </div>
                <div className="oppo-delta-row">
                  <span>Δ {o.underval.toFixed(1)}%</span>
                  <div className="oppo-bar-bg">
                    <div className="oppo-bar-fill" style={{ width: `${Math.min(100, o.underval)}%` }} />
                  </div>
                </div>
                <div className="knn-section">
                  <div className="knn-title">k-NN (k=5) · biens similaires</div>
                  {o.neighbors.slice(0, 3).map((n, j) => (
                    <div key={j} className="knn-item">
                      <span>{n.quartier} · {n.surf}m²</span>
                      <span>{n.pm2} €/m²</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══════════════════════════ RÉGRESSION (Agent uniquement) ══════════════════════════ */}
      {activeTab === 'regression' && (
        <div className="reg-grid">
          <div>
            {regressionLoading ? (
              <div className="chart-card">
                <p style={{ textAlign: 'center', padding: 40 }}>Chargement des données...</p>
              </div>
            ) : (
              <>
                {/* Scatter plot surface → prix */}
                <div className="chart-card">
                  <div className="chart-header">
                    <div>
                      <h3 className="chart-title">Corrélation surface → prix (DVF Toulon)</h3>
                      <p className="chart-sub">
                        {regressionData ? `n = ${regressionData.n_transactions} transactions · R² = ${regressionData.r_squared}` : 'Chargement...'}
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart margin={{ top: 10, right: 20, left: 0, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gc} />
                      <XAxis
                        type="number" dataKey="surface" name="Surface" unit="m²"
                        domain={['auto', 'auto']} tick={{ fontSize: 9, fill: tc }}
                        label={{ value: 'Surface (m²)', position: 'insideBottom', offset: -14, fontSize: 10, fill: tc }}
                      />
                      <YAxis
                        type="number" dataKey="prix" name="Prix"
                        tick={{ fontSize: 9, fill: tc }}
                        tickFormatter={v => `${(v / 1000).toFixed(0)}K€`}
                      />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div style={{ background: tbg, border: `1px solid ${tbrd}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: ttxt }}>
                            {d.surface !== undefined && <p>Surface : {d.surface} m²</p>}
                            {d.prix !== undefined && <p style={{ color: '#f0a500' }}>Prix : {d.prix.toLocaleString('fr-FR')} €</p>}
                          </div>
                        );
                      }} />
                      <Scatter name="Transactions DVF" data={regressionData?.scatter_points || SCATTER_POINTS} fill="rgba(240,165,0,0.25)" r={3} />
                      <Line
                        data={regressionData?.regression_line || REGR_LINE} dataKey="prix" name="Régression linéaire"
                        stroke="#00c896" strokeWidth={2.5} dot={false} type="linear"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Coefficients du modèle */}
                <div className="chart-card">
                  <div className="chart-header">
                    <div>
                      <h3 className="chart-title">Modèle de régression linéaire</h3>
                      <p className="chart-sub">Prix = α + β × Surface</p>
                    </div>
                  </div>
                  <div className="reg-formula">
                    <div className="formula-line">Prix = α + β · Surface</div>
                    <div className="formula-coef">
                      α (intercept)&nbsp;&nbsp;&nbsp; = <span>{regressionData ? `${regressionData.alpha.toLocaleString('fr-FR')} €` : '...'}</span><br />
                      β (surface m²)&nbsp;&nbsp; = <span>{regressionData ? `+${regressionData.beta.toLocaleString('fr-FR')} €/m²` : '...'}</span><br />
                      R²&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = <span>{regressionData?.r_squared || '...'}</span>&nbsp;&nbsp;
                      RMSE = <span>{regressionData ? `${regressionData.rmse.toLocaleString('fr-FR')} €` : '...'}</span>
                    </div>
                  </div>
                  <p className="chart-sub" style={{ marginBottom: 8, marginTop: 12 }}>Résidus du modèle</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <ScatterChart margin={{ top: 5, right: 16, left: 10, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gc} />
                      <XAxis dataKey="n" name="n" type="number" tick={{ fontSize: 8, fill: tc }}
                        label={{ value: 'n transactions', position: 'insideBottom', offset: -14, fontSize: 9, fill: tc }} />
                      <YAxis dataKey="r" name="Résidu" type="number" tick={{ fontSize: 8, fill: tc }}
                        label={{ value: 'Résidu €', angle: -90, position: 'insideLeft', fontSize: 9, fill: tc }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Scatter name="Résidus +" data={(regressionData?.residuals || RESIDUALS).filter(r => r.r >= 0)} fill="rgba(0,200,150,0.55)" />
                      <Scatter name="Résidus −" data={(regressionData?.residuals || RESIDUALS).filter(r => r.r < 0)} fill="rgba(224,82,82,0.55)" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          <div className="predictor-tool">
            <h3 className="predictor-title">▸ Estimateur de prix</h3>
            <div className="pred-field">
              <label>Surface (m²)</label>
              <input type="number" value={predSurf} onChange={e => setPredSurf(Number(e.target.value))} />
            </div>
            <div className="pred-field">
              <label>Quartier</label>
              <select value={predQ} onChange={e => setPredQ(e.target.value)}>
                {Object.keys(QUARTIER_COEF).map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div className="pred-field">
              <label>Type</label>
              <select value={predType} onChange={e => setPredType(e.target.value)}>
                <option value={0}>Appartement</option>
                <option value={28600}>Maison (+28 600€)</option>
              </select>
            </div>
            <div className="pred-field">
              <label>Étage</label>
              <input type="number" value={predEtage} min={0} max={20} onChange={e => setPredEtage(Number(e.target.value))} />
            </div>
            <button className="pred-btn" onClick={doPrediction}>Calculer l'estimation</button>
            {predResult && (
              <div className="pred-result">
                <div className="pred-result-label">Prix estimé</div>
                <div className="pred-result-val">{fmtPrix(Math.round(predResult.val))}</div>
                <div className="pred-result-range">
                  Fourchette : {fmtPrix(Math.round(predResult.min))} – {fmtPrix(Math.round(predResult.max))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
