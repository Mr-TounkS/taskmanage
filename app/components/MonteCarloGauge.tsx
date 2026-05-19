"use client"

/**
 * MonteCarloGauge — Jauge semi-circulaire SVG de probabilité de livraison.
 *
 * Affiche la probabilité de livraison à temps (= 1 - P_delai) issue de la
 * simulation Monte-Carlo. Visualisation stochastique distincte des barres
 * déterministes pour signifier au jury la nature probabiliste de la métrique.
 *
 * Choix SVG pur : aucune dépendance externe, bundle minimal, SSR-safe.
 * Section mémoire : 3.2 — Visualisation du moteur stochastique
 */

interface MonteCarloGaugeProps {
  probabilityOfDelay: number;
  medianDays: number;
  p85Days: number;
  size?: number;
}

const STROKE = 11;
// Arc de 200° centré en haut : démarre à 170° et finit à -10° (sens antihoraire)
const START_DEG = 190;
const END_DEG   = -10;
const SWEEP     = START_DEG - END_DEG; // 200°

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function point(cx: number, cy: number, r: number, deg: number) {
  return {
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  };
}

function arc(cx: number, cy: number, r: number, from: number, to: number, clockwise = true) {
  const s = point(cx, cy, r, from);
  const e = point(cx, cy, r, to);
  const diff = clockwise ? from - to : to - from;
  const large = diff > 180 ? 1 : 0;
  const sweep = clockwise ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} ${sweep} ${e.x} ${e.y}`;
}

export default function MonteCarloGauge({
  probabilityOfDelay,
  medianDays,
  p85Days,
  size = 140,
}: MonteCarloGaugeProps) {
  const onTime  = Math.max(0, Math.min(1, 1 - probabilityOfDelay));
  const pct     = Math.round(onTime * 100);

  const cx = size / 2;
  const cy = size / 2 + size * 0.05;      // légèrement bas pour centrer visuellement
  const r  = (size - STROKE * 2) / 2 - 2;

  // Arc de fond complet
  const bgArc   = arc(cx, cy, r, START_DEG, END_DEG, false);
  // Arc de remplissage proportionnel
  const fillEnd = START_DEG - SWEEP * onTime;
  const fillArc = onTime > 0.01 ? arc(cx, cy, r, START_DEG, fillEnd, false) : null;

  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const viewH = size * 0.82; // hauteur du viewBox coupée en bas

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-semibold text-base-content/70 tracking-wide uppercase">
        On-time delivery
      </p>

      <svg
        width={size}
        height={viewH}
        viewBox={`0 0 ${size} ${viewH}`}
        style={{ display: 'block' }}
      >
        {/* Arc fond */}
        <path
          d={bgArc}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />

        {/* Arc rempli */}
        {fillArc && (
          <path
            d={fillArc}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        )}

        {/* Pourcentage central */}
        <text
          x={cx}
          y={cy + 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.23}
          fontWeight="800"
          fill={color}
        >
          {pct}%
        </text>
      </svg>

      {/* Légende */}
      <p className="text-xs text-base-content/50 -mt-1">
        Median: <span className="font-semibold text-base-content/70">{medianDays}d</span>
        {' · '}
        P85: <span className="font-semibold text-base-content/70">{p85Days}d</span>
      </p>
      <p className="text-xs text-base-content/35 italic">
        Monte-Carlo · 10 000 simulations
      </p>
    </div>
  );
}
