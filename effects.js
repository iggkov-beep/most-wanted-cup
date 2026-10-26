const policeButtons = [...document.querySelectorAll('.police-siren')];
const lightwash = document.createElement('div');
lightwash.className = 'police-lightwash';
lightwash.setAttribute('aria-hidden', 'true');
document.body.append(lightwash);
let sirenContext, sirenOscillator, sirenGain, sirenTimer;
let sirenRequest = 0;
function stopSiren() {
  ++sirenRequest;
  clearTimeout(sirenTimer);
  document.body.classList.remove('pursuit-active');
  policeButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
  try { sirenOscillator?.stop(); } catch {}
  sirenOscillator?.disconnect(); sirenGain?.disconnect();
  sirenOscillator = null; sirenGain = null;
}
async function playSiren(restart = false) {
  if (sirenOscillator) { stopSiren(); if (!restart) return; }
  const request = ++sirenRequest;
  try {
    sirenContext ||= new (window.AudioContext || window.webkitAudioContext)();
    await sirenContext.resume();
    if (request !== sirenRequest || document.hidden) return;
    const now = sirenContext.currentTime;
    sirenOscillator = sirenContext.createOscillator();
    sirenGain = sirenContext.createGain();
    sirenOscillator.type = 'triangle';
    sirenOscillator.frequency.setValueAtTime(520, now);
    for (const [seconds, frequency] of [[.7,1120],[1.4,520],[2.1,1120],[2.8,520]]) {
      sirenOscillator.frequency.linearRampToValueAtTime(frequency, now + seconds);
    }
    sirenGain.gain.setValueAtTime(0, now);
    sirenGain.gain.linearRampToValueAtTime(.055, now + .12);
    sirenGain.gain.setValueAtTime(.055, now + 2.45);
    sirenGain.gain.linearRampToValueAtTime(0, now + 2.9);
    sirenOscillator.connect(sirenGain); sirenGain.connect(sirenContext.destination);
    sirenOscillator.start(); sirenOscillator.stop(now + 3);
    document.body.classList.add('pursuit-active');
    policeButtons.forEach(button => button.setAttribute('aria-pressed', 'true'));
    sirenTimer = setTimeout(stopSiren, 3000);
  } catch { stopSiren(); }
}
policeButtons.forEach(button => button.addEventListener('click', () => playSiren()));
document.addEventListener('visibilitychange', () => { if (document.hidden) stopSiren(); });

for (const link of document.querySelectorAll('.desktop-toc nav a, .mobile-toc nav a')) {
  link.addEventListener('click', () => playSiren(true));
}
