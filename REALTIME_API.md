# OpenAI Realtime API Integration

This document describes the direct WebSocket connection to OpenAI Realtime for audio streaming and real-time conversations.

## Direct WebSocket Connection

**Files:**
- `lib/websocket-client.ts` — Low-level WebSocket client
- `hooks/use-websocket.ts` — React hook for connection management

The connection uses direct authentication via Bearer token in the URL:

```
wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview&api_key=<key>
```

### Connection Flow

```tsx
const { isConnected, error, client, send, sendRaw } = useWebSocket()
```

Once connected, send messages in the OpenAI Realtime format:

```typescript
client.sendRaw({
  type: 'session.update',
  session: {
    type: 'realtime',
    modalities: ['text', 'audio'],
    instructions: 'You are Ami, a helpful assistant.'
  }
})
```

## 1. Microphone PCM Frames → OpenAI

**File:** `hooks/use-realtime-audio.ts`

Captures microphone input as 16-bit PCM and streams it to OpenAI in real-time:

```tsx
const { isStreaming, initializeAudioCapture, stopAudioCapture, commitAudioAndRespond } = useRealtimeAudio({
  client,
  isConnected,
  onTranscript: (text) => console.log('User said:', text)
})

// Start capturing
await initializeAudioCapture()

// Stop and send
stopAudioCapture()
commitAudioAndRespond()
```

The hook:
- Creates an `AudioContext` and `ScriptProcessorNode` to capture PCM at 4096-sample chunks
- Converts float32 samples to 16-bit signed integers
- Encodes to base64 and sends via `input_audio_buffer.append` messages
- Handles `conversation.item.create` and `response.text.delta` events for transcripts

## 2. OpenAI Audio Deltas → Browser Playback

**File:** `hooks/use-realtime-audio-playback.ts`

Receives audio from OpenAI and plays it directly in the browser:

```tsx
const { isPlaying, playAudioChunk, initializeAudioPlayback } = useRealtimeAudioPlayback({
  client,
  isConnected
})
```

The hook listens for `response.audio.delta` events and:
- Decodes base64-encoded 16-bit PCM
- Converts to float32
- Creates and plays an `AudioBuffer` immediately

No buffering or queueing—chunks play as they arrive for low-latency audio output.

## 3. Auto-Reconnect on Disconnect

**File:** `hooks/use-session-refresh.ts`

Simplified to handle connection lifecycle:

```tsx
useSessionRefresh({
  isConnected,
  onReconnect: () => console.log('Reconnecting...')
})
```

If the connection drops, this hook will trigger a reconnect after 3 seconds.

## Environment Setup

Add to `.env.local`:

```dotenv
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_OPENAI_API_KEY=sk-...  # Same key, exposed to client for direct WebSocket
```

> ⚠️ Note: The API key must be public (`NEXT_PUBLIC_`) so the browser can authenticate the WebSocket connection directly to OpenAI.

## Message Format

All messages use the OpenAI Realtime message format:

### Client → Server

**Audio Input:**
```json
{
  "type": "input_audio_buffer.append",
  "audio": "<base64-encoded PCM data>"
}
```

**Commit & Request Response:**
```json
{
  "type": "input_audio_buffer.commit"
}
```

```json
{
  "type": "response.create",
  "response": {
    "modalities": ["text", "audio"]
  }
}
```

### Server → Client

**Audio Output:**
```json
{
  "type": "response.audio.delta",
  "delta": "<base64-encoded PCM data>"
}
```

**Text Transcript:**
```json
{
  "type": "response.text.delta",
  "delta": "The assistant is saying..."
}
```

## Usage in `app/page.tsx`

```tsx
const handleStartListening = async () => {
  if (!isConnected) return
  await initializeAudioCapture()
  await startRecording()
}

const handleStopListening = async () => {
  stopAudioCapture()
  await stopRecording()
  commitAudioAndRespond()  // OpenAI generates response
  // Audio will play automatically via response.audio.delta events
}
```

## Testing

1. Ensure `NEXT_PUBLIC_OPENAI_API_KEY` is set in `.env.local`
2. Start dev server: `pnpm dev`
3. Grant microphone permissions
4. Click mic button to start listening
5. Speak naturally; PCM frames stream to OpenAI in real-time
6. Release to commit buffer and request response
7. OpenAI's audio response plays automatically

## Debugging

All events are logged to the browser console:

```
[v0] OpenAI Realtime WebSocket connected
[v0] Audio capture initialized
[v0] Audio buffer committed and response requested
[v0] Playing audio chunk
```

Listen for all messages with `client.onAny()`:

```tsx
client.onAny((message) => {
  console.log(message.type, message)
})
```

## Known Limitations

- Session tokens do not expire (unlike the earlier session-based approach).
- Audio is streamed as it's captured; there's no replay or buffering.
- Only one conversation per WebSocket connection; reconnect to start fresh.
- CORS headers must allow cross-origin WebSocket from your domain.
