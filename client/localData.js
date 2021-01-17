//var socket = io.connect('https://wizardsofthecode.online:443/');
var socket = io('https://wizardsofthecode.online:8000/');
//var socket = io();

function updateObj(obj1, obj2){
    //this function makes the values of obj1 equal to the values of onj2
    for (const [key, value] of Object.entries(obj2)) {
        obj1[key] = value;
    }
}


//classes that describe the rooms and users

class Log{
    constructor(){
        this.id;
        this.url;
        this.date;
        this.status;
    }
}

class User{
    constructor(){
        this.id;
        this.username;
        this.urls = [];
    }
}

var user; //the current logged user
var loadedUsers = {}; //object of users that have already been loaded | access a user: loadedUsers[the user id]
var loadedRooms = {}; //the same as the users, but for the rooms
var loadedMessages = {}; //the same as the users, but for the messages

var currRoomId; //id of the room we are currently in

var searchingPlayersIds = []; //players that are searching for a random chat

var lastAddedRoomId; //the id of the room we recieved last
var playerToAddToRoom = null; //the id of a player we must add to the lastly recieved room
var amIVisible = false; //shows if other players can see me in the search players menu

var sessionId; //id of the seesion we connect to



//functions for comunication with the server
function register(username, password){
    password = CryptoJS.SHA512(password).toString();

    console.log(username, password);
	$.ajax("/createUser", {
		data: JSON.stringify({sessionId: sessionId, username: username, password: password}),
		method: "POST",
		contentType: "application/json",
		success: function(response, textStatus, jqXHR) {			
			console.log(response);
			if(response.success) {
                user = new User();
                updateObj(user, response.object);
                loadedUsers[user.id] = user;
                sessionId = response.sessionId;
                socket.emit('allthenticate', {sessionId: sessionId});
                console.log(sessionId);
        
                document.getElementById('registerDiv').style.display = "none";
                document.getElementById('class').style.display = "inline-block";
            } else {
                alert(response.error);
                //Error
            }
		},
		error: function (jqXHR, textStatus, errorThrown) {
			console.log(jqXHR);
			console.log(textStatus);
			console.log(errorThrown);
		}		
	});
}

function login(username, password){
    password = CryptoJS.SHA512(password).toString();

	$.ajax("/login", {
		data: JSON.stringify({sessionId: sessionId, username: username, password: password}),
		method: "POST",
		contentType: "application/json",
		success: function(response, textStatus, jqXHR) {			
			console.log(response);
			if(response.success) {
                user = new User();
                updateObj(user, response.object);
                loadedUsers[user.id] = user;
                user.password = password;
                sessionId = response.sessionId;
                socket.emit('allthenticate', {sessionId: sessionId});
                console.log(sessionId);

                document.getElementById('loginDiv').style.display = "none";
                document.getElementById('class').style.display = "inline-block";
            } else {
                alert(response.error);
                //Error
                //not finished
            }
		},
		error: function (jqXHR, textStatus, errorThrown) {
			console.log(jqXHR);
			console.log(textStatus);
			console.log(errorThrown);
		}		
	});
}


function getUser(userId){
    if(user != null){
        $.ajax("/getUser", {
            data: JSON.stringify({sessionId: sessionId, userId: userId}),
            method: "POST",
            contentType: "application/json",
            success: function(response, textStatus, jqXHR) {			
                console.log(response);
                if(response.success) {
                    let newUser = new User();
                    updateObj(newUser, response.object);
                    loadedUsers[userId] = newUser;
                }
                else {
                    alert(response.error);
                    //Error
                    //not finished
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR);
                console.log(textStatus);
                console.log(errorThrown);
            }		
        });
    }else{
        alert("You must login/register.");
    }
}


//functions for comunication with sockets
function getRoom(roomId){
    if(user != null){
        socket.emit('getRoom', {sessionId: sessionId, roomId: roomId});
    }else{
        alert("You must login/register.");
    }
}

function getMessage(messageId){
    if(user != null){
        socket.emit('getMessage', {sessionId: sessionId, messageId: messageId});
    }else{
        alert("You must login/register.");
    }
}

function createRoom(memberIds){
    if(user != null){
        socket.emit('createRoom', {sessionId: sessionId, memberIds: memberIds});
    }else{
        alert("You must login/register.");
    }
}

