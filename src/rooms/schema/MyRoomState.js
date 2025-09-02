import { schema } from '@colyseus/schema'
import { Player } from './Player.js'

export const MyRoomState = schema({
  players: { map: Player },
  offlinePlayers: { map: Player },
  mapVertices: ['number']
})
