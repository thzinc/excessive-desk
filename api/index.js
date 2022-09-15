const express = require('express');
const {
  Light,
  createRGBLight,
  createWhiteLight,
  createAdjustableWhiteLight,
} = require('./Light');
// const path = require('path');
const app = express();
const http = require('http').Server(app);
// const io = require('socket.io')(http);
// const { start, stop } = require('./gpio.js');

const port = process.env.API_PORT || 80;

/** @type {Map<string, Light>} */
const lights = new Map(
  Object.entries({
    Accent: createRGBLight(17, 27, 22),
    Task: createWhiteLight(23),
    Area: createWhiteLight(24),
    Ring: createAdjustableWhiteLight(4, 25),
  })
);

app.use(express.json());

app.get('/lights/:type', async (req, res) => {
  const light = lights.get(req.params.type);
  if (!light) {
    res.sendStatus(404);
    return;
  }

  const dto = {
    type: req.params.type,
    ...light.status(),
  };

  res.status(200).json(dto);
});

app.get('/lights/:type', async (req, res) => {
  const light = lights.get(req.params.type);
  if (!light) {
    res.sendStatus(404);
    return;
  }
  res.status(200).json(light.status());
});

app.put('/lights/:type/on', (req, res) => {
  const light = lights.get(req.params.type);
  if (!light) {
    res.sendStatus(404);
    return;
  }
  light.on();
  res.sendStatus(202);
});

app.delete('/lights/:type/on', (req, res) => {
  const light = lights.get(req.params.type);
  if (!light) {
    res.sendStatus(404);
    return;
  }
  light.off();
  res.sendStatus(202);
});

app.put('/lights/:type/transitions', (req, res) => {
  const light = lights.get(req.params.type);
  if (!light) {
    res.sendStatus(404);
    return;
  }
  light.transitions(Array.from(req.body));
  res.sendStatus(202);
});

// io.on('connection', (socket) => {});

http.listen(port);
