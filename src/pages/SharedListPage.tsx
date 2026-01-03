import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, WifiOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShoppingList, Recipe, GroceryItem, Category, DEFAULT_CATEGORIES } from '@/types/grocery';
import { getSharedItem, updateSharedItem } from '@/lib/api';
import { wsClient } from '@/lib/websocket';
import { SwipeableItem } from '@/components/SwipeableItem';
import { AddItemForm } from '@/components/AddItemForm';
import { generateId } from '@/lib/storage';
import { toast } from 'sonner';

export function SharedListPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const categories: Category[] = DEFAULT_CATEGORIES;

  // Fetch the shared list
  useEffect(() => {
    if (!token) return;

    const fetchList = async () => {
      setLoading(true);
      const result = await getSharedItem('list', token);
      if (result) {
        setList(result.data as ShoppingList);
        setError(null);
      } else {
        setError('Could not load shared list. The link may be invalid or the server is offline.');
      }
      setLoading(false);
    };

    fetchList();
  }, [token]);

  // WebSocket connection for real-time sync
  useEffect(() => {
    if (!token || !list) return;

    const room = `list:${token}`;

    const connectWs = async () => {
      const connected = await wsClient.connect();
      setIsConnected(connected);
      if (connected) {
        wsClient.subscribe(room);
      }
    };

    connectWs();

    // Listen for updates
    const unsubscribe = wsClient.on('update', (data) => {
      if (data.type === 'list' && data.item) {
        setList(data.item);
        toast.info('List updated by another user');
      }
    });

    const unsubConnect = wsClient.onConnect(() => setIsConnected(true));
    const unsubDisconnect = wsClient.onDisconnect(() => setIsConnected(false));

    return () => {
      wsClient.unsubscribe(room);
      unsubscribe();
      unsubConnect();
      unsubDisconnect();
    };
  }, [token, list?.id]);

  // Update list and sync
  const updateList = useCallback(async (updates: Partial<ShoppingList>) => {
    if (!list || !token) return;

    const updatedList = { ...list, ...updates, updatedAt: new Date().toISOString() };
    setList(updatedList);

    // Send to server
    const success = await updateSharedItem('list', token, updatedList);
    if (!success) {
      toast.error('Failed to sync changes');
    }

    // Broadcast to other clients
    wsClient.send('update', {
      room: `list:${token}`,
      payload: { type: 'list', item: updatedList, id: list.id },
    });
  }, [list, token]);

  const toggleItemBought = useCallback((itemId: string) => {
    if (!list) return;
    const items = list.items.map(item =>
      item.id === itemId
        ? { ...item, bought: !item.bought, updatedAt: new Date().toISOString() }
        : item
    );
    updateList({ items });
  }, [list, updateList]);

  const deleteItem = useCallback((itemId: string) => {
    if (!list) return;
    const items = list.items.filter(item => item.id !== itemId);
    updateList({ items });
  }, [list, updateList]);

  const addItem = useCallback((item: Omit<GroceryItem, 'id' | 'createdAt' | 'updatedAt' | 'bought'>) => {
    if (!list) return;
    const newItem: GroceryItem = {
      ...item,
      id: generateId(),
      bought: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const items = [...list.items, newItem];
    updateList({ items });
  }, [list, updateList]);

  const getCategoryForItem = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading shared list...</p>
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="font-display font-bold text-xl mb-2">Unable to Load</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const sortedItems = [...list.items].sort((a, b) => {
    if (a.bought === b.bought) return 0;
    return a.bought ? 1 : -1;
  });

  const unboughtCount = list.items.filter(i => !i.bought).length;
  const boughtCount = list.items.filter(i => i.bought).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3 safe-top">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-xl truncate">{list.name}</h1>
            <p className="text-xs text-muted-foreground">Shared list</p>
          </div>
          {isConnected ? (
            <span className="flex items-center gap-1 text-xs text-primary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Live
            </span>
          ) : (
            <WifiOff className="w-4 h-4 text-muted-foreground" />
          )}
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
            <p className="text-muted-foreground">No items yet. Add your first item!</p>
          </motion.div>
        ) : (
          <div className="space-y-1">
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
                      onToggleBought={() => toggleItemBought(item.id)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))}
              </div>
            )}

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
                      onToggleBought={() => toggleItemBought(item.id)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {showAddForm && (
          <div className="mt-4">
            <SharedAddItemForm
              categories={categories}
              onAdd={addItem}
              onClose={() => setShowAddForm(false)}
            />
          </div>
        )}
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
            +
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// Simplified add item form for shared lists
function SharedAddItemForm({
  categories,
  onAdd,
  onClose,
}: {
  categories: Category[];
  onAdd: (item: Omit<GroceryItem, 'id' | 'createdAt' | 'updatedAt' | 'bought'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<GroceryItem['unit']>('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      quantity,
      unit,
      categoryId,
    });

    setName('');
    setQuantity(1);
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      onSubmit={handleSubmit}
      className="bg-card rounded-xl p-4 shadow-soft space-y-3"
    >
      <input
        type="text"
        placeholder="Item name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background"
        autoFocus
      />
      <div className="flex gap-2">
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
          className="w-20 px-3 py-2 rounded-lg border border-border bg-background"
          min="0.1"
          step="0.1"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as GroceryItem['unit'])}
          className="px-3 py-2 rounded-lg border border-border bg-background"
        >
          <option value="">None</option>
          <option value="piece">pcs</option>
          <option value="kg">kg</option>
          <option value="g">g</option>
          <option value="l">L</option>
          <option value="ml">ml</option>
        </select>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-background"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={!name.trim()}>
          Add
        </Button>
      </div>
    </motion.form>
  );
}
