import React from 'react';
import { GameStats } from '../types/game';
import { Volume2, VolumeX, Pause, Zap, Flame, Radio } from 'lucide-react';

interface HUDProps {
  stats: GameStats;
  isMuted: boolean;
  onToggleSound: () => void;
  onPause: () => void;
  onCycleRadio?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  isMuted,
  onToggleSound,
  onPause,
  onCycleRadio,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 sm:p-5 select-none font-sans">
      {/* Top Telemetry Bar */}
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-2">
        <div className="bg-[#030615f2] border border-cyan-500/40 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_30px_rgba(0,234,255,0.18)] flex items-center justify-between gap-3">
          {/* Speedometer */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/90 border border-cyan-400/50 flex items-center justify-center text-cyan-400 font-mono font-bold">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-[9px] uppercase font-mono tracking-widest text-cyan-400 font-semibold flex items-center gap-1.5">
                <span>গতি / SPEED</span>
                {stats.level && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold">
                    LVL {stats.level}
                  </span>
                )}
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white tabular-nums tracking-tight">
                {stats.speed}{' '}
                <span className="text-xs text-cyan-300 font-normal">KM/H</span>
              </div>
            </div>
          </div>

          {/* Distance & Score */}
          <div className="flex items-center gap-4 text-center font-mono">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">
                দূরত্ব / DISTANCE
              </div>
              <div className="text-lg sm:text-xl font-bold text-white tabular-nums">
                {(stats.distance / 1000).toFixed(2)}{' '}
                <span className="text-xs text-slate-400 font-normal">KM</span>
              </div>
            </div>

            <div className="hidden sm:block h-7 w-[1px] bg-slate-700" />

            <div className="hidden sm:block">
              <div className="text-[9px] uppercase tracking-widest text-amber-400 font-bold">
                স্কোর / SCORE
              </div>
              <div className="text-lg sm:text-xl font-bold text-amber-300 tabular-nums">
                {stats.score.toLocaleString()}
                {stats.combo > 1 && (
                  <span className="ml-1 text-xs text-pink-400 bg-pink-500/20 px-1 py-0.5 rounded font-mono">
                    {stats.combo.toFixed(1)}x
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Weather Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/95 border border-slate-700/60 shadow-sm">
            <span className="text-base sm:text-lg">{stats.weather.icon}</span>
            <div className="text-left font-mono leading-tight">
              <div className="text-[9px] uppercase font-bold text-slate-300">
                {stats.weather.name}
              </div>
              <div className="text-[10px] text-cyan-300">
                {stats.weather.gripFactor < 1
                  ? `গ্রিপ ${Math.round(stats.weather.gripFactor * 100)}%`
                  : 'গ্রিপ ১০০%'}
              </div>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={onToggleSound}
              className="p-2 rounded-xl bg-slate-900/95 border border-cyan-500/30 text-cyan-300 hover:border-cyan-400 transition-colors cursor-pointer"
              title="সাউন্ড অন/অফ"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onPause}
              className="p-2 rounded-xl bg-slate-900/95 border border-cyan-500/30 text-cyan-300 hover:border-cyan-400 transition-colors cursor-pointer"
              title="পজ করুন"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-Bar: Nitro Boost & Highway In-Car Radio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          {/* Nitro Gauge */}
          <div className="bg-[#030614e6] border border-cyan-500/30 rounded-xl px-3 py-1.5">
            <div className="flex justify-between items-center text-[10px] mb-1">
              <span className="text-cyan-400 flex items-center gap-1">
                <Flame className="w-3 h-3 text-cyan-300" /> নাইট্রো থ্রাস্ট (W / Shift)
              </span>
              <span className="text-cyan-200 font-bold tabular-nums">{stats.nitro}%</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-cyan-500/30 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-full transition-all duration-75"
                style={{ width: `${stats.nitro}%` }}
              />
            </div>
          </div>

          {/* Highway Radio Bar */}
          {stats.radio && (
            <div className="bg-[#030614e6] border border-cyan-500/30 rounded-xl px-2.5 py-1 flex items-center justify-between gap-2">
              <button
                onClick={onCycleRadio}
                className="pointer-events-auto flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-300 transition-all cursor-pointer shadow-sm active:scale-95"
                title="চ্যানেল পরিবর্তন (R কী)"
              >
                <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                <span className="font-bold text-[10px] truncate max-w-[95px]">{stats.radio.name}</span>
                <span className="text-[9px] text-amber-300 bg-black/50 px-1 py-0.2 rounded font-mono">
                  {stats.radio.frequency}
                </span>
              </button>

              <div className="flex-1 overflow-hidden min-w-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/40 text-[10px]">
                <span className="shrink-0 text-cyan-400 font-bold text-[9px]">📻</span>
                <span className="text-slate-300 truncate font-medium">
                  {stats.radio.trafficBulletin}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Compact Top Weather Alert Pill (keeps center driving lane 100% clear) */}
        {stats.weatherAlert && (
          <div className="self-center max-w-md w-full px-2">
            <div
              className={`w-full px-3.5 py-1.5 rounded-xl bg-gradient-to-r ${stats.weatherAlert.color} border border-white/40 shadow-lg flex items-center gap-2`}
            >
              <span className="text-base shrink-0">{stats.weatherAlert.icon}</span>
              <div className="text-left font-mono leading-tight">
                <div className="text-[11px] font-black text-white tracking-wide">
                  {stats.weatherAlert.title}
                </div>
                <div className="text-[9px] font-semibold text-white/90">
                  {stats.weatherAlert.subtitle}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Screen Center is intentionally 100% CLEAN */}
      <div />

      {/* Bottom Spacer for Mobile Touch Controls */}
      <div className="h-24 sm:h-8" />
    </div>
  );
};
