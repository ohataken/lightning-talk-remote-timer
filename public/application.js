(() => {
  const Timer = (() => {
    const constructor = function () {
      this.targetTime = new Date();
      this.minutes = 5;
      this.seconds = 0;
      this.milliseconds = 0;
    };

    constructor.prototype = {
      setRemainingTime: function (minutes, seconds, msec) {
        this.minutes = minutes;
        this.seconds = seconds;
        this.milliseconds = msec;
      },

      setTargetTimeAt: function (date) {
        this.targetTime = new Date(date.getTime()
          + this.minutes * 1000 * 60
          + this.seconds * 1000
          + this.milliseconds
        );
      },

      getProgressAt: function (date) {
        const duration = this.minutes * 1000 * 60
          + this.seconds * 1000
          + this.milliseconds;

        const progress = (this.targetTime.getTime() - date.getTime()) / duration;

        if (this.isOver()) {
          return 0;
        } else if (100 < progress) {
          return 1;
        } else {
          return progress;
        }
      },

      getProgressInPercentageAt: function (date) {
        return this.getProgressAt(date) * 100 + '%';
      },

      calcElapedTime: function (elapsed) {
        return [
          ('0' + Math.floor(elapsed / 1000 / 60 % 60)).slice(-2),
          ('0' + Math.floor(elapsed / 1000 % 60)).slice(-2),
          ('0' + Math.floor(elapsed % 60)).slice(-2),
        ].join(':');
      },

      renderRemainingTime: function () {
        return [
          ('0' + this.minutes).slice(-2),
          ('0' + this.seconds).slice(-2),
          ('0' + this.milliseconds).slice(-2),
        ].join(':');
      },

      renderRemainingTimeAt: function (date) {
        return this.calcElapedTime(this.targetTime - date);
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
      this.elProgress = options.elProgress;
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
          return this.timer.renderRemainingTimeAt(new Date());
        } else {
          return this.timer.renderRemainingTime();
        }
      },

      renderProgress: function () {
        if (this.state === 'READY') {
          this.elProgress.style.cssText = 'width: 100%;';
        } else if (this.state === 'RUNNING') {
          this.elProgress.style.cssText = 'width:' + this.timer.getProgressInPercentageAt(new Date()) + ';';
        }
      },

      reset: function (msec, seconds, minutes) {
        if (this.state === 'READY') {
          this.elStart.classList.remove('disabled');
        } else {
          this.elProgress.classList.remove('progress-bar-animated');
          this.state = 'READY';
          this.elStart.classList.remove('disabled');
        }
      },

      start: function () {
        if (this.state === 'READY') {
          this.state = 'RUNNING';
          this.timer.setTargetTimeAt(new Date());
          this.elProgress.classList.add('progress-bar-animated');
          this.elStart.classList.add('disabled');
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
          this.timer.getProgressAt(new Date());
          this.renderProgress();
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
      elProgress: document.querySelector('#progress'),
    });

    timerView.bind();
    timerView.joinRoom();
  });
})();
