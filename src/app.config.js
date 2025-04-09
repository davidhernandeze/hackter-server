import config from '@colyseus/tools'
import { monitor } from '@colyseus/monitor'
import { playground } from '@colyseus/playground'
import { MyRoom } from './rooms/MyRoom.js'

export default config({

  initializeGameServer: (gameServer) => {
    console.log('Initializing game server...')
    gameServer.define('arena', MyRoom)
  },

  initializeExpress: (app) => {

    if (process.env.NODE_ENV !== 'production') {
      app.use('/', playground())
    }

    /**
     * Bind @colyseus/monitor
     * It is recommended to protect this route with a password.
     * Read more: https://docs.colyseus.io/colyseus/tools/monitor/#restrict-access-to-the-panel-using-a-password
     */
    app.use('/monitor', monitor())
  },

  beforeListen: () => {}
})
