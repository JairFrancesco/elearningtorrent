//Programming the server side for the generate secuence of torrents file
//Program the Socket server for emitting info about the segment video for playing

/* Steps

1.-  Generate .ts files with RTMP Module (NGINX) (Complete).
2.-  Convert .ts to mp4 file (Callback is a function that receive the filename and convert it to dash).
3.-  After the dash convert is completed the callback receive the filename of the dash file.
4.-  Generate torrent file for the dash video file.
5.-  Send the torrent link via Socket.io to the clients.
6.-  


Socket.io (Server)
1.- On client connection send the last torrent link generated.
2.- (Server) on torrent generated emit newSegment(torrentLink).
3.- 

Socket.io (Client)
1.- On Connection receive the last torrent and stream it to html5 video tag
2.- 


Idea for managing problems on clients
 .-Have a chunk number 
1.- Create  a manifest or something that has a list of torrents


*/

//Require necessary modules.

var http = require("http");
var hound = require('hound');

//General Variables

var PORT = 7000;
var TS_CHUNKS_DIRECTORY = '/HLS/live';
var URL_CHUNKS = 'https://elearningp2p.ml:4430/live/';

http.createServer(function (request, response) {
   response.writeHead(200, {'Content-Type': 'text/plain'});
   // Send the response body as
   response.end('Hello World, LiveTorrentServer Working\n');
}).listen(PORT);

// Console will print the message
console.log('Server running at http://127.0.0.1:7000/');



// Create a directory tree watcher.
watcher = hound.watch(TS_CHUNKS_DIRECTORY)

// Create a file watcher.
//watcher = hound.watch('/tmp/file.txt')

var exec = require('child_process').exec;

// Add callbacks for file and directory events.  The change event only applies
// to files.
watcher.on('create', function(file, stats) {
  console.log(file + ' was created')
  var tmp = file.split("/");
  var filename = tmp[tmp.length-1];
  console.log("Nombre del archivo: " + filename);
  var filenameWithoutExt = filename.split(".")[0];
  console.log("Sin extension:" + filenameWithoutExt);

  //Para crear torrents
  //create-torrent --urlList 'https://webseed.btorrent.xyz/timedrift-alpine-4k-timelapse.mp4' timedrift-alpine-4k-timelapse.mp4 > timedrift.torrent

  var tmpStreamNumber = filenameWithoutExt.split('-');
  var streamName = tmpStreamNumber[0];
  var chunkNumber = tmpStreamNumber[1];
  var beforeCompleteChunkName = streamName + '-' + (parseInt(chunkNumber) - 1).toString();
  var beforeCompleteChunk = beforeCompleteChunkName + '.ts';

  var cmd = "create-torrent --urlList '" + URL_CHUNKS + beforeCompleteChunk + "' " + beforeCompleteChunk  + ' > ' + beforeCompleteChunkName + ".torrent";
  exec(cmd, {cwd:'/HLS/live/'} ,function(err, stdout, stderr){
  if (err) {return console.log(err);}
  console.log(stdout);
  });


})
watcher.on('change', function(file, stats) {
  console.log(file + ' was changed')
})
watcher.on('delete', function(file) {
  console.log(file + ' was deleted')
})