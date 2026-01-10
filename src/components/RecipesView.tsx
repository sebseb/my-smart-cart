import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Edit2, ChefHat, Share2, Play, Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useGrocery } from '@/context/GroceryContext';
import { Recipe, RecipeItem, Unit, UNITS, ShoppingList } from '@/types/grocery';
import { cn } from '@/lib/utils';
import { generateId } from '@/lib/storage';
import { ShareDialog } from './ShareDialog';
import { generateShareToken } from '@/lib/api';
import { CookingMode } from './CookingMode';

interface RecipesViewProps {
  onBack: () => void;
}

export function RecipesView({ onBack }: RecipesViewProps) {
  const { data, createRecipe, updateRecipe, deleteRecipe, addRecipeToList } = useGrocery();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddToListDialog, setShowAddToListDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AnimatePresence mode="wait">
        {selectedRecipe ? (
          <RecipeDetail
            key="detail"
            recipe={selectedRecipe}
            onBack={() => {
              setSelectedRecipe(null);
              setIsEditing(false);
            }}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            onDelete={() => {
              deleteRecipe(selectedRecipe.id);
              setSelectedRecipe(null);
            }}
            onSave={(updates) => {
              updateRecipe(selectedRecipe.id, updates);
              setIsEditing(false);
            }}
            onAddToList={() => setShowAddToListDialog(true)}
            onShare={() => setShowShareDialog(true)}
          />
        ) : (
          <RecipesList
            key="list"
            recipes={data.recipes}
            onBack={onBack}
            onSelectRecipe={setSelectedRecipe}
            onCreateRecipe={() => {
              const newRecipe = createRecipe({
                title: 'New Recipe',
                description: '',
                portions: 4,
                duration: undefined,
                items: [],
              });
              setSelectedRecipe(newRecipe);
              setIsEditing(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Add to List Dialog */}
      {selectedRecipe && (
        <AddToListDialog
          open={showAddToListDialog}
          onOpenChange={setShowAddToListDialog}
          recipe={selectedRecipe}
          lists={data.lists}
          onAdd={(listId, portions, items) => {
            addRecipeToList(selectedRecipe.id, listId, portions, items);
            setShowAddToListDialog(false);
          }}
        />
      )}

      {/* Share Dialog */}
      {selectedRecipe && (
        <ShareDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          type="recipe"
          id={selectedRecipe.id}
          name={selectedRecipe.title}
          onGenerateShareLink={async () => {
            const token = await generateShareToken('recipe', selectedRecipe.id);
            return token;
          }}
        />
      )}
    </div>
  );
}

interface RecipesListProps {
  recipes: Recipe[];
  onBack: () => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onCreateRecipe: () => void;
}

function RecipesList({ recipes, onBack, onSelectRecipe, onCreateRecipe }: RecipesListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.items.some((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col min-h-screen"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3 safe-top">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="flex-1 font-display font-bold text-xl">Recipes</h1>
        </div>
        {/* Search field */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </header>

      {/* Recipe list */}
      <main className="flex-1 px-4 py-4 pb-24">
        {recipes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-accent" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">No recipes yet</h3>
            <p className="text-muted-foreground">
              Create your first recipe to quickly add ingredients to your lists
            </p>
          </motion.div>
        ) : filteredRecipes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">No recipes found</h3>
            <p className="text-muted-foreground">
              Try a different search term
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredRecipes.map((recipe) => (
              <motion.button
                key={recipe.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onSelectRecipe(recipe)}
                className="w-full bg-card rounded-xl p-4 shadow-soft text-left hover:shadow-lifted transition-shadow"
              >
                <h3 className="font-display font-semibold text-lg">{recipe.title}</h3>
                {recipe.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {recipe.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span>{recipe.portions} portions</span>
                  <span>•</span>
                  <span>{recipe.items.length} ingredients</span>
                  {recipe.duration && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {recipe.duration} min
                      </span>
                    </>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 safe-bottom"
      >
        <Button
          size="lg"
          onClick={onCreateRecipe}
          className="w-14 h-14 rounded-full shadow-lifted"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  onDelete: () => void;
  onSave: (updates: Partial<Recipe>) => void;
  onAddToList: () => void;
  onShare: () => void;
}

function RecipeDetail({
  recipe,
  onBack,
  isEditing,
  setIsEditing,
  onDelete,
  onSave,
  onAddToList,
  onShare,
}: RecipeDetailProps) {
  const { data } = useGrocery();
  const [title, setTitle] = useState(recipe.title);
  const [description, setDescription] = useState(recipe.description);
  const [portions, setPortions] = useState(recipe.portions.toString());
  const [duration, setDuration] = useState(recipe.duration?.toString() || '');
  const [items, setItems] = useState<RecipeItem[]>(recipe.items);
  const [showCookingMode, setShowCookingMode] = useState(false);

  const handleSave = () => {
    onSave({
      title,
      description,
      portions: parseInt(portions) || 4,
      duration: duration ? parseInt(duration) : undefined,
      items,
    });
  };

  const addNewItem = () => {
    setItems([
      ...items,
      {
        id: generateId(),
        name: '',
        quantity: 1,
        unit: '',
        categoryId: data.categories[0]?.id || '',
      },
    ]);
  };

  const updateItem = (index: number, updates: Partial<RecipeItem>) => {
    setItems(items.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col min-h-screen"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3 safe-top">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="flex-1 font-display font-bold text-xl truncate">
            {isEditing ? 'Edit Recipe' : recipe.title}
          </h1>
          {!isEditing && (
            <>
              <Button variant="ghost" size="icon" onClick={onShare}>
                <Share2 className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                <Edit2 className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 pb-24 overflow-auto">
        {isEditing ? (
          <div className="space-y-4">
            <Input
              placeholder="Recipe title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-display text-lg font-semibold"
            />
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Portions:</span>
                <Input
                  type="number"
                  value={portions}
                  onChange={(e) => setPortions(e.target.value)}
                  className="w-20"
                  min="1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="min"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-20"
                  min="1"
                />
              </div>
            </div>

            {/* Ingredients */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold">Ingredients</h3>
                <Button variant="outline" size="sm" onClick={addNewItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={item.id} className="flex gap-2 bg-card p-3 rounded-lg">
                    <Input
                      placeholder="Name"
                      value={item.name}
                      onChange={(e) => updateItem(index, { name: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                      className="w-16"
                    />
                    <Select
                      value={item.unit || 'none'}
                      onValueChange={(v) => updateItem(index, { unit: v === 'none' ? '' : v as Unit })}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u.value} value={u.value || 'none'}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Save
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={onDelete}
              className="w-full text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Recipe
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {recipe.description && (
              <p className="text-muted-foreground">{recipe.description}</p>
            )}
            
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="px-3 py-1 bg-secondary rounded-full">
                {recipe.portions} portions
              </span>
              <span className="px-3 py-1 bg-secondary rounded-full">
                {recipe.items.length} ingredients
              </span>
              {recipe.duration && (
                <span className="px-3 py-1 bg-secondary rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {recipe.duration} min
                </span>
              )}
            </div>

            {/* Ingredients list */}
            <div>
              <h3 className="font-display font-semibold mb-3">Ingredients</h3>
              <div className="space-y-2">
                {recipe.items.map((item) => {
                  const category = data.categories.find(c => c.id === item.categoryId);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 bg-card p-3 rounded-lg"
                    >
                      <div
                        className="w-1 h-8 rounded-full"
                        style={{
                          backgroundColor: category
                            ? `hsl(var(--${category.color}))`
                            : 'hsl(var(--category-default))'
                        }}
                      />
                      <span className="flex-1">{item.name}</span>
                      <span className="text-muted-foreground">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => setShowCookingMode(true)} 
                className="w-full" 
                size="lg"
                variant="default"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Cooking
              </Button>
              
              <Button onClick={onAddToList} className="w-full" size="lg" variant="outline">
                <Plus className="w-5 h-5 mr-2" />
                Add to Shopping List
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Cooking Mode */}
      {showCookingMode && (
        <CookingMode
          recipe={recipe}
          categories={data.categories}
          onClose={() => setShowCookingMode(false)}
        />
      )}
    </motion.div>
  );
}

interface AddToListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe;
  lists: ShoppingList[];
  onAdd: (listId: string, portions: number, items: RecipeItem[]) => void;
}

function AddToListDialog({ open, onOpenChange, recipe, lists, onAdd }: AddToListDialogProps) {
  const [selectedListId, setSelectedListId] = useState(lists[0]?.id || '');
  const [portions, setPortions] = useState(recipe.portions);
  const [selectedItems, setSelectedItems] = useState<RecipeItem[]>(recipe.items);

  const portionMultiplier = portions / recipe.portions;

  const toggleItem = (item: RecipeItem) => {
    if (selectedItems.find(i => i.id === item.id)) {
      setSelectedItems(selectedItems.filter(i => i.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleAdd = () => {
    if (selectedListId && selectedItems.length > 0) {
      onAdd(selectedListId, portions, selectedItems);
    }
  };

  if (lists.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No shopping lists</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Create a shopping list first to add recipe ingredients.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Add to Shopping List</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* List selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select list</label>
            <Select value={selectedListId} onValueChange={setSelectedListId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Portions */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Portions (original: {recipe.portions})
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPortions(Math.max(1, portions - 1))}
              >
                -
              </Button>
              <span className="w-12 text-center font-semibold">{portions}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPortions(portions + 1)}
              >
                +
              </Button>
            </div>
          </div>

          {/* Items selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Ingredients ({selectedItems.length} selected)
            </label>
            <div className="space-y-2 max-h-48 overflow-auto">
              {recipe.items.map((item) => {
                const isSelected = selectedItems.find(i => i.id === item.id);
                const adjustedQty = Math.round(item.quantity * portionMultiplier * 100) / 100;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
                      isSelected
                        ? "border-primary bg-primary-light"
                        : "border-border bg-card"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center",
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                    )}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12">
                          <path
                            d="M10 3L4.5 8.5L2 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="flex-1">{item.name}</span>
                    <span className="text-muted-foreground">
                      {adjustedQty} {item.unit}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={selectedItems.length === 0}>
            Add {selectedItems.length} items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
