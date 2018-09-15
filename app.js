var express = require('express');
var socket = require('socket.io');

var port = process.env.PORT || 8080;

var app = express();
var server = app.listen(port, function() {
});

app.use(express.static('client'));
app.get('/', function(req, res) {
    res.sendFile(__dirname + "client/index.html");
});

var io = socket(server);

var players = {};
var names = {};
var flags = {};
var redscore = 0;
var bluescore = 0;
var minutes = 15;
var seconds = 0;

function flag(team, x, y) {
    this.team = team;
    this.x = x;
    this.y = y;
    this.id = Math.random();
    this.taken = false;
    var checked = false;
    while (!checked) {
        checked = true;
        this.id = Math.random();
        for (var i in flags) {
            if (this.id == flags[i].id) {
                checked = false;
            }
        }
    }
    flags[this.id] = this;
    this.flagCheck = function() {
        if (this.y >= 990 && this.team == "red" || this.y <= 1000 && this.team == "blue") {
            if (this.team == "blue") {
                redscore++;
            } else {
                bluescore++;
            }
            io.emit("scores", {red: redscore, blue: bluescore});
            this.newPos();
        }
    }
    this.newPos = function() {
        if (this.team == "blue") {
            this.x = Math.floor(Math.random() * 1990);
            this.y = Math.floor(Math.random() * 490) + 1500;
        } else {
            this.y = Math.floor(Math.random() * 490);
            this.x = Math.floor(Math.random() * 1990);
        }
    }
}

var redone = new flag("red", 0, 0);
redone.newPos();
var redtwo = new flag("red", 0, 0);
redtwo.newPos();
var redthree = new flag("red", 0, 0);
redthree.newPos();

var blueone = new flag("blue", 0, 0);
blueone.newPos();
var bluetwo = new flag("blue", 0, 0);
bluetwo.newPos();
var bluethree = new flag("blue", 0, 0);
bluethree.newPos();

