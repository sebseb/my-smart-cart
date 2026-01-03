import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database
const db = new Database(join(__dirname, 'grocery.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS app_data (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
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

// Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

// Merge function - combines server and client data
function mergeData(serverData, clientData) {
  return {
    // Merge lists by ID, prefer newer based on updatedAt
    lists: mergeLists(serverData.lists || [], clientData.lists || []),
    // Merge recipes by ID
    recipes: mergeRecipes(serverData.recipes || [], clientData.recipes || []),
    // Use client categories (user-editable)
    categories: clientData.categories || serverData.categories || [],
    // Combine item history (unique values)
    itemHistory: [...new Set([
      ...(serverData.itemHistory || []),
      ...(clientData.itemHistory || []),
    ])].slice(-500),
    lastSynced: new Date().toISOString(),
  };
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🛒 Grocery API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});
