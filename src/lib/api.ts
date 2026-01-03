import { AppData } from '@/types/grocery';

// Configure this to your NUC's Tailscale IP
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://100.x.x.x:3001/api';

export async function syncWithServer(localData: AppData): Promise<AppData | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: localData,
        lastSynced: localData.lastSynced,
      }),
    });

    if (!response.ok) {
      throw new Error('Sync failed');
    }

    const result = await response.json();
    return {
      ...result.data,
      lastSynced: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('Sync failed, working offline:', error);
    return null;
  }
}

export async function checkServerConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
