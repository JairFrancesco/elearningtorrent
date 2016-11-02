//Require necessary modules.

var http = require("http");
var hound = require('hound');
var express = require('express');
var app = express();
var path = require('path');
var https = require('https');
var fs = require('fs');
var exec = require('child_process').exec;

//General Variables

var PORT = 7000;
var TS_CHUNKS_DIRECTORY = '/var/www/html/HLS/live'; //Directory in apache2
var URL_CHUNKS = 'https://elearningp2p.ml/HLS/live/';
var lastTorrent;
var idealPieceLenght = 400000;
var peersOnline = 0;

var server = https.createServer({
      key: fs.readFileSync('/etc/letsencrypt/live/elearningp2p.ml/privkey.pem'),
      cert: fs.readFileSync('/etc/letsencrypt/live/elearningp2p.ml/fullchain.pem')
    }, app).listen(PORT);

var io = require('socket.io')(server);

app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

app.get('/', function(req, res){
  res.send("Server For Live Streaming using webtorrent");
});

console.log('Server running at http://127.0.0.1:'+PORT);

// Create a directory tree watcher.
watcher = hound.watch(TS_CHUNKS_DIRECTORY)

//Create the torrents
watcher.on('create', function(file, stats) {
  console.log(file + ' was created')
  var tmp = file.split("/");
  var filename = tmp[tmp.length-1];
  console.log("Nombre del archivo: " + filename);
  var filenameWithoutExt = filename.split(".")[0];
  console.log("Sin extension:" + filenameWithoutExt);

  var tmpStreamNumber = filenameWithoutExt.split('-');
  var streamName = tmpStreamNumber[0];
  var chunkNumber = tmpStreamNumber[1];
  var beforeCompleteChunkName = streamName + '-' + (parseInt(chunkNumber) - 1).toString();
  var beforeCompleteChunk = beforeCompleteChunkName + '.ts';
  var pieceLengthBytes = calculatePieceLength(TS_CHUNKS_DIRECTORY + "/" + beforeCompleteChunk);

  var cmd = "create-torrent --pieceLength " + pieceLengthBytes.toString() + " --urlList '" + URL_CHUNKS + beforeCompleteChunk + "' " + beforeCompleteChunk  + ' > ' + beforeCompleteChunkName + ".torrent";
  //var cmd = "create-torrent --urlList '" + URL_CHUNKS + beforeCompleteChunk + "' " + beforeCompleteChunk  + ' > ' + beforeCompleteChunkName + ".torrent";
  exec(cmd, {cwd:TS_CHUNKS_DIRECTORY} ,function(err, stdout, stderr){
    if (err) {return console.log(err);}
    lastTorrent = URL_CHUNKS + beforeCompleteChunkName + ".torrent";
    io.emit('chunk', lastTorrent);
    console.log(stdout);
  });


})
watcher.on('change', function(file, stats) {
  console.log(file + ' was changed')
})
watcher.on('delete', function(file) {
  console.log(file + ' was deleted')
})


//Cuando un usuario se conecta, mandarle el ultimo torrent generado.
io.on('connection', function(socket){
  peersOnline++;
  console.log("Peers Online: ", peersOnline);
  socket.emit('play-stream', lastTorrent);
  /*socket.on('new torrent', function(data){
    console.log(data);
    searchTorrents();
  });
  */
  socket.on('disconnect', function(){
    peersOnline--;
    console.log("Peers Online: ", peersOnline);
  });
});

//Cada vez que se crea un torrent mandarlo a los clientes para que estos lo reproduzcan

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
