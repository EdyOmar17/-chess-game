// Chess Multiplayer using WebRTC and WebSocket signaling
// Defined as global class

class ChessMultiplayer {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.localConnection = null;
        this.isHost = false;
        this.roomId = null;
        this.onMoveCallback = null;
        this.onConnectCallback = null;
        this.onDisconnectCallback = null;
        this.ws = null;
        this.signalingUrl = this.getSignalingUrl();
        
        // Player information
        this.playerName = "Jugador " + Math.floor(Math.random() * 1000);
        this.opponentName = "Oponente";
        
        // STUN servers (free)
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }

    getSignalingUrl() {
        // Detect if running through ngrok
        if (window.location.hostname.includes('ngrok')) {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${wsProtocol}//${window.location.hostname}/ws`;
        }
        // Local development - WebSocket on same port as HTTP
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${wsProtocol}//${window.location.hostname}:${window.location.port}/ws`;
    }

    // Connect to signaling server
    connectToSignaling() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.signalingUrl);
                
                this.ws.onopen = () => {
                    console.log('Connected to signaling server');
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleSignalingMessage(message);
                    } catch (error) {
                        console.error('Error parsing message:', error);
                    }
                };

                this.ws.onclose = () => {
                    console.log('Disconnected from signaling server');
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };
            } catch (error) {
                console.error('Failed to connect to signaling server:', error);
                reject(error);
            }
        });
    }

    handleSignalingMessage(message) {
        console.log('Received message:', message.type);
        
        switch (message.type) {
            case 'room-created':
                this.roomId = message.roomId;
                console.log('Room created with ID:', this.roomId);
                console.log('Full message received:', message);
                if (this.onRoomCreated) {
                    console.log('Calling onRoomCreated callback with:', this.roomId);
                    this.onRoomCreated(this.roomId);
                } else {
                    console.error('No onRoomCreated callback defined');
                }
                break;
            case 'room-joined':
                console.log('Room joined, handling offer');
                if (this.onRoomJoined) {
                    this.onRoomJoined(message.offer, message.roomId);
                }
                break;
            case 'answer':
                console.log('Received answer');
                this.handleAnswer(message.data && message.data.answer ? message.data.answer : message.data);
                break;
            case 'ice-candidate':
                console.log('Received ICE candidate');
                this.handleIceCandidate(message.data);
                break;
            case 'guest-joined':
                console.log('Guest joined room');
                if (this.onGuestJoined) {
                    this.onGuestJoined();
                }
                this.sendPlayerInfo();
                break;
            case 'move':
                this.handleMessage({ type: 'move', move: message.move });
                break;
            case 'player-info':
                this.handleMessage({ type: 'player-info', playerName: message.playerName });
                break;
            case 'chat':
                if (this.onChatMessage) {
                    this.onChatMessage(message.message, message.sender);
                }
                break;
            case 'player-disconnected':
                console.log('Player disconnected');
                if (this.onPlayerDisconnected) {
                    this.onPlayerDisconnected();
                }
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    sendMessage(type, data = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = {
                type: type,
                roomId: this.roomId,
                data: data
            };
            console.log('Sending message:', type, this.roomId);
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('Cannot send message, WebSocket not ready:', type);
        }
    }

    // Create a new game room
    async createRoom() {
        this.isHost = true;
        
        console.log('Starting room creation process...');
        
        // Wait for WebSocket connection
        try {
            await this.connectToSignaling();
            console.log('WebSocket connected, creating room...');
        } catch (error) {
            console.error('Failed to connect to signaling server:', error);
            throw new Error('No se pudo conectar al servidor. Asegúrate de que el servidor esté corriendo en localhost:3003');
        }
        
        // Verify WebSocket is still connected
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('La conexión WebSocket se cerró. Intenta nuevamente.');
        }
        
        // Create peer connection
        this.peerConnection = new RTCPeerConnection(this.configuration);
        
        // Setup data channel
        this.dataChannel = this.peerConnection.createDataChannel('chess-game');
        this.setupDataChannel();
        
        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendMessage('ice-candidate', { candidate: event.candidate });
            }
        };

        // Create offer
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        
        console.log('Sending create-room request to server...');
        
        // Send create room request
        this.sendMessage('create-room', { offer: offer });
        
        console.log('Create-room request sent, waiting for response...');
    }

    // Join an existing game room
    async joinRoom(roomId) {
        this.isHost = false;
        this.roomId = roomId;
        
        // Wait for WebSocket connection
        try {
            await this.connectToSignaling();
            console.log('WebSocket connected, joining room:', roomId);
        } catch (error) {
            console.error('Failed to connect to signaling server:', error);
            return;
        }
        
        // Create peer connection
        this.peerConnection = new RTCPeerConnection(this.configuration);
        
        // Handle incoming data channel
        this.peerConnection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.setupDataChannel();
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendMessage('ice-candidate', { candidate: event.candidate });
            }
        };

        // Send join room request
        this.sendMessage('join-room', { roomId: roomId });
    }

    // Handle offer when joining room
    async handleOffer(offer, roomId) {
        this.roomId = roomId;
        await this.peerConnection.setRemoteDescription(offer);
        
        // Process any pending ICE candidates
        if (this.pendingIceCandidates) {
            console.log('Processing pending ICE candidates after setRemoteDescription');
            for (const candidate of this.pendingIceCandidates) {
                try {
                    await this.peerConnection.addIceCandidate(candidate);
                } catch (error) {
                    console.warn('Error adding pending ICE candidate:', error);
                }
            }
            this.pendingIceCandidates = [];
        }
        
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        
        this.sendMessage('answer', { answer: answer });
        this.sendPlayerInfo();
    }

    // Handle answer from host
    async handleAnswer(answer) {
        await this.peerConnection.setRemoteDescription(answer);
        
        // Process any pending ICE candidates
        if (this.pendingIceCandidates) {
            console.log('Processing pending ICE candidates');
            for (const candidate of this.pendingIceCandidates) {
                try {
                    await this.peerConnection.addIceCandidate(candidate);
                } catch (error) {
                    console.warn('Error adding pending ICE candidate:', error);
                }
            }
            this.pendingIceCandidates = [];
        }
        this.sendPlayerInfo();
    }

    // Handle ICE candidate
    async handleIceCandidate(data) {
        if (data.candidate && this.peerConnection.remoteDescription) {
            try {
                await this.peerConnection.addIceCandidate(data.candidate);
            } catch (error) {
                console.warn('Error adding ICE candidate:', error);
            }
        } else if (data.candidate) {
            // Store candidate for later if remote description is not ready
            if (!this.pendingIceCandidates) {
                this.pendingIceCandidates = [];
            }
            this.pendingIceCandidates.push(data.candidate);
            console.log('Stored ICE candidate for later');
        }
    }

    // Setup data channel event handlers
    setupDataChannel() {
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            // Send player name when connection opens
            this.sendPlayerInfo();
            if (this.onConnectCallback) {
                this.onConnectCallback();
            }
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            if (this.onDisconnectCallback) {
                this.onDisconnectCallback();
            }
        };

        this.dataChannel.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };
    }

    // Send move to opponent
    sendMove(move) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({ type: 'move', move: move }));
        } else {
            this.sendMessage('move', { move: move });
        }
    }

    // Send chat message
    sendChat(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
                type: 'chat',
                message: message,
                sender: this.playerName
            }));
        }
    }
    
    // Send player information
    sendPlayerInfo() {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({ type: 'player-info', playerName: this.playerName }));
        } else {
            this.sendMessage('player-info', { playerName: this.playerName });
        }
    }
    
    // Set player name
    setPlayerName(name) {
        this.playerName = name;
    }
    
    // Get player names
    getPlayerNames() {
        return {
            local: this.playerName,
            opponent: this.opponentName
        };
    }

    // Handle incoming messages
    handleMessage(message) {
        switch (message.type) {
            case 'move':
                if (this.onMoveCallback) {
                    this.onMoveCallback(message.move);
                }
                break;
            case 'chat':
                console.log('Chat:', message.message);
                if (this.onChatMessage) {
                    this.onChatMessage(message.message, message.sender);
                }
                break;
            case 'player-info':
                this.opponentName = message.playerName;
                console.log('Opponent name:', this.opponentName);
                if (this.onPlayerNameReceived) {
                    this.onPlayerNameReceived(this.opponentName);
                }
                break;
        }
    }

    // Generate random room ID
    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // Close connection
    disconnect() {
        if (this.dataChannel) {
            this.dataChannel.close();
        }
        if (this.peerConnection) {
            this.peerConnection.close();
        }
    }

    // Get connection status
    getStatus() {
        if (!this.dataChannel) return 'disconnected';
        return this.dataChannel.readyState;
    }
}

// Simple signaling server simulation (for demo purposes)
class SimpleSignaling {
    constructor() {
        this.rooms = new Map();
    }

    createRoom(offer) {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.rooms.set(roomId, { offer: offer, answer: null });
        return roomId;
    }

    getRoomOffer(roomId) {
        const room = this.rooms.get(roomId);
        return room ? room.offer : null;
    }

    setRoomAnswer(roomId, answer) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.answer = answer;
        }
    }

    getRoomAnswer(roomId) {
        const room = this.rooms.get(roomId);
        return room ? room.answer : null;
    }
}

// Global instance - Initialize after class definition
const chessMultiplayer = new ChessMultiplayer();
const signalingServer = new SimpleSignaling();
