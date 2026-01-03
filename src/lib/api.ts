import { AppData, ShoppingList, Recipe } from '@/types/grocery';

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

// Share token generation
export async function generateShareToken(
  type: 'list' | 'recipe',
  id: string
): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/share/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, id }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate share token');
    }

    const result = await response.json();
    return result.token;
  } catch (error) {
    console.error('Failed to generate share token:', error);
    return null;
  }
}

// Get shared item by token
export async function getSharedItem(
  type: 'list' | 'recipe',
  token: string
): Promise<{ data: ShoppingList | Recipe; id: string } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/share/${type}/${token}`);

    if (!response.ok) {
      throw new Error('Shared item not found');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get shared item:', error);
    return null;
  }
}

// Update shared item
export async function updateSharedItem(
  type: 'list' | 'recipe',
  token: string,
  data: ShoppingList | Recipe
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/share/${type}/${token}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to update shared item:', error);
    return false;
  }
}
