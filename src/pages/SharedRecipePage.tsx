import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Recipe, DEFAULT_CATEGORIES } from '@/types/grocery';
import { getSharedItem } from '@/lib/api';
import { wsClient } from '@/lib/websocket';
import { toast } from 'sonner';

export function SharedRecipePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const categories = DEFAULT_CATEGORIES;

  // Fetch the shared recipe
  useEffect(() => {
    if (!token) return;

    const fetchRecipe = async () => {
      setLoading(true);
      const result = await getSharedItem('recipe', token);
      if (result) {
        setRecipe(result.data as Recipe);
        setError(null);
      } else {
        setError('Could not load shared recipe. The link may be invalid or the server is offline.');
      }
      setLoading(false);
    };

    fetchRecipe();
  }, [token]);

  // WebSocket connection for real-time sync
  useEffect(() => {
    if (!token || !recipe) return;

    const room = `recipe:${token}`;

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
      if (data.type === 'recipe' && data.item) {
        setRecipe(data.item);
        toast.info('Recipe updated by another user');
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
  }, [token, recipe?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading shared recipe...</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3 safe-top">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-xl truncate">{recipe.title}</h1>
            <p className="text-xs text-muted-foreground">Shared recipe</p>
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
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 overflow-auto">
        <div className="space-y-6">
          {recipe.description && (
            <p className="text-muted-foreground">{recipe.description}</p>
          )}

          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1 bg-secondary rounded-full">
              {recipe.portions} portions
            </span>
            <span className="px-3 py-1 bg-secondary rounded-full">
              {recipe.items.length} ingredients
            </span>
          </div>

          {/* Ingredients list */}
          <div>
            <h3 className="font-display font-semibold mb-3">Ingredients</h3>
            <div className="space-y-2">
              {recipe.items.map((item) => {
                const category = categories.find(c => c.id === item.categoryId);
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
        </div>
      </main>
    </div>
  );
}
