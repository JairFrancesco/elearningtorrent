var express = require('express');
var app = express();
var path = require('path');
var https = require('https');
var formidable = require('formidable');
var fs = require('fs');
var exec = require('child_process').exec;

//for HTTPS

var server = https.createServer({
      key: fs.readFileSync('/etc/letsencrypt/live/elearningp2p.ml/privkey.pem'),
      cert: fs.readFileSync('/etc/letsencrypt/live/elearningp2p.ml/fullchain.pem')
    }, app).listen(5000);

var io = require('socket.io')(server);

app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.get('/', function(req, res){
  res.send("Server for upload videos");
  //res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.post('/upload', function(req, res){

  // create an incoming form object
  var form = new formidable.IncomingForm();
  var fileNames = [];

  // specify that we want to allow the user to upload multiple files in a single request
  form.multiples = true;


  // store all uploads in the /videos directory
  //form.uploadDir = path.join(__dirname, '/videos');
  form.uploadDir = path.join('/usr/local/nginx/html/videos');
  // every time a file has been uploaded successfully,
  // rename it to it's orignal name
  form.on('file', function(field, file) {
    fs.rename(file.path, path.join(form.uploadDir, file.name));
    var filenamewext = file.name.split(".")[0];
    fileNames.push(filenamewext);

    //Cuando termine de subir el video, crear su respectivo .torrent
    var cmd = "create-torrent --urlList 'https://elearningp2p.ml/videos/" + file.name + "' " + file.name + " > ../torrents/" + filenamewext + ".torrent";
    exec(cmd, {cwd:'/usr/local/nginx/html/videos'} ,function(err, stdout, stderr){
      if (err) {return console.log(err);}
      console.log(stdout);
      console.log("Torrent Created");
    });
  });

  // log any errors that occur
  form.on('error', function(err) {
    console.log('An error has occured: \n' + err);
  });

  // once all the files have been uploaded, send a response to the client
  form.on('end', function() {
    //res.end('success');
    res.end(fileNames);
  });

  // parse the incoming request containing the form data
  form.parse(req);

});

var torrentsList = [];

//replace __dirname with the torrents folder
var torrentspath = '/usr/local/nginx/html/torrents';

function searchTorrents(){
  torrentsList = [];
  fs.readdir(torrentspath, function(err, items){
    console.log(items);
    items.forEach(function(item){
      torrentsList.push(item);
      console.log(item);
    });
  });  
}

io.on('connection', function(socket){
  socket.emit('torrents', torrentsList);
  socket.on('new torrent', function(data){
    console.log(data);
    searchTorrents();
  });
});
