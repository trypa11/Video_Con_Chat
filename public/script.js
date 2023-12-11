const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myPeer = new Peer(undefined, {
  host: '/',
  port: '3001'
})
const myVideo = document.createElement('video')

const filterSelect = document.querySelector('select#filter');
const chatContainer = document.getElementById('chat-container')
const chatInput = document.getElementById('chat-input')
const usernameInput = document.getElementById('username-input')
const shareButton = document.getElementById('share-button');
const snapshotButton = document.getElementById('snapshot-button');
const shareScreenBtn = document.getElementById('share-screen-btn');
shareScreenBtn.addEventListener('click', shareScreen);
const screenVideoGrid = document.getElementById('screen-video-grid');


let cameraStream;


//set username 
//let username = prompt("Please enter your username");
//usernameInput.value = username;

myVideo.muted = true
const peers = {}
let currentCall;

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  cameraStream = stream;
  addVideoStream(myVideo, stream)

  myPeer.on('call', call => {
    if (currentCall){
      currentCall.close();
    }

    call.answer(stream);
    //hangupButton.disabled = false;
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });
    currentCall = call;
  });

  socket.on('user-connected', userId => {
    if(currentCall){
      currentCall.close();
    }
    connectToNewUser(userId, stream)
  })
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) {
    peers[userId].close()
    removeVideoStream(userId)
  }
})

//chat
let messages = [];

chatInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault()
    const message = chatInput.value
    chatInput.value = ''
    const username = usernameInput.value
    socket.emit('send-chat-message', { message, username })
  }
})

socket.on('chat-message', data => {
  messages.push({username: data.username, message: data.message});
  displayMessages();
})

socket.on('snapshot', data => {
  messages.push({username: data.username, snapshot: data.snapshot});
  displayMessages();
});

function displayMessages() {
  chatContainer.innerHTML = '';
  messages.forEach(data => {
    const messageElement = document.createElement('div');
    if (data.message) {
      messageElement.innerText = `${data.username}: ${data.message}`;
    } else if (data.snapshot) {
      const imageElement = document.createElement('img');
      imageElement.src = data.snapshot;
      messageElement.append(document.createTextNode(`${data.username}: `));
      messageElement.append(imageElement);
    }
    chatContainer.append(messageElement);
  });
} 

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id)
})

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream)
  const video = document.createElement('video')
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream)
  })
  call.on('close', () => {
    video.remove()
    removeVideoStream(userId);
    endCall();
  })

  currentCall = call;
  peers[userId] = call
}

function addVideoStream(video, stream) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  videoGrid.append(video)
}
//share button
shareButton.addEventListener('click', () => {
  navigator.clipboard.writeText(window.location.href)
    .then(() => {
      alert('URL copied to clipboard');
    })
    .catch(err => {
      console.error('Could not copy text: ', err);
    });
});
//snapshot button
snapshotButton.addEventListener('click', () => {
  const canvas = document.createElement('canvas');
  canvas.width = myVideo.videoWidth;
  canvas.height = myVideo.videoHeight;
  const context = canvas.getContext('2d');
  context.drawImage(myVideo, 0, 0, canvas.width, canvas.height);
  const snapshot = canvas.toDataURL('image/png');
  const username = usernameInput.value;
  socket.emit('send-snapshot', { snapshot, username });
});

function shareScreen() {
  navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: "always"
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 44100
    }
  }).then(stream => {
    const screenTrack = stream.getTracks()[0];
    screenTrack.onended = function() {
      stopScreenShare();
    };
    const videoTracks = cameraStream.getVideoTracks()[0];
    if (currentCall) {
      currentCall.peerConnection.getSenders().find(function(s) {
        return s.track.kind === videoTracks.kind;
      }).replaceTrack(screenTrack);
    }
    // Add the shared screen video to the screen video grid
    const screenVideo = document.createElement('video');
    screenVideo.srcObject = stream;
    screenVideo.addEventListener('loadedmetadata', () => {
      screenVideo.play();
    });
    screenVideoGrid.append(screenVideo);
    // Emit a 'share-screen' event to the server
    socket.emit('share-screen');

    for (let peerId in peers) {
      connectToNewUser(peerId, stream);
    }
  });
}
socket.on('share-screen', () => {
  // Handle the 'user-shared-screen' event from the server
  const screenVideo = document.createElement('video');
  screenVideo.srcObject = stream;
  screenVideo.addEventListener('loadedmetadata', () => {
    screenVideo.play();
  });
  screenVideoGrid.append(screenVideo);
});
socket.on('stop-share-screen', () => {
  // Handle the 'user-stopped-screen' event from the server
  const screenVideo = screenVideoGrid.querySelector('video[srcObject]');
  if (screenVideo) {
    screenVideoGrid.removeChild(screenVideo);
  }
});

function stopScreenShare() {
  const videoTracks = cameraStream.getVideoTracks()[0];
  if (currentCall) {
    currentCall.peerConnection.getSenders().find(function(s) {
      return s.track.kind === videoTracks.kind;
    }).replaceTrack(videoTracks);
  }
  // Remove the shared screen video from the screen video grid
  const screenVideo = screenVideoGrid.querySelector('video[srcObject]');
  if (screenVideo) {
    screenVideoGrid.removeChild(screenVideo);
  }
  // Emit a 'stop-share-screen' event to the server
  socket.emit('stop-share-screen');
}





//-------------------------------------------------------------------------------------






const toggleCameraBtn = document.getElementById('toggle-camera-btn');
toggleCameraBtn.addEventListener('click', toggleCamera);

function toggleCamera(){ //energopoihsh-apenergopoihsh kameras
  if(cameraStream){
    const tracks = cameraStream.getVideoTracks();

    tracks.forEach(track => track.enabled = !track.enabled);

    const isCameraEnabled = tracks[0].enabled;
    toggleCameraBtn.textContent = isCameraEnabled ? 'Disable Camera' : 'Enable Camera';
  }
}

const toggleMicBtn = document.getElementById('toggle-mic-btn'); //energopoihsh-apenergopoihsh mic
toggleMicBtn.addEventListener('click', toggleMicrophone);

function toggleMicrophone(){
  if (cameraStream){
    const audioTracks = cameraStream.getAudioTracks();

    audioTracks.forEach(track=>{
      track.enabled = !track.enabled;
    });

    const isMicEnabled = audioTracks[0].enabled;
    toggleMicBtn.textContent = isMicEnabled ? 'Disable Microphone' : 'Enable Microphone';
  }
}