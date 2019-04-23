// Example 2: adds user input and detects intents.
const express = require('express')
const http = require('http')
const app = express()
const server = http.createServer(app).listen(process.env.PORT || 4000)
const io = require('socket.io')(server)
const AssistantV1 = require('watson-developer-cloud/assistant/v1')
const cfenv = require('cfenv')

let vcapLocal
try {
	vcapLocal = require('./vcap-local.json')
	console.log('Loaded local VCAP', vcapLocal)
} catch (e) {}

const appEnvOpts = vcapLocal ? {vcap: vcapLocal} : {}
const appEnv = cfenv.getAppEnv(appEnvOpts)
const tieraAssistant = appEnv.getServiceCreds('Tiera ChatBot')

// Set up Assistant service wrapper.
const service = new AssistantV1({
	iam_apikey: tieraAssistant.apikey,
	url: tieraAssistant.url,
	version: "2019-04-16"
})

const workspace_id = '96ceb624-7531-4103-b461-5570e9666869' // replace with workspace ID

io.on('connection', function(socket) {
	// send a empty message to watson and get the response and send the 
	// response to the client connected on this event.
	
	service.message(
		{
			workspace_id: workspace_id,
			input: {text: ''}
		},
		function(err, response) {
			if (err) {
				console.error(err) // something went wrong
				socket.emit('disconnected', 'Bot Not available')
			} else if (response.output.text.length != 0) {
				socket.contextId = response.context
				socket.emit('server message', response.output)
			}
		}
	)

	socket.on('client message', function(message, cb) {
		service.message(
			{
				workspace_id: workspace_id,
				input: {text: message},
				context: sanitizedContext(socket.contextId)
			},
			function(err, response) {
				console.log('watson response ', JSON.stringify(response.output))
				if (err) {
					console.error(err) // something went wrong
					return
				}

				// If an intent was detected, log it out to the console.
				if (response.intents.length > 0) {
					console.log('Detected intent: #' + response.intents)
				}

				// Display the output from dialog, if any.
				if (response.output.length != 0) {
					socket.contextId = response.context
					cb(response.output)
				}
			}
		)
	})
})

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
