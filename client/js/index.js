var socket = io();
var player;
var redScore = 0;
var blueScore = 0;
var minutes = 0;
var seconds = 0;
var flags = [];

function signIn(user) {
    var profile = user.getBasicProfile();
    socket.emit("adminCheck", {username: profile.U3});
}

function logout() {
    gapi.auth2.getAuthInstance().disconnect();
    var item = document.getElementById('admintitle');
    if (item != null) {
        item.parentNode.removeChild(item);
    }
}

socket.on('adminResult', function(data) {
    if (data.result) {
        alert("Admin Acces Granted")
        var adminTitle = document.createElement('DIV');
        adminTitle.appendChild(document.createTextNode("Admin"));
        adminTitle.className = "admintitle";
        adminTitle.id = "admintitle";
        document.body.appendChild(adminTitle);
    } else {
        logout();
        alert("Admin Access Denied");
    }
});

var names;
socket.on('names', function(data) {
    names = data;
});

function object(name, team, x, y, w, h) {
    this.name = name;
    this.team = team;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.dead = false;
}

var draw = function(ctx, color, name, x, y, w, h) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x + w/2, y + h/2, 30, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = "bolder 30px Verdana";
    var width = ctx.measureText(name).width;
    ctx.fillStyle = "white";
    ctx.fillText(name, x - ((width - 30)/2), y - 20);
    ctx.closePath();
}

var drawFlag = function(ctx, color, x, y, w, h) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x + w/2, y + h/2, w, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();
}

function posx(x) {
    return ((window.innerWidth / 2 - 15) + (x - player.x));
}

function posy(y) {
    return ((window.innerHeight / 2 - 15) + (y - player.y));
}

socket.on('players', function(data) {
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    var mini = document.getElementById('mini');
    var mctx = mini.getContext('2d');
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    mctx.clearRect(0, 0, 80, 80);
    var scoreboard = document.getElementById('scoreboard');
    var sctx = scoreboard.getContext('2d');
    sctx.beginPath();
    sctx.fillStyle = "red";
    sctx.fillRect(0, 0, 200, 100);
    sctx.fillStyle = "white";
    sctx.font = "bolder 60px Verdana";
    sctx.fillText(redScore.toString(), 80, 70);
    sctx.fillStyle = "blue";
    sctx.fillRect(300, 0, 200, 100);
    sctx.fillStyle = "white";
    sctx.font = "bolder 60px Verdana";
    sctx.fillText(blueScore.toString(), 380, 70);
    sctx.fillStyle = "purple";
    sctx.fillRect(200, 25, 100, 50);
    sctx.fillStyle = "white";
    sctx.font = "bolder 30px Verdana";
    if (minutes >= 10) {
        if (seconds < 10) {
            sctx.fillText(minutes + ":" + "0" + seconds, 200, 60);
        } else {
            sctx.fillText(minutes + ":" + seconds, 200, 60);
        }
    } else {
        if (seconds < 10) {
            sctx.fillText("0" + minutes + ":" + "0" + seconds, 200, 60);
        } else {
            sctx.fillText("0" + minutes + ":" + seconds, 200, 60);
        }
    }
    for (var i = 0; i < data.length; i++) {
        if (data[i].name == player.name) {
            player.x = data[i].x;
            player.y = data[i].y;
            ctx.beginPath();
            ctx.fillStyle = 'lightgray';
            ctx.fillRect(posx(0), posy(0), 2000, 2000);
            ctx.fillStyle = "black";
            ctx.rect(posx(0), posy(0), 2000, 2000);
            ctx.stroke();
            ctx.closePath();
            ctx.beginPath();
            ctx.fillStyle = "red";
            ctx.globalAlpha = 0.5;
            ctx.fillRect(posx(0), posy(0), 2000, 1000);
            ctx.globalAlpha = 1;
            ctx.rect(posx(0), posy(0), 2000, 1000);
            ctx.stroke();
            ctx.fillStyle = "blue";
            ctx.globalAlpha = 0.5;
            ctx.fillRect(posx(0), posy(1000), 2000, 1000);
            ctx.globalAlpha = 1;
            ctx.rect(posx(0), posy(1000), 2000, 1000);
            ctx.stroke();
            ctx.fillStyle = "black";
            ctx.fillRect(posx(0), posy(998), 2000, 4);
            ctx.closePath();
            mctx.beginPath();
            mctx.fillStyle = player.team;
            mctx.arc(player.x / 25, player.y / 25, 3, 0, 2 * Math.PI);
            mctx.fill();
            mctx.closePath();
        } else {
            if (!data[i].dead) {
                draw(ctx, data[i].team, data[i].name, posx(data[i].x), posy(data[i].y), 30, 30);
            }
        }
    }
    if (!player.dead) {
        draw(ctx, player.team, player.name, window.innerWidth / 2 - 15, window.innerHeight / 2 - 15, 30, 30);
    }
    for (var i = 0; i < flags.length; i++) {
        drawFlag(ctx, flags[i].team, posx(flags[i].x), posy(flags[i].y), 10, 10);
    }
});

