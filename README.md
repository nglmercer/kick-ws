# Kick WebSocket

A lightweight and dependency-free library for connecting to Kick.com WebSockets.

## Features

- 🚀 **Lightweight**: No external dependencies, uses native WebSocket only
- 🔌 **Simple**: Intuitive and easy-to-use API
- 🔄 **Auto-reconnection**: Configurable automatic reconnection
- 📊 **Message Buffer**: Optional, for data analysis
- 🎯 **Event Filtering**: Listen only to the events you need
- 🛠️ **TypeScript**: Full type support
- 📝 **Debug Mode**: Detailed logging for development
- 🌐 **Browser Support**: Full compatibility with modern browsers
- 📱 **Mobile Ready**: Optimized for mobile devices

## Installation

### Node.js
```bash
npm install kick-ws
```

### Browser (CDN)
```html
<!-- Minified version -->
<script src="https://unpkg.com/kick-ws@latest/dist/kick-ws.min.js"></script>

<!-- ES Modules -->
<script type="module">
  import { KickWebSocket } from 'https://unpkg.com/kick-ws@latest/dist/kick-ws.min.js';
  // Your code here
</script>
```

## Basic Usage

### Node.js / Backend
```typescript
import { KickWebSocket } from 'kick-ws';

// Create instance
const kickWS = new KickWebSocket({ debug: true });

// Connect to a channel
kickWS.connect('channel-name');

// Listen to chat messages
kickWS.on('ChatMessage', (message) => {
  console.log(`${message.sender.username}: ${message.content}`);
});

// Listen to connection events
kickWS.on('ready', () => {
  console.log('✅ Successfully connected');
});

kickWS.on('disconnect', ({ reason }) => {
  console.log('❌ Disconnected:', reason);
});

kickWS.on('error', (error) => {
  console.error('⚠️ Error:', error);
});
```

### Browser / Frontend
```html
<!DOCTYPE html>
<html>
<head>
    <title>Kick WebSocket Example</title>
</head>
<body>
    <div id="messages"></div>

    <script type="module">
      import { KickWebSocket } from 'https://unpkg.com/kick-ws@latest/dist/kick-ws.min.js';

      const kickWS = new KickWebSocket({ debug: true });
      const messagesDiv = document.getElementById('messages');

      kickWS.onChatMessage((message) => {
          const messageEl = document.createElement('div');
          messageEl.innerHTML = `<strong>${message.sender.username}:</strong> ${message.content}`;
          messagesDiv.appendChild(messageEl);
      });

      kickWS.connect('xqc');
    </script>
</body>
</html>
```

## 🌐 Browser Compatibility

### Supported Browsers
- Chrome 80+
- Firefox 72+
- Safari 13.1+
- Edge 80+

### Compatibility Check


### Polyfills (if needed)
```html
<!-- For older browsers -->
<script src="https://cdn.jsdelivr.net/npm/whatwg-fetch@3.6.2/dist/fetch.umd.js"></script>
```

For more details on browser usage, see [BROWSER.md](./BROWSER.md).

## Convenience Methods

### Listen to specific event types

```typescript
// Chat messages only
kickWS.onChatMessage((message) => {
  console.log('Message:', message.content);
});

// User bans only
kickWS.onUserBanned((ban) => {
  console.log('Banned user:', ban.username);
});

// Subscriptions only
kickWS.onSubscription((sub) => {
  console.log('New subscription:', sub.username);
});

// All chat events
kickWS.onChatEvents((event) => {
  console.log('Chat event:', event);
});

// All user events
kickWS.onUserEvents((event) => {
  console.log('User event:', event);
});

// All events in general
kickWS.onAllEvents((event) => {
  console.log('Event:', event);
});
```

## Advanced Configuration

### Available Options

```typescript
const options = {
  debug: false,              // Show debug logs
  autoReconnect: true,       // Reconnect automatically
  reconnectInterval: 5000,   // Reconnection interval (ms)
  enableBuffer: false,       // Enable message buffer
  bufferSize: 1000,          // Maximum buffer size
  filteredEvents: []         // Events to listen to (empty = all)
};

const kickWS = new KickWebSocket(options);
```

### Event Filtering

```typescript
// Listen only to messages and bans
kickWS = new KickWebSocket({
  filteredEvents: ['ChatMessage', 'UserBanned', 'Subscription']
});
```

### Message Buffer for Analysis

```typescript
kickWS = new KickWebSocket({
  enableBuffer: true,
  bufferSize: 2000
});

// Get messages from buffer
const messages = kickWS.getMessageBuffer();
console.log(`Buffer has ${messages.length} messages`);

// Clear buffer
kickWS.clearMessageBuffer();
```

## Presets

### Lightweight Mode (low consumption)

