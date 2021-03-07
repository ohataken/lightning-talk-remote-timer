const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const h = require('hyperscript');
const crypto = require('crypto');
const Redis = require('ioredis');
const redisPub = new Redis(process.env.REDIS_URL);
const Room = require('./room');

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/socket.io', express.static('node_modules/socket.io-client/dist'));

app.get('/', (req, res) => {
  res.send(h('html', { lang: 'en'} ,
    h('head', { prefix: 'og: http://ogp.me/ns#' },
      h('title', 'Lightning Talk Timer'),
      h('meta', { charset: 'utf-8' }),
      h('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1, shrink-to-fit=no' }),
      h('meta', { name: 'description', content: 'Lightning Talk Remote Timer' }),
      h('meta', { name: 'twitter:card', content: 'summary_large_image' }),
      h('link', {
        rel: 'stylesheet',
        integrity: 'sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T',
        crossorigin: 'anonymous',
        href: 'https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css'
      })),
    h('body.d-flex.flex-column.h-100',
      h('.main',
        h('.space', { style: "margin: 30px auto;" }),
        h('.container',
          h('.jumbotron',
            h('h1.display-2', 'Lightning Talk Timer'),
            h('p.lead', '発表者は簡単に時間を把握できるように、司会者は時間を管理できるようになります。'),
            h('p', 
              h('img.img-fluid', { src: '/20210307044226_demo.jpg' })),
            h('p', 
              h('a.btn.btn-outline-primary.btn-lg.btn-block.mt-5', { href: '/rooms/new' }, '5分のタイマーを作成する')),
            h('p', 
              h('a.btn.btn-outline-primary.btn-lg.btn-block.mt-5', { href: '/rooms/new?minutes=3' }, '3分のタイマーを作成する')))),

        h('.container',
          h('.card.my-3',
            h('.card-header', '機能 1'),
            h('.card-body',
              h('h5.card-title', '開始・停止が同期するタイマー'),
              h('p.card-text', 'タイマーの操作がほかのユーザーが見ているタイマーへ同期します。司会者がタイマーを操作することで、発表者や視聴者は手元で残り時間を把握しやすくなります。')))),

        h('.container',
          h('.card.my-3',
            h('.card-header', '機能 2'),
            h('.card-body',
              h('h5.card-title', 'タイマーをスタート・リセットできるのはオーナーだけ'),
              h('p.card-text', 'URL にトークンが付いているタイマーを開いている人はオーナーです。それ以外の人はタイマーをスタート・リセットできないので、司会・進行を乱されることがありません。')))),   

        h('.container',
          h('.card.my-3',
            h('.card-header', '機能 3'),
            h('.card-body',
              h('h5.card-title', '手元のスマホでも、会場の大型モニタでも見やすい文字盤'),
              h('p.card-text', '文字サイズを vw 単位を使って指定することで、どんな大きさのモニタでも文字が画面いっぱいに表示されます。')))),

        h('.container', 
          h('.card.my-3', 
            h('.card-header', '機能 4'),
            h('.card-body', 
              h('h5.card-title', 'スクリーンセーバーやオートスリープをブロック'),
              h('p.card-text', 'タイマーの動作中に、背景で小さな動画を再生することでスクリーンセーバーやオートスリープを防ぎます。タイマーが表示されなくなる、操作できなくなる、などのトラブルを防ぎます。')))),

        h('.container', 
          h('.card.my-3', 
            h('.card-header', '機能 5'),
            h('.card-body', 
              h('h5.card-title', 'API による時間設定'),
              h('p.card-text', 'GET /api/rooms/:roomId'),
              h('p.card-text', 'タイマーの設定を取得します。 id, state, targetTime, minutes, seconds, milliseconds を含む JSON を返します。'),
              h('p.card-text', '$ curl https://lightning-talk-remote-timer.herokuapp.com/api/rooms/09abcdef'),
              h('p.card-text', 'PUT /api/rooms/:roomId'),
              h('p.card-text', 'タイマーの設定を変更します。リクエストボディには token, minutes, seconds を受け入れます。 token が一致しない場合、操作は無効になります。'),
              h('p.card-text', '$ curl https://lightning-talk-remote-timer.herokuapp.com/api/rooms/09abcdef -XPUT -d "token=00000000&minutes=3&seconds=0"'),))),

        h('.footer.mt-auto.py-3', { style: "background-color: white;" },
          h('div.container',
            h('span', '@ohataken. '),
            h('a', { href: 'https://github.com/ohataken/' }, 'GitHub'), 
            h('span', ', '),
            h('a', { href: 'https://twitter.com/ohataken' }, 'Twitter'),),

          )))).outerHTML);
});

