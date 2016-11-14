var Client  = require(./client.js)

function Stream(name)
{
	this.streamName = name;
	this.torrentFile = "";
	this.clients = [];
}

Stream.prototype.addClient = function(client){
	clients.push(client)
};

//Stream.prototype.

module.exports = Client;
