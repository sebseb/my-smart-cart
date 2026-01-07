import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowLeft, MoreVertical, Trash2, Edit2, Share2, LayoutList, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShoppingList } from '@/types/grocery';
import { useGrocery } from '@/context/GroceryContext';
import { SwipeableItem } from './SwipeableItem';
import { AddItemForm } from './AddItemForm';
import { ShareDialog } from './ShareDialog';
import { generateShareToken } from '@/lib/api';

interface ShoppingListViewProps {
  list: ShoppingList;
  onBack: () => void;
}

export function ShoppingListView({ list, onBack }: ShoppingListViewProps) {
  const { data, updateList, deleteList, toggleItemBought, deleteItem } = useGrocery();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(list.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sortByCategory, setSortByCategory] = useState(false);

  const getCategoryForItem = (categoryId: string) => {
    return data.categories.find(c => c.id === categoryId);
  };

  // Group and sort items
  const { unboughtItems, boughtItems, unboughtByCategory } = useMemo(() => {
    const unbought = list.items.filter(i => !i.bought);
    const bought = list.items.filter(i => i.bought);

    // Group unbought items by category
    const byCategory = new Map<string, typeof unbought>();
    unbought.forEach(item => {
      const category = getCategoryForItem(item.categoryId);
      const key = category?.id || 'uncategorized';
      if (!byCategory.has(key)) {
        byCategory.set(key, []);
      }
      byCategory.get(key)!.push(item);
    });

    // Sort categories by their order in data.categories
    const sortedCategories = Array.from(byCategory.entries()).sort((a, b) => {
      const indexA = data.categories.findIndex(c => c.id === a[0]);
      const indexB = data.categories.findIndex(c => c.id === b[0]);
      // Put uncategorized items (-1) at the end
      return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
    });

    return {
      unboughtItems: unbought,
      boughtItems: bought,
      unboughtByCategory: sortedCategories
    };
  }, [list.items, data.categories]);

  const unboughtCount = unboughtItems.length;
  const boughtCount = boughtItems.length;

  const handleSaveName = () => {
    if (editName.trim()) {
      updateList(list.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteList(list.id);
    onBack();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3 safe-top">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              className="flex-1 font-display font-bold text-xl border-0 bg-transparent p-0 h-auto"
              autoFocus
            />
          ) : (
            <h1 className="flex-1 font-display font-bold text-xl truncate">
              {list.name}
            </h1>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSortByCategory(!sortByCategory)}
            className={sortByCategory ? 'text-primary' : ''}
          >
            {sortByCategory ? <Layers className="w-5 h-5" /> : <LayoutList className="w-5 h-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{
                width: list.items.length > 0
                  ? `${(boughtCount / list.items.length) * 100}%`
                  : '0%'
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {boughtCount}/{list.items.length}
          </span>
        </div>
      </header>

      {/* Items list */}
      <main className="flex-1 px-4 py-4 pb-24 overflow-auto scrollbar-hide">
        {list.items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-light flex items-center justify-center">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Empty list</h3>
            <p className="text-muted-foreground">
              Tap the + button to add your first item
            </p>
          </motion.div>
        ) : (
          <div className="space-y-1">
            {/* Unbought items */}
            {unboughtCount > 0 && (
              <div className="mb-4">
                {sortByCategory ? (
                  // Group by category
                  unboughtByCategory.map(([categoryId, items]) => {
                    const category = getCategoryForItem(categoryId);
                    return (
                      <div key={categoryId} className="mb-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: `hsl(var(--${category?.color || 'muted'}))` }}
                          />
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {category?.name || 'Other'} ({items.length})
                          </p>
                        </div>
                        {items.map(item => (
                          <SwipeableItem
                            key={item.id}
                            item={item}
                            category={category}
                            onToggleBought={() => toggleItemBought(list.id, item.id)}
                            onDelete={() => deleteItem(list.id, item.id)}
                          />
                        ))}
                      </div>
                    );
                  })
                ) : (
                  // Simple list
                  <>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      To buy ({unboughtCount})
                    </p>
                    {unboughtItems.map(item => (
                      <SwipeableItem
                        key={item.id}
                        item={item}
                        category={getCategoryForItem(item.categoryId)}
                        onToggleBought={() => toggleItemBought(list.id, item.id)}
                        onDelete={() => deleteItem(list.id, item.id)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Bought items */}
            {boughtCount > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  In cart ({boughtCount})
                </p>
                {boughtItems.map(item => (
                  <SwipeableItem
                    key={item.id}
                    item={item}
                    category={getCategoryForItem(item.categoryId)}
                    onToggleBought={() => toggleItemBought(list.id, item.id)}
                    onDelete={() => deleteItem(list.id, item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add item form */}
        <AnimatePresence>
          {showAddForm && (
            <div className="mt-4">
              <AddItemForm listId={list.id} onClose={() => setShowAddForm(false)} />
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* FAB */}
      {!showAddForm && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-6 right-6 safe-bottom"
        >
          <Button
            size="lg"
            onClick={() => setShowAddForm(true)}
            className="w-14 h-14 rounded-full shadow-lifted"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </motion.div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete list?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{list.name}" and all its items.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        type="list"
        id={list.id}
        name={list.name}
        onGenerateShareLink={async () => {
          const token = await generateShareToken('list', list.id);
          return token;
        }}
      />
    </div>
  );
}
