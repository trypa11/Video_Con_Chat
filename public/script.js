const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myPeer = new Peer(undefined, {
  host: '/',
  port: '3001'
})
const myVideo = document.createElement('video')
const chatContainer = document.getElementById('chat-container')
const chatInput = document.getElementById('chat-input')
const shareButton = document.getElementById('share-button');
const snapshotButton = document.getElementById('snapshot-button');
const sharescrn = document.getElementById('screen-share-button');
const toggleSourceButton = document.getElementById('toggle-source-button');
const sscrnvideo=document.getElementById('sscrnvideo');
const audioButton = document.getElementById('sound_bar');  
const hangupButton = document.getElementById('hang-up');

 
let cameraStream;
 
 // Create an audio context
let audioContext = new (window.AudioContext || window.webkitAudioContext)();

let biquadFilter = audioContext.createBiquadFilter();
biquadFilter.type = "lowpass";
biquadFilter.frequency.value = 1000;

// Get the sound bar
let volumeBar = document.getElementById('frequency-bar');

// Update the gain value when the sound bar changes
volumeBar.addEventListener('input', function() {
  biquadFilter.frequency.value = this.value;
});


//set username 
//let username = prompt("Please enter your username");
//usernameInput.value = username;
myVideo.muted = true
const peers = {}
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
    // Create a source node from the stream
    let sourceNode = audioContext.createMediaStreamSource(stream);
    cameraStream = stream;

    // Connect the source node to the gain node
    sourceNode.connect(biquadFilter);
  
    // Connect the gain node to the destination so we can hear the sound
    biquadFilter.connect(audioContext.destination);
  addVideoStream(myVideo, stream)
  myPeer.on('call', call => {
    call.answer(stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream)
    })
  })
  socket.on('user-connected', userId => {
    connectToNewUser(userId, stream)
  })
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) {
    peers[userId].close()
  }
})

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id)
})
let numPeers = 0;

function connectToNewUser(userId, stream) {
  if (numPeers >= 4){
    return;
  }
  const call = myPeer.call(userId, stream);
  const video = document.createElement('video');
  video.id = `video-${userId}`;
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream);
  });
  call.on('close', () => {
    video.remove();
    numPeers--; 
  });
  peers[userId] = call;
  numPeers++; 
}
 
function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  videoGrid.append(video);
}

//chat
let messages = [];
 
chatInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault()
    const message = chatInput.value
    chatInput.value = ''
    const username = usernameInput.value
    const timestamp = new Date().toLocaleTimeString(); // Get current time
    socket.emit('send-chat-message', { message, username, timestamp })
  }
})
 
socket.on('chat-message', data => {
  messages.push({ username: data.username, message: data.message, timestamp: data.timestamp });
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
     
      messageElement.innerText = `${data.username} (${data.timestamp}): ${data.message}`;
    } else if (data.snapshot) {
      const imageElement = document.createElement('img');
      imageElement.src = data.snapshot;
      messageElement.append(document.createTextNode(`${data.username}: `));
      messageElement.append(imageElement);
    }
    chatContainer.appendChild(messageElement);
  });
  chatContainer.scrollTop = chatContainer.scrollHeight; //deixnei ta pio nea minimata
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



const filterSelect = document.getElementById('filter-select');

//snapshot button
snapshotButton.addEventListener('click', () => {
  const canvas = document.createElement('canvas');
  //canvas.width = myVideo.videoWidth;
  //canvas.height = myVideo.videoHeight;
  const snapshotWidth = 200; // Adjust this value as needed
  const snapshotHeight = 150; // Adjust this value as needed
  canvas.width = snapshotWidth;
  canvas.height = snapshotHeight;
  const context = canvas.getContext('2d');
  context.filter = filterSelect.value;
  context.drawImage(myVideo, 0, 0, canvas.width, canvas.height);
  const snapshot = canvas.toDataURL('image/png');
  const username = usernameInput.value;
  socket.emit('send-snapshot', { snapshot, username });
});



 
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

//screen share

const mySSPeer = new Peer(undefined, {
  host: '/',
  port: '3001'
})
const ShareScreen = document.createElement('video')
let sspeers = {}
sharescrn.addEventListener('click', () => {
navigator.mediaDevices.getDisplayMedia({
  video: true,
  audio: true
}).then(stream => {
  addSSVideoStream(ShareScreen, stream)
  mySSPeer.on('call', sscrean => {
    sscrean.answer(stream)
    const video = document.createElement('video');
    sscrean.on('stream', userVideoStream => {
      addSSVideoStream(video, userVideoStream);
    });
  })
  socket.on('user-connected-ss', userId => {
    connectToNewSS(userId, stream)
  })
})
})


socket.on('user-disconnected-ss', userId => {
  if (sspeers[userId]) {
    sspeers[userId].close()
  }
})

mySSPeer.on('open', id => {
  socket.emit('join-room-ss', ROOM_ID, id)
})

function connectToNewSS(userId, stream) {
  const call = mySSPeer.call(userId, stream);
  sspeers[userId] = call;
  }
   
  function addSSVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
      video.play();
    });
    sscrnvideo.append(video);
}






//-------------------------------------soundbar

const playButton = document.getElementById('play-button');
//const soundBar = document.getElementById('sound-bar');

// Define the sound file path
const soundFilePath = '../cr_suuu.mp3'; // Replace with the actual path



//------------------------------------morethanone


const playButton2 = document.getElementById('play-button2');

const playButton3 = document.getElementById('play-button3');

const soundFilePath2 = '../aa.mp3'; // Replace with the actual path

const soundFilePath3 = '../simp-over-girls-on-discord.mp3'; // Replace with the actual path


playButton2.addEventListener('click', () => {
  socket.emit('send-audio-message', soundFilePath2)
  //playSound(soundFilePath)
});


playButton3.addEventListener('click', () => {
  socket.emit('send-audio-message', soundFilePath3)
  //playSound(soundFilePath)
});


//--------------------------------------morethanoneend

playButton.addEventListener('click', () => {
  socket.emit('send-audio-message', soundFilePath)
  //playSound(soundFilePath)
});



socket.on('audio-message', data => {
  playSound(data)
})


function playSound(soundFilePath) {
  const audioElement = new Audio(soundFilePath);
  audioElement.play();
}

function updateSoundBar(audioContext, duration) {
  const startTime = audioContext.currentTime;
  const endTime = startTime + duration;

  function update() {
    const currentTime = audioContext.currentTime;
    const progress = (currentTime - startTime) / (endTime - startTime);

    // Update the width of the sound bar based on the progress
    //soundBar.style.width = `${progress * 100}%`;

    // Continue updating until the sound playback is finished
    if (currentTime < endTime) {
      requestAnimationFrame(update);
    } else {
      // Reset the sound bar after playback
      //soundBar.style.width = '0%';
    }
  }

  // Start updating the sound bar
  update();
}




//----------------------------------------------------------------------------------------------

function handleLogin(username, roomUUID) {
  let usernameInput = document.getElementById('username');
  if (!username) {
    alert('Please enter a username.');
    return;
  }
  if (!roomUUID) {
    roomUUID = uuid.v4();
  }
  usernameInput.value = username;
  window.location.href = "/"+roomUUID;
}
//----------------------------------------------------------------------------------------------
//hungout button
hangupButton.addEventListener('click', () => {
  // Disconnect the current peer
  myPeer.disconnect();
  // Redirect to home page
  window.location.href = "/";
});