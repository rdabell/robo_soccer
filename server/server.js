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

        if (p != null) {
          // if the round has already started and the player was dealt cards,
          // then send the dealt cards to the player
          const cards = currentDeal?.get(p.id);
          if (cards) {
            sendMessage(ws, 'cards', cards);
          }
        }
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

function publishCard(pCard) {
  displayWs.forEach(ws => {
    sendMessage(ws, 'card', pCard);
  });
}

function notifyTime(id) {
  const ws = playerMap.get(id);
  sendMessage(ws, 'time', {});
}

function addNewPlayer(id, username) {
  try {
    let player = new Game.Player(id, username);
    let team = board.addPlayer(player);
    if (team) {
      const ws = playerMap.get(id);
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
  } else if (remainingT1.length === 0) {
    // notify Team 2 they have limited time.
    remainingT2.forEach(id => notifyTime(id));
  } else if (remainingT2.length === 0) {
    // notify Team 1 they have limited time.
    remainingT1.forEach(id => notifyTime(id));
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
  let interval = setInterval(() => {
    // spend 3 seconds between turns to show the card them move the player
    const move = allTurnsInRound[index++];
    const player = board.hasPlayer(move.id);
    const team1 = board.team1.hasPlayer(move.id);
    
    // show the card on the display
    publishCard({player: player.name, color: team1 ? board.team1.color : board.team2.color, card: move.card});
  
    // wait to play to the turn until after the card has been displayed
    setTimeout(() => {
      // remove the card and update the board
      let endRound = playTurn(move) || index >= allTurnsInRound.length;
      
      // if all the moves have been played then clear the deals and shuffle and deal the cards
      if (endRound) {
        currentDeal.clear();
        returnCards.clear();
        shuffleAndDeal();
        clearInterval(interval);
        fixPlayers();
        publishBoard();
      }  
    }, 2000);

  }, 3000);
}

function playTurn(move) {
  board.movePlayer(move);
  const endRound = hasEndRoundCondition()
  publishBoard();

  return endRound;  
}

function hasEndRoundCondition() {
  return board.checkEndRoundCondition();
}

function fixPlayers() {
  const updatePlayers = board.fixPlayers();
  updatePlayers.forEach((p) => {
    const ws = playerMap.get(p.id);
    sendMessage(ws, 'player', p);
  });
}
