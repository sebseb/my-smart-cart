import { AppData, DEFAULT_CATEGORIES, ItemHistoryEntry, Unit } from '@/types/grocery';

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
      // Migrate old string[] itemHistory to ItemHistoryEntry[]
      let migratedHistory = data.itemHistory || [];
      if (migratedHistory.length > 0 && typeof migratedHistory[0] === 'string') {
        migratedHistory = (migratedHistory as unknown as string[]).map(name => ({
          name: name,
          categoryId: '',
          unit: '' as Unit,
          count: 1,
        }));
      } else {
        // Ensure count and unit exist on all entries
        migratedHistory = (migratedHistory as ItemHistoryEntry[]).map(entry => ({
          ...entry,
          unit: entry.unit || '' as Unit,
          count: entry.count || 1,
        }));
      }
      // Ensure all required fields exist
      return {
        ...defaultData,
        ...data,
        itemHistory: migratedHistory as ItemHistoryEntry[],
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

export function addToItemHistory(itemName: string, categoryId: string, unit: Unit, data: AppData): AppData {
  const normalizedName = itemName.toLowerCase().trim();
  const existingIndex = data.itemHistory.findIndex(entry => entry.name === normalizedName);
  
  if (existingIndex >= 0) {
    // Update existing entry with new category, unit and increment count
    const updatedHistory = [...data.itemHistory];
    updatedHistory[existingIndex] = { 
      name: normalizedName, 
      categoryId,
      unit,
      count: (updatedHistory[existingIndex].count || 1) + 1,
    };
    return { ...data, itemHistory: updatedHistory };
  }
  
  return {
    ...data,
    itemHistory: [...data.itemHistory, { name: normalizedName, categoryId, unit, count: 1 }].slice(-500),
  };
}
