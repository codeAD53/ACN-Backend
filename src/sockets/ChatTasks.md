## 🔌 Real-Time Chat with Socket.IO + E2EE Foundation

### What I Built
Implemented real-time bidirectional messaging using Socket.IO,
with the backend infrastructure ready for End-to-End Encryption (E2EE).

---

### 📦 Packages Used
- **socket.io** — Real-time WebSocket communication
- **Redis + @socket.io/redis-adapter** — Scales Socket.IO across
  multiple server instances (production-ready)

---

### 🗂️ Files Added / Modified
| File | What it does |
|---|---|
| `src/socket/socketAuth.js` | Authenticates every socket connection using existing JWT — same protection as REST API |
| `src/socket/socketHandler.js` | Handles all real-time events |
| `server.js` | Upgraded from plain Express to http.createServer + Socket.IO |
| `src/models/MessageSchema.js` | Added `encryptedContent` and `iv` fields for E2EE |

---

### ⚡ Real-Time Features Implemented
- 🟢 **Online/Offline presence** — tracks who is online across all tabs
- 📌 **Chat rooms** — users join/leave specific chat rooms by chatId
- 💬 **Real-time messaging** — messages instantly delivered to all
  room members
- ✍️ **Typing indicators** — shows when someone is typing
- ✅ **Read receipts** — marks messages as read in real time
- 🔔 **Offline notifications** — notifies users who are offline
  via existing notification system

---

### 🔐 Encryption Approach (E2EE)
The backend is fully prepared for End-to-End Encryption:
- `MessageSchema` stores `encryptedContent` (AES encrypted) and
  `iv` (initialization vector)
- The server **never sees plain text** — it only stores and
  forwards encrypted content
- Encryption/decryption happens entirely on the **client side**
  (frontend — Phase 2)
- Current test uses Base64 simulation to verify the flow works
  end to end

---

### ✅ Tested
- Two users connected simultaneously in separate browser tabs
- Messages delivered in real time between both users
- JWT authentication verified on every socket connection
- Online presence updated correctly on connect/disconnect

Tested the socket connection using jwt access tokens.
Created and made a chat room from chatId to message everyone.
`socket-tester.html` | socket website with styles and functionalities in plain JS.

Paste the JWT token in the token field
Click ⚡ Connect — you should see Connected in the event log
Paste a Chat ID (from your MongoDB) and click Join Chat Room
Type a message and click Send Message

### Note:
The encryption right now is fake Base64 (simulated). Real E2EE needs to be implemented on the frontend using AES keys.

---

Everything is done on POSTMAN for RESTAPIs and Authorisation.
Initialised Docker for horizontal scaling in redis to store socket Ids and keys for faster performance to optimise the load.

## POSTMAN
## DOCKER
## REDIS
## VS Code 
## MONGODB ATLAS