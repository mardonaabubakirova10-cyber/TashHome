import { cn } from '../lib/cn'

/**
 * Широкий архитектурный чертёж: улица из трёх домов (фасады) с осями, размерами, отметками уровня и деревьями.
 * Рисуется тонкими линиями цветом текста, поэтому цвет и прозрачность задаются снаружи классом.
 */
export default function BlueprintStreet({ className }: { className?: string }) {
  const axes = [
    { x: 60, l: 'A' },
    { x: 360, l: 'B' },
    { x: 440, l: 'C' },
    { x: 760, l: 'D' },
    { x: 840, l: 'E' },
    { x: 1140, l: 'F' },
  ]
  return (
    <svg
      viewBox="0 0 1200 320"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn('pointer-events-none select-none', className)}
    >
      {/* оси: штрих-пунктир и кружки с буквами сверху */}
      <g strokeWidth="0.7" opacity="0.55">
        {axes.map((a) => (
          <g key={a.l}>
            <path d={`M${a.x} 44V292`} strokeDasharray="14 4 2 4" />
            <circle cx={a.x} cy="30" r="12" />
            <text x={a.x} y="34" fontSize="11" textAnchor="middle" fill="currentColor" stroke="none">
              {a.l}
            </text>
          </g>
        ))}
      </g>

      {/* земля */}
      <path d="M0 270H1200" strokeWidth="1.8" />
      <path d="M0 278H1200M0 286H1200" opacity="0.35" />
      <path d="M0 270l-8 16M60 270l-8 16M120 270l-8 16M180 270l-8 16M240 270l-8 16M300 270l-8 16M360 270l-8 16M420 270l-8 16M480 270l-8 16M540 270l-8 16M600 270l-8 16M660 270l-8 16M720 270l-8 16M780 270l-8 16M840 270l-8 16M900 270l-8 16M960 270l-8 16M1020 270l-8 16M1080 270l-8 16M1140 270l-8 16M1200 270l-8 16" strokeWidth="0.5" opacity="0.3" />

      {/* ДОМ 1: два объёма с плоскими крышами */}
      <g>
        <path d="M80 270V110H220V270M220 270V160H340V270" />
        <path d="M70 110H232M210 160H350" strokeWidth="2" />
        <path d="M70 104H232M210 154H350" opacity="0.5" />
        {[0, 1, 2].map((c) => (
          <g key={c}>
            <rect x={96 + c * 40} y="128" width="30" height="42" />
            <rect x={96 + c * 40} y="196" width="30" height="46" />
            <path d={`M${111 + c * 40} 128V170M${111 + c * 40} 196V242`} opacity="0.5" />
          </g>
        ))}
        <rect x="236" y="182" width="64" height="88" />
        <path d="M268 182V270M236 226H300" opacity="0.5" />
        <rect x="312" y="206" width="20" height="64" />
      </g>

      {/* ДОМ 2: двускатная крыша, гараж, труба */}
      <g>
        <path d="M450 270V160L600 76L750 160V270" />
        <path d="M434 168L600 70L766 168" strokeWidth="2" />
        <path d="M690 100V140M708 100V150" />
        <path d="M684 100H714" />
        <path d="M450 214H750" opacity="0.45" />
        {[0, 1, 2].map((c) => (
          <rect key={c} x={474 + c * 62} y="226" width="40" height="44" />
        ))}
        <rect x="582" y="120" width="36" height="40" />
        <path d="M600 120V160M582 140H618" opacity="0.5" />
        <rect x="662" y="226" width="72" height="44" />
        <path d="M662 240H734M662 254H734" opacity="0.5" />
        <path d="M474 176h44v32h-44zM682 176h44v32h-44z" />
      </g>

      {/* ДОМ 3: куб-вилла с террасой и остеклением */}
      <g>
        <path d="M850 270V190H1130V270" />
        <path d="M900 190V110H1080V190" />
        <path d="M840 190H1140M892 110H1088" strokeWidth="2" />
        <path d="M840 182H1140M900 102H1080" opacity="0.45" />
        {/* ограждение террасы */}
        <path d="M852 182H940M1040 182H1128" />
        <path d="M860 190V182M880 190V182M900 190V182M1060 190V182M1080 190V182M1100 190V182M1120 190V182" opacity="0.6" />
        <rect x="920" y="124" width="140" height="56" />
        <path d="M955 124V180M990 124V180M1025 124V180M920 152H1060" opacity="0.5" />
        <rect x="866" y="210" width="110" height="60" />
        <path d="M894 210V270M921 210V270M948 210V270" opacity="0.5" />
        <rect x="1000" y="214" width="34" height="56" />
        <rect x="1052" y="206" width="64" height="64" />
        <path d="M1084 206V270M1052 238H1116" opacity="0.5" />
      </g>

      {/* деревья */}
      <g opacity="0.75">
        <path d="M400 270V196M400 226L384 210M400 216L418 198M400 238L420 224" />
        <circle cx="400" cy="178" r="30" strokeDasharray="3 4" />
        <path d="M800 270V200M800 230L784 214M800 220L818 202M800 242L820 228" />
        <circle cx="800" cy="180" r="30" strokeDasharray="3 4" />
        <path d="M30 270V214M30 238L16 226M30 230L46 214" />
        <circle cx="30" cy="198" r="22" strokeDasharray="3 4" />
        <path d="M1180 270V210M1180 236L1166 222M1180 228L1194 212" />
        <circle cx="1180" cy="194" r="22" strokeDasharray="3 4" />
      </g>

      {/* размеры по горизонтали */}
      <g strokeWidth="0.8" opacity="0.8">
        <path d="M80 302H340M80 296V308M340 296V308" />
        <path d="M450 302H750M450 296V308M750 296V308" />
        <path d="M850 302H1130M850 296V308M1130 296V308" />
        <g fontSize="10" fill="currentColor" stroke="none" textAnchor="middle">
          <text x="210" y="298">13 400</text>
          <text x="600" y="298">15 000</text>
          <text x="990" y="298">14 000</text>
        </g>
      </g>

      {/* отметки уровня */}
      <g strokeWidth="0.8" opacity="0.8">
        <path d="M350 270H382M366 270l-6-9h12z" />
        <path d="M350 160H382M366 160l-6-9h12z" />
        <g fontSize="9" fill="currentColor" stroke="none">
          <text x="386" y="273">±0.000</text>
          <text x="386" y="163">+3.200</text>
        </g>
        <path d="M1140 110H1176M1158 110l-6-9h12z" />
        <g fontSize="9" fill="currentColor" stroke="none">
          <text x="1162" y="128">+6.400</text>
        </g>
      </g>

      {/* штамп */}
      <g strokeWidth="0.8" opacity="0.85">
        <rect x="1010" y="300" width="170" height="16" />
        <path d="M1068 300V316M1124 300V316" />
        <g fontSize="8" fill="currentColor" stroke="none">
          <text x="1016" y="311">М 1:200</text>
          <text x="1074" y="311">ФАСАДЫ</text>
          <text x="1130" y="311">ЛИСТ 1</text>
        </g>
      </g>
    </svg>
  )
}