app.get('/rooms/new', (req, res) => {
  const room = new Room({
    key: crypto.randomBytes(16).toString('hex'),
    token: crypto.randomBytes(16).toString('hex'),
    state: 'READY',
    minutes: parseInt(req?.query.minutes),
    seconds: parseInt(req?.query.seconds),
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
      h('meta', { name: 'twitter:card', content: 'summary_large_image' }),
      h('link', {
        rel: 'stylesheet',
        integrity: 'sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T',
        crossorigin: 'anonymous',
        href: 'https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css'
      }),
      h('script', { type: 'text/javascript', src: '/socket.io/socket.io.js' }),
      h('script', { type: 'text/javascript', src: 'https://cdnjs.cloudflare.com/ajax/libs/nosleep/0.12.0/NoSleep.min.js' }),
      h('script', { type: 'text/javascript', src: '/application.js' })),
    h('body.d-flex.flex-column.h-100',
      h('.main', { style: "background-color: white;" },
        h('div.container-fluid.mt-3',
          h('div.progress', { style: 'height: 4vw;' },
            h('div#progress.progress-bar.progress-bar-striped', { style: 'width: 100%;' })),
          h('h1#timer.display-3', { 'data-room-id': room.key, 'data-room-token': req.query.token || '', 'data-room-state': room.state, 'data-room-minutes': room.minutes || 5, 'data-room-seconds': room.seconds || 0, 'data-room-target-time': room.targetTime, style: 'text-align: center; font-size: 40vw; font-family: Menlo;' },
            h('span#minutes', { style: 'letter-spacing: -4vw;' }, '00'),
            h('span#separator', ':', { style: 'margin: auto -10vw auto -6vw' }),
            h('span#seconds', { style: 'letter-spacing: -4vw;' }, '00')))),
      h('.footer.mt-auto.py-3', { style: "background-color: white;" },
        h('div.container-fluid.mt-3',
          h('.btn-toolbar', 
            h('.input-group.mx-5', 
              h('.input-group-prepend',
                h('.input-group-text', 'Share'),), 
                h('input.form-control.form-control-lg', { type: 'text', value: `https://lightning-talk-remote-timer.herokuapp.com/rooms/${req.params.roomId}`, })),
            h('.btn-group', { role: 'group' },
              h('button#start.btn.btn-success.btn-lg', { type: 'button' }, 'Start'),
              h('button#reset.btn.btn-danger.btn-lg', { type: 'button' }, 'Reset'),
              h('button#fullscreen.btn.btn-primary.btn-lg', { type: 'button' }, 'Fullscreen'),), ), )))).outerHTML);
});

app.get('/api/rooms/:roomId', async (req, res) => {
  const room = await Room.find(req.params.roomId);

  res.send(JSON.stringify({
    id: room.key,
    state: room.state,
    targetTime: room.targetTime,
    minutes: room.minutes,
    seconds: room.seconds,
    milliseconds: room.milliseconds,
  }));
});

app.put('/api/rooms/:roomId', async (req, res) => {
  const room = await Room.find(req.params.roomId);

  if (room.token !== req?.body?.token) {
    return res.send(JSON.stringify({
      data: {
      },
    }));
  }

  await room.update({
    minutes: (() => {
      if (req?.body?.minutes) {
        const num = parseInt(req?.body?.minutes);
        return 0 <= num && num <= 99 ? num : room.minutes;
      } else {
        return room.minutes;
      }
    })(),
    seconds: (() => {
      if (req?.body?.seconds) {
        const num = parseInt(req?.body?.seconds);
        return 0 <= num && num <= 59 ? num : room.seconds;
      } else {
        return room.seconds;
      }
    })(),
  });

  redisPub.publish('timeModified', room.key);

  res.send(JSON.stringify({
    data: room,
  }));
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

  const redis = new Redis(process.env.REDIS_URL);

  redis.subscribe('timeModified', (err, count) => {
    redis.on('message', async (channel, message) => {
      if (channel === 'timeModified') {
        const room = await Room.find(message);
        socket.to('room-' + room.key || '').emit('timeModified', { minutes: room.minutes, seconds: room.seconds });
      }
    });
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log('Example app listening on port 3000!')
});
