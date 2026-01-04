import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChefHat, Check, ChevronLeft, ChevronRight, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Recipe, RecipeItem, Category } from '@/types/grocery';
import { cn } from '@/lib/utils';

interface CookingModeProps {
  recipe: Recipe;
  categories: Category[];
  onClose: () => void;
}

export function CookingMode({ recipe, categories, onClose }: CookingModeProps) {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [currentTab, setCurrentTab] = useState<'ingredients' | 'steps'>('ingredients');

  const toggleIngredient = (id: string) => {
    setCheckedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const allIngredientsChecked = checkedIngredients.size === recipe.items.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-border bg-primary text-primary-foreground safe-top">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6" />
          <div>
            <h1 className="font-display font-bold text-lg leading-tight">{recipe.title}</h1>
            <p className="text-sm opacity-80">{recipe.portions} portions</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-primary-foreground hover:bg-primary-foreground/10"
        >
          <X className="w-5 h-5" />
        </Button>
      </header>

      {/* Tab switcher */}
      <div className="flex border-b border-border bg-card">
        <button
          onClick={() => setCurrentTab('ingredients')}
          className={cn(
            "flex-1 py-3 px-4 text-sm font-medium transition-colors relative",
            currentTab === 'ingredients'
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <Utensils className="w-4 h-4" />
            Ingredients
            {allIngredientsChecked && (
              <Check className="w-4 h-4 text-green-500" />
            )}
          </span>
          {currentTab === 'ingredients' && (
            <motion.div
              layoutId="cooking-tab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            />
          )}
        </button>
        <button
          onClick={() => setCurrentTab('steps')}
          className={cn(
            "flex-1 py-3 px-4 text-sm font-medium transition-colors relative",
            currentTab === 'steps'
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <ChefHat className="w-4 h-4" />
            Recipe
          </span>
          {currentTab === 'steps' && (
            <motion.div
              layoutId="cooking-tab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            />
          )}
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {currentTab === 'ingredients' ? (
            <motion.div
              key="ingredients"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 space-y-3"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {checkedIngredients.size} / {recipe.items.length} ready
                </p>
                {checkedIngredients.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCheckedIngredients(new Set())}
                    className="text-xs"
                  >
                    Reset all
                  </Button>
                )}
              </div>

              {recipe.items.map((item) => {
                const category = categories.find(c => c.id === item.categoryId);
                const isChecked = checkedIngredients.has(item.id);
                
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => toggleIngredient(item.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left",
                      isChecked
                        ? "bg-primary/10 border-2 border-primary/30"
                        : "bg-card border-2 border-transparent shadow-soft"
                    )}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                        isChecked
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary"
                      )}
                    >
                      {isChecked ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: category
                              ? `hsl(var(--${category.color}))`
                              : 'hsl(var(--category-default))'
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "font-medium text-lg",
                        isChecked && "line-through text-muted-foreground"
                      )}>
                        {item.name}
                      </p>
                      <p className="text-muted-foreground">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="steps"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4"
            >
              {recipe.description ? (
                <div className="space-y-4">
                  <div className="bg-card rounded-xl p-6 shadow-soft">
                    <h3 className="font-display font-semibold text-lg mb-4">Instructions</h3>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {recipe.description}
                    </p>
                  </div>
                  
                  {/* Quick ingredients reference */}
                  <div className="bg-secondary/50 rounded-xl p-4">
                    <h4 className="font-medium text-sm mb-3 text-muted-foreground">Quick reference</h4>
                    <div className="flex flex-wrap gap-2">
                      {recipe.items.map((item) => (
                        <span
                          key={item.id}
                          className={cn(
                            "text-xs px-2 py-1 rounded-full bg-background",
                            checkedIngredients.has(item.id) && "line-through opacity-60"
                          )}
                        >
                          {item.quantity} {item.unit} {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <ChefHat className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">No instructions yet</h3>
                  <p className="text-muted-foreground">
                    Add cooking instructions to this recipe to see them here
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom navigation */}
      <footer className="border-t border-border bg-card px-4 py-3 safe-bottom">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentTab('ingredients')}
            disabled={currentTab === 'ingredients'}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Ingredients
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentTab('steps')}
            disabled={currentTab === 'steps'}
            className="flex items-center gap-2"
          >
            Recipe
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </footer>
    </motion.div>
  );
}
