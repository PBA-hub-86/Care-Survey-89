/**
 * Tamper-protection, stream-cipher storage & anti-cheat integrity utility for Speed Tycoon 3D.
 * Protects saved progression, run payouts, and client runtime against devtools tampering.
 */

const SALT = 'ST3D_HWY_V8_X9K2_GUARD_';
const LEGACY_SALT_V7 = 'ST3D_HWY_SECURE_HASH_v7_';
const LEGACY_SALT_V6 = ['ST3D', 'DHAKA', 'SECURE', 'HASH', 'v6', 'BGD', ''].join('_');

const CHEAT_KEYS = [
  '_speedTycoonCheats',
  'hackWallet',
  'giveCash',
  'setSpeed',
  'unlockAll',
  'godMode',
  'addMoney',
  'setScore',
  '__ST3D_DEBUG__',
] as const;

// In-memory signed cache to detect external localStorage tampering from devtools console
const memoryMirror = new Map<string, string>();

function dualIntegrityHash(str: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + ((i * 31) & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
    h2 ^= h2 >>> 13;
  }
  return ((h1 >>> 0).toString(36) + '-' + (h2 >>> 0).toString(36));
}

function legacySimpleHash(str: string): string {
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 33) ^ char;
  }
  return (Math.abs(hash1) >>> 0).toString(36) + (Math.abs(hash2) >>> 0).toString(36);
}

function xorCipher(plain: string, nonce: string): string {
  const key = SALT + nonce;
  const out: number[] = [];
  for (let i = 0; i < plain.length; i++) {
    const code = plain.charCodeAt(i) ^ key.charCodeAt(i % key.length) ^ ((i * 17) & 0xff);
    out.push(code);
  }
  const binary = String.fromCharCode(...out.map((n) => n & 0xff));
  // Encode UTF-8 safely first before XOR when possible
  try {
    return btoa(binary);
  } catch {
    return btoa(unescape(encodeURIComponent(plain)));
  }
}

function xorEncryptUtf8(plain: string, nonce: string): string {
  const utf8 = unescape(encodeURIComponent(plain));
  return xorCipher(utf8, nonce);
}

function xorDecryptUtf8(b64: string, nonce: string): string {
  const binary = atob(b64);
  const key = SALT + nonce;
  let raw = '';
  for (let i = 0; i < binary.length; i++) {
    const code = binary.charCodeAt(i) ^ key.charCodeAt(i % key.length) ^ ((i * 17) & 0xff);
    raw += String.fromCharCode(code & 0xff);
  }
  return decodeURIComponent(escape(raw));
}

function legacyUnscramble(data: string): string {
  try {
    const rev = data.split('').reverse().join('');
    return decodeURIComponent(atob(rev));
  } catch {
    return data;
  }
}

export function saveSecure(key: string, value: unknown): void {
  try {
    const raw = JSON.stringify(value);
    const nonce = Math.floor(Math.random() * 0xffffff)
      .toString(36)
      .padStart(4, '0');
    const encrypted = xorEncryptUtf8(raw, nonce);
    const sig = dualIntegrityHash(SALT + nonce + '|' + key + '|' + raw);
    const payload = JSON.stringify({ v: 2, n: nonce, d: encrypted, s: sig, t: Date.now() });
    localStorage.setItem(key, payload);
    memoryMirror.set(key, payload);
  } catch {
    // Do not write raw unencrypted state on failure
  }
}

