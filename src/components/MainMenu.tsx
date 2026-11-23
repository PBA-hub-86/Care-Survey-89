import React, { useState } from 'react';
import { CarConfig, RoadTheme, GlobalUpgrades, DriverProfileStats } from '../types/game';
import {
  Play,
  Volume2,
  VolumeX,
  Award,
  Gauge,
  Coins,
  Sparkles,
  ShoppingBag,
  MapPin,
  Magnet,
  Zap,
  User,
  BarChart3,
  X,
  AlertTriangle,
  Route,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import bannerImg from '../assets/images/speed_tycoon_banner_1793961891406.jpg';
import profileImg from '../assets/images/speed_tycoon_profile_1793961890654.jpg';

interface MainMenuProps {
  selectedCar: CarConfig;
  selectedRoad: RoadTheme;
  upgrades: GlobalUpgrades;
  walletBalance: number;
  highScore: number;
  profileStats: DriverProfileStats;
  isMuted: boolean;
  freeSpinAvailable: boolean;
  onStartGame: () => void;
  onOpenShop: (tab?: 'cars' | 'roads' | 'upgrades' | 'neon') => void;
  onOpenLuckySpin: () => void;
  onToggleSound: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  selectedCar,
  selectedRoad,
  upgrades,
  walletBalance,
  highScore,
  profileStats,
  isMuted,
  freeSpinAvailable,
  onStartGame,
  onOpenShop,
  onOpenLuckySpin,
  onToggleSound,
}) => {
  const [showProfile, setShowProfile] = useState(false);

  const avgSpeed =
    profileStats.totalRuns > 0
      ? Math.round(profileStats.speedSum / profileStats.totalRuns)
      : 0;
  const totalDistanceKm = (profileStats.totalDistance / 1000).toFixed(2);
  const chartData =
    profileStats.history.length > 0
      ? profileStats.history
      : [{ run: 'Run #1', distanceKm: 0, avgSpeed: 0, score: 0 }];

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-gradient-to-b from-black/40 via-black/60 to-black/85 backdrop-blur-[2px] font-sans overflow-y-auto">
      <div className="w-full max-w-lg bg-[#030617f0] border border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_70px_rgba(0,234,255,0.25)] text-center text-white flex flex-col gap-3.5 my-auto relative">
        {/* Top Tag, Profile & Sound */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-[10px] font-mono text-cyan-300 tracking-[2px] uppercase">
            3D হাইওয়ে কার রেসার · টাইকুন শপ
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowProfile((v) => !v)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 hover:border-cyan-400 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="ড্রাইভার প্রোফাইল ও স্ট্যাটস"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>প্রোফাইল</span>
            </button>

            <button
              onClick={onToggleSound}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="সাউন্ড"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_25px_rgba(0,234,255,0.6)]">
            SPEED <span className="text-emerald-400 drop-shadow-[0_0_25px_rgba(0,230,118,0.7)]">TYCOON</span>
          </h1>
          <div className="text-[11px] font-mono tracking-[3px] text-cyan-300 uppercase mt-0.5">
            মাল্টি-লেন হাইওয়ে ও হাই-স্পিড কার রেসার
          </div>
        </div>

        {/* Driver Profile & Recharts Lifetime Progress View */}
        {showProfile ? (
          <div className="bg-slate-950/90 border border-cyan-500/40 rounded-2xl p-4 text-left flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2.5">
                <img
                  src={profileImg}
                  alt="Driver Avatar"
                  className="w-9 h-9 rounded-xl border border-cyan-400 object-cover"
                />
                <div className="font-mono">
                  <div className="text-xs font-black text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" /> ড্রাইভার ক্যারিয়ার স্ট্যাটস
                  </div>
                  <div className="text-[10px] text-slate-400">
                    মোট রেস: {profileStats.totalRuns} বার
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowProfile(false)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono">
              <div className="p-2.5 rounded-xl bg-black/50 border border-cyan-500/20">
                <div className="text-[9px] text-cyan-400 flex items-center gap-1">
                  <Route className="w-3 h-3" /> মোট দূরত্ব
                </div>
                <div className="text-sm sm:text-base font-black text-white mt-0.5 tabular-nums">
                  {totalDistanceKm} <span className="text-[10px] text-slate-400">KM</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/50 border border-emerald-500/20">
                <div className="text-[9px] text-emerald-400 flex items-center gap-1">
                  <Gauge className="w-3 h-3" /> গড় সর্বোচ্চ গতি
                </div>
                <div className="text-sm sm:text-base font-black text-white mt-0.5 tabular-nums">
                  {avgSpeed} <span className="text-[10px] text-slate-400">KM/H</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/50 border border-red-500/20">
                <div className="text-[9px] text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> মোট ক্র্যাশ
                </div>
                <div className="text-sm sm:text-base font-black text-white mt-0.5 tabular-nums">
                  {profileStats.totalCrashes} <span className="text-[10px] text-slate-400">বার</span>
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] font-mono text-slate-400 mb-2 flex items-center justify-between">
                <span>সাম্প্রতিক রেস পারফরম্যান্স (KM ও স্পিড)</span>
                <span className="text-cyan-400">{profileStats.history.length} রান</span>
              </div>
              <div className="w-full h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 6, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00eaff" stopOpacity={0.55} />
                        <stop offset="95%" stopColor="#00eaff" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="run" stroke="#64748b" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#020617',
                        border: '1px solid rgba(0,234,255,0.4)',
                        borderRadius: '10px',
                        fontSize: '11px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgSpeed"
                      name="টপ স্পিড (KM/H)"
                      stroke="#00eaff"
                      fillOpacity={1}
                      fill="url(#speedGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Official Game Showcase Banner & Profile Icon */}
            <div
              onClick={() => setShowProfile(true)}
              className="relative rounded-2xl overflow-hidden border border-cyan-500/50 shadow-[0_0_25px_rgba(0,234,255,0.25)] group cursor-pointer"
            >
              <img
                src={bannerImg}
                alt="Highway Racing Banner"
                className="w-full h-28 sm:h-32 object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#030617] via-black/30 to-transparent flex items-end justify-between p-2.5">
                <div className="flex items-center gap-2">
                  <img
                    src={profileImg}
                    alt="Profile Icon"
                    className="w-9 h-9 rounded-xl border-2 border-emerald-400 shadow-md object-cover"
                  />
                  <div className="text-left font-mono leading-tight">
                    <div className="text-[11px] font-bold text-white drop-shadow">HIGHWAY OVERDRIVE 3D</div>
                    <div className="text-[9px] text-cyan-300 font-semibold drop-shadow">
                      মোট {totalDistanceKm} KM ড্রাইভ · প্রোফাইল দেখুন ❯
                    </div>
                  </div>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-emerald-500 text-black font-mono font-bold text-[9px] shadow">
                  ⚡ হাইওয়ে এডিশন
                </div>
              </div>
            </div>

            {/* Big In-Game Wallet & Shop Action */}
            <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/60 rounded-2xl p-3.5 flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
                  <Coins className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-[9px] font-mono text-emerald-400 uppercase font-bold">ইন-গেম ক্যাশ ওয়ালেট</div>
                  <div className="text-2xl font-black font-mono text-emerald-300">
                    ৳ {walletBalance.toLocaleString()}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onOpenShop('cars')}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs flex items-center gap-1.5 shadow-[0_0_18px_rgba(0,230,118,0.5)] transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                মেগা শপ
              </button>
            </div>

            {/* Action Hub: Selected Car & Road */}
            <div className="grid grid-cols-2 gap-2 text-left font-mono">
              {/* Selected Car */}
              <div
                onClick={() => onOpenShop('cars')}
                className="p-3 rounded-2xl bg-black/50 border border-cyan-500/30 hover:border-cyan-400 transition-colors cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="text-[9px] text-cyan-400 uppercase flex items-center justify-between">
                    <span>সুপারকার</span>
                    <span className="text-slate-500 group-hover:text-cyan-300 text-[8px]">বদলান ❯</span>
                  </div>
                  <div className="text-sm font-bold text-white truncate mt-0.5">
                    {selectedCar.name}
                  </div>
                </div>
                <div className="text-[10px] text-cyan-300 mt-2 flex items-center gap-1">
                  <Gauge className="w-3 h-3" /> {selectedCar.topSpeed} KM/H
                </div>
              </div>

              {/* Selected Road */}
              <div
                onClick={() => onOpenShop('roads')}
                className="p-3 rounded-2xl bg-black/50 border border-purple-500/30 hover:border-purple-400 transition-colors cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="text-[9px] text-purple-400 uppercase flex items-center justify-between">
                    <span>রাস্তা ও পরিবেশ</span>
                    <span className="text-slate-500 group-hover:text-purple-300 text-[8px]">বদলান ❯</span>
                  </div>
                  <div className="text-sm font-bold text-white truncate mt-0.5">
                    {selectedRoad.name}
                  </div>
                </div>
                <div className="text-[10px] text-purple-300 mt-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> ট্র্যাক পরিবেশ
                </div>
              </div>
            </div>

            {/* Upgrades & Tuning Quick Badges */}
            <div
              onClick={() => onOpenShop('upgrades')}
              className="p-3 rounded-2xl bg-black/40 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer flex items-center justify-between font-mono text-xs"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300 font-bold">টিউনিং আপগ্রেড:</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                  স্পিড L{upgrades.engineLevel}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300">
                  গ্রিপ L{upgrades.shieldLevel}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center gap-0.5">
                  <Magnet className="w-2.5 h-2.5" /> L{upgrades.magnetLevel}
                </span>
              </div>
            </div>

            {/* Lucky Spin Banner */}
            <button
              onClick={onOpenLuckySpin}
              className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-400/50 hover:border-amber-300 text-amber-300 font-mono font-bold text-xs flex items-center justify-between shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                <span>ভাগ্য চাকা (Lucky Spin)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black font-bold text-[10px]">
                {freeSpinAvailable ? '🎁 ফ্রি স্পিন!' : 'স্পিন করুন'}
              </span>
            </button>
          </>
        )}

        {/* High Score & Play Button */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-xs font-mono text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" /> হাই-স্কোর
            </span>
            <span className="font-bold text-white">{highScore.toLocaleString()} PTS</span>
          </div>

          <button
            onClick={onStartGame}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-300 hover:brightness-110 text-black font-mono font-black text-lg tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(0,234,255,0.7)] transition-all cursor-pointer"
          >
            <Play className="w-6 h-6 fill-black" />
            রেস শুরু করুন (START RACE)
          </button>
        </div>

        {/* Control Tips */}
        <div className="text-[10px] text-slate-400 font-mono">
          🕹️ <span className="text-slate-300">PC:</span> A/D বা Arrow Keys · <span className="text-slate-300">নাইট্রো:</span> W বা Up Arrow | <span className="text-slate-300">Mobile:</span> টাচ বাটন ও সোয়াইপ
        </div>
      </div>
    </div>
  );
};
