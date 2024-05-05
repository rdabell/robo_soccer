const express = require('express');
const app = express();
const path = require('path');
const WebSocket = require('ws');
const _ = require('lodash');
const Game = require('./modules/definitions.js');

const board = new Game.Board();

const displayWs = [];

const playerMap = new Map();

const currentDeal = new Map();
const returnCards = new Map();

const TurnsPerRound = 5;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Start the server
const PORT = process.env.PORT || 80;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const parsedMessage = JSON.parse(message);
    switch (parsedMessage.key) {
      case 'check-player':
        let p = board.hasPlayer(parsedMessage.data);
        if (p != null) {
          playerMap.set(p.id, ws);
        }
        sendMessage(ws, 'player', p);
        break;
      case 'player':
        playerMap.set(parsedMessage.data.id, ws);
        addNewPlayer(parsedMessage.data.id, parsedMessage.data.name);
        publishBoard();
        break;
      case 'display':
        displayWs.push(ws);
        sendMessage(ws, 'board', board);
        break;
      case 'submit-cards':
        playerCards(parsedMessage.data.id, parsedMessage.data.cards);
        break;
    }
  });

  ws.on('close', () => {
    _.remove(displayWs, d => d == ws);
  });
});

app.post('/start_game', (req, res) => {
  shuffleAndDeal();
  res.status(200).end();
});

function sendMessage(ws, key, json) {
  ws.send(JSON.stringify({key, data: json}));
}

function shuffleAndDeal() {
  const cards = [];
  const players = [...board.team1.players, ...board.team2.players];
  for(let p = 1; p <= players.length * 10; p++) {
    cards.push({p: p * 10, a: getRandomAction()});
  }

  for(let i = 0; i < cards.length; i++) {
    const temp = cards[i];
    const swapWith = Math.floor(Math.random() * cards.length);
    cards[i] = cards[swapWith];
    cards[swapWith] = temp;
  }

  players.forEach((p, i) => {
    const id = p.id;
    const playerCards = cards.slice(i * 10, (i + 1) * 10);
    currentDeal.set(id, playerCards);
    const ws = playerMap.get(id);
    if (ws) {
      sendMessage(ws, 'cards', playerCards);
    }
  });
}

const distributedActions = [
  Game.Actions.Move1Action,
  Game.Actions.Move1Action,
  Game.Actions.TurnLeftAction,
  Game.Actions.TurnLeftAction,
  Game.Actions.TurnRightAction,
  Game.Actions.TurnRightAction,
  Game.Actions.KickAction,
  Game.Actions.KickAction,
  Game.Actions.Move2Action,
  Game.Actions.BackupAction,
  Game.Actions.TurnAroundAction
];

function getRandomAction() {
  return distributedActions[Math.floor(Math.random() * distributedActions.length)];
}

function publishBoard() {
  displayWs.forEach(ws => {
    sendMessage(ws, 'board', board);
  });
}

function addNewPlayer(id, username) {
  try {
    let player = new Game.Player(id, username);
    let team = board.addPlayer(player);
    if (team) {
      const ws = this.playerMap.get(id);
      sendMessage(ws, 'team', {name: team.name, color: team.color});
    }
  } catch (e) {
    console.log(`Something went wrong while creating the player: ${e.message}`);
  }  
}

function playerCards(id, cardIndexes) {
  let deltCards = currentDeal.get(id);
  let actualCards = [];
  for (let i = 0; i < cardIndexes.length; i++) {
    actualCards.push(deltCards[cardIndexes[i]]);
  }

  returnCards.set(id, actualCards);

  const done = Array.from(returnCards.keys());
  const remainingT1 = _.map(board.team1.players, p => p.id).filter(id => done.indexOf(id) == -1);
  const remainingT2 = _.map(board.team2.players, p => p.id).filter(id => done.indexOf(id) == -1);

  if (remainingT1.length === 0 && remainingT2.length === 0) {
    playRound();
  }
}

function playRound() {
  const allTurnsInRound = [];
  for (let i = 0; i < TurnsPerRound; i++) {
    const turn = [];
    returnCards.forEach((v, k) => {
      turn.push({id: k, card: v[i]});
    });

    turn.sort((a, b) => b.card.p - a.card.p);
    allTurnsInRound.push(...turn);
  }

  let index = 0;
  // display turn card
  //displayTurn(allTurnsInRound[index]);

  let interval = setInterval(() => {
    playTurn(allTurnsInRound[index]);

    index++;
    if (index >= allTurnsInRound.length) {
      currentDeal.clear();
      returnCards.clear();
      shuffleAndDeal();
      clearInterval(interval);
    }
  }, 3000);
}

function playTurn(move) {
  board.movePlayer(move);
  publishBoard();
}
