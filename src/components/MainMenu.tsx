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
  Star,
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
import bannerImg from '../assets/images/speed_tycoon_banner_1795517835620.jpg';
import profileImg from '../assets/images/speed_tycoon_profile_1795517836646.jpg';

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
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-[#020512cc] font-sans overflow-y-auto">
      <div className="w-full max-w-lg bg-[#030617f5] border border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_70px_rgba(0,234,255,0.22)] text-center text-white flex flex-col gap-3 my-auto relative">
        {/* Top Tag, Profile & Sound */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-400/40 text-[10px] font-mono text-cyan-300 tracking-[1.5px] uppercase">
            <span>হাইওয়ে ৩ডি · প্রো টিয়ার</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowProfile((v) => !v)}
              className="min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 hover:border-cyan-400 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="ড্রাইভার প্রোফাইল ও স্ট্যাটস"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>প্রোফাইল</span>
            </button>

            <button
              onClick={onToggleSound}
              className="min-w-[44px] min-h-[44px] p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="সাউন্ড"
              aria-label="Toggle Sound"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_20px_rgba(0,234,255,0.5)]">
            SPEED <span className="text-emerald-400 drop-shadow-[0_0_20px_rgba(0,230,118,0.6)]">TYCOON</span>
          </h1>
          <div className="text-[11px] font-mono tracking-[2.5px] text-cyan-300 uppercase mt-0.5">
            হাইপার-রিয়েল ৩ডি · এক্সপ্রেসওয়ে কার রেসার
          </div>
        </div>

        {/* Driver Profile & Recharts Lifetime Progress View */}
        {showProfile ? (
          <div className="bg-slate-950 border border-cyan-500/40 rounded-2xl p-4 text-left flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2.5">
                <img
                  src={profileImg}
                  alt="Driver Avatar"
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-xl border border-cyan-400 object-cover"
                />
                <div className="font-mono">
                  <div className="text-xs font-black text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" /> ড্রাইভার ক্যারিয়ার স্ট্যাটস
                  </div>
                  <div className="text-[10px] text-slate-400 tabular-nums">
                    মোট রেস: {profileStats.totalRuns} বার · সেরা স্কোর: {highScore.toLocaleString()} PTS
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowProfile(false)}
                className="min-w-[40px] min-h-[40px] p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                aria-label="Close Profile"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono">
              <div className="p-2.5 rounded-xl bg-black/50 border border-cyan-500/20">
                <div className="text-[9px] text-cyan-400 flex items-center gap-1">
                  <Route className="w-3 h-3" /> মোট দূরত্ব
                </div>
                <div className="text-sm font-black text-white mt-0.5 tabular-nums">
                  {totalDistanceKm} <span className="text-[10px] text-slate-400">KM</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/50 border border-emerald-500/20">
                <div className="text-[9px] text-emerald-400 flex items-center gap-1">
                  <Gauge className="w-3 h-3" /> গড় গতি
                </div>
                <div className="text-sm font-black text-white mt-0.5 tabular-nums">
                  {avgSpeed} <span className="text-[10px] text-slate-400">KM/H</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/50 border border-red-500/20">
                <div className="text-[9px] text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> ক্র্যাশ
                </div>
                <div className="text-sm font-black text-white mt-0.5 tabular-nums">
                  {profileStats.totalCrashes} <span className="text-[10px] text-slate-400">বার</span>
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] font-mono text-slate-400 mb-2 flex items-center justify-between">
                <span>সাম্প্রতিক রেস পারফরম্যান্স (স্পিড গ্রাফ)</span>
                <span className="text-cyan-400 tabular-nums">{profileStats.history.length} রান</span>
              </div>
              <div className="w-full h-32">
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
            {/* Official Game Showcase Banner & Profile Trigger */}
            <div
              onClick={() => setShowProfile(true)}
              className="relative rounded-2xl overflow-hidden border border-cyan-500/50 shadow-[0_0_25px_rgba(0,234,255,0.2)] group cursor-pointer"
            >
              <img
                src={bannerImg}
                alt="Highway Racing Banner"
                referrerPolicy="no-referrer"
                className="w-full h-24 sm:h-28 object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#030617] via-black/30 to-transparent flex items-end justify-between p-2.5">
                <div className="flex items-center gap-2">
                  <img
                    src={profileImg}
                    alt="Profile Icon"
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-xl border-2 border-emerald-400 shadow-md object-cover"
                  />
                  <div className="text-left font-mono leading-tight">
                    <div className="text-[11px] font-bold text-white drop-shadow">SPEED TYCOON 3D PRO</div>
                    <div className="text-[9px] text-cyan-300 font-semibold drop-shadow tabular-nums">
                      মোট {totalDistanceKm} KM · গড় {avgSpeed} KM/H ❯
                    </div>
                  </div>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-amber-400 text-black font-mono font-black text-[9px] shadow">
                  প্রোফাইল দেখুন
                </div>
              </div>
            </div>

            {/* In-Game Wallet & Garage */}
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/60 rounded-2xl p-3 flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[9px] font-mono text-emerald-400 uppercase font-bold">টাইকুন ক্যাশ ওয়ালেট</div>
                  <div className="text-2xl font-black font-mono text-emerald-300 tabular-nums">
                    ৳ {walletBalance.toLocaleString()}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onOpenShop('cars')}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs flex items-center gap-1.5 shadow-[0_0_18px_rgba(0,230,118,0.4)] transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                মেগা গ্যারেজ
              </button>
            </div>

            {/* Selected Car & Selected Road */}
            <div className="grid grid-cols-2 gap-2 text-left font-mono">
              <div
                onClick={() => onOpenShop('cars')}
                className="p-3 rounded-2xl bg-black/60 border border-cyan-500/30 hover:border-cyan-400 transition-colors cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="text-[9px] text-cyan-400 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star key={idx} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      ))}
                    </span>
                    <span className="text-slate-400 group-hover:text-cyan-300 text-[9px]">বদলান ❯</span>
                  </div>
                  <div className="text-sm font-bold text-white truncate mt-1">
                    {selectedCar.name}
                  </div>
                </div>
                <div className="text-[10px] text-cyan-300 mt-1.5 flex items-center justify-between tabular-nums">
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3 h-3" /> {selectedCar.topSpeed} KM/H
                  </span>
                  <span className="text-emerald-400 font-bold">+{selectedCar.nitroBoost} N2O</span>
                </div>
              </div>

              <div
                onClick={() => onOpenShop('roads')}
                className="p-3 rounded-2xl bg-black/60 border border-purple-500/30 hover:border-purple-400 transition-colors cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="text-[9px] text-purple-400 uppercase flex items-center justify-between">
                    <span>হাইওয়ে ট্র্যাক</span>
                    <span className="text-slate-400 group-hover:text-purple-300 text-[9px]">বদলান ❯</span>
                  </div>
                  <div className="text-sm font-bold text-white truncate mt-1">
                    {selectedRoad.name}
                  </div>
                </div>
                <div className="text-[10px] text-purple-300 mt-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> ৭টি বাস্তবসম্মত হাইওয়ে
                </div>
              </div>
            </div>

            {/* Upgrades & Lucky Spin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                onClick={() => onOpenShop('upgrades')}
                className="p-2.5 rounded-2xl bg-black/50 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer flex items-center justify-between font-mono text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-300 font-bold text-[11px]">টিউনিং:</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] tabular-nums">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                    স্পিড L{upgrades.engineLevel}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center gap-0.5">
                    <Magnet className="w-2.5 h-2.5" /> L{upgrades.magnetLevel}
                  </span>
                </div>
              </div>

              <button
                onClick={onOpenLuckySpin}
                className="min-h-[44px] py-2 px-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-400/50 hover:border-amber-300 text-amber-300 font-mono font-bold text-[11px] flex items-center justify-between gap-1.5 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">লাকি স্পিন</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black font-black text-[9px] shrink-0">
                  {freeSpinAvailable ? 'ফ্রি!' : 'স্পিন'}
                </span>
              </button>
            </div>
          </>
        )}

        {/* High Score & Play Button */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-xs font-mono text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" /> হাই-স্কোর
            </span>
            <span className="font-bold text-white tabular-nums">{highScore.toLocaleString()} PTS</span>
          </div>

          <button
            onClick={onStartGame}
            className="w-full min-h-[54px] py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-300 hover:brightness-110 text-black font-mono font-black text-lg tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_35px_rgba(0,234,255,0.6)] transition-all cursor-pointer"
          >
            <Play className="w-6 h-6 fill-black" />
            রেস শুরু করুন (START RACE)
          </button>
        </div>

        {/* Control Tips */}
        <div className="text-[10px] text-slate-400 font-mono leading-relaxed">
          🕹️ <span className="text-slate-200">A/D বা ◀▶:</span> লেন পরিবর্তন ·{' '}
          <span className="text-cyan-300">W/▲:</span> নাইট্রো ·{' '}
          <span className="text-red-300">S/▼:</span> ব্রেক ·{' '}
          <span className="text-slate-200">R:</span> রেডিও
        </div>
      </div>
    </div>
  );
};
