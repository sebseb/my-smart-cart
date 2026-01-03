import { AppData, DEFAULT_CATEGORIES } from '@/types/grocery';

const STORAGE_KEY = 'grocery-app-data';

const defaultData: AppData = {
  lists: [],
  recipes: [],
  categories: DEFAULT_CATEGORIES,
  itemHistory: [],
  lastSynced: null,
};

export function loadData(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as AppData;
      // Ensure all required fields exist
      return {
        ...defaultData,
        ...data,
        categories: data.categories?.length ? data.categories : DEFAULT_CATEGORIES,
      };
    }
  } catch (error) {
    console.error('Failed to load data from storage:', error);
  }
  return defaultData;
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data to storage:', error);
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function addToItemHistory(itemName: string, data: AppData): AppData {
  const normalizedName = itemName.toLowerCase().trim();
  if (!data.itemHistory.includes(normalizedName)) {
    return {
      ...data,
      itemHistory: [...data.itemHistory, normalizedName].slice(-500), // Keep last 500 items
    };
  }
  return data;
}
