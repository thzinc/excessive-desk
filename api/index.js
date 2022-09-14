const Color = require('color');
const express = require('express');
// const path = require('path');
const app = express();
const http = require('http').Server(app);
// const io = require('socket.io')(http);
// const { start, stop } = require('./gpio.js');

const port = process.env.API_PORT || 80;

class Light {
  static FPS = 30;
  static delay = 1000 / Light.FPS;
  constructor(channels, selector) {
    this.channels = channels;
    this.selector = selector;
    this.interval = null;
    this.callbacks = new Set();
    this.isOn = false;
    this.frames = [];
  }

  /**
   * Handle the next tick
   * @param {Object} frame - Frame data that should be applied to the light
   * @param {string} frame.command - Pi Blaster command
   * @param {string} frame.color - Color to report to any subscribers
   */
  tick({ command, color }) {
    // TODO: write command
    console.debug('command', command);
    const curr = {
      isOn: this.isOn,
      color: color,
    };
    this.callbacks.forEach((callback) => callback(curr));
  }

  /**
   * Subscribe to light state change events
   * @param {function(any):void} callback - Callback for receiving light state change events
   * @returns {function():void} Function to unsubscribe from light state change events
   */
  subscribe(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Turn the light on
   */
  on() {
    if (this.interval) {
      clearInterval(this.interval);
    }

    const epoch = performance.now();
    this.interval = setInterval(() => {
      if (this.frames.length === 0) return;

      const now = performance.now();
      const time = now - epoch;
      const frameNumber = Math.floor(time / Light.delay) % this.frames.length;
      const frame = this.frames[frameNumber];

      this.tick(frame);
    }, Light.delay);
    this.isOn = true;
  }

  /**
   * Turn the light off
   */
  off() {
    clearInterval(this.interval);
    this.isOn = false;

    const command = Object.values(this.channels)
      .map((channel) => `${channel}=0`)
      .join(' ');
    const color = '#000000';
    this.tick({ command, color });
  }

  /**
   * Enqueue light transitions
   * @param {any[]} values - List of color transitions
   */
  transitions(values) {
    this.frames = [];
    for (let t = 0; t < values.length; t++) {
      const from = values[t];
      const fromColor = Color(from.color);

      const to = values[(t + 1) % values.length];
      const toColor = Color(to.color);

      const frameCount = from.duration / Light.delay;
      for (let frame = 0; frame < frameCount; frame++) {
        const percentage = frame / frameCount;
        const c = fromColor.mix(toColor, percentage);
        const { color, ...channelValues } = this.selector(c);
        const command = Object.keys(channelValues)
          .map(
            (channel) => `${this.channels[channel]}=${channelValues[channel]}`
          )
          .join(' ');
        this.frames.push({
          color,
          command,
        });
      }
    }
    console.debug(this.frames);
  }
}

const lights = {
  accent: new Light(
    {
      Red: '17',
      Green: '27',
      Blue: '22',
    },
    (color) => {
      const [r, g, b] = color.rgb().array();
      return {
        color: color.hex(),

        Red: (r / 255).toFixed(2),
        Green: (g / 255).toFixed(2),
        Blue: (b / 255).toFixed(2),
      };
    }
  ),
  task: new Light(
    {
      White: '23',
    },
    (color) => {
      const luminosity = color.luminosity();
      return {
        color: Color('#000000').luminosity(luminosity),

        White: luminosity.toFixed(2),
      };
    }
  ),
  area: new Light(
    {
      White: '24',
    },
    (color) => {
      const luminosity = color.luminosity();
      return {
        color: Color('#000000').luminosity(luminosity),

        White: luminosity.toFixed(2),
      };
    }
  ),
  ring: new Light(
    {
      Warm: '4',
      Cool: '25',
    },
    (color) => {
      const [r, _, b] = color.rgb().array();
      return {
        color: Color.rgb(r, 0, b),

        Warm: (r / 255).toFixed(2),
        Cool: (b / 255).toFixed(2),
      };
    }
  ),
};

app.get('/lights/:type', async (req, res) => {
  const light = lights[req.params.type];
  if (!light) {
    res.sendStatus(404);
    return;
  }

  if (req.query.on) {
    light.on();
    light.transitions([
      { color: '#FF0000', duration: 1000 },
      { color: '#00FF00', duration: 1000 },
      { color: '#0000FF', duration: 1000 },
    ]);
  } else {
    light.off();
  }

  res.send(`type: ${req.params.type}`);
});

// io.on('connection', (socket) => {});

http.listen(port);
