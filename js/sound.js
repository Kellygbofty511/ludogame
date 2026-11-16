// sound.js - game sounds made in the browser with the Web Audio API,
// so there are no sound files to load. Use playSound("roll") etc.
// Browsers only allow audio after a click, so the audio context is
// created the first time a sound is played (the Roll dice click).

let audioCtx = null;
let soundOn = true;

try {
  soundOn = localStorage.getItem("ludoSound") !== "off";
} catch (e) {
  // storage blocked, sound just stays on
}

function getAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// one tone: start time (seconds from now), pitch in Hz, length, wave shape, volume
function tone(ctx, when, freq, length, type, volume, slideTo) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const t = ctx.currentTime + when;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + length);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

// a short burst of noise, used for the dice rattling
function click(ctx, when, volume) {
  const size = Math.floor(ctx.sampleRate * 0.04);
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / size);
  }
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  filter.type = "bandpass";
  filter.frequency.value = 1800 + Math.random() * 1500;
  gain.gain.value = volume;
  src.buffer = buffer;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(ctx.currentTime + when);
}

const SOUNDS = {
  // dice shaking and landing
  roll: function (ctx, d) {
    for (let i = 0; i < 9; i++) {
      click(ctx, d + i * 0.045 + Math.random() * 0.02, 0.5 - i * 0.03);
    }
    tone(ctx, d + 0.42, 220, 0.08, "triangle", 0.25, 140);
  },
  // token hops to its new square
  move: function (ctx, d) {
    tone(ctx, d, 520, 0.09, "sine", 0.3, 760);
  },
  // an opponent token is sent back to base
  capture: function (ctx, d) {
    tone(ctx, d, 600, 0.35, "sawtooth", 0.18, 120);
  },
  // a token reaches home
  home: function (ctx, d) {
    [523, 659, 784].forEach(function (f, i) {
      tone(ctx, d + i * 0.1, f, 0.25, "triangle", 0.3);
    });
  },
  // the game is won
  win: function (ctx, d) {
    [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) {
      tone(ctx, d + i * 0.14, f, 0.3, "triangle", 0.3);
    });
  },
  // rolled but nothing can move, or three sixes
  nomove: function (ctx, d) {
    tone(ctx, d, 160, 0.25, "square", 0.12, 110);
  }
};

// delay is in seconds, so a move sound can wait for the dice to finish
function playSound(name, delay) {
  if (!soundOn || !SOUNDS[name]) return;
  try {
    const ctx = getAudio();
    if (ctx) SOUNDS[name](ctx, delay || 0);
  } catch (e) {
    // if audio fails the game should still work
  }
}

// small button for the game panel
function soundButton() {
  const btn = document.createElement("button");
  btn.className = "btn small-btn";
  btn.textContent = soundOn ? "Sound: on" : "Sound: off";
  btn.addEventListener("click", function () {
    soundOn = !soundOn;
    btn.textContent = soundOn ? "Sound: on" : "Sound: off";
    try {
      localStorage.setItem("ludoSound", soundOn ? "on" : "off");
    } catch (e) {
      // ignore
    }
    if (soundOn) playSound("move");
  });
  return btn;
}
