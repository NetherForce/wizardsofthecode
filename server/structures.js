//classes that describe the rooms and users

class User{
    constructor(){
        this.id;
        this.username;
        this.urls = {}; // and object that contains the urls that the user tracks
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