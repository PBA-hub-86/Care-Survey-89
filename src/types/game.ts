export interface CarConfig {
  id: string;
  name: string;
  brand: string;
  topSpeed: number; // Base KM/H
  accel: number; // 0-100
  nitroBoost: number; // extra KM/H
  maxShields: number;
  bodyColor: number;
  accentColor: number;
  underglow: string;
  priceTaka: number;
  unlocked: boolean;
  upgrades?: {
    speedLevel: number;
    nitroLevel: number;
  };
}

export interface RoadTheme {
  id: string;
  name: string;
  tagline: string;
  priceTaka: number;
  unlocked: boolean;
  roadColor: number;
  lineColorA: number;
  lineColorB: number;
  guardrailColorA: number;
  guardrailColorB: number;
  ambientLight: number;
  dirLightA: number;
  dirLightB: number;
  fogColor: number;
  fogDensity: number;
  skyType: 'daytime' | 'coastal_marine' | 'cyber' | 'midnight_neon' | 'sahara_sunset' | 'magma' | 'space';
  weather?: 'none';
  hasMarineDrive?: boolean;
  hasCurves?: boolean;
}

export type RadioStation = 'highway_fm' | 'synthwave' | 'chillout' | 'off';

export interface RadioState {
  station: RadioStation;
  name: string;
  frequency: string;
  nowPlaying: string;
  trafficBulletin: string;
  isMuted: boolean;
}

export type DynamicWeatherType = 'clear';

export interface WeatherState {
  type: DynamicWeatherType;
  name: string;
  icon: string;
  effectLabel: string;
  gripFactor: number;
  bonusMultiplier: number;
}

export interface GlobalUpgrades {
  engineLevel: number; // Level 1 to 5 (+15 km/h each)
  nitroLevel: number; // Level 1 to 5 (Boost duration & speed)
  shieldLevel: number; // Level 1 to 5 (+1 max shield point)
  magnetLevel: number; // Level 1 to 5 (Pulls money/cash bundles within 5m-18m)
  multiplierLevel: number; // Level 1 to 5 (+20% to +100% cash earnings bonus)
}

export type PowerupType = 'cash_bundle' | 'gold_coin' | 'nitro' | 'shield' | 'magnet' | 'police_escort';

export interface CashMission {
  id: string;
  title: string;
  desc: string;
  target: number;
  progress: number;
  rewardTaka: number;
  type: 'distance' | 'near_miss' | 'cash_collect';
}

export interface GameStats {
  score: number;
  distance: number;
  speed: number;
  maxSpeed: number;
  nitro: number;
  shields: number;
  maxShields: number;
  combo: number;
  comboTimer: number;
  policeActive: boolean;
  policeEscortActive?: boolean;
  policeEscortTimer?: number;
  policeEscortMultiplier?: number;
  nearMisses: number;
  cashCollectedThisRun: number;
  activeMission: CashMission;
  magnetActive?: boolean;
  feverActive?: boolean;
  weather: WeatherState;
  weatherAlert?: { title: string; subtitle: string; icon: string; color: string } | null;
  radio?: RadioState;
  level?: number;
}

export interface RunSummary {
  score: number;
  distance: number;
  maxSpeed: number;
  nearMisses: number;
  cashEarned: number;
  isNewRecord: boolean;
  carName?: string;
}

export interface RunHistoryPoint {
  run: string;
  distanceKm: number;
  avgSpeed: number;
  score: number;
}

export interface DriverProfileStats {
  totalDistance: number; // meters
  totalCrashes: number;
  totalRuns: number;
  speedSum: number;
  history: RunHistoryPoint[];
}
