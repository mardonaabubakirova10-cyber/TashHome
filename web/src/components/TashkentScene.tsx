/**
 * Картина для вступления: горы, телебашня, купол Чорсу, тополя, дом с аркой, флаг Узбекистана
 * и дворик перед домом (дорожка, хауз, топчан с чайником, розы).
 * Сначала прорисовывается белыми линиями как чертёж (класс tk-lines), потом проступают цвета (tk-color).
 * Анимации заданы в index.css; pathLength={1} нужен, чтобы все линии рисовались с одной скоростью.
 */

const SKY = 'M0 372 90 300 160 345 270 240 380 340 450 300 540 360 660 262 760 345 850 285 960 350 1060 250 1200 360'

// звёзды флага: три ряда по 3, 4 и 5 штук, выровнены по правому краю
const STARS = [3, 4, 5].flatMap((count, row) => Array.from({ length: count }, (_, i) => ({ x: 208 - i * 24, y: 16 + row * 24 })))
const STAR = 'M0 -6 1.35 -1.85 5.7 -1.85 2.18 .7 3.53 4.85 0 2.3 -3.53 4.85 -2.18 .7 -5.7 -1.85 -1.35 -1.85Z'

/** Стрельчатая арка: левый край, низ, ширина и высота. */
const arch = (x: number, y: number, w: number, h: number) =>
  `M${x} ${y}V${y - h + w * 0.6}Q${x} ${y - h + w * 0.18} ${x + w / 2} ${y - h}Q${x + w} ${y - h + w * 0.18} ${x + w} ${y - h + w * 0.6}V${y}Z`

const WINDOWS = [448, 496, 678, 726]
const POPLARS = [
  [400, 150],
  [372, 112],
  [850, 130],
  [884, 100],
]
const poplar = (x: number, h: number) => `M${x} ${500 - h}C${x + 22} ${500 - h * 0.7} ${x + 20} ${500 - h * 0.2} ${x} 486C${x - 20} ${500 - h * 0.2} ${x - 22} ${500 - h * 0.7} ${x} ${500 - h}Z`

const TOWER_LEGS = 'M232 500 288 292H312L368 500H340L300 360 260 500Z'
const DOME = 'M930 440C930 340 975 308 1040 298C1105 308 1150 340 1150 440Z'

// дворик: дорожка расходится от двери к зрителю, швы реже вдали и шире вблизи
const PATH = 'M576 500H624L760 712H440Z'
const JOINTS = [512, 528, 549, 577, 614, 660]
const edge = (y: number) => 24 + ((y - 500) / 212) * 136 // половина ширины дорожки на высоте y
const JOINT_LINES = JOINTS.map((y) => `M${600 - edge(y)} ${y}H${600 + edge(y)}`).join('')
const DIAMONDS = [
  [520, 5],
  [538, 8],
  [563, 11],
  [596, 15],
  [637, 20],
  [686, 25],
]
  .map(([y, r]) => `M600 ${y - r * 0.6}L${600 + r} ${y}L600 ${y + r * 0.6}L${600 - r} ${y}Z`)
  .join('')
const POOL = 'M288 584H412L462 612 420 652H280L238 612Z'
const WATER = 'M298 592H402L440 613 408 642H292L260 613Z'
const RIPPLES = 'M300 610Q318 604 336 610T372 610M338 628Q356 622 374 628T410 628'
const TOPCHAN = 'M786 590H934L962 630H758Z'
const TOPCHAN_FRAME = 'M758 630H962V646H758ZM768 646V676M952 646V676M792 646V662M928 646V662M786 590V556H934V590M810 556V590M835 556V590M860 556V590M885 556V590M910 556V590'
const TABLE = 'M828 604H892L900 618H820Z'
const TEAPOT = 'M848 606C844 590 876 590 872 606ZM872 600 884 592M848 598C838 594 838 606 848 604M860 592V587'
const CUSHIONS = 'M792 598H818L814 622H782ZM902 598H928L938 622H906Z'
// кусты роз по краям дорожки: [x, y, радиус]
const ROSES = [
  [540, 524, 7],
  [660, 524, 7],
  [520, 556, 10],
  [680, 556, 10],
  [492, 598, 14],
  [708, 598, 14],
  [456, 652, 19],
  [744, 652, 19],
]
const bush = ([x, y, r]: number[]) => `M${x - r} ${y}A${r} ${r * 0.8} 0 1 1 ${x + r} ${y}A${r} ${r * 0.8} 0 1 1 ${x - r} ${y}Z`

