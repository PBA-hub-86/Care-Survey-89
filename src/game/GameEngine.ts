import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CarConfig, GameStats, CashMission, RoadTheme, GlobalUpgrades, DynamicWeatherType, WeatherState } from '../types/game';
import { sound } from '../audio/sound';
import { INITIAL_MISSIONS, INITIAL_ROAD_THEMES, INITIAL_UPGRADES } from '../data/cars';
import { PedestrianManager } from './Pedestrians';
import { HighwayVehicles } from './HighwayVehicles';
import {
  createHighwayRoadTextureSet,
  createFlyoverTextureSet,
  createTerrainTextureSet,
  createContactShadowTexture,
  createHeadlightBeamTexture,
  RoadTextureBundle,
  TerrainTextureBundle,
} from './RoadTextures';

interface TrafficCar {
  group: THREE.Group;
  lane: number;
  currentX: number;
  targetLane: number;
  laneChangeTimer: number;
  speed: number;
  isPolice: boolean;
  policeLights?: { r: THREE.PointLight; b: THREE.PointLight };
  passed: boolean;
  cycle: number;
  width: number;
  length: number;
  vehicleType?: 'bus' | 'truck' | 'police' | 'car' | 'suv';
}

interface CashPickup {
  group: THREE.Group;
  type: 'nitro' | 'cash_bundle';
  lane: number;
  z: number;
  value: number;
  active: boolean;
  magnetSoundPlayed?: boolean;
}

interface Debris {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private envRenderTarget: THREE.WebGLRenderTarget | null = null;
  private maxAnisotropy = 4;
  private clock: THREE.Clock;
  private reqId: number | null = null;

  // Active Car, Theme & Upgrades
  private activeCar: CarConfig;
  private currentTheme: RoadTheme;
  private upgrades: GlobalUpgrades;

  // Visual Groups
  private playerGroup: THREE.Group | null = null;
  private playerWheels: THREE.Group[] = [];
  private headlightPoolMesh: THREE.Mesh | null = null;
  private contactShadowTex: THREE.CanvasTexture | null = null;
  private headlightBeamTex: THREE.CanvasTexture | null = null;
  private leftExhaust: THREE.Mesh | null = null;
  private rightExhaust: THREE.Mesh | null = null;
  private underglowLight: THREE.PointLight | null = null;

  // Animated Windshield Wipers
  private leftWiper: THREE.Mesh | null = null;
  private rightWiper: THREE.Mesh | null = null;
  private wiperAngle = 0;

  // Pedestrian Sidewalk & Walking Manager
  private pedestrianManager: PedestrianManager;

  // Environment Meshes & Procedural PBR Textures
  private roadMesh: THREE.Mesh | null = null;
  private groundMesh: THREE.Mesh | null = null;
  private roadTexBundle: RoadTextureBundle | null = null;
  private flyoverTexBundle: RoadTextureBundle | null = null;
  private terrainTexBundle: TerrainTextureBundle | null = null;
  private roadLines: THREE.Group[] = [];
  private guardrails: THREE.Group[] = [];
  private streetLamps: THREE.Group[] = [];
  private buildings: THREE.Group[] = [];
  private roadsideTrees: THREE.Group[] = [];
  private cloudsGroup: THREE.Group | null = null;
  private skyMesh: THREE.Mesh | null = null;
  private sunMesh: THREE.Mesh | null = null;
  private sunGlowMesh: THREE.Mesh | null = null;
  private stars: THREE.Points | null = null;
  private weatherParticles: THREE.Points | null = null;
  private weatherPositions: Float32Array | null = null;

  // High-Speed Elevated Transit Viaduct & Highway Gantry Signboards
  private metroRailPillars: THREE.Group[] = [];
  private metroTrain: THREE.Group | null = null;
  private overheadSignboards: THREE.Group[] = [];

  // Coastal Highway Scenery & Ocean (Branch Route B)
  private marineDriveObjects: THREE.Group[] = [];
  private oceanMesh: THREE.Mesh | null = null;
  private oceanTime = 0;
  private rainPuddles: THREE.Mesh[] = [];
  private radioNewsTimer = 0;

  // Secondary Elevated Flyover Road & Moving Traffic
  private secondaryRoadMesh: THREE.Mesh | null = null;
  private secondaryRoadPillars: THREE.Group[] = [];
  private secondaryGuardrails: THREE.Group[] = [];
  private secondaryRoadLines: THREE.Mesh[] = [];
  private secondaryTraffic: Array<{
    group: THREE.Group;
    baseX: number;
    y: number;
    lane: number;
    z: number;
    speed: number;
    direction: 1 | -1;
  }> = [];

  // Overpass Crossing Bridges
  private overpassBridges: THREE.Group[] = [];
  private overpassTraffic: Array<{
    group: THREE.Group;
    x: number;
    baseZ: number;
    y: number;
    speed: number;
    direction: 1 | -1;
  }> = [];

  // Localized Spatial Audio & Street Traffic Horns
  private trafficHornTimer = 2.5;
  private spatialAudioTimer = 0;

  // Dynamic Weather Engine
  public currentWeatherType: DynamicWeatherType = 'clear';
  private weatherTimer = 0;
  private weatherDuration = 0;
  private nextWeatherInterval = 20;
  private lightningTimer = 0;
  private weatherAlert: { title: string; subtitle: string; icon: string; color: string } | null = null;
  private weatherAlertTimer = 0;
  private targetFogDensity: number = 0.0028;
  private targetFogColor: THREE.Color = new THREE.Color(0x87ceeb);
  private targetAmbientColor: THREE.Color = new THREE.Color(0xffffff);
  private targetAmbientIntensity: number = 1.1;

  // Lights
  private ambientLight: THREE.AmbientLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;
  private dirLightA: THREE.DirectionalLight | null = null;
  private dirLightB: THREE.DirectionalLight | null = null;

  // Gameplay State
  public isRunning = false;
  public isPaused = false;
  public isBoosting = false;

  private lane = 0; // -2, -1, 0, 1, 2
  private targetX = 0;
  private readonly laneWidth = 3.2;

  // Metrics
  public score = 0;
  public distance = 0;
  public speed = 115;
  public maxSpeedAchieved = 115;
  public nitro = 100;
  public shields = 0;
  public maxShields = 0;
  public combo = 1;
  public comboTimer = 0;
  public nearMisses = 0;
  public cashCollectedThisRun = 0;
  private currentFov = 65;

  // Police & Spawns
  public policeActive = false;
  private policeTimer = 0;
  private spawnTimer = 0;
  private pickupTimer = 0;
  private cameraShake = 0;
  private invulnerableTimer = 0;
  private lastCashDistanceChunk = 0;
  private crashTimeoutId: number | null = null;
  private lightningTimeouts: number[] = [];

  // Mission
  public activeMissionIndex = 0;
  public missions: CashMission[] = INITIAL_MISSIONS.map((m) => ({ ...m }));

  // Entities
  private traffic: TrafficCar[] = [];
  private pickups: CashPickup[] = [];
  private debrisList: Debris[] = [];

  // Callbacks
  private onStatsUpdate: (stats: GameStats) => void;
  private onCrash: () => void;
  private onCashCollected: (amount: number, label: string) => void;
  private onNearMissOvertake: (combo: number, bonusTaka: number, label?: string) => void;
  private onMissionComplete: (mission: CashMission) => void;

  constructor(
    canvas: HTMLCanvasElement,
    car: CarConfig,
    theme: RoadTheme = INITIAL_ROAD_THEMES[0],
    upgrades: GlobalUpgrades = INITIAL_UPGRADES,
    callbacks: {
      onStatsUpdate: (stats: GameStats) => void;
      onCrash: () => void;
      onCashCollected: (amount: number, label: string) => void;
      onNearMissOvertake: (combo: number, bonusTaka: number, label?: string) => void;
      onMissionComplete: (mission: CashMission) => void;
    }
  ) {
    this.canvas = canvas;
    this.activeCar = car;
    this.currentTheme = theme;
    this.upgrades = upgrades;

    this.maxShields = 0;
    this.shields = 0;

    this.onStatsUpdate = callbacks.onStatsUpdate;
    this.onCrash = callbacks.onCrash;
    this.onCashCollected = callbacks.onCashCollected;
    this.onNearMissOvertake = callbacks.onNearMissOvertake;
    this.onMissionComplete = callbacks.onMissionComplete;

    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.pedestrianManager = new PedestrianManager(this.scene);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1500);
    this.camera.position.set(0, 4.8, 9.8);
    this.camera.rotation.x = -0.22;

