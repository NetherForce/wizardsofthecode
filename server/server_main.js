let express = require("express");
let app = express();
let fs = require('fs');

let info = fs.readFileSync("info.json");
info = JSON.parse(info).user;

const nodemailer = require("nodemailer");

let transporter = nodemailer.createTransport({
    host: "https://wizardsofthecode.online",
    port: 80,
    secure: false, // true for 465, false for other ports
    auth: {
        user: info.email, // email
        pass: info.email_password, // password
    },
});

var pgp = require('pg-promise')(/* options */);
var db = pgp(info);
let session = require('express-session');

// Certificate
//const privateKey = fs.readFileSync('/etc/letsencrypt/live/wizardsofthecode.online/privkey.pem', 'utf8');
//const certificate = fs.readFileSync('/etc/letsencrypt/live/wizardsofthecode.online/cert.pem', 'utf8');
//const ca = fs.readFileSync('/etc/letsencrypt/live/wizardsofthecode.online/chain.pem', 'utf8');

// const credentials = {
// 	key: privateKey,
// 	cert: certificate,
// 	ca: ca
// };

var http = require('http').createServer(app);
//var https = require('https').createServer(credentials, app);

var io = require('socket.io')(http);
//var ioS = require('socket.io')(https);

let aws_crypto = require('@aws-crypto/client-node');
let CryptoJS = require('crypto-js');

exports.express = express;
exports.app = app;

exports.transporter = transporter;
exports.email = info.email;

exports.pgp = pgp;
exports.db = db;

exports.http = http;
//exports.https = https;

exports.session = session;
exports.io = io;
//exports.ioS = ioS;
exports.aws_crypto = aws_crypto;
exports.CryptoJS = CryptoJS;