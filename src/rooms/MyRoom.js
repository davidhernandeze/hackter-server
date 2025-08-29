import { Room } from '@colyseus/core'
import { MyRoomState } from './schema/MyRoomState.js'
import { Player } from './schema/Player.js'
import { postMessageToSlack } from '../utils/slack.js'
import mapVertex from '../assets/vertices.json' with { type: 'json' }

export class MyRoom extends Room {
  maxClients = 100
  state = new MyRoomState()
  mapVertices = []
  rooms = []
  bridges = []

  roomSize = 200
  maxRooms = 10
  initialRoomX = 500
  initialRoomY = 500

  onCreate (options) {
    console.log('Main room created!')
    this.autoDispose = false
    this.state.players = new Map()
    const directions = { 'up': 0, 'right': 1, 'down': 2, 'left': 3 }

    // Set map parameters from options or use defaults
    this.roomSize = options?.roomSize || this.roomSize
    this.maxRooms = options?.maxRooms || this.maxRooms
    this.initialRoomX = options?.initialRoomX || this.initialRoomX
    this.initialRoomY = options?.initialRoomY || this.initialRoomY

    // Generate the map
    this.generateMap()

    this.setSimulationInterval((deltaTime) => this.update(deltaTime))

    this.onMessage('command', (client, message) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      
      if (Object.keys(directions).includes(message)) {
        player.isMoving = true
        player.direction = directions[message]
        return
      }
      if (message === 'stop') {
        player.isMoving = false
        return
      }
      const splitCommand = message.split(' ')
      if (splitCommand[0] === 'print') {
        const message = splitCommand.slice(1).join(' ').slice(0, 20)

        console.log(`${player.name} sent a message: ${message}`)
        player.message = message
        setTimeout(() => {
          player.message = ''
        }, 5000)
      }
    })
  }

  onJoin (client, options) {
    const playerName = options.name.slice(0, 10)
    console.log(playerName, 'joined!')
    postMessageToSlack(`${playerName} joined the game at ${new Date().toLocaleTimeString()}`)
    const player = new Player()
    player.name = playerName
    player.color = options.color

    const initialRoom = this.rooms.find(room => room.isInitial)
    if (initialRoom) {
      const offset = 80
      player.x = Math.random() * offset
      player.y = Math.random() * offset
    }

    this.state.players.set(client.sessionId, player)
  }

  onLeave (client, consented) {
    console.log(client.sessionId, 'left!')
    postMessageToSlack(`${this.state.players.get(client.sessionId)?.name} joined the game at ${new Date().toLocaleTimeString()}`)
    this.state.players.delete(client.sessionId)
  }

  onDispose () {
    console.log('room', this.roomId, 'disposing...')
  }

  // Generate the map with a single square room
  generateMap() {
    this.mapVertices = mapVertex
    this.rooms = []
    this.bridges = []

    // Create a single square room
    const singleRoom = {
      x: this.initialRoomX,
      y: this.initialRoomY,
      size: this.roomSize,
      isInitial: true,
      bridges: []
    }

    this.rooms.push(singleRoom)

    // Generate the polygon vertices for the single square
    // this.generatePolygon()

    // Update state with map vertices
    this.state.mapVertices = this.mapVertices
  }

  // Generate polygon vertices for a single square room
  generatePolygon() {
    // Get the single room
    const room = this.rooms[0]
    const halfSize = room.size / 2

    // Add room corners (clockwise)
    this.addVertex(room.x - halfSize, room.y - halfSize) // top-left
    this.addVertex(room.x + halfSize, room.y - halfSize) // top-right
    this.addVertex(room.x + halfSize, room.y + halfSize) // bottom-right
    this.addVertex(room.x - halfSize, room.y + halfSize) // bottom-left
  }

  // Add a vertex to the map polygon
  addVertex(x, y) {
    this.mapVertices.push(x, y)
  }

  // Check if a point is inside the map using the perimeter polygon
  isPointInMap(x, y) {
    // If no vertices, use the room boundaries as fallback
    if (!this.mapVertices || this.mapVertices.length < 6) {
      // Get the single room
      const room = this.rooms[0]
      const halfSize = room.size / 2

      // Check if point is inside the square room
      return (
        x >= room.x - halfSize &&
        x <= room.x + halfSize &&
        y >= room.y - halfSize &&
        y <= room.y + halfSize
      )
    }

    // Use ray casting algorithm to determine if point is inside polygon
    // This works for any polygon shape, not just rectangles
    let inside = false
    const vertexCount = this.mapVertices.length / 2

    // Need at least 3 vertices to form a polygon
    if (vertexCount < 3) {
      return false
    }

    // Ray casting algorithm
    for (let i = 0, j = vertexCount - 1; i < vertexCount; j = i++) {
      const xi = this.mapVertices[i * 2]
      const yi = this.mapVertices[i * 2 + 1]
      const xj = this.mapVertices[j * 2]
      const yj = this.mapVertices[j * 2 + 1]

      // Check if point is on a vertex
      if ((xi === x && yi === y) || (xj === x && yj === y)) {
        return true
      }

      // Check if point is on an edge
      if ((yi === yj) && (yi === y) && (x > Math.min(xi, xj)) && (x < Math.max(xi, xj))) {
        return true
      }

      // Ray casting test
      const intersect = ((yi > y) !== (yj > y)) && 
                        (x < (xj - xi) * (y - yi) / (yj - yi) + xi)

      if (intersect) {
        inside = !inside
      }
    }

    return inside
  }

  update (deltaTime) {
    for (const [sessionId, player] of this.state.players) {
      if (player.isMoving) {
        // Store current position
        const prevX = player.x
        const prevY = player.y

        // Calculate new position
        let newX = prevX
        let newY = prevY

        switch (player.direction) {
          case 0: // up
            newY -= 0.5
            break
          case 1: // right
            newX += 0.5
            break
          case 2: // down
            newY += 0.5
            break
          case 3: // left
            newX -= 0.5
            break
        }

        // Check if new position is inside the map
        if (this.isPointInMap(newX, newY)) {
          // Update position if inside map
          player.x = newX
          player.y = newY
        } else {
          // Keep player at current position if outside map
          player.isMoving = false
          this.state.players.delete(sessionId)
        }
      }
    }
  }

}
