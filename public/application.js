(() => {
  const Timer = (() => {
    const constructor = function () {
      this.targetTime = new Date();
    };

    constructor.prototype = {
      createOffsetDate: function (msec, seconds, minutes) {
        return new Date(new Date().getTime()
          + msec
          + seconds * 1000
          + minutes * 1000 * 60);
      },

      setTargetTimeByOffset: function (msec, seconds, minutes) {
        this.targetTime = this.createOffsetDate(msec, seconds, minutes);
      },

      calcElapedTime: function (elapsed) {
        return [
          ('0' + Math.floor(elapsed / 1000 / 60 % 60)).slice(-2),
          ('0' + Math.floor(elapsed / 1000 % 60)).slice(-2),
          ('0' + Math.floor(elapsed % 60)).slice(-2),
        ].join(':');
      },

      isOver: function () {
        return this.targetTime < new Date();
      },

    };

    return constructor;
  })();

  const TimerView = (() => {
    const constructor = function (options) {
      this.roomId = options.roomId;
      this.token = options.roomToken;
      this.state = options.state || 'READY';
      this.socket = io();
      this.elDisplay = options.elDisplay;
      this.elReset = options.elReset;
      this.elStart = options.elStart;
      this.timer = new Timer();
    };

    constructor.prototype = {

      joinRoom: function () {
        this.socket.emit('joinroom', { roomId: this.roomId, roomToken: this.token });
      },

      displayTime: function () {
        if (this.state === 'RUNNING' && this.timer.isOver()) {
          return '00:00:00';
        } else if (this.state === 'RUNNING') {
          return this.timer.calcElapedTime(this.timer.targetTime - new Date());
        } else {
          return '00:00:00';
        }
      },

      reset: function (msec, seconds, minutes) {
        if (this.state === 'READY') {
          this.timer.setTargetTimeByOffset(msec, seconds, minutes);
        } else {
          this.state = 'READY';
          this.timer.setTargetTimeByOffset(msec, seconds, minutes);
        }
      },

      start: function () {
        if (this.state === 'READY') {
          this.state = 'RUNNING';
        }
      },

      setInterval: function (callback, mseconds) {
        if (!this.intervalId) {
          this.intervalId = setInterval(callback, mseconds);
        }
      },

      bind: function () {
        this.socket.on('reset', (data) => {
          this.reset(0, 0, 5);
        });

        this.socket.on('start', (data) => {
          this.start();
        });

        this.elReset.addEventListener('click', () => {
          this.reset(0, 0, 5);
          this.socket.emit('reset', { roomId: this.roomId, roomToken: this.roomToken });
        });

        this.elStart.addEventListener('click', () => {
          this.start();
          this.socket.emit('start', { roomId: this.roomId, roomToken: this.roomToken });
        });

        setInterval(() => {
          this.elDisplay.innerHTML = this.displayTime();
        }, 64);
      },
    };

    return constructor;
  })();

  window.addEventListener('DOMContentLoaded', () => {
    const elTimer = document.querySelector('#timer');

    const timerView = new TimerView({
      roomId: elTimer.attributes['data-room-id'].value,
      roomToken: elTimer.attributes['data-room-token'].value,
      elDisplay: document.querySelector('#timer'),
      elReset: document.querySelector('#reset'),
      elStart: document.querySelector('#start'),
    });

    timerView.bind();
    timerView.joinRoom();
  });
})();
