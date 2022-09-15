const express = require('express');
const {
  Light,
  createRGBLight,
  createWhiteLight,
  createAdjustableWhiteLight,
} = require('./Light');
const app = express();
const http = require('http').Server(app);

const port = process.env.API_PORT || 80;

/** @type {Map<string, Light>} */
const lights = new Map(
  Object.entries({
    // TODO: make pins configurable via environment variable
    Accent: createRGBLight(17, 22, 27),
    Task: createWhiteLight(23),
    Area: createWhiteLight(24),
    Ring: createAdjustableWhiteLight(25, 4),
  })
);

app.use(express.json());

app.get('/lights', (_, res) => {
  res.status(200).json(Array.from(lights.keys()));
});

app.get('/lights/:type', (req, res) => {
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

app.get('/lights/:type', (req, res) => {
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

http.listen(port);
