var client = new WebTorrent()

var torrentLink = 'https://elearningp2p.ml/torrents/jair-122.torrent'
var currentTorrent = torrentLink;
var refreshIntervalId;

//console.log(window.location.href);
//This part load the list torrents to the main page
/*
var currentUrl = window.location;
var socket = io.connect('https://elearningp2p.ml:5000');
  socket.on('torrents', function (data) {
  console.log(data);
  for (var i = 0; i<data.length;i++)
  {
	console.log(data[i]);
	$('#torrents').append($('<li>').append('<a href="#output" class="torrentLinks">' + currentUrl + 'torrents/' + data[i] + '</a>'));
  };
    //socket.emit('my other event', { my: 'data' });
  });

$(document).ready(function(){
	console.log("Inicio");
	$('#torrents').on('click','.torrentLinks',function(){
		client.destroy();
		client = new WebTorrent();
		clearInterval(refreshIntervalId);
		downloadSelectedTorrent($(this).text());
	});
});
*/

 function downloadData(url, cb) {
    console.log("Downloading " + url);

    var xhr = new XMLHttpRequest;
    xhr.open('get', url);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function () {
        cb(new Uint8Array(xhr.response));
    };
    xhr.send();
}

//Verificar si el codec mp4 esta soportado, (por el momento parece que si)
if (MediaSource.isTypeSupported('video/mp4; codecs="avc1.64001E"')) {
    console.log("mp4 codec supported");
}

var codec = 'video/mp4; codecs="avc1.64001E"'

//$timeout(loadMediaSource, 500)
function loadMediaSource(buffer) {
  var video = document.querySelector('#videoPlayer')

  window.MediaSource = window.MediaSource || window.WebKitMediaSource;

  if (!!!window.MediaSource) {
    alert('MediaSource API is not available');
  }

  var mediaSource = new MediaSource();

  video.src = window.URL.createObjectURL(mediaSource);

  mediaSource.addEventListener('sourceopen', function(e) {
    //var sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vorbis,vp8"');
    var sourceBuffer = mediaSource.addSourceBuffer(codec);

    sourceBuffer.addEventListener('updatestart', function(e) {
      console.log(e);
    }, false);


    sourceBuffer.appendBuffer(buffer);
    //sourceBuffer.appendBuffer(new Uint8Array(data));
    /*(function(sb) {
      Socket.on('media:chunk', function(data) {
        sb.appendBuffer(new Uint8Array(data));
      });
    })(sourceBuffer);*/
  }, false);
}



// HTML elements
var $body = document.body
var $progressBar = document.querySelector('#progressBar')
var $numPeers = document.querySelector('#numPeers')
var $downloaded = document.querySelector('#downloaded')
var $total = document.querySelector('#total')
var $remaining = document.querySelector('#remaining')
var $uploadSpeed = document.querySelector('#uploadSpeed')
var $downloadSpeed = document.querySelector('#downloadSpeed')

function downloadSelectedTorrent(torrentId){
  console.log(torrentId);

  currentTorrent = torrentId;
  // Download the torrent
  client.add(torrentId, function (torrent) {

    // Stream the file in the browser
    //torrent.files[0].renderTo('#videoPlayer')

    torrent.files[0].getBuffer(function (err, buffer){
      if (err) throw err;
      console.log(buffer);
      loadMediaSource(buffer);
    });

    // Trigger statistics refresh
    torrent.on('done', onDone)
    refreshIntervalId = setInterval(onProgress, 500)
    onProgress()
    
    // Statistics
    function onProgress () {
      // Peers
      $numPeers.innerHTML = torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers')

      // Progress
      var percent = Math.round(torrent.progress * 100 * 100) / 100
      $progressBar.style.width = percent + '%'
      $downloaded.innerHTML = prettyBytes(torrent.downloaded)
      $total.innerHTML = prettyBytes(torrent.length)

      // Remaining time
      var remaining
      if (torrent.done) {
        remaining = 'Done.'
      } else {
        remaining = moment.duration(torrent.timeRemaining / 1000, 'seconds').humanize()
        remaining = remaining[0].toUpperCase() + remaining.substring(1) + ' remaining.'
      }
      $remaining.innerHTML = remaining
      
      // Speed rates
      $downloadSpeed.innerHTML = prettyBytes(torrent.downloadSpeed) + '/s'
      $uploadSpeed.innerHTML = prettyBytes(torrent.uploadSpeed) + '/s'
    }
    function onDone () {
      $body.className += ' is-seed'
      onProgress()
    }
  })
};

// Human readable bytes util
function prettyBytes(num) {
	var exponent, unit, neg = num < 0, units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
	if (neg) num = -num
	if (num < 1) return (neg ? '-' : '') + num + ' B'
	exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
	num = Number((num / Math.pow(1000, exponent)).toFixed(2))
	unit = units[exponent]
	return (neg ? '-' : '') + num + ' ' + unit
}

downloadSelectedTorrent(torrentLink);