function addMemberToRoom(memberId, roomId){
    if(user != null){
        socket.emit('addMemberToRoom', {sessionId: sessionId, memberId: memberId, roomId: roomId});
    }else{
        alert("You must login/register.");
    }
}

function removeMemberFromRoom(memberId, roomId){
    if(user != null){
        socket.emit('removeMemberFromRoom', {sessionId: sessionId, memberId: memberId, roomId: roomId});
    }else{
        alert("You must login/register.");
    }
}

function changeRoomName(roomId, newName){
    if(user != null){
        socket.emit('changeRoomName', {sessionId: sessionId, roomId: roomId, newName: newName});
    }else{
        alert("You must login/register.");
    }
}

function newMessage(messageContent, roomId){
    if(user != null){
        socket.emit('newMessage', {sessionId: sessionId, messageContent: messageContent, roomId: roomId});
    }else{
        alert("You must login/register.");
    }
}

function removeMessage(messageId){
    if(user != null){
        socket.emit('removeMessage', {sessionId: sessionId, messageId: messageId, roomId: roomId});
    }else{
        alert("You must login/register.");
    }
}

function editMessage(messageId, newMessage){
    if(user != null){
        socket.emit('editMessage', {sessionId: sessionId, messageId: messageId, roomId: roomId, newMessage: newMessage});
    }else{
        alert("You must login/register.");
    }
}

function changeMyUsername(newUsername){
    if(user != null){
        socket.emit('changeUsername', {sessionId: sessionId, newUsername: newUsername});
    }else{
        alert("You must login/register.");
    }
}

function changeMyPassword(oldPassword, newUsername){
    if(user != null){
        socket.emit('changePassword', {sessionId: sessionId, oldPassword: oldPassword, newUsername: newUsername});
    }else{
        alert("You must login/register.");
    }
}

function changeMyInfo(infoParameter, newInfo){
    if(user != null){
        socket.emit('changeInfo', {sessionId: sessionId, infoParameter: infoParameter, newInfo: newInfo});
    }else{
        alert("You must login/register.");
    }
}

function changeVisability(newVisability){
    if(user != null){
        if(newVisability = false){
            socket.emit('becomeInvisible', {sessionId: sessionId});
        }else{
            socket.emit('becomeVisible', {sessionId: sessionId});
        }
    }else{
        alert("You must login/register.");
    }
}

function requestVisivblePlayers(){
    if(user != null){
        socket.emit('getVisiblePlayers', {sessionId: sessionId});
    }else{
        alert("You must login/register.");
    }
}



//listen with sockets for server
socket.on('error', (msg) => {
    let response = JSON.parse(msg);

    console.error(response);
});


socket.on('receivedRoom', (msg) => {
    let response = JSON.parse(msg);

    let newRoom = new Room();
    updateObj(newRoom, response.object);
    loadedRooms[newRoom.id] = newRoom;

    lastAddedRoomId = newRoom.id;

    if(playerToAddToRoom != null){
        addMemberToRoom(playerToAddToRoom, lastAddedRoomId);
        playerToAddToRoom = null;
    }

    roomDisplayCreator(newRoom.id);
});

socket.on('receivedMessage', (msg) => {
    let response = JSON.parse(msg);

    let newMessage = new Message();
    updateObj(newMessage, response);
    loadedMessages[newMessage.id] = newMessage;
    if(!loadedRooms[newMessage.roomId]){
        getRoom(newMessage.roomId);
    }else{
        loadedRooms[newMessage.roomId].messageIds[loadedRooms[newMessage.roomId].brMessages] = newMessage.id;
        loadedRooms[newMessage.roomId].brMessages++;
    }
    displayMessage(newMessage.id);
});

socket.on('addedMemberToRoom', (msg) => {
    let response = JSON.parse(msg);

    if(!loadedRooms[response.roomId]){
        getRoom(roomId);
    }else{
        loadedRooms[response.roomId].memberIds[loadedRooms[response.roomId].brMembers] = response.userId;
        loadedRooms[response.roomId].brMembers++;
    }

});

socket.on('removedMemberFromRoom', (msg) => {
    let response = JSON.parse(msg);
    let userId = response.userId;
    let roomId = response.roomId;

    if(!loadedRooms[roomId]){
        getRoom(roomId);
    }else{
        for(let i = 0; i < loadedRooms[roomId].brMembers; i++){
            if(loadedRooms[roomId].memberIds[i] == userId){
                loadedRooms[roomId].memberIds[i] = loadedRooms[roomId].memberIds[loadedRooms[roomId].brMembers-1];
                loadedRooms[roomId].brMembers--;
            }
        }
    }
});

