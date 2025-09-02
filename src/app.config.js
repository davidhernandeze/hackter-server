import config from '@colyseus/tools'
import { monitor } from '@colyseus/monitor'
import { playground } from '@colyseus/playground'
import { MyRoom } from './rooms/MyRoom.js'
import basicAuth from 'express-basic-auth'
import { matchMaker } from 'colyseus'
import { RedisDriver } from '@colyseus/redis-driver'

matchMaker.controller.exposedMethods = ['join', 'joinOrCreate', 'joinById', 'reconnect']

const basicAuthMiddleware = basicAuth({
    users: {
        'admin': process.env.MONITOR_PASSWORD,
    },
    challenge: true
})

export default config({

    options: {
        // driver: new RedisDriver({
        //     host: 'localhost',
        //     port: 6379,
        //     password: ''
        // }),
        devMode: true
    },

    initializeGameServer: (gameServer) => {
        console.log('Initializing game server...')
        gameServer.define('arena', MyRoom)
    },

    initializeExpress: (app) => {

        if (process.env.NODE_ENV!=='production') {
            app.use('/', playground())
        }

        app.use('/monitor', basicAuthMiddleware, monitor())
    },

    beforeListen: () => {
    }

})
