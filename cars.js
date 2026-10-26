import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const modelUrl = new URL('./assets/models/bmw-m3-gtr.glb', import.meta.url).href;
let modelPromise;
const getModel = () => modelPromise ||= new GLTFLoader().loadAsync(modelUrl);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

async function createGarage(figure) {
  if (figure.dataset.initialized) return;
  figure.dataset.initialized = 'true';
  const holder = figure.querySelector('.car-canvas');
  const pause = figure.querySelector('.car-pause');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.setClearColor(0x0d100c, 0);
    holder.append(renderer.domElement);
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', 'Две 3D-модели BMW M3 GTR с круговым вращением');
    const scene = new THREE.Scene();
    const environment = new RoomEnvironment(renderer);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(environment, 0.04).texture;
    environment.dispose();
    pmrem.dispose();
    const camera = new THREE.OrthographicCamera(-2.2, 2.2, 1.9, -1.9, 0.1, 100);
    camera.position.set(5.2, 3.9, 6.4);
    camera.lookAt(0.18, 0.45, -0.55);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x4d4836, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.7);
    key.position.set(3, 6, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0xff5364, 0.8);
    rim.position.set(-4, 2, -4); scene.add(rim);
    const gltf = await getModel();
    const original = gltf.scene;
    original.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(original);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 2.7 / Math.max(size.x, size.z);
    const cars = [];
    for (let index = 0; index < 2; index++) {
      const model = original.clone(true);
      model.position.x -= center.x;
      model.position.y -= box.min.y;
      model.position.z -= center.z;
      model.traverse(node => {
        if (!node.isMesh) return;
        const tune = material => {
          const m = material.clone();
          if (index === 1 && /CARSKIN|ALUMINUM_SKIN3|BOTTOM_SKIN2/.test(m.name)) {
            m.map = null; m.color.set(0x172027); m.metalness = 0.78; m.roughness = 0.29;
          }
          if (index === 1 && /RIM/.test(m.name)) { m.color.set(0xff4655); m.metalness = 0.6; }
          if (/HEADLIGHTGLASS_NEON/.test(m.name)) { m.color.set(0xc7dbff); m.opacity = 0.18; }
          return m;
        };
        node.material = Array.isArray(node.material) ? node.material.map(tune) : tune(node.material);
      });
      const pivot = new THREE.Group();
      pivot.add(model); pivot.scale.setScalar(scale * (index ? 0.77 : 1));
      pivot.position.set(index ? 0.36 : -0.12, index ? 0.10 : 0, index ? -1.78 : 0.35);
      pivot.rotation.y = index ? -0.55 : 0.5;
      scene.add(pivot); cars.push(pivot);
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.46, 72), new THREE.MeshBasicMaterial({ color: 0xff4655, transparent: true, opacity: 0.2, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, -0.03, -0.55); ring.scale.set(1.16, 1.5, 1); scene.add(ring);
    let paused = false;
    pause.addEventListener('click', () => {
      paused = !paused;
      pause.innerHTML = paused ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 3 8 5-8 5z"/></svg>' : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h3v10H4zm5 0h3v10H9z"/></svg>';
      pause.setAttribute('aria-pressed', String(paused));
      pause.setAttribute('aria-label', paused ? 'Продолжить вращение машин' : 'Приостановить вращение машин');
      pause.title = paused ? 'Продолжить вращение' : 'Приостановить вращение';
    });
    const resize = () => {
      const w = holder.clientWidth, h = holder.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      camera.left = -1.75 * aspect; camera.right = 1.75 * aspect;
      camera.top = 1.75; camera.bottom = -1.75; camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(holder); resize();
    figure.classList.add('is-ready');
    figure.dataset.model = 'loaded';
    let previous = 0, angle = 0;
    function draw(time) {
      requestAnimationFrame(draw);
      if (time - previous < 32) return;
      const delta = previous ? Math.min((time - previous) / 1000, 0.08) : 0;
      previous = time;
      const visible = holder.clientWidth > 0 && holder.getBoundingClientRect().bottom > 0 && holder.getBoundingClientRect().top < window.innerHeight;
      if (document.hidden || !visible) return;
      if (!paused) angle += delta * (reduceMotion.matches ? 0.25 : 0.43);
      cars[0].rotation.y = 0.5 + angle;
      cars[1].rotation.y = -0.55 - angle;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(draw);
  } catch (error) {
    figure.classList.add('is-error');
    figure.dataset.error = error.message;
    pause.hidden = true;
    renderer?.dispose();
    console.error('Car preview:', error);
  }
}
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => { if (entry.isIntersecting) createGarage(entry.target); });
}, { rootMargin: '100px' });
document.querySelectorAll('.car-showcase').forEach(figure => observer.observe(figure));