```typescript
const kickWS = KickWebSocket.createLightweight('channel-name');
```

### Debug Mode

```typescript
const kickWS = KickWebSocket.createDebug('channel-name');
```

### Analytics Mode

```typescript
const kickWS = KickWebSocket.createAnalytics('channel-name');
```

## Available Events

### Chat Events
- `ChatMessage`: New chat messages
- `MessageDeleted`: Messages deleted by moderators
- `PinnedMessageCreated`: Pinned messages

### User Events
- `UserBanned`: Banned users
- `UserUnbanned`: Unbanned users
- `Subscription`: New subscriptions
- `GiftedSubscriptions`: Gifted subscriptions

### Stream Events
- `StreamHost`: When a channel hosts another
- `PollUpdate`: Poll updates
- `PollDelete`: Deleted polls

### System Events
- `ready`: Connection established
- `disconnect`: Connection closed
- `error`: Connection error
- `rawMessage`: Raw WebSocket message

## Data Structure

### Chat Message

```typescript
interface ChatMessageEvent {
  id: string;
  content: string;
  type: 'message';
  created_at: string;
  sender: {
    id: number;
    username: string;
    slug: string;
    identity: {
      color: string;
      badges: string[];
    };
  };
  chatroom: {
    id: number;
  };
}
```

### Other Events

Each event has its own data structure. See TypeScript types for details.

## Practical Examples

### Activity Logging Bot

```typescript
import { KickWebSocket } from 'kick-ws';

const kickWS = new KickWebSocket({ debug: true });

// Connect to multiple channels
const channels = ['streamer1', 'streamer2', 'streamer3'];

channels.forEach(channel => {
  const ws = new KickWebSocket();

  ws.connect(channel);

  ws.onChatMessage((message) => {
    // Save to database
    saveToDatabase({
      channel,
      user: message.sender.username,
      message: message.content,
      timestamp: message.created_at
    });
  });

  ws.onUserBanned((ban) => {
    console.log(`🚫 ${ban.username} banned in ${channel}`);
  });
});
```

### Real-time Activity Analyzer

```typescript
const kickWS = KickWebSocket.createAnalytics('popular-streamer');

let messageCount = 0;
let subscriberCount = 0;
let banCount = 0;

kickWS.onChatMessage(() => messageCount++);
kickWS.onSubscription(() => subscriberCount++);
kickWS.onUserBanned(() => banCount++);

// Report every minute
setInterval(() => {
  console.log(`📊 Statistics for the last minute:
    Messages: ${messageCount}
    Subscriptions: ${subscriberCount}
    Bans: ${banCount}
  `);

  // Reset counters
  messageCount = 0;
  subscriberCount = 0;
  banCount = 0;
}, 60000);
```

### Notification System

```typescript
const kickWS = new KickWebSocket();

kickWS.connect('monitored-channel');

kickWS.onChatMessage((message) => {
  // Detect keywords
  if (message.content.includes('!help') || message.content.includes('!admin')) {
    sendNotification(`🚨 Help requested by ${message.sender.username}`);
  }
});

kickWS.onUserBanned((ban) => {
  sendNotification(`🔨 Banned user: ${ban.username}`);
});

kickWS.onSubscription((sub) => {
  sendNotification(`⭐ New subscription: ${sub.username}`);
});

function sendNotification(message: string) {
  // Implement your notification system
  console.log('NOTIFICATION:', message);
}
```

## API Reference

### Main Methods

- `connect(channelName: string): Promise<void>` - Connect to a channel
- `disconnect(): void` - Manual disconnect
- `on(event, handler): void` - Listen to an event
- `once(event, handler): void` - Listen to an event once
- `off(event, handler): void` - Stop listening to an event
- `isConnected(): boolean` - Check if connected
- `getConnectionState(): ConnectionState` - Get connection state

### Information Methods

- `getChannelName(): string` - Current channel name
- `getChannelId(): number` - Current channel ID
- `getMessageBuffer(): string[]` - Get message buffer
- `clearMessageBuffer(): void` - Clear buffer
- `getStats(): object` - Get statistics
- `updateOptions(options): void` - Update configuration

## Limitations

- 📖 **Read-only**: Does not send messages to chat
- 🔓 **No Authentication**: Only works with public chats
- 🌐 **Requires Internet**: Connection to Kick.com servers

## Contributing

Contributions are welcome. Please:

1. Fork the project
2. Create a branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## Support

- 📧 Email: support@kick-wss.com
- 🐛 Issues: [GitHub Issues](https://github.com/nglmercer/kick-ws/issues)
- 📖 Documentation: [Wiki](https://github.com/nglmercer/kick-ws/wiki)

---

**Kick WebSocket Lite** - The simplest way to connect to Kick.com chats.
