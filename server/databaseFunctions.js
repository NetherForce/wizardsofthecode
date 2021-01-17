const {app, express, pgp, db, aws_crypto, CryptoJS} = require("./server_main.js");

//get the structures
let structures = require("./structures.js");

//function for comunication between server and data base

async function newUser(username, email, password, token){
    let returnV = new structures.dbReturn()
    let user = new structures.User();
    let date = new Date()
    let id

    try {
        if((await db.any('Select username FROM \"user\" WHERE username = $1', [username])).length>0){
            returnV.success = false
            returnV.error = "There is already an account with that username"
            console.log("There is already an account with that username")
        }else if((await db.any('Select email FROM \"user\" WHERE email = $1', [email])).length>0){
            returnV.success = false
            returnV.error = "There is already an account with that email"
            console.log("There is already an account with that email")
        }else {
            var rows = await db.any("INSERT INTO \"user\" (id, username, password, email, is_verified) VALUES (nextval('ids'), $1, $2, $3, false) RETURNING id", [username,password, email])
            id = rows[0].id
            await db.any('INSERT INTO user_info (id, login_count, registration_date) VALUES($1, $2, $3)',  [id, '0', date])
            returnV.success = true
            user.username = username
            user.id = id
            returnV.object = user
        }
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
        console.log(error)
    }
    
    console.log(returnV)
    return returnV;
}
exports.newUser = newUser;


async function loadUser(userId){
    //userId - id of the user that you want to load (this function doesnt load the info of the user)
    let returnV = new structures.dbReturn()
    let user = new structures.User();

    try {
        var rows = await db.any('Select id, username, urls FROM \"user\" WHERE id = $1', [userId])
        user = rows[0]
        returnV.success = true
        returnV.object = user
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
        console.log(error)
    }
    
    return returnV; //use loadUser(userId).object to get user
}
exports.loadUser = loadUser;


async function loadEmail(userId){
    //userId - id of the user that you want to load (this function doesnt load the info of the user)
    let returnV = new structures.dbReturn()

    try {
        var rows = await db.any('Select email FROM \"user\" WHERE id = $1', [userId])
        let email = rows[0].email
        returnV.success = true
        returnV.object = email
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
        console.log(error)
    }
    
    console.log(returnV)
    return returnV; //use loadUser(userId).object to get user
}
exports.loadEmail = loadEmail;


async function loadUserInfo(userId){
    //userId - id of the user whose info we want to load
    let returnV = new structures.dbReturn()
    let userInfo = new structures.UserInfo();

    try {
        var rows = await db.any('Select * FROM user_info WHERE id = $1', [userId])
        userInfo = rows[0]
        returnV.success = true
        returnV.object = userInfo
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
        console.log(error)
    }
    
    console.log(returnV)
    return returnV; //use loadUserInfo(userId).object to get userInfo
}
exports.loadUserInfo = loadUserInfo;


function validateEmail(email) {
    var re = /\S+@\S+.\S+/;
    return re.test(email);
}


async function login(username_email, password){
    let returnV = new structures.dbReturn()
    let user = new structures.User()
    let id
    let last_login = new Date();
    let login_count
    var rows

    try {
        if(validateEmail(username_email) == true){
            rows = await db.any('Select id, email, password FROM \"user\" WHERE email = $1 AND password = $2', [username_email, password])
            if(rows.length>0){
                var login_count_rows
                returnV.success = true
                id = rows[0].id
                login_count_rows = await db.any('Select login_count FROM user_info WHERE id = $1', [id])
                login_count = login_count_rows[0].login_count + 1
                await db.any('UPDATE user_info SET last_login = $1, login_count=$2 WHERE id = $3', [last_login, login_count, id])
                loadUser(id)
                .then(function(result){
                    returnV.object = result.object
                    console.log(returnV)
                })
            }else{
                returnV.success = false
                returnV.object = "Invalid login credentials"
                console.log("Invalid login credentials")
            }
        }else{
            rows = await db.any('Select id, username, password FROM \"user\" WHERE username = $1 AND password = $2', [username_email, password])
            if(rows.length>0){
                var login_count_rows
                returnV.success = true
                id = rows[0].id
                login_count_rows = await db.any('Select login_count FROM user_info WHERE id = $1', [id])
                login_count = login_count_rows[0].login_count + 1
                await db.any('UPDATE user_info SET last_login = $1, login_count=$2 WHERE id = $3', [last_login, login_count, id])
                loadUser(id)
                .then(function(result){
                    returnV.object = result.object
                    console.log(returnV)
                })
            }else{
                returnV.success = false
                returnV.object = "Invalid login credentials"
                console.log("Invalid login credentials")
            }
        }
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
        console.log(error)
    }

    return returnV;
}
exports.login = login;

