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
  score = 0;

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
      player.pos = new Position();
      player.pos.copyFrom(this.defaultPositions[this.players.length]);
      player.defaultPosition.copyFrom(player.pos);

      this.players.push(player);
    }
  }
}

class Position {
  x;
  y;
  d;

  constructor(x, y, d) {
    this.x = x || 0;
    this.y = y || 0;
    this.d = d || Directions.East;
  }

  copyFrom(pos) {
    this.x = pos.x;
    this.y = pos.y;
    this.d = pos.d;
  }

  move(direction, spaces) {
    switch(direction) {
      case Directions.East:
        this.x += spaces;
        break;
      case Directions.North:
        this.y -= spaces;
        break;
      case Directions.West:
        this.x -= spaces;
        break;
      case Directions.South:
        this.y += spaces;
        break;
    }
  }
}

class Player {
  id;
  name = '';
  defaultPosition = new Position();
  pos = new Position();
  deaths = 0;
  isDead = false;

  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
}

class Ball {
  pos = null;

  constructor(x, y) {
    this.pos = new Position(x, y, 0);
  }
}

const FieldWidth = 9;
const FieldLength = 15;

const OutOfBounds = 1;
const Endzone = 2;
const Field = 3;

const MaxDeaths = 3;

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
      new Position(mf.x - 2, mf.y - 1, Directions.East),
      new Position(mf.x - 2, mf.y + 1, Directions.East),
      new Position(mf.x - 1, mf.y - 2, Directions.South),
      new Position(mf.x - 1, mf.y + 2, Directions.North)]);

    this.team2 = new Team('Team 2', '#0000FF', [
      new Position(mf.x + 2, mf.y + 1, Directions.West),
      new Position(mf.x + 2, mf.y - 1, Directions.West),
      new Position(mf.x + 1, mf.y + 2, Directions.North),
      new Position(mf.x + 1, mf.y - 2, Directions.South)]);
    this.ball = new Ball(mf.x, mf.y);
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
    if (player.isDead) {
      return;
    }

    const card = move.card;
    switch(card.a) {
      case Actions.Move1Action:
        this.movePlayerForward(player, 1);        
        break;
      case Actions.Move2Action:
        this.movePlayerForward(player, 1);
        this.movePlayerForward(player, 1);
        break;
      case Actions.BackupAction:
        this.movePlayerBackward(player, -1);
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

  movePlayerForward(player) {    
    const objects = this.objectsToMove(player);
    if (objects != null) {
      player.pos.move(player.pos.d, 1);
      objects.forEach(space => {
        if (space instanceof Player) {
          space.pos.move(player.pos.d, 1);
        } else if (space === this.ball) {
          this.ball.pos.move(player.pos.d, 1);
        }
      });
    }
  }

  movePlayerBackward(player) {
    const ballControl = this.hasBallControl(player);
    const backwardDirection = (player.pos.d + 2) % 4;
    const objects = this.objectsToMove(player, true);
    if (objects != null) {
      player.pos.move(backwardDirection, 1);
      objects.forEach(space => {
        if (space instanceof Player) {
          space.pos.move(backwardDirection, 1);
        } else if (space === this.ball) {
          this.ball.pos.move(backwardDirection, 1);
        }
      });
      if (ballControl) {
        this.ball.pos.move(backwardDirection, 1);
      }
    }
  }

  /**
   * Gets a list of objects that need to move because of a move action, if this is null, not even the player should move, if it is empty then only the player should move
   * @param pos the position with direction
   */
  objectsToMove(player, backwards = false) {
    const objects = [];
    let space = backwards ? -1 : 1;
    let nextSpace = this.inFrontOfPlayer(player, backwards ? space-- : space++);
    while (nextSpace != null && nextSpace != this.Endzone) {
      if (nextSpace === this.OutOfBounds) {
        return null;
      }
      objects.push(nextSpace);      
      nextSpace = this.inFrontOfPlayer(player, backwards ? space-- : space++);
    }

    return objects;
  }

  whatIsHere(pos) {
    if (pos.x < this.endzoneDepth || pos.x >= this.fieldLength - this.endzoneDepth) {
      if (pos.y >= 3 && pos.y <= 5) {
        return this.Endzone;
      } else {
        return this.OutOfBounds;
      }
    }

    if (pos.y < 0 || pos.y >= this.fieldWidth) {
      return this.OutOfBounds;
    }

    if (this.ball.pos.x === pos.x && this.ball.pos.y === pos.y) return this.ball;

    return this.team1.players.find(p => pos.x === p.pos.x && pos.y === p.pos.y) || 
           this.team2.players.find(p => pos.x === p.pos.x && pos.y === p.pos.y) ||
           null;
  }

  kick(player) {
    const spaces = [this.inFrontOfPlayer(player, 1), this.inFrontOfPlayer(player, 2), this.inFrontOfPlayer(player, 3)];
    if (spaces[0] === this.ball) {
      if (spaces[1] == null || spaces[1] === this.Endzone) {
        if (spaces[2] == null || spaces[2] === this.Endzone) {
          this.ball.pos.move(player.pos.d, 2);
        } else {
          this.ball.pos.move(player.pos.d, 1);
        }
      }
    } else if (spaces[0] instanceof Player) {
      if (spaces[1] == null) {
        spaces[0].pos.move(player.pos.d, 1);
      }
    }
  }

  turnPlayer(player, places) {
    const hasBallControl = this.hasBallControl(player);

    let newDir = (player.pos.d + places);
    if (newDir >= 4) {
      newDir = newDir - 4;
    }
    if (newDir < 0) {
      newDir = newDir + 4;
    }

    player.pos.d = newDir;

    const front = this.inFrontOfPlayer(player, 1);
    if (hasBallControl && front == null) {
      this.ball.pos.copyFrom(this.positionInFront(player));
    }
  }

  positionInFront(player, places = 1) {
    const pos = new Position();
    pos.copyFrom(player.pos);

    switch(player.pos.d) {  
      case Directions.East:
        pos.x += places;
        break;
      case Directions.North:
        pos.y -= places;
        break;
      case Directions.West:
        pos.x -= places;
        break;
      case Directions.South:
        pos.y += places;
        break;
    }

    return pos;
  }

  inFrontOfPlayer(player, places) {
    return this.whatIsHere(this.positionInFront(player, places));
  }

  hasBallControl(player) {
    return this.inFrontOfPlayer(player, 1) == this.ball;
  }

  fixPlayers() {
    const updatePlayers = [];
    this.team1.players.forEach(p => this.resurrectPlayer(p) ?? updatePlayers.push(p));
    this.team2.players.forEach(p => this.resurrectPlayer(p) ?? updatePlayers.push(p));

    return updatePlayers;
  }

  resurrectPlayer(player) {
    if (player.isDead && player.deaths < MaxDeaths) {
      const pos = this.findOpenSpotAround(player.defaultPosition);
      player.pos.copyFrom(pos);
      player.isDead = false;
      return player;
    }

    return null;
  }

  findOpenSpotAround(pos) {
    if (this.whatIsHere(pos) == null) {
      return pos;
    }

    const positions = [
      {x: pos.x + 1, y: pos.y},
      {x: pos.x, y: pos.y + 1},
      {x: pos.x - 1, y: pos.y},
      {x: pos.x, y: pos.y - 1},
      {x: pos.x + 1, y: pos.y + 1},
      {x: pos.x + 1, y: pos.y - 1},
      {x: pos.x - 1, y: pos.y + 1},
      {x: pos.x - 1, y: pos.y - 1}
    ];
    const newPos = new Position();
    newPos.copyFrom(pos);

    for(let p of positions) {
      newPos.x = p.x;
      newPos.y = p.y;
      if (this.whatIsHere(newPos) == null) {
        return newPos;
      }
    }

    this.whatIsHere()
  }

  checkEndRoundCondition() {
    const checkPlayer = (p) => {
      if (!p.isDead && this.whatIsHere(p.pos) === this.Endzone) {
        p.isDead = true;
        p.deaths++;
      };
    };

    this.team1.players.forEach(p => checkPlayer(p));
    this.team2.players.forEach(p => checkPlayer(p));
    if (this.whatIsHere(this.ball.pos) === this.Endzone) {
      if (this.ball.pos.x < this.endzoneDepth) {
        this.team2.score++;
      } else {
        this.team1.score++;
      }

      this.reset();
      return true;
    }

    return false;
  }

  reset() {
    this.team1.players.forEach(p => p.pos.copyFrom(p.defaultPosition));
    this.team2.players.forEach(p => p.pos.copyFrom(p.defaultPosition));
    this.ball.pos.x = Math.floor(FieldLength / 2);
    this.ball.pos.y = Math.floor(FieldWidth / 2);
  }
}

module.exports = {Board, Directions, Player, Actions};
