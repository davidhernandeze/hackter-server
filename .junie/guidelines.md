# Hackter Server Development Guidelines

This document provides essential information for developers working on the Hackter Server project, a multiplayer game server built with Colyseus.

## Build/Configuration Instructions

### Prerequisites
- Node.js >= 20.9.0
- npm

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Configuration
The project uses environment-specific configuration files:
- `.env.development` - Used for development environments
- `.env.production` - Used for production environments

### Running the Server
```bash
# Development mode
npm start

# Production mode (using PM2)
npm install -g pm2
pm2 start ecosystem.config.cjs
```

## Testing Information

### Running Tests
Tests are written using Mocha and the Colyseus testing framework:

```bash
# Run all tests
npm test

# Run a specific test file
npx mocha test/specific_test.js --exit --timeout 15000
```

### Test Structure
Tests use the `@colyseus/testing` library to boot the application and create test rooms. A typical test follows this structure:

```javascript
import assert from "assert";
import { boot } from "@colyseus/testing";
import appConfig from "../src/app.config.js";

describe("testing a room", () => {
  let colyseus;

  before(async () => colyseus = await boot(appConfig));
  after(async () => colyseus.shutdown());
  beforeEach(async () => await colyseus.cleanup());

  it("test case description", async () => {
    // Create a room using the correct room name from app.config.js
    const room = await colyseus.createRoom("arena", {});

    // Connect a client with required options
    const client = await colyseus.connectTo(room, { 
      name: "TestPlayer", 
      color: 0 
    });

    // Verify connection
    assert.strictEqual(client.sessionId, room.clients[0].sessionId);

    // Wait for state sync
    await room.waitForNextPatch();

    // Make assertions on the state
    const state = client.state.toJSON();
    assert.ok(state.players);
    assert.ok(state.players[client.sessionId]);
  });
});
```

### Creating New Tests
When creating new tests:
1. Name your test file with a `_test.js` suffix
2. Use the correct room name as defined in `app.config.js` (currently "arena")
3. Provide all required options when connecting clients (name, color)
4. Test against the actual state structure (players map with client sessionId)

## Load Testing
The project includes load testing capabilities:

```bash
# Run the default load test
npm run loadtest

# Customize the load test
node loadtest/example.js --room arena --numClients 10
```

## Additional Development Information

### Project Structure
- `src/index.js` - Entry point that starts the server
- `src/app.config.js` - Colyseus application configuration
- `src/rooms/` - Room implementations
  - `MyRoom.js` - Main room implementation
  - `schema/` - State schemas for synchronization
    - `MyRoomState.js` - Room state schema
    - `Player.js` - Player entity schema

### Room Configuration
Rooms are defined in `app.config.js`. The main room is defined as "arena":

```javascript
gameServer.define('arena', MyRoom)
```

### State Synchronization
The project uses Colyseus schema for state synchronization:
- `MyRoomState` contains a map of `Player` objects
- `Player` objects have properties: name, color, direction, isMoving, message, x, y

### Development Tools
- Colyseus Playground: Available in development mode at the root URL
- Colyseus Monitor: Available at `/monitor` for monitoring room and client status

### Debugging
To debug the application:
1. Start the server with Node.js inspector:
   ```bash
   node --inspect src/index.js
   ```
2. Connect to the debugger using Chrome DevTools or your IDE

### Code Style
- ES Modules are used throughout the project
- Async/await is preferred for asynchronous operations
- Console logging is used for server-side logging