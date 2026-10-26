const musicToggle = document.querySelector('.music-toggle');
const musicPanel = document.querySelector('.music-panel');
const musicAudio = document.querySelector('#music-audio');
const musicStatus = document.querySelector('.music-status');
const playControl = document.querySelector('.music-play');
const seekControl = document.querySelector('.music-seek');
const volumeControl = document.querySelector('.music-volume input');
const clockDisplay = document.querySelector('.music-clock');
const totalDisplay = document.querySelector('.music-total');
const modeDisplay = document.querySelector('.music-mode');
const loopControl = document.querySelector('.music-loop');
const playIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 3 8 5-8 5z"/></svg>';
const pauseIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h3v10H4zm5 0h3v10H9z"/></svg>';
let seeking = false;
let playRequest = 0;
let musicLoad;
let autoplayPending = true;
function cancelAutoplay() {
  autoplayPending = false;
  document.removeEventListener('pointerdown', resumeAutoplay, true);
  document.removeEventListener('keydown', resumeAutoplay, true);
}
function resumeAutoplay(event) {
  if (!autoplayPending || !event.isTrusted || event.target.closest?.('.music-panel, .music-toggle')) return;
  if (event.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
  playMusic(true);
}
function loadMusic() {
  if (musicLoad) return musicLoad;
  musicStatus.textContent = 'Загрузка трека…';
  playControl.disabled = true;
  musicLoad = (async () => {
    // Sites serves the file without HTTP ranges. A complete local Blob keeps seeking reliable.
    const response = await fetch(musicAudio.dataset.src);
    if (!response.ok) throw new Error(`Audio HTTP ${response.status}`);
    const blob = await response.blob();
    musicAudio.src = URL.createObjectURL(blob);
    musicAudio.load();
    musicStatus.textContent = '';
  })().catch(error => {
    musicLoad = null;
    throw error;
  }).finally(() => { playControl.disabled = false; });
  return musicLoad;
}
const formatTime = value => {
  const seconds = Math.max(0, Math.floor(value || 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
function updateTime() {
  const duration = musicAudio.duration;
  if (Number.isFinite(duration)) {
    seekControl.max = duration;
    totalDisplay.textContent = formatTime(duration);
  }
  if (!seeking) {
    seekControl.value = musicAudio.currentTime;
    clockDisplay.textContent = formatTime(musicAudio.currentTime);
  }
  seekControl.setAttribute('aria-valuetext', `${clockDisplay.textContent} / ${totalDisplay.textContent}`);
}
function updatePlayState() {
  const playing = !musicAudio.paused && !musicAudio.ended;
  playControl.innerHTML = playing ? pauseIcon : playIcon;
  playControl.setAttribute('aria-label', playing ? 'Пауза' : 'Воспроизвести');
  musicToggle.classList.toggle('is-playing', playing);
  musicPanel.classList.toggle('is-playing', playing);
  modeDisplay.textContent = playing ? 'PLAY' : musicAudio.currentTime > 0 ? 'PAUSE' : 'STOP';
}
async function playMusic(automatic = false) {
  const request = ++playRequest;
  musicAudio.volume = Number(volumeControl.value) / 100;
  try {
    await loadMusic();
    if (request !== playRequest) return;
    await musicAudio.play();
    if (request === playRequest) { musicStatus.textContent = ''; cancelAutoplay(); }
  } catch (error) {
    if (request !== playRequest || error.name === 'AbortError') return;
    if (automatic && error.name === 'NotAllowedError') {
      musicStatus.textContent = 'Нажми play, чтобы включить музыку.';
      document.addEventListener('pointerdown', resumeAutoplay, true);
      document.addEventListener('keydown', resumeAutoplay, true);
    } else {
      musicStatus.textContent = 'Не удалось включить музыку. Нажми play ещё раз.';
    }
  }
}
function pauseMusic() { ++playRequest; cancelAutoplay(); musicAudio.pause(); }
function closeMusic() {
  pauseMusic();
  musicPanel.hidden = true;
  musicToggle.setAttribute('aria-expanded', 'false');
  musicToggle.setAttribute('aria-label', 'Открыть музыку');
  musicToggle.focus();
}
function openMusic() {
  musicPanel.hidden = false;
  musicToggle.setAttribute('aria-expanded', 'true');
  musicToggle.setAttribute('aria-label', 'Закрыть музыку');
  if (musicAudio.paused) playMusic();
}
musicAudio.addEventListener('loadedmetadata', updateTime);
musicAudio.addEventListener('durationchange', updateTime);
musicAudio.addEventListener('timeupdate', updateTime);
musicAudio.addEventListener('seeked', updateTime);
for (const event of ['play', 'pause', 'ended']) musicAudio.addEventListener(event, updatePlayState);
musicAudio.addEventListener('error', () => { musicStatus.textContent = 'Не удалось загрузить трек. Попробуй ещё раз.'; });
musicToggle.addEventListener('click', () => musicPanel.hidden ? openMusic() : closeMusic());
document.querySelector('.music-close').addEventListener('click', closeMusic);
playControl.addEventListener('click', () => musicAudio.paused ? playMusic() : pauseMusic());
document.querySelector('.music-stop').addEventListener('click', () => {
  pauseMusic(); musicAudio.currentTime = 0; seeking = false; updateTime(); updatePlayState();
});
document.querySelector('.music-restart').addEventListener('click', () => { musicAudio.currentTime = 0; playMusic(); });
loopControl.addEventListener('click', () => { musicAudio.loop = !musicAudio.loop; loopControl.setAttribute('aria-pressed', String(musicAudio.loop)); });
seekControl.addEventListener('input', () => { seeking = true; clockDisplay.textContent = formatTime(Number(seekControl.value)); });
seekControl.addEventListener('change', () => {
  if (Number.isFinite(musicAudio.duration)) musicAudio.currentTime = Number(seekControl.value);
  seeking = false; updateTime();
});
volumeControl.addEventListener('input', () => { musicAudio.volume = Number(volumeControl.value) / 100; });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !musicPanel.hidden) closeMusic(); });

playMusic(true);