    // Probe renderer capabilities (avoid costly MSAA on software GL)
    let isSoftwareGl = false;
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
      const rendererStr = dbg && gl ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
      isSoftwareGl = /SwiftShader|llvmpipe|Software/i.test(rendererStr);
    } catch {}

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.maxAnisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy() || 4);

    // Procedural Studio/Sky IBL reflections for metallic vehicles & wet asphalt
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.envRenderTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
      this.scene.environment = this.envRenderTarget.texture;
      this.scene.environmentIntensity = 0.72;
      pmrem.dispose();
    } catch {}

    this.contactShadowTex = createContactShadowTexture();
    this.headlightBeamTex = createHeadlightBeamTexture();

    this.setupLighting();
    this.applyTheme();
    this.buildPlayerCar();

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.onContextRestored);

    this.animate();
  }

  private disposeObject(obj: THREE.Object3D) {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (!m) return;
          const std = m as THREE.MeshStandardMaterial;
          // Dispose canvas maps attached to standalone signage/billboards while preserving shared road/car textures
          if (
            std.map &&
            std.map !== this.roadTexBundle?.map &&
            std.map !== this.flyoverTexBundle?.map &&
            std.map !== this.terrainTexBundle?.map &&
            std.map !== this.contactShadowTex &&
            std.map !== this.headlightBeamTex
          ) {
            std.map.dispose();
          }
          m.dispose();
        });
      }
    });
    this.scene.remove(obj);
  }

  public updateCar(newCar: CarConfig) {
    this.activeCar = newCar;
    this.maxShields = 0;
    this.shields = 0;
    this.buildPlayerCar();
  }

  public updateTheme(newTheme: RoadTheme) {
    this.currentTheme = newTheme;
    this.applyTheme();
  }

  public updateUpgrades(newUpgrades: GlobalUpgrades) {
    this.upgrades = newUpgrades;
    this.maxShields = 0;
    this.shields = 0;
  }

  public updateUnderglow(colorHex: string) {
    this.activeCar.underglow = colorHex;
    if (this.underglowLight) {
      this.underglowLight.color.set(colorHex);
    }
  }

  private setupLighting() {
    this.ambientLight = new THREE.AmbientLight(this.currentTheme.ambientLight, 0.9);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.65);
    this.scene.add(this.hemiLight);

    this.dirLightA = new THREE.DirectionalLight(this.currentTheme.dirLightA, 1.55);
    this.dirLightA.position.set(60, 95, -80);
    this.scene.add(this.dirLightA);

    this.dirLightB = new THREE.DirectionalLight(this.currentTheme.dirLightB, 1.05);
    this.dirLightB.position.set(-60, 70, -60);
    this.scene.add(this.dirLightB);
  }

  private applyTheme() {
    this.scene.background = new THREE.Color(this.currentTheme.fogColor);
    this.scene.fog = new THREE.FogExp2(this.currentTheme.fogColor, this.currentTheme.fogDensity);

    const isDayLike =
      this.currentTheme.skyType === 'daytime' ||
      this.currentTheme.skyType === 'coastal_marine';

    if (this.ambientLight) {
      this.ambientLight.color.setHex(this.currentTheme.ambientLight);
      this.ambientLight.intensity = isDayLike ? 0.95 : 0.75;
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(this.currentTheme.dirLightA);
      this.hemiLight.groundColor.setHex(this.currentTheme.roadColor);
      this.hemiLight.intensity = isDayLike ? 0.8 : 0.45;
    }
    if (this.dirLightA) {
      this.dirLightA.color.setHex(this.currentTheme.dirLightA);
      this.dirLightA.intensity = isDayLike ? 1.6 : 1.3;
    }
    if (this.dirLightB) {
      this.dirLightB.color.setHex(this.currentTheme.dirLightB);
    }

    this.buildRoad();
    this.updateWeatherTargets();
    this.buildSky();
    this.buildWeatherParticles();
    this.buildCity();
    this.buildHighwaySkyTrain();
    this.buildHighwaySignboards();
    this.buildCoastalHighway();
    this.buildSecondaryFlyoverRoad(1500);
    this.buildOverpassBridges();
  }

  private buildSky() {
    if (this.stars) {
      this.disposeObject(this.stars);
      this.stars = null;
    }
    if (this.skyMesh) {
      this.disposeObject(this.skyMesh);
      this.skyMesh = null;
    }
    if (this.sunMesh) {
      this.disposeObject(this.sunMesh);
      this.sunMesh = null;
    }
    if (this.sunGlowMesh) {
      this.disposeObject(this.sunGlowMesh);
      this.sunGlowMesh = null;
    }
    if (this.cloudsGroup) {
      this.disposeObject(this.cloudsGroup);
      this.cloudsGroup = null;
    }

    const isDaytime =
      this.currentTheme.skyType === 'daytime' ||
      this.currentTheme.skyType === 'coastal_marine';

    if (isDaytime) {
      // 1. Realistic Clear Daytime Gradient Sky Dome
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0, '#1a73e8'); // Deep blue top
        grad.addColorStop(0.45, '#56a5fc'); // Sky blue
        grad.addColorStop(0.8, '#a0cfff'); // Light horizon blue
        grad.addColorStop(1, '#e3f2fd'); // Soft horizon haze
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
      }
      const skyTex = new THREE.CanvasTexture(canvas);
      skyTex.colorSpace = THREE.SRGBColorSpace;
      const skyGeo = new THREE.SphereGeometry(750, 32, 16);
      const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
      this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
      this.scene.add(this.skyMesh);

      // 2. Realistic Radiant Sun with Lens Flare Disc
      const sunGeo = new THREE.CircleGeometry(42, 32);
      const sunMat = new THREE.MeshBasicMaterial({
        color: 0xfffbe6,
        transparent: true,
        opacity: 0.95,
      });
      this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
      this.sunMesh.position.set(110, 160, -560);
      this.scene.add(this.sunMesh);

      // Outer Sun Glow Disc (tracked for cleanup)
      const glowGeo = new THREE.CircleGeometry(85, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xffea88,
        transparent: true,
        opacity: 0.28,
      });
      this.sunGlowMesh = new THREE.Mesh(glowGeo, glowMat);
      this.sunGlowMesh.position.set(110, 160, -562);
      this.scene.add(this.sunGlowMesh);

      // 3. Volumetric Fluffy White Clouds Group
      this.cloudsGroup = new THREE.Group();
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        transparent: true,
        opacity: 0.88,
      });

      for (let c = 0; c < 16; c++) {
        const cloud = new THREE.Group();
        const numPuffs = 5 + Math.floor(Math.random() * 4);
        for (let p = 0; p < numPuffs; p++) {
          const r = 10 + Math.random() * 12;
          const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), cloudMat);
          puff.position.set(
            (p - numPuffs / 2) * 14 + (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 10
          );
          cloud.add(puff);
        }
        cloud.position.set(
          (Math.random() - 0.5) * 600,
          90 + Math.random() * 80,
          -200 - Math.random() * 500
        );
        this.cloudsGroup.add(cloud);
      }
      this.scene.add(this.cloudsGroup);

    } else {
      // Night / Sci-Fi / Retro Sun
      const starCount = 1200;
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(starCount * 3);

      for (let i = 0; i < starCount * 3; i += 3) {
        pos[i] = (Math.random() - 0.5) * 1000;
        pos[i + 1] = 20 + Math.random() * 300;
        pos[i + 2] = -150 - Math.random() * 1100;
      }

      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.stars = new THREE.Points(
        geom,
        new THREE.PointsMaterial({ color: 0x8ceeff, size: 0.75, transparent: true, opacity: 0.8 })
      );
      this.scene.add(this.stars);

      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0, '#c2f9ff');
        grad.addColorStop(0.3, '#00eaff');
        grad.addColorStop(0.65, '#9d4edd');
        grad.addColorStop(1, '#ff0077');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1024, 512);

        for (let y = 260; y < 512; y += 18) {
          ctx.fillStyle = 'rgba(2, 5, 15, 0.85)';
          ctx.fillRect(0, y, 1024, 7);
        }
      }

      const moonTex = new THREE.CanvasTexture(canvas);
      moonTex.colorSpace = THREE.SRGBColorSpace;
      this.sunMesh = new THREE.Mesh(
        new THREE.CircleGeometry(110, 64),
        new THREE.MeshBasicMaterial({ map: moonTex, transparent: true, opacity: 0.95 })
      );
      this.sunMesh.position.set(0, 65, -550);
      this.scene.add(this.sunMesh);
    }
  }

  private updateWeatherTargets() {
    const isRainTheme = this.currentTheme.weather === 'rain';
    const isDayLike =
      this.currentTheme.skyType === 'daytime' ||
      this.currentTheme.skyType === 'coastal_marine';

    if (this.currentWeatherType === 'rain') {
      this.targetFogDensity = 0.0088;
      this.targetFogColor.setHex(0x334155);
      this.targetAmbientColor.setHex(0x64748b);
      this.targetAmbientIntensity = 0.72;
      this.scene.environmentIntensity = 0.95;
      if (this.roadMesh) {
        const mat = this.roadMesh.material as THREE.MeshStandardMaterial;
        mat.roughness = 0.28; // Wet glistening puddles via roughnessMap
        mat.metalness = 0.25;
      }
      if (this.secondaryRoadMesh) {
        const mat = this.secondaryRoadMesh.material as THREE.MeshStandardMaterial;
        mat.roughness = 0.32;
        mat.metalness = 0.22;
      }
    } else if (this.currentWeatherType === 'fog') {
      this.targetFogDensity = 0.0175; // Thick cinematic fog reducing visibility
      this.targetFogColor.setHex(0xcfd8dc);
      this.targetAmbientColor.setHex(0xb0bec5);
      this.targetAmbientIntensity = 0.95;
      this.scene.environmentIntensity = 0.55;
      if (this.roadMesh) {
        const mat = this.roadMesh.material as THREE.MeshStandardMaterial;
        mat.roughness = 0.72;
        mat.metalness = 0.1;
      }
      if (this.secondaryRoadMesh) {
        const mat = this.secondaryRoadMesh.material as THREE.MeshStandardMaterial;
        mat.roughness = 0.75;
        mat.metalness = 0.1;
      }
    } else if (this.currentWeatherType === 'neon_snow') {
      this.targetFogDensity = 0.0092;
      this.targetFogColor.setHex(0x180b2b);
      this.targetAmbientColor.setHex(0xa855f7);
      this.targetAmbientIntensity = 1.05;
      this.scene.environmentIntensity = 0.85;
      if (this.roadMesh) {
        const mat = this.roadMesh.material as THREE.MeshStandardMaterial;
        mat.roughness = 0.36;
        mat.metalness = 0.22;
      }
      if (this.secondaryRoadMesh) {
        const mat = this.secondaryRoadMesh.material as THREE.MeshStandardMaterial;
        mat.roughness = 0.4;
        mat.metalness = 0.2;
      }
    } else {
      // Clear sky
      this.targetFogDensity = this.currentTheme.fogDensity;
      this.targetFogColor.setHex(this.currentTheme.fogColor);
      this.targetAmbientColor.setHex(this.currentTheme.ambientLight);
      this.targetAmbientIntensity = isDayLike ? 0.95 : 0.75;
      this.scene.environmentIntensity = isRainTheme ? 0.92 : isDayLike ? 0.74 : 0.58;
      if (this.roadMesh) {
        const mat = this.roadMesh.material as THREE.MeshStandardMaterial;
        mat.roughness = isRainTheme ? 0.32 : 0.86;
        mat.metalness = isRainTheme ? 0.22 : 0.08;
      }
      if (this.secondaryRoadMesh) {
        const mat = this.secondaryRoadMesh.material as THREE.MeshStandardMaterial;
        mat.roughness = isRainTheme ? 0.36 : 0.88;
        mat.metalness = isRainTheme ? 0.2 : 0.06;
      }
    }
  }

  public setWeather(type: DynamicWeatherType) {
    if (this.currentWeatherType === type) return;
    this.currentWeatherType = type;

    this.updateWeatherTargets();
    this.buildWeatherParticles();
    sound.playWeatherAlert(type);

    if (type === 'rain') {
      this.weatherAlert = {
        title: '🌧️ প্রবল বৃষ্টিপাত শুরু!',
        subtitle: 'রাস্তা পিচ্ছিল (-22% গ্রিপ) | স্কোর বোনাস +25%',
        icon: '🌧️',
        color: 'from-blue-600/90 to-cyan-700/90',
      };
    } else if (type === 'fog') {
      this.weatherAlert = {
        title: '🌫️ ঘন কুয়াশা নেমে এসেছে!',
        subtitle: 'দৃষ্টিসীমা মারাত্মক সংকুচিত (~110m) | স্কোর বোনাস +40%',
        icon: '🌫️',
        color: 'from-slate-600/90 to-gray-800/90',
      };
    } else if (type === 'neon_snow') {
      this.weatherAlert = {
        title: '❄️ নিয়ন তুষারপাত ও আইসি রোড!',
        subtitle: 'মারাত্মক ড্রাফট ও স্লিপারি ট্র্যাক (-38% গ্রিপ) | স্কোর বোনাস +50%',
        icon: '❄️',
        color: 'from-purple-600/90 to-pink-700/90',
      };
    } else {
      this.weatherAlert = {
        title: '☀️ আকাশ পরিষ্কার হয়েছে!',
        subtitle: 'স্বাভাবিক গ্রিপ ও পূর্ণ দৃশ্যমানতা ফিরে এসেছে',
        icon: '☀️',
        color: 'from-amber-500/90 to-yellow-600/90',
      };
    }
    this.weatherAlertTimer = 4.2;
  }

  public getWeatherState(): WeatherState {
    switch (this.currentWeatherType) {
      case 'rain':
        return {
          type: 'rain',
          name: 'প্রবল বৃষ্টিপাত',
          icon: '🌧️',
          effectLabel: 'হাইড্রোপ্ল্যানিং (-22% গ্রিপ) | +25% স্কোর',
          gripFactor: 0.78,
          bonusMultiplier: 1.25,
        };
      case 'fog':
        return {
          type: 'fog',
          name: 'ঘন কুয়াশা',
          icon: '🌫️',
          effectLabel: 'দৃষ্টিসীমা সংকুচিত (~110m) | +40% স্কোর',
          gripFactor: 0.95,
          bonusMultiplier: 1.40,
        };
      case 'neon_snow':
        return {
          type: 'neon_snow',
          name: 'নিয়ন তুষারপাত',
          icon: '❄️',
          effectLabel: 'আইসি রোড ড্রাফট (-38% গ্রিপ) | +50% স্কোর',
          gripFactor: 0.62,
          bonusMultiplier: 1.50,
        };
      default:
        return {
          type: 'clear',
          name: 'পরিষ্কার আকাশ',
          icon: '☀️',
          effectLabel: 'আদর্শ গ্রিপ ও দৃশ্যমানতা (100%)',
          gripFactor: 1.0,
          bonusMultiplier: 1.0,
        };
    }
  }

  private buildWeatherParticles() {
    if (this.weatherParticles) {
      this.scene.remove(this.weatherParticles);
      this.weatherParticles.geometry.dispose();
      if (Array.isArray(this.weatherParticles.material)) {
        this.weatherParticles.material.forEach((m) => m.dispose());
      } else {
        const mat = this.weatherParticles.material as THREE.PointsMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
      this.weatherParticles = null;
      this.weatherPositions = null;
    }

    const type = this.currentWeatherType;

    if (type === 'rain') {
      // 1,300 vertical rushing rain streaks
      const count = 1300;
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count * 3; i += 3) {
        pos[i] = (Math.random() - 0.5) * 52;
        pos[i + 1] = Math.random() * 26;
        pos[i + 2] = -Math.random() * 230;
      }
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.weatherPositions = pos;

      this.weatherParticles = new THREE.Points(
        geom,
        new THREE.PointsMaterial({
          color: 0x7dd3fc,
          size: 0.38,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
        })
      );
      this.scene.add(this.weatherParticles);
    } else if (type === 'fog') {
      // 380 soft rolling volumetric mist puffs
      const count = 380;
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count * 3; i += 3) {
        pos[i] = (Math.random() - 0.5) * 55;
        pos[i + 1] = 0.8 + Math.random() * 9.5;
        pos[i + 2] = 10 - Math.random() * 220;
      }
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.weatherPositions = pos;

      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        g.addColorStop(0.5, 'rgba(240, 245, 255, 0.2)');
        g.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 64, 64);
      }
      const fogTexture = new THREE.CanvasTexture(canvas);

      this.weatherParticles = new THREE.Points(
        geom,
        new THREE.PointsMaterial({
          map: fogTexture,
          color: 0xe2e8f0,
          size: 16.0,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        })
      );
      this.scene.add(this.weatherParticles);
    } else if (type === 'neon_snow') {
      // 950 multi-colored swirling neon snowflakes
      const count = 950;
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        pos[idx] = (Math.random() - 0.5) * 50;
        pos[idx + 1] = Math.random() * 25;
        pos[idx + 2] = -Math.random() * 220;

        const rand = Math.random();
        if (rand < 0.42) {
          colors[idx] = 0.15; colors[idx + 1] = 0.88; colors[idx + 2] = 1.0; // Neon cyan
        } else if (rand < 0.84) {
          colors[idx] = 0.98; colors[idx + 1] = 0.22; colors[idx + 2] = 0.72; // Neon magenta
        } else {
          colors[idx] = 0.92; colors[idx + 1] = 0.97; colors[idx + 2] = 1.0; // Frost white
        }
      }
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      this.weatherPositions = pos;

      this.weatherParticles = new THREE.Points(
        geom,
        new THREE.PointsMaterial({
          vertexColors: true,
          size: 0.7,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        })
      );
      this.scene.add(this.weatherParticles);
    } else {
      // Clear - check theme ambient particles
      const weather = this.currentTheme.weather;
      if (!weather || weather === 'none') return;

      const count = weather === 'rain' ? 800 : weather === 'embers' ? 500 : 700;
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);

      for (let i = 0; i < count * 3; i += 3) {
        pos[i] = (Math.random() - 0.5) * 45;
        pos[i + 1] = Math.random() * 25;
        pos[i + 2] = -Math.random() * 220;
      }

      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.weatherPositions = pos;

      const pColor = weather === 'rain' ? 0x38bdf8 : weather === 'embers' ? 0xf97316 : 0xa855f7;
      const pSize = weather === 'rain' ? 0.35 : weather === 'embers' ? 0.45 : 0.6;

      this.weatherParticles = new THREE.Points(
        geom,
        new THREE.PointsMaterial({
          color: pColor,
          size: pSize,
          transparent: true,
          opacity: 0.75,
        })
      );
      this.scene.add(this.weatherParticles);
    }
  }

  // Road curvature calculator
  public getRoadCurveX(z: number, distanceOverride?: number): number {
    if (!this.currentTheme.hasCurves) return 0;
    const dist = distanceOverride !== undefined ? distanceOverride : this.distance;
    const travelOffset = dist * 0.85;
    const sampleZ = (z - travelOffset) * 0.0035;
    return Math.sin(sampleZ) * 8.5 + Math.sin(sampleZ * 0.45 + 1.2) * 4.2;
  }

  private buildRoad() {
    // Cleanup previous road, terrain, guardrails, lines, lamps & puddles
    if (this.roadMesh) {
      this.disposeObject(this.roadMesh);
      this.roadMesh = null;
    }
    if (this.groundMesh) {
      this.disposeObject(this.groundMesh);
      this.groundMesh = null;
    }
    if (this.roadTexBundle) {
      this.roadTexBundle.dispose();
      this.roadTexBundle = null;
    }
    if (this.terrainTexBundle) {
      this.terrainTexBundle.dispose();
      this.terrainTexBundle = null;
    }
    this.guardrails.forEach((rail) => this.disposeObject(rail));
    this.guardrails = [];
    this.roadLines.forEach((l) => this.disposeObject(l));
    this.roadLines = [];
    this.streetLamps.forEach((lamp) => this.disposeObject(lamp));
    this.streetLamps = [];
    this.rainPuddles.forEach((p) => this.disposeObject(p));
    this.rainPuddles = [];

    const length = 1500;
    const isDayLike =
      this.currentTheme.skyType === 'daytime' ||
      this.currentTheme.skyType === 'coastal_marine' ||
      this.currentTheme.skyType === 'sahara_sunset';
    const isMarine =
      this.currentTheme.hasMarineDrive ||
      this.currentTheme.id === 'road-coastal-marine' ||
      this.currentTheme.skyType === 'coastal_marine';

    // 1. Wide Surrounding Terrain / Embankment Ground Skirt (eliminates floating-road void)
    this.terrainTexBundle = createTerrainTextureSet(this.currentTheme, this.maxAnisotropy);
    const groundWidth = isMarine ? 360 : 520;
    const groundGeo = new THREE.PlaneGeometry(groundWidth, length, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      map: this.terrainTexBundle.map,
      roughness: 0.94,
      metalness: 0.04,
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.set(isMarine ? -185 : 0, -0.22, -length / 2 + 100);
    this.scene.add(this.groundMesh);

    // 2. Photorealistic PBR 5-Lane Highway Asphalt Deck
    this.roadTexBundle = createHighwayRoadTextureSet(this.currentTheme, this.maxAnisotropy);
    const roadGeo = new THREE.PlaneGeometry(30, length, 12, 120);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.roadTexBundle.map,
      bumpMap: this.roadTexBundle.bumpMap,
      bumpScale: 0.035,
      roughnessMap: this.roadTexBundle.roughnessMap,
      roughness: this.currentTheme.weather === 'rain' ? 0.32 : 0.86,
      metalness: this.currentTheme.weather === 'rain' ? 0.22 : 0.08,
    });
    this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
    this.roadMesh.rotation.x = -Math.PI / 2;
    this.roadMesh.position.set(0, 0, -length / 2 + 100);

    const posAttr = roadGeo.attributes.position;
    const baseXs = new Float32Array(posAttr.count);
    for (let i = 0; i < posAttr.count; i++) {
      baseXs[i] = posAttr.getX(i);
    }
    this.roadMesh.userData.baseXs = baseXs;
    this.scene.add(this.roadMesh);

    // 3. Composite W-Beam Steel Highway Guardrails with H-Beam Posts & Reflector Tabs
    const railSegmentLen = 32;
    const numSegments = Math.floor(length / railSegmentLen);
    const steelMat = new THREE.MeshStandardMaterial({
      color: isDayLike ? 0xcbd5e1 : 0x475569,
      metalness: 0.82,
      roughness: 0.34,
    });
    const postMat = new THREE.MeshStandardMaterial({
      color: isDayLike ? 0x64748b : 0x1e293b,
      metalness: 0.7,
      roughness: 0.45,
    });

    [-1, 1].forEach((side, idx) => {
      const accentColor = idx === 0 ? this.currentTheme.guardrailColorA : this.currentTheme.guardrailColorB;
      const accentMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: isDayLike ? 0.15 : 0.65,
        roughness: 0.3,
        metalness: 0.4,
      });
      const reflectorMat = new THREE.MeshBasicMaterial({
        color: side < 0 ? 0xfacc15 : 0xef4444,
      });

      const beamGeo = new THREE.BoxGeometry(0.16, 0.34, railSegmentLen);
      const ribGeo = new THREE.BoxGeometry(0.22, 0.08, railSegmentLen);
      const postGeo = new THREE.BoxGeometry(0.14, 0.82, 0.16);
      const reflGeo = new THREE.BoxGeometry(0.06, 0.12, 0.18);

      for (let s = 0; s < numSegments; s++) {
        const z = -length + 100 + s * railSegmentLen + railSegmentLen / 2;
        const railGroup = new THREE.Group();

        // Main galvanized W-beam rail plate
        const beam = new THREE.Mesh(beamGeo, steelMat);
        beam.position.set(0, 0.56, 0);
        railGroup.add(beam);

        // Upper & lower W-beam corrugated profile ribs + reflector accent stripe
        const topRib = new THREE.Mesh(ribGeo, accentMat);
        topRib.position.set(-side * 0.03, 0.68, 0);
        railGroup.add(topRib);

        const botRib = new THREE.Mesh(ribGeo, steelMat);
        botRib.position.set(-side * 0.03, 0.44, 0);
        railGroup.add(botRib);

        // 4 vertical steel I-beam support posts + roadside reflector tabs
        [-12, -4, 4, 12].forEach((pz) => {
          const post = new THREE.Mesh(postGeo, postMat);
          post.position.set(side * 0.1, 0.4, pz);
          railGroup.add(post);

          const refl = new THREE.Mesh(reflGeo, reflectorMat);
          refl.position.set(-side * 0.11, 0.64, pz);
          railGroup.add(refl);
        });

        railGroup.position.set(side * 14.2, 0, z);
        railGroup.userData = { side, initialZ: z };
        this.scene.add(railGroup);
        this.guardrails.push(railGroup);
      }
    });

    // 4. Crisp 5-Lane Dashed Dividers with Embedded Cat's-Eye Retro-Reflective Road Studs
    const dividers = [-6.4, -3.2, 0, 3.2, 6.4];
    const lineGeo = new THREE.BoxGeometry(0.16, 0.02, 5.2);
    const studGeo = new THREE.BoxGeometry(0.14, 0.045, 0.14);

    for (let z = -length + 100; z < 100; z += 12) {
      dividers.slice(0, 4).forEach((x, i) => {
        const lineColor = i % 2 === 0 ? this.currentTheme.lineColorA : this.currentTheme.lineColorB;
        const lineGroup = new THREE.Group();

        const paintMat = new THREE.MeshStandardMaterial({
          color: lineColor,
          emissive: lineColor,
          emissiveIntensity: isDayLike ? 0.08 : 0.48,
          roughness: 0.45,
          metalness: 0.1,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        });

        const stripe = new THREE.Mesh(lineGeo, paintMat);
        stripe.position.y = 0.015;
        lineGroup.add(stripe);

        // Raised Cat's-Eye road stud ahead of stripe
        const studMat = new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0xfef9c3 : lineColor,
        });
        const stud = new THREE.Mesh(studGeo, studMat);
        stud.position.set(0, 0.03, 3.1);
        lineGroup.add(stud);

        lineGroup.position.set(x + 1.6, 0, z);
        lineGroup.userData = { baseX: x + 1.6 };
        this.scene.add(lineGroup);
        this.roadLines.push(lineGroup);
      });
    }

    // 5. Realistic Curved Cantilever Mast-Arm Highway Streetlights
    const lampPoleMat = new THREE.MeshStandardMaterial({
      color: isDayLike ? 0x94a3b8 : 0x334155,
      metalness: 0.85,
      roughness: 0.3,
    });
    const lampHousingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.6,
      roughness: 0.4,
    });
    const poleGeo = new THREE.CylinderGeometry(0.09, 0.14, 6.8, 8);
    const armGeo = new THREE.BoxGeometry(2.6, 0.11, 0.11);
    const headGeo = new THREE.BoxGeometry(0.85, 0.16, 0.36);
    const lensGeo = new THREE.PlaneGeometry(0.75, 0.28);

    for (let z = -1200; z < 100; z += 40) {
      [-1, 1].forEach((side, idx) => {
        const bulbColor = isDayLike
          ? 0xfff3d6
          : idx === 0
          ? this.currentTheme.lineColorA
          : this.currentTheme.lineColorB;
        const lensMat = new THREE.MeshBasicMaterial({ color: bulbColor, side: THREE.DoubleSide });

        const poleGroup = new THREE.Group();
        const pole = new THREE.Mesh(poleGeo, lampPoleMat);
        pole.position.set(0, 3.4, 0);
        poleGroup.add(pole);

        // Overhanging cantilever arm reaching inward over highway shoulder
        const arm = new THREE.Mesh(armGeo, lampPoleMat);
        arm.position.set(-side * 1.25, 6.75, 0);
        arm.rotation.z = -side * 0.12;
        poleGroup.add(arm);

        const head = new THREE.Mesh(headGeo, lampHousingMat);
        head.position.set(-side * 2.35, 6.85, 0);
        poleGroup.add(head);

        const lens = new THREE.Mesh(lensGeo, lensMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(-side * 2.35, 6.76, 0);
        poleGroup.add(lens);

        poleGroup.position.set(side * 15.2, 0, z);
        poleGroup.userData = { baseX: side * 15.2 };
        this.scene.add(poleGroup);
        this.streetLamps.push(poleGroup);
      });
    }

    // 6. Realistic Rain Puddle Splashes (expanding ripple rings on tarmac)
    for (let p = 0; p < 22; p++) {
      const puddle = new THREE.Mesh(
        new THREE.RingGeometry(0.25, 0.42, 16),
        new THREE.MeshBasicMaterial({
          color: 0xbae6fd,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
        })
      );
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set((Math.random() - 0.5) * 16, 0.025, -Math.random() * 90);
      puddle.userData = { scale: 0.2, alpha: 0, speed: 1.6 + Math.random() * 2 };
      this.scene.add(puddle);
      this.rainPuddles.push(puddle);
    }

    // 7. Pedestrian Sidewalks along Highway Embankments & Random Walking NPC Population
    this.pedestrianManager.buildSidewalks(length);
    this.pedestrianManager.spawnPedestrians(36);
  }

  private buildCity() {
    this.buildings.forEach((b) => this.disposeObject(b));
    this.buildings = [];
    this.roadsideTrees.forEach((t) => this.disposeObject(t));
    this.roadsideTrees = [];

    const sky = this.currentTheme.skyType;
    const isDay = sky === 'daytime' || sky === 'coastal_marine';
    const isCoastal = sky === 'coastal_marine';
    const isCanyon = sky === 'sahara_sunset';
    const isMagma = sky === 'magma';
    const isSpace = sky === 'space';

    const dayBuildingColors = [0xedf2f7, 0xe2e8f0, 0xcbd5e1, 0x94a3b8, 0x64748b];
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6 });

    for (let z = -1200; z < 100; z += 28) {
      [-1, 1].forEach((side) => {
        // Leave ocean side open on Coastal Highway so sandy beach, palms & ocean horizon stay clear!
        if (isCoastal && side === 1) return;

        // 1. Realistic Roadside Greenery / Trees along highway embankments
        if (isDay && Math.random() > 0.15) {
          const treeGroup = new THREE.Group();
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3.2, 8), treeTrunkMat);
          trunk.position.y = 1.6;
          treeGroup.add(trunk);

          [2.8, 4.0, 5.0].forEach((fy, idx) => {
            const rad = (3 - idx) * 0.9 + 0.4;
            const crown = new THREE.Mesh(new THREE.ConeGeometry(rad, 2.0, 8), treeFoliageMat);
            crown.position.y = fy;
            treeGroup.add(crown);
          });

          const treeX = side === -1 ? -(19.5 + Math.random() * 3.0) : 31.2 + Math.random() * 4.0;
          const treeZ = z + (Math.random() - 0.5) * 8;
          treeGroup.position.set(treeX, 0, treeZ);
          treeGroup.userData.baseX = treeX;
          this.scene.add(treeGroup);
          this.roadsideTrees.push(treeGroup);
        }

        // 2. Theme-Accurate Architecture / Natural Formations
        const h = 35 + Math.random() * 130;
        const w = 12 + Math.random() * 20;
        const d = 14 + Math.random() * 22;
        const group = new THREE.Group();

        if (isDay) {
          const colorPick = dayBuildingColors[Math.floor(Math.random() * dayBuildingColors.length)];
          const b = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({
              color: colorPick,
              metalness: 0.35,
              roughness: 0.35,
            })
          );
          b.position.y = h / 2;
          group.add(b);

          for (let y = 6; y < h; y += 9) {
            const windowStrip = new THREE.Mesh(
              new THREE.BoxGeometry(w * 0.88, 3.5, 0.12),
              new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                metalness: 0.85,
                roughness: 0.12,
              })
            );
            windowStrip.position.set(0, y, -d / 2 - 0.08);
            group.add(windowStrip);
          }
        } else if (isCanyon) {
          // Warm Sunset Canyon Sandstone Mesas & Terraced Cliffs
          const cliff = new THREE.Mesh(
            new THREE.BoxGeometry(w * 1.2, h * 0.85, d * 1.1),
            new THREE.MeshStandardMaterial({
              color: Math.random() > 0.5 ? 0xb45309 : 0x92400e,
              roughness: 0.9,
              metalness: 0.05,
            })
          );
          cliff.position.y = (h * 0.85) / 2;
          group.add(cliff);
        } else if (isMagma) {
          // Volcanic Basalt Spires with Glowing Lava Seams
          const rock = new THREE.Mesh(
            new THREE.ConeGeometry(w * 0.75, h, 6),
            new THREE.MeshStandardMaterial({
              color: 0x1c1917,
              emissive: 0x450a0a,
              emissiveIntensity: 0.35,
              roughness: 0.85,
            })
          );
          rock.position.y = h / 2;
          group.add(rock);
        } else if (isSpace) {
          // Cosmic Crystal Monoliths
          const crystal = new THREE.Mesh(
            new THREE.OctahedronGeometry(w * 0.65, 0),
            new THREE.MeshStandardMaterial({
              color: 0x312e81,
              emissive: side < 0 ? 0x6d28d9 : 0x0891b2,
              emissiveIntensity: 0.4,
              metalness: 0.9,
              roughness: 0.15,
            })
          );
          crystal.scale.set(1, h / (w * 0.9), 1);
          crystal.position.y = h / 2;
          group.add(crystal);
        } else {
          // Night / Cyber / Storm Rain Skyscrapers
          const b = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({
              color: 0x081022,
              emissive: side < 0 ? 0x120018 : 0x001420,
              emissiveIntensity: 0.3,
              roughness: 0.35,
              metalness: 0.5,
            })
          );
          b.position.y = h / 2;
          group.add(b);

          for (let y = 6; y < h; y += 8) {
            const strip = new THREE.Mesh(
              new THREE.BoxGeometry(w * 0.75, 0.22, 0.1),
              new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0x00eaff : 0xff0077,
                transparent: true,
                opacity: 0.65,
              })
            );
            strip.position.set(0, y, -d / 2 - 0.06);
            group.add(strip);
          }
        }

        // 3. Commercial Highway Rooftop Billboard on urban towers
        if (!isCanyon && !isMagma && !isSpace && Math.random() < 0.24) {
          const ads = [
            { title: 'EXPRESS GO', sub: '24/7 DIGITAL PAY', bg: '#db2777', text: '#ffffff' },
            { title: 'SKYNET 5G', sub: 'ULTRA HIGHWAY DATA', bg: '#0284c7', text: '#ffffff' },
            { title: 'APEX FUEL', sub: 'HIGH OCTANE TURBO', bg: '#ea580c', text: '#ffffff' },
            { title: 'FRESH WAVE', sub: 'PURE HYDRATION', bg: '#dc2626', text: '#fef08a' },
            { title: 'PRIME TECH', sub: 'NEXT-GEN MOTORS', bg: '#2563eb', text: '#ffffff' },
          ];
          const ad = ads[Math.floor(Math.random() * ads.length)];
          const bCanvas = document.createElement('canvas');
          bCanvas.width = 256;
          bCanvas.height = 128;
          const bCtx = bCanvas.getContext('2d');
          if (bCtx) {
            bCtx.fillStyle = ad.bg;
            bCtx.fillRect(0, 0, 256, 128);
            bCtx.strokeStyle = '#ffffff';
            bCtx.lineWidth = 6;
            bCtx.strokeRect(4, 4, 248, 120);
            bCtx.fillStyle = ad.text;
            bCtx.font = 'bold 30px sans-serif';
            bCtx.textAlign = 'center';
            bCtx.fillText(ad.title, 128, 55);
            bCtx.font = 'bold 16px sans-serif';
            bCtx.fillText(ad.sub, 128, 95);
          }
          const bTex = new THREE.CanvasTexture(bCanvas);
          bTex.colorSpace = THREE.SRGBColorSpace;
          const bb = new THREE.Mesh(
            new THREE.PlaneGeometry(14, 7),
            new THREE.MeshBasicMaterial({ map: bTex, side: THREE.DoubleSide })
          );
          bb.position.set(0, h + 3.8, -d / 2 - 0.2);
          group.add(bb);
        }

        const buildingX =
          side === -1
            ? -(28 + w * 0.5 + Math.random() * 26)
            : 36 + w * 0.5 + Math.random() * 28;
        group.position.set(buildingX, 0, z + Math.random() * 10);
        group.userData.baseX = buildingX;
        this.scene.add(group);
        this.buildings.push(group);
      });
    }
  }

  // --- HIGH-SPEED SKYTRAIN VIADUCT & STREAMLINED TRANSIT TRAIN ---
  private buildHighwaySkyTrain() {
    this.metroRailPillars.forEach((p) => this.disposeObject(p));
    this.metroRailPillars = [];
    if (this.metroTrain) {
      this.disposeObject(this.metroTrain);
      this.metroTrain = null;
    }

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.85, metalness: 0.1 });
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.7, metalness: 0.3 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });

    const viaductX = -17.5; // Elevated on left side of highway
    const trackY = 9.8;

    for (let z = -1200; z < 100; z += 35) {
      const g = new THREE.Group();

      // Concrete Column Pier
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, trackY, 12), pillarMat);
      col.position.set(0, trackY / 2, 0);
      g.add(col);

      // Hammerhead Crossbeam Pier Cap
      const beam = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.1, 2.2), pillarMat);
      beam.position.set(0, trackY + 0.3, 0);
      g.add(beam);

      // Guideway Slab
      const girder = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 35.5), trackMat);
      girder.position.set(0, trackY + 1.1, 0);
      g.add(girder);

      // Green & White Metro Transit Side Crash Barriers
      [-2.1, 2.1].forEach((gx) => {
        const railWall = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.9, 35.5),
          new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.5 })
        );
        railWall.position.set(gx, trackY + 1.8, 0);
        g.add(railWall);
      });

      // Steel Tracks
      [-0.8, 0.8].forEach((rx) => {
        const rTrack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 35.5), railMat);
        rTrack.position.set(rx, trackY + 1.6, 0);
        g.add(rTrack);
      });

      g.position.set(viaductX, 0, z);
      g.userData = { baseX: viaductX };
      this.scene.add(g);
      this.metroRailPillars.push(g);
    }

    // Elevated Metro Express Train (৪ বগির আধুনিক মেট্রোরেল)
    const trainGroup = new THREE.Group();
    const trainLength = 52;
    const trainWidth = 3.2;
    const trainHeight = 2.8;

    const silverBodyMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.85, roughness: 0.2 });
    const greenRibbonMat = new THREE.MeshBasicMaterial({ color: 0x059669 });
    const redRibbonMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const trainGlassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });

    const carLen = 12.2;
    for (let c = 0; c < 4; c++) {
      const cz = (c - 1.5) * (carLen + 0.8);
      const carGroup = new THREE.Group();

      const shell = new THREE.Mesh(new THREE.BoxGeometry(trainWidth, trainHeight, carLen), silverBodyMat);
      shell.position.y = trainHeight / 2;
      carGroup.add(shell);

      const gStripe = new THREE.Mesh(new THREE.BoxGeometry(trainWidth + 0.04, 0.45, carLen + 0.02), greenRibbonMat);
      gStripe.position.y = 1.1;
      carGroup.add(gStripe);

      const rStripe = new THREE.Mesh(new THREE.BoxGeometry(trainWidth + 0.05, 0.25, carLen + 0.03), redRibbonMat);
      rStripe.position.y = 0.7;
      carGroup.add(rStripe);

      const win = new THREE.Mesh(new THREE.BoxGeometry(trainWidth + 0.06, 0.75, carLen * 0.85), trainGlassMat);
      win.position.y = 1.85;
      carGroup.add(win);

      const acPod = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, carLen * 0.5), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
      acPod.position.y = trainHeight + 0.2;
      carGroup.add(acPod);

      carGroup.position.z = cz;
      trainGroup.add(carGroup);
    }

    // Aerodynamic Nose on front cab
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 4), silverBodyMat);
    nose.rotation.x = -Math.PI / 2;
    nose.rotation.y = Math.PI / 4;
    nose.position.set(0, trainHeight / 2, -trainLength / 2 - 0.9);
    trainGroup.add(nose);

    // Dual Front LED Headlights
    [-0.8, 0.8].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(lx, 1.2, -trainLength / 2 - 1.2);
      trainGroup.add(hl);
    });

    trainGroup.position.set(viaductX, trackY + 1.6, -180);
    trainGroup.userData = { baseX: viaductX };
    this.scene.add(trainGroup);
    this.metroTrain = trainGroup;
  }

  // --- HIGHWAY OVERHEAD GANTRY SIGNBOARDS WITH ROUTE BRANCHES ---
  private buildHighwaySignboards() {
    this.overheadSignboards.forEach((s) => this.disposeObject(s));
    this.overheadSignboards = [];

    const boardTexts = [
      {
        top: 'HIGHWAY INTERCHANGE SYSTEM',
        sub: 'ELECTRONIC TOLLWAY & RADAR SPEED ENFORCED',
        dirL: '⇖ ROUTE A • EXPRESS FLYOVER',
        dirR: 'ROUTE B • COASTAL HIGHWAY ➜',
      },
      {
        top: 'INTERSTATE JUNCTION 04',
        sub: 'MAINTAIN SAFE DISTANCE • SPEED LIMIT 120 KM/H',
        dirL: '⇖ ROUTE 1 • METROPOLIS BYPASS',
        dirR: 'ROUTE 2 • OCEAN FREEWAY ➜',
      },
      {
        top: 'MULTI-LANE HIGHWAY CORRIDOR',
        sub: 'HIGH-SPEED SENSOR MONITORED TRACK',
        dirL: '⇖ NORTH TERMINAL TUNNEL',
        dirR: 'SOUTH CONNECTOR ➜',
      },
      {
        top: 'COASTAL EXPRESS ROUTE SPLIT',
        sub: 'DRIVE RESPONSIBLY • KEEP IN LANE',
        dirL: '⇖ FLYOVER OVERPASS',
        dirR: 'HARBOR FREEWAY ➜',
      },
    ];

    const trussMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 });

    for (let i = 0; i < 4; i++) {
      const z = -200 - i * 280;
      const g = new THREE.Group();

      [-16, 16].forEach((tx) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 8.5, 8), trussMat);
        post.position.set(tx, 4.25, 0);
        g.add(post);
      });

      const beam = new THREE.Mesh(new THREE.BoxGeometry(32.5, 0.5, 0.6), trussMat);
      beam.position.set(0, 7.8, 0);
      g.add(beam);

      const data = boardTexts[i % boardTexts.length];
      const canvas = document.createElement('canvas');
      canvas.width = 768;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#065f46'; // Highway Green
        ctx.fillRect(0, 0, 768, 200);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 10;
        ctx.strokeRect(8, 8, 752, 184);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 34px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(data.top, 384, 52);

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 20px "Orbitron", sans-serif';
        ctx.fillText(data.sub, 384, 88);

        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, 110);
        ctx.lineTo(738, 110);
        ctx.stroke();

        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(data.dirL, 50, 155);

        ctx.textAlign = 'right';
        ctx.fillText(data.dirR, 718, 155);
      }

      const boardTex = new THREE.CanvasTexture(canvas);
      boardTex.colorSpace = THREE.SRGBColorSpace;
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 4.2),
        new THREE.MeshBasicMaterial({ map: boardTex, side: THREE.DoubleSide })
      );
      board.position.set(0, 6.2, -0.05);
      g.add(board);

      g.position.set(0, 0, z);
      g.userData = { baseX: 0 };
      this.scene.add(g);
      this.overheadSignboards.push(g);
    }
  }

  // --- COASTAL HIGHWAY SCENERY & OCEAN (ROUTE B) ---
  private buildCoastalHighway() {
    this.cleanMarineDrive();

    const isMarine =
      this.currentTheme.hasMarineDrive ||
      this.currentTheme.id === 'road-coastal-marine' ||
      this.currentTheme.skyType === 'coastal_marine';

    if (!isMarine) return;

    // 1. Ocean Plane
    const oceanGeo = new THREE.PlaneGeometry(380, 1500, 24, 60);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.85,
    });
    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.rotation.x = -Math.PI / 2;
    this.oceanMesh.position.set(205, -0.6, -650);
    this.scene.add(this.oceanMesh);

    // 2. Coastal Sand Beach Strip
    const beachGroup = new THREE.Group();
    const sandGeo = new THREE.PlaneGeometry(32, 1500);
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.9,
      metalness: 0.1,
    });
    const beach = new THREE.Mesh(sandGeo, sandMat);
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(30, -0.15, -650);
    beachGroup.add(beach);
    this.scene.add(beachGroup);
    this.marineDriveObjects.push(beachGroup);

    // 3. Coastal Speedboats & Yachts
    for (let sb = -1100; sb < 50; sb += 160) {
      const boat = this.createSampanBoat();
      boat.position.set(55 + Math.random() * 80, -0.4, sb + (Math.random() - 0.5) * 40);
      boat.userData = { initialZ: boat.position.z, bobPhase: Math.random() * Math.PI * 2 };
      this.scene.add(boat);
      this.marineDriveObjects.push(boat);
    }

    // 4. Coconut Palm Trees along the beach coast
    for (let pz = -1200; pz < 100; pz += 28) {
      const palm = this.createCoconutPalmTree();
      palm.position.set(16.8 + Math.random() * 6, 0, pz + (Math.random() - 0.5) * 6);
      palm.userData = { baseX: palm.position.x };
      this.scene.add(palm);
      this.marineDriveObjects.push(palm);
    }

    // 5. Undulating Lush Coastal Hills on the Left
    for (let hz = -1200; hz < 100; hz += 60) {
      const hill = this.createCoastalHill();
      hill.position.set(-48 - Math.random() * 30, 0, hz);
      hill.userData = { baseX: hill.position.x };
      this.scene.add(hill);
      this.marineDriveObjects.push(hill);
    }

    // 6. Coastal Highway Overhead Signboard Gantries & Milestones
    const milestones = [
      { text: 'HIGHWAY JUNCTION 01 (EAST CORRIDOR 12 KM)', sub: 'EXPRESSWAY TOLLWAY LINK', z: -80 },
      { text: 'COASTAL BRIDGE EXPRESSWAY (BRIDGE 45 KM)', sub: 'OVERSEAS CROSSING CORRIDOR', z: -360 },
      { text: 'METROPOLIS BYPASS (JUNCTION 90 KM)', sub: 'HIGH SPEED TRANSIT CORRIDOR', z: -680 },
      { text: 'PACIFIC SCENIC DRIVE (BAY 150 KM)', sub: 'COASTAL OCEAN PARKWAY', z: -980 },
    ];

    milestones.forEach((m) => {
      const gantry = this.createMarineDriveGantry(m.text, m.sub);
      gantry.position.set(0, 0, m.z);
      gantry.userData = { baseX: 0 };
      this.scene.add(gantry);
      this.marineDriveObjects.push(gantry);
    });
  }

  private cleanMarineDrive() {
    if (this.oceanMesh) {
      this.disposeObject(this.oceanMesh);
      this.oceanMesh = null;
    }
    this.marineDriveObjects.forEach((obj) => this.disposeObject(obj));
    this.marineDriveObjects = [];
  }

  private cleanSecondaryRoad() {
    if (this.secondaryRoadMesh) {
      this.disposeObject(this.secondaryRoadMesh);
      this.secondaryRoadMesh = null;
    }
    if (this.flyoverTexBundle) {
      this.flyoverTexBundle.dispose();
      this.flyoverTexBundle = null;
    }
    this.secondaryRoadPillars.forEach((p) => this.disposeObject(p));
    this.secondaryRoadPillars = [];
    this.secondaryGuardrails.forEach((g) => this.disposeObject(g));
    this.secondaryGuardrails = [];
    this.secondaryRoadLines.forEach((l) => this.disposeObject(l));
    this.secondaryRoadLines = [];
    this.secondaryTraffic.forEach((t) => this.disposeObject(t.group));
    this.secondaryTraffic = [];

    this.overpassBridges.forEach((b) => this.disposeObject(b));
    this.overpassBridges = [];
    this.overpassTraffic.forEach((t) => this.disposeObject(t.group));
    this.overpassTraffic = [];
  }

  // --- SECONDARY ELEVATED FLYOVER ROAD WITH ACTIVE MOVING TRAFFIC ---
  private buildSecondaryFlyoverRoad(length: number = 1500) {
    this.cleanSecondaryRoad();

    const flyoverX = 23.5;
    const flyoverY = 4.2;
    const roadWidth = 11.5;
    const isDayLike =
      this.currentTheme.skyType === 'daytime' ||
      this.currentTheme.skyType === 'coastal_marine' ||
      this.currentTheme.skyType === 'sahara_sunset';

    // 1. Photorealistic PBR Elevated Deck Mesh (3 lanes, joints, hazard curbs)
    this.flyoverTexBundle = createFlyoverTextureSet(this.currentTheme, this.maxAnisotropy);
    const flyGeo = new THREE.PlaneGeometry(roadWidth, length, 8, 100);
    this.secondaryRoadMesh = new THREE.Mesh(
      flyGeo,
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: this.flyoverTexBundle.map,
        bumpMap: this.flyoverTexBundle.bumpMap,
        bumpScale: 0.025,
        roughnessMap: this.flyoverTexBundle.roughnessMap,
        roughness: this.currentTheme.weather === 'rain' ? 0.36 : 0.88,
        metalness: this.currentTheme.weather === 'rain' ? 0.2 : 0.06,
      })
    );
    this.secondaryRoadMesh.rotation.x = -Math.PI / 2;
    this.secondaryRoadMesh.position.set(flyoverX, flyoverY, -length / 2 + 100);
    this.scene.add(this.secondaryRoadMesh);

    // Save initial vertex X coordinates for curve displacement
    const posAttr = flyGeo.attributes.position;
    const baseXs = new Float32Array(posAttr.count);
    for (let i = 0; i < posAttr.count; i++) {
      baseXs[i] = posAttr.getX(i);
    }
    this.secondaryRoadMesh.userData.baseXs = baseXs;

    // 2. Concrete Box-Girder Support Piers & Haunched Crosshead Beams Under Flyover Deck
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85, metalness: 0.08 });
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.72, metalness: 0.16 });
    const spineMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8, metalness: 0.12 });

    for (let z = -length + 100; z < 100; z += 42) {
      const pierGroup = new THREE.Group();
      // Tapered Pier Column
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, flyoverY - 0.6, 12), pierMat);
      col.position.set(0, (flyoverY - 0.6) / 2, 0);
      pierGroup.add(col);

      // Foundation Plinth
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 2.6), spineMat);
      plinth.position.set(0, 0.2, 0);
      pierGroup.add(plinth);

      // Pier Crosshead Beam
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(roadWidth + 1.0, 0.75, 2.4), beamMat);
      crossBeam.position.set(0, flyoverY - 0.55, 0);
      pierGroup.add(crossBeam);

      // Concrete Box-Girder Spine Underneath Deck
      const girder = new THREE.Mesh(new THREE.BoxGeometry(roadWidth * 0.56, 0.9, 42.2), spineMat);
      girder.position.set(0, flyoverY - 0.52, 0);
      pierGroup.add(girder);

      pierGroup.position.set(flyoverX, 0, z);
      pierGroup.userData = { baseX: flyoverX, initialZ: z };
      this.scene.add(pierGroup);
      this.secondaryRoadPillars.push(pierGroup);
    }

    // 3. Composite Concrete Jersey Parapet + Top Steel Safety Rail on Flyover Edges
    const railSegmentLen = 32;
    const numSegments = Math.floor(length / railSegmentLen);
    const parapetMat = new THREE.MeshStandardMaterial({
      color: isDayLike ? 0xcbd5e1 : 0x475569,
      roughness: 0.85,
      metalness: 0.1,
    });
    const steelTubeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.82,
      roughness: 0.3,
    });
    const parapetWallGeo = new THREE.BoxGeometry(0.38, 0.62, railSegmentLen);
    const parapetRailGeo = new THREE.BoxGeometry(0.12, 0.14, railSegmentLen);
    const parapetCapGeo = new THREE.BoxGeometry(0.42, 0.09, railSegmentLen);

    [-1, 1].forEach((side, idx) => {
      const accentColor = idx === 0 ? this.currentTheme.guardrailColorA : this.currentTheme.guardrailColorB;
      const accentMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: isDayLike ? 0.15 : 0.55,
        roughness: 0.35,
      });

      for (let s = 0; s < numSegments; s++) {
        const z = -length + 100 + s * railSegmentLen + railSegmentLen / 2;
        const railGroup = new THREE.Group();

        const wall = new THREE.Mesh(parapetWallGeo, parapetMat);
        wall.position.y = 0.31;
        railGroup.add(wall);

        const cap = new THREE.Mesh(parapetCapGeo, accentMat);
        cap.position.y = 0.64;
        railGroup.add(cap);

        const topBar = new THREE.Mesh(parapetRailGeo, steelTubeMat);
        topBar.position.y = 0.88;
        railGroup.add(topBar);

        const gx = flyoverX + side * (roadWidth / 2 - 0.18);
        railGroup.position.set(gx, flyoverY, z);
        railGroup.userData = { baseX: gx, side, initialZ: z };
        this.scene.add(railGroup);
        this.secondaryGuardrails.push(railGroup);
      }
    });

    // 4. Raised Retro-Reflective Lane Markers (3 lanes)
    const laneDividers = [flyoverX - 2.0, flyoverX + 2.0];
    const fLineGeo = new THREE.BoxGeometry(0.14, 0.025, 4.6);
    for (let z = -length + 100; z < 100; z += 12) {
      laneDividers.forEach((lx, i) => {
        const lCol = i === 0 ? this.currentTheme.lineColorA : this.currentTheme.lineColorB;
        const line = new THREE.Mesh(
          fLineGeo,
          new THREE.MeshStandardMaterial({
            color: lCol,
            emissive: lCol,
            emissiveIntensity: isDayLike ? 0.08 : 0.45,
            roughness: 0.45,
            polygonOffset: true,
            polygonOffsetFactor: -1,
          })
        );
        line.position.set(lx, flyoverY + 0.02, z);
        line.userData = { baseX: lx, initialZ: z };
        this.scene.add(line);
        this.secondaryRoadLines.push(line);
      });
    }

    // 5. Active Moving Traffic Vehicles on the Flyover Road
    const vehicleCount = 14;
    const lanes = [flyoverX - 3.8, flyoverX, flyoverX + 3.8];

    for (let i = 0; i < vehicleCount; i++) {
      const laneIdx = i % 3;
      const baseX = lanes[laneIdx];
      const z = -Math.random() * 1100 + 30;
      // Lane 2 is oncoming traffic (-1 direction), Lanes 0 & 1 are cruising forward (1 direction)
      const direction: 1 | -1 = laneIdx === 2 ? -1 : 1;
      const speed = 75 + Math.random() * 55;

      let vehicleGroup: THREE.Group;
      const roll = Math.random();
      if (roll < 0.25) {
        vehicleGroup = HighwayVehicles.createHighwayExpressCoach();
      } else if (roll < 0.5) {
        vehicleGroup = HighwayVehicles.createSemiTruckTrailer();
      } else if (roll < 0.75) {
        vehicleGroup = HighwayVehicles.createHighwaySUV();
      } else {
        const carColors = [0x0284c7, 0xdc2626, 0x16a34a, 0xf59e0b, 0x64748b, 0xff0055];
        const color = carColors[Math.floor(Math.random() * carColors.length)];
        vehicleGroup = this.createCivilianCar(color, false);
      }

      vehicleGroup.position.set(baseX, flyoverY, z);
      vehicleGroup.rotation.y = direction === 1 ? 0 : Math.PI;
      this.scene.add(vehicleGroup);

      this.secondaryTraffic.push({
        group: vehicleGroup,
        baseX,
        y: flyoverY,
        lane: laneIdx,
        z,
        speed,
        direction,
      });
    }
  }

  // --- OVERPASS CROSSING BRIDGES OVER THE HIGHWAY WITH MOVING VEHICLES ---
  private buildOverpassBridges() {
    this.overpassBridges.forEach((b) => this.disposeObject(b));
    this.overpassBridges = [];
    this.overpassTraffic.forEach((t) => this.disposeObject(t.group));
    this.overpassTraffic = [];

    const overpassZs = [-380, -820];
    const bridgeCenterX = 4.0; // Spans cleanly over both SkyTrain (-17.5) & Flyover (+23.5)
    const bridgeWidth = 9.5;
    const bridgeSpan = 74;
    const bridgeHeight = 8.6; // Clears 4.2m flyover + tall buses/trucks underneath

    // Procedural asphalt cross-deck texture
    const deckCanvas = document.createElement('canvas');
    deckCanvas.width = 512;
    deckCanvas.height = 128;
    const dctx = deckCanvas.getContext('2d');
    if (dctx) {
      dctx.fillStyle = '#1e2430';
      dctx.fillRect(0, 0, 512, 128);
      for (let i = 0; i < 1600; i++) {
        const v = 24 + Math.floor(Math.random() * 24);
        dctx.fillStyle = `rgb(${v},${v + 3},${v + 8})`;
        dctx.fillRect(Math.random() * 512, Math.random() * 128, 2, 2);
      }
      dctx.fillStyle = '#e2e8f0';
      dctx.fillRect(0, 8, 512, 4);
      dctx.fillRect(0, 116, 512, 4);
      dctx.fillStyle = '#facc15';
      for (let dx = 12; dx < 512; dx += 44) {
        dctx.fillRect(dx, 62, 24, 4);
      }
    }
    const deckTex = new THREE.CanvasTexture(deckCanvas);
    deckTex.wrapS = THREE.RepeatWrapping;
    deckTex.repeat.set(3, 1);
    deckTex.colorSpace = THREE.SRGBColorSpace;

    const bridgeDeckMat = new THREE.MeshStandardMaterial({
      map: deckTex,
      roughness: 0.78,
      metalness: 0.14,
    });
    const girderMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.72, metalness: 0.2 });
    const bridgeRailMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.45,
      metalness: 0.6,
    });
    const bridgeAccentMat = new THREE.MeshStandardMaterial({
      color: this.currentTheme.lineColorA,
      emissive: this.currentTheme.lineColorA,
      emissiveIntensity: 0.45,
      roughness: 0.4,
    });
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });

    overpassZs.forEach((bz) => {
      const bridgeGroup = new THREE.Group();

      // Roadway Deck + Concrete Girder Underbelly
      const deck = new THREE.Mesh(new THREE.BoxGeometry(bridgeSpan, 0.55, bridgeWidth), bridgeDeckMat);
      deck.position.y = bridgeHeight;
      bridgeGroup.add(deck);

      const underGirder = new THREE.Mesh(new THREE.BoxGeometry(bridgeSpan, 0.55, bridgeWidth * 0.82), girderMat);
      underGirder.position.y = bridgeHeight - 0.5;
      bridgeGroup.add(underGirder);

      // Concrete Parapets & Reflective Top Accent Bars
      [-bridgeWidth / 2 + 0.18, bridgeWidth / 2 - 0.18].forEach((ry) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(bridgeSpan, 0.95, 0.32), bridgeRailMat);
        rail.position.set(0, bridgeHeight + 0.72, ry);
        bridgeGroup.add(rail);

        const cap = new THREE.Mesh(new THREE.BoxGeometry(bridgeSpan, 0.12, 0.36), bridgeAccentMat);
        cap.position.set(0, bridgeHeight + 1.22, ry);
        bridgeGroup.add(cap);
      });

      // Outer Support Piers safely outside SkyTrain (-17.5) and Secondary Flyover (+23.5)
      [-27.5, 27.8].forEach((px) => {
        const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.35, bridgeHeight, 12), pierMat);
        pier.position.set(px, bridgeHeight / 2, 0);
        bridgeGroup.add(pier);

        const cap = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.75, bridgeWidth + 0.6), girderMat);
        cap.position.set(px, bridgeHeight - 0.55, 0);
        bridgeGroup.add(cap);
      });

      bridgeGroup.position.set(bridgeCenterX, 0, bz);
      bridgeGroup.userData = { baseX: bridgeCenterX, baseZ: bz };
      this.scene.add(bridgeGroup);
      this.overpassBridges.push(bridgeGroup);

      // Vehicles crossing horizontally over the highway!
      [-2.6, 2.6].forEach((laneZ, lIdx) => {
        const dir: 1 | -1 = lIdx === 0 ? 1 : -1;
        const speed = 18 + Math.random() * 12;
        const carColors = [0xdc2626, 0x2563eb, 0x16a34a, 0xf59e0b, 0xffffff];
        const carColor = carColors[Math.floor(Math.random() * carColors.length)];
        const car = this.createCivilianCar(carColor, lIdx === 1);
        const startLocalX = (Math.random() - 0.5) * (bridgeSpan - 14);
        car.position.set(bridgeCenterX + startLocalX, bridgeHeight + 0.28, bz + laneZ);
        car.rotation.y = dir === 1 ? -Math.PI / 2 : Math.PI / 2;
        this.scene.add(car);

        this.overpassTraffic.push({
          group: car,
          x: startLocalX, // local X offset relative to bridgeCenterX
          baseZ: bz, // bridge center Z
          y: laneZ, // store lane Z offset cleanly; vertical Y = bridgeHeight + 0.28
          speed,
          direction: dir,
        });
      });
    });
  }

  // --- UPDATE ANIMATION FOR ALL OTHER ROADS AND VEHICLES ---
  private updateSecondaryTraffic(dt: number, roadMovement: number, distanceOverride?: number) {
    // Scroll procedural PBR flyover asphalt & expansion joints synchronously
    if (this.flyoverTexBundle) {
      const uvDelta = (roadMovement * this.flyoverTexBundle.repeatY) / 1500;
      this.flyoverTexBundle.map.offset.y = (this.flyoverTexBundle.map.offset.y + uvDelta) % 1;
      this.flyoverTexBundle.bumpMap.offset.y = (this.flyoverTexBundle.bumpMap.offset.y + uvDelta) % 1;
      this.flyoverTexBundle.roughnessMap.offset.y = (this.flyoverTexBundle.roughnessMap.offset.y + uvDelta) % 1;
    }

    // 1. Scroll secondary flyover structure elements with curve alignment
    this.secondaryRoadPillars.forEach((p) => {
      p.position.z += roadMovement;
      if (p.position.z > 50) p.position.z -= 1300;
      p.position.x = (p.userData.baseX || 23.5) + this.getRoadCurveX(p.position.z, distanceOverride);
      const dCurv =
        this.getRoadCurveX(p.position.z - 4, distanceOverride) -
        this.getRoadCurveX(p.position.z + 4, distanceOverride);
      p.rotation.y = Math.atan2(dCurv, 8);
    });

    this.secondaryGuardrails.forEach((g) => {
      g.position.z += roadMovement;
      if (g.position.z > 50) g.position.z -= 1300;
      g.position.x = (g.userData.baseX || 23.5) + this.getRoadCurveX(g.position.z, distanceOverride);
      const dCurv =
        this.getRoadCurveX(g.position.z - 4, distanceOverride) -
        this.getRoadCurveX(g.position.z + 4, distanceOverride);
      g.rotation.y = Math.atan2(dCurv, 8);
    });

    this.secondaryRoadLines.forEach((l) => {
      l.position.z += roadMovement;
      if (l.position.z > 50) l.position.z -= 1300;
      l.position.x = (l.userData.baseX || 23.5) + this.getRoadCurveX(l.position.z, distanceOverride);
      const dCurv =
        this.getRoadCurveX(l.position.z - 3, distanceOverride) -
        this.getRoadCurveX(l.position.z + 3, distanceOverride);
      l.rotation.y = Math.atan2(dCurv, 6);
    });

    // 2. Animate and update cars actively driving on the secondary flyover road
    for (let i = 0; i < this.secondaryTraffic.length; i++) {
      const car = this.secondaryTraffic[i];
      const relSpeed =
        car.direction === 1
          ? (this.speed - car.speed) * 0.055 + 8
          : (this.speed + car.speed) * 0.055 + 10;

      car.z += relSpeed * dt;
      if (car.z > 60) {
        car.z -= 1180;
      } else if (car.z < -1180) {
        car.z += 1180;
      }

      const curveX = this.getRoadCurveX(car.z, distanceOverride);
      car.group.position.set(car.baseX + curveX, car.y, car.z);

      const dCurve =
        this.getRoadCurveX(car.z - 3, distanceOverride) -
        this.getRoadCurveX(car.z + 3, distanceOverride);
      const angle = Math.atan2(dCurve, 6);
      car.group.rotation.y = car.direction === 1 ? angle : Math.PI + angle;
    }

    // 3. Overpass bridges and cross-highway traffic synchronized on curves
    this.overpassBridges.forEach((b) => {
      b.position.z += roadMovement;
      if (b.position.z > 50) b.position.z -= 1300;
      b.position.x = (b.userData.baseX ?? 4.0) + this.getRoadCurveX(b.position.z, distanceOverride);
      const dCurv =
        this.getRoadCurveX(b.position.z - 4, distanceOverride) -
        this.getRoadCurveX(b.position.z + 4, distanceOverride);
      b.rotation.y = Math.atan2(dCurv, 8);
    });

    const bridgeHeightY = 8.88;
    const bridgeCenterX = 4.0;
    for (let j = 0; j < this.overpassTraffic.length; j++) {
      const op = this.overpassTraffic[j];
      op.baseZ += roadMovement;
      if (op.baseZ > 50) op.baseZ -= 1300;

      op.x += op.speed * op.direction * dt;
      if (op.direction === 1 && op.x > 34) {
        op.x = -34;
      } else if (op.direction === -1 && op.x < -34) {
        op.x = 34;
      }

      const dCurv =
        this.getRoadCurveX(op.baseZ - 4, distanceOverride) -
        this.getRoadCurveX(op.baseZ + 4, distanceOverride);
      const bridgeAngle = Math.atan2(dCurv, 8);
      const cosA = Math.cos(bridgeAngle);
      const sinA = Math.sin(bridgeAngle);
      const localZ = op.y; // stored lane offset (-2.6 or +2.6)
      const worldX = bridgeCenterX + this.getRoadCurveX(op.baseZ, distanceOverride) + op.x * cosA + localZ * sinA;
      const worldZ = op.baseZ - op.x * sinA + localZ * cosA;

      op.group.position.set(worldX, bridgeHeightY, worldZ);
      op.group.rotation.y = (op.direction === 1 ? -Math.PI / 2 : Math.PI / 2) + bridgeAngle;
    }
  }

  private createSampanBoat(): THREE.Group {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 6.5), woodMat);
    hull.position.y = 0.3;
    group.add(hull);

    const prow = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 4), woodMat);
    prow.rotation.x = -Math.PI / 2.8;
    prow.position.set(0, 0.7, -3.8);
    group.add(prow);

    const stern = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.8, 4), woodMat);
    stern.rotation.x = Math.PI / 2.8;
    stern.position.set(0, 0.6, 3.6);
    group.add(stern);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 4.5, 6),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 })
    );
    mast.position.set(0, 2.4, 0);
    group.add(mast);

    const flagCanvas = document.createElement('canvas');
    flagCanvas.width = 120; flagCanvas.height = 70;
    const fctx = flagCanvas.getContext('2d');
    if (fctx) {
      fctx.fillStyle = '#0284c7';
      fctx.fillRect(0, 0, 120, 70);
      fctx.fillStyle = '#ffffff';
      fctx.fillRect(0, 26, 120, 18);
      fctx.fillStyle = '#f59e0b';
      fctx.beginPath();
      fctx.arc(60, 35, 11, 0, Math.PI * 2);
      fctx.fill();
    }
    const flagTex = new THREE.CanvasTexture(flagCanvas);
    flagTex.colorSpace = THREE.SRGBColorSpace;
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.8),
      new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide })
    );
    flag.position.set(0.7, 4.0, 0);
    group.add(flag);

    return group;
  }

  private createCoconutPalmTree(): THREE.Group {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5, side: THREE.DoubleSide });

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 7.5, 8), trunkMat);
    trunk.position.set(0.4, 3.6, 0);
    trunk.rotation.z = -0.12;
    group.add(trunk);

    for (let a = 0; a < 7; a++) {
      const angle = (a / 7) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.8), leafMat);
      frond.rotation.x = Math.PI / 3;
      frond.rotation.y = angle;
      frond.position.set(0.8, 7.3, 0);
      group.add(frond);
    }
    return group;
  }

  private createCoastalHill(): THREE.Group {
    const group = new THREE.Group();
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.85 });
    const h = 25 + Math.random() * 45;
    const rad = 22 + Math.random() * 20;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 8), hillMat);
    hill.position.y = h / 2 - 2;
    group.add(hill);
    return group;
  }

  private createMarineDriveGantry(title: string, sub: string): THREE.Group {
    const group = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });

    [-14.5, 14.5].forEach((gx) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 9.5, 8), frameMat);
      p.position.set(gx, 4.75, 0);
      group.add(p);
    });

    const bar = new THREE.Mesh(new THREE.BoxGeometry(29.6, 0.45, 0.45), frameMat);
    bar.position.set(0, 9.2, 0);
    group.add(bar);

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#065f46';
      ctx.fillRect(0, 0, 600, 140);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 588, 128);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px "Hind Siliguri", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, 300, 56);
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 24px "Hind Siliguri", sans-serif';
      ctx.fillText(sub, 300, 105);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 3.2), new THREE.MeshBasicMaterial({ map: tex }));
    sign.position.set(0, 7.2, 0);
    group.add(sign);

    return group;
  }

  private buildPlayerCar() {
    if (this.playerGroup) {
      this.disposeObject(this.playerGroup);
      this.playerGroup = null;
    }
    this.playerWheels = [];
    this.headlightPoolMesh = null;

    const group = new THREE.Group();

    // Ground Contact Shadow & Dual Headlight Light-Pool Projections
    if (this.contactShadowTex) {
      const shadowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.75, 5.2),
        new THREE.MeshBasicMaterial({
          map: this.contactShadowTex,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        })
      );
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.set(0, 0.025, 0);
      group.add(shadowMesh);
    }

    if (this.headlightBeamTex) {
      this.headlightPoolMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(5.6, 17.5),
        new THREE.MeshBasicMaterial({
          map: this.headlightBeamTex,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
        })
      );
      this.headlightPoolMesh.rotation.x = -Math.PI / 2;
      this.headlightPoolMesh.position.set(0, 0.035, -10.8);
      group.add(this.headlightPoolMesh);
    }

    // --- REALISTIC SPORTS CAR MODEL ---
    // 1. Sleek Aerodynamic Lower Chassis / Splitter
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x111625, metalness: 0.85, roughness: 0.3 });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.22, 4.3), chassisMat);
    chassis.position.y = 0.22;
    group.add(chassis);

    // Front Bumper / Air Dam
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.32, 0.4), chassisMat);
    frontBumper.position.set(0, 0.28, -2.15);
    group.add(frontBumper);

    // 2. Main Sculpted Car Body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.activeCar.bodyColor,
      metalness: 0.9,
      roughness: 0.15,
    });
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.52, 3.9), bodyMat);
    mainBody.position.y = 0.52;
    group.add(mainBody);

    // Hood Slope / Front Bonnet
    const hoodMat = new THREE.MeshStandardMaterial({
      color: this.activeCar.accentColor || this.activeCar.bodyColor,
      metalness: 0.92,
      roughness: 0.12,
    });
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.18, 1.4), hoodMat);
    hood.position.set(0, 0.68, -1.25);
    hood.rotation.x = 0.08;
    group.add(hood);

    // 3. Cabin & Glass Canopy (Front Windshield, Side Windows, Rear Glass)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0a1424,
      metalness: 0.95,
      roughness: 0.05,
    });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.45, 1.95), glassMat);
    cabin.position.set(0, 0.96, -0.05);
    group.add(cabin);

    // Roof Top Shell (Body Color)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.06, 1.35), bodyMat);
    roof.position.set(0, 1.20, -0.05);
    group.add(roof);

    // Front Windshield Frame
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.42, 0.1), glassMat);
    windshield.position.set(0, 0.95, -1.05);
    windshield.rotation.x = -0.55;
    group.add(windshield);

    // 4. Side Mirrors (Left & Right)
    [-0.85, 0.85].forEach((mx) => {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.16), bodyMat);
      mirror.position.set(mx, 0.85, -0.7);
      group.add(mirror);
    });

    // 5. Rear Racing Spoiler / Wing
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x050814, metalness: 0.8, roughness: 0.2 });
    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.4), wingMat);
    wingBlade.position.set(0, 1.15, 1.85);
    group.add(wingBlade);
    [-0.55, 0.55].forEach((sx) => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.12), wingMat);
      strut.position.set(sx, 0.95, 1.85);
      group.add(strut);
    });

    // 6. Realistic LED Headlights (Crisp White/Ice Blue)
    [-0.65, 0.65].forEach((hx) => {
      const headlight = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.14, 0.12),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      headlight.position.set(hx, 0.58, -1.98);
      group.add(headlight);
    });

    // 7. Realistic Horizontal Rear Light Bar (Ruby Red)
    const taillightBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.12, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xff002b })
    );
    taillightBar.position.set(0, 0.65, 1.98);
    group.add(taillightBar);

    // 8. 4 Realistic Spinning Wheels (Tread Tire + Alloy Rim + Cross Spokes)
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.78 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd9e2ec, metalness: 0.95, roughness: 0.15 });
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35, metalness: 0.5 });

    const wheelPositions = [
      [-0.94, 0.38, -1.25],
      [0.94, 0.38, -1.25],
      [-0.94, 0.38, 1.25],
      [0.94, 0.38, 1.25],
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const wheelGroup = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 18), tireMat);
      tire.rotation.z = Math.PI / 2;
      wheelGroup.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.30, 16), rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      // Visible spokes so wheel spin reads dynamically at speed
      const spokeA = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.055), caliperMat);
      wheelGroup.add(spokeA);
      const spokeB = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.055, 0.42), rimMat);
      wheelGroup.add(spokeB);

      wheelGroup.position.set(x, y, z);
      group.add(wheelGroup);
      this.playerWheels.push(wheelGroup);
    });

    // Underglow Neon Light
    this.underglowLight = new THREE.PointLight(this.activeCar.underglow, 2.5, 6);
    this.underglowLight.position.set(0, 0.15, 0);
    group.add(this.underglowLight);

    // Dual Exhaust Nitro Jets
    const exhGeom = new THREE.CylinderGeometry(0.08, 0.2, 1.2, 8);
    const exhMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

    this.leftExhaust = new THREE.Mesh(exhGeom, exhMat);
    this.leftExhaust.rotation.x = Math.PI / 2;
    this.leftExhaust.position.set(-0.4, 0.45, 2.4);
    this.leftExhaust.visible = false;
    group.add(this.leftExhaust);

    this.rightExhaust = new THREE.Mesh(exhGeom, exhMat);
    this.rightExhaust.rotation.x = Math.PI / 2;
    this.rightExhaust.position.set(0.4, 0.45, 2.4);
    this.rightExhaust.visible = false;
    group.add(this.rightExhaust);

    // Realistic Windshield Wipers (pivot at base for realistic rain sweep)
    const wiperMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const wiperGeo = new THREE.BoxGeometry(0.04, 0.36, 0.02);
    wiperGeo.translate(0, 0.18, 0); // pivot at base

    this.leftWiper = new THREE.Mesh(wiperGeo, wiperMat);
    this.leftWiper.position.set(-0.35, 0.86, -1.05);
    this.leftWiper.rotation.x = -0.55;
    this.leftWiper.rotation.z = -0.5;
    group.add(this.leftWiper);

    this.rightWiper = new THREE.Mesh(wiperGeo, wiperMat);
    this.rightWiper.position.set(0.25, 0.86, -1.05);
    this.rightWiper.rotation.x = -0.55;
    this.rightWiper.rotation.z = -0.5;
    group.add(this.rightWiper);

    group.position.set(0, 0, 3);
    this.scene.add(group);
    this.playerGroup = group;
  }

  // --- TRAFFIC VEHICLE BUILDERS ---

  private createPoliceCar(): { group: THREE.Group; lights: { r: THREE.PointLight; b: THREE.PointLight } } {
    const group = new THREE.Group();
    const w = 1.78;
    const h = 0.65;
    const l = 4.0;

    // Highway Patrol White Body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.85, roughness: 0.2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), bodyMat);
    body.position.y = h / 2 + 0.22;
    group.add(body);

    // Navy Blue Side Stripe
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.3 });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.18, l * 0.95), stripeMat);
    stripe.position.y = body.position.y + 0.05;
    group.add(stripe);

    // Windshield & Glass
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a1424, metalness: 0.9, roughness: 0.1 });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.45, l * 0.52), glassMat);
    cab.position.set(0, body.position.y + h / 2 + 0.2, 0.1);
    group.add(cab);

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.06, l * 0.46), bodyMat);
    roof.position.set(0, cab.position.y + 0.24, 0.1);
    group.add(roof);

    // Police Roof Lightbar
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.10, 0.24), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    barBase.position.set(0, roof.position.y + 0.06, 0.1);
    group.add(barBase);

    const redLight = new THREE.PointLight(0xff0000, 2.5, 12);
    redLight.position.set(-0.35, roof.position.y + 0.14, 0.1);
    group.add(redLight);

    const blueLight = new THREE.PointLight(0x0055ff, 2.5, 12);
    blueLight.position.set(0.35, roof.position.y + 0.14, 0.1);
    group.add(blueLight);

    // Headlights & Taillights
    [-w * 0.35, w * 0.35].forEach((hx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(hx, body.position.y, -l / 2 - 0.04);
      group.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.10, 0.08), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      tl.position.set(hx, body.position.y + 0.05, l / 2 + 0.04);
      group.add(tl);
    });

    // 4 Wheels
    const whGeom = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 14);
    const whMat = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.7 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9 });

    [[-w / 2 - 0.08, -1.2], [w / 2 + 0.08, -1.2], [-w / 2 - 0.08, 1.2], [w / 2 + 0.08, 1.2]].forEach(([wx, wz]) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(whGeom, whMat);
      tire.rotation.z = Math.PI / 2;
      wg.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.26, 12), rimMat);
      rim.rotation.z = Math.PI / 2;
      wg.add(rim);
      wg.position.set(wx, 0.36, wz);
      group.add(wg);
    });

    return { group, lights: { r: redLight, b: blueLight } };
  }

  private createCivilianCar(color: number, isSUV: boolean): THREE.Group {
    const group = new THREE.Group();
    const w = isSUV ? 1.85 : 1.72;
    const h = isSUV ? 0.78 : 0.60;
    const l = isSUV ? 4.1 : 3.8;

    const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), bodyMat);
    body.position.y = h / 2 + 0.22;
    group.add(body);

    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a1424, metalness: 0.9, roughness: 0.1 });
    const cabHeight = isSUV ? 0.55 : 0.44;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, cabHeight, l * 0.55), glassMat);
    cab.position.set(0, body.position.y + h / 2 + cabHeight / 2 - 0.05, 0.1);
    group.add(cab);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.06, l * 0.48), bodyMat);
    roof.position.set(0, cab.position.y + cabHeight / 2 + 0.02, 0.1);
    group.add(roof);

    [-w * 0.35, w * 0.35].forEach((hx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(hx, body.position.y, -l / 2 - 0.04);
      group.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.10, 0.08), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      tl.position.set(hx, body.position.y + 0.05, l / 2 + 0.04);
      group.add(tl);
    });

    const whGeom = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 14);
    const whMat = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.7 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });

    [[-w / 2 - 0.08, -1.2], [w / 2 + 0.08, -1.2], [-w / 2 - 0.08, 1.2], [w / 2 + 0.08, 1.2]].forEach(([wx, wz]) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(whGeom, whMat);
      tire.rotation.z = Math.PI / 2;
      wg.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.26, 12), rimMat);
      rim.rotation.z = Math.PI / 2;
      wg.add(rim);
      wg.position.set(wx, 0.36, wz);
      group.add(wg);
    });

    return group;
  }

  // --- TRAFFIC SPAWNER (AUTHENTIC HIGHWAY VEHICLES, ANTI-WALL & ANTI-OVERLAP) ---
  private spawnTraffic() {
    const allLanes = [-2, -1, 0, 1, 2];
    const occupiedNearSpawn = new Set<number>();
    const occupiedInBand = new Set<number>();

    for (const t of this.traffic) {
      if (t.group.position.z < -170) {
        occupiedInBand.add(t.lane);
        if (Math.abs(t.group.position.z - -260) < 40) {
          occupiedNearSpawn.add(t.lane);
        }
      }
    }

    // Never form an unbeatable 5-lane wall across the horizon
    if (occupiedInBand.size >= 4) return;

    const freeLanes = allLanes.filter((l) => !occupiedNearSpawn.has(l));
    if (freeLanes.length === 0) return;

    const level = Math.max(1, Math.floor(this.distance / 700) + 1);
    const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
    const isPolice = !this.policeActive && Math.random() < Math.min(0.22, 0.12 + (level - 1) * 0.015);

    let group: THREE.Group;
    let w = 1.75;
    let l = 3.9;
    let vehicleSpeed = 75 + Math.random() * 52 + Math.min(28, (level - 1) * 4);
    let lights: { r: THREE.PointLight; b: THREE.PointLight } | undefined;
    let vehicleType: 'bus' | 'truck' | 'police' | 'car' | 'suv' = 'car';

    if (isPolice) {
      vehicleType = 'police';
      const policeRes = this.createPoliceCar();
      group = policeRes.group;
      lights = policeRes.lights;
      w = 1.78; l = 4.0;
      vehicleSpeed = 95 + Math.random() * 42 + Math.min(25, (level - 1) * 3);
    } else {
      const typeRoll = Math.random();
      if (typeRoll < 0.28) {
        vehicleType = 'bus';
        group = HighwayVehicles.createHighwayExpressCoach();
        w = 2.5; l = 8.2;
        vehicleSpeed = 70 + Math.random() * 28 + Math.min(20, (level - 1) * 2.5);
      } else if (typeRoll < 0.52) {
        vehicleType = 'truck';
        group = HighwayVehicles.createSemiTruckTrailer();
        w = 2.6; l = 12.8;
        vehicleSpeed = 58 + Math.random() * 24 + Math.min(18, (level - 1) * 2);
      } else if (typeRoll < 0.76) {
        vehicleType = 'suv';
        group = HighwayVehicles.createHighwaySUV();
        w = 1.95; l = 4.5;
        vehicleSpeed = 85 + Math.random() * 40 + Math.min(25, (level - 1) * 3);
      } else {
        vehicleType = 'car';
        const paints = [0xd32f2f, 0x1976d2, 0xf8fafc, 0xf59e0b, 0x1e293b, 0x475569];
        const carPaint = paints[Math.floor(Math.random() * paints.length)];
        group = this.createCivilianCar(carPaint, false);
        w = 1.75; l = 3.9;
        vehicleSpeed = 88 + Math.random() * 42 + Math.min(28, (level - 1) * 3.5);
      }
    }

    const initX = lane * this.laneWidth + this.getRoadCurveX(-260);
    group.position.set(initX, 0, -260);
    this.scene.add(group);

    this.traffic.push({
      group,
      lane,
      currentX: lane * this.laneWidth,
      targetLane: lane,
      laneChangeTimer: Math.max(2.2, 4.8 - level * 0.22) + Math.random() * 4.5,
      speed: vehicleSpeed,
      isPolice,
      policeLights: lights,
      passed: false,
      cycle: 0,
      width: w,
      length: l,
      vehicleType,
    });
  }

  // --- CLEAN CASH BUNDLE & NITRO POWERUP SPAWNER ---
  private spawnCashPickup() {
    const allLanes = [-2, -1, 0, 1, 2];
    const blockedLanes = new Set<number>();
    for (const t of this.traffic) {
      if (Math.abs(t.group.position.z - -240) < t.length * 0.65 + 10) {
        blockedLanes.add(t.lane);
        blockedLanes.add(t.targetLane);
      }
    }
    const openLanes = allLanes.filter((l) => !blockedLanes.has(l));
    const pool = openLanes.length > 0 ? openLanes : allLanes;
    const lane = pool[Math.floor(Math.random() * pool.length)];
    const isCashBundle = Math.random() < 0.65;
    const group = new THREE.Group();

    if (isCashBundle) {
      // Golden / Emerald Cash Stack Bundle
      const stack = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.42, 0.58),
        new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x059669,
          emissiveIntensity: 0.7,
          metalness: 0.45,
          roughness: 0.25,
        })
      );
      group.add(stack);

      const band = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.46, 0.62),
        new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          emissive: 0xeab308,
          emissiveIntensity: 0.5,
          metalness: 0.8,
          roughness: 0.2,
        })
      );
      group.add(band);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.05, 8, 16),
        new THREE.MeshBasicMaterial({ color: 0x34d399 })
      );
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      group.position.set(lane * this.laneWidth, 0.85, -240);
      this.scene.add(group);

      this.pickups.push({
        group,
        type: 'cash_bundle',
        lane,
        z: -240,
        value: 180,
        active: true,
      });
    } else {
      // High-tech Cyan Nitro Fuel Cell
      const canister = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 1.1, 16),
        new THREE.MeshStandardMaterial({
          color: 0x00ffff,
          emissive: 0x00ffff,
          emissiveIntensity: 0.65,
          metalness: 0.8,
          roughness: 0.2,
        })
      );
      group.add(canister);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.05, 8, 16),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      group.position.set(lane * this.laneWidth, 0.85, -240);
      this.scene.add(group);

      this.pickups.push({
        group,
        type: 'nitro',
        lane,
        z: -240,
        value: 80,
        active: true,
      });
    }
  }

  // --- CONTROLS ---
  public moveLeft() {
    if (!this.isRunning || this.isPaused) return;
    if (this.lane > -2) {
      this.lane--;
      this.targetX = this.lane * this.laneWidth;
      sound.playTurn(true);
      sound.vibrate(20);
    }
  }

  public moveRight() {
    if (!this.isRunning || this.isPaused) return;
    if (this.lane < 2) {
      this.lane++;
      this.targetX = this.lane * this.laneWidth;
      sound.playTurn(false);
      sound.vibrate(20);
    }
  }

  public setBoost(boosting: boolean) {
    if (!this.isRunning || this.isPaused) return;
    if (boosting && this.nitro > 10) {
      if (!this.isBoosting) {
        sound.playNitro();
      }
      this.isBoosting = true;
    } else {
      this.isBoosting = false;
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!e || typeof e.key !== 'string') return;
    const k = e.key.toLowerCase();
    if (this.isReplaying && e.key === 'Escape') {
      e.preventDefault();
      this.stopReplay();
      return;
    }
    if (!this.isRunning) return;

    if (e.key === 'ArrowLeft' || k === 'a') {
      if (e.repeat) return;
      this.moveLeft();
    } else if (e.key === 'ArrowRight' || k === 'd') {
      if (e.repeat) return;
      this.moveRight();
    } else if (e.key === 'ArrowUp' || k === 'w' || e.key === 'Shift') {
      this.setBoost(true);
    } else if (e.key === 'Escape' || e.key === ' ') {
      if (e.repeat) return;
      e.preventDefault();
      this.togglePause();
    } else if (k === 'r') {
      if (e.repeat) return;
      sound.cycleRadioStation();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (!e || typeof e.key !== 'string') return;
    const k = e.key.toLowerCase();
    if (e.key === 'ArrowUp' || k === 'w' || e.key === 'Shift') {
      this.setBoost(false);
    }
  };

  public togglePause() {
    if (!this.isRunning) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.isBoosting = false;
      sound.stopEngine();
    } else {
      sound.startEngine();
    }
  }

  // --- MISSION PROGRESS ---
  private checkMissionProgress(type: CashMission['type'], amount: number) {
    const mission = this.missions[this.activeMissionIndex];
    if (mission && mission.type === type) {
      mission.progress += amount;
      if (mission.progress >= mission.target) {
        this.cashCollectedThisRun += mission.rewardTaka;
        this.onMissionComplete(mission);

        this.activeMissionIndex = (this.activeMissionIndex + 1) % this.missions.length;
        this.missions[this.activeMissionIndex].progress = 0;
      }
    }
  }

  private clearScheduledTimeouts() {
    if (this.crashTimeoutId !== null) {
      clearTimeout(this.crashTimeoutId);
      this.crashTimeoutId = null;
    }
    this.lightningTimeouts.forEach((id) => clearTimeout(id));
    this.lightningTimeouts = [];
  }

  // --- START & RESET ---
  public start() {
    this.clearScheduledTimeouts();
    if (this.isReplaying) {
      this.stopReplay();
    }
    this.replayFrames = [];

    this.isRunning = true;
    this.isPaused = false;
    this.isBoosting = false;

    this.score = 0;
    this.distance = 0;
    this.speed = 115;
    this.maxSpeedAchieved = 115;
    this.nitro = 100;
    this.shields = 0;
    this.maxShields = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.nearMisses = 0;
    this.cashCollectedThisRun = 0;
    this.lastCashDistanceChunk = 0;
    this.cameraShake = 0;

    this.lane = 0;
    this.targetX = 0;
    this.spawnTimer = 0;
    this.pickupTimer = 0;
    this.policeTimer = 0;
    this.policeActive = false;
    this.invulnerableTimer = 0;
    this.lightningTimer = 4.0;
    this.activeMissionIndex = 0;
    this.missions = INITIAL_MISSIONS.map((m) => ({ ...m }));

    this.traffic.forEach((t) => this.disposeObject(t.group));
    this.traffic = [];
    this.pickups.forEach((p) => this.disposeObject(p.group));
    this.pickups = [];
    this.debrisList.forEach((d) => {
      this.disposeObject(d.mesh);
    });
    this.debrisList = [];

    if (this.playerGroup) {
      this.playerGroup.position.set(0, 0, 3);
      this.playerGroup.rotation.set(0, 0, 0);
      this.playerGroup.visible = true;
    }

    this.currentFov = 65;
    this.camera.fov = 65;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 4.8, 9.8);
    this.camera.rotation.set(-0.22, 0, 0);

    // Reset Dynamic Weather cleanly (force targets + particle reset)
    this.currentWeatherType = 'clear';
    this.weatherTimer = 0;
    this.weatherDuration = 0;
    this.nextWeatherInterval = 15 + Math.random() * 10;
    this.weatherAlert = null;
    this.weatherAlertTimer = 0;
    this.updateWeatherTargets();
    this.buildWeatherParticles();

    sound.setInGame(true);
    sound.startEngine();
    sound.startMusic();
  }

  public stop() {
    this.clearScheduledTimeouts();
    if (this.isReplaying) {
      this.stopReplay();
    }
    this.isRunning = false;
    this.isPaused = false;
    this.isBoosting = false;
    sound.setInGame(false);
    sound.stopEngine();
    sound.stopMusic();
  }

  private spawnCrashDebris(originX: number, originZ: number) {
    const colors = [this.activeCar.bodyColor, 0xff5500, 0xffcc00, 0x334155, 0x00eaff];
    for (let i = 0; i < 20; i++) {
      const size = 0.14 + Math.random() * 0.25;
      const geo = new THREE.BoxGeometry(size, size * 0.7, size * 1.4);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        originX + (Math.random() - 0.5) * 1.4,
        0.5 + Math.random() * 0.8,
        originZ + (Math.random() - 0.5) * 2.2
      );
      this.scene.add(mesh);
      this.debrisList.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 18,
          4 + Math.random() * 11,
          (Math.random() - 0.5) * 16 - 4
        ),
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14
        ),
        life: 0.9 + Math.random() * 0.5,
      });
    }
  }

  private triggerCrash() {
    if (!this.isRunning) return;

    // Vehicle Destroyed (Immediate crash - no protection)
    this.isRunning = false;
    this.isBoosting = false;
    this.cameraShake = 1.6;
    sound.setInGame(false);
    sound.playCrash();
    sound.stopMusic();
    sound.vibrate(280);

    const px = this.playerGroup?.position.x || 0;
    const pz = this.playerGroup?.position.z || 3;
    this.spawnCrashDebris(px, pz);

    if (this.playerGroup) {
      this.playerGroup.visible = false;
    }

    this.crashTimeoutId = window.setTimeout(() => {
      this.crashTimeoutId = null;
      this.onCrash();
    }, 650);
  }

  // --- UPDATE LOOP ---
  private update(dt: number) {
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      if (this.playerGroup) {
        this.playerGroup.visible = Math.floor(performance.now() / 80) % 2 === 0;
      }
    } else if (this.playerGroup) {
      this.playerGroup.visible = true;
    }

    if (this.weatherAlertTimer > 0) {
      this.weatherAlertTimer -= dt;
      if (this.weatherAlertTimer <= 0) {
        this.weatherAlert = null;
      }
    }

    // Dynamic Weather Cycle & Random Triggers
    this.weatherTimer += dt;
    if (this.currentWeatherType !== 'clear') {
      this.weatherDuration -= dt;
      if (this.weatherDuration <= 0) {
        this.setWeather('clear');
        this.weatherTimer = 0;
        this.nextWeatherInterval = 22 + Math.random() * 20; // 22-42s until next weather event
      }
    } else if (this.weatherTimer >= this.nextWeatherInterval) {
      const choices: DynamicWeatherType[] = ['rain', 'fog', 'neon_snow'];
      const chosen = choices[Math.floor(Math.random() * choices.length)];
      this.setWeather(chosen);
      this.weatherDuration = 18 + Math.random() * 16; // lasts 18-34s
      this.weatherTimer = 0;
    }

    // Smooth transition for fog and lighting
    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density += (this.targetFogDensity - this.scene.fog.density) * Math.min(1, dt * 1.5);
      this.scene.fog.color.lerp(this.targetFogColor, Math.min(1, dt * 1.5));
      this.scene.background = this.scene.fog.color;
    }

    if (this.ambientLight) {
      this.ambientLight.color.lerp(this.targetAmbientColor, Math.min(1, dt * 1.5));
      this.ambientLight.intensity += (this.targetAmbientIntensity - this.ambientLight.intensity) * Math.min(1, dt * 1.5);
    }

    const weather = this.getWeatherState();

    // Global Upgrades calculation (exact match with UPGRADE_TIERS)
    const engineUpgradeBonuses = [0, 15, 30, 50, 75];
    const engineUpgradeBonus = engineUpgradeBonuses[Math.min(4, Math.max(0, this.upgrades.engineLevel - 1))];
    const nitroUpgradeBonus = (this.upgrades.nitroLevel - 1) * 18;
    const gripUpgradeBonus = (this.upgrades.shieldLevel - 1) * 0.05;
    const steeringUpgradeMultiplier = 1 + (this.upgrades.shieldLevel - 1) * 0.12;

    const baseTop = this.activeCar.topSpeed + engineUpgradeBonus;
    const boostPower = this.activeCar.nitroBoost + nitroUpgradeBonus;
    const multiplierBonus = 1 + (this.upgrades.multiplierLevel - 1) * 0.25;

    const level = Math.max(1, Math.floor(this.distance / 700) + 1);
    const speedRatio = Math.min(1.0, 0.75 + (level - 1) * 0.035 + this.distance / 12000);
    const grip = Math.min(1.0, weather.gripFactor + gripUpgradeBonus);
    let targetSpeed = baseTop * speedRatio * (0.92 + 0.08 * grip);

    if (this.isBoosting && this.nitro > 0) {
      targetSpeed += boostPower;
      const drainRate = Math.max(16, 36 - (this.upgrades.nitroLevel - 1) * 4);
      this.nitro = Math.max(0, this.nitro - dt * drainRate);
      if (this.nitro <= 0) this.isBoosting = false;
    } else {
      const chargeRate = 3.0 + (this.upgrades.nitroLevel - 1) * 0.8;
      this.nitro = Math.min(100, this.nitro + dt * chargeRate);
    }

    const accelFactor = (this.activeCar.accel || 90) / 90;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * (this.isBoosting ? 4.2 : 1.6 * accelFactor));
    this.maxSpeedAchieved = Math.max(this.maxSpeedAchieved, this.speed);
    sound.updateEngine(Math.min(1.4, this.speed / 400), this.isBoosting);

    // Dynamic speed FOV & spinning car wheels
    const targetFov = Math.min(76, 65 + Math.max(0, (this.speed - 115) / 28) + (this.isBoosting ? 4.5 : 0));
    if (Math.abs(targetFov - this.currentFov) > 0.05) {
      this.currentFov += (targetFov - this.currentFov) * Math.min(1, dt * 5.0);
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    for (let w = 0; w < this.playerWheels.length; w++) {
      this.playerWheels[w].rotation.x -= this.speed * 0.16 * dt;
    }

    if (this.headlightPoolMesh) {
      const isNight =
        this.currentTheme.skyType !== 'daytime' &&
        this.currentTheme.skyType !== 'coastal_marine';
      const beamOp =
        this.currentWeatherType === 'fog' || this.currentWeatherType === 'rain'
          ? 0.68
          : isNight
          ? 0.56
          : 0.16;
      (this.headlightPoolMesh.material as THREE.MeshBasicMaterial).opacity = beamOp;
    }

    if (this.leftExhaust && this.rightExhaust) {
      this.leftExhaust.visible = this.isBoosting;
      this.rightExhaust.visible = this.isBoosting;
    }

    const forward = this.speed * 0.26 * dt;
    this.distance += forward;
    this.checkMissionProgress('distance', forward);

    // Silent distance reward accrual (no screen popups)
    const distChunk = Math.floor(this.distance / 50);
    if (distChunk > this.lastCashDistanceChunk) {
      const gainedChunks = distChunk - this.lastCashDistanceChunk;
      this.lastCashDistanceChunk = distChunk;
      this.cashCollectedThisRun += gainedChunks * Math.round(40 * multiplierBonus);
    }

    // Score based on speed, boost, combo, and weather modifier
    this.score += this.speed * 0.18 * (this.isBoosting ? 2.4 : 1.0) * dt * this.combo * weather.bonusMultiplier;

    // Combo Timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 1;
    }

    // Police pursuit check
    this.policeTimer += dt;
    if (!this.policeActive && this.policeTimer > 28) {
      this.policeActive = true;
      this.policeTimer = 0;
      sound.playSiren();
    } else if (this.policeActive && this.policeTimer > 22) {
      this.policeActive = false;
      this.policeTimer = 0;
    }

    // Steering with dynamic weather & suspension grip upgrades
    let handlingSpeed = 13.5 * steeringUpgradeMultiplier;
    let bodyRoll = 0.07;

    if (this.currentWeatherType === 'rain') {
      handlingSpeed = 9.8 * steeringUpgradeMultiplier;
      bodyRoll = 0.11;
    } else if (this.currentWeatherType === 'neon_snow') {
      handlingSpeed = 7.4 * steeringUpgradeMultiplier;
      bodyRoll = 0.16;
    } else if (this.currentWeatherType === 'fog') {
      handlingSpeed = 13.0 * steeringUpgradeMultiplier;
      bodyRoll = 0.07;
    }

    // Update Radio live traffic bulletins periodically
    this.radioNewsTimer += dt;
    if (this.radioNewsTimer > 9.5) {
      sound.updateRadioTrafficNews();
      this.radioNewsTimer = 0;
    }

    const pz = this.playerGroup?.position.z || 3;
    const targetWorldX = this.targetX + this.getRoadCurveX(pz);

    if (this.playerGroup) {
      const dx = targetWorldX - this.playerGroup.position.x;
      this.playerGroup.position.x += dx * Math.min(1, dt * handlingSpeed);

      let microDrift = 0;
      if (this.currentWeatherType === 'neon_snow' && this.speed > 130) {
        microDrift = Math.sin(performance.now() * 0.0035) * 0.12;
      }
      const roadHeading = Math.atan2(
        this.getRoadCurveX(pz - 3) - this.getRoadCurveX(pz + 3),
        6
      );
      this.playerGroup.rotation.y = roadHeading + (-dx * 0.035);
      this.playerGroup.rotation.z = -dx * bodyRoll + microDrift;
    }

    // Road scroll + PBR texture UV synchronization
    const roadMovement = (this.speed * 0.065 + 12) * dt;

    if (this.roadTexBundle) {
      const uvDelta = (roadMovement * this.roadTexBundle.repeatY) / 1500;
      this.roadTexBundle.map.offset.y = (this.roadTexBundle.map.offset.y + uvDelta) % 1;
      this.roadTexBundle.bumpMap.offset.y = (this.roadTexBundle.bumpMap.offset.y + uvDelta) % 1;
      this.roadTexBundle.roughnessMap.offset.y = (this.roadTexBundle.roughnessMap.offset.y + uvDelta) % 1;
    }
    if (this.terrainTexBundle) {
      const tDelta = (roadMovement * this.terrainTexBundle.repeatY) / 1500;
      this.terrainTexBundle.map.offset.y = (this.terrainTexBundle.map.offset.y + tDelta) % 1;
    }

    // Dynamic Road Mesh Deformation along winding curves
    if (this.roadMesh && this.currentTheme.hasCurves && this.roadMesh.userData.baseXs) {
      const posAttr = this.roadMesh.geometry.attributes.position;
      const baseXs: Float32Array = this.roadMesh.userData.baseXs;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        const localY = posAttr.getY(i);
        const worldZ = this.roadMesh.position.z - localY;
        posAttr.setX(i, baseXs[i] + this.getRoadCurveX(worldZ));
      }
      posAttr.needsUpdate = true;
    }

    // Dynamic Secondary Flyover Road Curvature
    if (this.secondaryRoadMesh && this.currentTheme.hasCurves && this.secondaryRoadMesh.userData.baseXs) {
      const posAttr = this.secondaryRoadMesh.geometry.attributes.position;
      const baseXs: Float32Array = this.secondaryRoadMesh.userData.baseXs;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        const localY = posAttr.getY(i);
        const worldZ = this.secondaryRoadMesh.position.z - localY;
        posAttr.setX(i, baseXs[i] + this.getRoadCurveX(worldZ));
      }
      posAttr.needsUpdate = true;
    }

    // Road lines scroll & curve alignment
    this.roadLines.forEach((line) => {
      line.position.z += roadMovement;
      if (line.position.z > 25) line.position.z -= 1400;
      if (line.userData.baseX !== undefined) {
        line.position.x = line.userData.baseX + this.getRoadCurveX(line.position.z);
        const dCurv = this.getRoadCurveX(line.position.z - 3) - this.getRoadCurveX(line.position.z + 3);
        line.rotation.y = Math.atan2(dCurv, 6);
      }
    });

    // Guardrails scroll & curve alignment
    this.guardrails.forEach((rail) => {
      rail.position.z += roadMovement;
      if (rail.position.z > 25) rail.position.z -= 1400;
      if (rail.userData.side !== undefined) {
        rail.position.x = rail.userData.side * 14.2 + this.getRoadCurveX(rail.position.z);
        const dCurv = this.getRoadCurveX(rail.position.z - 4) - this.getRoadCurveX(rail.position.z + 4);
        rail.rotation.y = Math.atan2(dCurv, 8);
      }
    });

    // Realistic Rain Puddle Splashes (expanding ripple rings on tarmac)
    const isRain = this.currentWeatherType === 'rain' || this.currentTheme.weather === 'rain';
    this.rainPuddles.forEach((puddle) => {
      if (isRain) {
        puddle.userData.scale += dt * puddle.userData.speed;
        puddle.scale.set(puddle.userData.scale, puddle.userData.scale, 1);
        puddle.userData.alpha = Math.max(0, 0.75 - puddle.userData.scale * 0.22);
        (puddle.material as THREE.MeshBasicMaterial).opacity = puddle.userData.alpha;
        if (puddle.userData.scale > 3.2) {
          puddle.userData.scale = 0.2;
          puddle.position.set(
            (Math.random() - 0.5) * 16 + this.getRoadCurveX(puddle.position.z),
            0.025,
            -Math.random() * 90
          );
        }
      } else {
        (puddle.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    });

    // Realistic Windshield Wipers Sweeping during Rain
    if (isRain && this.leftWiper && this.rightWiper) {
      this.wiperAngle += dt * 8.0;
      const swing = Math.sin(this.wiperAngle) * 0.55;
      this.leftWiper.rotation.z = -0.1 + swing;
      this.rightWiper.rotation.z = -0.1 + swing;
    } else if (this.leftWiper && this.rightWiper) {
      this.leftWiper.rotation.z = -0.5;
      this.rightWiper.rotation.z = -0.5;
    }

    // Unified Thunder Lightning Flash during Heavy Rain
    if (isRain) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 7 + Math.random() * 10;
        if (this.ambientLight) {
          const prevInt = this.targetAmbientIntensity;
          this.ambientLight.intensity = 3.6;
          const tid = window.setTimeout(() => {
            if (this.ambientLight) this.ambientLight.intensity = prevInt;
          }, 120);
          this.lightningTimeouts.push(tid);
        }
        if (this.dirLightA) {
          const origIntensity = this.dirLightA.intensity;
          this.dirLightA.intensity = 4.5;
          const tid2 = window.setTimeout(() => {
            if (this.dirLightA) this.dirLightA.intensity = origIntensity;
          }, 120);
          this.lightningTimeouts.push(tid2);
        }
        sound.tone(75, 0.5, 'sawtooth', 0.25);
      }
    }

    // Coastal Highway Scenery & Ocean Waves
    if (this.oceanMesh) {
      this.oceanTime += dt * 1.6;
      this.oceanMesh.position.y = -0.6 + Math.sin(this.oceanTime) * 0.15;
    }

    this.marineDriveObjects.forEach((mObj) => {
      mObj.position.z += roadMovement;
      if (mObj.position.z > 60) {
        mObj.position.z -= 1300;
      }
      if (mObj.userData.baseX !== undefined) {
        mObj.position.x = mObj.userData.baseX + this.getRoadCurveX(mObj.position.z);
      }
      if (mObj.userData.bobPhase !== undefined) {
        mObj.userData.bobPhase += dt * 2.2;
        mObj.position.y = -0.4 + Math.sin(mObj.userData.bobPhase) * 0.22;
        mObj.rotation.z = Math.sin(mObj.userData.bobPhase * 0.8) * 0.08;
      }
    });

    this.buildings.forEach((b) => {
      b.position.z += roadMovement * 0.85;
      if (b.position.z > 60) b.position.z -= 1300;
      if (b.userData.baseX !== undefined) {
        b.position.x = b.userData.baseX + this.getRoadCurveX(b.position.z);
      }
    });

    this.roadsideTrees.forEach((t) => {
      t.position.z += roadMovement;
      if (t.position.z > 40) t.position.z -= 1300;
      if (t.userData.baseX !== undefined) {
        t.position.x = t.userData.baseX + this.getRoadCurveX(t.position.z);
      }
    });

    this.streetLamps.forEach((lamp) => {
      lamp.position.z += roadMovement;
      if (lamp.position.z > 35) lamp.position.z -= 1300;
      if (lamp.userData.baseX !== undefined) {
        lamp.position.x = lamp.userData.baseX + this.getRoadCurveX(lamp.position.z);
        const dCurv = this.getRoadCurveX(lamp.position.z - 3) - this.getRoadCurveX(lamp.position.z + 3);
        lamp.rotation.y = Math.atan2(dCurv, 6);
      }
    });

    // High-Speed SkyTrain Viaduct & Overhead Signboards scroll + curve alignment
    this.metroRailPillars.forEach((p) => {
      p.position.z += roadMovement;
      if (p.position.z > 40) p.position.z -= 1300;
      p.position.x = (p.userData.baseX ?? -17.5) + this.getRoadCurveX(p.position.z);
      const dCurv = this.getRoadCurveX(p.position.z - 4) - this.getRoadCurveX(p.position.z + 4);
      p.rotation.y = Math.atan2(dCurv, 8);
    });

    this.overheadSignboards.forEach((s) => {
      s.position.z += roadMovement;
      if (s.position.z > 35) s.position.z -= 1120;
      s.position.x = (s.userData.baseX ?? 0) + this.getRoadCurveX(s.position.z);
      const dCurv = this.getRoadCurveX(s.position.z - 4) - this.getRoadCurveX(s.position.z + 4);
      s.rotation.y = Math.atan2(dCurv, 8);
    });

    // Realistic Walking 3D Pedestrians on Sidewalks / Highway Embankments
    this.pedestrianManager.update(dt, roadMovement, (z) => this.getRoadCurveX(z));

    // Secondary Elevated Flyover Road & Overpass Traffic Vehicles
    this.updateSecondaryTraffic(dt, roadMovement);

    if (this.metroTrain) {
      // High-speed SkyTrain gliding smoothly on the curved viaduct!
      this.metroTrain.position.z += roadMovement - 26 * dt;
      if (this.metroTrain.position.z > 80) {
        this.metroTrain.position.z -= 1300;
      }
      this.metroTrain.position.x = (this.metroTrain.userData.baseX ?? -17.5) + this.getRoadCurveX(this.metroTrain.position.z);
      const dCurv = this.getRoadCurveX(this.metroTrain.position.z - 6) - this.getRoadCurveX(this.metroTrain.position.z + 6);
      this.metroTrain.rotation.y = Math.atan2(dCurv, 12);
    }

    // Cloud drift in daytime
    if (this.cloudsGroup) {
      this.cloudsGroup.children.forEach((c) => {
        c.position.x += dt * 4;
        if (c.position.x > 320) c.position.x = -320;
      });
    }

    // Weather particle animation (Rain, Fog, Neon Snow)
    if (this.weatherParticles && this.weatherPositions) {
      const currentActiveWeather = this.currentWeatherType !== 'clear' ? this.currentWeatherType : this.currentTheme.weather;
      const count = this.weatherPositions.length / 3;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        if (currentActiveWeather === 'rain') {
          this.weatherPositions[idx + 1] -= dt * 200;
          this.weatherPositions[idx + 2] += roadMovement * 0.95;
          if (this.weatherPositions[idx + 1] < 0) {
            this.weatherPositions[idx + 1] = 23 + Math.random() * 4;
            this.weatherPositions[idx + 2] = -Math.random() * 230;
          }
        } else if (currentActiveWeather === 'fog') {
          this.weatherPositions[idx] += Math.sin(performance.now() * 0.0012 + i) * dt * 3.2;
          this.weatherPositions[idx + 2] += roadMovement * 0.45;
          if (this.weatherPositions[idx + 2] > 25) {
            this.weatherPositions[idx + 2] = -220 - Math.random() * 30;
            this.weatherPositions[idx] = (Math.random() - 0.5) * 55;
          }
        } else if (currentActiveWeather === 'neon_snow') {
          this.weatherPositions[idx + 1] -= dt * 14;
          this.weatherPositions[idx] += Math.sin(performance.now() * 0.0025 + i * 0.8) * dt * 6.5;
          this.weatherPositions[idx + 2] += roadMovement * 0.55;
          if (this.weatherPositions[idx + 1] < 0) {
            this.weatherPositions[idx + 1] = 24 + Math.random() * 3;
            this.weatherPositions[idx + 2] = -Math.random() * 220;
            this.weatherPositions[idx] = (Math.random() - 0.5) * 50;
          }
        } else if (currentActiveWeather === 'embers') {
          this.weatherPositions[idx + 1] += dt * 12;
          this.weatherPositions[idx] += Math.sin(performance.now() * 0.002 + i) * dt * 3;
          if (this.weatherPositions[idx + 1] > 25) {
            this.weatherPositions[idx + 1] = 0;
            this.weatherPositions[idx + 2] = -Math.random() * 220;
          }
        } else if (currentActiveWeather === 'warp_stars') {
          this.weatherPositions[idx + 2] += (this.speed * 0.28 + 20) * dt;
          if (this.weatherPositions[idx + 2] > 20) {
            this.weatherPositions[idx + 2] = -240;
            this.weatherPositions[idx] = (Math.random() - 0.5) * 50;
            this.weatherPositions[idx + 1] = Math.random() * 25;
          }
        }
      }
      this.weatherParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Spawners (challenging progressive level scaling without impossible speed spikes)
    this.spawnTimer += dt;
    const spawnInterval = Math.max(0.42, 1.05 - (level - 1) * 0.06 - this.distance / 10000);
    if (this.spawnTimer > spawnInterval) {
      this.spawnTraffic();
      this.spawnTimer = 0;
    }

    this.pickupTimer += dt;
    if (this.pickupTimer > 2.4) {
      this.spawnCashPickup();
      this.pickupTimer = 0;
    }

    // Camera follow & shake (smoothly tracks player on curved road)
    if (this.cameraShake > 0) {
      this.cameraShake -= dt * 2.8;
      const shakeAmt = Math.max(0, this.cameraShake) * 0.45;
      this.camera.position.x = (this.playerGroup?.position.x || 0) * 0.65 + (Math.random() - 0.5) * shakeAmt;
      this.camera.position.y = 4.8 + (Math.random() - 0.5) * shakeAmt;
    } else {
      this.camera.position.x = (this.playerGroup?.position.x || 0) * 0.65;
      this.camera.position.y = 4.8;
    }

    const px = this.playerGroup?.position.x || 0;

    // Traffic Update
    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const t = this.traffic[i];
      const relSpeed = Math.max(4.5, (this.speed - t.speed) * 0.052 + 6.5);

      // Safe multi-lane navigation (only switch well ahead of player into an unobstructed adjacent lane)
      t.laneChangeTimer -= dt;
      if (t.laneChangeTimer <= 0 && Math.abs(t.group.position.z - pz) > 32) {
        const shift = Math.random() > 0.5 ? 1 : -1;
        const candidateLane = Math.max(-2, Math.min(2, t.lane + shift));
        if (candidateLane !== t.lane) {
          const blocked = this.traffic.some(
            (other) =>
              other !== t &&
              (other.lane === candidateLane || other.targetLane === candidateLane) &&
              Math.abs(other.group.position.z - t.group.position.z) < (t.length + other.length) * 0.7 + 12
          );
          if (!blocked) {
            t.targetLane = candidateLane;
            t.lane = candidateLane;
          }
        }
        t.laneChangeTimer = Math.max(2.2, 4.8 - level * 0.22) + Math.random() * 4.5;
      }
      const targetLaneX = t.targetLane * this.laneWidth;
      const laneDx = targetLaneX - t.currentX;
      t.currentX += laneDx * Math.min(1, dt * 2.6);

      t.group.position.z += relSpeed * dt;
      t.group.position.x = t.currentX + this.getRoadCurveX(t.group.position.z);
      const dCurve = this.getRoadCurveX(t.group.position.z - 3) - this.getRoadCurveX(t.group.position.z + 3);
      t.group.rotation.y = Math.atan2(dCurve, 6) - laneDx * 0.04;

      if (t.isPolice && t.policeLights) {
        t.cycle += dt * 14;
        const phase = Math.sin(t.cycle);
        t.policeLights.r.intensity = phase > 0 ? 3.5 : 0.2;
        t.policeLights.b.intensity = phase <= 0 ? 3.5 : 0.2;
      }

      const cx = Math.abs(px - t.group.position.x);
      const cz = Math.abs(pz - t.group.position.z);
      const hitX = t.width * 0.45 + 0.88;
      const hitZ = t.length * 0.45 + 2.0;

      // Risky Overtake / Near-Miss Bonus (accurate for trucks, buses, SUVs & cars)
      if (!t.passed && t.group.position.z - t.length * 0.42 > pz) {
        t.passed = true;
        if (cx >= hitX && cx < hitX + 1.55) {
          this.combo = Math.min(8, this.combo + 1);
          this.comboTimer = 3.8;
          this.nearMisses++;
          this.nitro = Math.min(100, this.nitro + 16);
          this.score += 350 * this.combo * weather.bonusMultiplier;
          this.cashCollectedThisRun += Math.round(65 * this.combo * multiplierBonus);
          sound.playNearMiss();
          this.checkMissionProgress('near_miss', 1);
        }
      }

      // Collision: High-Stakes Instant Crash (No Shields) using actual vehicle dimensions
      if (cx < hitX && cz < hitZ) {
        this.triggerCrash();
        break;
      }

      if (t.group.position.z > 30) {
        this.disposeObject(t.group);
        this.traffic.splice(i, 1);
      }
    }

    // Spatial Traffic Audio & Highway Traffic Horns
    this.trafficHornTimer -= dt;
    this.spatialAudioTimer += dt;
    if (this.spatialAudioTimer > 0.1) {
      this.spatialAudioTimer = 0;
      let closestDist = 999;
      let closestRelX = 0;
      let closestRelZ = 0;
      let closestType: 'bus' | 'truck' | 'police' | 'car' | 'suv' = 'car';

      for (const t of this.traffic) {
        const rx = t.group.position.x - px;
        const rz = t.group.position.z - pz;
        const dist = Math.hypot(rx, rz);
        if (dist < closestDist) {
          closestDist = dist;
          closestRelX = rx;
          closestRelZ = rz;
          closestType = t.vehicleType || 'car';
        }
      }

      // Traffic honks randomly as player approaches within 42m
      if (this.trafficHornTimer <= 0 && closestDist < 42) {
        sound.playTrafficHorn(closestType, closestRelX, closestRelZ);
        this.trafficHornTimer = 2.4 + Math.random() * 3.6;
      }
    }

    // Update Cash Bundles & Nitro Powerups (with magnet pull radius upgrade)
    const magnetPullRadius = 2.8 + (this.upgrades.magnetLevel - 1) * 2.2;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.group.position.z += roadMovement;
      p.group.position.x = p.lane * this.laneWidth + this.getRoadCurveX(p.group.position.z);
      p.group.rotation.y += dt * 3.5;

      if (this.playerGroup && p.active) {
        const distToCar = this.playerGroup.position.distanceTo(p.group.position);
        if (distToCar < magnetPullRadius && distToCar >= 2.5) {
          // Gently pull lane coordinate toward car when inside magnet radius
          const targetLane = (this.playerGroup.position.x - this.getRoadCurveX(p.group.position.z)) / this.laneWidth;
          p.lane += (targetLane - p.lane) * Math.min(1, dt * 8.5);
          p.group.position.x = p.lane * this.laneWidth + this.getRoadCurveX(p.group.position.z);
        }
        if (distToCar < 2.5) {
          p.active = false;
          if (p.type === 'cash_bundle') {
            sound.playCashCollect();
            const earned = Math.round(p.value * multiplierBonus);
            this.cashCollectedThisRun += earned;
            this.score += 250;
            this.checkMissionProgress('cash_collect', 1);
            this.onCashCollected(earned, `+৳${earned}`);
          } else {
            sound.tone(600, 0.1, 'sine', 0.15);
            this.nitro = 100;
            this.score += 200;
            this.cashCollectedThisRun += Math.round(p.value * multiplierBonus);
          }
          this.disposeObject(p.group);
          this.pickups.splice(i, 1);
          continue;
        }
      }

      if (p.group.position.z > 25) {
        this.disposeObject(p.group);
        this.pickups.splice(i, 1);
      }
    }

    // Record frames for cinematic replay
    this.replayFrames.push({
      playerX: this.playerGroup?.position.x || 0,
      playerRotY: this.playerGroup?.rotation.y || 0,
      playerRotZ: this.playerGroup?.rotation.z || 0,
      speed: this.speed,
      roadMovement,
      distance: this.distance,
    });
    if (this.replayFrames.length > 320) {
      this.replayFrames.shift();
    }

    // Broadcast stats
    this.onStatsUpdate({
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      speed: Math.floor(this.speed),
      maxSpeed: Math.floor(this.maxSpeedAchieved),
      nitro: Math.floor(this.nitro),
      shields: 0,
      maxShields: 0,
      combo: this.combo,
      comboTimer: this.comboTimer,
      policeActive: this.policeActive,
      policeEscortActive: false,
      policeEscortTimer: 0,
      policeEscortMultiplier: 1.0,
      nearMisses: this.nearMisses,
      cashCollectedThisRun: this.cashCollectedThisRun,
      activeMission: this.missions[this.activeMissionIndex],
      magnetActive: this.upgrades.magnetLevel > 1,
      level,
      weather: this.getWeatherState(),
      weatherAlert: this.weatherAlert,
      radio: sound.getRadioState(),
    });
  }

  // Cinematic Replay System
  public isReplaying = false;
  private replayIndex = 0;
  private onReplayFinished: (() => void) | null = null;
  public replayFrames: Array<{
    playerX: number;
    playerRotY: number;
    playerRotZ: number;
    speed: number;
    roadMovement: number;
    distance: number;
  }> = [];

  public playCinematicReplay(onFinished?: () => void) {
    if (this.replayFrames.length === 0) {
      if (onFinished) onFinished();
      return;
    }
    this.isReplaying = true;
    this.replayIndex = 0;
    this.onReplayFinished = onFinished || null;
    if (this.playerGroup) this.playerGroup.visible = true;
  }

  public stopReplay() {
    this.isReplaying = false;
    this.replayIndex = 0;
    this.currentFov = 65;
    this.camera.fov = 65;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 4.8, 9.8);
    this.camera.rotation.set(-0.22, 0, 0);
    if (this.onReplayFinished) {
      const cb = this.onReplayFinished;
      this.onReplayFinished = null;
      cb();
    }
  }

  private updateReplay(dt: number) {
    if (this.replayIndex >= this.replayFrames.length) {
      this.stopReplay();
      return;
    }
    const frame = this.replayFrames[this.replayIndex++];
    if (this.playerGroup) {
      this.playerGroup.position.x = frame.playerX;
      this.playerGroup.rotation.y = frame.playerRotY;
      this.playerGroup.rotation.z = frame.playerRotZ;
    }
    for (let w = 0; w < this.playerWheels.length; w++) {
      this.playerWheels[w].rotation.x -= frame.speed * 0.16 * dt;
    }

    // Scroll procedural PBR road/terrain UVs during replay
    if (this.roadTexBundle) {
      const uvDelta = (frame.roadMovement * this.roadTexBundle.repeatY) / 1500;
      this.roadTexBundle.map.offset.y = (this.roadTexBundle.map.offset.y + uvDelta) % 1;
      this.roadTexBundle.bumpMap.offset.y = (this.roadTexBundle.bumpMap.offset.y + uvDelta) % 1;
      this.roadTexBundle.roughnessMap.offset.y = (this.roadTexBundle.roughnessMap.offset.y + uvDelta) % 1;
    }
    if (this.terrainTexBundle) {
      const tDelta = (frame.roadMovement * this.terrainTexBundle.repeatY) / 1500;
      this.terrainTexBundle.map.offset.y = (this.terrainTexBundle.map.offset.y + tDelta) % 1;
    }

    // Deform road & secondary flyover curves synchronously with recorded replay distance
    if (this.roadMesh && this.currentTheme.hasCurves && this.roadMesh.userData.baseXs) {
      const posAttr = this.roadMesh.geometry.attributes.position;
      const baseXs: Float32Array = this.roadMesh.userData.baseXs;
      for (let i = 0; i < posAttr.count; i++) {
        const localY = posAttr.getY(i);
        const worldZ = this.roadMesh.position.z - localY;
        posAttr.setX(i, baseXs[i] + this.getRoadCurveX(worldZ, frame.distance));
      }
      posAttr.needsUpdate = true;
    }
    if (this.secondaryRoadMesh && this.currentTheme.hasCurves && this.secondaryRoadMesh.userData.baseXs) {
      const posAttr = this.secondaryRoadMesh.geometry.attributes.position;
      const baseXs: Float32Array = this.secondaryRoadMesh.userData.baseXs;
      for (let i = 0; i < posAttr.count; i++) {
        const localY = posAttr.getY(i);
        const worldZ = this.secondaryRoadMesh.position.z - localY;
        posAttr.setX(i, baseXs[i] + this.getRoadCurveX(worldZ, frame.distance));
      }
      posAttr.needsUpdate = true;
    }

    this.roadLines.forEach((line) => {
      line.position.z += frame.roadMovement;
      if (line.position.z > 25) line.position.z -= 1400;
      if (line.userData.baseX !== undefined) {
        line.position.x = line.userData.baseX + this.getRoadCurveX(line.position.z, frame.distance);
        const dCurv =
          this.getRoadCurveX(line.position.z - 3, frame.distance) -
          this.getRoadCurveX(line.position.z + 3, frame.distance);
        line.rotation.y = Math.atan2(dCurv, 6);
      }
    });

    this.guardrails.forEach((rail) => {
      rail.position.z += frame.roadMovement;
      if (rail.position.z > 25) rail.position.z -= 1400;
      if (rail.userData.side !== undefined) {
        rail.position.x = rail.userData.side * 14.2 + this.getRoadCurveX(rail.position.z, frame.distance);
        const dCurv =
          this.getRoadCurveX(rail.position.z - 4, frame.distance) -
          this.getRoadCurveX(rail.position.z + 4, frame.distance);
        rail.rotation.y = Math.atan2(dCurv, 8);
      }
    });

    this.streetLamps.forEach((lamp) => {
      lamp.position.z += frame.roadMovement;
      if (lamp.position.z > 35) lamp.position.z -= 1300;
      if (lamp.userData.baseX !== undefined) {
        lamp.position.x = lamp.userData.baseX + this.getRoadCurveX(lamp.position.z, frame.distance);
        const dCurv =
          this.getRoadCurveX(lamp.position.z - 3, frame.distance) -
          this.getRoadCurveX(lamp.position.z + 3, frame.distance);
        lamp.rotation.y = Math.atan2(dCurv, 6);
      }
    });

    this.buildings.forEach((b) => {
      b.position.z += frame.roadMovement * 0.85;
      if (b.position.z > 60) b.position.z -= 1300;
      if (b.userData.baseX !== undefined) {
        b.position.x = b.userData.baseX + this.getRoadCurveX(b.position.z, frame.distance);
      }
    });

    this.roadsideTrees.forEach((t) => {
      t.position.z += frame.roadMovement;
      if (t.position.z > 40) t.position.z -= 1300;
      if (t.userData.baseX !== undefined) {
        t.position.x = t.userData.baseX + this.getRoadCurveX(t.position.z, frame.distance);
      }
    });

    this.metroRailPillars.forEach((p) => {
      p.position.z += frame.roadMovement;
      if (p.position.z > 40) p.position.z -= 1300;
      p.position.x = (p.userData.baseX ?? -17.5) + this.getRoadCurveX(p.position.z, frame.distance);
      const dCurv =
        this.getRoadCurveX(p.position.z - 4, frame.distance) -
        this.getRoadCurveX(p.position.z + 4, frame.distance);
      p.rotation.y = Math.atan2(dCurv, 8);
    });

    this.overheadSignboards.forEach((s) => {
      s.position.z += frame.roadMovement;
      if (s.position.z > 35) s.position.z -= 1120;
      s.position.x = (s.userData.baseX ?? 0) + this.getRoadCurveX(s.position.z, frame.distance);
      const dCurv =
        this.getRoadCurveX(s.position.z - 4, frame.distance) -
        this.getRoadCurveX(s.position.z + 4, frame.distance);
      s.rotation.y = Math.atan2(dCurv, 8);
    });

    this.marineDriveObjects.forEach((mObj) => {
      mObj.position.z += frame.roadMovement;
      if (mObj.position.z > 60) mObj.position.z -= 1300;
      if (mObj.userData.baseX !== undefined) {
        mObj.position.x = mObj.userData.baseX + this.getRoadCurveX(mObj.position.z, frame.distance);
      }
    });

    if (this.metroTrain) {
      this.metroTrain.position.z += frame.roadMovement - 26 * dt;
      if (this.metroTrain.position.z > 80) this.metroTrain.position.z -= 1300;
      this.metroTrain.position.x =
        (this.metroTrain.userData.baseX ?? -17.5) + this.getRoadCurveX(this.metroTrain.position.z, frame.distance);
      const dCurv =
        this.getRoadCurveX(this.metroTrain.position.z - 6, frame.distance) -
        this.getRoadCurveX(this.metroTrain.position.z + 6, frame.distance);
      this.metroTrain.rotation.y = Math.atan2(dCurv, 12);
    }

    this.pedestrianManager.update(dt, frame.roadMovement, (z) => this.getRoadCurveX(z, frame.distance));
    this.updateSecondaryTraffic(dt, frame.roadMovement, frame.distance);

    // Dynamic 3-Angle Cinematic Camera Switch
    const progress = this.replayIndex / this.replayFrames.length;
    if (progress < 0.35) {
      // Angle 1: Low dynamic chase cam
      this.camera.position.set(frame.playerX * 0.7 + 1.2, 2.4, 7.8);
      this.camera.lookAt(frame.playerX, 1.0, -10);
    } else if (progress < 0.70) {
      // Angle 2: Close wheel-level side speed shot
      this.camera.position.set(frame.playerX - 2.8, 1.2, 3.8);
      this.camera.lookAt(frame.playerX + 0.4, 0.9, -12);
    } else {
      // Angle 3: High sweeping overhead shot
      this.camera.position.set(frame.playerX * 0.5 - 2.0, 5.8, 9.5);
      this.camera.lookAt(frame.playerX, 0.9, -6);
    }
  }

  private updatePostCrashAndIdle(dt: number) {
    // Animate crash debris chunks
    for (let i = this.debrisList.length - 1; i >= 0; i--) {
      const d = this.debrisList[i];
      d.life -= dt;
      d.vel.y -= 24 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      if (d.mesh.position.y < 0.1) {
        d.mesh.position.y = 0.1;
        d.vel.y *= -0.45;
      }
      d.mesh.rotation.x += d.rotVel.x * dt;
      d.mesh.rotation.y += d.rotVel.y * dt;
      d.mesh.rotation.z += d.rotVel.z * dt;
      (d.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, d.life);
      if (d.life <= 0) {
        this.disposeObject(d.mesh);
        this.debrisList.splice(i, 1);
      }
    }

    // Decay camera shake during crash window
    if (this.cameraShake > 0) {
      this.cameraShake -= dt * 2.8;
      const shakeAmt = Math.max(0, this.cameraShake) * 0.45;
      this.camera.position.x = (this.playerGroup?.position.x || 0) * 0.65 + (Math.random() - 0.5) * shakeAmt;
      this.camera.position.y = 4.8 + (Math.random() - 0.5) * shakeAmt;
    }

    // Subtle idle ambient motion on clouds & ocean in Main Menu
    if (this.cloudsGroup) {
      this.cloudsGroup.children.forEach((c) => {
        c.position.x += dt * 2.5;
        if (c.position.x > 320) c.position.x = -320;
      });
    }
    if (this.oceanMesh) {
      this.oceanTime += dt * 1.2;
      this.oceanMesh.position.y = -0.6 + Math.sin(this.oceanTime) * 0.12;
    }
  }

  private animate = () => {
    this.reqId = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.isReplaying) {
      this.updateReplay(dt);
    } else if (this.isRunning && !this.isPaused) {
      this.update(dt);
    } else if (!this.isPaused) {
      this.updatePostCrashAndIdle(dt);
    }
    this.renderer.render(this.scene, this.camera);
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
    if (this.reqId !== null) {
      cancelAnimationFrame(this.reqId);
      this.reqId = null;
    }
  };

  private onContextRestored = () => {
    this.clock.getDelta();
    if (this.reqId === null) {
      this.animate();
    }
  };

  private onResize = () => {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  public cycleRadioStation() {
    return sound.cycleRadioStation();
  }

  public destroy() {
    this.clearScheduledTimeouts();
    if (this.reqId !== null) cancelAnimationFrame(this.reqId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);

    this.pedestrianManager.destroy();
    this.cleanMarineDrive();
    this.cleanSecondaryRoad();

    this.traffic.forEach((t) => this.disposeObject(t.group));
    this.traffic = [];
    this.pickups.forEach((p) => this.disposeObject(p.group));
    this.pickups = [];
    this.debrisList.forEach((d) => this.disposeObject(d.mesh));
    this.debrisList = [];
    if (this.playerGroup) {
      this.disposeObject(this.playerGroup);
      this.playerGroup = null;
    }
    if (this.roadMesh) {
      this.disposeObject(this.roadMesh);
      this.roadMesh = null;
    }
    if (this.groundMesh) {
      this.disposeObject(this.groundMesh);
      this.groundMesh = null;
    }
    this.guardrails.forEach((g) => this.disposeObject(g));
    this.guardrails = [];
    this.roadLines.forEach((l) => this.disposeObject(l));
    this.roadLines = [];
    this.streetLamps.forEach((l) => this.disposeObject(l));
    this.streetLamps = [];
    this.buildings.forEach((b) => this.disposeObject(b));
    this.buildings = [];
    this.roadsideTrees.forEach((t) => this.disposeObject(t));
    this.roadsideTrees = [];
    this.rainPuddles.forEach((p) => this.disposeObject(p));
    this.rainPuddles = [];
    this.metroRailPillars.forEach((p) => this.disposeObject(p));
    this.metroRailPillars = [];
    if (this.metroTrain) {
      this.disposeObject(this.metroTrain);
      this.metroTrain = null;
    }
    this.overheadSignboards.forEach((s) => this.disposeObject(s));
    this.overheadSignboards = [];

    if (this.stars) {
      this.disposeObject(this.stars);
      this.stars = null;
    }
    if (this.skyMesh) {
      this.disposeObject(this.skyMesh);
      this.skyMesh = null;
    }
    if (this.sunMesh) {
      this.disposeObject(this.sunMesh);
      this.sunMesh = null;
    }
    if (this.sunGlowMesh) {
      this.disposeObject(this.sunGlowMesh);
      this.sunGlowMesh = null;
    }
    if (this.cloudsGroup) {
      this.disposeObject(this.cloudsGroup);
      this.cloudsGroup = null;
    }
    if (this.weatherParticles) {
      this.disposeObject(this.weatherParticles);
      this.weatherParticles = null;
    }

    if (this.roadTexBundle) {
      this.roadTexBundle.dispose();
      this.roadTexBundle = null;
    }
    if (this.flyoverTexBundle) {
      this.flyoverTexBundle.dispose();
      this.flyoverTexBundle = null;
    }
    if (this.terrainTexBundle) {
      this.terrainTexBundle.dispose();
      this.terrainTexBundle = null;
    }
    if (this.contactShadowTex) {
      this.contactShadowTex.dispose();
      this.contactShadowTex = null;
    }
    if (this.headlightBeamTex) {
      this.headlightBeamTex.dispose();
      this.headlightBeamTex = null;
    }
    if (this.envRenderTarget) {
      this.envRenderTarget.dispose();
      this.envRenderTarget = null;
    }

    sound.setInGame(false);
    sound.stopEngine();
    sound.stopMusic();
    this.renderer.dispose();
  }
}
