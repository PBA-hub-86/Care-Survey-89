import React, { useState } from 'react';
import { CarConfig, RoadTheme, GlobalUpgrades } from '../types/game';
import { UPGRADE_TIERS } from '../data/cars';
import { sound } from '../audio/sound';
import confetti from 'canvas-confetti';
import {
  X,
  Car,
  MapPin,
  Zap,
  Sparkles,
  Check,
  Lock,
  ChevronLeft,
  ChevronRight,
  Flame,
  Shield,
  Gauge,
  Magnet,
  TrendingUp,
  Coins,
  Star,
} from 'lucide-react';

interface UnderglowItem {
  name: string;
  color: string;
  price: number;
  unlocked: boolean;
}

interface ShopModalProps {
  balance: number;
  cars: CarConfig[];
  selectedCarIndex: number;
  onSelectCar: (index: number) => void;
  onBuyCar: (index: number) => void;
  roads: RoadTheme[];
  selectedRoadIndex: number;
  onSelectRoad: (index: number) => void;
  onBuyRoad: (index: number) => void;
  upgrades: GlobalUpgrades;
  onUpgrade: (type: keyof GlobalUpgrades) => void;
  underglows: UnderglowItem[];
  selectedUnderglow: string;
  onSelectUnderglow: (color: string) => void;
  onBuyUnderglow: (color: string, price: number) => void;
  onClose: () => void;
  defaultTab?: 'cars' | 'roads' | 'upgrades' | 'neon';
}

