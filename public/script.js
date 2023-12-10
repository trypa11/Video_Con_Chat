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
//const hangupButton = document.getElementById('hangupButton');
//hangupButton.disabled = true;


filterSelect.onchange = function() {
  myVideo.className = filterSelect.value;
};
myVideo.muted = true
const peers = {}
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  addVideoStream(myVideo, stream)

  //const filteredStream = canvas.captureStream();
  myPeer.on('call', call => {
    call.answer(stream);
    //hangupButton.disabled = false;
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });
  });

  socket.on('user-connected', userId => {
    connectToNewUser(userId, stream)
  })
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close()
})
//chat
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
  const messageElement = document.createElement('div')
  messageElement.innerText = `${data.username}: ${data.message}`
  chatContainer.append(messageElement)
})

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
  })

  peers[userId] = call
}
/*function hangup() {
  console.log('Ending call');
  for (const userId in peers) {
    peers[userId].close();
    delete peers[userId];
  }
  hangupButton.disabled = true;
}*/
function addVideoStream(video, stream) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  videoGrid.append(video)
}




//-------------------------------------------------------------------------------------
