let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone(freq, type, duration, gain = 0.3, delay = 0) {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gainNode = ac.createGain();
  osc.connect(gainNode);
  gainNode.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
  gainNode.gain.setValueAtTime(0, ac.currentTime + delay);
  gainNode.gain.linearRampToValueAtTime(gain, ac.currentTime + delay + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration + 0.05);
}

export function playFlip() {
  const ac = getCtx();
  const buffer = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.15;
  }
  const src = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.Q.value = 0.5;
  src.buffer = buffer;
  src.connect(filter);
  filter.connect(ac.destination);
  src.start();
}

export function playCorrect() {
  playTone(523.25, 'sine', 0.12, 0.25, 0);    // C5
  playTone(659.25, 'sine', 0.12, 0.25, 0.1);  // E5
  playTone(783.99, 'sine', 0.18, 0.25, 0.2);  // G5
}

export function playWrong() {
  playTone(220, 'sawtooth', 0.08, 0.2, 0);
  playTone(196, 'sawtooth', 0.12, 0.2, 0.07);
  playTone(174.61, 'sawtooth', 0.15, 0.2, 0.15);
}

export function playMatchComplete() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    playTone(freq, 'sine', 0.2, 0.22, i * 0.1);
  });
  playTone(1318.51, 'sine', 0.35, 0.22, 0.5);
}

export function playCelebration() {
  const melody = [
    [523.25, 0],
    [659.25, 0.12],
    [783.99, 0.24],
    [1046.5, 0.36],
    [783.99, 0.5],
    [1046.5, 0.62],
    [1318.51, 0.78],
  ];
  melody.forEach(([freq, delay]) => {
    playTone(freq, 'sine', 0.18, 0.25, delay);
  });
}
