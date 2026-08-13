
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const GameCollection = require('./games.js').GameCollection;

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const games = new GameCollection();

// Servir archivos estáticos
app.use(express.static(__dirname + '/../game'));

server.listen(3000, () => {
  console.log('Servidor escuchando en http://localhost:3000');
});

var Responses = {
    SUCCESS: 0,
    GAME_EXISTS: 1,
    GAME_NOT_EXISTS: 2,
    GAME_FULL: 3
  },
  Requests = {
    CREATE_GAME: 'create-game',
    JOIN_GAME: 'join-game'
  };

io.on('connection', function (socket) {
  socket.on(Requests.CREATE_GAME, function (gameName) {
    if (games.createGame(gameName)) {
      games.getGame(gameName).addPlayer(socket);
      socket.emit('response', Responses.SUCCESS);
    } else {
      socket.emit('response', Responses.GAME_EXISTS);
    }
  });
  socket.on(Requests.JOIN_GAME, function (gameName) {
    var game = games.getGame(gameName);
    if (!game) {
      socket.emit('response', Responses.GAME_NOT_EXISTS);
    } else {
      if (game.addPlayer(socket)) {
        socket.emit('response', Responses.SUCCESS);
      } else {
        socket.emit('response', Responses.GAME_FULL);
      }
    }
  });
});
