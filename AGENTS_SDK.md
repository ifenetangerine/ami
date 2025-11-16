# OpenAI Agents SDK Integration

## Overview

Replaced the direct WebSocket implementation with the OpenAI Agents SDK, which provides a high-level `RealtimeSession` that automatically handles microphone input and speaker output via WebRTC.

## Key Components

### 1. **speak.ts** - Main Integration File

Contains helper functions to initialize and manage the realtime session:

```typescript
import { startListening, stopListening, closeRealtime } from '@/hooks/speak'

// Initialize session and start listening
await startListening()

// Stop listening
await stopListening()

// Close session
closeRealtime()
```

**Features:**
- Creates a `RealtimeAgent` with medical AI system prompt
- Initializes `RealtimeSession` with ephemeral token
- Automatically connects microphone and speaker
- Manages session lifecycle

### 2. **use-realtime-agent.ts** - React Hook

Custom hook for managing the realtime agent connection in React components:

```tsx
const { isConnected, isListening, error, startListening, stopListening, disconnect } =
  useRealtimeAgent({
    instructions: "Custom instructions here",
    onTranscript: (text) => console.log('User said:', text),
    onAudioResponse: () => console.log('Agent responded')
  })
```

**Methods:**
- `startListening()` - Begin capturing microphone
- `stopListening()` - Stop microphone capture
- `disconnect()` - Close session completely
- `initializeSession()` - Setup agent and session

### 3. **ephemeral-key API** - Token Generation

Endpoint at `GET /api/realtime/ephemeral-key` that generates ephemeral authentication tokens:

```bash
curl http://localhost:3000/api/realtime/ephemeral-key
# Returns: { apiKey: "ek_..." }
```

**Behind the scenes:**
- Uses `OPENAI_API_KEY` to call OpenAI's session creation endpoint
- Returns a short-lived ephemeral key for browser authentication
- Called automatically by `startListening()`

### 4. **app/page.tsx** - Integration with UI

The mic button workflow:

```tsx
const handleStartListening = async () => {
  setIsListening(true)
  await startListening()  // Agent auto-connects mic/speaker
}

const handleStopListening = async () => {
  setIsListening(false)
  await stopListening()
}

const handleEmergencyStop = () => {
  if (isListening) {
    handleStopListening()
  }
  closeRealtime()
}
```

**Flow:**
1. User clicks mic button → `handleStartListening()`
2. RealtimeSession connects microphone via WebRTC
3. User speaks → automatically transcribed and sent to OpenAI
4. OpenAI responds with audio → automatically played through speaker
5. User clicks stop or emergency stop → session closes

## Advantages Over WebSocket Implementation

| Feature | WebSocket | Agents SDK |
|---------|-----------|-----------|
| Microphone input | Manual PCM streaming | Automatic WebRTC |
| Audio playback | Manual decoding + WebAudio API | Automatic speaker output |
| Session management | Manual refresh/reconnect logic | Built-in lifecycle handling |
| Development overhead | High - handle all audio encoding | Low - SDK abstracts details |
| Real-time latency | Good | Optimized by OpenAI |

## Environment Setup

Same as before:

```dotenv
OPENAI_API_KEY=sk-...
```

The `NEXT_PUBLIC_OPENAI_API_KEY` is no longer needed since the browser doesn't directly authenticate with WebSocket.

## Usage Flow

```
User clicks mic button
  ↓
startListening() called
  ↓
RealtimeAgent created with instructions
  ↓
RealtimeSession.connect() with ephemeral token
  ↓
Microphone captured automatically via WebRTC
  ↓
Audio sent to OpenAI in real-time
  ↓
Transcripts appear in console via onTranscript
  ↓
OpenAI response audio plays automatically
  ↓
User clicks stop
  ↓
stopListening() + closeRealtime()
```

## API Reference

### startListening()
Initializes the realtime session and enables microphone input.

```typescript
try {
  await startListening()
} catch (error) {
  console.error('Failed to start:', error)
}
```

### stopListening()
Stops microphone capture but keeps session open for future use.

```typescript
await stopListening()
```

### closeRealtime()
Completely closes the session and cleans up resources.

```typescript
closeRealtime()
```

### useRealtimeAgent Options

```typescript
useRealtimeAgent({
  instructions?: string        // System prompt for the agent
  onTranscript?: (text) => {}  // Called when user speaks
  onAudioResponse?: () => {}   // Called when agent responds
})
```

## Callbacks

### onTranscript(text: string)
Fired when OpenAI transcribes user speech:

```typescript
onTranscript: (text) => {
  console.log('User said:', text)
  handleSendMessage(text)  // Send to chat
}
```

### onAudioResponse()
Fired when the agent generates an audio response:

```typescript
onAudioResponse: () => {
  console.log('Agent is responding with audio')
  setIsProcessing(false)
}
```

## Debugging

Check browser console for logs:

```
[v0] Realtime session connected with microphone and speaker
[v0] Started listening via realtime agent
[v0] User transcript: "I have a headache"
[v0] Agent is responding with audio
[v0] Stopped listening via realtime agent
```

## Known Limitations

- Audio input/output handled by the SDK; you can't customize encoding
- Session ends when `closeRealtime()` is called
- Transcripts are emitted via callbacks, not stored by the SDK
- No direct access to raw PCM frames (handled internally)

## Migration from WebSocket

If moving from the WebSocket implementation:

1. ✅ Remove `useWebSocket()`, `useRealtimeAudio()`, `useRealtimeAudioPlayback()` hooks
2. ✅ Remove `useSessionRefresh()` hook
3. ✅ Replace with `useRealtimeAgent()` hook
4. ✅ Update mic button handlers to call `startListening()` / `stopListening()`
5. ✅ Keep `onTranscript` callback to integrate with chat
6. ✅ Remove manual audio encoding/decoding logic
7. ✅ Remove `NEXT_PUBLIC_OPENAI_API_KEY` from `.env.local`

Done! The Agents SDK handles all the complexity. 🎉
