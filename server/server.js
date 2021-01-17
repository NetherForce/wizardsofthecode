const {app, express, pgp, db, session, io, aws_crypto, CryptoJS, ioS, http ,https, nodemailer, transporter, email, httpL} = require("./server_main.js");
const port = 3000
const path = require("path");

//get the structures
let structures = require("./structures.js");

//get the database comunication functions
let dbFunctions = require("./databaseFunctions.js");

app.use(express.static('public'));
app.use(express.json());

//makes folder "client" accesable by client
app.use(express.static(path.join(__dirname, '/../client')));

var MemoryStore = require('memorystore')(session);

var store = new MemoryStore({
	checkPeriod: 86400000 // prune expired entries every 24h
});

//add sessions
app.use(session({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: true,
	cookie: { secure: false }, // сложи го на true когато пуснем https-а
	store: store
}))

//variables
let userIdToSockets = {}; //from user id to socket array

var urls = {}; //an object that contains the urls
			   //each object contains the userIds of the users that are currently expecting logs for the url
			   //when an usser connects his id is added to the urls, he is expecting logs from
			   //the user id is also added by a request when the user starts expecting logs from a certain url
			   //then an user disconnects and the the value of his id gets set to false
			   //if the log isn't 200 and the user id value is set to false and email is sent

var sentEmails = {}; //same structure as urls
					 //saves if a person was sent an email

var generateToken = function() { // generates a verification token
	return Math.random().toString(36).substr(2); // remove `0.`
}

function encodeQueryData(data) { // used to generate a get request link
	const ret = [];
	for (let d in data)
	  ret.push(encodeURIComponent(data[d]));
	return ret.join('/');
 }

 function subtractDtes(date1, date2){ // returns the difference in time between the dates in miliseconds
	return Math.abs(date1 - date2);
 }

function checkWebsite(url) { // checks website status
	let time = new Date();  // the time the function was called
	let maxTime = 5 * 1000; // the maximum amount of time before the function returns and error | currently 5 sec.

	httpL
		.get(url, function (res) {
			console.log(url, res.statusCode);
			return res.statusCode === 200;
		})
		.on("error", function (error) {
			return error.code;
		})
	.then(function (fReturn){
		if(subtractDtes(new Date(), time) < maxTime){
			return fReturn;
		}else{
			fReturn = "Server is taking too long to respond.";
			return fReturn;
		}
	});

	
}

function serverDownEmail(url, to_){
	transporter.sendMail({
		from: "" + email, // sender address
		to: "" + to_, // list of receivers
		subject: "A server is down", // Subject line
		text: "The following server is down: " + url, // plain text body
		html: "The following server is down: <a href=" + url + ">" + url + "</a>", // html body
	}, function (error, info){
		console.log("Error: ", error);
		console.log("Info: ", info);
	});
}

function serverBackUpEmail(url, to_){
	transporter.sendMail({
		from: "" + email, // sender address
		to: "" + to_, // list of receivers
		subject: "A server is now working", // Subject line
		text: "The following server is now working: " + url, // plain text body
		html: "The following server is now working: <a href=" + url + ">" + url + "</a>", // html body
	}, function (error, info){
		console.log("Error: ", error);
		console.log("Info: ", info);
	});
}

function logUrls(){
	for (const [key, value] of Object.entries(urls)) {
		if(urls[key]){
			dbFunctions.createLog(key, checkWebsite(key))
			.then(function (dbReturn){
				for (const [key_, value_] of Object.entries(value)){
					if(dbReturn.success){
						if(value_){
							for(let i = 0; i < userIdToSockets[key_].length; i++){
								userIdToSockets(key_)[i].emit('receivedLog', JSON.stringify({log: dbReturn.object}));
							}
							if(sentEmails[key][key_]){
								dbFunctions.loadEmail(key_)
								.then(function (dbReturn_){
									if(dbReturn_.success){
										serverBackUpEmail(key, dbReturn_.object);
									}
								});

								sentEmails[key][key_] = false;
							}
						}else{
							if(!sentEmails[key][key_]){
								dbFunctions.loadEmail(key_)
								.then(function (dbReturn_){
									if(dbReturn_.success){
										serverDownEmail(key, dbReturn_.object);
									}
								});
								serverDownEmail(key, );

								sentEmails[key][key_] = true;
							}
						}
					}else{
						for(let i = 0; i < userIdToSockets[key_].length; i++){
							userIdToSockets(key_)[i].emit('error', JSON.stringify({error: dbReturn.error}));
						}
					}
				}
			});
		}
    }
}

