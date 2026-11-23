import { cn } from '../lib/cn'

/**
 * Архитектурный чертёж: фасад современного дома тонкими линиями, с размерами и деревьями.
 * Рисуется цветом текста (currentColor), поэтому прозрачность и цвет задаются снаружи классом.
 */
export default function BlueprintHouse({ className, variant = 1 }: { className?: string; variant?: 1 | 2 }) {
  return (
    <svg
      viewBox="0 0 640 360"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn('pointer-events-none select-none', className)}
    >
      {/* земля и тонкая сетка под домом */}
      <path d="M0 300H640" strokeWidth="1.4" />
      <path d="M0 308H640M0 316H640" opacity="0.4" />

      {variant === 1 ? (
        <>
          {/* два объёма: левый выше, правый ниже, плоские крыши */}
          <path d="M120 300V120H300V300M300 300V170H500V300" />
          <path d="M110 120H310M290 170H510" strokeWidth="1.6" />
          {/* навес-козырёк над правым объёмом */}
          <path d="M290 150H520V158H290Z" />
          {/* окна левого объёма: сетка 3 × 2 */}
          {[0, 1, 2].map((c) =>
            [0, 1].map((r) => (
              <g key={`${c}-${r}`}>
                <rect x={140 + c * 52} y={140 + r * 70} width="40" height="56" />
                <path d={`M${160 + c * 52} ${140 + r * 70}V${196 + r * 70}M${140 + c * 52} ${168 + r * 70}H${180 + c * 52}`} opacity="0.5" />
              </g>
            )),
          )}
          {/* остекление правого объёма и дверь */}
          <rect x="320" y="190" width="100" height="110" />
          <path d="M345 190V300M370 190V300M395 190V300M320 245H420" opacity="0.5" />
          <rect x="440" y="215" width="36" height="85" />
          <circle cx="470" cy="258" r="1.5" />
          {/* жалюзи-вертикали на стене */}
          <path d="M120 120L300 300M120 175L245 300" opacity="0.12" />
        </>
      ) : (
        <>
          {/* двухэтажный дом со скатной крышей */}
          <path d="M140 300V170L320 90L500 170V300" />
          <path d="M120 175L320 85L520 175" strokeWidth="1.6" />
          <path d="M140 220H500" opacity="0.5" />
          {[0, 1, 2, 3].map((c) => (
            <g key={c}>
              <rect x={170 + c * 78} y="238" width="44" height="62" />
              <rect x={170 + c * 78} y="130" width="44" height="60" opacity={c === 1 || c === 2 ? 0 : 1} />
            </g>
          ))}
          <rect x="285" y="120" width="70" height="70" />
          <path d="M320 120V190M285 155H355" opacity="0.5" />
          <path d="M255 300V238H385V300" opacity="0.4" />
        </>
      )}

      {/* деревья по краям */}
      <g opacity="0.7">
        <path d="M60 300V220M60 250L40 230M60 240L82 218M60 262L84 246" />
        <circle cx="60" cy="195" r="34" strokeDasharray="3 4" />
        <path d="M580 300V215M580 245L558 224M580 235L602 212M580 262L604 244" />
        <circle cx="580" cy="188" r="38" strokeDasharray="3 4" />
      </g>

      {/* размерные линии */}
      <g opacity="0.8" strokeWidth="0.8">
        <path d="M95 110V300M89 120H101M89 300H101" />
        <path d="M120 330H500M120 324V336M500 324V336" />
        <text x="104" y="205" fontSize="9" fill="currentColor" stroke="none" transform="rotate(-90 104 205)">7 200</text>
        <text x="296" y="346" fontSize="9" fill="currentColor" stroke="none" textAnchor="middle">12 600</text>
      </g>

      {/* штамп в углу */}
      <g strokeWidth="0.8" opacity="0.8">
        <rect x="520" y="326" width="108" height="26" />
        <path d="M570 326V352" />
        <text x="526" y="343" fontSize="8" fill="currentColor" stroke="none">М 1:100</text>
        <text x="576" y="343" fontSize="8" fill="currentColor" stroke="none">ФАСАД А</text>
      </g>
    </svg>
  )
}
