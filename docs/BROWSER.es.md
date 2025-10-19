# Guía de Uso en Navegador

Esta guía cubre cómo usar Kick WebSocket Lite en navegadores web.

## Uso con CDN

### Versión Minificada (Recomendada)
```html
<script src="https://unpkg.com/kick-wss@latest/dist/kick-wss.min.js"></script>
<script>
  // Disponible como variable global KickWebSocket
  const kickWS = new KickWebSocket({ debug: true });
  kickWS.connect('nombre-del-canal');
</script>
```

### Módulos ES (Navegadores Modernos)
```html
<script type="module">
  import { KickWebSocket } from 'https://unpkg.com/kick-wss@latest/dist/kick-wss.min.js';

  const kickWS = new KickWebSocket({ debug: true });
  kickWS.connect('nombre-del-canal');
</script>
```

## Compatibilidad con Navegadores

### Navegadores Soportados
- Chrome 80+
- Firefox 72+
- Safari 13.1+
- Edge 80+

### Características Requeridas
La librería requiere estas características del navegador:
- WebSocket API
- Clases ES6
- Promesas
- Arrow Functions

### Compatibilidad de Navegador
La librería es compatible con todos los navegadores modernos que soportan WebSocket API. No se requiere ninguna verificación de compatibilidad adicional.

## Ejemplo Completo

### Widget de Chat HTML
```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Widget de Chat Kick.com</title>
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
            Chat Kick.com - <span id="channel-name">Cargando...</span>
        </div>

        <div id="chat-messages" class="chat-messages"></div>

        <div id="connection-status" class="connection-status status-disconnected">
            Desconectado
        </div>
    </div>

    <script src="https://unpkg.com/kick-wss@latest/dist/kick-wss.min.js"></script>
    <script>
        class ChatWidget {
            constructor() {
                this.kickWS = new KickWebSocket({ debug: false });
                this.messagesContainer = document.getElementById('chat-messages');
                this.statusElement = document.getElementById('connection-status');
                this.channelElement = document.getElementById('channel-name');

                this.setupEventListeners();
                this.connect('xqc'); // Canal por defecto
            }

            setupEventListeners() {
                this.kickWS.on('ready', () => {
                    this.updateStatus('Conectado', 'connected');
                    this.channelElement.textContent = this.kickWS.getChannelName();
                });

                this.kickWS.on('disconnect', () => {
                    this.updateStatus('Desconectado', 'disconnected');
                });

                this.kickWS.on('error', (error) => {
                    console.error('Error WebSocket:', error);
                    this.updateStatus('Error', 'disconnected');
                });

                this.kickWS.onChatMessage((message) => {
                    this.addMessage(message);
                });

                this.kickWS.onUserBanned((ban) => {
                    this.addSystemMessage(`🚫 ${ban.username} fue baneado`);
                });

                this.kickWS.onSubscription((sub) => {
                    this.addSystemMessage(`⭐ ¡${sub.username} se suscribió!`);
                });
            }

            connect(channelName) {
                this.updateStatus('Conectando...', 'connecting');
                this.kickWS.connect(channelName).catch(error => {
                    console.error('Fallo al conectar:', error);
                    this.updateStatus('Conexión fallida', 'disconnected');
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

        // Inicializar widget cuando la página carga
        document.addEventListener('DOMContentLoaded', () => {
            const chat = new ChatWidget();

            // Ejemplo: Cambiar canal después de 30 segundos
            // setTimeout(() => chat.changeChannel('otro-canal'), 30000);
        });
    </script>
</body>
</html>
```

## Características Avanzadas en Navegador

### Integración con Service Worker
```javascript
// service-worker.js
self.addEventListener('message', (event) => {
    if (event.data.type === 'KICK_WEBSOCKET_MESSAGE') {
        // Manejar mensajes de WebSocket en service worker
        console.log('Mensaje recibido:', event.data.message);
    }
});

// main.js
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').then(registration => {
        const kickWS = new KickWebSocket();

        kickWS.onChatMessage((message) => {
            // Enviar mensaje al service worker
            navigator.serviceWorker.controller.postMessage({
                type: 'KICK_WEBSOCKET_MESSAGE',
                message: message
            });
        });
    });
}
```

### Sincronización en Segundo Plano
```javascript
// Almacenar mensajes para sincronización en segundo plano
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

// Uso con Kick WebSocket
const storage = new MessageStorage();

const kickWS = new KickWebSocket();
kickWS.onChatMessage(async (message) => {
    await storage.saveMessage(message);
});
```

## Consejos de Rendimiento

### Pool de Conexiones
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

// Usar pool de conexiones para múltiples canales
const pool = new ConnectionPool();

['canal1', 'canal2', 'canal3'].forEach(channel => {
    const ws = pool.getConnection();
    ws.connect(channel);
});
```

### Gestión de Memoria
```javascript
class MemoryOptimizedChat {
    constructor() {
        this.kickWS = new KickWebSocket({
            enableBuffer: false, // Deshabilitar buffer para ahorrar memoria
            filteredEvents: ['ChatMessage'] // Escuchar solo eventos necesarios
        });
        this.maxMessages = 100;
        this.messages = [];
    }

    addMessage(message) {
        this.messages.push(message);

        // Eliminar mensajes antiguos para prevenir fugas de memoria
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

## Solución de Problemas

### Problemas Comunes

1. **Errores CORS**: Asegúrate de usar HTTPS o localhost
2. **Errores WebSocket**: Revisa la consola del navegador para mensajes de error específicos
3. **Fugas de Memoria**: Siempre llama a `disconnect()` cuando termines
4. **Caídas de Conexión**: Habilita auto-reconexión en las opciones

### Modo Debug
```javascript
const kickWS = new KickWebSocket({
    debug: true, // Habilitar logging detallado
    autoReconnect: true,
    reconnectInterval: 3000
});
```

### Manejo de Errores
```javascript
const kickWS = new KickWebSocket();

kickWS.on('error', (error) => {
    console.error('Error WebSocket:', error);

    // Mostrar mensaje de error amigable
    const errorEl = document.getElementById('error-message');
    errorEl.textContent = 'Conexión fallida. Por favor recarga la página.';
    errorEl.style.display = 'block';
});

kickWS.on('disconnect', ({ reason }) => {
    console.log('Desconectado:', reason);

    // Intentar reconectar después de un retraso
    setTimeout(() => {
        if (!kickWS.isConnected()) {
            kickWS.connect('nombre-del-canal');
        }
    }, 5000);
});
```
