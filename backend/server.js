import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocketServer } from 'ws';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync, existsSync } from 'fs';
import crypto from 'crypto';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app FIRST
const app = express();
app.use(cors());
app.use(express.json());

// Initialize database
const db = new Database(join(__dirname, 'grocery.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS app_data (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS share_tokens (
    token TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// Initialize with empty data if not exists
const initRow = db.prepare('SELECT * FROM app_data WHERE id = 1').get();
if (!initRow) {
  const defaultData = {
    lists: [],
    recipes: [],
    categories: [
      { id: 'fruit', name: 'Fruits', color: 'category-fruit' },
      { id: 'vegetables', name: 'Vegetables', color: 'category-vegetables' },
      { id: 'meat', name: 'Meat', color: 'category-meat' },
      { id: 'fish', name: 'Fish', color: 'category-fish' },
      { id: 'pasta', name: 'Pasta & Rice', color: 'category-pasta' },
      { id: 'sauce', name: 'Sauce', color: 'category-sauce' },
      { id: 'biscuit', name: 'Biscuits', color: 'category-biscuit' },
      { id: 'breakfast', name: 'Breakfast', color: 'category-breakfast' },
      { id: 'milk', name: 'Dairy', color: 'category-milk' },
      { id: 'cleaning', name: 'Cleaning', color: 'category-cleaning' },
    ],
    itemHistory: [],
    lastSynced: null,
  };
  db.prepare('INSERT INTO app_data (id, data, updated_at) VALUES (1, ?, ?)').run(
    JSON.stringify(defaultData),
    new Date().toISOString()
  );
}

// SSL Certificate paths (set via environment variables)
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || join(__dirname, 'certs', 'privkey.pem');
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || join(__dirname, 'certs', 'fullchain.pem');
const USE_HTTPS = process.env.USE_HTTPS === 'true' || (existsSync(SSL_KEY_PATH) && existsSync(SSL_CERT_PATH));

// HTTP/HTTPS server based on SSL availability
let server;
if (USE_HTTPS) {
  try {
    const sslOptions = {
      key: readFileSync(SSL_KEY_PATH),
      cert: readFileSync(SSL_CERT_PATH),
    };
    server = createHttpsServer(sslOptions, app);
    console.log('🔒 HTTPS enabled with SSL certificates');
  } catch (error) {
    console.error('Failed to load SSL certificates:', error.message);
    console.log('⚠️ Falling back to HTTP');
    server = createHttpServer(app);
  }
} else {
  server = createHttpServer(app);
  console.log('ℹ️ Running in HTTP mode (no SSL certificates found)');
}

// WebSocket server
const wss = new WebSocketServer({ server });

// Room subscriptions: Map<room, Set<ws>>
const rooms = new Map();

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  const subscribedRooms = new Set();

  ws.on('message', (message) => {
    try {
      const { type, data } = JSON.parse(message);

      switch (type) {
        case 'subscribe':
          const room = data.room;
          if (!rooms.has(room)) {
            rooms.set(room, new Set());
          }
          rooms.get(room).add(ws);
          subscribedRooms.add(room);
          console.log(`Client subscribed to room: ${room}`);
          break;

        case 'unsubscribe':
          if (rooms.has(data.room)) {
            rooms.get(data.room).delete(ws);
            subscribedRooms.delete(data.room);
          }
          break;

        case 'update':
          // Broadcast update to all clients in the room except sender
          const updateRoom = data.room;
          if (rooms.has(updateRoom)) {
            rooms.get(updateRoom).forEach((client) => {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'update',
                  data: data.payload,
                }));
              }
            });
          }
          break;

        case 'item_added':
          // Broadcast item added notification to all clients in room except sender
          const itemRoom = data.room;
          if (rooms.has(itemRoom)) {
            rooms.get(itemRoom).forEach((client) => {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'item_added',
                  data: {
                    listId: data.listId,
                    listName: data.listName,
                    itemName: data.itemName,
                    timestamp: new Date().toISOString(),
                  },
                }));
              }
            });
          }
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    // Remove from all subscribed rooms
    subscribedRooms.forEach((room) => {
      if (rooms.has(room)) {
        rooms.get(room).delete(ws);
        if (rooms.get(room).size === 0) {
          rooms.delete(room);
        }
      }
    });
  });
});

