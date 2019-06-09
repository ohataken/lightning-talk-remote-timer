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
  res.send(h('html', { lang: 'en' },
    h('head', { prefix: 'og: http://ogp.me/ns#' },
      h('title', 'Lightning Talk Timer'),
      h('meta', { charset: 'utf-8' }),
      h('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1, shrink-to-fit=no' }),
      h('meta', { property: 'og:url', content: 'https://lightning-talk-remote-timer.herokuapp.com/rooms/' + req.params.roomId }),
      h('meta', { property: 'og:type', content: 'article' }),
      h('meta', { property: 'og:title', content: req.params.roomId }),
      // h('meta', { property: 'og:description', content: '' }),
      h('meta', { property: 'og:site_name', content: 'Lightning Talk Remote Timer' }),
      h('link', {
        rel: 'stylesheet',
        integrity: 'sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T',
        crossorigin: 'anonymous',
        href: 'https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css'
      }),
      h('script', { type: 'text/javascript', src: '/socket.io/socket.io.js' }),
      h('script', { type: 'text/javascript', src: '/application.js' })),
    h('body',
      h('script', { type: 'text/javascript' }),
      h('div.container-fluid.mt-3',
        h('div.progress',
          h('div#progress.progress-bar.progress-bar-striped', { style: 'width: 100%' })),
        h('h1#timer.display-3', { 'data-room-id': 'wE6zWkQc', 'data-room-token': req.query.token, style: 'text-align: center; font-size: 18vw; font-family: Monaco;' }, '00:00:00'),
        h('button#start.btn.btn-success.btn-lg.btn-block', 'Start'),
        h('button#reset.btn.btn-danger.btn-lg.btn-block', 'Reset'),
      ))).outerHTML);
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
