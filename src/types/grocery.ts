export type Unit = 'kg' | 'g' | 'l' | 'ml' | 'piece' | '';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  categoryId: string;
  bought: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: GroceryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipeItem {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  categoryId: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  portions: number;
  duration?: number; // Duration in minutes
  items: RecipeItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ItemHistoryEntry {
  name: string;
  categoryId: string;
  unit: Unit;
  count: number; // Usage frequency
}

export interface AppData {
  lists: ShoppingList[];
  recipes: Recipe[];
  categories: Category[];
  itemHistory: ItemHistoryEntry[]; // For autocomplete with category
  lastSynced: string | null;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'fruit', name: 'Fruits', color: 'category-fruit' },
  { id: 'vegetables', name: 'Vegetables', color: 'category-vegetables' },
  { id: 'meat', name: 'Meat', color: 'category-meat' },
  { id: 'fish', name: 'Fish', color: 'category-fish' },
  { id: 'pasta', name: 'Pasta & Rice', color: 'category-pasta' },
  { id: 'sauce', name: 'Sauce', color: 'category-sauce' },
  { id: 'biscuit', name: 'Biscuits', color: 'category-biscuit' },
  { id: 'breakfast', name: 'Breakfast', color: 'category-breakfast' },
  { id: 'milk', name: 'Dairy', color: 'category-milk' },
  { id: 'cleaning', name: 'Cleaning', color: 'category-cleaning' },
];

export const UNITS: { value: Unit; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'piece', label: 'pcs' },
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'l', label: 'L' },
  { value: 'ml', label: 'ml' },
];
