import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppData, ShoppingList, Recipe, Category, GroceryItem, RecipeItem } from '@/types/grocery';
import { loadData, saveData, generateId, addToItemHistory } from '@/lib/storage';
import { syncWithServer, checkServerConnection } from '@/lib/api';

interface GroceryContextType {
  data: AppData;
  isOnline: boolean;
  isSyncing: boolean;
  
  // Shopping Lists
  createList: (name: string) => ShoppingList;
  updateList: (listId: string, updates: Partial<ShoppingList>) => void;
  deleteList: (listId: string) => void;
  
  // Items
  addItem: (listId: string, item: Omit<GroceryItem, 'id' | 'createdAt' | 'updatedAt' | 'bought'>) => void;
  updateItem: (listId: string, itemId: string, updates: Partial<GroceryItem>) => void;
  deleteItem: (listId: string, itemId: string) => void;
  toggleItemBought: (listId: string, itemId: string) => void;
  
  // Categories
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (categoryId: string, updates: Partial<Category>) => void;
  deleteCategory: (categoryId: string) => void;
  
  // Recipes
  createRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Recipe;
  updateRecipe: (recipeId: string, updates: Partial<Recipe>) => void;
  deleteRecipe: (recipeId: string) => void;
  addRecipeToList: (recipeId: string, listId: string, portions: number, selectedItems: RecipeItem[]) => void;
  
  // Autocomplete
  getAutocompleteSuggestions: (query: string) => string[];
  
  // Sync
  forceSync: () => Promise<void>;
}

const GroceryContext = createContext<GroceryContextType | null>(null);

export function GroceryProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check server connection periodically
  useEffect(() => {
    const checkConnection = async () => {
      const online = await checkServerConnection();
      setIsOnline(online);
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    saveData(data);
  }, [data]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && !isSyncing) {
      forceSync();
    }
  }, [isOnline]);

  const forceSync = useCallback(async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const synced = await syncWithServer(data);
      if (synced) {
        setData(synced);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [data, isSyncing]);

  // Shopping Lists
  const createList = useCallback((name: string): ShoppingList => {
    const newList: ShoppingList = {
      id: generateId(),
      name,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setData(prev => ({
      ...prev,
      lists: [...prev.lists, newList],
    }));
    
    return newList;
  }, []);

  const updateList = useCallback((listId: string, updates: Partial<ShoppingList>) => {
    setData(prev => ({
      ...prev,
      lists: prev.lists.map(list =>
        list.id === listId
          ? { ...list, ...updates, updatedAt: new Date().toISOString() }
          : list
      ),
    }));
  }, []);

  const deleteList = useCallback((listId: string) => {
    setData(prev => ({
      ...prev,
      lists: prev.lists.filter(list => list.id !== listId),
    }));
  }, []);

  // Items
  const addItem = useCallback((
    listId: string,
    item: Omit<GroceryItem, 'id' | 'createdAt' | 'updatedAt' | 'bought'>
  ) => {
    const newItem: GroceryItem = {
      ...item,
      id: generateId(),
      bought: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setData(prev => {
      const updated = {
        ...prev,
        lists: prev.lists.map(list =>
          list.id === listId
            ? {
                ...list,
                items: [...list.items, newItem],
                updatedAt: new Date().toISOString(),
              }
            : list
        ),
      };
      return addToItemHistory(item.name, updated);
    });
  }, []);

  const updateItem = useCallback((listId: string, itemId: string, updates: Partial<GroceryItem>) => {
    setData(prev => ({
      ...prev,
      lists: prev.lists.map(list =>
        list.id === listId
          ? {
              ...list,
              items: list.items.map(item =>
                item.id === itemId
                  ? { ...item, ...updates, updatedAt: new Date().toISOString() }
                  : item
              ),
              updatedAt: new Date().toISOString(),
            }
          : list
      ),
    }));
  }, []);

  const deleteItem = useCallback((listId: string, itemId: string) => {
    setData(prev => ({
      ...prev,
      lists: prev.lists.map(list =>
        list.id === listId
          ? {
              ...list,
              items: list.items.filter(item => item.id !== itemId),
              updatedAt: new Date().toISOString(),
            }
          : list
      ),
    }));
  }, []);

  const toggleItemBought = useCallback((listId: string, itemId: string) => {
    setData(prev => ({
      ...prev,
      lists: prev.lists.map(list =>
        list.id === listId
          ? {
              ...list,
              items: list.items.map(item =>
                item.id === itemId
                  ? { ...item, bought: !item.bought, updatedAt: new Date().toISOString() }
                  : item
              ),
              updatedAt: new Date().toISOString(),
            }
          : list
      ),
    }));
  }, []);

  // Categories
  const addCategory = useCallback((category: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...category,
      id: generateId(),
    };
    
    setData(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory],
    }));
  }, []);

  const updateCategory = useCallback((categoryId: string, updates: Partial<Category>) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId ? { ...cat, ...updates } : cat
      ),
    }));
  }, []);

  const deleteCategory = useCallback((categoryId: string) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat.id !== categoryId),
    }));
  }, []);

  // Recipes
  const createRecipe = useCallback((recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Recipe => {
    const newRecipe: Recipe = {
      ...recipe,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setData(prev => ({
      ...prev,
      recipes: [...prev.recipes, newRecipe],
    }));
    
    return newRecipe;
  }, []);

  const updateRecipe = useCallback((recipeId: string, updates: Partial<Recipe>) => {
    setData(prev => ({
      ...prev,
      recipes: prev.recipes.map(recipe =>
        recipe.id === recipeId
          ? { ...recipe, ...updates, updatedAt: new Date().toISOString() }
          : recipe
      ),
    }));
  }, []);

  const deleteRecipe = useCallback((recipeId: string) => {
    setData(prev => ({
      ...prev,
      recipes: prev.recipes.filter(recipe => recipe.id !== recipeId),
    }));
  }, []);

  const addRecipeToList = useCallback((
    recipeId: string,
    listId: string,
    portions: number,
    selectedItems: RecipeItem[]
  ) => {
    const recipe = data.recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    const portionMultiplier = portions / recipe.portions;

    setData(prev => ({
      ...prev,
      lists: prev.lists.map(list => {
        if (list.id !== listId) return list;

        const newItems: GroceryItem[] = selectedItems.map(item => ({
          id: generateId(),
          name: item.name,
          quantity: Math.round(item.quantity * portionMultiplier * 100) / 100,
          unit: item.unit,
          categoryId: item.categoryId,
          bought: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        return {
          ...list,
          items: [...list.items, ...newItems],
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  }, [data.recipes]);

  // Autocomplete
  const getAutocompleteSuggestions = useCallback((query: string): string[] => {
    if (!query || query.length < 2) return [];
    
    const normalizedQuery = query.toLowerCase().trim();
    return data.itemHistory
      .filter(item => item.includes(normalizedQuery))
      .slice(0, 5)
      .map(item => item.charAt(0).toUpperCase() + item.slice(1));
  }, [data.itemHistory]);

  const value: GroceryContextType = {
    data,
    isOnline,
    isSyncing,
    createList,
    updateList,
    deleteList,
    addItem,
    updateItem,
    deleteItem,
    toggleItemBought,
    addCategory,
    updateCategory,
    deleteCategory,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    addRecipeToList,
    getAutocompleteSuggestions,
    forceSync,
  };

  return (
    <GroceryContext.Provider value={value}>
      {children}
    </GroceryContext.Provider>
  );
}

export function useGrocery() {
  const context = useContext(GroceryContext);
  if (!context) {
    throw new Error('useGrocery must be used within a GroceryProvider');
  }
  return context;
}
