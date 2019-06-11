const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const h = require('hyperscript');
const crypto = require('crypto');
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

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

app.get('/rooms/new', (req, res) => {
  const id = crypto.randomBytes(16).toString('hex');
  const room = {
    token: crypto.randomBytes(16).toString('hex'),
    state: 'READY',
    targetTime: new Date().getTime(),
  };

  Promise.resolve().then(() => {
    return new Promise((resolve, reject) => {
      return redis.hmset(id, room, (err, result) => {
        return err ? reject(err) : resolve(result);
      });
    });
  }).then(() => {
    res.redirect('/rooms/' + id + '?token=' + room.token);
  });
});

app.get('/rooms/:roomId', async (req, res) => {
  const room = await new Promise((resolve, reject) => {
    return redis.hgetall(req.params.roomId, (err, result) => {
      return err ? reject(err) : resolve(result);
    });
  });

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
    h('body',
      h('script', { type: 'text/javascript' }),
      h('div.container-fluid.mt-3',
        h('div.progress',
          h('div#progress.progress-bar.progress-bar-striped', { style: 'width: 100%' })),
        h('h1#timer.display-3', { 'data-room-id': req.params.roomId, 'data-room-token': req.query.token, 'data-room-state': room.state, 'data-room-target-time': room.targetTime, style: 'text-align: center; font-size: 26vw; font-family: Monaco;' }, '00:00'),
        h('button#start.btn.btn-success.btn-lg.btn-block', 'Start'),
        h('button#reset.btn.btn-danger.btn-lg.btn-block', 'Reset'),
      ))).outerHTML);
});

io.on('connection', (socket) => {
  socket.on('joinroom', (data) => {
    socket.join('room-' + data.roomId || '');
  });

  socket.on('reset', async (data) => {
    const room = await new Promise((resolve, reject) => {
      return redis.hgetall(data.roomId, (err, result) => {
        return err ? reject(err) : resolve(result);
      });
    });

    await new Promise((resolve, reject) => {
      return redis.hmset(data.roomId, Object.assign(room, {
        state: 'READY',
      }), (err, result) => {
        return err ? reject(err) : resolve(result);
      });
    });

    socket.to('room-' + data.roomId || '').emit('reset', {});
  });

  socket.on('start', async (data) => {
    const room = await new Promise((resolve, reject) => {
      return redis.hgetall(data.roomId, (err, result) => {
        return err ? reject(err) : resolve(result);
      });
    });

    await new Promise((resolve, reject) => {
      return redis.hmset(data.roomId, Object.assign(room, {
        state: 'RUNNING',
        targetTime: data.targetTime,
      }), (err, result) => {
        return err ? reject(err) : resolve(result);
      });
    });

    socket.to('room-' + data.roomId || '').emit('start', { targetTime: data.targetTime });
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log('Example app listening on port 3000!')
});