export default function TashkentScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 720" fill="none" strokeLinejoin="round" strokeLinecap="round" aria-hidden className={className}>
      {/* цвет: проступает после того, как чертёж нарисован */}
      <g className="tk-color">
        <defs>
          <linearGradient id="tk-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#24563a" />
            <stop offset="1" stopColor="#24563a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 500H1200V720H0Z" fill="url(#tk-ground)" />
        <path d={PATH} fill="#d8bd93" />
        <path d={DIAMONDS} fill="#1f9fb2" />
        <path d={POOL} fill="#c9a57a" />
        <path d={WATER} fill="#1f86a8" />
        <path d="M786 556H934V590H786Z" fill="#6e4426" />
        <path d={TOPCHAN} fill="#a8323e" />
        <path d="M758 630H962V646H758ZM764 646H774V676H764ZM947 646H957V676H947Z" fill="#8a5730" />
        <path d={CUSHIONS} fill="#1f9fb2" />
        <path d={TABLE} fill="#e8cda3" />
        <path d={TEAPOT} fill="#ffffff" />
        {ROSES.map((b) => (
          <g key={`${b[0]}-${b[1]}`}>
            <path d={bush(b)} fill="#2f8f4e" />
            {[-0.45, 0.05, 0.5].map((k, i) => (
              <circle key={k} cx={b[0] + b[2] * k} cy={b[1] - b[2] * (i === 1 ? 0.45 : 0.1)} r={b[2] * 0.2} fill="#e0485a" />
            ))}
          </g>
        ))}
        <path d={`${SKY} V500 H0Z`} fill="#1b2442" />
        <path d={TOWER_LEGS} fill="#8f9bc4" />
        <path d="M290 292 294 112H306L310 292Z" fill="#aeb8dc" />
        <path d="M274 214H326L318 232H282ZM280 142H320L314 158H286Z" fill="#d3dbf5" />
        <path d={DOME} fill="#1f9fb2" />
        <path d="M930 440H1150V500H930Z" fill="#c9a57a" />
        {POPLARS.map(([x, h]) => (
          <path key={x} d={poplar(x, h)} fill="#2f8f4e" />
        ))}
        <path d="M430 500V350H540V500ZM660 500V350H770V500Z" fill="#d9b98c" />
        <path d="M540 500V272H660V500Z" fill="#e8cda3" />
        <path d="M424 336H540V350H424ZM660 336H776V350H660ZM532 256H668V272H532Z" fill="#1f9fb2" />
        <path d={arch(556, 500, 88, 196)} fill="#12606e" />
        <path d={arch(576, 500, 48, 112)} fill="#ffb866" />
        {WINDOWS.map((x) => (
          <path key={x} d={arch(x, 462, 26, 74)} fill="#ffc47d" />
        ))}
      </g>

      {/* чертёж */}
      <g className="tk-lines" stroke="#eaf0ff" strokeWidth="1.4">
        <path pathLength={1} d={SKY} opacity="0.45" />
        <path pathLength={1} d="M0 500H1200" />
        <path pathLength={1} d={TOWER_LEGS} />
        <path pathLength={1} d="M290 292 294 112H306L310 292M300 112V30M274 214H326L318 232H282ZM280 142H320L314 158H286ZM268 430 332 392M268 392 332 430M278 360H322" />
        <path pathLength={1} d={DOME} />
        <path pathLength={1} d="M930 440V500M1150 440V500M1040 298V270M985 440C985 350 1010 312 1040 298C1070 312 1095 350 1095 440M1040 298V440M950 500V462H980V500M1025 500V462H1055V500M1100 500V462H1130V500" />
        {POPLARS.map(([x, h]) => (
          <path key={x} pathLength={1} d={`${poplar(x, h)}M${x} ${500 - h + 14}V500`} />
        ))}
        <path pathLength={1} d="M430 500V350H540M660 350H770V500M540 500V272H660V500M424 336H540V350H424ZM660 336H776V350H660ZM532 256H668V272H532Z" />
        <path pathLength={1} d={arch(556, 500, 88, 196)} />
        <path pathLength={1} d={`${arch(576, 500, 48, 112)}M600 500V400`} />
        {WINDOWS.map((x) => (
          <path key={x} pathLength={1} d={`${arch(x, 462, 26, 74)}M${x + 13} 388V462M${x} 430H${x + 26}`} />
        ))}
        {/* узор над аркой */}
        <path pathLength={1} d="M556 288 564 280 572 288 580 280 588 288 596 280 604 288 612 280 620 288 628 280 636 288 644 280" />
        {/* дворик */}
        <path pathLength={1} d={PATH} />
        <path pathLength={1} d={JOINT_LINES} opacity="0.5" />
        <path pathLength={1} d={DIAMONDS} />
        <path pathLength={1} d={POOL} />
        <path pathLength={1} d={`${WATER}${RIPPLES}`} />
        <path pathLength={1} d={TOPCHAN} />
        <path pathLength={1} d={TOPCHAN_FRAME} />
        <path pathLength={1} d={`${TABLE}${TEAPOT}${CUSHIONS}`} />
        {ROSES.map((b) => (
          <path key={`${b[0]}-${b[1]}`} pathLength={1} d={bush(b)} />
        ))}
        {/* флагшток */}
        <path pathLength={1} d="M800 500V96" strokeWidth="3" />
        <circle pathLength={1} cx="800" cy="92" r="4" />
      </g>

      {/* флаг Узбекистана (пропорции 1:2) */}
      <g transform="translate(802 100) scale(0.4)">
        <g className="tk-flag">
          <g className="tk-color">
            <path d="M0 0H500V80H0Z" fill="#0099b5" />
            <path d="M0 80H500V170H0Z" fill="#ce1126" />
            <path d="M0 85H500V165H0Z" fill="#ffffff" />
            <path d="M0 170H500V250H0Z" fill="#1eb53a" />
            <path d="M75 10.4A30 30 0 1 0 75 69.6A30 30 0 0 1 75 10.4Z" fill="#ffffff" />
            {STARS.map((s) => (
              <path key={`${s.x}-${s.y}`} d={STAR} transform={`translate(${s.x} ${s.y})`} fill="#ffffff" />
            ))}
          </g>
          <g className="tk-lines" stroke="#eaf0ff" strokeWidth="3.5">
            <path pathLength={1} d="M0 0H500V250H0ZM0 82H500M0 168H500" />
            <path pathLength={1} d="M75 10.4A30 30 0 1 0 75 69.6A30 30 0 0 1 75 10.4Z" />
          </g>
        </g>
      </g>
    </svg>
  )
}
