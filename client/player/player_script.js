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
  let username = $('#name').val();

  if (!/^[A-Za-z0-9_ ]+$/.test(username)) {
    $('#errorText').text('Invalid characters detected');
    $('#name').val('');
  } else {
    $('#errorText').text('');
    if (username.length > 10) {
      username = username.substring(0, 10);
    }

    player = {id, name: username};
    socket.send(JSON.stringify({key: 'player', data: player}));
    $('body').load('game_play.html', null, () => {
      $('#name').text(player.name);
    });  
  }

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