var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var cookie = require('cookie');

app.use(express.static(__dirname + '/public'));

// Cache containing users within the system
let users = [];
userCount = 0;

// Cache containing the past 200 messages
let pastMessages = [];

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

//Scoket connection listener
io.on('connection', function(socket){
	let user = {};
	let incomingCookie = {};

	try {
		incomingCookie = cookie.parse(socket.request.headers.cookie);
	} catch(e) {
		console.log(e);
	}

	if (incomingCookie.nickname !== undefined) {
		let checkUsersForName = users.filter(x => x.username === incomingCookie.nickname);
		if (checkUsersForName.length === 0) {
			user = {
				username: incomingCookie.nickname,
				username_colour: "#ffffff",
			}
		} else {
			user = {
				username: "User " + userCount,
				username_colour: "#ffffff",
			}
			userCount++;
		}
	} else {
		user = {
			username: "User " + userCount,
			username_colour: "#ffffff",
		}
		userCount++;
	}

	// Add the new user to the list of users
	users.push(user);
	
	console.log("Connecting User: " + user.username);
	socket.emit('username', user.username);
	
	// Get all cached messages in a formatted manner
	let cachedMessages = GetFormattedPastMessages();
	// Send the cached messages to the new user
	socket.emit('cached messages', cachedMessages);
	
	// Get the new formatted list of users
	let formattedUsers = GetListOfUsers();
	// Send the new list of formatted users to all users
	io.emit('online users', formattedUsers); 
	
	//Socket disconnection listener
	socket.on('disconnect', function(){
		console.log("Disconnecting user: " + user.username);
		// Find the index of the user disconnecting
		let index = users.map(function(e) { return e.username; }).indexOf(user.username);
		// Remove them from the list of active users
		users.splice(index, 1);

		// Get the list of formatted users
		let formattedUsers = GetListOfUsers();
		// Broadcast the updated list of active users to all open connections
		io.emit('online users', formattedUsers);
	});
	
	//Listener for 'chat message' event
	socket.on('chat message', function(msg){
		let currentDate = new Date();
		let currentTime = currentDate.getHours() + ":" + (currentDate.getMinutes() < 10 ? "0" + currentDate.getMinutes() : currentDate.getMinutes());
		let message = "<p class='message' style='font-weight: normal'><a class='time' style='color: black'>" + currentTime + "</a> <a class='username' style='color: " + user.username_colour + "'>" + user.username + "</a>: " + msg + "</p>";
		let personalMessage = message.split("style='font-weight: normal'").join("style='font-weight: bold'");
		
		AddMessageToCache(message);
		
		socket.broadcast.emit('chat message', message); //Broadcast the message to other socket connections except the sender
		socket.emit('chat message', personalMessage); 
	});
	
	socket.on('nickcolor', function(msg) {
		console.log("Changing " + user.username + " nickname color to: " + msg + "...");
		let index = users.map(function(e) { return e.username; }).indexOf(user.username);
		user.username_colour = "#" + msg;
		users[index].username_colour = "#" + msg;
		socket.emit('chat message', "Your nickname colour has been successfully changed."); 
		
		let formattedUsers = GetListOfUsers();
		io.emit('online users', formattedUsers); //Broadcast the message to other socket connections
	});
	
	socket.on('nickname', function(msg) {
		console.log("Changing " + user.username + " nickname to: " + msg + "...");
		let checkUsersForName = users.filter(x => x.username === msg);
		if (checkUsersForName.length === 0) {
			let index = users.map(function(e) { return e.username; }).indexOf(user.username);
			user.username = msg;
			users[index].username = msg;

			socket.emit('chat message', "Your nickname has been successfully changed."); 
			socket.emit('username', user.username);

			let formattedUsers = GetListOfUsers();
			io.emit('online users', formattedUsers); //Broadcast the message to other socket connections
		} else {
			socket.emit('chat message', "That nickname already exists, please try again..."); 
		}
	});
});

function GetListOfUsers() {
	let formattedlist = "";
	console.log("Updating user list...");
	for (let i = 0; i < users.length; i++) {
		formattedlist += "<li><p style='color: " + users[i].username_colour + "'>" + users[i].username + "</p></li>";
	}
	return formattedlist;
};

function AddMessageToCache(message) {
	pastMessages.push(message);
	if (pastMessages.length > 200) {
		pastMessages.splice(0);
	}
}

function GetFormattedPastMessages() {
	let formattedMessage = "";
	for (let i = 0; i < pastMessages.length; i++) {
		formattedMessage += ("<li>" + pastMessages[i] + "</li>"); 
	}
	return formattedMessage;
}

http.listen(3000, function(){
	console.log('listening on *:3000');
});