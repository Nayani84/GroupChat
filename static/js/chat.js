/** Client-side of groupchat. */

const urlParts = document.URL.split("/");
const roomName = urlParts[urlParts.length - 1];
const ws = new WebSocket(`ws://localhost:3000/chat/${roomName}`);


const name = prompt("Username?");


/** called when connection opens, sends join info to server. */

ws.onopen = function (evt) {
  console.log("open", evt);

  let data = { type: "join", name: name };
  ws.send(JSON.stringify(data));
};


/** called when msg received from server; displays it. */

ws.onmessage = function (evt) {
  console.log("message", evt);

  let msg = JSON.parse(evt.data);
  let item;

  if (msg.type === "note") {
    item = $(`<li><i>${msg.text}</i></li>`);
  }

  else if (msg.type === "chat") {
    if (msg.name.startsWith("Private from")) {
      item = $(`<li><b style="color:red;">${msg.name}: </b>${msg.text}</li>`);
    } else {
      item = $(`<li><b>${msg.name}: </b>${msg.text}</li>`);
    }
  }

  else {
    return console.error(`bad message: ${msg}`);
  }

  $('#messages').append(item);
};


/** called on error; logs it. */

ws.onerror = function (evt) {
  console.error(`err ${evt}`);
};


/** called on connection-closed; logs it. */

ws.onclose = function (evt) {
  console.log("close", evt);
};


/** send message when button pushed. */

// $('form').submit(function (evt) {
//   evt.preventDefault();

//   let data = {type: "chat", text: $("#m").val()};
//   ws.send(JSON.stringify(data));

//   $('#m').val('');
// });

$('form').submit(function (evt) {
  evt.preventDefault();

  let message = $("#m").val();

  if (message === "/joke") {
    // Send a joke request to the server
    let data = { type: "get-joke" };
    ws.send(JSON.stringify(data));
  } else if (message === "/members") {
    let data = { type: "chat", text: "/members" };
    ws.send(JSON.stringify(data));
  } else {
    let data = { type: "chat", text: message };
    ws.send(JSON.stringify(data));
  }

  $('#m').val('');  // Clear the input field
});