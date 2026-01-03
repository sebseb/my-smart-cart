import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowLeft, MoreVertical, Trash2, Edit2 } from 'lucide-react';
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

  // Sort items: unbought first, then bought
  const sortedItems = [...list.items].sort((a, b) => {
    if (a.bought === b.bought) return 0;
    return a.bought ? 1 : -1;
  });

  const unboughtCount = list.items.filter(i => !i.bought).length;
  const boughtCount = list.items.filter(i => i.bought).length;

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

  const getCategoryForItem = (categoryId: string) => {
    return data.categories.find(c => c.id === categoryId);
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
        {sortedItems.length === 0 ? (
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  To buy ({unboughtCount})
                </p>
                {sortedItems
                  .filter(item => !item.bought)
                  .map(item => (
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

            {/* Bought items */}
            {boughtCount > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  In cart ({boughtCount})
                </p>
                {sortedItems
                  .filter(item => item.bought)
                  .map(item => (
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
    </div>
  );
}
