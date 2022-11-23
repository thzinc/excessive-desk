const axios = require('axios');

module.exports = class Client {
  constructor(baseURL) {
    this.client = axios.create({
      baseURL: baseURL,
    });
  }

  /**
   * Gets an array of the types of lights that are available to control
   * @returns {Promise<[string]>} List of types of lights
   */
  async lights() {
    const { data: lights } = await this.client.get('/lights');
    return Array.from(lights);
  }

  /**
   * @typedef {Object} Status
   * @property {[string]} channels List of light channels controlled by the light
   * @property {string} effectiveColor The closest approximation of the current color of the light
   * @property {boolean} isOn Whether the light is on
   */
  /**
   * Get current status of light
   * @param {string} type Type of light
   * @returns {Status}
   */
  async status(type) {
    const {
      data: { channels, effectiveColor, isOn },
    } = await this.client.get(`/lights/${type}`);
    return { channels, effectiveColor, isOn };
  }

  /**
   * Turn the light on or off
   * @param {string} type Type of light
   * @param {boolean} isOn Whether the light should be on
   */
  async setOn(type, isOn) {
    if (isOn) {
      await this.client.put(`/lights/${type}/on`);
    } else {
      await this.client.delete(`/lights/${type}/on`);
    }
  }

  /**
   * Set the color of the light
   * @param {string} type Type of light
   * @param {string} color The color to set the light to; will be interpreted as necessary depending on the capabilities of the light
   */
  async setColor(type, color) {
    const transitions = [{ color }];
    await this.client.put(`/lights/${type}/transitions`, transitions);
  }
};
