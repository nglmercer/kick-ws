# Browser Usage Guide

This guide covers how to use Kick WebSocket Lite in web browsers.

## CDN Usage

### Minified Version (Recommended)
```html
<script src="https://unpkg.com/kick-ws@latest/dist/kick-ws.min.js"></script>
<script>
  // Available as global variable KickWebSocket
  const kickWS = new KickWebSocket({ debug: true });
  kickWS.connect('channel-name');
</script>
```

### ES Modules (Modern Browsers)
```html
<script type="module">
  import { KickWebSocket } from 'https://unpkg.com/kick-ws@latest/dist/kick-ws.min.js';
  
  const kickWS = new KickWebSocket({ debug: true });
  kickWS.connect('channel-name');
</script>
```

## Browser Compatibility

### Supported Browsers
- Chrome 80+
- Firefox 72+
- Safari 13.1+
- Edge 80+

### Required Features
The library requires these browser features:
- WebSocket API
- ES6 Classes
- Promises
- Arrow Functions

### Browser Compatibility
The library is compatible with all modern browsers that support WebSocket API. No additional compatibility checks are required.

## Complete Example

### HTML Chat Widget
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kick.com Chat Widget</title>
    <style>
        .chat-container {
            width: 400px;
            height: 500px;
            border: 1px solid #ccc;
            border-radius: 8px;
            overflow: hidden;
            font-family: Arial, sans-serif;
        }
        
        .chat-header {
            background: #53fc18;
            color: white;
            padding: 10px;
            font-weight: bold;
        }
        
        .chat-messages {
            height: 400px;
            overflow-y: auto;
            padding: 10px;
            background: #1a1a1a;
            color: white;
        }
        
        .message {
            margin-bottom: 8px;
            padding: 5px;
            border-radius: 4px;
            background: rgba(255,255,255,0.1);
        }
        
        .message-username {
            font-weight: bold;
            margin-right: 8px;
        }
        
        .connection-status {
            padding: 10px;
            text-align: center;
            font-size: 12px;
        }
        
        .status-connected { background: #4CAF50; color: white; }
        .status-disconnected { background: #f44336; color: white; }
        .status-connecting { background: #ff9800; color: white; }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            Kick.com Chat - <span id="channel-name">Loading...</span>
        </div>
        
        <div id="chat-messages" class="chat-messages"></div>
        
        <div id="connection-status" class="connection-status status-disconnected">
            Disconnected
        </div>
    </div>

    <script src="https://unpkg.com/kick-ws@latest/dist/kick-ws.min.js"></script>
    <script>
        class ChatWidget {
            constructor() {
                this.kickWS = new KickWebSocket({ debug: false });
                this.messagesContainer = document.getElementById('chat-messages');
                this.statusElement = document.getElementById('connection-status');
                this.channelElement = document.getElementById('channel-name');
                
                this.setupEventListeners();
                this.connect('xqc'); // Default channel
            }
            
            setupEventListeners() {
                this.kickWS.on('ready', () => {
                    this.updateStatus('Connected', 'connected');
                    this.channelElement.textContent = this.kickWS.getChannelName();
                });
                
                this.kickWS.on('disconnect', () => {
                    this.updateStatus('Disconnected', 'disconnected');
                });
                
                this.kickWS.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    this.updateStatus('Error', 'disconnected');
                });
                
                this.kickWS.onChatMessage((message) => {
                    this.addMessage(message);
                });
                
                this.kickWS.onUserBanned((ban) => {
                    this.addSystemMessage(`🚫 ${ban.username} was banned`);
                });
                
                this.kickWS.onSubscription((sub) => {
                    this.addSystemMessage(`⭐ ${sub.username} subscribed!`);
                });
            }
            
            connect(channelName) {
                this.updateStatus('Connecting...', 'connecting');
                this.kickWS.connect(channelName).catch(error => {
                    console.error('Failed to connect:', error);
                    this.updateStatus('Connection failed', 'disconnected');
                });
            }
            
            addMessage(message) {
                const messageEl = document.createElement('div');
                messageEl.className = 'message';
                
                const username = message.sender.username;
                const color = message.sender.identity?.color || '#ffffff';
                
                messageEl.innerHTML = `
                    <span class="message-username" style="color: ${color}">${username}:</span>
                    <span class="message-content">${this.escapeHtml(message.content)}</span>
                `;
                
                this.messagesContainer.appendChild(messageEl);
                this.scrollToBottom();
            }
            
            addSystemMessage(text) {
                const messageEl = document.createElement('div');
                messageEl.className = 'message';
                messageEl.style.background = 'rgba(255, 215, 0, 0.2)';
                messageEl.style.fontStyle = 'italic';
                messageEl.textContent = text;
                
                this.messagesContainer.appendChild(messageEl);
                this.scrollToBottom();
            }
            
            updateStatus(text, status) {
                this.statusElement.textContent = text;
                this.statusElement.className = `connection-status status-${status}`;
            }
            
            scrollToBottom() {
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            }
            
            escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
            
            changeChannel(channelName) {
                this.kickWS.disconnect();
                this.messagesContainer.innerHTML = '';
                this.connect(channelName);
            }
        }
        
        // Initialize chat widget when page loads
        document.addEventListener('DOMContentLoaded', () => {
            const chat = new ChatWidget();
            
            // Example: Change channel after 30 seconds
            // setTimeout(() => chat.changeChannel('another-channel'), 30000);
        });
    </script>
</body>
</html>
```

## Advanced Browser Features

### Service Worker Integration
```javascript
// service-worker.js
self.addEventListener('message', (event) => {
    if (event.data.type === 'KICK_WEBSOCKET_MESSAGE') {
        // Handle WebSocket messages in service worker
        console.log('Received message:', event.data.message);
    }
});

// main.js
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').then(registration => {
        const kickWS = new KickWebSocket();
        
        kickWS.onChatMessage((message) => {
            // Send message to service worker
            navigator.serviceWorker.controller.postMessage({
                type: 'KICK_WEBSOCKET_MESSAGE',
                message: message
            });
        });
    });
}
```

### Background Sync
```javascript
// Store messages for background sync
class MessageStorage {
    constructor() {
        this.dbName = 'kick-messages';
        this.version = 1;
    }
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('messages')) {
                    const store = db.createObjectStore('messages', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    store.createIndex('timestamp', 'timestamp');
                }
            };
        });
    }
    
    async saveMessage(message) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            const request = store.add({
                ...message,
                timestamp: Date.now()
            });
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getMessages(limit = 100) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['messages'], 'readonly');
            const store = transaction.objectStore('messages');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const messages = request.result
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, limit);
                resolve(messages);
            };
            request.onerror = () => reject(request.error);
        });
    }
}

