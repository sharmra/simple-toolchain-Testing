const express = require('express')
const http = require('http')
const app = express()
const server = http.createServer(app).listen(process.env.PORT || 4000)
const io = require('socket.io')(server)
const AssistantV1 = require('watson-developer-cloud/assistant/v1')
const cfenv = require('cfenv')
const nodemailer = require('nodemailer')

let vcapLocal

try {
	vcapLocal = require('./vcap-local.json')
	console.log('Loaded local VCAP', JSON.stringify(vcapLocal, null, 2))
} catch (e) {}

const appEnvOpts = vcapLocal ? {vcap: vcapLocal} : {}
const appEnv = cfenv.getAppEnv(appEnvOpts)
const tieraAssistant = appEnv.getServiceCreds('Tiera ChatBot')
let emailCredentials
try {
	emailCredentials = require('./email_local.json')
} catch (e) {
	throw Error(e)
}

// Set up Assistant service wrapper.
const service = new AssistantV1({
	iam_apikey: tieraAssistant.apikey,
	url: tieraAssistant.url,
	version: '2019-04-16'
})

const workspace_id = '96ceb624-7531-4103-b461-5570e9666869' // replace with workspace ID
function sendEmail(body) {
	console.log('sending mail')

	var transporter = nodemailer.createTransport({
		host: emailCredentials.host,
		auth: {
			user: emailCredentials.user,
			pass: emailCredentials.pass
		}
	})

	const mail = {
		from: 'Tiera ChatBot',
		to: 'mkaarto@gmail.com',
		subject: 'Kopio keskustelustasi',
		html: body
	}

	//Sending the mail

	return new Promise((resolve, reject) =>
		transporter.sendMail(mail, err => {
			if (err) {
				reject(err.message)
			} else {
				resolve('email sent')
			}
		})
	)
}

io.on('connection', function(socket) {
	// send a empty message to watson and get the response and send the
	// response to the client connected on this event.
	socket.on('send email', ({clientEmail, emailBody}) => {
		const html = JSON.parse(emailBody).reduce((prev, m) => {
			const sender = m.msgType === 'client' ? 'Sinä' : 'Watson'
			return prev.concat(`<li><b>${sender}</b>: ${m.msgText}</li>`)
		}, '')

		sendEmail(createEmailHtml(html))
			.then(message => console.log(message))
			.catch(e => console.error(e))
	})
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
				socket.emit('server message', response)
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
				// console.log('watson response ', JSON.stringify(response))
				if (err) {
					console.error(err) // something went wrong
					return
				}

				// If an intent was detected, log it out to the console.
				if (response.intents.length > 0) {
					// console.log('Detected intent: #' + response.intents)
				}

				// Display the output from dialog, if any.
				if (response.output.length != 0) {
					socket.contextId = response.context
					cb(response)
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

function createEmailHtml(html) {
	return `
	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
		<html xmlns="http://www.w3.org/1999/xhtml">
		<head>
			<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
			<title>Kopio keskustelustasi</title>
			<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
			<style>
			body{
				padding: 1rem;
				font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
				line-height: 1.6;
			}
			ul{
				list-style: none;
			}
			</style>
		</head>
		<body>
			<h1>Kopio keskustelusta</h1>
			<ul>${html}</ul>
		</body>
		</html>
	`
}