// Broadcast function for server-side updates
function broadcastToRoom(room, type, data, excludeWs = null) {
  if (rooms.has(room)) {
    rooms.get(room).forEach((client) => {
      if (client !== excludeWs && client.readyState === 1) {
        client.send(JSON.stringify({ type, data }));
      }
    });
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get data
app.get('/api/data', (req, res) => {
  try {
    const row = db.prepare('SELECT data, updated_at FROM app_data WHERE id = 1').get();
    if (row) {
      res.json({
        data: JSON.parse(row.data),
        updatedAt: row.updated_at,
      });
    } else {
      res.status(404).json({ error: 'No data found' });
    }
  } catch (error) {
    console.error('Error getting data:', error);
    res.status(500).json({ error: 'Failed to get data' });
  }
});

// Sync data
app.post('/api/sync', (req, res) => {
  try {
    const { data: clientData, lastSynced } = req.body;

    // Get server data
    const serverRow = db.prepare('SELECT data, updated_at FROM app_data WHERE id = 1').get();
    const serverData = serverRow ? JSON.parse(serverRow.data) : null;
    const serverUpdatedAt = serverRow ? serverRow.updated_at : null;

    // Simple sync strategy: 
    // - If client has newer data (based on lastSynced), use client data
    // - Otherwise, merge intelligently
    let mergedData;

    if (!serverData || !serverUpdatedAt) {
      // No server data, use client data
      mergedData = clientData;
    } else if (!lastSynced || new Date(serverUpdatedAt) <= new Date(lastSynced)) {
      // Server hasn't changed since last sync, use client data
      mergedData = clientData;
    } else {
      // Both have changes, merge
      mergedData = mergeData(serverData, clientData);
    }

    // Save merged data
    const now = new Date().toISOString();
    db.prepare('UPDATE app_data SET data = ?, updated_at = ? WHERE id = 1').run(
      JSON.stringify(mergedData),
      now
    );

    res.json({
      data: mergedData,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error syncing data:', error);
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

// Generate share token
app.post('/api/share/generate', (req, res) => {
  try {
    const { type, id } = req.body;
    
    if (!type || !id) {
      return res.status(400).json({ error: 'Missing type or id' });
    }

    // Check if token already exists for this item
    const existing = db.prepare(
      'SELECT token FROM share_tokens WHERE type = ? AND item_id = ?'
    ).get(type, id);

    if (existing) {
      return res.json({ token: existing.token });
    }

    // Generate new token
    const token = crypto.randomBytes(16).toString('hex');
    
    db.prepare(
      'INSERT INTO share_tokens (token, type, item_id, created_at) VALUES (?, ?, ?, ?)'
    ).run(token, type, id, new Date().toISOString());

    res.json({ token });
  } catch (error) {
    console.error('Error generating share token:', error);
    res.status(500).json({ error: 'Failed to generate share token' });
  }
});

// Get shared item by token
app.get('/api/share/:type/:token', (req, res) => {
  try {
    const { type, token } = req.params;

    // Look up token
    const shareInfo = db.prepare(
      'SELECT item_id FROM share_tokens WHERE token = ? AND type = ?'
    ).get(token, type);

    if (!shareInfo) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    // Get the data
    const row = db.prepare('SELECT data FROM app_data WHERE id = 1').get();
    if (!row) {
      return res.status(404).json({ error: 'Data not found' });
    }

    const appData = JSON.parse(row.data);
    const collection = type === 'list' ? appData.lists : appData.recipes;
    const item = collection.find((i) => i.id === shareInfo.item_id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ data: item, id: shareInfo.item_id });
  } catch (error) {
    console.error('Error getting shared item:', error);
    res.status(500).json({ error: 'Failed to get shared item' });
  }
});

// Update shared item
app.put('/api/share/:type/:token', (req, res) => {
  try {
    const { type, token } = req.params;
    const { data: updatedItem } = req.body;

    // Look up token
    const shareInfo = db.prepare(
      'SELECT item_id FROM share_tokens WHERE token = ? AND type = ?'
    ).get(token, type);

    if (!shareInfo) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    // Get and update the data
    const row = db.prepare('SELECT data FROM app_data WHERE id = 1').get();
    if (!row) {
      return res.status(404).json({ error: 'Data not found' });
    }

    const appData = JSON.parse(row.data);
    const collectionKey = type === 'list' ? 'lists' : 'recipes';
    
    appData[collectionKey] = appData[collectionKey].map((item) =>
      item.id === shareInfo.item_id ? { ...updatedItem, id: shareInfo.item_id } : item
    );

    const now = new Date().toISOString();
    db.prepare('UPDATE app_data SET data = ?, updated_at = ? WHERE id = 1').run(
      JSON.stringify(appData),
      now
    );

    // Broadcast update to all connected clients in the room
    const room = `${type}:${token}`;
    broadcastToRoom(room, 'update', { item: updatedItem, type, id: shareInfo.item_id });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating shared item:', error);
    res.status(500).json({ error: 'Failed to update shared item' });
  }
});

// Merge function - combines server and client data
function mergeData(serverData, clientData) {
  return {
    // Merge lists by ID, prefer newer based on updatedAt
    lists: mergeLists(serverData.lists || [], clientData.lists || []),
    // Merge recipes by ID
    recipes: mergeRecipes(serverData.recipes || [], clientData.recipes || []),
    // Use client categories (user-editable)
    categories: clientData.categories || serverData.categories || [],
    // Merge item history by name, prefer client category
    itemHistory: mergeItemHistory(serverData.itemHistory || [], clientData.itemHistory || []),
    lastSynced: new Date().toISOString(),
  };
}

// Merge itemHistory entries by name, keeping the most recent categoryId/unit and summing counts
function mergeItemHistory(serverHistory, clientHistory) {
  const merged = new Map();
  
  // Handle both old string[] format and new object[] format
  const normalize = (entry) => {
    if (typeof entry === 'string') {
      return { name: entry, categoryId: '', unit: '', count: 1 };
    }
    return { ...entry, unit: entry.unit || '', count: entry.count || 1 };
  };
  
  // Add all server entries
  for (const entry of serverHistory) {
    const normalized = normalize(entry);
    merged.set(normalized.name, normalized);
  }
  
  // Merge with client entries (client has priority for categoryId/unit, use max count)
  for (const entry of clientHistory) {
    const normalized = normalize(entry);
    const existing = merged.get(normalized.name);
    if (existing) {
      merged.set(normalized.name, {
        name: normalized.name,
        categoryId: normalized.categoryId || existing.categoryId,
        unit: normalized.unit || existing.unit,
        count: Math.max(existing.count, normalized.count),
      });
    } else {
      merged.set(normalized.name, normalized);
    }
  }
  
  return Array.from(merged.values()).slice(-500);
}

function mergeLists(serverLists, clientLists) {
  const merged = new Map();
  
  // Add all server lists
  for (const list of serverLists) {
    merged.set(list.id, list);
  }
  
  // Merge/override with client lists
  for (const list of clientLists) {
    const existing = merged.get(list.id);
    if (!existing || new Date(list.updatedAt) >= new Date(existing.updatedAt)) {
      merged.set(list.id, list);
    }
  }
  
  return Array.from(merged.values());
}

function mergeRecipes(serverRecipes, clientRecipes) {
  const merged = new Map();
  
  for (const recipe of serverRecipes) {
    merged.set(recipe.id, recipe);
  }
  
  for (const recipe of clientRecipes) {
    const existing = merged.get(recipe.id);
    if (!existing || new Date(recipe.updatedAt) >= new Date(existing.updatedAt)) {
      merged.set(recipe.id, recipe);
    }
  }
  
  return Array.from(merged.values());
}

// Start server
const PORT = process.env.PORT || 3001;
const protocol = USE_HTTPS ? 'https' : 'http';
const wsProtocol = USE_HTTPS ? 'wss' : 'ws';
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🛒 Grocery API running on port ${PORT}`);
  console.log(`   Health: ${protocol}://localhost:${PORT}/api/health`);
  console.log(`   WebSocket: ${wsProtocol}://localhost:${PORT}`);
});

// Backup database daily
function backupDatabase() {
  const backupDir = join(__dirname, 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().split('T')[0];
  const backupFile = join(backupDir, `grocery-${timestamp}.db`);
  
  if (!fs.existsSync(backupFile)) {
    const sourceDb = join(__dirname, 'grocery.db');
    if (fs.existsSync(sourceDb)) {
      fs.copyFileSync(sourceDb, backupFile);
      console.log(`✅ Database backup created: ${backupFile}`);
    }
  }
}

// Add this route to your server.js
app.get('/api/debug/db', (req, res) => {
  try {
    const row = db.prepare('SELECT data FROM app_data WHERE id = 1').get();
    const appData = row ? JSON.parse(row.data) : null;
    
    const shareTokens = db.prepare('SELECT * FROM share_tokens').all();
    
    res.json({
      appData,
      shareTokens,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Parse recipe with Ollama AI
app.post('/api/parse-recipe', async (req, res) => {
  try {
    const { text, ollamaUrl, categories } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Recipe text is required' });
    }

    // Prepare the prompt for Ollama
    const categoriesStr = categories.join(', ');
    const prompt = `You are a recipe parser. Extract the recipe information from the following text and return ONLY valid JSON (no markdown, no extra text).

Recipe text:
${text}

Available categories: ${categoriesStr}

Return ONLY this JSON structure (ensure it's valid JSON):
{
  "name": "recipe name",
  "servings": "number of servings",
  "prepTime": "preparation time in minutes",
  "cookTime": "cooking time in minutes",
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": "numeric quantity",
      "unit": "unit (g, ml, cups, etc)"
    }
  ],
  "instructions": "step by step instructions separated by numbers like: 1. Step one 2. Step two",
  "category": "one of the available categories that fits best"
}`;

    // Call Ollama API
    const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:8b-instruct-q4_K_M', // or 'neural-chat', 'llama2', etc.
        prompt: prompt,
        stream: false,
        temperature: 0.3, // Low temperature for consistent parsing
      }),
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama API error: ${ollamaResponse.statusText}`);
    }

    const ollamaData = await ollamaResponse.json();
    
    // Extract JSON from response
    let recipeJson;
    try {
      // Try to extract JSON from the response
      const responseText = ollamaData.response;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      recipeJson = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Ollama response:', ollamaData.response);
      return res.status(500).json({
        error: 'Failed to parse recipe. Try rephrasing the recipe text.',
        debug: ollamaData.response,
      });
    }

    // Validate parsed recipe
    if (!recipeJson.name || !recipeJson.ingredients || recipeJson.ingredients.length === 0) {
      return res.status(400).json({
        error: 'Recipe must have at least a name and ingredients',
      });
    }

    res.json({ recipe: recipeJson });
  } catch (error) {
    console.error('Error parsing recipe:', error);
    res.status(500).json({
      error: `Failed to parse recipe: ${error.message}`,
    });
  }
});

// Optional: Endpoint to test Ollama connection
app.get('/api/ollama-test', async (req, res) => {
  try {
    const ollamaUrl = req.query.url || 'http://localhost:11434';
    
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
    });

    if (!response.ok) {
      return res.status(500).json({
        status: 'error',
        message: `Cannot connect to Ollama at ${ollamaUrl}`,
      });
    }

    const data = await response.json();
    res.json({
      status: 'ok',
      message: 'Connected to Ollama',
      models: data.models?.map(m => m.name) || [],
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// Backup on startup
backupDatabase();

// Backup every 24 hours
setInterval(backupDatabase, 24 * 60 * 60 * 1000);