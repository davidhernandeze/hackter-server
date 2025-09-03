import { schema } from '@colyseus/schema'
import { Player } from './Player.js'

export const MyRoomState = schema({
  players: { map: Player, default: new Map()},
  offlinePlayers: { map: Player, default: new Map() },
  mapVertices: ['number']
})
