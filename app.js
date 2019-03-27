const http = require('http');
const fs = require('fs');
const path = require('path');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  console.log('Requesting', req.url);

  var filepath = (req.url == '/' ? 'index.html' : req.url);

  fs.readFile('./public/' + filepath, (err, content) => {
    if(err) {
      console.log('Something went wrong while finding: ' + filepath);
    }
    res.writeHead(200);
    res.end(content);
  });

});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});


// ----------------------------------------------------------
// Start Socket Listener
// ----------------------------------------------------------
var io = require('socket.io')(server);

var players = [];
var waitingPlayers = [];
var games = [];
var gameCounter = 0;

io.sockets.on('connection', function(socket) {
  console.log('New connection');
  var player = { socket: socket };
  players.push(player);
  // Check for waiting players
  if(waitingPlayers.length) {
    var otherPlayer = waitingPlayers.shift();

    // Create game
    var game = {
      players: [otherPlayer, player],
      pieceStates: [],
      playerTurn: 1,
      id: gameCounter
    };

    otherPlayer.game = game.id;
    otherPlayer.status = 'play';
    otherPlayer.number = 1;
    player.game = game.id;
    player.status = 'play';
    player.number = 2;

    games.push(game);

    otherPlayer.socket.emit('start', {'playerNumber': otherPlayer.number, 'playerTurn': game.playerTurn});
    player.socket.emit('start', {'playerNumber': player.number, 'playerTurn': game.playerTurn});

    gameCounter++;
  } else {
    player.status = 'wait';
    waitingPlayers.push(player);
    socket.emit('status', {status:'wait'});
  }

  socket.on('choosePiece', function(data) {
    var game = getGame(player.game);
    if( game && player.number === game.playerTurn) {
      if(game.pieceStates[data.piece]) {
        socket.emit('status', {status:'invalidmove'});
      } else {
        game.pieceStates[data.piece] = player.number;
        game.playerTurn = (game.playerTurn-1 ? 1 : 2);

        var move = {
          pieceStates: game.pieceStates, 
          playerTurn: game.playerTurn
        };

        emitToGame(game, 'move', move);

        var winner = checkWin(game);
        if(winner) {
          endGame(game, winner, 'win');
        }
      }
    } else {
      socket.emit('status', {status:'notturn'});
    }
  });

  socket.on('disconnect', function(e) {
    console.log('Disconnected');
    if(player.status == 'wait') {
      removeWaitingPlayer(player);
    }
    if(player.status == 'play') {
      removePlayerFromGame(player);
    }

    removePlayer(player);
  });

});

function getPlayerFromSocket(socket) {
  for(var i = 0; i < players.length; i++) {
      if(socket === players[i].socket) {
        return players[i];
        break;
      }
    }
}

function getGame(id) {
  for(var i=0; i < games.length; i++) {
    if(games[i].id == id) {
      return games[i];
    }
  }

  return null;
}

function removeWaitingPlayer(player) {
  for(var i=0; i < waitingPlayers.length; i++) {
    if(waitingPlayers[i] === player) {
      waitingPlayers.splice(i,1);
      break;
    }
  }
}

function removePlayerFromGame(player) {
  var game = getGame(player.game);
  var winner;
  for(var i = 0; i < game.players.length; i++) {
    if(player === game.players[i]) {
      game.players.splice[i,1];
      winner = 2-i;
      break;
    }
  }
  endGame(game,winner,'left');
}

function removePlayer(player) {
  for(var i=0; i < players.length; i++) {
    if(players[i] === player) {
      players.splice(i,1);
      delete player;
      break;
    }
  }
}

function endGame(game, winner, reason) {
  for(var i = 0; i < game.players.length; i++) {
    console.log('Sending win');
    game.players[i].socket.emit('end',{'winner': winner, 'reason': reason});
    // Set player to wait and add to waiting
    game.players[i].status = 'wait';
    //waitingPlayers.push(game.players[i]);
    removePlayer(game.players[i]);
  }

  for(var i = 0; i < games.length; i++) {
    if(games[i] === game) {
      games.splice(i,1);
      break;
    }
  }
}

function emitToGame(game, name, message) {
  for(var i = 0; i < game.players.length; i++) {
    game.players[i].socket.emit(name,message);
  }
}

function checkWin(game) {
  p = game.pieceStates;
  if(p[1] != 0 && p[1] == p[2] && p[1] == p[3]) {
    return p[1];
  }
  if(p[4] != 0 && p[4] == p[5] && p[4] == p[6]) {
    return p[4];
  }
  if(p[7] != 0 && p[7] == p[8] && p[7] == p[9]) {
    return p[7];
  }
  if(p[1] != 0 && p[1] == p[4] && p[1] == p[7]) {
    return p[1];
  }
  if(p[2] != 0 && p[2] == p[5] && p[2] == p[8]) {
    return p[2];
  } 
  if(p[3] != 0 && p[3] == p[6] && p[3] == p[9]) {
    return p[3];
  }
  if(p[1] != 0 && p[1] == p[5] && p[1] == p[9]) {
    return p[1];
  }
  if(p[1] != 0 && p[1] == p[6] && p[1] == p[8]) {
    return p[1];
  }
  if(p[2] != 0 && p[2] == p[4] && p[2] == p[9]) {
    return p[2];
  }
  if(p[2] != 0 && p[2] == p[6] && p[2] == p[7]) {
    return p[2];
  }
  if(p[3] != 0 && p[3] == p[4] && p[3] == p[8]) {
    return p[3];
  }
  if(p[3] != 0 && p[3] == p[5] && p[3] == p[7]) {
    return p[3];
  }
  return 0;
}
