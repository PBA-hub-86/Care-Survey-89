import React from 'react';
import { Play, Home, CloudRain, Sun, CloudFog, Snowflake } from 'lucide-react';
import { DynamicWeatherType } from '../types/game';

interface PauseModalProps {
  currentWeather?: DynamicWeatherType;
  onCycleWeather?: () => void;
  onResume: () => void;
  onHome: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  currentWeather = 'clear',
  onCycleWeather,
  onResume,
  onHome,
}) => {
  const getWeatherIcon = (type: DynamicWeatherType) => {
    switch (type) {
      case 'rain':
        return <CloudRain className="w-4 h-4 text-cyan-400" />;
      case 'fog':
        return <CloudFog className="w-4 h-4 text-slate-300" />;
      case 'neon_snow':
        return <Snowflake className="w-4 h-4 text-purple-300" />;
      default:
        return <Sun className="w-4 h-4 text-amber-400" />;
    }
  };

  const getWeatherLabel = (type: DynamicWeatherType) => {
    switch (type) {
      case 'rain':
        return 'প্রবল বৃষ্টি (Heavy Rain)';
      case 'fog':
        return 'ঘন কুয়াশা (Thick Fog)';
      case 'neon_snow':
        return 'নিয়ন তুষার (Neon Snow)';
      default:
        return 'পরিষ্কার আকাশ (Clear Sky)';
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md font-sans">
      <div className="w-full max-w-xs bg-[#04081ae8] border border-cyan-500/40 rounded-3xl p-6 text-center text-white flex flex-col gap-4 shadow-[0_0_40px_rgba(0,234,255,0.25)]">
        <div>
          <div className="text-[10px] font-mono tracking-[4px] text-cyan-400 uppercase">
            গেম স্থগিত আছে
          </div>
          <h2 className="text-2xl font-black font-mono tracking-wider text-cyan-100 mt-1">
            PAUSED
          </h2>
        </div>

        {/* Dynamic Environment Settings Toggle */}
        {onCycleWeather && (
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-left font-mono">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">
              ডায়নামিক পরিবেশ / WEATHER PRESET
            </div>
            <button
              onClick={onCycleWeather}
              className="w-full py-2 px-3 rounded-xl bg-black/60 border border-cyan-500/30 hover:border-cyan-400 text-xs font-bold text-white flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {getWeatherIcon(currentWeather)}
                <span>{getWeatherLabel(currentWeather)}</span>
              </div>
              <span className="text-[10px] text-cyan-400">বদলান ❯</span>
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2.5 pt-1">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black font-mono text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,234,255,0.4)] transition-transform active:scale-98 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" /> খেলা চালিয়ে যান
          </button>

          <button
            onClick={onHome}
            className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" /> মেইন মেনু
          </button>
        </div>
      </div>
    </div>
  );
};
