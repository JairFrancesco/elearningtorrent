var http = require("http");

http.createServer(function (request, response) {

   // Send the HTTP header 
   // HTTP Status: 200 : OK
   // Content Type: text/plain
   response.writeHead(200, {'Content-Type': 'text/plain'});
   
   // Send the response body as "Hello World"
   response.end('Hello World\n');
}).listen(8081);

// Console will print the message
console.log('Server running at http://127.0.0.1:8081/');

hound = require('hound')

// Create a directory tree watcher.
watcher = hound.watch('/HLS/live')

// Create a file watcher.
//watcher = hound.watch('/tmp/file.txt')

var exec = require('child_process').exec;

// Add callbacks for file and directory events.  The change event only applies
// to files.
watcher.on('create', function(file, stats) {
  //This is for convert the before video from ts to mp4 and create the torrents
  //console.log(stats);
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
  var newmp4file = beforeCompleteChunkName  + '.mp4';
  var beforeCompleteChunk = beforeCompleteChunkName + '.ts'
  console.log(newmp4file);
  var cmd = '/home/ubuntu/bin/ffmpeg -y -i ' + beforeCompleteChunk + ' -c:v copy ' + '/usr/local/nginx/html/videos/' + newmp4file;
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
