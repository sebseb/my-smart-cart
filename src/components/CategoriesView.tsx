import React, { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Edit2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useGrocery } from '@/context/GroceryContext';
import { Category, CATEGORY_ICONS } from '@/types/grocery';
import { CategoryIcon, iconMap } from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';

interface CategoriesViewProps {
  onBack: () => void;
}

const CATEGORY_COLORS = [
  'category-fruit',
  'category-vegetables',
  'category-meat',
  'category-fish',
  'category-pasta',
  'category-sauce',
  'category-biscuit',
  'category-breakfast',
  'category-milk',
  'category-cleaning',
];

export function CategoriesView({ onBack }: CategoriesViewProps) {
  const { data, addCategory, updateCategory, deleteCategory, reorderCategories } = useGrocery();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);

  const handleCreate = () => {
    setEditingCategory({
      id: '',
      name: '',
      color: CATEGORY_COLORS[0],
      icon: CATEGORY_ICONS[0],
    });
    setIsNew(true);
  };

  const handleSave = () => {
    if (!editingCategory?.name.trim()) return;

    if (isNew) {
      addCategory({
        name: editingCategory.name.trim(),
        color: editingCategory.color,
        icon: editingCategory.icon,
      });
    } else {
      updateCategory(editingCategory.id, {
        name: editingCategory.name.trim(),
        color: editingCategory.color,
        icon: editingCategory.icon,
      });
    }
    
    setEditingCategory(null);
    setIsNew(false);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      deleteCategory(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3 safe-top">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="flex-1 font-display font-bold text-xl">Categories</h1>
        </div>
      </header>

      {/* Categories list */}
      <main className="flex-1 px-4 py-4 pb-24">
        <Reorder.Group
          axis="y"
          values={data.categories}
          onReorder={reorderCategories}
          className="space-y-2"
        >
          {data.categories.map((category) => (
            <Reorder.Item
              key={category.id}
              value={category}
              className="bg-card rounded-xl p-4 shadow-soft flex items-center gap-3 cursor-grab active:cursor-grabbing"
              whileDrag={{ scale: 1.02, boxShadow: '0 8px 20px rgba(0,0,0,0.15)' }}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `hsl(var(--${category.color}))` }}
              >
                {category.icon && (
                  <CategoryIcon icon={category.icon} className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              <span className="flex-1 font-medium">{category.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingCategory(category);
                  setIsNew(false);
                }}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteConfirm(category)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </main>

      {/* FAB */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 safe-bottom"
      >
        <Button
          size="lg"
          onClick={handleCreate}
          className="w-14 h-14 rounded-full shadow-lifted"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </motion.div>

      {/* Edit/Create Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? 'New Category' : 'Edit Category'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder="Category name"
              value={editingCategory?.name || ''}
              onChange={(e) =>
                setEditingCategory(prev => prev ? { ...prev, name: e.target.value } : null)
              }
            />

            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() =>
                      setEditingCategory(prev => prev ? { ...prev, color } : null)
                    }
                    className={cn(
                      "w-8 h-8 rounded-full transition-transform",
                      editingCategory?.color === color && "ring-2 ring-ring ring-offset-2 scale-110"
                    )}
                    style={{ backgroundColor: `hsl(var(--${color}))` }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Icon</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {CATEGORY_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() =>
                      setEditingCategory(prev => prev ? { ...prev, icon } : null)
                    }
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-muted hover:bg-muted/80",
                      editingCategory?.icon === icon && "ring-2 ring-ring ring-offset-2 scale-110"
                    )}
                  >
                    <CategoryIcon icon={icon} className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCategory(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!editingCategory?.name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{deleteConfirm?.name}". Items using this category won't be deleted but will show a default color.
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
