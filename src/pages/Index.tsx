import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, ChefHat, Settings, Plus, Wifi, WifiOff, RefreshCw, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useGrocery } from '@/context/GroceryContext';
import { ShoppingList } from '@/types/grocery';
import { ShoppingListView } from '@/components/ShoppingListView';
import { RecipesView } from '@/components/RecipesView';
import { CategoriesView } from '@/components/CategoriesView';
import { cn } from '@/lib/utils';
type View = 'home' | 'list' | 'recipes' | 'categories';
const Index = () => {
  const {
    data,
    isOnline,
    isSyncing,
    createList,
    forceSync
  } = useGrocery();
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [showNewListDialog, setShowNewListDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const handleCreateList = () => {
    if (!newListName.trim()) return;
    const list = createList(newListName.trim());
    setSelectedList(list);
    setCurrentView('list');
    setShowNewListDialog(false);
    setNewListName('');
  };
  const handleOpenList = (list: ShoppingList) => {
    setSelectedList(list);
    setCurrentView('list');
  };

  // Render current view
  if (currentView === 'list' && selectedList) {
    // Get the latest version of the list from data
    const currentList = data.lists.find(l => l.id === selectedList.id);
    if (!currentList) {
      setCurrentView('home');
      return null;
    }
    return <ShoppingListView list={currentList} onBack={() => {
      setCurrentView('home');
      setSelectedList(null);
    }} />;
  }
  if (currentView === 'recipes') {
    return <RecipesView onBack={() => setCurrentView('home')} />;
  }
  if (currentView === 'categories') {
    return <CategoriesView onBack={() => setCurrentView('home')} />;
  }
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-6 safe-top">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display font-bold text-2xl">Smart Cart</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={forceSync} disabled={isSyncing} className="text-primary-foreground hover:bg-primary-foreground/10">
              <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
            </Button>
            {isOnline ? <Wifi className="w-5 h-5 text-primary-foreground/80" /> : <WifiOff className="w-5 h-5 text-primary-foreground/60" />}
          </div>
        </div>
        <p className="text-primary-foreground/80 text-sm">
          {isOnline ? 'Connected' : 'Offline mode'}
        </p>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-6 pb-24">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <motion.button whileTap={{
          scale: 0.98
        }} onClick={() => setCurrentView('recipes')} className="bg-card rounded-xl p-4 shadow-soft flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-accent" />
            </div>
            <div className="text-left">
              <p className="font-display font-semibold">Recipes</p>
              <p className="text-xs text-muted-foreground">{data.recipes.length} saved</p>
            </div>
          </motion.button>

          <motion.button whileTap={{
          scale: 0.98
        }} onClick={() => setCurrentView('categories')} className="bg-card rounded-xl p-4 shadow-soft flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
              <Tag className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-display font-semibold">Categories</p>
              <p className="text-xs text-muted-foreground">{data.categories.length} types</p>
            </div>
          </motion.button>
        </div>

        {/* Shopping lists */}
        <div className="mb-4">
          <h2 className="font-display font-semibold text-lg mb-3">Your Lists</h2>
        </div>

        {data.lists.length === 0 ? <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary-light flex items-center justify-center">
              <ShoppingCart className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-xl mb-2">No lists yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first shopping list to get started
            </p>
            <Button onClick={() => setShowNewListDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create List
            </Button>
          </motion.div> : <div className="space-y-3">
            <AnimatePresence>
              {data.lists.map(list => {
            const itemCount = list.items.length;
            const boughtCount = list.items.filter(i => i.bought).length;
            const progress = itemCount > 0 ? boughtCount / itemCount * 100 : 0;
            return <motion.button key={list.id} initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} exit={{
              opacity: 0,
              x: -100
            }} whileTap={{
              scale: 0.98
            }} onClick={() => handleOpenList(list)} className="w-full bg-card rounded-xl p-4 shadow-soft text-left">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-display font-semibold text-lg">{list.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {itemCount === 0 ? 'No items' : `${boughtCount}/${itemCount} items`}
                        </p>
                      </div>
                      <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                    </div>
                    
                    {/* Progress bar */}
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div className="h-full bg-primary" initial={{
                  width: 0
                }} animate={{
                  width: `${progress}%`
                }} transition={{
                  duration: 0.3
                }} />
                    </div>
                  </motion.button>;
          })}
            </AnimatePresence>
          </div>}
      </main>

      {/* FAB */}
      <motion.div initial={{
      scale: 0
    }} animate={{
      scale: 1
    }} className="fixed bottom-6 right-6 safe-bottom">
        <Button size="lg" onClick={() => setShowNewListDialog(true)} className="w-14 h-14 rounded-full shadow-lifted">
          <Plus className="w-6 h-6" />
        </Button>
      </motion.div>

      {/* New List Dialog */}
      <Dialog open={showNewListDialog} onOpenChange={setShowNewListDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Shopping List</DialogTitle>
          </DialogHeader>
          <Input placeholder="List name (e.g., Weekly groceries)" value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateList()} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewListDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateList} disabled={!newListName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Index;