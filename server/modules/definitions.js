const Directions = Object.freeze({
  East: 0,
  North: 1,
  West: 2,
  South: 3
});

class Team {
  name = '';
  players = [];
  defaultPositions = [];
  color;

  constructor(name, color, defaultPositions) {
    this.name = name;
    this.color = color;
    this.defaultPositions = defaultPositions;
  }

  isFull() {
    return this.players.length >= 4;
  }

  hasPlayer(id) {
    return this.players.find(p => p.id == id);
  }

  addPlayer(player) {
    if (!this.hasPlayer(player.id)) {
      player.pos = {...this.defaultPositions[this.players.length]};
      this.players.push(player);
    }
  }
}

class Player {
  id;
  name = '';
  pos = null;

  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
}

class Ball {
  position = null;
}

const FieldWidth = 9;
const FieldLength = 15;

const Actions = Object.freeze({
  Move1Action: 1,
  Move2Action: 2,
  BackupAction: 3,
  KickAction: 4,
  TurnLeftAction: 5,
  TurnRightAction: 6,
  TurnAroundAction: 7
});

class Board {
  team1;
  team2;
  ball;
  fieldWidth = FieldWidth;
  fieldLength = FieldLength;
  endzoneDepth = 2;

  constructor() {
    const mf = {x: Math.floor(FieldLength / 2), y: Math.floor(FieldWidth / 2) };
    this.team1 = new Team('Team 1', '#FF0000', [
      {x: mf.x - 2, y: mf.y - 1, d: Directions.East},
      {x: mf.x - 2, y: mf.y + 1, d: Directions.East},
      {x: mf.x - 1, y: mf.y -2, d: Directions.South},
      {x: mf.x - 1, y: mf.y + 2, d: Directions.North}]);

    this.team2 = new Team('Team 2', '#0000FF', [
      {x: mf.x + 2, y: mf.y + 1, d: Directions.West},
      {x: mf.x + 2, y: mf.y - 1, d: Directions.West},
      {x: mf.x + 1, y: mf.y + 2, d: Directions.North},
      {x: mf.x + 1, y: mf.y - 2, d: Directions.South}]);
    this.ball = {...mf};
  }

  hasPlayer(id) {
    return (this.team1.hasPlayer(id) || this.team2.hasPlayer(id))
  }

  addPlayer(player) {
    if (!this.team1.isFull() || !this.team2.isFull()) {
      if (this.team1.players.length <= this.team2.players.length) {
        this.team1.addPlayer(player);
        return this.team1;
      } else {
        this.team2.addPlayer(player);
        return this.team2;
      }  
    }

    return null;
  }

  movePlayer(move) {
    const playerId = move.id;
    const player = this.hasPlayer(playerId);
    const card = move.card;
    console.log(JSON.stringify(move));
    switch(card.a) {
      case Actions.Move1Action:
        this.movePlayerForward(player, 1);
        break;
      case Actions.Move2Action:
        this.movePlayerForward(player, 2);
        break;
      case Actions.BackupAction:
        this.movePlayerForward(player, -1);
        break;
      case Actions.KickAction:
        this.kick(player);
        break;
      case Actions.TurnLeftAction:
        this.turnPlayer(player, 1);
        break;
      case Actions.TurnRightAction:
        this.turnPlayer(player, -1);
        break;
      case Actions.TurnAroundAction:
        this.turnPlayer(player, 2);

        break;  
    }
    // do stuff
  }

  movePlayerForward(player, places) {
    switch(player.pos.d) {
      case Directions.East:
        player.pos.x += places;
        break;
      case Directions.North:
        player.pos.y -= places;
        break;
      case Directions.West:
        player.pos.x -= places;
        break;
      case Directions.South:
        player.pos.y += places;
        break;
    }
  }

  kick(player) {

  }

  turnPlayer(player, places) {
    let newDir = (player.pos.d + places);
    if (newDir >= 4) {
      newDir = newDir - 4;
    }
    if (newDir < 0) {
      newDir = newDir + 4;
    }

    player.pos.d = newDir;
  }

}

module.exports = {Board, Directions, Player, Actions};
