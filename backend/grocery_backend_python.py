import sqlite3
import json
import os
import secrets
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sock import Sock
import threading
from collections import defaultdict

# Initialize Flask app
app = Flask(__name__)
CORS(app)
sock = Sock(app)

# Database setup
DB_PATH = 'grocery.db'

def init_db():
    """Initialize database and create tables"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS app_data (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            data TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS share_tokens (
            token TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            item_id TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    
    # Initialize with empty data if not exists
    cursor.execute('SELECT * FROM app_data WHERE id = 1')
    if not cursor.fetchone():
        default_data = {
            'lists': [],
            'recipes': [],
            'categories': [
                {'id': 'fruit', 'name': 'Fruits', 'color': 'category-fruit'},
                {'id': 'vegetables', 'name': 'Vegetables', 'color': 'category-vegetables'},
                {'id': 'meat', 'name': 'Meat', 'color': 'category-meat'},
                {'id': 'fish', 'name': 'Fish', 'color': 'category-fish'},
                {'id': 'pasta', 'name': 'Pasta & Rice', 'color': 'category-pasta'},
                {'id': 'sauce', 'name': 'Sauce', 'color': 'category-sauce'},
                {'id': 'biscuit', 'name': 'Biscuits', 'color': 'category-biscuit'},
                {'id': 'breakfast', 'name': 'Breakfast', 'color': 'category-breakfast'},
                {'id': 'milk', 'name': 'Dairy', 'color': 'category-milk'},
                {'id': 'cleaning', 'name': 'Cleaning', 'color': 'category-cleaning'},
            ],
            'itemHistory': [],
            'lastSynced': None,
        }
        cursor.execute(
            'INSERT INTO app_data (id, data, updated_at) VALUES (?, ?, ?)',
            (1, json.dumps(default_data), datetime.utcnow().isoformat())
        )
        conn.commit()
    
    conn.close()

# Initialize database
init_db()

# WebSocket room management
rooms = defaultdict(set)
rooms_lock = threading.Lock()

def get_db_connection():
    """Get a database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def broadcast_to_room(room, msg_type, data, exclude_ws=None):
    """Broadcast message to all clients in a room"""
    with rooms_lock:
        if room in rooms:
            msg = json.dumps({'type': msg_type, 'data': data})
            for client in rooms[room]:
                if client != exclude_ws:
                    try:
                        client.send(msg)
                    except Exception as e:
                        print(f"Error broadcasting to client: {e}")

@sock.route('/ws')
def websocket(ws):
    """WebSocket connection handler"""
    print('WebSocket client connected')
    subscribed_rooms = set()
    
    while True:
        try:
            message = ws.receive()
            if message is None:
                break
            
            data = json.loads(message)
            msg_type = data.get('type')
            
            if msg_type == 'subscribe':
                room = data.get('data', {}).get('room')
                with rooms_lock:
                    rooms[room].add(ws)
                    subscribed_rooms.add(room)
                print(f'Client subscribed to room: {room}')
            
            elif msg_type == 'unsubscribe':
                room = data.get('data', {}).get('room')
                with rooms_lock:
                    if room in rooms:
                        rooms[room].discard(ws)
                        subscribed_rooms.discard(room)
            
            elif msg_type == 'update':
                room = data.get('data', {}).get('room')
                payload = data.get('data', {}).get('payload')
                if room in rooms:
                    broadcast_to_room(room, 'update', payload, exclude_ws=ws)
        
        except json.JSONDecodeError:
            print('WebSocket message error: invalid JSON')
        except Exception as e:
            print(f'WebSocket error: {e}')
            break
    
    print('WebSocket client disconnected')
    with rooms_lock:
        for room in subscribed_rooms:
            if room in rooms:
                rooms[room].discard(ws)
                if not rooms[room]:
                    del rooms[room]

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/data', methods=['GET'])
def get_data():
    """Get all data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT data, updated_at FROM app_data WHERE id = 1')
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return jsonify({
                'data': json.loads(row['data']),
                'updatedAt': row['updated_at']
            })
        else:
            return jsonify({'error': 'No data found'}), 404
    except Exception as e:
        print(f'Error getting data: {e}')
        return jsonify({'error': 'Failed to get data'}), 500

@app.route('/api/sync', methods=['POST'])
def sync_data():
    """Sync data between client and server"""
    try:
        body = request.get_json()
        client_data = body.get('data')
        last_synced = body.get('lastSynced')
        
        # Get server data
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT data, updated_at FROM app_data WHERE id = 1')
        server_row = cursor.fetchone()
        
        server_data = json.loads(server_row['data']) if server_row else None
        server_updated_at = server_row['updated_at'] if server_row else None
        
        # Merge logic
        if not server_data or not server_updated_at:
            merged_data = client_data
        elif not last_synced or datetime.fromisoformat(server_updated_at) <= datetime.fromisoformat(last_synced):
            merged_data = client_data
        else:
            merged_data = merge_data(server_data, client_data)
        
        # Save merged data
        now = datetime.utcnow().isoformat()
        cursor.execute(
            'UPDATE app_data SET data = ?, updated_at = ? WHERE id = 1',
            (json.dumps(merged_data), now)
        )
        conn.commit()
        conn.close()
        
        return jsonify({
            'data': merged_data,
            'updatedAt': now
        })
    except Exception as e:
        print(f'Error syncing data: {e}')
        return jsonify({'error': 'Failed to sync data'}), 500

@app.route('/api/share/generate', methods=['POST'])
def generate_share():
    """Generate share token"""
    try:
        body = request.get_json()
        share_type = body.get('type')
        item_id = body.get('id')
        
        if not share_type or not item_id:
            return jsonify({'error': 'Missing type or id'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if token already exists
        cursor.execute(
            'SELECT token FROM share_tokens WHERE type = ? AND item_id = ?',
            (share_type, item_id)
        )
        existing = cursor.fetchone()
        
        if existing:
            conn.close()
            return jsonify({'token': existing['token']})
        
        # Generate new token
        token = secrets.token_hex(16)
        cursor.execute(
            'INSERT INTO share_tokens (token, type, item_id, created_at) VALUES (?, ?, ?, ?)',
            (token, share_type, item_id, datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()
        
        return jsonify({'token': token})
    except Exception as e:
        print(f'Error generating share token: {e}')
        return jsonify({'error': 'Failed to generate share token'}), 500

@app.route('/api/share/<share_type>/<token>', methods=['GET'])
def get_shared_item(share_type, token):
    """Get shared item by token"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Look up token
        cursor.execute(
            'SELECT item_id FROM share_tokens WHERE token = ? AND type = ?',
            (token, share_type)
        )
        share_info = cursor.fetchone()
        
        if not share_info:
            conn.close()
            return jsonify({'error': 'Share link not found'}), 404
        
        # Get the data
        cursor.execute('SELECT data FROM app_data WHERE id = 1')
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({'error': 'Data not found'}), 404
        
        app_data = json.loads(row['data'])
        collection = app_data['lists'] if share_type == 'list' else app_data['recipes']
        item = next((i for i in collection if i['id'] == share_info['item_id']), None)
        
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        return jsonify({'data': item, 'id': share_info['item_id']})
    except Exception as e:
        print(f'Error getting shared item: {e}')
        return jsonify({'error': 'Failed to get shared item'}), 500

