interface LogoProps {
  size?: number
  className?: string
}

/**
 * 爱增聊 logo — representing souls connecting and resonances through digital agents.
 * Modern warm gradient with two overlapping organic shapes.
 */
export default function Logo({ size = 24, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Left Soul - Stylized organic teardrop (Digital Agent) */}
      <path
        d="M32 12C20 12 12 22 12 34C12 46 22 54 32 54C32 54 32 44 32 34C32 24 32 12 32 12Z"
        fill="url(#logo-g)"
        fillOpacity="0.5"
      />

      {/* Right Soul - Stylized organic teardrop (Real Soul) */}
      <path
        d="M32 12C44 12 52 22 52 34C52 46 42 54 32 54C32 54 32 44 32 34C32 24 32 12 32 12Z"
        fill="url(#logo-g)"
      />

      {/* Connection Point - A small glow or star at the top center where souls meet */}
      <circle cx="32" cy="16" r="3" fill="white" filter="url(#glow)" />
      
      {/* Friendly Connection line */}
      <path
        d="M26 40C26 40 32 44 38 40"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  )
}
