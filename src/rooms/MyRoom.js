import { Room } from '@colyseus/core'
import { MyRoomState } from './schema/MyRoomState.js'
import { Player } from './schema/Player.js'

export class MyRoom extends Room {
  maxClients = 100
  state = new MyRoomState()

  onCreate (options) {
    console.log('MyRoom created!')
    this.autoDispose = false
    this.state.players = new Map()
    const directions = { 'up': 0, 'right': 1, 'down': 2, 'left': 3 }

    this.setSimulationInterval((deltaTime) => this.update(deltaTime))

    this.onMessage('command', (client, message) => {
      const player = this.state.players.get(client.sessionId)
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
    const player = new Player()
    player.name = playerName
    player.color = options.color
    player.x = Math.floor(Math.random() * 1000)
    player.y = Math.floor(Math.random() * 1000)
    this.state.players.set(client.sessionId, player)
  }

  onLeave (client, consented) {
    console.log(client.sessionId, 'left!')
    this.state.players.delete(client.sessionId)
  }

  onDispose () {
    console.log('room', this.roomId, 'disposing...')
  }

  update (deltaTime) {
    for (const [sessionId, player] of this.state.players) {
      if (player.isMoving) {
        switch (player.direction) {
          case 0: // up
            player.y -= 1
            break
          case 1: // right
            player.x += 1
            break
          case 2: // down
            player.y += 1
            break
          case 3: // left
            player.x -= 1
            break
        }
      }
    }
  }

}
