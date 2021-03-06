//var socket = io.connect('https://wizardsofthecode.online:443/');
var socket = io('/');
//var socket = io();

function updateObj(obj1, obj2){
    //this function makes the values of obj1 equal to the values of onj2
    for (const [key, value] of Object.entries(obj2)) {
        obj1[key] = value;
    }
}


//classes that describe the rooms and users
class User{
    constructor(){
        this.id;
        this.username;
        this.urls = {}; //object that contains true or false dependig on weather the user wants to show these url results (client side can filter urls) | url is equal to true or false
    }
}

class Log{
    constructor(){
        this.id;
        this.url;
        this.date;
        this.status;
    }
}

var user; //the current logged user
var loadedLogs = {}; //an object that takes as key - Log id and as value - the Log object

var sessionId; //id of the seesion we connect to


//function that are called in the listening sockets
function onLogin() { //this function is called when you login
    //========== Nikifor

    //smenq ot login stranica na main menu
    PageSwap('LoginPage', 'Page2');
}

function onRegister(){ //this function is called when you register
    //========== Nikifor

    //smenq ot register stranica na wait for vertification
}

function onRecievedLog(logId){ //this function is called when a Log is received (Log is already loaded in loadedLogs)

    //dobawq kum spisuka s logove
    if(user != undefined){
        let newLog = loadedLogs[logId];
        let li = document.createElement("li");
        li.id = 'log' + newLog.id;
        li.innerText += 'id: ' + newLog.id;
        li.innerText += ' | url: ' + newLog.url;
        li.innerText += ' | date: ' + newLog.date;
        li.innerText += ' | time: ' + newLog.time;
        li.innerText += ' | status: ' + newLog.status;
        if (!user.urls[newLog.url]) {
            li.style.display = 'none';
        }
        document.getElementById('logListUl').appendChild(li);
    }
}

function objSize(obj) {
  var size = 0,
    key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
};

function updateLogList() {
    for (let i = 0; i < objSize(loadedLogs); i++) {
        for (key in loadedLogs) {
            if (user.urls.hasOwnProperty(loadedLogs[key].url)) {
                if (user.urls[loadedLogs[key].url]) {
                    document.getElementById('log'+loadedLogs[key].id).style.display = 'block';
                } else {
                    document.getElementById('log'+loadedLogs[key].id).style.display = 'none';
                }
            }
        }
    }
};
function loadURLs() {
    for (let i = 0; i < objSize(user.urls); i++) {
        for (key in user.urls) {
            if (user.urls.hasOwnProperty(key)) {
                
                //inserts a url into the list with urls
                let li = document.createElement("li");
                li.id = url;
                li.innerText = url;
                document.getElementById('urlListUl').appendChild(li);
                
                //inserts a url btn into the filter menu so that an url can be filtered out
                let btn = document.createElement('button');
                btn.id = 'btn' + url;
                btn.innerText = url;
                btn.onclick = function() {
                    if (user.urls[btn.innerText]) {
                        user.urls[btn.innerText] = false;
                        btn.backgroundColor = '#a1a1a1';
                    } else {
                        user.urls[btn.innerText] = true;
                        btn.backgroundColor = '#598bac';
                    }
                };
                document.getElementById('filterMenu').appendChild(btn);
            }
        }
    }
};
function onRecievedLogs(logIdsArr){ //this function is called when Logs are received
    //========== Nikifor
    
    //mi nz oshte ne sum go izmislil
}

function onReceivedURL(url){ //this function is called when an url is added to tracking list
    //========== Nikifor
    let li = document.createElement("li");
    li.id = url;
    li.innerText = url;
    document.getElementById('urlListUl').appendChild(li);
}

function onRemovedURL(url){ //this function is called when an url is removed from tracking list
    //========== Nikifor
    document.getElementById(url).style.display = 'none';
}


//functions for comunication with the server
function register(username, email, password){
    password = CryptoJS.SHA512(password).toString();

	$.ajax("/createUser", {
		data: JSON.stringify({sessionId: sessionId, username: username, email: email, password: password}),
		method: "POST",
		contentType: "application/json",
		success: function(response, textStatus, jqXHR) {			
			console.log(response);
			if(response.success) {
                user = new User();
                updateObj(user, response.object);
                sessionId = response.sessionId;
                console.log(sessionId);
        
                onRegister();
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

function login(username, password){ //username could be email
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
                sessionId = response.sessionId;
                socket.emit('allthenticate', JSON.stringify({sessionId: sessionId}));
                console.log(sessionId);

                onLogin();
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
                    loadURLs();
                }
                else {
                    console.error(response.error);
                    //Error
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
function getLog(logId){
    if(user != null){
        socket.emit('getLog', {sessionId: sessionId, logId: logId});
    }else{
        alert("You must login/register.");
    }
}

function getLogs(url, brLogs){ //returns brLogs Logs (ot as many as there are) + makes a new log for the current server state
    if(user != null){
        socket.emit('getLogs', JSON.stringify({sessionId: sessionId, url: url, brLogs: brLogs}));
    }else{
        alert("You must login/register.");
    }
}

function addUrl(url){ //adds url to the urls you want to track
    if(user != null){
        socket.emit('addUrl', JSON.stringify({sessionId: sessionId, url: url}));
    }else{
        alert("You must login/register.");
    }
}

function removeUrl(url){ //removes url from the urls you track
    if(user != null){
        socket.emit('removeUrl', JSON.stringify({sessionId: sessionId, url: url}));
    }else{
        alert("You must login/register.");
    }
}



//listen with sockets for server
socket.on('error', (msg) => {
    let response = JSON.parse(msg);

    console.error(response);
});

socket.on('receivedLog', (msg) => {
    let response = JSON.parse(msg);
    
    loadedLogs[response.id] = response;

    onRecievedLog(response.id);
});

socket.on('receivedLogs', (msg) => {
    let response = JSON.parse(msg);
    
    let idsArr = [];
    for(let i = 0; i < response.length(); i++){
        loadedLogs[response[i].id] = response[i];
        idsArr.push(response[i].id);
    }

    onRecievedLogs(idsArr);
});

socket.on('receivedUrl', (msg) => {
    let response = JSON.parse(msg);
    
    user.urls[response.url] = true;

    onReceivedURL(response.url);
});

socket.on('removedUrl', (msg) => {
    let response = JSON.parse(msg);
    
    user.urls[response.url] = undefined;

    onRemovedURL(response.url);
});