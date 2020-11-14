const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const h = require('hyperscript');
const crypto = require('crypto');
const Room = require('./room');

app.use(express.static('public'));
app.use('/socket.io', express.static('node_modules/socket.io-client/dist'));

app.get('/', (req, res) => {
  res.send(h('html',
    h('head'),
    h('body',
      h('a', { href: '/rooms/new' }, 'create new room.'))).outerHTML);
});

app.get('/rooms/new', (req, res) => {
  const room = new Room({
    key: crypto.randomBytes(16).toString('hex'),
    token: crypto.randomBytes(16).toString('hex'),
    state: 'READY',
    targetTime: new Date().getTime(),
  });

  Promise.resolve().then(() => {
    return room.save();
  }).then(() => {
    res.redirect('/rooms/' + room.key + '?token=' + room.token);
  });
});

app.get('/rooms/:roomId', async (req, res) => {
  const room = await Room.find(req.params.roomId);

  res.send(h('html', { lang: 'en' },
    h('head', { prefix: 'og: http://ogp.me/ns#' },
      h('title', 'Lightning Talk Timer'),
      h('meta', { charset: 'utf-8' }),
      h('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1, shrink-to-fit=no' }),
      h('meta', { name: 'description', content: 'Lightning Talk Remote Timer' }),
      h('meta', { name: 'twitter:card', content: 'Lightning Talk Remote Timer' }),
      h('link', {
        rel: 'stylesheet',
        integrity: 'sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T',
        crossorigin: 'anonymous',
        href: 'https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css'
      }),
      h('script', { type: 'text/javascript', src: '/socket.io/socket.io.js' }),
      h('script', { type: 'text/javascript', src: '/application.js' })),
    h('body.d-flex.flex-column.h-100',
      h('script', { type: 'text/javascript' }),
      h('.main',
        h('div.container-fluid.mt-3',
          h('div.progress', { style: 'height: 4vw;' },
            h('div#progress.progress-bar.progress-bar-striped', { style: 'width: 100%;' })),
          h('h1#timer.display-3', { 'data-room-id': room.key, 'data-room-token': req.query.token || '', 'data-room-state': room.state, 'data-room-target-time': room.targetTime, style: 'text-align: center; font-size: 36vw; font-family: Menlo;' },
            h('span#minutes', { style: 'letter-spacing: -2vw;' }, '00'),
            h('span#separator', ':', { style: 'margin: auto -6vw auto -4vw' }),
            h('span#seconds', { style: 'letter-spacing: -2vw;' }, '00')))),
      h('.footer.mt-auto.py-3',
        h('div.container-fluid.mt-3',
          h('button#start.btn.btn-outline-success.btn-lg.btn-block', 'Start'),
          h('button#reset.btn.btn-outline-danger.btn-lg.btn-block', 'Reset')
        )))).outerHTML);
});

io.on('connection', (socket) => {
  socket.on('joinroom', (data) => {
    socket.join('room-' + data.roomId || '');
  });

  socket.on('reset', async (data) => {
    const room = await Room.find(data.roomId);

    await room.update({
      state: 'READY',
    });

    socket.to('room-' + data.roomId || '').emit('reset', {});
  });

  socket.on('start', async (data) => {
    const room = await Room.find(data.roomId);

    await room.update({
      state: 'RUNNING',
      targetTime: data.targetTime,
    });

    socket.to('room-' + data.roomId || '').emit('start', { targetTime: data.targetTime });
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log('Example app listening on port 3000!')
});
