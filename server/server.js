const {app, express, pgp, db, session, io, aws_crypto, CryptoJS, /*ioS,*/ http /*,https*/} = require("./server_main.js");
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

//add sessions
app.use(session({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: true,
	cookie: { secure: false } // сложи го на true когато пуснем https-а
}))

//variables
let userIdToSockets = {}; //from user id to socket array

var urls = {}; //an object that contains the urls
			   //each object contains the userIds of the users that are currently expecting logs for the url
			   //when an usser connects his id is added to the urls, he is expecting logs from
			   //the user id is also added by a request when the user starts expecting logs from a certain url
			   //if an url has no user that expect logs from it it is set to none
			   //this objects also shows which urls need to be checked once in a while

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

app.post('/createUser', (req, res) => {
	if(!req.body.username || (req.body.username.length > 16)) {
		res.json({success:false, error:"Too long username!"});
		return;
	}
	
	dbFunctions.newUser(req.body.username, req.body.password)
	.then(function (dbReturn){
		if(dbReturn.success){
			req.body.session.userId = dbReturn.object.id;
			dbReturn.sessionId = req.body.session.id;
		}
		console.log(dbReturn);
		res.json(dbReturn);
	});
});

app.post('/login', (req, res) => {
    let dbReturn = dbFunctions.login(req.username, req.password);
	if(dbReturn.success){
		req.session.userId = dbReturn.object.id;
		dbReturn.sessionId = req.session.id;
	}
	res.json(dbReturn);
});

app.post('/getUser', (req, res) => {
	let dbReturn = dbFunctions.loadUser(req.userId);
	res.json(dbReturn);
});

// app.post('/getUserInfo', (req, res) => {
// 	let dbReturn = dbFunctions.loadUserInfo(req.userId);
// 	res.json(dbReturn);
// });


