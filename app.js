const mobileToc = document.querySelector('.mobile-toc');
mobileToc.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { mobileToc.open = false; }));
const links = [...document.querySelectorAll('.desktop-toc nav a, .mobile-toc nav a')];
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const trackArtwork = document.querySelector('.page-art');
let treadPosition = 0;
let treadTarget = 0;
let treadFrame = null;
let treadTime = 0;
function rollTread(time) {
  const elapsed = treadTime ? Math.min(time - treadTime, 40) : 16;
  treadTime = time;
  const damping = motionPreference.matches ? 55 : 140;
  treadPosition += (treadTarget - treadPosition) * (1 - Math.exp(-elapsed / damping));
  trackArtwork.style.setProperty('--tread-shift', `${treadPosition.toFixed(2)}px`);
  if (Math.abs(treadTarget - treadPosition) > 0.2) {
    treadFrame = requestAnimationFrame(rollTread);
  } else {
    treadPosition = treadTarget;
    trackArtwork.style.setProperty('--tread-shift', `${treadPosition.toFixed(2)}px`);
    trackArtwork.classList.remove('is-rolling');
    treadFrame = null;
    treadTime = 0;
  }
}
function updateTreadMotion() {
  treadTarget = window.scrollY * (motionPreference.matches ? 1.45 : 2.1);
  if (Math.abs(treadTarget - treadPosition) > 0.2) {
    trackArtwork.classList.add('is-rolling');
    if (treadFrame === null) treadFrame = requestAnimationFrame(rollTread);
  }
}
function updateContents() {
  const sections = [...document.querySelectorAll('.rules-section')];
  let current = sections[0]?.id;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= 180) current = section.id;
  }
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
    current = sections.at(-1)?.id;
  }
  links.forEach(link => {
    if (link.hash === `#${current}`) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
  const fullLength = document.documentElement.scrollHeight;
  const visibleLength = window.scrollY + window.innerHeight * 0.94;
  const trackLength = Math.min(fullLength, visibleLength);
  trackArtwork.style.setProperty('--tyre-length', `${Math.ceil(trackLength)}px`);
  updateTreadMotion();
}
let scheduled = false;
window.addEventListener('scroll', () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { updateContents(); scheduled = false; });
}, { passive: true });
window.addEventListener('resize', updateContents, { passive: true });
motionPreference.addEventListener('change', updateContents);
updateContents();
