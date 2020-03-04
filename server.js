var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

let users = [];
userCount = 0;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

//Scoket connection listener
io.on('connection', function(socket){

  let user = {
    username: "User " + userCount,
    username_colour: "#ffffff",
  }

  users.push(user);
  let formattedUsers = GetListOfUsers();
  io.emit('online users', formattedUsers); //Broadcast the message to other socket connections

  // Increment the userCount
  userCount++;
  
  //Socket disconnection listener
  socket.on('disconnect', function(){
    // Find the index of the user disconnecting
    let index = users.map(function(e) { return e.username; }).indexOf(user.username);
    // Remove them from the list of active users
    users.splice(index);

    // Get the list of formatted users
    let formattedUsers = GetListOfUsers();
    // Broadcast the updated list of active users to all open connections
    io.emit('online users', formattedUsers);
  });
  
  //Listener for 'chat message' event
  socket.on('chat message', function(msg){
    let currentDate = new Date();
    let currentTime = currentDate.getHours() + ":" + (currentDate.getMinutes() < 10 ? "0" + currentDate.getMinutes() : currentDate.getMinutes());
    let message = "<p class='message' style='color: black'><a class='time'>" + currentTime + "</a> <a class='username' style='color: " + user.username_colour + "'>" + user.username + "</a>: " + msg + "</p>";
    let personalMessage = message.replace("style='color: black'", "style='color: white'");

    socket.broadcast.emit('chat message', message); //Broadcast the message to other socket connections except the sender
	  socket.emit('chat message', personalMessage); 
  });

  socket.on('nickcolor', function(msg) {
    let index = users.map(function(e) { return e.username; }).indexOf(user.username);
    user.username_colour = "#" + msg;
    users[index].username_colour = "#" + msg;
    socket.emit('chat message', "Your nickname colour has been successfully changed."); 

    let formattedUsers = GetListOfUsers();
    io.emit('online users', formattedUsers); //Broadcast the message to other socket connections
  });
  
});

function GetListOfUsers() {
  let formattedlist = "";
  for (let i = 0; i < users.length; i++) {
    formattedlist += "<li><p style='color: " + users[i].username_colour + "'>" + users[i].username + "</p></li>";
  }
  return formattedlist;
};

http.listen(3000, function(){
  console.log('listening on *:3000');
});