io.on('connection', function(socket) {
    var nameList = [];
    for (var i in names) {
        nameList.push(names[i]);
    }
    socket.emit('names', nameList);

    socket.on('start', function(data) {
        socket.emit('scores', {red: redscore, blue: bluescore});

        var checked = false;
        while (!checked) {
            checked = true;
            socket.id = Math.random();
            for (var i in players) {
                if (players[i].id == socket.id) {
                    checked = false;
                }
            }
        }
        players[socket.id] = socket;
        names[socket.id] = data.name;
        socket.dead = false;
        socket.holding = null;

        socket.idle = 0;
        socket.count = 0;
    
        var red = 0;
        var blue = 0;
        for (var i in players) {
            var p = players[i];
            if (p.team == "red") {
                red++;
            } else if (p.team == "blue") {
                blue++;
            }
        }
        if (red > blue) {
            socket.team = "blue";
        } else {
            socket.team = "red";
        }

        socket.name = data.name;

        socket.x = Math.floor(Math.random() * 1900);
        if (socket.team == "red") {
            socket.y = Math.floor(Math.random() * 948 + 1); 
        } else {
            socket.y = Math.floor(Math.random() * 948 + 1001);
        }

        socket.info = [];

        socket.upPress = false;
        socket.downPress = false;
        socket.leftPress = false;
        socket.rightPress = false;
        socket.speed = 8;
        socket.vel = {
            up: 0,
            down: 0,
            left: 0,
            right: 0,
        }

        socket.positionCheck = function() {
            if (socket.upPress) {
                socket.vel.up = socket.speed;
            } 
            if (socket.downPress) {
                socket.vel.down = socket.speed;
            } 
            if (socket.leftPress) {
                socket.vel.left = socket.speed;
            } 
            if (socket.rightPress) {
                socket.vel.right = socket.speed;
            }

            if (socket.vel.up > socket.vel.down) {
                socket.vel.up = socket.vel.up - socket.vel.down;
                socket.vel.down = 0;
            } else if (socket.vel.up < socket.vel.down) {
                socket.vel.down = socket.vel.down - socket.vel.up;
                socket.vel.up = 0;
            }
            if (socket.vel.left > socket.vel.right) {
                socket.vel.left = socket.vel.left - socket.vel.right;
                socket.vel.right = 0;
            } else if (socket.vel.left < socket.vel.right) {
                socket.vel.right = socket.vel.right - socket.vel.left;
                socket.vel.left = 0;
            }
        }

        socket.positionChange = function() {
            socket.y += socket.vel.down - socket.vel.up;
            socket.x += socket.vel.right - socket.vel.left;
            socket.vel.up *= 0.93;
            socket.vel.down *= 0.93;
            socket.vel.left *= 0.93;
            socket.vel.right *= 0.93;
        }

        socket.collision = function() {
            for (var i in players) {
                var p = players[i];
                var s = socket;

                if (p.id != s.id) {
                    var changex = (s.x + 15) - (p.x + 15);
                    var changey = (s.y + 15) - (p.y + 15);
                    if (changex**2 + changey**2 <= 60**2 && !p.dead) {
                        if (socket.y > 950 && socket.team == "red" && p.team != s.team || socket.y < 1000 && socket.team == "blue" && p.team != s.team) {
                            socket.dead = true;
                            if (socket.holding != null) {
                                socket.holding.newPos();
                            }
                            socket.emit("collided");
                        }
                    }
                }

                if (p.x <= 25) {
                    p.vel.left = 0;
                }
                if (p.x >= 1950) {
                    p.vel.right = 0;
                }
                if (p.y <= 25) {
                    p.vel.up = 0;
                }
                if (p.y >= 1950) {
                    p.vel.down = 0;
                }
            }

            var holds = false;
            for (var i in flags) {
                var s = socket;
                var f = flags[i];

                if (f.team != s.team) {
                    var changex = (s.x + 15) - (f.x + 5);
                    var changey = (s.y + 15) - (f.y + 5);
                    if (changex**2 + changey**2 <= 40**2 && !p.dead) {
                        if (p.holding == f || p.holding == null) {
                            holds = true;
                            s.holding = f;
                            f.x = s.x + 10;
                            f.y = s.y + 10;
                        }
                    }
                }
            }
            if (!holds) {
                s.holding = null;
            }
        }

        socket.emit('player', {
            name: socket.name,
            x: socket.x,
            y: socket.y,
            team: socket.team,
        });

        socket.on('disconnect', function() {
            delete players[socket.id];
            delete names[socket.id];
        });

        socket.on('keyPress', function(data) {
            socket.idle = 0;
            if (data.key == "up") {
                socket.upPress = data.down;
            } else if (data.key == "down") {
                socket.downPress = data.down;
            } else if (data.key == "left") {
                socket.leftPress = data.down;
            } else if (data.key == "right") {
                socket.rightPress = data.down;
            }
        });
    });
});

setInterval(function() {
    var flagInfo = [];
    for (var i in flags) {
        flags[i].flagCheck();
        flagInfo.push({
            team: flags[i].team,
            x: flags[i].x,
            y: flags[i].y,
        })
    }
    for (var i in players) {
        players[i].emit('flags', flagInfo);
    }
    for (var i in players) {
        var p = players[i];
        p.info = [];
        p.positionCheck();
        p.collision();
        p.positionChange();
        p.info.push({
            x: p.x,
            y: p.y,
            name: p.name,
            team: p.team,
            dead: p.dead,
        });
        for (var o in players) {
            if (players[o] != p) {
                p.info.push({
                    x: players[o].x,
                    y: players[o].y,
                    name: players[o].name,
                    team: players[o].team,
                    dead: players[o].dead,
                });
            }
        }
        p.emit('players', p.info);
        p.count++;
        if (p.count == 24) {
            p.count = 0;
            p.idle++;
            if (p.idle >= 60) {
                p.emit('idle');
            }
        }
    }
}, 1000/24);

setInterval(function() {
    if (seconds == 0) {
        if (minutes != 0) {
            seconds = 60;
        }
        minutes--;
    }
    seconds--;
    io.emit("timer", {
        minutes: minutes,
        seconds: seconds,
    });

    if (minutes == 0 && seconds == 0) {
        minutes = 15;
        redscore = 0;
        bluescore = 0;
        io.emit("scores", {red: redscore, blue: bluescore});
    }
}, 1000);