socket.on('changedRoomName', (msg) => {
    let response = JSON.parse(msg);
    let roomId = response.roomId;
    let newName = response.newName;

    if(!loadedRooms[roomId]){
        getRoom(roomId);
    }else{
        loadedRooms[roomId].name = newName;
    }
});

socket.on('removedMessage', (msg) => {
    let response = JSON.parse(msg);
    let roomId = response.roomId;
    let messageId = response.messageId;

    if(!loadedRooms[roomId]){
        getRoom(roomId);
    }else{
        for(let i = 0; i < loadedRooms[roomId].brMessages; i++){
            if(loadedRooms[roomId].messageIds[i] == messageId){
                loadedRooms[roomId].messageIds[i] = loadedRooms[roomId].messageIds[loadedRooms[roomId].brMessages-1];
                loadedRooms[roomId].brMessages--;
            }
        }
        if(loadedMessages[messageId]){
            loadedMessages[messageId] = null;
        }
    }
});

socket.on('editedMessage', (msg) => {
    let response = JSON.parse(msg);
    let messageId = response.messageId;
    let newMessage = response.newMessage;

    if(loadedMessages[messageId]){
        loadedMessages[messageId].content = newMessage;
    }else{
        getMessage(messageId);
    }
});

socket.on('changedUsername', (msg) => {
    let response = JSON.parse(msg);

    user.username = response.newusername;
});

socket.on('changedPassword', (msg) => {
    let response = JSON.parse(msg);

    alert(response.message);
});

socket.on('changedInfo', (msg) => {
    let response = JSON.parse(msg);

    if(user.info){
        user.info[response.infoParameter] = response.newInfo;
    }else{
        getUserInfo(user.id);
    }
});  

socket.on('youBecameVisible', (msg) => {
    let response = JSON.parse(msg);

    document.getElementById('playerSearchDiv').querySelector('changeVisabilityButton').innerText = "Your status: Visible";
    amIVisible = true;
});

socket.on('becomeInvisible', (msg) => {
    let response = JSON.parse(msg);

    document.getElementById('playerSearchDiv').querySelector('changeVisabilityButton').innerText = "Your status: Invisible";
    amIVisible = false;
});

socket.on('receivedVisablePlayers', (msg) => {
    let response = JSON.parse(msg);

    searchingPlayersIds = response.visible;
});



//function for the buttons

function loginButton(){
    let username = document.getElementById('loginDiv').querySelectorAll('input')[0].value;
    let password = document.getElementById('loginDiv').querySelectorAll('input')[1].value;

    login(username, password);
}

function registerButton(){
    let username = document.getElementById('registerDiv').querySelectorAll('input')[0].value;
    let password = document.getElementById('registerDiv').querySelectorAll('input')[1].value;

    register(username, password);
}

function switchLoginRegister(){
    if(document.getElementById('loginDiv').style.display == "none"){
        document.getElementById('loginDiv').style.display = "inline-block";
        document.getElementById('registerDiv').style.display = "none";
    }else{
        document.getElementById('loginDiv').style.display = "none";
        document.getElementById('registerDiv').style.display = "inline-block";
    }

    document.getElementById('registerDiv').querySelectorAll('input')[0].value = "";
    document.getElementById('registerDiv').querySelectorAll('input')[1].value = "";
    document.getElementById('loginDiv').querySelectorAll('input')[0].value = "";
    document.getElementById('loginDiv').querySelectorAll('input')[1].value = "";
}

function displayMessage(messageId){
    if(user == null){
        alert('You must login/register.');
        return 0;
    }

    if(loadedMessages[messageId] == null){
        getMessage(messageId);
    }

    let theMessage = loadedMessages[messageId];
    let theMessageDiv = document.getElementById('mainDiv').querySelector('message_copy').cloneNode(true);
    theMessageDiv.setAttribute("id", messageId);
    if(theMessage.sentById == user.id){
        theMessageDiv.setAttribute("class", "myMessage");
        theMessageDiv.innerText = theMessage.content;
    }else{
        theMessageDiv.setAttribute("class", "notMyMessage");
        theMessageDiv.innerText = theMessage.sendByName + ": " + theMessage.content;
    }
    theMessageDiv.style.display = "inline-block";

    if(theMessage.roomId != currRoomId){
        if(document.getElementById('mainDiv').querySelector(theMessage.roomId)){
            document.getElementById('mainDiv').querySelector(theMessage.roomId).appendChild(theMessageDiv);
        }
        if(document.getElementById('mainDiv').querySelector(theMessage.roomId+"_")){
            document.getElementById('mainDiv').querySelector(theMessage.roomId+"_").style.fontWeight = "700";
        }
    }
}

