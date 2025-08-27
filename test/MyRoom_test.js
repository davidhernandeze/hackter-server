import assert from "assert";
import { boot } from "@colyseus/testing";

// import your "app.config.ts" file here.
import appConfig from "../src/app.config.js";

describe("testing your Colyseus app", () => {
  let colyseus;

  before(async () => colyseus = await boot(appConfig));
  after(async () => colyseus.shutdown());

  beforeEach(async () => await colyseus.cleanup());

  it("connecting into a room", async () => {
    // `room` is the server-side Room instance reference.
    const room = await colyseus.createRoom("arena", {
      roomSize: 100,
      maxRooms: 5,
      initialRoomX: 500,
      initialRoomY: 500
    });

    // `client1` is the client-side `Room` instance reference (same as JavaScript SDK)
    const client1 = await colyseus.connectTo(room, {
      name: "TestPlayer",
      color: 0
    });

    // make your assertions
    assert.strictEqual(client1.sessionId, room.clients[0].sessionId);

    // wait for state sync
    await room.waitForNextPatch();

    // Check that the state has the expected structure
    const state = client1.state.toJSON();
    assert.ok(state.players);
    assert.ok(state.players[client1.sessionId]);
    assert.ok(state.mapVertices);
    assert.ok(state.roomSize);
    assert.ok(state.initialRoomX);
    assert.ok(state.initialRoomY);

    // Check that the player is in the initial room
    const player = state.players[client1.sessionId];
    assert.ok(player.x >= room.state.initialRoomX - room.state.roomSize / 2);
    assert.ok(player.x <= room.state.initialRoomX + room.state.roomSize / 2);
    assert.ok(player.y >= room.state.initialRoomY - room.state.roomSize / 2);
    assert.ok(player.y <= room.state.initialRoomY + room.state.roomSize / 2);
  });
});