// Usage with Kick WebSocket
const storage = new MessageStorage();

const kickWS = new KickWebSocket();
kickWS.onChatMessage(async (message) => {
    await storage.saveMessage(message);
});
```

## Performance Tips

### Connection Pooling
```javascript
class ConnectionPool {
    constructor(maxConnections = 3) {
        this.connections = [];
        this.maxConnections = maxConnections;
        this.currentIndex = 0;
    }
    
    getConnection() {
        if (this.connections.length < this.maxConnections) {
            const ws = new KickWebSocket();
            this.connections.push(ws);
            return ws;
        }
        
        const connection = this.connections[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.maxConnections;
        return connection;
    }
    
    closeAll() {
        this.connections.forEach(ws => ws.disconnect());
        this.connections = [];
    }
}

// Use connection pool for multiple channels
const pool = new ConnectionPool();

['channel1', 'channel2', 'channel3'].forEach(channel => {
    const ws = pool.getConnection();
    ws.connect(channel);
});
```

### Memory Management
```javascript
class MemoryOptimizedChat {
    constructor() {
        this.kickWS = new KickWebSocket({ 
            enableBuffer: false, // Disable buffer to save memory
            filteredEvents: ['ChatMessage'] // Only listen to needed events
        });
        this.maxMessages = 100;
        this.messages = [];
    }
    
    addMessage(message) {
        this.messages.push(message);
        
        // Remove old messages to prevent memory leaks
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
    }
    
    cleanup() {
        this.kickWS.disconnect();
        this.messages = [];
    }
}
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure you're using HTTPS or localhost
2. **WebSocket Errors**: Check browser console for specific error messages
3. **Memory Leaks**: Always call `disconnect()` when done
4. **Connection Drops**: Enable auto-reconnect in options

### Debug Mode
```javascript
const kickWS = new KickWebSocket({ 
    debug: true, // Enable detailed logging
    autoReconnect: true,
    reconnectInterval: 3000
});
```

### Error Handling
```javascript
const kickWS = new KickWebSocket();

kickWS.on('error', (error) => {
    console.error('WebSocket error:', error);
    
    // Show user-friendly error message
    const errorEl = document.getElementById('error-message');
    errorEl.textContent = 'Connection failed. Please refresh the page.';
    errorEl.style.display = 'block';
});

kickWS.on('disconnect', ({ reason }) => {
    console.log('Disconnected:', reason);
    
    // Attempt to reconnect after delay
    setTimeout(() => {
        if (!kickWS.isConnected()) {
            kickWS.connect('channel-name');
        }
    }, 5000);
});
```
