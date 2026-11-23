import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from './game/GameEngine';
import { CarConfig, RoadTheme, GlobalUpgrades, GameStats, RunSummary, DriverProfileStats } from './types/game';
import {
  INITIAL_CARS,
  INITIAL_ROAD_THEMES,
  INITIAL_UPGRADES,
  UNDERGLOW_PALETTES,
  INITIAL_MISSIONS,
  UPGRADE_TIERS,
} from './data/cars';
import { sound } from './audio/sound';
import { HUD } from './components/HUD';
import { MobileControls } from './components/MobileControls';
import { MainMenu } from './components/MainMenu';
import { ShopModal } from './components/ShopModal';
import { LuckySpinModal } from './components/LuckySpinModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';

import { saveSecure, loadSecure, initAntiCheatGuards } from './utils/security';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Initialize Anti-Cheat guards on mount
  useEffect(() => {
    initAntiCheatGuards();
  }, []);

  // Persistence: Cars (Secured & Tamper-proof)
  const [cars, setCars] = useState<CarConfig[]>(() => {
    return loadSecure<CarConfig[]>('st3d_cars_sec_v5', INITIAL_CARS);
  });

  const [selectedCarIndex, setSelectedCarIndex] = useState<number>(() => {
    const idx = loadSecure<number>('st3d_car_idx_sec_v5', 0);
    return idx >= 0 && idx < INITIAL_CARS.length ? idx : 0;
  });

  // Persistence: Road Themes (Secured)
  const [roads, setRoads] = useState<RoadTheme[]>(() => {
    return loadSecure<RoadTheme[]>('st3d_roads_sec_v5', INITIAL_ROAD_THEMES);
  });

  const [selectedRoadIndex, setSelectedRoadIndex] = useState<number>(() => {
    const idx = loadSecure<number>('st3d_road_idx_sec_v5', 0);
    return idx >= 0 && idx < INITIAL_ROAD_THEMES.length ? idx : 0;
  });

  // Persistence: Global Upgrades (Secured)
  const [upgrades, setUpgrades] = useState<GlobalUpgrades>(() => {
    return loadSecure<GlobalUpgrades>('st3d_upgrades_sec_v5', INITIAL_UPGRADES);
  });

  // Persistence: Neon Underglows (Secured)
  const [underglows, setUnderglows] = useState<typeof UNDERGLOW_PALETTES>(() => {
    return loadSecure<typeof UNDERGLOW_PALETTES>('st3d_underglows_sec_v5', UNDERGLOW_PALETTES);
  });

  const [selectedUnderglow, setSelectedUnderglow] = useState<string>(() => {
    const savedCars = loadSecure<CarConfig[]>('st3d_cars_sec_v5', INITIAL_CARS);
    const savedIdx = loadSecure<number>('st3d_car_idx_sec_v5', 0);
    const idx = savedIdx >= 0 && savedIdx < savedCars.length ? savedIdx : 0;
    return savedCars[idx]?.underglow || INITIAL_CARS[0].underglow;
  });

  // Persistence: In-Game Wallet Balance (Secured against browser console hacking)
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    return loadSecure<number>('st3d_wallet_sec_v5', 3000); // ৳3,000 Starter Cash!
  });

  const [highScore, setHighScore] = useState<number>(() => {
    return loadSecure<number>('st3d_best_sec_v5', 0);
  });

  const [profileStats, setProfileStats] = useState<DriverProfileStats>(() => {
    return loadSecure<DriverProfileStats>('st3d_profile_sec_v5', {
      totalDistance: 0,
      totalCrashes: 0,
      totalRuns: 0,
      speedSum: 0,
      history: [],
    });
  });

  // UI Flow State
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
  const [showShop, setShowShop] = useState<boolean>(false);
  const [shopTab, setShopTab] = useState<'cars' | 'roads' | 'upgrades' | 'neon'>('cars');
  const [showLuckySpin, setShowLuckySpin] = useState<boolean>(false);
  const [freeSpinAvailable, setFreeSpinAvailable] = useState<boolean>(true);
  const [, setRunCount] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  // Refs for fresh state inside long-lived GameEngine callbacks
  const highScoreRef = useRef(highScore);
  const carsRef = useRef(cars);
  const selectedCarIndexRef = useRef(selectedCarIndex);
  const didMountCarRef = useRef(false);
  const didMountRoadRef = useRef(false);
  const didMountUpgradesRef = useRef(false);

  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  useEffect(() => {
    carsRef.current = cars;
  }, [cars]);

  useEffect(() => {
    selectedCarIndexRef.current = selectedCarIndex;
    const currentCar = cars[selectedCarIndex];
    if (currentCar) {
      setSelectedUnderglow(currentCar.underglow);
    }
  }, [selectedCarIndex, cars]);

  // In-Game Stats
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    distance: 0,
    speed: 140,
    maxSpeed: 140,
    nitro: 100,
    shields: 0,
    maxShields: 0,
    combo: 1,
    comboTimer: 0,
    policeActive: false,
    nearMisses: 0,
    cashCollectedThisRun: 0,
    activeMission: INITIAL_MISSIONS[0],
    magnetActive: false,
    level: 1,
    radio: sound.getRadioState(),
    weather: {
      type: 'clear',
      name: 'পরিষ্কার আকাশ',
      icon: '☀️',
      effectLabel: 'আদর্শ গ্রিপ ও দৃশ্যমানতা (100%)',
      gripFactor: 1.0,
      bonusMultiplier: 1.0,
    },
    weatherAlert: null,
  });

  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);

  // Encrypted Persistence Saves
  useEffect(() => {
    saveSecure('st3d_cars_sec_v5', cars);
  }, [cars]);

  useEffect(() => {
    saveSecure('st3d_roads_sec_v5', roads);
  }, [roads]);

  useEffect(() => {
    saveSecure('st3d_upgrades_sec_v5', upgrades);
  }, [upgrades]);

  useEffect(() => {
    saveSecure('st3d_underglows_sec_v5', underglows);
  }, [underglows]);

  useEffect(() => {
    saveSecure('st3d_wallet_sec_v5', walletBalance);
  }, [walletBalance]);

  useEffect(() => {
    saveSecure('st3d_car_idx_sec_v5', selectedCarIndex);
  }, [selectedCarIndex]);

  useEffect(() => {
    saveSecure('st3d_road_idx_sec_v5', selectedRoadIndex);
  }, [selectedRoadIndex]);

  useEffect(() => {
    saveSecure('st3d_best_sec_v5', highScore);
  }, [highScore]);

  useEffect(() => {
    saveSecure('st3d_profile_sec_v5', profileStats);
  }, [profileStats]);

  // Initialize GameEngine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(
      canvasRef.current,
      carsRef.current[selectedCarIndexRef.current],
      roads[selectedRoadIndex],
      upgrades,
      {
        onStatsUpdate: (newStats) => {
          setStats(newStats);
        },
        onCrash: () => {
          const finalScore = Math.floor(engine.score);
          const finalDistance = Math.floor(engine.distance);
          const finalSpeed = Math.floor(engine.maxSpeedAchieved);
          const earnedThisRun = engine.cashCollectedThisRun;

          // Credit earned cash to in-game wallet
          setWalletBalance((prev) => prev + earnedThisRun);

          let isNew = false;
          if (finalScore > highScoreRef.current) {
            isNew = true;
            highScoreRef.current = finalScore;
            setHighScore(finalScore);
          }

          // Update Lifetime Driver Profile Stats
          setProfileStats((prev) => {
            const nextRuns = prev.totalRuns + 1;
            const nextHistory = [
              ...prev.history,
              {
                run: `#${nextRuns}`,
                distanceKm: Number((finalDistance / 1000).toFixed(2)),
                avgSpeed: finalSpeed,
                score: finalScore,
              },
            ].slice(-12);

            return {
              totalDistance: prev.totalDistance + finalDistance,
              totalCrashes: prev.totalCrashes + 1,
              totalRuns: nextRuns,
              speedSum: prev.speedSum + finalSpeed,
              history: nextHistory,
            };
          });

          setRunSummary({
            score: finalScore,
            distance: finalDistance,
            maxSpeed: finalSpeed,
            nearMisses: engine.nearMisses,
            cashEarned: earnedThisRun,
            isNewRecord: isNew,
            carName: carsRef.current[selectedCarIndexRef.current]?.name || 'Supercar',
          });

          // Check free spin reward
          setRunCount((prev) => {
            const next = prev + 1;
            if (next % 3 === 0) setFreeSpinAvailable(true);
            return next;
          });

          setGameState('gameover');
        },
        onCashCollected: () => {},
        onNearMissOvertake: () => {},
        onMissionComplete: () => {},
      }
    );

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Sync selected car with engine
  useEffect(() => {
    if (!didMountCarRef.current) {
      didMountCarRef.current = true;
      return;
    }
    if (engineRef.current && cars[selectedCarIndex]) {
      engineRef.current.updateCar(cars[selectedCarIndex]);
    }
  }, [cars, selectedCarIndex]);

  // Sync road theme with engine
  useEffect(() => {
    if (!didMountRoadRef.current) {
      didMountRoadRef.current = true;
      return;
    }
    if (engineRef.current && roads[selectedRoadIndex]) {
      engineRef.current.updateTheme(roads[selectedRoadIndex]);
    }
  }, [roads, selectedRoadIndex]);

  // Sync upgrades with engine
  useEffect(() => {
    if (!didMountUpgradesRef.current) {
      didMountUpgradesRef.current = true;
      return;
    }
    if (engineRef.current) {
      engineRef.current.updateUpgrades(upgrades);
    }
  }, [upgrades]);

  // Touch Drag / Swipe for Lane Steering
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!engineRef.current || !engineRef.current.isRunning || engineRef.current.isPaused) return;
      if (e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;

        if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) {
            engineRef.current.moveLeft();
          } else {
            engineRef.current.moveRight();
          }
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Action handlers
  const handleStartGame = () => {
    sound.init();
    setShowShop(false);
    setShowLuckySpin(false);
    setIsReplaying(false);
    if (engineRef.current) {
      engineRef.current.start();
    }
    setGameState('playing');
  };

  const handlePause = () => {
    if (engineRef.current && engineRef.current.isRunning) {
      engineRef.current.togglePause();
      setGameState(engineRef.current.isPaused ? 'paused' : 'playing');
    }
  };

  const handleResume = () => {
    if (engineRef.current && engineRef.current.isPaused) {
      engineRef.current.togglePause();
      setGameState('playing');
    }
  };

  const handleHome = () => {
    setIsReplaying(false);
    if (engineRef.current) {
      engineRef.current.stop();
    }
    setGameState('menu');
  };

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleWatchReplay = () => {
    if (!engineRef.current) return;
    setIsReplaying(true);
    engineRef.current.playCinematicReplay(() => {
      setIsReplaying(false);
    });
  };

  const handleCycleWeather = () => {
    if (!engineRef.current) return;
    const presets: Array<'clear' | 'rain' | 'fog' | 'neon_snow'> = ['clear', 'rain', 'fog', 'neon_snow'];
    const curIdx = presets.indexOf(engineRef.current.currentWeatherType);
    const nextType = presets[(curIdx + 1) % presets.length];
    engineRef.current.setWeather(nextType);
  };

  // --- SHOP ACTIONS ---
  const handleSelectCar = (index: number) => {
    setSelectedCarIndex(index);
    if (engineRef.current) {
      engineRef.current.updateCar(cars[index]);
    }
  };

  const handleBuyCar = (index: number) => {
    const target = cars[index];
    if (walletBalance >= target.priceTaka && !target.unlocked) {
      setWalletBalance((prev) => prev - target.priceTaka);
      setCars((prev) =>
        prev.map((c, i) => (i === index ? { ...c, unlocked: true } : c))
      );
      setSelectedCarIndex(index);
      if (engineRef.current) {
        engineRef.current.updateCar({ ...target, unlocked: true });
      }
    }
  };

  const handleSelectRoad = (index: number) => {
    setSelectedRoadIndex(index);
    if (engineRef.current) {
      engineRef.current.updateTheme(roads[index]);
    }
  };

  const handleBuyRoad = (index: number) => {
    const target = roads[index];
    if (walletBalance >= target.priceTaka && !target.unlocked) {
      setWalletBalance((prev) => prev - target.priceTaka);
      setRoads((prev) =>
        prev.map((r, i) => (i === index ? { ...r, unlocked: true } : r))
      );
      setSelectedRoadIndex(index);
      if (engineRef.current) {
        engineRef.current.updateTheme({ ...target, unlocked: true });
      }
    }
  };

  const handleUpgrade = (type: keyof GlobalUpgrades) => {
    const curLevel = upgrades[type];
    if (curLevel >= 5) return;

    let tierGroup: Array<{ level: number; cost: number }>;
    if (type === 'engineLevel') tierGroup = UPGRADE_TIERS.engine;
    else if (type === 'nitroLevel') tierGroup = UPGRADE_TIERS.nitro;
    else if (type === 'shieldLevel') tierGroup = UPGRADE_TIERS.shield;
    else if (type === 'magnetLevel') tierGroup = UPGRADE_TIERS.magnet;
    else tierGroup = UPGRADE_TIERS.multiplier;

    const nextTier = tierGroup[curLevel];
    if (nextTier && walletBalance >= nextTier.cost) {
      setWalletBalance((prev) => prev - nextTier.cost);
      setUpgrades((prev) => {
        const next = { ...prev, [type]: curLevel + 1 };
        if (engineRef.current) engineRef.current.updateUpgrades(next);
        return next;
      });
    }
  };

  const handleSelectUnderglow = (color: string) => {
    setSelectedUnderglow(color);
    setCars((prev) =>
      prev.map((c, i) => (i === selectedCarIndex ? { ...c, underglow: color } : c))
    );
    if (engineRef.current) {
      engineRef.current.updateUnderglow(color);
    }
  };

  const handleBuyUnderglow = (color: string, price: number) => {
    if (walletBalance >= price) {
      setWalletBalance((prev) => prev - price);
      setUnderglows((prev) =>
        prev.map((u) => (u.color === color ? { ...u, unlocked: true } : u))
      );
      handleSelectUnderglow(color);
    }
  };

  // Lucky Spin Reward
  const handleLuckyReward = (rewardTaka: number, _message: string, costPaid = 0) => {
    setWalletBalance((prev) => Math.max(0, prev - costPaid + rewardTaka));
    setFreeSpinAvailable(false);
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#02050f] font-sans">
      {/* 3D Highway Canvas */}
      <canvas
        ref={canvasRef}
        id="game-canvas"
        className="fixed inset-0 w-full h-full block z-0"
      />

      {/* Retro Cyberpunk Scanlines */}
      <div className="fixed inset-0 pointer-events-none z-10 opacity-20 bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px]" />

      {/* In-Game HUD & Mobile Touch Controls */}
      {gameState === 'playing' && (
        <>
          <HUD
            stats={stats}
            isMuted={isMuted}
            onToggleSound={handleToggleSound}
            onPause={handlePause}
            onCycleRadio={() => sound.cycleRadioStation()}
          />
          <MobileControls
            onMoveLeft={() => engineRef.current?.moveLeft()}
            onMoveRight={() => engineRef.current?.moveRight()}
            onSetBoost={(b) => engineRef.current?.setBoost(b)}
          />
        </>
      )}

      {/* Main Start Menu */}
      {gameState === 'menu' && !showShop && !showLuckySpin && (
        <MainMenu
          selectedCar={cars[selectedCarIndex]}
          selectedRoad={roads[selectedRoadIndex]}
          upgrades={upgrades}
          walletBalance={walletBalance}
          highScore={highScore}
          profileStats={profileStats}
          isMuted={isMuted}
          freeSpinAvailable={freeSpinAvailable}
          onStartGame={handleStartGame}
          onOpenShop={(tab = 'cars') => {
            setShopTab(tab);
            setShowShop(true);
          }}
          onOpenLuckySpin={() => setShowLuckySpin(true)}
          onToggleSound={handleToggleSound}
        />
      )}

      {/* In-Game Mega Shop Modal (Cars, Roads, Upgrades, Neon) */}
      {showShop && (
        <ShopModal
          balance={walletBalance}
          cars={cars}
          selectedCarIndex={selectedCarIndex}
          onSelectCar={handleSelectCar}
          onBuyCar={handleBuyCar}
          roads={roads}
          selectedRoadIndex={selectedRoadIndex}
          onSelectRoad={handleSelectRoad}
          onBuyRoad={handleBuyRoad}
          upgrades={upgrades}
          onUpgrade={handleUpgrade}
          underglows={underglows}
          selectedUnderglow={selectedUnderglow}
          onSelectUnderglow={handleSelectUnderglow}
          onBuyUnderglow={handleBuyUnderglow}
          defaultTab={shopTab}
          onClose={() => setShowShop(false)}
        />
      )}

      {/* Lucky Spin Wheel Modal */}
      {showLuckySpin && (
        <LuckySpinModal
          balance={walletBalance}
          freeSpinAvailable={freeSpinAvailable}
          onReward={handleLuckyReward}
          onClose={() => setShowLuckySpin(false)}
        />
      )}

      {/* Pause Screen with Dynamic Environment Weather Preset Toggle */}
      {gameState === 'paused' && (
        <PauseModal
          currentWeather={stats.weather.type}
          onCycleWeather={handleCycleWeather}
          onResume={handleResume}
          onHome={handleHome}
        />
      )}

      {/* Cinematic 3D Replay Overlay */}
      {isReplaying && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/85 border border-cyan-400 text-white font-mono text-xs font-bold flex items-center gap-2.5 shadow-[0_0_25px_rgba(0,234,255,0.6)]">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span>🎬 ৩ডি সিনেমাটিক রিপ্লে চলছে...</span>
          <button
            onClick={() => {
              engineRef.current?.stopReplay();
              setIsReplaying(false);
            }}
            className="ml-2 text-cyan-300 hover:text-white underline cursor-pointer"
          >
            বন্ধ করুন (Exit)
          </button>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && runSummary && !isReplaying && (
        <GameOverModal
          summary={runSummary}
          walletBalance={walletBalance}
          onRestart={handleStartGame}
          onWatchReplay={handleWatchReplay}
          onOpenShop={() => {
            setShopTab('cars');
            setShowShop(true);
          }}
          onGoHome={handleHome}
        />
      )}
    </div>
  );
}
