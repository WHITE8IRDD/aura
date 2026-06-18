/**
 * Aura orb mark — layered rings, soft radial gradient, single highlight dot.
 * Built as a pure SVG component so it renders crisply at any size and
 * requires no image assets in Stage 1.
 */
export default function Logo({ size = 26 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-label="Aura"
      role="img"
    >
      <defs>
        <radialGradient id="aura-orb-core" cx="38%" cy="32%" r="70%">
          <stop offset="0%"   stopColor="#C6A5F1" />
          <stop offset="50%"  stopColor="#A6C0F1" />
          <stop offset="100%" stopColor="#ABD5E9" />
        </radialGradient>
      </defs>

      {/* Core sphere */}
      <circle cx="24" cy="24" r="20" fill="url(#aura-orb-core)" />

      {/* Outer ring — quaternary glow */}
      <circle
        cx="24" cy="24" r="20"
        stroke="#A6F1C9"
        strokeOpacity="0.45"
        strokeWidth="1"
      />

      {/* Horizontal orbital ring */}
      <ellipse
        cx="24" cy="24" rx="20" ry="7.5"
        stroke="white"
        strokeOpacity="0.25"
        strokeWidth="0.8"
      />

      {/* Vertical orbital ring */}
      <ellipse
        cx="24" cy="24" rx="7.5" ry="20"
        stroke="white"
        strokeOpacity="0.15"
        strokeWidth="0.8"
      />

      {/* Specular highlight dot */}
      <circle cx="17" cy="15" r="2.5" fill="white" fillOpacity="0.88" />
    </svg>
  )
}
