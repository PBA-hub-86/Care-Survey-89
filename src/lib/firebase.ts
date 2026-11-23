import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  type Firestore,
  type FirestoreSettings,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

function createFirestoreInstance(): Firestore {
  const dbId = firebaseConfig.firestoreDatabaseId || undefined;
  if (typeof window !== 'undefined') {
    const settings: FirestoreSettings = {
      experimentalForceLongPolling: true,
    };
    try {
      return initializeFirestore(app, settings, dbId);
    } catch {
      // Fallback if Firestore was already initialized in this app instance
      return dbId ? getFirestore(app, dbId) : getFirestore(app);
    }
  }
  return dbId ? getFirestore(app, dbId) : getFirestore(app);
}

export const db = createFirestoreInstance();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function isPermissionError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';
  return (
    code === 'permission-denied' ||
    msg.includes('Missing or insufficient permissions') ||
    msg.includes('PERMISSION_DENIED')
  );
}

function isOfflineOrNetworkError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    msg.includes('the client is offline') ||
    msg.includes('Could not reach') ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError')
  );
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };

  if (isPermissionError(error)) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  if (!isOfflineOrNetworkError(error)) {
    console.warn('Firestore Error:', JSON.stringify(errInfo));
  }
}

async function isFirestoreEndpointReachable(timeoutMs = 3500): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  if (typeof fetch !== 'function') {
    return true;
  }

  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}` +
    `/databases/${encodeURIComponent(databaseId)}/documents:runQuery?key=${encodeURIComponent(firebaseConfig.apiKey)}`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'leaderboard' }],
          limit: 1,
        },
      }),
      signal: controller?.signal,
    });
    // Any HTTP response confirms network reachability to Cloud Firestore backend
    return response.status > 0;
  } catch {
    return false;
  } finally {
    if (timer !== null) {
      clearTimeout(timer);
    }
  }
}

// Validate connection to Firestore on startup without triggering 10s WebChannel timeout spam when offline/blocked
async function testConnection() {
  try {
    const reachable = await isFirestoreEndpointReachable();
    if (!reachable) return;

    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      return;
    }
    if (!isOfflineOrNetworkError(error)) {
      handleFirestoreError(error, OperationType.GET, 'test/connection');
    }
  }
}
void testConnection();

export interface LeaderboardRecord {
  id?: string;
  playerName: string;
  score: number;
  distance: number;
  topSpeed: number;
  carName: string;
  createdAt: string;
}

export async function submitScore(record: Omit<LeaderboardRecord, 'id' | 'createdAt'>): Promise<void> {
  try {
    const reachable = await isFirestoreEndpointReachable();
    if (!reachable) return;

    const safeScore = Math.max(0, Math.min(100000000, Math.floor(Number(record.score) || 0)));
    const safeDistance = Math.max(0, Math.min(10000000, Math.floor(Number(record.distance) || 0)));
    const safeTopSpeed = Math.max(0, Math.min(2000, Math.floor(Number(record.topSpeed) || 0)));
    const safePlayerName = (record.playerName || 'Highway Racer').trim().slice(0, 64) || 'Highway Racer';
    const safeCarName = (record.carName || 'Supercar').trim().slice(0, 64) || 'Supercar';

    await addDoc(collection(db, 'leaderboard'), {
      playerName: safePlayerName,
      score: safeScore,
      distance: safeDistance,
      topSpeed: safeTopSpeed,
      carName: safeCarName,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'leaderboard');
  }
}

export async function fetchTopScores(): Promise<LeaderboardRecord[]> {
  try {
    const reachable = await isFirestoreEndpointReachable();
    if (!reachable) return [];

    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<LeaderboardRecord, 'id'>),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'leaderboard');
    return [];
  }
}
