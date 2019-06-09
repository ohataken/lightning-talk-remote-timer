(() => {
  const IdempotentNotifier = (() => {
    const constructor = function () {
      this.log = [];
    }

    constructor.prototype = {
      requestPermission: function () {
        if ('Notification' in window) {
          if (Notification.permission !== 'granted') {
            Promise.resolve().then(() => {
              return new Promise((resolve) => {
                return Notification.requestPermission(() => {
                  return resolve();
                });
              });
            }).then(() => {
              this.createNotification('Thank you.');
            });
          }
        }
      },

      createNotification: function (message) {
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            return new Notification(message);
          }
        }
      },

      notifyIdempotently: function (id, message) {
        if (!this.log.includes(id)) {
          this.log.push(id);
          this.createNotification(message);
        }
      },

      flushLog: function () {
        this.log = [];
      },
    };

    return constructor;
  })();

  const Timer = (() => {
    const constructor = function (minutes, seconds, milliseconds) {
      this.targetTime = new Date();
      this.minutes = minutes || 0;
      this.seconds = seconds || 0;
      this.milliseconds = milliseconds || 0;
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
        const progress = (this.targetTime.getTime() - date.getTime()) / this.getDuration();

        if (this.isOver()) {
          return 0;
        } else if (100 < progress) {
          return 1;
        } else {
          return progress;
        }
      },

      getMilliseconds: function (minutes, seconds, milliseconds) {
        return minutes * 1000 * 60
          + seconds * 1000
          + milliseconds;
      },

      getDuration: function () {
        return this.getMilliseconds(this.minutes, this.seconds, this.milliseconds);
      },

      getProgressInPercentageAt: function (date) {
        return this.getProgressAt(date) * 100 + '%';
      },

      getElapsedTimeAt: function (date) {
        return this.targetTime - date;
      },

      getTargetTime: function () {
        return this.targetTime;
      },

      getStartTimeByRemainingTime: function () {
        if (arguments.length === 1) {
          const milliseconds = arguments[0];
          return new Date(this.targetTime.getTime() - milliseconds);
        } else if (arguments.length === 3) {
          const minutes = arguments[0];
          const seconds = arguments[1];
          const milliseconds = arguments[2];
          return new Date(this.targetTime.getTime() - this.getMilliseconds(minutes, seconds, milliseconds));
        }
      },

      getStartTime: function () {
        return this.getStartTimeByRemainingTime(this.minutes, this.seconds, this.milliseconds);
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

      isRemainingTimeInRangeAt(date, a, b) {
        const elapsed = this.getElapsedTimeAt(date);
        return a < elapsed && elapsed < b;
      },

      isRemainingTimeInRangeAtAndLessThan(date, a, b) {
        const start = this.getStartTime();
        return this.isRemainingTimeInRangeAt(date, a, b) && this.getStartTime() < this.getStartTimeByRemainingTime(b);
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
      this.timer = new Timer(
        options.minutes,
        options.seconds,
        options.milliseconds);
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

      reset: function () {
        if (this.state === 'READY') {
          this.elStart.classList.remove('disabled');
          this.notifier.flushLog();
        } else {
          this.elProgress.classList.remove('progress-bar-animated');
          this.state = 'READY';
          this.elStart.classList.remove('disabled');
          this.notifier.flushLog();
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
          this.state = 'READY';
        });

        this.socket.on('start', (data) => {
          this.start();
        });

        this.elReset.addEventListener('click', () => {
          this.reset();
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
      minutes: 5,
      seconds: 0,
      milliseconds: 0,
    });

    timerView.bind();
    timerView.joinRoom();
  });
})();
