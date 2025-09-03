import { schema } from '@colyseus/schema'

export const Player = schema({
    name: { type: 'string', view: false },
    color: { type: 'number', view: false },
    renderDistance: { type: 'number', view: false },
    message: { type: 'string', view: true },
    direction: { type: 'int8', view: true }, // 0 = up, 1 = right, 2 = down, 3 = left
    isMoving: { type: 'boolean', view: true },
    x: { type: 'number', view: true },
    y: { type: 'number', view: true }
})
