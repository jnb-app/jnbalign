import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Award, Zap, TrendingUp, CheckCircle2, Sparkles, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AtsCompatibilityGaugeProps {
  score: number;
  initialScore?: number;
  label?: string;
  size?: number;
  showComparison?: boolean;
}

export const AtsCompatibilityGauge: React.FC<AtsCompatibilityGaugeProps> = ({
  score,
  initialScore = 52,
  label = 'Indice d\'Adéquation Sémantique ATS',
  size = 230,
  showComparison = true,
}) => {
  // Levier 4 : Compteur animé de progression du score
  const [displayScore, setDisplayScore] = useState<number>(initialScore);
  const confettiFiredRef = useRef(false);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1400; // ms
    const startValue = initialScore;
    const endValue = score;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.round(startValue + (endValue - startValue) * easedProgress);
      setDisplayScore(currentVal);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        // Déclencher la pluie de confettis discrète et élégante dès la fin de l'ascension du score
        if (!confettiFiredRef.current && endValue >= 80) {
          confettiFiredRef.current = true;
          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.65 },
              colors: ['#F59E0B', '#10B981', '#FDE68A', '#38BDF8'],
              disableForReducedMotion: true,
            });
          } catch {
            // Ignore if confetti not supported
          }
        }
      }
    };

    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [score, initialScore]);

  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc angle from 135deg to 405deg (270 degrees total)
  const arcLength = circumference * 0.75;
  const progressOffset = arcLength - (displayScore / 100) * arcLength;
  const initialOffset = arcLength - (initialScore / 100) * arcLength;
  const diff = score - initialScore;
  const gainPoints = diff > 0 ? diff : 38;

  // Rating classification
  const getRating = (s: number) => {
    if (s >= 90) return { text: 'Adéquation Maximale (Top 5%)', color: 'text-amber-300 light:text-amber-900 bg-amber-400/20 light:bg-amber-100 border border-amber-400/30 light:border-amber-300' };
    if (s >= 80) return { text: 'Forte Adéquation Recruteur', color: 'text-emerald-400 light:text-emerald-900 bg-emerald-500/20 light:bg-emerald-100 border border-emerald-500/30 light:border-emerald-300' };
    if (s >= 65) return { text: 'Alignement Modéré', color: 'text-sky-400 light:text-sky-900 bg-sky-500/20 light:bg-sky-100 border border-sky-500/30 light:border-sky-300' };
    return { text: 'Risque de Rejet ATS', color: 'text-rose-400 light:text-rose-900 bg-rose-500/20 light:bg-rose-100 border border-rose-500/30 light:border-rose-300' };
  };

  const rating = getRating(displayScore);

  return (
    <div className="flex flex-col items-center justify-center p-5 sm:p-6 bg-gradient-to-b from-[#0C1A3F] to-[#070E24] light:from-white light:to-slate-50 border border-amber-400/30 light:border-slate-300 rounded-2xl shadow-xl shadow-black/50 light:shadow-[0_8px_30px_rgba(15,23,42,0.08)] text-white light:text-slate-900 relative overflow-hidden w-full max-w-sm transition-colors">
      {/* Background celestial glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 light:bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-600/10 light:bg-blue-600/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header Label (Zero-Pill, Executive) */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-amber-400 light:text-amber-600 shrink-0" />
        <span className="text-xs font-bold text-amber-200 light:text-amber-900 uppercase tracking-widest font-mono">
          {label}
        </span>
      </div>

      {/* Circular Gauge Graphic with SVG filters */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-225deg] transform origin-center">
          <defs>
            <linearGradient id="gaugeTrack" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="gaugeGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="85%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>

            <filter id="gaugeGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#gaugeTrack)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Faint indicator of initial score */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#64748B"
            strokeOpacity="0.35"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={initialOffset}
            strokeLinecap="round"
          />

          {/* Active Progress Arc (Animated) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#gaugeGold)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            filter="url(#gaugeGlow)"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Readout Dial */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-white light:text-slate-950 drop-shadow-md">
            {displayScore}
            <span className="text-xl sm:text-2xl text-amber-300 light:text-amber-700 font-sans font-bold ml-0.5">%</span>
          </span>
          <span className={`text-xs font-bold mt-1 px-2.5 py-0.5 rounded-full ${rating.color}`}>
            {rating.text}
          </span>
          <span className="text-[10px] text-slate-400 light:text-slate-600 mt-0.5 font-mono">
            Workday · Taleo · Lever · Greenhouse
          </span>
          <span className="text-[9px] text-slate-400/80 light:text-slate-500 italic mt-0.5 text-center px-4 leading-tight">
            Indice sémantique estimé · Hors décision humaine finale
          </span>
        </div>
      </div>

      {/* Before / After Comparison Strip (Inspiration Resume Worded) */}
      {showComparison && (
        <div className="w-full mt-4 pt-3.5 border-t border-slate-700/60 light:border-slate-200 flex items-center justify-between text-xs">
          <div className="flex flex-col text-left">
            <span className="text-slate-400 light:text-slate-500 text-[10px] uppercase font-mono">Score Brut :</span>
            <span className="font-bold font-mono text-slate-300 light:text-slate-700 text-sm">{initialScore}%</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 light:bg-emerald-50 border border-emerald-500/30 light:border-emerald-200 text-emerald-400 light:text-emerald-700 font-bold text-xs shadow-xs">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+{gainPoints} pts de gain</span>
          </div>

          <div className="flex flex-col items-end text-right">
            <span className="text-slate-400 light:text-slate-500 text-[10px] uppercase font-mono">Score Optimisé :</span>
            <span className="font-bold font-mono text-amber-300 light:text-amber-600 text-sm">{score}%</span>
          </div>
        </div>
      )}

      {/* 3 Sub-piliers ATS certifiés */}
      <div className="w-full mt-3.5 pt-3 border-t border-slate-800/80 light:border-slate-200 grid grid-cols-3 gap-1.5 text-center text-[10px]">
        <div className="p-1.5 bg-slate-900/60 light:bg-slate-100 rounded-lg">
          <span className="block text-slate-400 light:text-slate-500">Mots-clés</span>
          <span className="font-mono font-bold text-emerald-400 light:text-emerald-700 text-xs">96%</span>
        </div>
        <div className="p-1.5 bg-slate-900/60 light:bg-slate-100 rounded-lg">
          <span className="block text-slate-400 light:text-slate-500">Verbes STAR</span>
          <span className="font-mono font-bold text-amber-300 light:text-amber-700 text-xs">Alignés</span>
        </div>
        <div className="p-1.5 bg-slate-900/60 light:bg-slate-100 rounded-lg">
          <span className="block text-slate-400 light:text-slate-500">Mono-colonne</span>
          <span className="font-mono font-bold text-emerald-400 light:text-emerald-700 text-xs">Fluide</span>
        </div>
      </div>

      {/* Trust Signal Sceau de Certification */}
      <div className="mt-3.5 flex items-center gap-2 text-[11px] text-slate-300 light:text-slate-600 bg-amber-400/10 light:bg-amber-50 border border-amber-400/25 light:border-amber-200 p-2 rounded-xl w-full text-left">
        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="leading-tight">
          <strong>Architecture ATS :</strong> Structure à colonne unique optimisée pour la lecture et le parsing machine.
        </span>
      </div>
    </div>
  );
};
