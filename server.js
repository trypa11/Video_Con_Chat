const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true })) 



//----------------------------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.render('login');
});
//----------------------------------------------------------------------------------------------


app.post('/room', (req, res) => {
  const roomUUID = uuidV4();
  res.redirect(`/${roomUUID}`);
});

app.get('/:room', (req, res) => {
  const roomUUID = req.params.room;
  res.render('room', { roomId: req.params.room, roomUUID: roomUUID });
})


io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', userId)
    

    socket.on('send-chat-message', data => {
      io.emit('chat-message', data);
    });



    //sounbar------------
    socket.on('send-audio-message', adata => {
      io.emit('audio-message', adata); 
    });

    //-------------------
    

    socket.on('send-snapshot', data => {
      io.emit('snapshot', data);
    });


    //---------------------------

    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
})

server.listen(3000)