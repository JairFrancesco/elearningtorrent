'use strict';

var socket = io.connect('https://elearningp2p.ml:7000');
var cola = new Queue();

var
  $ = document.querySelector.bind(document),
  inputs = $('#inputs'),
  streamButton = $('#Stream'),
  torrentLink = $('#torrentLink'),
  vjsParsed,
  vjsBytes,
  saveConfig,
  restoreConfig,
  muxedData,
  muxedName,
  transmuxer,
  video,
  mediaSource,
  logevent,
  prepareSourceBuffer;

logevent = function(event) {
  console.log(event.type);
};

saveConfig = function () {
  var inputs = [].slice.call(document.querySelectorAll('input:not([type=file])'));

  inputs.forEach(function (element) {
    localStorage.setItem(element.id,
      JSON.stringify({
      value: element.value,
      checked: element.checked,
      disabled: element.disabled
    }));
  });
};

restoreConfig = function () {
  var inputs = [].slice.call(document.querySelectorAll('input:not([type=file])'));

  inputs.forEach(function (element) {
    var state;

    state = JSON.parse(localStorage.getItem(element.id));
    if (state) {
      element.checked = state.checked;
      element.value = state.value;
      element.disabled = state.disabled;
    }
  });
};
document.addEventListener('DOMContentLoaded', restoreConfig);

prepareSourceBuffer = function(combined, outputType, callback) {
  var
    buffer,
    codecs,
    codecsArray,
    resetTransmuxer = false;
    //resetTransmuxer = $('#reset-tranmsuxer').checked;

  if (typeof combined === 'function') {
    callback = combined;
    combined = true;
  }

  // Our work here is done if the sourcebuffer has already been created
  if (!resetTransmuxer && window.vjsBuffer) {
    return callback();
  }

  video = document.createElement('video');
  video.controls = true;
  mediaSource = new MediaSource();
  video.src = URL.createObjectURL(mediaSource);
  window.vjsVideo = video;
  window.vjsMediaSource = mediaSource;
  $('#video-place').innerHTML = '';
  $('#video-place').appendChild(video);

  mediaSource.addEventListener('error', logevent);
  mediaSource.addEventListener('opened', logevent);
  mediaSource.addEventListener('closed', logevent);
  mediaSource.addEventListener('sourceended', logevent);

  codecs = $('#codecs');
  codecsArray = codecs.value.split(',');

  mediaSource.addEventListener('sourceopen', function () {
    mediaSource.duration = 0;
    if (combined) {
      buffer = mediaSource.addSourceBuffer('video/mp4;codecs="' + codecs.value + '"');
    } else if (outputType === 'video') {
      buffer = mediaSource.addSourceBuffer('video/mp4;codecs="' + codecsArray[0] + '"');
    } else if (outputType === 'audio') {
      buffer = mediaSource.addSourceBuffer('audio/mp4;codecs="' + (codecsArray[1] ||codecsArray[0]) + '"');
    }

    buffer.addEventListener('updatestart', logevent);
    buffer.addEventListener('updateend', logevent);
    buffer.addEventListener('error', logevent);
    window.vjsBuffer = buffer;

    video.addEventListener('error', logevent);
    video.addEventListener('error', function() {
      document.getElementById('video-place').classList.add('error');
    });

    return callback();
  });
};

function appendStream(buffer)
{
  if (err) throw err;
  console.log(buffer);
  var segment = new Uint8Array(buffer),
      combined = document.querySelector('#combined-output').checked,
      outputType = document.querySelector('input[name="output"]:checked').value,
      resetTransmuxer = false,//$('#reset-tranmsuxer').checked,
      remuxedSegments = [],
      remuxedInitSegment = null,
      remuxedBytesLength = 0,
      createInitSegment = false,
      bytes,
      i, j;
  if (resetTransmuxer || !transmuxer) {
    createInitSegment = true;
    if (combined) {
        outputType = 'combined';
        transmuxer = new muxjs.mp4.Transmuxer();
    } else {
        transmuxer = new muxjs.mp4.Transmuxer({remux: false});
    }

    transmuxer.on('data', function(event) {
      if (event.type === outputType) {
        remuxedSegments.push(event);
        remuxedBytesLength += event.data.byteLength;
        remuxedInitSegment = event.initSegment;
      }
    });

    transmuxer.on('done', function () {
      var offset = 0;
      if (createInitSegment) {
        bytes = new Uint8Array(remuxedInitSegment.byteLength + remuxedBytesLength)
        bytes.set(remuxedInitSegment, offset);
        offset += remuxedInitSegment.byteLength;
        createInitSegment = false;
      } else {
        bytes = new Uint8Array(remuxedBytesLength);
      }

      for (j = 0, i = offset; j < remuxedSegments.length; j++) {
        bytes.set(remuxedSegments[j].data, i);
        i += remuxedSegments[j].byteLength;
      }
      muxedData = bytes;
      remuxedSegments = [];
      remuxedBytesLength = 0;
      vjsBytes = bytes;
      prepareSourceBuffer(combined, outputType, function () {
        console.log('appending...');
        window.vjsBuffer.appendBuffer(bytes);
        video.play();
      });
    });
  }
  transmuxer.push(segment);
  transmuxer.flush();
}

function playChunk(torrentId)
{
  var client = new WebTorrent();
  client.add(torrentId, function (torrent) {
    var file = torrent.files[0]
    file.getBuffer(function(err, buffer){
      var nextTorrent = cola.dequeue();
      appendStream(nextTorrent);
    });
    //muxedName = this.files[0].name.replace('.ts', '.f4m');
  });
}

socket.on('chunk', function (data) {
  console.log(data);
  cola.enqueue(data) //Encolar el .torrent recibido
  var torrentId = data;
  if (torrentId=="")
  {
    return; 
  }
});

socket.on('play-stream', function(data){
  playChunk(data);
});

$('#combined-output').addEventListener('change', function () {
    Array.prototype.slice.call(document.querySelectorAll('[name="output"'))
      .forEach(function (el) {
        el.disabled = this.checked;
      }, this);
});

[].slice.call(document.querySelectorAll('input')).forEach(function(el){
  el.addEventListener('change', saveConfig);
});