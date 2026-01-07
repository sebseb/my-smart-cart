import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGrocery } from '@/context/GroceryContext';
import { Category, Unit, UNITS } from '@/types/grocery';
import { cn } from '@/lib/utils';

interface AddItemFormProps {
  listId: string;
  onClose?: () => void;
}

export function AddItemForm({ listId, onClose }: AddItemFormProps) {
  const { data, addItem, getAutocompleteSuggestions } = useGrocery();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<Unit>('');
  const [categoryId, setCategoryId] = useState(data.categories[0]?.id || '');
  const [suggestions, setSuggestions] = useState<{ name: string; categoryId: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (name.length >= 2) {
      const matches = getAutocompleteSuggestions(name);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [name, getAutocompleteSuggestions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addItem(listId, {
      name: name.trim(),
      quantity: parseFloat(quantity) || 1,
      unit,
      categoryId,
    });

    setName('');
    setQuantity('1');
    setUnit('');
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: { name: string; categoryId: string }) => {
    setName(suggestion.name);
    if (suggestion.categoryId && data.categories.some(c => c.id === suggestion.categoryId)) {
      setCategoryId(suggestion.categoryId);
    }
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      onSubmit={handleSubmit}
      className="bg-card rounded-xl p-4 shadow-soft space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg">Add Item</h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} type="button">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Item name with autocomplete */}
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder="Item name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="bg-secondary border-0"
        />
        
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lifted overflow-hidden z-10"
            >
              {suggestions.map((suggestion, index) => {
                const category = data.categories.find(c => c.id === suggestion.categoryId);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-2 text-left hover:bg-secondary transition-colors text-sm flex items-center justify-between"
                  >
                    <span>{suggestion.name}</span>
                    {category && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: `hsl(var(--${category.color}))` }}
                        />
                        {category.name}
                      </span>
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quantity and Unit row */}
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Qty"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-20 bg-secondary border-0"
          min="0"
          step="0.1"
        />
        
        <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
          <SelectTrigger className="w-24 bg-secondary border-0">
            <SelectValue placeholder="Unit" />
          </SelectTrigger>
          <SelectContent>
            {UNITS.map((u) => (
              <SelectItem key={u.value} value={u.value || 'none'}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="flex-1 bg-secondary border-0">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {data.categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: `hsl(var(--${cat.color}))` }}
                  />
                  {cat.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={!name.trim()}>
        <Plus className="w-4 h-4 mr-2" />
        Add Item
      </Button>
    </motion.form>
  );
}
