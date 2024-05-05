let socket;
let canvas;
let ctx;

function messageHandler(message) {
  const parsedMessage = JSON.parse(message);
  switch (parsedMessage.key) {
    case 'board':
      RedrawBoard(parsedMessage.data);
      break;

  }
}

$(() => {
  const host = window.location.host;
  socket = new WebSocket(`ws://${host}`);
  socket.addEventListener('message', (message) => messageHandler(message.data));
  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({key: 'display'}));
  });

  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');

});

let gd;

function RedrawBoard(board) {
  w = canvas.width = canvas.clientWidth;
  h = canvas.height = canvas.clientHeight;
  ctx.reset();

  const gridx = w / board.fieldLength;
  const gridy = h / board.fieldWidth;

  gd = Math.min(gridx, gridy);

  DrawField(board);
  DrawBall(board.ball);
  DrawRobots(board);
}

function DrawField(board) {
  ctx.fillStyle = '#008000';
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 3;
  ctx.fillRect(0, 0, gd * board.fieldLength, gd * board.fieldWidth);

  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  // draw grid
  for (let i = board.endzoneDepth; i < board.fieldLength - board.endzoneDepth; i ++) {
    ctx.beginPath();
    ctx.moveTo(i * gd, 0);
    ctx.lineTo(i * gd, gd * board.fieldWidth);
    ctx.stroke();
  }

  for (let i = 1; i < board.fieldWidth; i ++) {
    ctx.beginPath();
    ctx.moveTo(board.endzoneDepth * gd, i * gd);
    ctx.lineTo((board.fieldLength - board.endzoneDepth) * gd, i * gd);
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ctx.strokeStyle;
  ctx.font = `${Math.floor(gd / 2)}px arial`;
  for (let i = 0; i < board.fieldLength - board.endzoneDepth * 2; i++) {
    for (let j = 0; j < board.fieldWidth; j ++) {
      const coordinate = `${String.fromCharCode(65 + i)} ${j + 1}`;
      
      ctx.strokeText(coordinate, (i + board.endzoneDepth) * gd + gd / 2, j * gd + gd / 2);
      ctx.fillText(coordinate, (i + board.endzoneDepth) * gd + gd / 2, j * gd + gd / 2);
    }
  }

  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 3;
  ctx.save();
  // draw endzones
  ctx.lineWidth = 20;
  ctx.strokeStyle = board.team1.color;
  ctx.strokeRect(10, 10, gd * board.endzoneDepth - 20, gd * board.fieldWidth - 20);

  ctx.strokeStyle = board.team2.color;
  ctx.strokeRect(gd * (board.fieldLength - board.endzoneDepth) + 10, 10, gd * board.endzoneDepth - 20, gd * board.fieldWidth - 20);
  ctx.restore();

  ctx.strokeRect(gd * 2, 0, gd * (board.fieldLength - 4), gd * board.fieldWidth);

  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 3;

  // draw center circle
  ctx.beginPath();
  ctx.arc(gd * board.fieldLength / 2, gd * board.fieldWidth / 2, gd * 1.5, 0, Math.PI * 2);
  ctx.stroke();

  // draw the end boxes
  ctx.beginPath();
  ctx.moveTo(gd * board.endzoneDepth, gd * 2);
  ctx.lineTo(gd * (board.endzoneDepth + 2), gd * 2);
  ctx.lineTo(gd * (board.endzoneDepth + 2), gd * (board.fieldWidth - 2));
  ctx.lineTo(gd * board.endzoneDepth, gd * (board.fieldWidth - 2));
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(gd * (board.fieldLength - board.endzoneDepth), gd * 2);
  ctx.lineTo(gd * (board.fieldLength - board.endzoneDepth - 2), gd * 2);
  ctx.lineTo(gd * (board.fieldLength - board.endzoneDepth - 2), gd * (board.fieldWidth - 2));
  ctx.lineTo(gd * (board.fieldLength - board.endzoneDepth), gd * (board.fieldWidth - 2));
  ctx.stroke();
}

function DrawBall(ball) {
  ctx.fillStyle = '#000';
  ctx.beginPath();  
  ctx.arc(ball.x * gd + gd/2, ball.y * gd + gd/2, gd * .33, 0, Math.PI * 2);
  ctx.fill();
}

function DrawRobots(board) {
  ctx.textBaseline = 'bottom';
  board.team1.players.forEach(p => DrawRobot(board.team1, p));
  board.team2.players.forEach(p => DrawRobot(board.team2, p));
}

function DrawRobot(team, player) {
  ctx.save();
    ctx.fillStyle = '#333';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.translate(player.pos.x * gd + gd / 2 , player.pos.y * gd + gd / 2);
    
    ctx.save();
      switch (player.pos.d) {
        case 0: // east
          ctx.rotate(Math.PI * .5);
          break;
        case 1: // north
          
          break;
        case 2: // west
          ctx.rotate(-Math.PI * .5);
          break;
        case 3: // south
          ctx.rotate(Math.PI);
          break;
      }

      // draw the base

      ctx.fillStyle=team.color;
      ctx.beginPath();
      ctx.arc(0, 0, gd/(2*Math.sqrt(2)), -Math.PI * 1/4, -Math.PI * 3/4);
      ctx.lineTo(0, -gd/2);
      ctx.closePath();

      ctx.fill();
      // draw the robot

      ctx.fillStyle = '#333';
      ctx.fillRect(-gd / 4, -gd / 4, gd * 1/2, gd * 1/2);
      ctx.strokeRect(-gd / 4, -gd / 4, gd * 1/2, gd * 1/2);

      ctx.fillRect(-gd/20, -gd * 5/16, gd/20, gd/4);
      ctx.strokeRect(-gd/20, -gd * 5/16, gd/20, gd/4);

      ctx.fillStyle = '#444';
      ctx.fillRect(-gd / 6, -gd / 6, gd * 1/3, gd * 1/3);
      ctx.strokeRect(-gd / 6, -gd / 6, gd * 1/3, gd * 1/3);

      ctx.beginPath();
      ctx.arc(0, gd/10, gd/20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

    ctx.restore();

    // draw name
    ctx.textAlign = 'center';

    ctx.fillStyle = team.color;
    ctx.font = `${Math.floor(gd / 4)}px arial`;
    ctx.fillText(player.name, 0, gd / 2, gd);
    ctx.strokeText(player.name, 0, gd / 2, gd);

  ctx.restore();
}

function Start() {
  $.ajax({
    url: '/start_game',
    type: 'POST'
  });
}

