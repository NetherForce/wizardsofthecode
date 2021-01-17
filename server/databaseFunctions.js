const {app, express, pgp, db, aws_crypto, CryptoJS} = require("./server_main.js");

//get the structures
let structures = require("./structures.js");

//function for comunication between server and data base

function validateEmail(email) {
    var re = /\S+@\S+.\S+/;
    return re.test(email);
}


async function verifyToken(userId, token){
    //creates a token for user

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

    return returnV;
}
exports.verifyToken = verifyToken;


async function newUser(username, email, password, token){
    //Creates a new User
    let returnV = new structures.dbReturn()
    let user = new structures.User();
    let date = new Date()
    let id

    try {
        //Checks if the username is taken
        if((await db.any('Select username FROM \"user\" WHERE username = $1', [username])).length>0){
            returnV.success = false
            returnV.error = "There is already an account with that username"
            console.log("There is already an account with that username")
        //Checks if the email is taken
        }else if((await db.any('Select email FROM \"user\" WHERE email = $1', [email])).length>0){
            returnV.success = false
            returnV.error = "There is already an account with that email"
            console.log("There is already an account with that email")
        //Adds information about the user into the database
        }else {
            var rows = await db.any("INSERT INTO \"user\" (id, username, password, email, is_verified) VALUES (nextval('ids'), $1, $2, $3, false) RETURNING id", [username,password, email])
            await db.any("INSERT INTO token (token, user_id, creation_date ) VALUES ($1, $2, $3)", [id, token, date])
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
    
    return returnV; //use loadUserInfo(userId).object to get userInfo
}
exports.loadUserInfo = loadUserInfo;


async function login(username_email, password){
    let returnV = new structures.dbReturn()
    let id
    let last_login = new Date();
    let login_count
    var rows
    let token

    try {
        //Checks whether an email has been entered
        if(validateEmail(username_email) == true){
            rows = await db.any('Select id, email, password, is_verified FROM \"user\" WHERE email = $1 AND password = $2', [username_email, password])
            id = rows[0].id
            token = await db.any('Select user_id FROM token WHERE user_id = $1', [id])
            if(rows.length > 0){ //Checks if the email and password are correct
                if(rows[0].is_verified){ //Checks if the user is verified in the database
                    var login_count_rows
                    login_count_rows = await db.any('Select login_count FROM user_info WHERE id = $1', [id])
                    login_count = login_count_rows[0].login_count + 1
                    await db.any('UPDATE user_info SET last_login = $1, login_count=$2 WHERE id = $3', [last_login, login_count, id])
                    loadUser(id)
                    .then(function(result){
                        returnV.success = true
                        returnV.object = result.object
                    })
                }else if(token.length > 0){ //Checks if a token has been created for the user
                    returnV.success = false
                    returnV.error = "Verify email"
                }else{ //Creates a token for the user
                    var generateToken = function() { // generates a verification token
                        return Math.random().toString(36).substr(2); // remove 0.
                    }
                    let newToken = generateToken()
                    verifyToken(id, newToken)
                    returnV.success = false
                    returnV.object = { 'id': id, 'token': newToken }
                }
            }else{
                returnV.success = false
                returnV.object = "Invalid login credentials"
                console.log("Invalid login credentials")
            }
        //Checks whether a username has been entered
        }else{
            rows = await db.any('Select id, username, password, is_verified FROM \"user\" WHERE username = $1 AND password = $2', [username_email, password])
            id = rows[0].id
            token = await db.any('Select user_id FROM token WHERE user_id = $1', [id])
            if(rows.length > 0){ //Checks if the username and password are correct
                if(rows[0].is_verified){ //Checks if the user is verified in the database
                    var login_count_rows
                    login_count_rows = await db.any('Select login_count FROM user_info WHERE id = $1', [id])
                    login_count = login_count_rows[0].login_count + 1
                    await db.any('UPDATE user_info SET last_login = $1, login_count=$2 WHERE id = $3', [last_login, login_count, id])
                    loadUser(id)
                    .then(function(result){
                        returnV.success = true
                        returnV.object = result.object
                    })
                }else if(token.length > 0){ //Checks if a token has been created for the user
                    returnV.success = false
                    returnV.error = "Verify email"
                }else{ //Creates a token for the user
                    var generateToken = function() { // generates a verification token
                        return Math.random().toString(36).substr(2); // remove 0.
                    }
                    let newToken = generateToken()
                    verifyToken(id, newToken)
                    returnV.success = false
                    returnV.object = { 'id': id, 'token': newToken }
                }
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


async function verifyUser(token, userId){
    //verifies user

    let returnV = new structures.dbReturn()
    try {
        var rows = await db.any('Select token, user_id FROM token WHERE token = $1 AND user_id = $2', [token, userId])
        if(rows.length > 0){
            await db.any('UPDATE \"user\" SET is_verified = true WHERE id = $1', [userId])
        }
        returnV.success = true
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
        console.log(error)
    }

    return returnV;
}
exports.verifyUser = verifyUser;


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

async function removeUrlFromUser(userId, url){
    //removes url to user


    let returnV = new structures.dbReturn()

    try {
        await db.any("DELETE FROM urls WHERE user_id = $1 AND url = $2", [userId, url])
        returnV.success = true
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
        console.log(error)
    }
    
    return returnV;
}
exports.removeUrlFromUser = removeUrlFromUser;


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
getLog()


async function getLogs(url, numberOfLogs, offset){
    //returns latest logs (count of logs is equal to numberOfLogs) and skips the first few (depending on the offset)

    let returnV = new structures.dbReturn()
    let log = new structures.Log();
    try {
        var rows = await db.any('SELECT * FROM log WHERE url = $1 ORDER BY date LIMIT $2 OFFSET $3', [url, numberOfLogs, offset])
        log = rows[0]
        returnV.success = true
        returnV.object = rows
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
        console.log(error)
    }

    return returnV;
}
exports.getLogs = getLogs;


function subtractDates(date1, date2){ 
    // returns the difference in time between the dates in miliseconds
    return Math.abs(date1 - date2);
}
exports.subtractDates = subtractDates;


async function checkTokens(){
    //verifies user

    let returnV = new structures.dbReturn()
    let date = new Date()
    try {
        var rows = await db.any('SELECT creation_date FROM token')
        for(var i = 0; i < rows.length; i++){
            await db.any("DELETE FROM token WHERE creation_date + time '00:30' < $1", [date])
        }
        returnV.success = true
    } 
    catch (error) {
        returnV.success = false
        returnV.error = error
    }

    return returnV;
}
exports.checkTokens = checkTokens;


function callCheckTokens(){ // calls the function checkTokens every few seconds
    checkTokens();
    setTimeout(callCheckTokens, 30*60*1000);
}
exports.callCheckTokens = callCheckTokens;
callCheckTokens()


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