//classes that describe the rooms and users

class User{
    constructor(){
        this.id;
        this.username;
        this.urls = {}; //object that contains true or false dependig on weather the user wants to show these url results (client side can filter urls) | url is equal to true or false
    }
}
exports.User = User;

class Log{
    constructor(){
        this.id;
        this.url;
        this.date;
        this.time;
        this.status;
    }
}
exports.Log = Log;

class dbReturn{
    constructor(){
        this.success; //boolean if the database operation was a success
        this.error; //this is a string that shows the client what he did wrong
        this.object; //a class of the wanted information (User, Message/s, Room)
    }
}
exports.dbReturn = dbReturn;