/* 语程的立体手表 Logo —— 引导页首屏与登录页共用同一个。
 *
 * 这两处原来是各画一份的：引导页那份做了立体化（金属渐变、玻璃反光、
 * 落地投影），登录页那份还是扁平的写死色（#22303F），于是同一个 Logo
 * 在两个页面长得不一样。抽出来之后只剩一份。
 *
 * 渐变 id 是固定的，但这两个页面不会同时渲染（App 里是二选一），不会撞。
 */
export default function WatchLogo({ className }) {
  return (
    <svg viewBox="0 0 120 150" className={className} role="img" aria-label="语程">
      <defs>
        {/* 外壳：金属质感靠三段渐变做出「左上受光、右下背光」 */}
        <linearGradient id="obw-case" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4d5563" />
          <stop offset="42%" stopColor="#2c333e" />
          <stop offset="100%" stopColor="#151920" />
        </linearGradient>
        {/* 表带：横向明暗，模拟圆柱面的转折 */}
        <linearGradient id="obw-strap" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#232932" />
          <stop offset="36%" stopColor="#3d4551" />
          <stop offset="100%" stopColor="#1a1f26" />
        </linearGradient>
        {/* 表盘：不用死白，给一个左上偏亮的径向渐变 */}
        <radialGradient id="obw-dial" cx="0.38" cy="0.3" r="0.88">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#f6f8fa" />
          <stop offset="100%" stopColor="#e4e8ee" />
        </radialGradient>
        {/* 玻璃反光 */}
        <linearGradient id="obw-glass" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="obw-crown" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5d6673" />
          <stop offset="100%" stopColor="#1e232b" />
        </linearGradient>
        <radialGradient id="obw-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#0b0e13" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#0b0e13" stopOpacity="0" />
        </radialGradient>
        <clipPath id="obw-dial-clip">
          <circle cx="60" cy="75" r="32" />
        </clipPath>
      </defs>

      {/* 落地投影：让表「站」在平面上，而不是飘着 —— 立体感的一半来自这里 */}
      <ellipse cx="60" cy="146" rx="36" ry="5" fill="url(#obw-shadow)" />

      {/* 表带 + 缝线 */}
      <rect x="45" y="0" width="30" height="24" rx="6" fill="url(#obw-strap)" />
      <rect x="45" y="126" width="30" height="24" rx="6" fill="url(#obw-strap)" />
      {[6, 18, 132, 144].map((y, i) => (
        <g key={y}>
          <line x1="50" y1={y} x2="50" y2={y + 6} stroke="#8d97a6" strokeWidth="0.8" strokeDasharray="1.6 2" opacity={i < 2 ? 0.45 : 0.35} />
          <line x1="70" y1={y} x2="70" y2={y + 6} stroke="#8d97a6" strokeWidth="0.8" strokeDasharray="1.6 2" opacity={i < 2 ? 0.45 : 0.35} />
        </g>
      ))}

      {/* 表冠 + 凹槽 */}
      <rect x="101" y="60" width="6" height="18" rx="2.5" fill="url(#obw-crown)" />
      <line x1="101" y1="69" x2="107" y2="69" stroke="#0f1319" strokeWidth="0.8" opacity="0.75" />

      {/* 外壳：金属渐变 + 外缘亮边 + 内圈亮边（两道棱线是厚度的来源） */}
      <rect x="18" y="20" width="84" height="110" rx="26" fill="url(#obw-case)" />
      <rect x="18" y="20" width="84" height="110" rx="26" fill="none" stroke="#717c8d" strokeWidth="0.9" opacity="0.5" />
      <rect x="20.4" y="22.4" width="79.2" height="105.2" rx="23.6" fill="none" stroke="#b3bdcb" strokeWidth="0.7" opacity="0.3" />

      {/* 屏幕凹槽：表盘嵌进去，底部内阴影做出深度 */}
      <rect x="24" y="26" width="72" height="98" rx="21" fill="#0d1116" />
      <rect x="24" y="26" width="72" height="98" rx="21" fill="none" stroke="#000000" strokeWidth="2" opacity="0.45" />

      {/* 表盘 + 细边 */}
      <circle cx="60" cy="75" r="32" fill="url(#obw-dial)" />
      <circle cx="60" cy="75" r="32" fill="none" stroke="#c6ccd5" strokeWidth="0.8" />

      {/* 刻度：整点粗黑、其余细灰 —— 单一权重是「一眼AI感」的主要来源 */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
        const major = deg % 90 === 0;
        return (
          <line
            key={deg}
            x1="60"
            y1={major ? 48 : 49.5}
            x2="60"
            y2={major ? 55.5 : 53}
            stroke={major ? '#1b2029' : '#98a2b3'}
            strokeWidth={major ? 2.6 : 1.1}
            strokeLinecap="round"
            transform={`rotate(${deg} 60 75)`}
          />
        );
      })}

      {/* 指针：加一层位移投影，让指针脱离表盘 */}
      <g opacity="0.18" transform="translate(0.7 1)">
        <path d="M60 75 L60 55" stroke="#000" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M60 75 L77 83" stroke="#000" strokeWidth="3.2" strokeLinecap="round" />
      </g>
      <path d="M60 75 L60 55" stroke="#1b2029" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M60 75 L77 83" stroke="#1b2029" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M60 84 L54 98" stroke="#e5484d" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="60" cy="75" r="3.2" fill="#1b2029" />
      <circle cx="60" cy="75" r="1.1" fill="#e5484d" />

      {/* 玻璃反光：斜向一道，裁在表盘内 —— 这是「玻璃盖在上面」的关键 */}
      <g clipPath="url(#obw-dial-clip)">
        <path d="M28 44 L92 32 L92 60 L28 74 Z" fill="url(#obw-glass)" />
      </g>
    </svg>
  );
}
