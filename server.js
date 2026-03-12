// Simple WebSocket Signaling Server for Chess Multiplayer
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3003;
const WS_PORT = null; // WebSocket will run on same port as HTTP

// HTTP Server for serving files (with basic path sanitization)
const server = http.createServer((req, res) => {
    const requestedPath = (req.url || '/').split('?')[0];
    const rawPath = requestedPath === '/' ? 'index.html' : requestedPath;
    const resolvedPath = path.normalize(path.join(__dirname, rawPath));

    // Prevent path traversal
    if (!resolvedPath.startsWith(path.normalize(__dirname))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const extname = path.extname(resolvedPath);
    let contentType = 'text/html';

    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
            contentType = 'image/jpg';
            break;
        case '.svg':
            contentType = 'image/svg+xml';
            break;
        case '.ico':
            contentType = 'image/x-icon';
            break;
    }

    fs.readFile(resolvedPath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// WebSocket Signaling Server - Integrated with HTTP server
const wss = new WebSocket.Server({ 
    server: server,
    path: '/ws'
});

const rooms = new Map();
const clients = new Map();

wss.on('connection', (ws) => {
    console.log('New client connected');
    const clientId = Math.random().toString(36).substring(2, 9);
    clients.set(clientId, ws);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleSignalingMessage(clientId, data, ws);
        } catch (error) {
            console.error('Invalid message format:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected:', clientId);
        handleClientDisconnect(clientId);
        clients.delete(clientId);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function handleSignalingMessage(clientId, message, ws) {
    console.log(`Handling message from ${clientId}:`, message.type);
    const { type, roomId, data } = message;

    switch (type) {
        case 'create-room':
            const newRoomId = generateRoomId();
            console.log(`Creating room ${newRoomId} for client ${clientId}`);
            
            rooms.set(newRoomId, {
                host: clientId,
                hostWs: ws,
                guest: null,
                guestWs: null,
                offer: data.offer
            });
            
            const response = {
                type: 'room-created',
                roomId: newRoomId
            };
            
            console.log('Sending room-created response:', response);
            
            try {
                ws.send(JSON.stringify(response));
                console.log('Room-created response sent successfully');
            } catch (error) {
                console.error('Error sending room-created response:', error);
            }
            break;

        case 'join-room':
            const room = rooms.get(roomId);
            if (room && !room.guest) {
                room.guest = clientId;
                room.guestWs = ws;
                
                // Send offer to guest
                ws.send(JSON.stringify({
                    type: 'room-joined',
                    roomId: roomId,
                    offer: room.offer
                }));

                // Notify host
                room.hostWs.send(JSON.stringify({
                    type: 'guest-joined',
                    roomId: roomId
                }));
            } else {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Room not found or full'
                }));
            }
            break;

        case 'answer':
            const answerRoom = rooms.get(roomId);
            if (answerRoom) {
                // Send answer to host
                answerRoom.hostWs.send(JSON.stringify({
                    type: 'answer',
                    data: data
                }));
            }
            break;

        case 'ice-candidate':
            const iceRoom = rooms.get(roomId);
            if (iceRoom) {
                const targetWs = clientId === iceRoom.host ? iceRoom.guestWs : iceRoom.hostWs;
                if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                    targetWs.send(JSON.stringify({
                        type: 'ice-candidate',
                        data: data
                    }));
                }
            }
            break;

        case 'move':
            const moveRoom = rooms.get(roomId);
            if (moveRoom) {
                const targetWs = clientId === moveRoom.host ? moveRoom.guestWs : moveRoom.hostWs;
                if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                    targetWs.send(JSON.stringify({
                        type: 'move',
                        move: data.move
                    }));
                }
            }
            break;

        case 'player-info':
            const infoRoom = rooms.get(roomId);
            if (infoRoom) {
                const targetWs = clientId === infoRoom.host ? infoRoom.guestWs : infoRoom.hostWs;
                if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                    targetWs.send(JSON.stringify({
                        type: 'player-info',
                        playerName: data.playerName
                    }));
                }
            }
            break;

        case 'chat':
            const chatRoom = rooms.get(roomId);
            if (chatRoom) {
                const targetWs = clientId === chatRoom.host ? chatRoom.guestWs : chatRoom.hostWs;
                if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                    targetWs.send(JSON.stringify({
                        type: 'chat',
                        message: data.message,
                        sender: data.sender
                    }));
                }
            }
            break;
    }
}

function handleClientDisconnect(clientId) {
    // Find and clean up rooms
    for (const [roomId, room] of rooms.entries()) {
        if (room.host === clientId || room.guest === clientId) {
            // Notify the other player
            const otherWs = room.host === clientId ? room.guestWs : room.hostWs;
            if (otherWs && otherWs.readyState === WebSocket.OPEN) {
                otherWs.send(JSON.stringify({
                    type: 'player-disconnected'
                }));
            }
            rooms.delete(roomId);
            break;
        }
    }
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Start servers
server.listen(PORT, () => {
    console.log(`HTTP Server running on http://localhost:${PORT}`);
    console.log(`WebSocket Signaling Server running on ws://localhost:${PORT}/ws`);
});

// Export for testing
module.exports = { wss, rooms, clients };
