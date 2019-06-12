const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

module.exports = class {

  static async find(key) {
    const hash = await new Promise((resolve, reject) => {
      return redis.hgetall(key, (err, result) => {
        return err ? reject(err) : resolve(result);
      });
    });

    return new this(Object.assign(hash, {
      key: key,
    }));
  }

  constructor(options) {
    Object.keys(options).forEach((key) => {
      this[key] = options[key];
    });
  }

  async save() {
    return new Promise((resolve, reject) => {
      return redis.hmset(this.key, {
        token: this.token || '',
        state: this.state || '',
        targetTime: this.targetTime || new Date().getTime(),
        minutes: this.minutes || 5,
        seconds: this.seconds || 0,
        milliseconds: this.milliseconds || 0,
      }, (err, result) => {
        return err ? reject(err) : resolve(result);
      });
    });
  }

  async update(options) {
    Object.keys(options).forEach((key) => {
      this[key] = options[key];
    });

    return this.save();
  }

};