@app.route('/api/share/<share_type>/<token>', methods=['PUT'])
def update_shared_item(share_type, token):
    """Update shared item"""
    try:
        body = request.get_json()
        updated_item = body.get('data')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Look up token
        cursor.execute(
            'SELECT item_id FROM share_tokens WHERE token = ? AND type = ?',
            (token, share_type)
        )
        share_info = cursor.fetchone()
        
        if not share_info:
            conn.close()
            return jsonify({'error': 'Share link not found'}), 404
        
        # Get and update the data
        cursor.execute('SELECT data FROM app_data WHERE id = 1')
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({'error': 'Data not found'}), 404
        
        app_data = json.loads(row['data'])
        collection_key = 'lists' if share_type == 'list' else 'recipes'
        
        app_data[collection_key] = [
            {**updated_item, 'id': share_info['item_id']} if item['id'] == share_info['item_id'] else item
            for item in app_data[collection_key]
        ]
        
        now = datetime.utcnow().isoformat()
        cursor.execute(
            'UPDATE app_data SET data = ?, updated_at = ? WHERE id = 1',
            (json.dumps(app_data), now)
        )
        conn.commit()
        conn.close()
        
        # Broadcast update to all connected clients in the room
        room = f"{share_type}:{token}"
        broadcast_to_room(room, 'update', {
            'item': updated_item,
            'type': share_type,
            'id': share_info['item_id']
        })
        
        return jsonify({'success': True})
    except Exception as e:
        print(f'Error updating shared item: {e}')
        return jsonify({'error': 'Failed to update shared item'}), 500

def merge_data(server_data, client_data):
    """Merge server and client data"""
    return {
        'lists': merge_lists(server_data.get('lists', []), client_data.get('lists', [])),
        'recipes': merge_recipes(server_data.get('recipes', []), client_data.get('recipes', [])),
        'categories': client_data.get('categories', server_data.get('categories', [])),
        'itemHistory': list(dict.fromkeys([
            *server_data.get('itemHistory', []),
            *client_data.get('itemHistory', [])
        ]))[-500:],
        'lastSynced': datetime.utcnow().isoformat(),
    }

def merge_lists(server_lists, client_lists):
    """Merge lists by ID, prefer newer based on updatedAt"""
    merged = {}
    
    for lst in server_lists:
        merged[lst['id']] = lst
    
    for lst in client_lists:
        existing = merged.get(lst['id'])
        if not existing or datetime.fromisoformat(lst.get('updatedAt', '')) >= datetime.fromisoformat(existing.get('updatedAt', '')):
            merged[lst['id']] = lst
    
    return list(merged.values())

def merge_recipes(server_recipes, client_recipes):
    """Merge recipes by ID, prefer newer based on updatedAt"""
    merged = {}
    
    for recipe in server_recipes:
        merged[recipe['id']] = recipe
    
    for recipe in client_recipes:
        existing = merged.get(recipe['id'])
        if not existing or datetime.fromisoformat(recipe.get('updatedAt', '')) >= datetime.fromisoformat(existing.get('updatedAt', '')):
            merged[recipe['id']] = recipe
    
    return list(merged.values())

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    print(f'🛒 Grocery API running on port {port}')
    print(f'   Health: http://localhost:{port}/api/health')
    print(f'   WebSocket: ws://localhost:{port}/ws')
    app.run(host='0.0.0.0', port=port, debug=False)