//socket comunication
function onConnection(socket){

	socket.on('allthenticate', (msg) => {
		msg = JSON.parse(msg);

		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					userIdToSockets[session.userId] = [];
				}
				userIdToSockets[session.userId].push(socket);
			}
		});
	});

	/*socket.on('getRoom', (msg) => {
		msg = JSON.parse(msg);
	
		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					let dbReturn = dbFunctions.loadRoom(msg.roomId);
					if(dbReturn.success){
						let theRoom = dbReturn.object;

						let wasSentSuccessful = false;
						for(let i = 0; i < theRoom.brMembers; i++){
							if(theRoom.memberIds[i] == session.userId){
								userIdToSockets[session.userId].emit('receiveRoom', {room: dbReturn.object});
								wasSentSuccessful = true;
							}
						}
					
						if(!wasSentSuccessful){
							userIdToSockets[session.userId].emit('error', {error: "You are not a part of the room you are requesting."});
						}
					}else{
						userIdToSockets[session.userId].emit('error', {error: dbRetusr.error});
					}
				}
			}
		});
	});

	socket.on('getMessage', (msg) => {
		msg = JSON.parse(msg);
	
		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					let dbReturn = dbFunctions.loadMessage(msg.messageId);
					if(dbReturn.success){
						let roomReturn = dbFunctions.loadRoom(dbReturn.object.roomId);
						if(roomReturn.success){
							let theRoom = roomReturn.object;
							let wasSentSuccessful = false;
							for(let i = 0; i < theRoom.brMembers; i++){
								if(theRoom.memberIds[i] == session.userId){
									userIdToSockets[session.userId].emit('receivedMessage', {message: dbReturn.object});
									wasSentSuccessful = true;
								}
							}
							
							if(!wasSentSuccessful){
								userIdToSockets[session.userId].emit('error', {error: "You are not a part of the room you are requesting the message from."});
							}
						}else{
							userIdToSockets[session.userId].emit('error', {error: roomReturn.error});
						}
					}else{
						userIdToSockets[session.userId].emit('error', {error: dbReturn.error});
					}
				}
			}
		});
	});

	socket.on('createRoom', (msg) => {
		msg = JSON.parse(msg);
	
		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					let dbReturn = dbFunctions.createRoom(session.userId, msg.memberIds);
					if(dbReturn.success){
						let theRoom = dbReturn.object;

						for(let i = 0; i < theRoom.brMembers; i++){
							userIdToSockets[theRoom.memberIds[i]].emit('receiveRoom', {room: dbReturn.object});
						}
					}else{
						userIdToSockets[session.userId].emit('error', dbReturn);
					}
				}
			}
		});
	});

	socket.on('addMemberToRoom', (msg) => {
		msg = JSON.parse(msg);
	
		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					let dbReturn = dbFunctions.loadRoom(msg.roomId);
					if(dbReturn.success){
						let roomReturn = dbReturn.object;

						let wasSentSuccessful = false;
						for(let i = 0; i < roomReturn.brMembers; i++){
							if(roomReturn.memberIds[i] == session.userId){
								let dbResponse_ = dbFunctions.addMemberToRoom(session.userId, msg.userId, msg.roomId);
								if(dbResponse_.success){
									let theRoom = dbResponse_.object;
									
									for(let i = 0; i < theRoom.brMembers; i++){
										userIdToSockets[theRoom.memberIds[i]].emit('addedMemberToRoom', {memberId: msg.memberId, roomId: msg.roomId});
									}
									
									wasSentSuccessful = true;
								}else{
									userIdToSockets[session.userId].emit('error', {error: dbResponse_.error});
								}
							}
						}
						if(!wasSentSuccessful){
							userIdToSockets[session.userId].emit('error', {error: "You are not a part of the room you are adding the member to."});
						}
					}else{
						userIdToSockets[session.userId].emit('error', {error: dbReturn.error});
					}
				}
			}
		});
	});

	socket.on('removeMemberFromRoom', (msg) => {
		msg = JSON.parse(msg);
	
		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					let dbReturn = dbFunctions.loadRoom(msg.roomId);
					if(dbReturn.success){
						let roomReturn = dbReturn.object;

						let wasSentSuccessful = false;
						for(let i = 0; i < roomReturn.brMembers; i++){
							if(roomReturn.memberIds[i] == session.userId){
								let dbResponse_ = dbFunctions.removeMemberFromRoom(msg.userId, msg.roomId);
								if(dbResponse_.success){
									let theRoom = dbResponse_.object;
									
									for(let i = 0; i < theRoom.brMembers; i++){
										userIdToSockets[theRoom.memberIds[i]].emit('removedMemberFromRoom', {memberId: msg.memberId, roomId: msg.roomId});
									}
									
									wasSentSuccessful = true;
								}else{
									userIdToSockets[session.userId].emit('error', {error: dbResponse_.error});
								}
							}
						}
						if(!wasSentSuccessful){
							userIdToSockets[session.userId].emit('error', {error: "You are not a part of the room you are removeing the member from."});
						}
					}else{
						userIdToSockets[session.userId].emit('error', {error: dbReturn.error});
					}
				}
			}
		});
	});

	socket.on('changeRoomName', (msg) => {
		msg = JSON.parse(msg);
	
		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					let dbReturn = dbFunctions.loadRoom(msg.roomId);
					if(dbReturn.success){
						let roomReturn = dbReturn.object;

						let wasSentSuccessful = false;
						for(let i = 0; i < roomReturn.brMembers; i++){
							if(roomReturn.memberIds[i] == session.userId){
								let dbResponse_ = dbFunctions.removeMemberFromRoom(msg.userId, msg.roomId);
								if(dbResponse_.success){
									let theRoom = dbResponse_.object;
									
									for(let i = 0; i < theRoom.brMembers; i++){
										userIdToSockets[theRoom.memberIds[i]].emit('changedRoomName', {newName: msg.newName, roomId: msg.roomId});
									}
									
									wasSentSuccessful = true;
								}else{
									userIdToSockets[session.userId].emit('error', {error: dbResponse_.error});
								}
							}
						}
						if(!wasSentSuccessful){
							userIdToSockets[session.userId].emit('error', {error: "You are not a part of the room you are changing the name of."});
						}
					}else{
						userIdToSockets[session.userId].emit('error', {error: dbReturn.error});
					}
				}
			}
		});
	});

	socket.on('newMessage', (msg) => {
		msg = JSON.parse(msg);
	
		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					let dbReturn = dbFunctions.loadRoom(msg.roomId);
					if(dbReturn.success){
						let theRoom = dbReturn.object;

						let wasSentSuccessful = false;
						for(let i = 0; i < theRoom.brMembers; i++){
							if(theRoom.memberIds[i] == session.userId){
								let dbReturn_ = dbFunctions.newMessage(session.userId, msg.roomId, msg.messageContent);

								if(dbReturn_.success){
									for(let i = 0; i < theRoom.brMembers; i++){
										userIdToSockets[theRoom.memberIds[i]].emit('receivedMessage', {message: dbReturn_.object});
									}
								}else{
									userIdToSockets[session.userId].emit('error', {error: roomReturn_.error});
								}

								wasSentSuccessful = true;
							}
						}

						if(!wasSentSuccessful){
							userIdToSockets[session.userId].emit('error', {error: "You are not a part of the room you are trying to send the message to."});
						}
					}else{
						userIdToSockets[session.userId].emit('error', {error: dbReturn.error});
					}
				}
			}
		});
	});

	socket.on('removeMessage', (msg) => {
		msg = JSON.parse(msg);
	
		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					let dbReturn = dbFunctions.loadRoom(msg.roomId);
					if(dbReturn.success){
						let theRoom = dbReturn.object;

						let wasSentSuccessful = false;
						for(let i = 0; i < theRoom.brMembers; i++){
							if(theRoom.memberIds[i] == session.userId){
								let messageResponse = dbFunctions.loadMessage(msg.messageId);
								if(messageResponse.success){
									if(messageResponse.object.sentById == session.userId){
										for(let i = 0; i < theRoom.brMembers; i++){
											userIdToSockets[theRoom.memberIds[i]].emit('removedMessage', {messageId: msg.messageId, roomId: msg.roomId});
										}
									}else{
										userIdToSockets[session.userId].emit('error', {error: "This message was not sent by you. You cannot remove it."});
									}
								}else{
									userIdToSockets[session.userId].emit('error', {error: messageResponse.error});
								}
							}
						}

						if(!wasSentSuccessful){
							userIdToSockets[session.userId].emit('error', {error: "You are not a part of the room you are trying to remove the message from."});
						}
					}else{
						userIdToSockets[session.userId].emit('error', {error: dbReturn.error});
					}
				}
			}
		});
	});

	socket.on('editMessage', (msg) => {
		msg = JSON.parse(msg);
	
		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					let dbReturn = dbFunctions.loadRoom(msg.roomId);
					if(dbReturn.success){
						let theRoom = dbReturn.object;

						let wasSentSuccessful = false;
						for(let i = 0; i < theRoom.brMembers; i++){
							if(theRoom.memberIds[i] == session.userId){
								let messageResponse = dbFunctions.loadMessage(msg.messageId);
								if(messageResponse.success){
									if(messageResponse.object.sentById == session.userId){
										for(let i = 0; i < theRoom.brMembers; i++){
											userIdToSockets[theRoom.memberIds[i]].emit('editedMessage', {messageId: msg.messageId, roomId: msg.roomId, newMessage: msg.newMessage});
										}
									}else{
										userIdToSockets[session.userId].emit('error', {error: "This message was not sent by you. You cannot edit it."});
									}
								}else{
									userIdToSockets[session.userId].emit('error', {error: messageResponse.error});
								}
							}
						}

						if(!wasSentSuccessful){
							userIdToSockets[session.userId].emit('error', {error: "You are not a part of the room you are trying to edit the message of."});
						}
					}else{
						userIdToSockets[session.userId].emit('error', {error: dbReturn.error});
					}
				}
			}
		});
	});

	socket.on('changeUsername', (msg) => {
		msg = JSON.parse(msg);
	
		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					let dbReturn = dbFunctions.changeUsername(session.userId, msg.newUsername);
					if(dbReturn.success){
						userIdToSockets[session.userId].emit('changedUsername', {newUsername: msg.newUsername});
					}else{
						userIdToSockets[session.userId].emit('error', {error: dbReturn.error});
					}
				}
			}
		});
	});

	socket.on('changePassword', (msg) => {
		msg = JSON.parse(msg);
	
		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					let dbReturn = dbFunctions.changePassword(session.userId, msg.oldPassword, msg.newPassword);
					if(dbReturn.success){
						userIdToSockets[session.userId].emit('changedPassword', {message: "Password was succesfully changed."});
					}else{
						userIdToSockets[session.userId].emit('error', {error: dbReturn.error});
					}
				}
			}
		});
	});

	socket.on('changeInfo', (msg) => {
		msg = JSON.parse(msg);
	
		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					let dbReturn = dbFunctions.changeUserInfo(session.userId, msg.infoParameter, msg.newInfo);
					if(dbReturn.success){
						userIdToSockets[session.userId].emit('changedInfo',  {infoParameter: msg.infoParameter, newInfo: msg.newInfo});
					}else{
						userIdToSockets[session.userId].emit('error', {error: dbReturn.error});
					}
				}
			}
		});
	});

	socket.on('becomeVisible', (msg) => {
		msg = JSON.parse(msg);

		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					let isUserAlreadyVisible = false;

					for(let i = 0; i < visibleUsers.length(); i++){
						if(visibleUsers[i] == session.userId){
							isUserAlreadyVisible = true;
						}
					}

					if(isUserAlreadyVisible = false){
						visibleUsers.push(session.userId);
					}
					userIdToSockets[session.userId].emit('youBecameVisible');
				}
			}
		});
	});

	socket.on('becomeInvisible', (msg) => {
		msg = JSON.parse(msg);

		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					for(let i = 0; i < visibleUsers.length(); i++){
						if(visibleUsers[i] == session.userId){
							visibleUsers[i] = visibleUsers[visibleUsers.length()-1];
							visibleUsers.pop();
							userIdToSockets[session.userId].emit('youBecameInvisible', {});
						}
					}
				}
			}
		});
	});

	socket.on('getVisiblePlayers', (msg) => {
		msg = JSON.parse(msg);

		store.get(msg.sessionId, (error, session) => {
			if(session.userId){
				if(userIdToSockets[session.userId]){
					userIdToSockets[session.userId].emit('receivedVisablePlayers', {visible: visibleUsers});
				}
			}
		});
	});
*/

	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
}

io.on('connection', onConnection);
//ioS.on('connection', onConnection);


http.listen(80, () => {
	console.log('HTTP Server running on port 80');
});

// https.listen(443, () => {
// 	console.log('HTTPS Server running on port 443');
// });

// receive and decrypt key
db.any('SELECT * FROM encrypted_key')
.then (function (result){
	key = result[0].key;
	decryptKey(key)
	.then (function (result) {
		key = fromBytesToString(result);
	})
});