export function loadSecure<T>(key: string, fallback: T): T {
  try {
    const rawItem = localStorage.getItem(key);
    if (!rawItem) return fallback;

    const parsed = JSON.parse(rawItem);

    // Encrypted v2 envelope
    if (parsed && parsed.v === 2 && typeof parsed.n === 'string' && typeof parsed.d === 'string' && typeof parsed.s === 'string') {
      const decoded = xorDecryptUtf8(parsed.d, parsed.n);
      const expected = dualIntegrityHash(SALT + parsed.n + '|' + key + '|' + decoded);
      if (parsed.s === expected) {
        memoryMirror.set(key, rawItem);
        return JSON.parse(decoded) as T;
      }
      return fallback;
    }

    // Legacy v1 envelope (migrate cleanly to v2 on match)
    if (parsed && typeof parsed.d === 'string' && typeof parsed.c === 'string') {
      const decoded = legacyUnscramble(parsed.d);
      const c7 = legacySimpleHash(LEGACY_SALT_V7 + key + decoded);
      const c6 = legacySimpleHash(LEGACY_SALT_V6 + key + decoded);
      if (parsed.c === c7 || parsed.c === c6) {
        const val = JSON.parse(decoded) as T;
        saveSecure(key, val);
        return val;
      }
      return fallback;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Validates any cash increment to prevent memory injection attacks.
 */
export function sanitizeCash(amount: number, maxAllowed = 100000): number {
  if (typeof amount !== 'number' || Number.isNaN(amount) || !Number.isFinite(amount) || amount < 0) {
    return 0;
  }
  return Math.min(Math.floor(amount), maxAllowed);
}

/**
 * Clamps end-of-run payouts and speeds against impossible memory edits.
 */
export function validateRunOutcome(params: {
  score: number;
  distance: number;
  maxSpeed: number;
  earnedCash: number;
  nearMisses: number;
  carTopSpeed: number;
  carNitroBoost: number;
  engineLevel: number;
  nitroLevel: number;
  multiplierLevel: number;
}): {
  score: number;
  distance: number;
  maxSpeed: number;
  earnedCash: number;
  nearMisses: number;
} {
  const safeDist = Math.max(0, Math.min(Math.floor(params.distance || 0), 250000));
  const safeMisses = Math.max(0, Math.min(Math.floor(params.nearMisses || 0), Math.floor(safeDist / 10) + 25));

  const engineBonuses = [0, 15, 30, 50, 75];
  const engBonus = engineBonuses[Math.min(4, Math.max(0, (params.engineLevel || 1) - 1))];
  const nitroBonus = Math.max(0, (params.nitroLevel || 1) - 1) * 18;
  const theoreticalMaxSpeed = Math.round((params.carTopSpeed || 240) + engBonus + (params.carNitroBoost || 80) + nitroBonus + 12);

  const safeSpeed = Math.max(0, Math.min(Math.floor(params.maxSpeed || 0), theoreticalMaxSpeed));
  const mult = 1 + Math.max(0, (params.multiplierLevel || 1) - 1) * 0.25;
  const maxTheoreticalCash = Math.round((safeDist * 2.4 + safeMisses * 650 + 25000) * mult);
  const safeCash = sanitizeCash(params.earnedCash, maxTheoreticalCash);

  const maxTheoreticalScore = Math.round(safeDist * 18 + safeMisses * 3200 + 15000);
  const safeScore = Math.max(0, Math.min(Math.floor(params.score || 0), maxTheoreticalScore));

  return {
    score: safeScore,
    distance: safeDist,
    maxSpeed: safeSpeed,
    earnedCash: safeCash,
    nearMisses: safeMisses,
  };
}

let guardsInitialized = false;

/**
 * Setup anti-tampering & source-protection guards on browser window:
 * - Disables inspect/save/view-source/copy shortcuts
 * - Disables right-click context menu & asset drag-saving
 * - Freezes common cheat identifiers
 * - Reverts external console mutations on game storage keys
 */
export function initAntiCheatGuards(): void {
  if (typeof window === 'undefined' || guardsInitialized) return;
  guardsInitialized = true;

  // Prevent right-click context menu
  window.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault();
    },
    { capture: true }
  );

  // Prevent dragging assets/images to save
  window.addEventListener(
    'dragstart',
    (e) => {
      e.preventDefault();
    },
    { capture: true }
  );

  // Prevent copying UI/game markup text outside editable fields
  window.addEventListener(
    'copy',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      e.preventDefault();
    },
    { capture: true }
  );

  // Prevent developer / save / view-source shortcuts
  window.addEventListener(
    'keydown',
    (e) => {
      const k = e.key ? e.key.toLowerCase() : '';
      const mod = e.ctrlKey || e.metaKey;
      if (
        e.key === 'F12' ||
        (mod && e.shiftKey && (k === 'i' || k === 'j' || k === 'c' || k === 'k')) ||
        (mod && e.altKey && (k === 'i' || k === 'j' || k === 'c')) ||
        (mod && (k === 'u' || k === 's' || k === 'p'))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { capture: true }
  );

  // Revert unauthorized cross-tab / console edits to our encrypted st3d_* keys
  window.addEventListener('storage', (e) => {
    if (!e.key || !e.key.startsWith('st3d_')) return;
    const trusted = memoryMirror.get(e.key);
    if (trusted && e.newValue !== trusted) {
      try {
        localStorage.setItem(e.key, trusted);
      } catch {}
    }
  });

  // Lock tamper-proof cheat identifiers in global scope
  try {
    CHEAT_KEYS.forEach((prop) => {
      if (!(prop in window)) {
        Object.defineProperty(window, prop, {
          value: undefined,
          writable: false,
          configurable: false,
        });
      }
    });
  } catch {}
}