const generatorKeyId = 'arn:aws:kms:eu-central-1:234133237098:alias/messages_key';
const keyIds = ['arn:aws:kms:eu-central-1:234133237098:key/81bbb404-3ce1-4d5c-92e8-81b5970a3219'];

//na survura trqbva da se kachat credentiali ~/.aws/credentials
const keyring = new aws_crypto.KmsKeyringNode({ generatorKeyId, keyIds });

const { encrypt, decrypt } = aws_crypto.buildClient(
  aws_crypto.CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT
)
const context = {
  purpose: 'database encryption',
  origin: 'eu-central-1'
}

let key;

async function decryptKey(encryptedText) {
    try {
        const { plaintext, messageHeader } = await decrypt(keyring, encryptedText);
        return plaintext;
    } catch (err){
        console.log(err);
    }
};
function fromBytesToString(bytes) {
    let string = "";
    for (let i = 0; i < bytes.length; i++) {
        string+= String.fromCharCode(bytes[i]);
    }
    return string;
};
function encryptText(text) {
    return CryptoJS.AES.encrypt(text, key).toString();
};
function decryptText(text) {
    return CryptoJS.AES.decrypt(text, key).toString(CryptoJS.enc.Utf8);
};
//process the requests that the client sends

app.get('/node_modules/socket.io/client-dist/socket.io.js', (req, res) => {
	res.sendFile(__dirname + '/../node_modules/socket.io/client-dist/socket.io.js');
});

app.get('/verify/:id/:token', (req, res) => {
	dbFunctions.verifyUser(req.params.token, req.params.id)
	.then(function (dbReturn){
		if(dbReturn.success){
			res.sendFile(path.resolve(__dirname + '/../client/index.html'));
		}
	});
});

app.post('/createUser', (req, res) => {
	if(!req.body.username || (req.body.username.length > 16)) {
		res.json({success:false, error:"Too long username!"});
		return;
	}
	
	let token = generateToken();

	dbFunctions.newUser(req.body.username, req.body.email, req.body.password, token)
	.then(function (dbReturn){
		if(dbReturn.success){
			console.log(dbReturn.object.id);

			const data = { 'id': dbReturn.object.id, 'token': token };
			let sign = encodeQueryData(data);

			let link = "https://wizardsofthecode.online/verify/" + sign;
			console.log(link);
			transporter.sendMail({
				from: "" + email, // sender address
				to: "" + req.body.email, // list of receivers
				subject: "Verify email", // Subject line
				text: "Click the link to verify email: " + link, // plain text body
				html: "Click the link to verify email: <a href=" + link + "> Click here.</a>", // html body
			}, function (error, info){
				console.log("Error: ", error);
				console.log("Info: ", info);
			});
		}
		res.json(dbReturn);
	});
});

app.post('/login', (req, res) => {
	dbFunctions.login(req.body.username, req.body.password)
	.then(function (dbReturn){
		console.log("server", dbReturn);
		if(dbReturn.success){
			req.session.userId = dbReturn.object.id;
			dbReturn.sessionId = req.session.id;

			let user = dbReturn.object;
			if(user.urls == undefined){
				user.urls = {};
			}
			for (let url in user.urls) {
				if(urls[url] == null){
					urls[url] = {};
				}
				urls[url][user.id] = true;
		
				if(sentEmails[url] == null){
					sentEmails[url] = {};
				}
				sentEmails[url][user.id] = false;
			}
		}else{
			if(dbReturn.object != undefined){
				const data = { 'id': dbReturn.object.id, 'token': dbReturn.object.token };
				let sign = encodeQueryData(data);

				let link = "https://wizardsofthecode.online/verify/" + sign;
				console.log("Email link: " + link);
				transporter.sendMail({
					from: "" + email, // sender address
					to: "" + req.body.email, // list of receivers
					subject: "Verify email", // Subject line
					text: "Click the link to verify email: " + link, // plain text body
					html: "Click the link to verify email: <a href=" + link + "> Click here.</a>", // html body
				}, function (error, info){
					console.log("Error: ", error);
					console.log("Info: ", info);
				});
			}
		}

		res.json(dbReturn);
	});
});

app.post('/getUser', (req, res) => {
	let dbReturn = dbFunctions.loadUser(req.body.userId);
	res.json(dbReturn);
});

// app.post('/getUserInfo', (req, res) => {
// 	let dbReturn = dbFunctions.loadUserInfo(req.userId);
// 	res.json(dbReturn);
// });

