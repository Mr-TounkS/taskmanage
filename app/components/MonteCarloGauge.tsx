"use client"

/**
 * MonteCarloGauge — Jauge semi-circulaire SVG de probabilité de livraison.
 *
 * Affiche la probabilité de livraison à temps (= 1 - P_delai) issue de la
 * simulation Monte-Carlo. La visualisation est volontairement distincte des
 * barres de progression classiques pour signaler au jury que c'est une
 * métrique stochastique, pas une métrique déterministe.
 *
 * Choix SVG pur : aucune dépendance externe, bundle minimal, SSR-safe.
 * Section mémoire : 3.2 — Visualisation du moteur stochastique
 */

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MonteCarloGaugeProps {
  /** Probabilité de retard ∈ [0, 1] issue de MonteCarloSimulator */
  probabilityOfDelay: number;
  /** Médiane des durées simulées en jours */
  medianDays: number;
  /** 85e percentile (Service Level Expectation) en jours */
  p85Days: number;
  /** Taille de la jauge en px (diamètre) */
  size?: number;
}

// ---------------------------------------------------------------------------
// Constantes visuelles
// ---------------------------------------------------------------------------

const STROKE_WIDTH = 10;
const GAP_DEGREES = 60; // degrés laissés vides en bas de la demi-lune

// ---------------------------------------------------------------------------
// Utilitaires SVG
// ---------------------------------------------------------------------------

/** Convertit des degrés en coordonnées sur un cercle de rayon r centré en (cx, cy) */
function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Génère le path SVG d'un arc de cercle */
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export default function MonteCarloGauge({
  probabilityOfDelay,
  medianDays,
  p85Days,
  size = 140,
}: MonteCarloGaugeProps) {
  const onTime = Math.max(0, Math.min(1, 1 - probabilityOfDelay));
  const pct = Math.round(onTime * 100);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - STROKE_WIDTH * 2) / 2;

  // L'arc commence à GAP/2 depuis le bas gauche et finit à GAP/2 avant le bas droit
  const startDeg = 90 + GAP_DEGREES / 2;
  const endDeg = 90 - GAP_DEGREES / 2 + 360;
  const arcSpan = 360 - GAP_DEGREES;

  // Position de remplissage selon le pourcentage
  const fillEnd = startDeg + (arcSpan * onTime);

  // Couleur selon le niveau de confiance
  const color =
    pct >= 70 ? '#22c55e' :   // vert
    pct >= 40 ? '#f59e0b' :   // orange
    '#ef4444';                 // rouge

  const bgPath = arcPath(cx, cy, r, startDeg, endDeg);
  const fillPath = onTime > 0.005 ? arcPath(cx, cy, r, startDeg, fillEnd) : '';

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Titre */}
      <p className="text-xs font-medium text-base-content/70 text-center">
        On-time delivery
      </p>

      {/* Jauge SVG */}
      <div className="relative" style={{ width: size, height: size * 0.75 }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ overflow: 'visible', marginTop: -(size * 0.25) }}
        >
          {/* Arc de fond (gris) */}
          <path
            d={bgPath}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            className="text-base-300"
          />

          {/* Arc de remplissage (coloré) */}
          {fillPath && (
            <path
              d={fillPath}
              fill="none"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
            />
          )}

          {/* Pourcentage central */}
          <text
            x={cx}
            y={cy + 8}
            textAnchor="middle"
            fontSize={size * 0.22}
            fontWeight="700"
            fill={color}
            fontFamily="inherit"
          >
            {pct}%
          </text>
        </svg>
      </div>

      {/* Légende Monte-Carlo */}
      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="text-xs text-base-content/50">
          Median: <span className="font-medium text-base-content/70">{medianDays}d</span>
          {' · '}
          P85: <span className="font-medium text-base-content/70">{p85Days}d</span>
        </p>
        <p className="text-xs text-base-content/40 italic">
          Monte-Carlo · 10 000 simulations
        </p>
      </div>
    </div>
  );
}
