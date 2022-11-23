const hap = require('hap-nodejs');
const Color = require('color');
const os = require('os');
const ExcessiveDeskClient2 = require('./excessiveDeskClient');

const { Accessory, Characteristic, CharacteristicEventTypes, Service, uuid } =
  hap;

const {
  API_BASE_URL,
  HOMEKIT_PIN_CODE,
  HOMEKIT_INTERFACE = 'eth0',
  HOMEKIT_PORT = 47129,
} = process.env;
const edc = new ExcessiveDeskClient2(API_BASE_URL);

async function initializeAccessories() {
  const excessiveDeskUuid = uuid.generate('com.thzinc.excessive-desk');
  const excessiveDeskAccessory = new Accessory(
    'Excessive Desk',
    excessiveDeskUuid
  );

  const lights = await edc.lights();
  for (const type of lights) {
    const { channels, effectiveColor } = await edc.status(type);
    let currentColor = Color(effectiveColor, 'hsl');

    const lightService = new Service.Lightbulb(`${type} Light`, type);

    const onCharacteristic = lightService.getCharacteristic(Characteristic.On);
    onCharacteristic.on(CharacteristicEventTypes.GET, async (callback) => {
      const { isOn } = await edc.status(type);
      callback(undefined, isOn);
    });
    onCharacteristic.on(
      CharacteristicEventTypes.SET,
      async (isOn, callback) => {
        await edc.setOn(type, isOn);
        callback();
      }
    );

    const brightnessCharacteristic = lightService.getCharacteristic(
      Characteristic.Brightness
    );
    brightnessCharacteristic.on(CharacteristicEventTypes.GET, (callback) => {
      callback(undefined, currentColor.lightness());
    });
    brightnessCharacteristic.on(
      CharacteristicEventTypes.SET,
      async (brightness, callback) => {
        currentColor = currentColor.lightness(brightness);
        await edc.setColor(type, currentColor.hex());
        callback();
      }
    );

    if (channels.length > 1) {
      const hueCharacteristic = lightService.getCharacteristic(
        Characteristic.Hue
      );
      hueCharacteristic.on(CharacteristicEventTypes.GET, (callback) => {
        callback(undefined, currentColor.hue());
      });
      hueCharacteristic.on(
        CharacteristicEventTypes.SET,
        async (hue, callback) => {
          currentColor = currentColor.hue(hue);
          await edc.setColor(type, currentColor.hex());
          callback();
        }
      );

      const saturationCharacteristic = lightService.getCharacteristic(
        Characteristic.Saturation
      );
      saturationCharacteristic.on(CharacteristicEventTypes.GET, (callback) => {
        callback(undefined, currentColor.saturationl());
      });
      saturationCharacteristic.on(
        CharacteristicEventTypes.SET,
        async (saturation, callback) => {
          currentColor = currentColor.saturationl(saturation);
          await edc.setColor(type, currentColor.hex());
          callback();
        }
      );
    }

    excessiveDeskAccessory.addService(lightService);
  }

  const [{ mac }] = os.networkInterfaces()[HOMEKIT_INTERFACE];
  const accessoryInfo = {
    username: mac,
    pincode: HOMEKIT_PIN_CODE,
    port: HOMEKIT_PORT,
    category: hap.Categories.BRIDGE,
  };
  console.log('Publishing HomeKit accessory', accessoryInfo);
  excessiveDeskAccessory.publish(accessoryInfo);
}

initializeAccessories();
