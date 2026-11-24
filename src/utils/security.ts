/**
 * Tamper-protection & encrypted storage utility for Speed Tycoon 3D (Highway Edition)
 * Protects localStorage data and runtime state against devtools inspection and unauthorized tampering.
 */

const SALT = 'ST3D_HWY_SECURE_HASH_v7_';
const LEGACY_SALT = ['ST3D', 'DHAKA', 'SECURE', 'HASH', 'v6', 'BGD', ''].join('_');

function simpleHash(str: string): string {
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 33) ^ char;
  }
  return (Math.abs(hash1) >>> 0).toString(36) + (Math.abs(hash2) >>> 0).toString(36);
}

function scramble(data: string): string {
  try {
    const b64 = btoa(encodeURIComponent(data));
    return b64.split('').reverse().join('');
  } catch {
    return data;
  }
}

function unscramble(data: string): string {
  try {
    const rev = data.split('').reverse().join('');
    return decodeURIComponent(atob(rev));
  } catch {
    return data;
  }
}

export function saveSecure(key: string, value: any): void {
  try {
    const raw = JSON.stringify(value);
    const checksum = simpleHash(SALT + key + raw);
    const payload = JSON.stringify({ d: scramble(raw), c: checksum, t: Date.now() });
    localStorage.setItem(key, payload);
  } catch {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }
}

export function loadSecure<T>(key: string, fallback: T): T {
  try {
    const rawItem = localStorage.getItem(key);
    if (!rawItem) return fallback;

    if (rawItem.startsWith('{"d":') && rawItem.includes('"c":')) {
      const parsed = JSON.parse(rawItem);
      const decoded = unscramble(parsed.d);
      const expectedChecksum = simpleHash(SALT + key + decoded);
      const legacyChecksum = simpleHash(LEGACY_SALT + key + decoded);

      if (parsed.c === expectedChecksum || parsed.c === legacyChecksum) {
        return JSON.parse(decoded) as T;
      } else {
        return fallback;
      }
    }

    const old = JSON.parse(rawItem);
    return old as T;
  } catch {
    return fallback;
  }
}

/**
 * Validates any cash increment to prevent memory injection attacks.
 */
export function sanitizeCash(amount: number, maxAllowed = 100000): number {
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount) || amount < 0) {
    return 0;
  }
  return Math.min(amount, maxAllowed);
}

/**
 * Setup anti-tampering & source-protection guards on browser window:
 * - Disables inspect/save/view-source shortcuts (F12, Ctrl+Shift+I/J/C/K, Ctrl+U/S)
 * - Disables right-click context menu & asset drag-saving
 * - Freezes cheat identifiers
 */
export function initAntiCheatGuards(): void {
  if (typeof window === 'undefined') return;

  // Prevent right-click context menu
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  }, { capture: true });

  // Prevent dragging assets/images to save
  window.addEventListener('dragstart', (e) => {
    e.preventDefault();
  }, { capture: true });

  // Prevent developer / save / view-source shortcuts
  window.addEventListener('keydown', (e) => {
    const k = e.key ? e.key.toLowerCase() : '';
    const mod = e.ctrlKey || e.metaKey;
    if (
      e.key === 'F12' ||
      (mod && e.shiftKey && (k === 'i' || k === 'j' || k === 'c' || k === 'k')) ||
      (mod && e.altKey && (k === 'i' || k === 'j' || k === 'c')) ||
      (mod && (k === 'u' || k === 's'))
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { capture: true });

  // Lock tamper-proof variables in global scope
  try {
    ['_speedTycoonCheats', 'hackWallet', 'giveCash', 'setSpeed'].forEach((prop) => {
      Object.defineProperty(window, prop, {
        value: undefined,
        writable: false,
        configurable: false,
      });
    });
  } catch {}
}
