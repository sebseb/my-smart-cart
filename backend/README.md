# Grocery List Backend

This backend runs on your NUC and provides:
- REST API for data sync
- WebSocket server for real-time collaboration
- SQLite database for persistence
- Share link generation and management

## Setup

```bash
cd backend
npm install
npm start
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `VITE_API_URL` - Set in frontend to point to your NUC's Tailscale IP
- `VITE_WS_URL` - WebSocket URL (same host, e.g., `ws://100.x.x.x:3001`)

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/data` - Get all data
- `POST /api/sync` - Sync client data with server
- `POST /api/share/generate` - Generate share token for list/recipe
- `GET /api/share/:type/:token` - Get shared item
- `PUT /api/share/:type/:token` - Update shared item

## WebSocket Events

Connect to `ws://your-nuc-ip:3001` for real-time updates:

- `subscribe` - Subscribe to a room (e.g., `list:TOKEN` or `recipe:TOKEN`)
- `unsubscribe` - Leave a room
- `update` - Broadcast updates to room members

This folder contains the backend code to run on your NUC via Tailscale.

## Prerequisites

- Node.js 18+ installed on your NUC
- npm or yarn

## Setup

1. Copy this `backend` folder to your NUC

2. Install dependencies:
```bash
cd backend
npm install
```

3. Start the server:
```bash
npm start
```

The server will run on port 3001 by default.

## Configuration

### Frontend Configuration

In your Lovable project, create a `.env` file or set the environment variable:

```
VITE_API_URL=http://100.x.x.x:3001/api
```

Replace `100.x.x.x` with your NUC's Tailscale IP address.

### Server Port

You can change the port by setting the `PORT` environment variable:

```bash
PORT=3001 npm start
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/sync` - Sync data between client and server

## Database

The backend uses SQLite for persistence. The database file (`grocery.db`) will be created automatically in the backend folder.

## Running as a Service

To keep the server running, you can use PM2:

```bash
npm install -g pm2
pm2 start npm --name "grocery-api" -- start
pm2 save
pm2 startup
```
