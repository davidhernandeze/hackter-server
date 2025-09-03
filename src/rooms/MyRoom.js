import { Room } from '@colyseus/core'
import { MyRoomState } from './schema/MyRoomState.js'
import { Player } from './schema/Player.js'
import { postMessageToSlack } from '../utils/slack.js'
import mapVertex from '../assets/vertices.json' with { type: 'json' }
import { StateView } from '@colyseus/schema'

export class MyRoom extends Room {
    maxClients = 100
    state = new MyRoomState()
    mapVertices = []

    playerSpeed = 0.2
    reconnectionTokens = new Map()
    renderDistance = 80

    onCreate(options) {
        console.log('Main room created!')
        this.autoDispose = false
        const directions = { 'up': 0, 'right': 1, 'down': 2, 'left': 3 }
        
        this.generateMap()

        this.setSimulationInterval((deltaTime) => this.update(deltaTime))

        this.onMessage('command', (client, message) => {
            const player = this.state.players.get(client.sessionId)
            if (!player) return

            if (Object.keys(directions).includes(message)) {
                player.isMoving = true
                player.direction = directions[message]
                player.invisible = false
                return
            }
            if (message==='stop') {
                player.isMoving = false
                return
            }
            if (message==='camo') {
                player.invisible = true
                player.message = ''
                player.isMoving = false
                return
            }
            if (message==='clear') {
                player.message = ''
                return
            }
            const splitCommand = message.split(' ')
            if (splitCommand[0]==='print') {
                const message = splitCommand.slice(1).join(' ').slice(0, 100)

                console.log(`${player.name} sent a message: ${message}`)
                player.message = message
                player.invisible = false
            }
        })
    }

    onJoin(client, options) {
        const playerName = options.name.slice(0, 10)
        
        if (this.reconnectOrFalse(options.token, client, playerName)) return

        const player = new Player()
        player.name = playerName
        player.color = options.color
        
        const offset = 80
        player.x = Math.random() * offset
        player.y = Math.random() * offset
        
        player.invisible = false
        player.renderDistance = this.renderDistance
        
        this.state.players.set(client.sessionId, player)

        client.view = new StateView()
        client.view.add(player, 1)
        this.updatePlayerView(player, client.sessionId)
        
        this.reconnectionTokens.set(options.token, client.sessionId)
        
        postMessageToSlack(`${playerName} joined the game at ${new Date().toLocaleTimeString()}`)
        console.log(`${playerName} joined the game at ${new Date().toLocaleTimeString()} with sessionId:`, client.sessionId)
    }

    onLeave(client, consented) {
        console.log(client.sessionId, 'left!')
        const player  = this.state.players.get(client.sessionId)
        postMessageToSlack(`${(player?.name || 'eliminated')} left the game at ${new Date().toLocaleTimeString()}`)
        if (!player) return
        this.state.offlinePlayers.set(client.sessionId, player)
        this.state.players.delete(client.sessionId)
    }

    onDispose() {
        console.log('room', this.roomId, 'disposing...')
    }

    // Generate the map with a single square room
    generateMap() {
        this.mapVertices = mapVertex
        this.state.mapVertices = this.mapVertices
    }

    // Add a vertex to the map polygon
    addVertex(x, y) {
        this.mapVertices.push(x, y)
    }

    isPointInMap(x, y) {
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
            if ((xi===x && yi===y) || (xj===x && yj===y)) {
                return true
            }

            // Check if point is on an edge
            if ((yi===yj) && (yi===y) && (x > Math.min(xi, xj)) && (x < Math.max(xi, xj))) {
                return true
            }

            // Ray casting test
            const intersect = ((yi > y)!==(yj > y)) &&
                    (x < (xj - xi) * (y - yi) / (yj - yi) + xi)

            if (intersect) {
                inside = !inside
            }
        }

        return inside
    }

    update(deltaTime) {
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
                        newY -= this.playerSpeed
                        break
                    case 1: // right
                        newX += this.playerSpeed
                        break
                    case 2: // down
                        newY += this.playerSpeed
                        break
                    case 3: // left
                        newX -= this.playerSpeed
                        break

                }

                if (this.isPointInMap(newX, newY)) {
                    player.x = newX
                    player.y = newY
                } else {
                    player.isMoving = false
                    this.state.players.delete(sessionId)
                    this.clients.getById(sessionId).leave()
                }
            }

            this.updatePlayerView(player, sessionId)
            // player.lastRenderCheckAt = new Date().toISOString()
        }
    }

    reconnectOrFalse(reconnectionToken, client, playerName) {
        if (!reconnectionToken) return false
        
        const reconnectedSessionId = this.reconnectionTokens.get(reconnectionToken)
        if (!reconnectedSessionId) return false
        
        const player = this.state.offlinePlayers.get(reconnectedSessionId)
        if (!player) return false
        
        player.name = playerName
        this.state.offlinePlayers.delete(reconnectedSessionId)
        this.state.players.set(client.sessionId, player)
        this.reconnectionTokens.set(reconnectionToken, client.sessionId)
        
        client.view = new StateView()
        client.view.add(player, 1)
        this.updatePlayerView(player, client.sessionId)
        
        const message = `${player.name} reconnected in room ${this.roomId} with sessionId: ${client.sessionId}`
        postMessageToSlack(message)
        return true
    }
    
    updatePlayerView(player, sessionId) {
        const client = this.clients.getById(sessionId)
        if (!client) return
        
        for (const [otherSessionId, otherPlayer] of this.state.players) {
            if (sessionId === otherSessionId) continue
            if (otherPlayer.invisible) {
                client.view?.remove(otherPlayer)
                continue
            }
            const dx = player.x - otherPlayer.x
            const dy = player.y - otherPlayer.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            distance < this.renderDistance ? client.view?.add(otherPlayer) : client.view?.remove(otherPlayer)
        }
    }
}
