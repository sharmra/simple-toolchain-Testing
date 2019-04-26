const nodemailer = require('nodemailer')

let emailCredentials
try {
	emailCredentials = require('./email_local.json')
} catch (e) {
	throw Error(e)
}

function sendEmail(body) {
	console.log('sending mail')

	var transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS
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
module.exports = sendEmail
