var client = new WebTorrent()

var torrentLink = 'https://elearningp2p.ml/torrents/time-drift-4k-vp9.torrent'
var currentTorrent = torrentLink;
var refreshIntervalId;

//console.log(window.location.href);
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
    torrent.files[0].renderTo('#videoPlayer')

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
