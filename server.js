const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')

app.set('view engine', 'ejs')
app.use(express.static('public'))


app.get('/', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room })
})

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', userId)

    socket.on('send-chat-message', data => {
      io.emit('chat-message', data); 
    });

    socket.on('share-screen', () => {
      socket.to(roomId).broadcast.emit('user-shared-screen', userId);
    });
    socket.on('stop-share-screen', () => {
      socket.to(roomId).broadcast.emit('user-stopped-screen', userId);
    });
    
    socket.on('send-snapshot', data => {
      io.emit('snapshot', data);
    });

    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
})

server.listen(3000)