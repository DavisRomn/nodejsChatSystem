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
	// Declare User Object
	let user = {};
	// Declare cookie object
	let incomingCookie = {};

	// Attempt to grab the incoming cookie.
	try {
		incomingCookie = cookie.parse(socket.request.headers.cookie);
	} catch(e) {
		// Catch the error that occurs if the connection does not yet have a cookie set
	}

	// If the cookie has a nickname set
	if (incomingCookie.nickname !== undefined) {
		// Check if the nickname can be found in the list of online users
		let checkUsersForName = users.filter(x => x.username === incomingCookie.nickname);
		// If the nickname wasn't found
		if (checkUsersForName.length === 0) {
			// Add the user to the list of online users with the nickname from its cookie
			user = {
				username: incomingCookie.nickname,
				username_colour: "#ffffff",
			}
		} else {
			// Add the user to the list of online users with a generated username
			user = {
				username: "User " + userCount,
				username_colour: "#ffffff",
			}
			userCount++;
		}
	} else {
		// Add the user to the list of online users with a generated username
		user = {
			username: "User " + userCount,
			username_colour: "#ffffff",
		}
		userCount++;
	}

	// Add the new user to the list of users
	users.push(user);
	
	// Send the username back to the client to be shown on screen
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
		// Get the current Date
		let currentDate = new Date();
		// Get the current hour
		let hour = (currentDate.getHours() < 10 ? "0" + currentDate.getHours() : currentDate.getHours());
		// Get the current minute
		let minute = (currentDate.getMinutes() < 10 ? "0" + currentDate.getMinutes() : currentDate.getMinutes());
		// Get the current second
		let second = (currentDate.getSeconds() < 10 ? "0" + currentDate.getSeconds() : currentDate.getSeconds());
		// Get the current Time
		let currentTime = "[" + hour + ":" + minute + ":" + second + "]";
		// Generate a formatted message to send to other clients
		let message = "<p class='message' style='font-weight: normal'><a class='time' style='color: black'>" + currentTime + "</a> <a class='username' style='color: " + user.username_colour + "'>" + user.username + "</a>: " + msg + "</p>";
		// Update the formatted message to send back to the sender
		let personalMessage = message.split("style='font-weight: normal'").join("style='font-weight: bold'");
		
		// Add the formatted message to the cache
		AddMessageToCache(message);
		
		// Send the message to all connections except the sender
		socket.broadcast.emit('chat message', message);
		// Send the formatted personal message to the sender
		socket.emit('chat message', personalMessage); 
	});
	
	// Listener for 'nickcolor' event
	socket.on('nickcolor', function(msg) {
		console.log("Changing " + user.username + " nickname color to: " + msg + "...");
		// Get the index value for the sender within the array of online users
		let index = users.map(function(e) { return e.username; }).indexOf(user.username);
		// Set the connection user object, and the arrays object nickname_colour to the new colour
		user.username_colour = "#" + msg;
		users[index].username_colour = "#" + msg;
		// Send a personal message to the sender confirming the colour has been changed
		socket.emit('chat message', "Your nickname colour has been successfully changed."); 
		
		// Get a formatted list of users to update all clients
		let formattedUsers = GetListOfUsers();
		// Update all clients with the updated list of users
		io.emit('online users', formattedUsers);
	});
	
	// Listener for 'nickname' event
	socket.on('nickname', function(msg) {
		console.log("Changing " + user.username + " nickname to: " + msg + "...");
		// Trim the msg to remove leading spaces
		let nick = msg.trim();
		// Get a list of all users with the nickname that is wanted
		let checkUsersForName = users.filter(x => x.username === nick);
		// If no other user has the nickname
		if (checkUsersForName.length === 0) {
			// Get the index for the sender within the array of online users
			let index = users.map(function(e) { return e.username; }).indexOf(user.username);
			// Update the username
			user.username = nick;
			users[index].username = nick;

			// Send the new username and a 'success' message to the sender
			socket.emit('chat message', "Your nickname has been successfully changed."); 
			socket.emit('username', user.username);

			// Update the list of online users for every connected client
			let formattedUsers = GetListOfUsers();
			io.emit('online users', formattedUsers);
		} else {
			// Send a message to the client requesting a different input
			socket.emit('chat message', "That nickname already exists, please try again..."); 
		}
	});
});

/**
 * Generates a formatted list of users to be sent to every client when a new connection or change has been made
 */
function GetListOfUsers() {
	// Declare the list
	let formattedlist = "";
	console.log("Updating user list...");
	// For every user in the array of online users
	for (let i = 0; i < users.length; i++) {
		// Append a formatted list item to the formattedList string
		formattedlist += "<li><p style='color: " + users[i].username_colour + "'>" + users[i].username + "</p></li>";
	}
	// return the formatted list
	return formattedlist;
};

/**
 * Adds the message to the cache of messages
 */
function AddMessageToCache(message) {
	// Add the message to the array of pastMessages
	pastMessages.push(message);
	// If the array now has more than 200 entries
	if (pastMessages.length > 200) {
		// Delete the first (oldest) item from the array
 		pastMessages.splice(0, 1);
	}
}

/**
 * 
 */
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