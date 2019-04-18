// Example 2: adds user input and detects intents.
var express = require('express')
var http = require('http')
var app = express()
var server = http.createServer(app).listen(3000)
var io = require('socket.io')(server)
var AssistantV1 = require('watson-developer-cloud/assistant/v1')
var cfenv = require('cfenv')
//var dotenv = require('dotenv').config()

/* Here we setup the cloudant stuff to work both locally and on bluemix */
// load local VCAP configuration  and service credentials
var vcapLocal
try {
	vcapLocal = require('./vcap-local.json')
	console.log('Loaded local VCAP', vcapLocal)
} catch (e) {}
const appEnvOpts = vcapLocal ? {vcap: vcapLocal} : {}
const appEnv = cfenv.getAppEnv(appEnvOpts)
console.log(appEnv.getServiceCreds('TieraAssistant'))

const tieraAssistant = appEnv.getServiceCreds('TieraAssistant')

// Set up Assistant service wrapper.
var service = new AssistantV1({
	iam_apikey: tieraAssistant.iam_apikey,
	url: tieraAssistant.url,
	version: tieraAssistant.version
})

var workspace_id = '96ceb624-7531-4103-b461-5570e9666869' // replace with workspace ID

io.on('connection', function(socket) {
	//send a message to watson and get the response and send the response to the client connected on this event.

	service.message(
		{
			workspace_id: workspace_id
		},
		function(err, response) {
			if (err) {
				console.error(err) // something went wrong
				socket.emit('disconnected', 'Bot Not available')
			} else if (response.output.text.length != 0) {
				socket.contextId = response.context
				console.log(response.context.conversation_id)
				socket.emit('server message', response.output.text)
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
