import { schema } from '@colyseus/schema'

export const Player = schema({
  name: 'string',
  color: 'number',
  direction: 'int8', // 0 = up, 1 = right, 2 = down, 3 = left
  isMoving: 'boolean',
  message: 'string',
  started: 'boolean',
  x: 'number',
  y: 'number'
})
