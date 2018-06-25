var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

var fs = require("fs");
var creds = "";

var redis = require("redis");
var client = "";
var port = process.env.PORT || 8080;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({
    extended: true
}));

http.listen(port, function() {

    console.log("Server on.  Listening on port " + port);
});

var chatters = [];
var chat_messages = [];

// Redis Config
client = redis.createClient(process.env.REDIS_URL);

client.on('error',function(err){ 
    console.error(err)
})

client.once("ready", function() {

    client.get("chat_users", function(err, reply) {

        if (reply) {
            chatters = JSON.parse(reply);
        }
    });

    client.get("chat_app_messages", function(err, reply) {

        if (reply) {
            chat_messages = JSON.parse(reply);
        }
    });

});



// fs.readFile("creds.json", "utf-8", function(err, data) {
//     if(err) throw err;
//     creds = JSON.parse(data);
//     client = redis.createClient(process.env.REDIS_URL);

//     client.on('error',function(err){ 
//         console.error(err)
//     })

//     client.once("ready", function() {

//         client.get("chat_users", function(err, reply) {

//             if (reply) {
//                 chatters = JSON.parse(reply);
//             }
//         });

//         client.get("chat_app_messages", function(err, reply) {

//             if (reply) {
//                 chat_messages = JSON.parse(reply);
//             }
//         });

//     });
// });

// JOIN CHAT
app.post("/join", function(req, res) {

    var username = req.body.username;
    if (chatters.indexOf(username) === -1) {
        chatters.push(username);

        client.set("chat_users", JSON.stringify(chatters));
        res.send({
            "chatters": chatters,
            "status": "OK"
        });
    } else {

        res.send({
            "status": "FAILED"
        });
    }
});

// LEAVE CHAT
app.post("/leave", function(req, res) {

    var username = req.body.username;
    chatters.splice(chatters.indexOf(username), 1);
    client.set("chat_users", JSON.stringify(chatters));
    res.send({
        "status": "OK"
    })
});

// SEND + STORE MESSAGE
app.post("/send_message", function(req, res) {

    var username = req.body.username;
    var message = req.body.message;
    chat_messages.push({
        "sender": "username",
        "message": message
    });

    client.set("chat_app_messages", JSON.stringify(chat_messages));

    res.send({
        "status": "OK"
    });
});

// GET MESSAGES
app.get("/get_messages", function(req, res) {

    res.send(chat_messages);
});

// GET ALL MESSAGES
app.get("/get_chatters", function(req, res) {

    res.send(chatters);
});

// SOCKET.IO CONNECTION
io.on("connection", function(socket) {

    socket.on("message", function(data) {
        io.emit("send", data)
    });

    socket.on("update_chatter_count", function(data) {
        io.emit("count_chatters", data);
    });

})

