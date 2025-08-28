import * as https from 'node:https'

export function postMessageToSlack(message) {
    if (process.env.ENVIRONMENT === 'development') return
    const data = JSON.stringify({
        channel: process.env.SLACK_CHANNEL,
        text: message
    })

    const options = {
        hostname: 'slack.com',
        port: 443,
        path: '/api/chat.postMessage',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SLACK_TOKEN}`,
            'Content-Length': data.length
        }
    }

    const req = https.request(options, (res) => {
        let response = ''

        res.on('data', (chunk) => {
            response += chunk
        })

        res.on('end', () => {
            console.log('Message posted:', response)
        })
    })

    req.on('error', (e) => {
        console.error('Error posting message:', e)
    })

    req.write(data)
    req.end()
}