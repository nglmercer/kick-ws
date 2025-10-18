# 🚀 Guía de Inicio Rápido - Kick WebSocket Lite

## ¿Qué es?

Kick WebSocket Lite es una librería ultraligera para conectar a los WebSockets de Kick.com sin necesidad de autenticación. Perfecta para bots de análisis, monitoreo de chats, y aplicaciones que solo necesitan leer datos.

## ✨ Características Principales

- 🎯 **Cero dependencias** - Solo usa WebSocket nativo
- 📡 **Conexión en tiempo real** a chats de Kick.com
- 🔄 **Auto-reconexión** automática
- 🎛️ **Filtrado de eventos** para optimizar rendimiento
- 📊 **Buffer de mensajes** opcional para análisis
- 🛠️ **TypeScript** incluido
- 🐛 **Debug mode** para desarrollo

## 📦 Instalación

```bash
npm install kick-websocket-lite
```

## 🎯 Uso Básico

```typescript
import { KickWebSocket } from 'kick-websocket-lite';

// Crear instancia
const kickWS = new KickWebSocket({ debug: true });

// Conectar a un canal
kickWS.connect('nombre-del-canal');

// Escuchar mensajes
kickWS.onChatMessage((message) => {
  console.log(`${message.sender.username}: ${message.content}`);
});

// Eventos de conexión
kickWS.on('ready', () => console.log('✅ Conectado'));
kickWS.on('disconnect', () => console.log('❌ Desconectado'));
```

## 🎛️ Eventos Disponibles

### Eventos de Chat
```typescript
kickWS.onChatMessage((msg) => console.log(msg.content));
kickWS.onMessageDeleted((del) => console.log('Mensaje eliminado:', del.message_id));
```

### Eventos de Usuarios
```typescript
kickWS.onUserBanned((ban) => console.log('Baneado:', ban.username));
kickWS.onSubscription((sub) => console.log('Nueva sub:', sub.username));
```

### Eventos de Stream
```typescript
kickWS.onStreamHost((host) => console.log('Host:', host.hoster));
kickWS.onPollUpdate((poll) => console.log('Encuesta:', poll.question));
```

## ⚙️ Configuración Avanzada

```typescript
const kickWS = new KickWebSocket({
  debug: true,                    // Mostrar logs
  autoReconnect: true,            // Reconectar automáticamente
  reconnectInterval: 5000,        // Tiempo de reconexión (ms)
  enableBuffer: true,             // Habilitar buffer
  bufferSize: 1000,               // Tamaño del buffer
  filteredEvents: [               // Eventos a escuchar
    'ChatMessage', 
    'UserBanned', 
    'Subscription'
  ]
});
```

## 🏗️ Preconfiguraciones

```typescript
// Modo ligero (bajo consumo)
const kickWS = KickWebSocket.createLightweight('canal');

// Modo debug
const kickWS = KickWebSocket.createDebug('canal');

// Modo analítico
const kickWS = KickWebSocket.createAnalytics('canal');
```

## 📊 Ejemplo: Analizador de Actividad

```typescript
const kickWS = KickWebSocket.createAnalytics('streamer-popular');

let stats = { messages: 0, subs: 0, bans: 0 };

kickWS.onChatMessage(() => stats.messages++);
kickWS.onSubscription(() => stats.subs++);
kickWS.onUserBanned(() => stats.bans++);

// Reporte cada minuto
setInterval(() => {
  console.log(`📊 Último minuto: ${stats.messages} msgs, ${stats.subs} subs, ${stats.bans} bans`);
  stats = { messages: 0, subs: 0, bans: 0 };
}, 60000);
```

## 🔧 Métodos Útiles

```typescript
// Estado de conexión
kickWS.isConnected();           // true/false
kickWS.getConnectionState();    // 'connected', 'disconnected', etc.

// Información del canal
kickWS.getChannelName();        // 'nombre-del-canal'
kickWS.getChannelId();          // 12345

// Buffer de mensajes
const messages = kickWS.getMessageBuffer();
kickWS.clearMessageBuffer();

// Estadísticas
const stats = kickWS.getStats();
console.log(stats);
```

## 🎯 Ejemplo: Bot de Notificaciones

```typescript
const kickWS = new KickWebSocket();

kickWS.connect('canal-monitoreado');

// Detectar palabras clave
kickWS.onChatMessage((message) => {
  if (message.content.includes('!help')) {
    sendNotification(`🚨 Ayuda solicitada por ${message.sender.username}`);
  }
});

// Notificar suscripciones
kickWS.onSubscription((sub) => {
  sendNotification(`⭐ Nueva suscripción: ${sub.username}`);
});

// Notificar bans
kickWS.onUserBanned((ban) => {
  sendNotification(`🔨 Usuario baneado: ${ban.username}`);
});

function sendNotification(text: string) {
  // Implementar tu sistema de notificaciones
  console.log('🔔', text);
}
```

## 🌐 Múltiples Canales

```typescript
const channels = ['streamer1', 'streamer2', 'streamer3'];

channels.forEach(channel => {
  const ws = new KickWebSocket({ debug: false });
  
  ws.connect(channel);
  
  ws.onChatMessage((msg) => {
    console.log(`[${channel}] ${msg.sender.username}: ${msg.content}`);
  });
});
```

## 📈 Estructura de Datos

### Mensaje de Chat
```typescript
{
  id: "123",
  content: "Hola mundo!",
  type: "message",
  created_at: "2024-01-01T00:00:00Z",
  sender: {
    id: 456,
    username: "usuario",
    slug: "usuario",
    identity: {
      color: "#ffffff",
      badges: ["subscriber"]
    }
  },
  chatroom: { id: 789 }
}
```

## 🚨 Limitaciones

- 📖 **Solo lectura**: No puede enviar mensajes
- 🔓 **Sin autenticación**: Solo chats públicos
- 🌐 **Requiere internet**: Conexión a servidores de Kick.com

## 🔍 Debug y Troubleshooting

```typescript
// Activar modo debug
const kickWS = new KickWebSocket({ debug: true });

// Ver mensajes raw
kickWS.on('rawMessage', (raw) => {
  console.log('Raw:', raw);
});

// Manejar errores
kickWS.on('error', (error) => {
  console.error('Error:', error);
});

// Ver estado
console.log('Estado:', kickWS.getStats());
```

## 📚 Más Ejemplos

Revisa el archivo `examples.ts` para más casos de uso:
- Bot de registro de actividad
- Analizador de sentimientos
- Sistema de notificaciones
- Gestor de múltiples conexiones

## 🆘 Soporte

- 📖 **Documentación completa**: `README.md`
- 🐛 **Issues**: [GitHub Issues](https://github.com/retconned/kick-js/issues)
- 💬 **Discord**: Servidor de soporte

## 🎯 Consejos Rápidos

1. **Usa filtrado** para mejorar rendimiento
2. **Activa buffer** solo si necesitas análisis
3. **Configura auto-reconexión** para producción
4. **Usa modo debug** durante desarrollo
5. **Maneja errores** siempre

---

**¡Listo! 🎉** Ya puedes conectar a los chats de Kick.com con esta librería ultraligera.