//socket comunication
function onConnection(socket){

	socket.on('allthenticate', (msg) => {
		console.log(msg);
		msg = JSON.parse(msg);

		console.log("messageIdA: ", msg.sessionId);
		store.get(msg.sessionId, (error, session) => {
			console.log("sessionA", session);
			if(session.userId){
				if(!userIdToSockets[session.userId]){
					userIdToSockets[session.userId] = [];
				}
				userIdToSockets[session.userId].push(socket);
			}
		});
	});

	socket.on('getLog', (msg) => {
		msg = JSON.parse(msg);

		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					dbFunctions.getLog(msg.logId)
					.then(function (dbReturn){
						if(dbReturn.success){
							for(let i = 0; i < userIdToSockets[session.userId].length; i++){
								userIdToSockets[session.userId][i].emit('receivedLog', {log: dbReturn.object});
							}
						}else{
							for(let i = 0; i < userIdToSockets[session.userId].length; i++){
								userIdToSockets[session.userId][i].emit('error', {error: dbReturn.error});
							}
						}
					});
				}
			}
		});
	});

	socket.on('getLogs', (msg) => {
		msg = JSON.parse(msg);

		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					dbFunctions.createLog(msg.url, checkWebsite(msg.url))
					.then(function (dbReturn_){
						if(dbReturn_.success){
							dbFunctions.getLog(msg.url, msg.brLogs)
							.then(function (dbReturn){
								if(dbReturn.success){
									for(let i = 0; i < userIdToSockets[session.userId].length; i++){
										userIdToSockets[session.userId][i].emit('receivedLogs', JSON.stringify({logs: dbReturn.object}));
									}
								}else{
									for(let i = 0; i < userIdToSockets[session.userId].length; i++){
										userIdToSockets[session.userId][i].emit('error', JSON.stringify({error: dbReturn.error}));
									}
								}
							});
						}else{
							for(let i = 0; i < userIdToSockets[session.userId].length; i++){
								userIdToSockets[session.userId][i].emit('error', JSON.stringify({error: dbReturn_.error}));
							}
						}
					});
				}
			}
		});
	});

	socket.on('addUrl', (msg) => {
		msg = JSON.parse(msg);

		console.log("messageId: ", msg.sessionId);
		store.get(msg.sessionId, (error, session) => {
			console.log("session", session);
			if(session.userId){
				if(userIdToSockets[session.userId]){
					dbFunctions.addUrlToUser(session.userId, msg.url)
					.then(function (dbReturn){
						if(dbReturn.success){
							if(urls[msg.url] == undefined){
								urls[msg.url] = {};
							}
							if(urls[msg.url] == undefined){
								urls[msg.url][session.userId] = true;
							}

							for(let i = 0; i < userIdToSockets[session.userId].length; i++){
								userIdToSockets[session.userId][i].emit('receivedUrl', JSON.stringify({url: msg.url}));
							}
						}else{
							for(let i = 0; i < userIdToSockets[session.userId].length; i++){
								userIdToSockets[session.userId][i].emit('error', JSON.stringify({error: dbReturn.error}));
							}
						}
					});
				}
			}
		});
	});

	socket.on('removeUrl', (msg) => {
		msg = JSON.parse(msg);

		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					dbFunctions.removeUrlFromUser(session.userId, msg.url)
					.then(function (dbReturn){
						if(dbReturn_.success){
							userIdToSockets[session.userId].emit('removedUrl', JSON.stringify({url: msg.url}));
						}else{
							userIdToSockets[session.userId].emit('error', JSON.stringify({error: dbReturn.error}));
						}
					});
				}
			}
		});
	});


	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
}

io.on('connection', onConnection);
ioS.on('connection', onConnection);


http.listen(80, () => {
	console.log('HTTP Server running on port 80');
});

 https.listen(443, () => {
 	console.log('HTTPS Server running on port 443');
 });

// receive and decrypt key
db.any('SELECT * FROM encrypted_key')
.then (function (result){
	key = result[0].key;
	decryptKey(key)
	.then (function (result) {
		key = fromBytesToString(result);
	});
});

let logUrlsTime = 3 * 1000; //the amount of time the function callLogUrlsFunction will wait before calling itself | it will currently wait 30 sec.

function callLogUrlsFunction(){ // calls the function logUrl every few seconds
	logUrls();
	setTimeout(callLogUrlsFunction, logUrlsTime);
}

callLogUrlsFunction();