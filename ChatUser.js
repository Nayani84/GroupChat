/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require('./Room');

const axios = require('axios');

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** make chat: store connection-device, rooom */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** send msgs to this client using underlying connection-send-function */

  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** handle joining: add to room members, announce join */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: 'note',
      text: `${this.name} joined "${this.room.name}".`
    });
  }

  /** handle a chat: broadcast to room. */

  handleChat(text) {
    this.room.broadcast({
      name: this.name,
      type: 'chat',
      text: text
    });
  }

  // /** Send a joke to the requesting user */

  // sendJoke() {
  //   const joke = "What do you call eight hobbits? Ahob-byte!";
  //   this.send(JSON.stringify({
  //     name: "Server",
  //     type: "chat",
  //     text: joke
  //   }));
  // }

  /** Send a random joke from icanhazdadjokes API to the requesting user */
  async sendJoke() {
    try {
      const response = await axios.get('https://icanhazdadjoke.com/', {
        headers: { 'Accept': 'application/json' }
      });
      const joke = response.data.joke;

      this.send(JSON.stringify({
        name: "Server",
        type: "chat",
        text: joke
      }));

    } catch (err) {
      console.error("Error fetching joke:", err);
      this.send(JSON.stringify({
        name: "Server",
        type: "chat",
        text: "Sorry, I couldn't fetch a joke at the moment."
      }));
    }
  }

  /** Send a list of members in the current room to the user */
  sendMembers() {
    const members = this.room.listMembers();
    const memberList = members.length > 0 ? `In room: ${members.join(', ')}` : "No other members in the room.";

    this.send(JSON.stringify({
      name: "Server",
      type: "chat",
      text: memberList
    }));
  }

  /** Handle messages from client:
   *
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   * - {type: "get-joke"}             : get a joke
   * - {type: "get-members"}          : get list of member
   * - {type: "priv", to: username, text: message} : private message
   * - {type: "name", newName: "newName"} : change username
   */

  handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);

    if (msg.type === 'join') this.handleJoin(msg.name);
    else if (msg.type === 'chat') {
      if (msg.text.startsWith("/priv")) {
        this.handlePrivateMessage(msg.text);
      } else if (msg.text.startsWith("/name")) {
        this.handleNameChange(msg.text);
      }
      else if (msg.text === "/members") {
        this.sendMembers();
      } else {
        this.handleChat(msg.text);
      }
    }
    else if (msg.type === 'get-joke') this.sendJoke();
    else throw new Error(`bad message: ${msg.type}`);
  }

  /** Handle the /name command: change the user's name */
  handleNameChange(text) {
    const parts = text.split(" ");
    const newName = parts[1];

    if (!newName) {
      this.send(JSON.stringify({
        name: "Server",
        type: "chat",
        text: "Usage: /name newName"
      }));
      return;
    }

    // Check if the new name is already taken in the room
    if (this.room.getUserByName(newName)) {
      this.send(JSON.stringify({
        name: "Server",
        type: "chat",
        text: `Username "${newName}" is already taken.`
      }));
      return;
    }

    // Announce the name change to the room
    const oldName = this.name;
    this.name = newName;

    this.room.broadcast({
      type: 'note',
      text: `${oldName} changed the name to ${newName}.`
    });
  }

  /** Handle the /priv command: send private message */
  handlePrivateMessage(text) {
    const parts = text.split(" ");
    const recipientName = parts[1];
    const privateMessage = parts.slice(2).join(" ");

    if (!recipientName || !privateMessage) {
      this.send(JSON.stringify({
        name: "Server",
        type: "chat",
        text: "Usage: /priv username message"
      }));
      return;
    }

    const recipient = this.room.getUserByName(recipientName);

    if (!recipient) {
      this.send(JSON.stringify({
        name: "Server",
        type: "chat",
        text: `User ${recipientName} not found.`
      }));
      return;
    }

    // Send the private message to the recipient
    recipient.send(JSON.stringify({
      name: `Private from ${this.name}`,
      type: "chat",
      text: privateMessage
    }));

    // Optionally, send a confirmation to the sender
    this.send(JSON.stringify({
      name: "Server",
      type: "chat",
      text: `Private message sent to ${recipientName}`
    }));
  }

  /** Connection was closed: leave room, announce exit to others */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: 'note',
      text: `${this.name} left ${this.room.name}.`
    });
  }
}

module.exports = ChatUser;
