export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const MOCK_MESSAGES: Message[] = [
  {
    id: "1",
    role: "user",
    content: "Hey! Can you explain how WebSocket connections work?",
  },
  {
    id: "2",
    role: "assistant",
    content: `WebSocket provides **full-duplex** communication over a single TCP connection. Here's how it works:

1. **Handshake** — The client sends an HTTP upgrade request
2. **Connection** — The server agrees and upgrades the protocol
3. **Messaging** — Both sides can send data at any time
4. **Close** — Either side can close the connection

A basic example in JavaScript:

\`\`\`ts
const ws = new WebSocket("wss://example.com/ws");

ws.onopen = () => {
  console.log("Connected");
  ws.send(JSON.stringify({ type: "hello" }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received:", data);
};
\`\`\`

> Unlike HTTP, WebSocket keeps the connection alive so you don't need to poll.`,
  },
  {
    id: "3",
    role: "user",
    content: "What's the difference between Socket.IO and raw WebSocket?",
  },
  {
    id: "4",
    role: "assistant",
    content: `Great question! Here's a comparison:

| Feature | WebSocket | Socket.IO |
|---------|-----------|-----------|
| Protocol | Standard WS | Custom on top of WS |
| Reconnection | Manual | Automatic |
| Rooms/Namespaces | No | Yes |
| Fallback | None | HTTP long-polling |
| Binary support | Yes | Yes |

**When to use raw WebSocket:**
- You need maximum performance
- You're building a simple real-time feature
- You want to keep dependencies minimal

**When to use Socket.IO:**
- You need automatic reconnection
- You want room-based broadcasting
- You need to support older browsers`,
  },
  {
    id: "5",
    role: "user",
    content:
      "Can you show me how to set up a simple Socket.IO server with event handling?",
  },
  {
    id: "6",
    role: "assistant",
    content: `Sure! Here's a minimal Socket.IO server:

\`\`\`ts
import { Server } from "socket.io";

const io = new Server(3000, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log(\`Client connected: \${socket.id}\`);

  socket.on("message", (data) => {
    // Broadcast to all other clients
    socket.broadcast.emit("message", {
      from: socket.id,
      ...data,
    });
  });

  socket.on("disconnect", () => {
    console.log(\`Client disconnected: \${socket.id}\`);
  });
});
\`\`\`

And the client side:

\`\`\`ts
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  socket.emit("message", { text: "Hello everyone!" });
});

socket.on("message", (data) => {
  console.log("New message:", data);
});
\`\`\`

That's it — the server handles connections, relays messages, and both sides can emit custom events freely.`,
  },
  {
    id: "7",
    role: "user",
    content: "Thanks! How would I add authentication to this?",
  },
  {
    id: "8",
    role: "assistant",
    content: `You can use Socket.IO's **middleware** to authenticate on connection:

\`\`\`ts
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  try {
    const user = verifyJWT(token);
    socket.data.user = user;
    next();
  } catch {
    next(new Error("Authentication failed"));
  }
});
\`\`\`

On the client, pass the token when connecting:

\`\`\`ts
const socket = io("http://localhost:3000", {
  auth: {
    token: "your-jwt-token-here",
  },
});

socket.on("connect_error", (err) => {
  console.error("Auth failed:", err.message);
});
\`\`\`

Key points:
- The middleware runs **before** the \`connection\` event fires
- You can attach user data to \`socket.data\` for later use
- Failed auth rejects the connection entirely — no messages leak`,
  },
];

export function useMessages(): Message[] {
  return MOCK_MESSAGES;
}
