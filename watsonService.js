const AssistantV1 = require('watson-developer-cloud/assistant/v1')
const cfenv = require('cfenv')

let vcapLocal

try {
	vcapLocal = require('./vcap-local.json')
	console.log('Loaded local VCAP', JSON.stringify(vcapLocal, null, 2))
} catch (e) {}

const appEnvOpts = vcapLocal ? {vcap: vcapLocal} : {}
const appEnv = cfenv.getAppEnv(appEnvOpts)
const tieraAssistant = appEnv.getServiceCreds('Tiera ChatBot')

const service = new AssistantV1({
	iam_apikey: tieraAssistant.apikey,
	url: tieraAssistant.url,
	version: '2019-04-16'
})

module.exports = service