async function addUrlToUser(userId, url){
    //adds url to user

    let returnV = new structures.dbReturn()

    try {
        var rows = await db.any("INSERT INTO urls (user_id, url) VALUES ($1, $2)", [userId, url])
        returnV.success = true
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
        console.log(error)
    }
    
    return returnV;
}
exports.addUrlToUser = addUrlToUser;

async function createLog(url, status){
    //userId - id of the user whose creates the room
    //memberIds - list of ids of the members

    let returnV = new structures.dbReturn()
    let log = new structures.Log();
    let date = new Date()
    let id

    try {
        var rows = await db.any("INSERT INTO log (id, date, url, status) VALUES (nextval('log_ids'), $1, $2, $3) RETURNING id", [date, url, status])
        id = rows[0].id
        log.id = id
        log.date = date
        log.url = url
        log.status = status
        returnV.success = true
        returnV.object = log
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
        console.log(error)
    }
    
    return returnV;
}
exports.createLog = createLog;

async function getLog(logId){
    //returns Log from its id

    let returnV = new structures.dbReturn()
    let log = new structures.Log();
    try {
        var rows = await db.any('SELECT * FROM log WHERE id = $1', [logId])
        var id = rows[0].id
        log = rows[0]
        returnV.success = true
        returnV.object = log
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
        console.log(error)
    }

    return returnV;
}
exports.getLog = getLog;


async function getLogs(url, numberOfLogs){
    //roomId - id of the room that you want to load (This function doesnt load the messages or the members. Only their ids)

    let returnV = new structures.dbReturn()
    let log = new structures.Log();
    try {
        var rows = await db.any('SELECT id, name, user_id, last_updated, br_members FROM room WHERE id = $1', [roomId])
        var id = rows[0].id
        room.id = id
        returnV.success = true
        returnV.object = room
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
        console.log(error)
    }

    return returnV;
}
exports.getLogs = getLogs;

async function verifyToken(userId, token){
    //verifies user

    let returnV = new structures.dbReturn()
    let date = new Date()
    try {
        await db.any("INSERT INTO token (user_id, token, creation_date) VALUES ($1, $2, $3)", [userId, token, date])
        returnV.success = true
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
        console.log(error)
    }

    console.log(returnV)
    return returnV;
}
exports.verifyToken = verifyToken;


async function changeUsername(userId, newusername){
    //change the username of user

    let returnV = new structures.dbReturn()
    try {
        returnV.success = true
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
    }

    return returnV;
}
exports.changeUsername = changeUsername;


async function changePassword(userId, oldPassword, newPassword){
    //change the password of user

    let returnV = new structures.dbReturn()
    try {
        returnV.success = true
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
    }

    return returnV;
}
exports.changePassword = changePassword;


async function changeUserInfo(userId, infoParameter, newInfo){
    //change info parameter of user
    //infoParameter - the parameter we want to change (first name, last name, ect.) - a string

    let returnV = new structures.dbReturn()
    try {
        returnV.success = true
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
    }

    return returnV;
}
exports.changeUserInfo = changeUserInfo;