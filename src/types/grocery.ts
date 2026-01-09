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

export const CATEGORY_ICONS = [
  'apple', 'carrot', 'beef', 'fish', 'wheat', 'soup', 'cookie', 'coffee', 'milk', 'sparkles',
  'egg', 'pizza', 'sandwich', 'cake', 'candy', 'beer', 'wine', 'grape', 'cherry', 'banana',
  'leaf', 'salad', 'popcorn', 'ice-cream-cone', 'croissant', 'drumstick', 'circle-dot', 'citrus',
  'utensils', 'shopping-basket', 'package', 'pill', 'baby', 'dog', 'cat', 'home', 'spray-can',
] as const;

export type CategoryIcon = typeof CATEGORY_ICONS[number];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'fruit', name: 'Fruits', color: 'category-fruit', icon: 'apple' },
  { id: 'vegetables', name: 'Vegetables', color: 'category-vegetables', icon: 'carrot' },
  { id: 'meat', name: 'Meat', color: 'category-meat', icon: 'beef' },
  { id: 'fish', name: 'Fish', color: 'category-fish', icon: 'fish' },
  { id: 'pasta', name: 'Pasta & Rice', color: 'category-pasta', icon: 'wheat' },
  { id: 'sauce', name: 'Sauce', color: 'category-sauce', icon: 'soup' },
  { id: 'biscuit', name: 'Biscuits', color: 'category-biscuit', icon: 'cookie' },
  { id: 'breakfast', name: 'Breakfast', color: 'category-breakfast', icon: 'coffee' },
  { id: 'milk', name: 'Dairy', color: 'category-milk', icon: 'milk' },
  { id: 'cleaning', name: 'Cleaning', color: 'category-cleaning', icon: 'sparkles' },
];

export const UNITS: { value: Unit; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'piece', label: 'pcs' },
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'l', label: 'L' },
  { value: 'ml', label: 'ml' },
];