export const ShopModal: React.FC<ShopModalProps> = ({
  balance,
  cars,
  selectedCarIndex,
  onSelectCar,
  onBuyCar,
  roads,
  selectedRoadIndex,
  onSelectRoad,
  onBuyRoad,
  upgrades,
  onUpgrade,
  underglows,
  selectedUnderglow,
  onSelectUnderglow,
  onBuyUnderglow,
  onClose,
  defaultTab = 'cars',
}) => {
  const [tab, setTab] = useState<'cars' | 'roads' | 'upgrades' | 'neon'>(defaultTab);
  const [activeCarIdx, setActiveCarIdx] = useState<number>(selectedCarIndex);

  const curCar = cars[activeCarIdx];
  const carStars = 5;

  const handleNextCar = () => {
    sound.tone(360, 0.05);
    setActiveCarIdx((prev) => (prev + 1) % cars.length);
  };

  const handlePrevCar = () => {
    sound.tone(320, 0.05);
    setActiveCarIdx((prev) => (prev - 1 + cars.length) % cars.length);
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 font-sans">
      <div className="w-full max-w-4xl max-h-[94vh] bg-[#030617fc] border border-cyan-500/50 rounded-3xl shadow-[0_0_80px_rgba(0,234,255,0.22)] flex flex-col overflow-hidden text-white">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/20 bg-slate-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,234,255,0.4)] shrink-0">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black font-mono tracking-tight text-white flex items-center gap-2 flex-wrap">
                <span>মেগা টাইকুন গ্যারেজ ও শপ</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 font-mono">
                  ★★★★★ 5.0 MAX TIER
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                বাস্তবসম্মত হাইওয়ে রাস্তা ও সুপারকার আনলক করুন · প্রো-স্পেক ইঞ্জিন টিউনিং
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Wallet Balance */}
            <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-950 border border-emerald-500/50 flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              <div className="text-left font-mono">
                <div className="text-[8px] text-emerald-400 uppercase font-bold">ব্যালেন্স</div>
                <div className="text-sm sm:text-base font-black text-emerald-300 tabular-nums">
                  ৳ {balance.toLocaleString()}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] p-2 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close Shop"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-cyan-500/20 bg-black/50 p-1.5 sm:p-2 gap-1.5 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => {
              setTab('cars');
              sound.tone(400, 0.04);
            }}
            className={`flex-1 min-w-[120px] min-h-[44px] py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              tab === 'cars'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Car className="w-4 h-4" /> সুপারকার ({cars.length})
          </button>

          <button
            onClick={() => {
              setTab('roads');
              sound.tone(450, 0.04);
            }}
            className={`flex-1 min-w-[130px] min-h-[44px] py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              tab === 'roads'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-400/60 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4" /> হাইওয়ে রাস্তা ({roads.length})
          </button>

          <button
            onClick={() => {
              setTab('upgrades');
              sound.tone(500, 0.04);
            }}
            className={`flex-1 min-w-[140px] min-h-[44px] py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              tab === 'upgrades'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" /> প্রো-টিউনিং
          </button>

          <button
            onClick={() => {
              setTab('neon');
              sound.tone(550, 0.04);
            }}
            className={`flex-1 min-w-[120px] min-h-[44px] py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              tab === 'neon'
                ? 'bg-pink-500/20 text-pink-300 border border-pink-400/60 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" /> নিয়ন গ্লো
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB 1: CARS */}
          {tab === 'cars' && (
            <div className="flex flex-col gap-5">
              {/* Car Carousel Selector */}
              <div className="bg-gradient-to-b from-slate-950 to-[#050a20] border border-cyan-500/30 rounded-3xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={handlePrevCar}
                    className="min-w-[44px] min-h-[44px] p-3 rounded-2xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-400 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Previous Car"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div className="text-center">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[10px] font-mono font-bold mb-1">
                      {Array.from({ length: carStars }).map((_, idx) => (
                        <Star key={idx} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                      <span className="ml-1">5.0 MAX RATING</span>
                    </div>
                    <div className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">
                      {curCar.brand}
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black font-mono text-white tracking-wide">
                      {curCar.name}
                    </h3>
                  </div>

                  <button
                    onClick={handleNextCar}
                    className="min-w-[44px] min-h-[44px] p-3 rounded-2xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-400 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Next Car"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                {/* Car 5-Star Max Spec Gauges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                  <div className="p-3 rounded-2xl bg-black/60 border border-cyan-500/25">
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mb-1">
                      <Gauge className="w-3.5 h-3.5 text-cyan-400" /> টপ স্পিড (MAX)
                    </div>
                    <div className="text-xl font-bold font-mono text-white tabular-nums">
                      {curCar.topSpeed} <span className="text-xs text-cyan-300">KM/H</span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 w-full rounded-full" />
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-black/60 border border-amber-500/25">
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mb-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> অ্যাক্সিলারেশন
                    </div>
                    <div className="text-xl font-bold font-mono text-white tabular-nums">
                      {curCar.accel} <span className="text-xs text-amber-300">/ 100</span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${curCar.accel}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-black/60 border border-pink-500/25">
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mb-1">
                      <Flame className="w-3.5 h-3.5 text-pink-400" /> নাইট্রো বুস্ট
                    </div>
                    <div className="text-xl font-bold font-mono text-white tabular-nums">
                      +{curCar.nitroBoost} <span className="text-xs text-pink-300">KM/H</span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-pink-400 rounded-full"
                        style={{ width: `${Math.min(100, Math.round((curCar.nitroBoost / 170) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-black/60 border border-emerald-500/25">
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mb-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" /> ব্র্যান্ড ক্লাস
                    </div>
                    <div className="text-sm font-bold font-mono text-emerald-300 truncate mt-1">
                      {curCar.brand}
                    </div>
                    <div className="mt-2 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 w-full rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Car Action Button */}
                <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <div className="text-left font-mono">
                    <div className="text-[10px] text-slate-400 uppercase">স্ট্যাটাস / মূল্য</div>
                    <div className="text-xl font-black text-emerald-400 tabular-nums">
                      {curCar.priceTaka === 0 ? 'ফ্রি (৫-স্টার আনলকড)' : `৳ ${curCar.priceTaka.toLocaleString()}`}
                    </div>
                  </div>

                  {curCar.unlocked ? (
                    selectedCarIndex === activeCarIdx ? (
                      <div className="min-h-[44px] px-6 py-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-mono font-bold text-sm flex items-center gap-2">
                        <Check className="w-4 h-4" /> নির্বাচিত (EQUIPPED)
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          onSelectCar(activeCarIdx);
                          sound.tone(600, 0.08);
                        }}
                        className="min-h-[44px] px-6 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(0,234,255,0.4)] transition-colors cursor-pointer"
                      >
                        ড্রাইভ করুন (SELECT)
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => {
                        if (balance >= curCar.priceTaka) {
                          onBuyCar(activeCarIdx);
                          sound.playBuySuccess();
                          triggerConfetti();
                        } else {
                          sound.tone(180, 0.15, 'sawtooth');
                        }
                      }}
                      disabled={balance < curCar.priceTaka}
                      className={`min-h-[44px] px-6 py-2.5 rounded-2xl font-mono font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer ${
                        balance >= curCar.priceTaka
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_25px_rgba(0,230,118,0.5)]'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      {balance >= curCar.priceTaka
                        ? `৳ ${curCar.priceTaka.toLocaleString()} দিয়ে কিনুন`
                        : `আরও ৳ ${(curCar.priceTaka - balance).toLocaleString()} প্রয়োজন`}
                    </button>
                  )}
                </div>
              </div>

              {/* Roster Thumbnail Strip (10 Cars) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 font-mono">
                {cars.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveCarIdx(i);
                      sound.tone(420, 0.03);
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      activeCarIdx === i
                        ? 'bg-cyan-500/20 border-cyan-400'
                        : selectedCarIndex === i
                        ? 'bg-slate-900 border-emerald-500/50'
                        : 'bg-black/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] text-amber-400 mb-1">
                      <span>★★★★★</span>
                      {c.unlocked ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Lock className="w-3 h-3 text-slate-500" />
                      )}
                    </div>
                    <div className="text-xs font-bold text-white truncate">{c.name}</div>
                    <div className="flex items-center justify-between text-[10px] mt-0.5 tabular-nums">
                      <span className="text-cyan-300">{c.topSpeed} KM/H</span>
                      <span className={c.unlocked ? 'text-emerald-400' : 'text-amber-300'}>
                        {c.unlocked ? 'OWNED' : `৳${(c.priceTaka / 1000).toFixed(c.priceTaka % 1000 === 0 ? 0 : 1)}k`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: HIGHWAY ROADS */}
          {tab === 'roads' && (
            <div className="flex flex-col gap-4 font-mono">
              <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-purple-200 font-bold">
                  🛣️ বাস্তবসম্মত হাইওয়ে রাস্তা সিলেক্ট করুন ও ড্রাইভ করুন!
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-200 font-bold tabular-nums">
                  আনলকড: {roads.filter((r) => r.unlocked).length} / {roads.length} রাস্তা
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roads.map((road, idx) => {
                const isSelected = selectedRoadIndex === idx;
                const canAfford = balance >= road.priceTaka;

                return (
                  <div
                    key={road.id}
                    className={`rounded-3xl p-5 border relative overflow-hidden transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-purple-950/60 border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.28)]'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="text-[10px] text-purple-300 uppercase tracking-wider font-bold flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-purple-500/40 text-white">
                            {road.hasMarineDrive ? '🌊 কোস্টাল রুট' : road.hasCurves ? '🛣️ কার্ভড হাইওয়ে' : '⚡ স্ট্রেইট ট্র্যাক'}
                          </span>
                          <span className="text-amber-400">★★★★★</span>
                        </div>
                        <h4 className="text-lg sm:text-xl font-black text-white mt-1.5">{road.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 font-sans">{road.tagline}</p>
                      </div>

                      <div
                        className="w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `#${road.roadColor.toString(16).padStart(6, '0')}`,
                          borderColor: `#${road.lineColorA.toString(16).padStart(6, '0')}`,
                        }}
                      >
                        <MapPin className="w-5 h-5 text-white/90" />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 mt-4">
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase">মূল্য</div>
                        <div className="text-base font-bold text-emerald-400 tabular-nums">
                          {road.priceTaka === 0 ? 'ফ্রি (আনলকড)' : `৳ ${road.priceTaka.toLocaleString()}`}
                        </div>
                      </div>

                      {road.unlocked ? (
                        isSelected ? (
                          <span className="min-h-[44px] px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-400 text-purple-300 font-bold text-xs flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" /> অ্যাক্টিভ রাস্তা
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              onSelectRoad(idx);
                              sound.tone(600, 0.08);
                            }}
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            রাস্তা সিলেক্ট করুন
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => {
                            if (canAfford) {
                              onBuyRoad(idx);
                              sound.playBuySuccess();
                              triggerConfetti();
                            } else {
                              sound.tone(180, 0.15, 'sawtooth');
                            }
                          }}
                          disabled={!canAfford}
                          className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                            canAfford
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          {canAfford ? 'কিনুন ও আনলক করুন' : 'পর্যাপ্ত টাকা নেই'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}

          {/* TAB 3: UPGRADES & TUNING */}
          {tab === 'upgrades' && (
            <div className="flex flex-col gap-4 font-mono">
              <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border border-amber-500/40 rounded-2xl p-4 text-xs text-amber-200">
                ⚡ <span className="font-bold text-amber-400">৫-স্টার প্রো-স্পেক ওভারক্লক:</span> টাইকুন ক্যাশ, ওভারটেক ও মিশন থেকে আয় করে আরও হাই-চ্যালেঞ্জ প্রো-স্পেক আপগ্রেড আনলক করুন!
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    key: 'engineLevel' as keyof GlobalUpgrades,
                    tiers: UPGRADE_TIERS.engine,
                    title: 'টপ স্পিড ইঞ্জিন ওভারক্লক',
                    desc: 'ইঞ্জিন রি-ম্যাপিং করে গাড়ির সর্বোচ্চ স্পিড বাড়ায়।',
                    icon: <Gauge className="w-5 h-5 text-cyan-400" />,
                    border: 'border-cyan-500/30',
                    pill: 'bg-cyan-500/20 text-cyan-300',
                    bar: 'bg-cyan-400',
                    btn: 'bg-cyan-500 hover:bg-cyan-400 text-black',
                  },
                  {
                    key: 'nitroLevel' as keyof GlobalUpgrades,
                    tiers: UPGRADE_TIERS.nitro,
                    title: 'টার্বো নাইট্রো প্লাজমা',
                    desc: 'নাইট্রো দ্রুত রিচার্জ ও বুস্ট স্পিড বাড়াতে সাহায্য করে।',
                    icon: <Flame className="w-5 h-5 text-pink-400" />,
                    border: 'border-pink-500/30',
                    pill: 'bg-pink-500/20 text-pink-300',
                    bar: 'bg-pink-400',
                    btn: 'bg-pink-500 hover:bg-pink-400 text-black',
                  },
                  {
                    key: 'shieldLevel' as keyof GlobalUpgrades,
                    tiers: UPGRADE_TIERS.shield,
                    title: 'হ্যান্ডলিং গ্রিপ ও সাসপেনশন',
                    desc: 'বৃষ্টি ও তুষারে স্কিড কমায় এবং দ্রুত লেন পরিবর্তনে সাহায্য করে।',
                    icon: <Shield className="w-5 h-5 text-blue-400" />,
                    border: 'border-blue-500/30',
                    pill: 'bg-blue-500/20 text-blue-300',
                    bar: 'bg-blue-400',
                    btn: 'bg-blue-500 hover:bg-blue-400 text-black',
                  },
                  {
                    key: 'magnetLevel' as keyof GlobalUpgrades,
                    tiers: UPGRADE_TIERS.magnet,
                    title: 'ক্যাশ ও নাইট্রো ম্যাগনেট',
                    desc: 'রাস্তার দূরের টাকার বান্ডিল ও নাইট্রো সেল দ্রুত টেনে আনে।',
                    icon: <Magnet className="w-5 h-5 text-emerald-400" />,
                    border: 'border-emerald-500/30',
                    pill: 'bg-emerald-500/20 text-emerald-300',
                    bar: 'bg-emerald-400',
                    btn: 'bg-emerald-500 hover:bg-emerald-400 text-black',
                  },
                  {
                    key: 'multiplierLevel' as keyof GlobalUpgrades,
                    tiers: UPGRADE_TIERS.multiplier,
                    title: 'টাইকুন ইনকাম মাল্টিপ্লায়ার (★★★★★)',
                    desc: 'দূরত্ব বোনাস, ওভারটেক ও রোড ক্যাশ আয়ের হার বহুগুণ বাড়ায়!',
                    icon: <TrendingUp className="w-5 h-5 text-amber-400" />,
                    border: 'border-amber-500/30 col-span-1 md:col-span-2',
                    pill: 'bg-amber-500/20 text-amber-300',
                    bar: 'bg-amber-400',
                    btn: 'bg-amber-500 hover:bg-amber-400 text-black',
                  },
                ].map((item) => {
                  const curLvl = upgrades[item.key];
                  const nextTier = item.tiers[curLvl];
                  const maxed = curLvl >= 5;
                  const canAfford = nextTier && balance >= nextTier.cost;

                  return (
                    <div
                      key={item.key}
                      className={`bg-slate-950 border ${item.border} rounded-3xl p-5 flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {item.icon}
                            <h4 className="text-base font-bold text-white">{item.title}</h4>
                          </div>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full ${item.pill} tabular-nums`}>
                            লেভেল {curLvl} / 5 ★
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-sans">{item.desc}</p>

                        <div className="flex items-center gap-1.5 my-3 h-2 bg-slate-900 rounded-full p-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`flex-1 h-full rounded-full ${
                                i < curLvl ? item.bar : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between mt-3">
                        <div>
                          <div className="text-[10px] text-slate-400">
                            {maxed ? 'সর্বোচ্চ ৫-স্টার বুস্ট' : `পরবর্তী: ${nextTier.boost}`}
                          </div>
                          <div className="text-sm font-bold text-emerald-400 tabular-nums">
                            {maxed ? '★★★★★ MAXED' : `৳ ${nextTier.cost.toLocaleString()}`}
                          </div>
                        </div>

                        {!maxed && (
                          <button
                            onClick={() => {
                              if (canAfford) {
                                onUpgrade(item.key);
                                sound.playBuySuccess();
                                triggerConfetti();
                              } else {
                                sound.tone(180, 0.15, 'sawtooth');
                              }
                            }}
                            disabled={!canAfford}
                            className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                              canAfford
                                ? item.btn
                                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5" /> আপগ্রেড
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: NEON UNDERGLOW */}
          {tab === 'neon' && (
            <div className="flex flex-col gap-4 font-mono">
              <p className="text-xs text-slate-400">
                আপনার গাড়ির নিচের ৫-স্টার নিয়ন আন্ডারগ্লো লাইটিং কাস্টমাইজ করুন।
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {underglows.map((item) => {
                  const isEquipped = selectedUnderglow === item.color;
                  const canAfford = balance >= item.price;

                  return (
                    <div
                      key={item.name}
                      className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
                        isEquipped
                          ? 'bg-slate-900 border-cyan-400'
                          : 'bg-black/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-2xl border shadow-lg flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: item.color,
                            borderColor: item.color,
                            boxShadow: `0 0 16px ${item.color}`,
                          }}
                        />
                        <div>
                          <h4 className="text-sm font-bold text-white">{item.name}</h4>
                          <div className="text-[10px] text-emerald-400 tabular-nums">
                            {item.price === 0 ? 'ফ্রি' : `৳ ${item.price.toLocaleString()}`}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
                        {item.unlocked ? (
                          isEquipped ? (
                            <span className="min-h-[40px] px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> ইনস্টলড
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                onSelectUnderglow(item.color);
                                sound.tone(550, 0.05);
                              }}
                              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold cursor-pointer transition-colors"
                            >
                              ইনস্টল করুন
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => {
                              if (canAfford) {
                                onBuyUnderglow(item.color, item.price);
                                sound.playBuySuccess();
                                triggerConfetti();
                              } else {
                                sound.tone(180, 0.15, 'sawtooth');
                              }
                            }}
                            disabled={!canAfford}
                            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                              canAfford
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            }`}
                          >
                            <Lock className="w-3 h-3" />
                            {canAfford ? 'কিনুন' : 'টাকা কম'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
