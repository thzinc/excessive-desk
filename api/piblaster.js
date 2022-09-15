const fs = require('fs');
const { spawn } = require('child_process');

const piBlaster = process.env.PI_BLASTER || '/dev/pi-blaster';
const [command, ...args] = (
  process.env.PI_BLASTER_BIN || './pi-blaster --foreground'
).split(' ');

spawn(command, args);

/**
 * Executes a pi-blaster command
 * @param {string} cmd - pi-blaster command
 */
exports.execute = function (cmd) {
  const buffer = Buffer.from(cmd + '\n');
  fs.open(piBlaster, 'w', undefined, function (openError, fd) {
    if (openError) {
      console.error('failed to open pi-blaster device', openError);
      return;
    }
    fs.write(fd, buffer, 0, buffer.length, -1, function (writeError) {
      if (writeError) {
        console.error('failed to write to pi-blaster device', writeError);
        return;
      }
      fs.close(fd, function (closeError) {
        if (closeError) {
          console.error('failed to close pi-blaster device', closeError);
          return;
        }
      });
    });
  });
};
