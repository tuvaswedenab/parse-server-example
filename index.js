// Example express application adding the parse-server module to expose Parse
// compatible API routes.

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');

var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}

//iOS Push Notification certificate
var devCertPath = path.resolve(__dirname, './certificate/TuvaSwedenAB-push.p12');
console.log(devCertPath);
var pushConfig = { 
    android: {
        senderId: '131416714675',
        apiKey: 'AIzaSyD2b79zFPpgWLjHmlXz8smqAX34r0_y94o'
    },
    ios: {
      pfx: devCertPath, // P12 file only
      passphrase: '1+2Is3&.',
      bundleId: 'com.tuvasweden.TUVA',
      production: true
    }
  };

var api = new ParseServer({
  databaseURI: databaseUri || 'mongodb://tuva.master:5EyrZdpQ5H3EgcR@ds053106-a0.mlab.com:53106,ds053106-a1.mlab.com:53106/tuva2-production?replicaSet=rs-ds053106',
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: process.env.APP_ID || 'XMg-3JA-9BC-enM',
  masterKey: process.env.MASTER_KEY || 'g7r-xxA-btb-hx6', //Add your master key here. Keep it secret!
  serverURL: process.env.SERVER_URL || 'http://tuva.herokuapp.com/parse',  // Don't forget to change to https if needed
  push: pushConfig,
  liveQuery: {
    classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  },
  
  //mailgun settings
  verifyUserEmails: true,
  emailVerifyTokenValidityDuration: 2 * 60 * 60,
  preventLoginWithUnverifiedEmail: false,
  publicServerURL: 'http://tuva.herokuapp.com/parse',
  appName: 'Tuva',
  emailAdapter: {
    module: 'parse-server-simple-mailgun-adapter',
    options: {
      // The address that your emails come from
      fromAddress: 'support@tuva.co',
      // Your domain from mailgun.com
      domain: 'mg.tuva.co',
      // Your API key from mailgun.com
      apiKey: 'key-27096ecafcccb6b4ad80971cbb5df90e',

      templates: {
        passwordResetEmail: {
            subject: 'Begärt nytt lösenord för Tuva',
            //pathPlainText: path.join(__dirname, 'email-templates/password_reset_email.txt'),
            pathHtml: path.join(__dirname, 'mailgun-template/password_reset_email.html')
            //callback: (user) => {}
        },
        verificationEmail: {
            subject: 'Confirm your account',
            pathPlainText: path.join(__dirname, 'email-templates/verification_email.txt'),
            pathHtml: path.join(__dirname, 'email-templates/verification_email.html'),
            callback: (user) => {}
        }
      }
    }
  }
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey



var app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('I dream of being a website -MASTER BRANCH-.  Please star the parse-server repo on GitHub!');
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('parse-server-example running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);

//MAILGUN ADAPTER
var Mailgun = require('mailgun-js');

var SimpleMailgunAdapter = mailgunOptions => {
  if (!mailgunOptions || !mailgunOptions.apiKey || !mailgunOptions.domain || !mailgunOptions.fromAddress) {
    throw 'SimpleMailgunAdapter requires an API Key, domain, and fromAddress.';
  }
  var mailgun = Mailgun(mailgunOptions);

  var sendMail = mail => {
    var data = {
      from: mailgunOptions.fromAddress,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
    }

    return new Promise((resolve, reject) => {
      mailgun.messages().send(data, (err, body) => {
        if (typeof err !== 'undefined') {
          reject(err);
        }
        resolve(body);
      });
    });
  }

  return Object.freeze({
    sendMail: sendMail
  });
}

module.exports = SimpleMailgunAdapter
//END MAILGUN ADAPTER