function roomDisplayF(roomId){
    if(user == null){
        alert('You must login/register.');
        return 0;
    }

    roomId = roomId.slice(0, -1);

    if(document.getElementById('mainDiv').querySelector('room_chat_storage').querySelector(currRoomId)){
        document.getElementById('mainDiv').querySelector('room_chat_storage').querySelector(currRoomId).style.display = "none";
    }
    currRoomId = roomId;

    if(document.getElementById('mainDiv').querySelector(roomId+"_")){
        document.getElementById('mainDiv').querySelector(roomId+"_").style.fontWeight = "200";
    }

    if(loadedRooms[roomId] == null){
        getRoom(roomId);

        let theRoomDiv = document.getElementById('mainDiv').querySelector('room_chat_copy').cloneNode(true);
        theRoomDiv.setAttribute("id", roomId);
        theRoomDiv.style.display = "inline-block";
        document.getElementById('mainDiv').querySelector('room_chat_storage').appendChild(theRoomDiv);

        for(let i = 0; i < currRoom.brMessages; i++){
            if(loadedMessages[currRoom.messageIds[i]] == null){
                getMessage(currRoom.messageIds[i]);
            }

            displayMessage(currRoom.messageIds[i]);
        }
    }else{
        document.getElementById('mainDiv').querySelector('room_chat_storage').querySelector(currRoomId).style.display = "inline-block";
    }
}

function roomDisplayCreator(roomId){
    if(user == null){
        alert('You must login/register.');
        return 0;
    }

    let theRoomDisplayerDiv = document.getElementById('mainDiv').querySelector('room_display_copy').cloneNode(true);
    theRoomDisplayerDiv.innerText = roomId;
    theRoomDisplayerDiv.style.fontWeight = "700";
    theRoomDisplayerDiv.style.display = "inline-block";
    document.getElementById('mainDiv').querySelector('roomDisplayHolder').appendChild(theRoomDisplayerDiv);   
}

function changeBetwenMainAndPlayerSearchDiv(){
    if(user == null){
        alert('You must login/register.');
        return 0;
    }

    if(document.getElementById('mainDiv').style.display == "none"){
        document.getElementById('mainDiv').style.display = "inline-block";
        document.getElementById('playerSearchDiv').style.display = "none";
    }else{
        document.getElementById('mainDiv').style.display = "none";
        document.getElementById('playerSearchDiv').style.display = "inline-block";
    }
}

function cloneSearchingPlayer(userId){
    if(user == null){
        alert('You must login/register.');
        return 0;
    }

    if(user.id = userId){
        return 0;
    }

    if(loadedUsers[userId] == null){
        getUser(userId);
    }

    let playerSearchCopy = document.getElementById('playerSearchDiv').querySelector(searching_player_copy).cloneNode(true);
    playerSearchCopy.id = '';
    playerSearchCopy.querySelector('playerSearchText').innerText = loadedUsers[userId].username;
    playerSearchCopy.querySelector('playerSearchButton').id = loadedUsers[userId].id;
    document.getElementById('playerSearchDiv').querySelector('playerSearchContainer').appendChild(playerSearchCopy);
}

function refreshPlayerSearch(){
    if(user == null){
        alert('You must login/register.');
        return 0;
    }

    document.getElementById('playerSearchDiv').innerHTML = "";

    //call function that gets searchin for a player

    for(let i = 0; i < searchingPlayersIds.length(); i++){
        if(searchingPlayersIds[i] != user.id){
            cloneSearchingPlayer(searchingPlayersIds[i]);
        }
    }
}

function startChatButton(userId){
    if(user == null){
        alert('You must login/register.');
        return 0;
    }

    createRoom();

    playerToAddToRoom = userId;
}

function changeVisabilityStatus(){
    if(user == null){
        alert('You must login/register.');
        return 0;
    }

    changeVisability(!amIVisible);
}