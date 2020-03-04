$(document).ready(function(){
    var socket = io(); //Initialize client
    
    //on form submitted or button clicked event handler
    $('form').submit(function(e){
        e.preventDefault(); //Prevents page reloading
        let message =  $('#m').val();
        if (message.startsWith("/nickcolor")) {
            socket.emit('nickcolor', message.split(' ')[1]); //Send message to server by sending the message as an event.
        } else if (message !== ""){
            socket.emit('chat message', message); //Send message to server by sending the message as an event.
        }
        $('#m').val(''); //Clear message box
        return false;
    });
    
    //'chat message' event listener.
    socket.on('chat message', function(msg){
        $('#messages').append($('<li>').html(msg)); //Append a new message
    });
    
    socket.on('online users', function(msg) {
        $('#online-users').append().html(msg);
    });
});