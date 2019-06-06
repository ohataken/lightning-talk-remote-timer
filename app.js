const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const h = require('hyperscript');

app.use(express.static('public'));
app.use('/socket.io', express.static('node_modules/socket.io-client/dist'));

app.get('/', (req, res) => {
  res.send(h('html',
    h('head'),
    h('body',
      h('ol',
        h('li',
          h('a', { href: '/rooms/kkkk' }, 'kkkk'))))).outerHTML);
});

app.get('/rooms/:roomId', (req, res) => {
  res.send(h('html',
    h('head',
      h('title', 'Lightning Talk Timer'),
      h('script', { type: 'text/javascript', src: '/socket.io/socket.io.js' }),
      h('script', { type: 'text/javascript', src: '/application.js' })),
    h('body',
      h('script', { type: 'text/javascript' }),
      h('div#header',
        h('h1', 'Timer')),
      h('div#timer', { 'data-room-id': 'wE6zWkQc', 'data-room-token': req.query.token }, 'init'),
      h('div#control',
        h('input#minutes', { type: 'number', min: '0', max: '60' }),
        h('input#reset', { type: 'submit', value: 'Reset' }),
        h('input#start', { type: 'submit', value: 'Start' })))).outerHTML);
});

io.on('connection', (socket) => {
  socket.on('joinroom', (data) => {
    socket.join('room-' + data.roomId || '');
  });

  socket.on('reset', (data) => {
    socket.to('room-' + data.roomId || '').emit('reset', { targetTime: data.targetTime });
  });

  socket.on('start', (data) => {
    socket.to('room-' + data.roomId || '').emit('start', { targetTime: data.targetTime });
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log('Example app listening on port 3000!')
});
