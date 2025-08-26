import assert from "assert";
import { boot } from "@colyseus/testing";

// import app config
import appConfig from "../src/app.config.js";

describe("testing Arena Room", () => {
  let colyseus;

  before(async () => colyseus = await boot(appConfig));
  after(async () => colyseus.shutdown());

  beforeEach(async () => await colyseus.cleanup());

  it("connecting into arena room", async () => {
    // Create a room using the correct room name "arena"
    const room = await colyseus.createRoom("arena", {});

    // Connect a client to the room
    const client1 = await colyseus.connectTo(room, { name: "TestPlayer", color: 0 });

    // Verify the connection
    assert.strictEqual(client1.sessionId, room.clients[0].sessionId);

    // Wait for state sync
    await room.waitForNextPatch();

    // Verify the player was added to the state
    const state = client1.state.toJSON();
    assert.ok(state.players);
    assert.ok(state.players[client1.sessionId]);
    assert.strictEqual(state.players[client1.sessionId].name, "TestPlayer");
  });
});