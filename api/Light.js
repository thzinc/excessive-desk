const Color = require('color');
const { execute } = require('./piblaster');

const black = Color('#000000');
const white = Color('#FFFFFF');

/**
 * @typedef Frame
 * @property {string} color - Effective color of the frame
 * @property {string} command - pi-blaster command to execute the frame
 */

/**
 * @typedef Transition A keyframe describing the color and duration over which to transition to the next keyframe
 * @property {string} color - Color of the keyframe
 * @property {number} duration - Duration in milliseconds to stretch the color transition
 */

class Light {
  static framesPerSecond = 30;
  static tickDelayMs = 1000 / Light.framesPerSecond;
  constructor(channels, selector) {
    this.channels = channels;
    this.selector = selector;
    this.interval = null;
    this.isOn = false;
    /** @type {Frame[]} */
    this.frames = [];
    const { color } = this._createFrame(white);
    this.effectiveColor = color;
    this.transitions([{ color }]);
  }

  /**
   * Get the current status of the light
   * @returns {{isOn:bool, effectiveColor:string}} Status of light
   */
  status() {
    return {
      isOn: this.isOn,
      effectiveColor: this.effectiveColor,
      channels: Object.keys(this.channels),
    };
  }

  /**
   * Turn the light on
   */
  on() {
    if (this.interval) {
      clearInterval(this.interval);
    }

    const epoch = performance.now();
    let lastFrame = null;
    let lastCommand = null;
    this.interval = setInterval(() => {
      if (this.frames.length === 0) return;

      const now = performance.now();
      const time = now - epoch;
      const frame = Math.floor(time / Light.tickDelayMs) % this.frames.length;

      if (frame === lastFrame) return;

      lastFrame = frame;
      const { command, color } = this.frames[frame];

      this.effectiveColor = color;
      if (command === lastCommand) return;

      lastCommand = command;
      execute(command);
    }, Light.tickDelayMs);

    this.isOn = true;
  }

  /**
   * Turn the light off
   */
  off() {
    clearInterval(this.interval);

    const { command } = this._createFrame(black);
    execute(command);
    this.isOn = false;
  }

  /**
   * Enqueue light transitions
   * @param {Transition[]} values - List of color transitions
   */
  transitions(values) {
    if (values.length === 1) {
      this.frames = [this._createFrame(Color(values[0].color))];
      return;
    }

    /** @type {Frame[]} */
    const frames = [];
    for (let t = 0; t < values.length; t++) {
      const from = values[t];
      const fromColor = Color(from.color);

      const to = values[(t + 1) % values.length];
      const toColor = Color(to.color);

      const frameCount = from.duration / Light.tickDelayMs;
      for (let frame = 0; frame < frameCount; frame++) {
        const percentage = frame / frameCount;
        const frameColor = fromColor.mix(toColor, percentage);
        frames.push(this._createFrame(frameColor));
      }
    }

    this.frames = frames;
  }

  /**
   * Creates a single frame
   * @param {Color} frameColor - Color of the frame
   * @returns {Frame} Frame
   */
  _createFrame(frameColor) {
    const { color, ...channelValues } = this.selector(frameColor);
    const command = Object.keys(channelValues)
      .map((channel) => `${this.channels[channel]}=${channelValues[channel]}`)
      .join(' ');
    return { color, command };
  }
}

function createRGBLight(redPin, greenPin, bluePin) {
  return new Light(
    {
      Red: `${redPin}`,
      Green: `${greenPin}`,
      Blue: `${bluePin}`,
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
  );
}

function createWhiteLight(pin) {
  return new Light(
    {
      White: `${pin}`,
    },
    (color) => {
      const luminosity = color.luminosity();
      const grayscale = Color(black).lightness(luminosity * 100);
      return {
        color: grayscale.hex(),

        White: luminosity.toFixed(2),
      };
    }
  );
}

function createAdjustableWhiteLight(warmPin, coolPin) {
  return new Light(
    {
      Warm: `${warmPin}`,
      Cool: `${coolPin}`,
    },
    (color) => {
      const [r, _, b] = color.rgb().array();
      return {
        color: Color.rgb(r, 0, b).hex(),

        Warm: (r / 255).toFixed(2),
        Cool: (b / 255).toFixed(2),
      };
    }
  );
}

exports.Light = Light;
exports.createAdjustableWhiteLight = createAdjustableWhiteLight;
exports.createRGBLight = createRGBLight;
exports.createWhiteLight = createWhiteLight;
