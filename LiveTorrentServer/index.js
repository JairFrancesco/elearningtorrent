//Require necessary modules.

var chokidar = require('chokidar');
var express = require('express');
var app = express();
var path = require('path');
var https = require('https');
var fs = require('fs');
var exec = require('child_process').exec;
//var Stream = require('./stream');

/**
 * Global variables
 */

var PORT = 7000;
var webSocketsServerPort = 1337;
var TS_CHUNKS_DIRECTORY = '/var/www/html/HLS/live'; //Directory in apache2
var URL_CHUNKS = 'http://elearningp2p.ml/HLS/live/';
var lastTorrent = "";
var idealPieceLenght = 400000;
var peersOnline = 0;
var users = {};
var liveStreams = {};


var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ port: webSocketsServerPort });
 
wss.on('connection', function connection(ws) {
  console.log('User connected');
  ws.on('message', function incoming(message) {
    var data;
    try {
         data = JSON.parse(message); 
    } catch (e) { 
         console.log("Invalid JSON"); 
         data = {}; 
    } 
    console.log("Message received", message);
  }); 
  //ws.send('something');
  sendTo(ws, {type:'play', torrent: lastTorrent });

  ws.on("close", function() { 
    console.log('User disconnected');

  });
});

function sendTo(connection, message) { 
   connection.send(JSON.stringify(message)); 
}


function broadcast(message) {
    wss.clients.forEach(function each(client) {
            client.send(JSON.stringify(message));
    });
}

var watcher = chokidar.watch(TS_CHUNKS_DIRECTORY, {
  ignored: '*.m3u8'|'*.torrent', persistent: true
});

var log = console.log.bind(console);

watcher
  .on('add', function(path) {
	 log('File', path, 'has been added'); 
	 //console.log(file + ' was created')
  var file = path;
  var tmp = file.split("/");
  var filename = tmp[tmp.length-1];
  //console.log("Nombre del archivo: " + filename);
  var filenameWithoutExt = filename.split(".")[0];
  //console.log("Sin extension:" + filenameWithoutExt);

  var tmpStreamNumber = filenameWithoutExt.split('-');
  var streamName = tmpStreamNumber[0];
  var chunkNumber = tmpStreamNumber[1];
  var beforeCompleteChunkName = streamName + '-' + (parseInt(chunkNumber) - 1).toString();
  var beforeCompleteChunk = beforeCompleteChunkName + '.ts';
  //var pieceLengthBytes = calculatePieceLength(TS_CHUNKS_DIRECTORY + "/" + beforeCompleteChunk);
  var pieceLengthBytes = 400000;

  var cmd = "create-torrent --pieceLength " + pieceLengthBytes.toString() + " --urlList '" + URL_CHUNKS + beforeCompleteChunk + "' " + beforeCompleteChunk  + ' > ' + beforeCompleteChunkName + ".torrent";
  //var cmd = "create-torrent --urlList '" + URL_CHUNKS + beforeCompleteChunk + "' " + beforeCompleteChunk  + ' > ' + beforeCompleteChunkName + ".torrent";
  exec(cmd, {cwd:TS_CHUNKS_DIRECTORY} ,function(err, stdout, stderr){
    if (err) {return console.log(err);}
    lastTorrent = URL_CHUNKS + beforeCompleteChunkName + ".torrent";
    broadcast({type: 'chunk', torrent: lastTorrent});

    console.log(stdout);
  });
	})
  .on('unlink', function(path) {
	try {
	 var file = path;
	 log('File', path, 'has been removed'); 
	 var tmp = file.split("/");
	 var filename = tmp[tmp.length-1];
	 var filenameWithoutExt = filename.split(".")[0];
	 tmp.splice(tmp.length-1, 1);
	 var filePath = tmp.join("/");
	 //fs.unlink(filePath + "/" + filenameWithoutExt + '.torrent', (err) => {
          //if (err) return console.log(err);
          //console.log('successfully deleted .torrent');
	  //Si fue eliminado exitosamente, entonces enviar a los clientes para eliminar las conexiones.
	  broadcast({type: 'remove-torrent', torrent: URL_CHUNKS + filenameWithoutExt + '.torrent'});
	 //});
	} catch (err){
		console.log("Error eliminando archivo torrent");
	}

  })
  .on('unlinkDir', function(path) { log('Directory', path, 'has been removed'); })
  .on('error', function(error) { log('Error happened', error); })
  .on('ready', function() { log('Initial scan complete. Ready for changes.'); })



//Useful functions
function getFilesizeInBytes(filename) {
 var stats = fs.statSync(filename)
 var fileSizeInBytes = stats["size"]
 return fileSizeInBytes
}

function calculatePieceLength(filename)
{
  if (!fileExists(filename))
  {
	return idealPieceLenght;
  }
  var fileSize = getFilesizeInBytes(filename);
  var minimumIdealPeers = fileSize / idealPieceLenght;

  if (peersOnline-5 <= 0)
  {
    return idealPieceLenght;
  }
  else if (peersOnline<minimumIdealPeers)
  {
    return idealPieceLenght;
  }
  else
  {
    return fileSize/(peersOnline-5);  
  }
}

function fileExists(filePath)
{
    try
    {
        return fs.statSync(filePath).isFile();
    }
    catch (err)
    {
        return false;
    }
}