socket.on('player', function(data) {
    player = new object(data.name, data.team, data.x, data.y, 30, 30);
});

socket.on('collided', function() {
    if (!player.dead) {
        player.dead = true;
        dead();
    }
});

socket.on('scores', function(data) {
    redScore = data.red;
    blueScore = data.blue;
});

socket.on('flags', function(data) {
    flags = data;
});

socket.on('idle', function() {
    location.reload();
});

socket.on('timer', function(data) {
    minutes = data.minutes;
    seconds = data.seconds;
    if (minutes == 0 && seconds == 0) {
        if (redScore > blueScore) {
            document.getElementById("final").innerHTML = "Red Wins<br>" + redScore + " to " + blueScore;
        } else if (blueScore > redScore) {
            document.getElementById("final").innerHTML = "Blue Wins<br>" + blueScore + " to " + redScore;
        } else {
            document.getElementById("final").innerHTML = "It's a tie!";
        }
    
        setTimeout(function() {
            document.getElementById('final').innerHTML = "";
        }, 3000);
    }
});

function dead() {
    var opacity = 0;
    document.getElementById('cover').style.display = "block";
    var interval = setInterval(function() {
        opacity+=0.05;
        document.getElementById('cover').style.opacity = opacity;
        if (opacity >= 1) {
            clearInterval(interval);
            location.reload();
        }
    }, 1000/24);
}

function play(username) {
    socket.emit('start', {
        name: username,
    });
}

window.onkeydown = function(e) {
    idle = 0;
    if (e.keyCode == 38 || e.keyCode == 87) {
        socket.emit('keyPress', {key: "up", down: true});
    } else if (e.keyCode == 40 || e.keyCode == 83) {
        socket.emit('keyPress', {key: "down", down: true});
    } else if (e.keyCode == 37 || e.keyCode == 65) {
        socket.emit('keyPress', {key: "left", down: true});
    } else if (e.keyCode == 39 || e.keyCode == 68) {
        socket.emit('keyPress', {key: "right", down: true});
    }

    var input = document.getElementById('name').value;
    if (e.keyCode == 13 && input.length > 0) {
        var safe = true;
        for (var i = 0; i < input.length; i++) {
            if (input.charAt(i) == "<") {
                safe = false;
            }
        }
        for (var i = 0; i < names.length; i++) {
            if (input == names[i]) {
                safe = false;
                alert("Sorry, that name is in use.");
                input = "";
            }
        }
        if (safe) {
            play(input);
            input = "";
            document.getElementById('play').style.display = "block";
            document.getElementById('login').style.display = "none";
        }
    }
}

window.onkeyup = function(e) {
    if (e.keyCode == 38 || e.keyCode == 87) {
        socket.emit('keyPress', {key: "up", down: false});
    } else if (e.keyCode == 40 || e.keyCode == 83) {
        socket.emit('keyPress', {key: "down", down: false});
    } else if (e.keyCode == 37 || e.keyCode == 65) {
        socket.emit('keyPress', {key: "left", down: false});
    } else if (e.keyCode == 39 || e.keyCode == 68) {
        socket.emit('keyPress', {key: "right", down: false});
    }
}

window.onunload = function() {
    socket.emit('disconnect');
}

window.onresize = function() {
    var canvas = document.getElementById('canvas');
    canvas.width = window.innerWidth - 1;
    canvas.height = window.innerHeight - 1;
}

window.onload = function() {
    var canvas = document.getElementById('canvas');
    canvas.width = window.innerWidth - 1;
    canvas.height = window.innerHeight - 1;
}