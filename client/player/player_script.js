function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
}

let id;
let player;

$(() => {
  id = localStorage.getItem('id');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('id', id);
  }   
  
  const host = window.location.host;
  socket = new WebSocket(`ws://${host}`);
  socket.addEventListener('open', () => {
    checkPlayer();
  });
  socket.addEventListener('message',  (message) => messageHandler(message.data));
  socket.addEventListener('close', () => socket = null);

});

function checkPlayer() {
  socket.send(JSON.stringify({key: 'check-player', data: id}));
}

let socket;

let displayedCards = [];
let selectedCards = [null, null, null, null, null];

function messageHandler(message) {
  const parsedMessage = JSON.parse(message);
  switch(parsedMessage.key) {
    case 'cards':
      $('body').load('game_play.html', null, () => {
        $('#name').text(player.name);
        displayCards(parsedMessage.data);
      });
      break;
    case 'player':
      player = parsedMessage.data;
      if (player == null) {
        $('body').load('create_user.html');
      } else {
        $('body').load('game_play.html', null, () => {
          $('#name').text(player.name);
        });
      }
      break;
  }
}

function createUser() {
  const username = $('#name').val();
  player = {id, name: username};
  socket.send(JSON.stringify({key: 'player', data: player}));
  $('body').load('game_play.html', null, () => {
    $('#name').text(player.name);
  });
}

function displayCards(cards) {
  this.displayedCards = cards;

  let index = 0;
  $('.card-pool').load("card.html", () => {
    $(`.row :nth-child(${index + 1}) .card-pool .card`).attr('id', `card${index}`);
    $(`#card${index} #card-priority`).text(cards[index].p);
    $(`#card${index} #card-text`).text(GetText(cards[index].a));
    $(`#card${index} #card-icon`).removeClass().addClass('fa-solid').addClass(GetIcon(cards[index].a));
    index ++;
  });
}

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

let draggingNumber = null;

function dragStart(event) {
  const id = event.target.id;
  event.dataTransfer.setData('id', id);
}

function dropCard(event) {
  event.preventDefault();
  const cardId = event.dataTransfer.getData('id');
  let node = $(`#${cardId}`)[0];
  event.target.appendChild(node);

  const cardNumber = parseInt(cardId.substring(4));

  for (let i = 0; i < 5; i++) {
    if (selectedCards[i] === cardNumber) {
      selectedCards[i] = null;
      break;
    }
  }

  if (event.target.id.startsWith('place')) {
    const placeId = event.target.id;
    const placeNumber = parseInt(placeId.substring(5));
    selectedCards[placeNumber] = cardNumber;
  }

  let full = true;
  for (let card of selectedCards) {
    if (card == null) {
      full = false;
    }
  }

  if (full) {
    $('#submit-button').removeAttr('disabled', false);
  } else {
    $('#submit-button').attr('disabled', true);
  }
}

function allowDrop(event) {  
  if (!$(event.target).html()?.length) {
    event.preventDefault();
  }
}

function submitCards() {
  $('#card-pool').html('');
  socket.send(JSON.stringify({key: 'submit-cards', data: {id, cards: selectedCards}}));
  selectedCards = [null, null, null, null, null];
  displayedCards = [];
}