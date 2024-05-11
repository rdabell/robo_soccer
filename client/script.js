function GetText(action) {
  let text;
  switch(action) {
    case 1:
      text = 'MOVE 1';
      break;
    case 2:
      text = 'MOVE 2';
      break;
    case 3:
      text = 'BACK UP 1';
      break;
    case 4:
      text = 'KICK';
      break;
    case 5:
      text = 'TURN LEFT';
      break;
    case 6:
      text = 'TURN RIGHT';
      break;
    case 7:
      text = 'U TURN';
      break;
  }

  return text;
}

function GetIcon(action) {
  let icon;
  switch (action) {
    case 1:
    case 2:
      icon = 'fa-arrow-up';
      break;
    case 3:
      icon = 'fa-arrow-down';
      break;
    case 4:
      icon = 'fa-futbol';
      break;
    case 5:
      icon = 'fa-arrow-rotate-left';
      break;
    case 6:
      icon = 'fa-arrow-rotate-right';
      break;
    case 7:
      icon = 'fa-arrow-turn-down';
      break;
  }
  return icon;
}