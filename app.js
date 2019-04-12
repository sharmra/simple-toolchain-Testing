const uuid = require('uuid')
const express = require('express')
const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const rqst = require('request')
// try {
//   var keys = require('./keys.json')
//   console.log("loaded local keys")
// } catch (err) {
//   console.log("no keys file, using zeit now secrets")
// }
// const assistant = new AssistantV1({
//   username: keys ? keys.WATSON_USERNAME : process.env.WATSON_USERNAME,
//   password: keys ? keys.WATSON_PASSWORD : process.env.WATSON_PASSWORD,
//   url: 'https://gateway.watsonplatform.net/assistant/api/',
//   version: '2018-02-16'
// })

app.use(express.static('front-end'))

function sendToWatson(message) {
	return new Promise((resolve, reject) => {
		assistant.message(
			{
				input: {
					text: message.text
				},
				context: sanitizedContext(message.context) || {},
				workspace_id: 'cf856554-34a8-427b-9941-7891fd1f84dc'
			},
			(err, response) => {
				if (err) {
					reject(err)
				} else {
					resolve(response)
				}
			}
		)
	})
}

function sanitizedContext(context) {
	// function to remove all context variables from context, there might not be a context object so we'll try it first!
	try {
		const newContext = context
		delete newContext.buttons
		delete newContext.link
		delete newContext.camera
		delete newContext.command
		return newContext
	} catch (e) {
		return {}
	}
}

io.on('connection', socket => {
	console.log('socket connected!', socket.client.id)

	socket.on('greeting', () => {
		sendToWatson({
			text: ''
		})
			.then(response => {
				socket.emit('serverMessage', response)
			})
			.catch(err => console.log(err))
	})
	socket.on('clientMessage', async (msg, msgCallback) => {
		rqst.get(
			{
				json: true,
				url:
					'https://api.forismatic.com/api/1.0/?method=getQuote&format=json&lang=en&key=223313'
			},
			(e, r, b) => {
				console.log(b)
				const message = {
					text: b.quoteText,
					id: uuid(),
					timestamp: Date.now(),
					msgType: 'robot',
					buttons: [
						{btnText: 'I agree', id: uuid()},
						{btnText: 'I disagree', id: uuid()}
					]
				}
				msgCallback(message)
			}
		)
		// msgCallback({ ...msg })
		// var context = msg.context
		// sendToWatson({
		//   text: msg.msgText,
		//   context: context
		// })
		//   .then(response => {
		//     console.log("watson response ", JSON.stringify(response, null, 2))
		//     socket.emit('serverMessage', {
		//       ...response,
		//       timestamp: format(new Date, 'x')
		//     })
		//   })
		//   .catch(err => console.log(err))
	})
	socket.on('disconnect', reason => {
		console.log('disconnected', reason, socket.client.id)
		console.log('connnections', Object.keys(io.sockets.sockets).length)
	})
})

http.listen(process.env.PORT || 4000, () => {
	console.log('listening on *:4000')
})
