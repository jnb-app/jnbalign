import React, { useState } from 'react';

interface JnbAlignCompassPrismProps {
  className?: string;
  interactive?: boolean;
}

export const JnbAlignCompassPrism: React.FC<JnbAlignCompassPrismProps> = ({
  className = '',
  interactive = true,
}) => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -16;
    setRotate({ x, y });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{
        perspective: '1000px',
      }}
    >
      <div
        className="relative w-full max-w-[420px] aspect-square flex items-center justify-center transition-transform duration-300 ease-out"
        style={{
          transform: `rotateY(${rotate.x}deg) rotateX(${rotate.y}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/15 via-blue-600/10 to-amber-300/10 blur-3xl pointer-events-none" />

        {/* Outer Celestial Compass Ring */}
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full drop-shadow-[0_0_35px_rgba(212,175,55,0.25)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F9DF7B" />
              <stop offset="35%" stopColor="#D4AF37" />
              <stop offset="70%" stopColor="#E6C252" />
              <stop offset="100%" stopColor="#AA820A" />
            </linearGradient>

            <linearGradient id="prismLight" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#F3C64F" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.85" />
            </linearGradient>

            <linearGradient id="laserBeam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#FDE68A" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.9" />
            </linearGradient>

            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Concentric Astrolabe Rings */}
          <circle
            cx="200"
            cy="200"
            r="185"
            stroke="url(#goldGrad)"
            strokeWidth="1.2"
            strokeOpacity="0.4"
            strokeDasharray="4 8"
          />
          <circle
            cx="200"
            cy="200"
            r="165"
            stroke="url(#goldGrad)"
            strokeWidth="1"
            strokeOpacity="0.6"
          />
          <circle
            cx="200"
            cy="200"
            r="140"
            stroke="#93C5FD"
            strokeWidth="0.8"
            strokeOpacity="0.3"
            strokeDasharray="2 6"
          />

          {/* Compass Degree Ticks (360 degrees) */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 360) / 24;
            const isMajor = i % 6 === 0;
            const r1 = 165;
            const r2 = isMajor ? 152 : 158;
            const rad = (angle * Math.PI) / 180;
            const x1 = 200 + r1 * Math.cos(rad);
            const y1 = 200 + r1 * Math.sin(rad);
            const x2 = 200 + r2 * Math.cos(rad);
            const y2 = 200 + r2 * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="url(#goldGrad)"
                strokeWidth={isMajor ? 2 : 1}
                strokeOpacity={isMajor ? 0.9 : 0.5}
              />
            );
          })}

          {/* Cardinal Directions - JNB Align Pillars (Light mode high-contrast adaptive) */}
          <text
            x="200"
            y="32"
            fill="currentColor"
            fontSize="11"
            fontWeight="800"
            textAnchor="middle"
            letterSpacing="2"
            className="jnb-compass-cardinal-text text-amber-200 light:text-amber-950 transition-colors"
          >
            ATS PRECISION
          </text>
          <text
            x="372"
            y="204"
            fill="currentColor"
            fontSize="10"
            fontWeight="800"
            textAnchor="end"
            letterSpacing="1.5"
            className="jnb-compass-cardinal-text text-amber-200 light:text-amber-950 transition-colors"
          >
            IMPACT STAR
          </text>
          <text
            x="200"
            y="380"
            fill="currentColor"
            fontSize="11"
            fontWeight="800"
            textAnchor="middle"
            letterSpacing="2"
            className="jnb-compass-cardinal-text text-amber-200 light:text-amber-950 transition-colors"
          >
            FAITS RÉELS
          </text>
          <text
            x="28"
            y="204"
            fill="currentColor"
            fontSize="10"
            fontWeight="800"
            textAnchor="start"
            letterSpacing="1.5"
            className="jnb-compass-cardinal-text text-amber-200 light:text-amber-950 transition-colors"
          >
            CLARTÉ
          </text>

          {/* Laser Refraction Beam from West to Center Prism */}
          <path
            d="M 40 200 L 155 200"
            stroke="#60A5FA"
            strokeWidth="2"
            strokeDasharray="4 2"
            opacity="0.85"
            filter="url(#glowFilter)"
            className="light:stroke-blue-600 transition-colors"
          />
          <circle cx="40" cy="200" r="3.5" fill="#93C5FD" className="light:fill-blue-600 transition-colors" />

          {/* The Optical Prism (Equilateral Triangle in Center) */}
          <polygon
            points="200,95 295,260 105,260"
            fill="none"
            stroke="url(#goldGrad)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            filter="url(#glowFilter)"
            className="light:stroke-amber-700 transition-colors"
          />

          {/* Internal Crystalline Facets */}
          <polygon
            points="200,95 295,260 200,210"
            fill="url(#goldGrad)"
            fillOpacity="0.08"
            className="light:fill-amber-600 light:fill-opacity-15 transition-colors"
          />
          <polygon
            points="200,95 105,260 200,210"
            fill="#3B82F6"
            fillOpacity="0.07"
            className="light:fill-blue-600 light:fill-opacity-15 transition-colors"
          />
          <line
            x1="200"
            y1="95"
            x2="200"
            y2="260"
            stroke="url(#goldGrad)"
            strokeWidth="1.2"
            strokeOpacity="0.7"
            className="light:stroke-amber-700 transition-colors"
          />
          <line
            x1="105"
            y1="260"
            x2="248"
            y2="178"
            stroke="#FDE68A"
            strokeWidth="0.8"
            strokeOpacity="0.5"
            className="light:stroke-amber-600 transition-colors"
          />
          <line
            x1="295"
            y1="260"
            x2="152"
            y2="178"
            stroke="#60A5FA"
            strokeWidth="0.8"
            strokeOpacity="0.5"
            className="light:stroke-blue-500 transition-colors"
          />

          {/* Refracted Dispersion Rays Egressing from Prism */}
          <path
            d="M 230 195 L 360 120"
            stroke="#FACC15"
            strokeWidth="2.2"
            strokeLinecap="round"
            filter="url(#glowFilter)"
            opacity="0.9"
            className="light:stroke-amber-600 transition-colors"
          />
          <path
            d="M 245 210 L 370 170"
            stroke="#E5B842"
            strokeWidth="1.8"
            strokeLinecap="round"
            filter="url(#glowFilter)"
            opacity="0.85"
            className="light:stroke-amber-700 transition-colors"
          />
          <path
            d="M 255 230 L 365 240"
            stroke="#F59E0B"
            strokeWidth="1.6"
            strokeLinecap="round"
            filter="url(#glowFilter)"
            opacity="0.8"
            className="light:stroke-amber-800 transition-colors"
          />

          {/* Refracted Rays Terminal Target Dots */}
          <circle cx="360" cy="120" r="3.5" fill="#FDE68A" filter="url(#glowFilter)" className="light:fill-amber-600 transition-colors" />
          <circle cx="370" cy="170" r="3" fill="#FACC15" className="light:fill-amber-600 transition-colors" />
          <circle cx="365" cy="240" r="3" fill="#F59E0B" className="light:fill-amber-700 transition-colors" />

          {/* Compass Needle (Rhombus Star Pointer in Center) */}
          <g transform="rotate(28, 200, 200)">
            {/* North Golden Needle */}
            <polygon
              points="200,120 207,200 200,195 193,200"
              fill="url(#goldGrad)"
              filter="url(#glowFilter)"
              className="light:fill-amber-600 transition-colors"
            />
            {/* South Deep Navy Needle */}
            <polygon
              points="200,280 207,200 200,205 193,200"
              fill="#1E3A8A"
              stroke="#D4AF37"
              strokeWidth="0.8"
              className="light:fill-slate-800 light:stroke-amber-700 transition-colors"
            />
            {/* Center Pivot Jewel */}
            <circle cx="200" cy="200" r="6" fill="#0A1128" stroke="url(#goldGrad)" strokeWidth="2" className="light:fill-white light:stroke-amber-700 transition-colors" />
            <circle cx="200" cy="200" r="2.5" fill="#FDE68A" className="light:fill-amber-700 transition-colors" />
          </g>

          {/* Orbiting Starlight Sparkles */}
          <circle cx="130" cy="125" r="1.5" fill="#FDE68A" opacity="0.8" className="light:fill-amber-600 transition-colors" />
          <circle cx="280" cy="110" r="2" fill="#FDE68A" opacity="0.9" className="light:fill-amber-600 transition-colors" />
          <circle cx="310" cy="300" r="1.5" fill="#FDE68A" opacity="0.7" className="light:fill-amber-600 transition-colors" />
          <circle cx="95" cy="290" r="1.8" fill="#FDE68A" opacity="0.85" className="light:fill-amber-600 transition-colors" />
        </svg>

        {/* Floating Holographic Caption */}
        <div className="absolute -bottom-2 bg-[#0B1530]/90 light:bg-white/95 backdrop-blur-md border border-amber-400/30 light:border-amber-400/60 px-3.5 py-1.5 rounded-full flex items-center gap-2 text-[11px] font-bold text-amber-200 light:text-amber-950 shadow-lg shadow-black/40 light:shadow-amber-900/10 transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 light:bg-amber-600 animate-ping" />
          <span>Prisme & Boussole · Alignement Sémantique de Précision</span>
        </div>
      </div>
    </div>
  );
};
