import { schema } from '@colyseus/schema'

export const Player = schema({
    name: { type: 'string', view: false },
    color: { type: 'number', view: false },
    renderDistance: { type: 'number', view: false },
    lastRenderCheckAt: { type: 'string', view: false, default: ''},
    message: { type: 'string', view: true, default: '' },
    direction: { type: 'int8', view: true, default: 0 }, // 0 = up, 1 = right, 2 = down, 3 = left
    isMoving: { type: 'boolean', view: true, default: false },
    x: { type: 'number', view: true },
    y: { type: 'number', view: true },
    invisible: { type: 'boolean', view: false, default: false }
})
