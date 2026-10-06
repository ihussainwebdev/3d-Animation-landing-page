import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ── DOM refs ── */
const canvas        = document.querySelector('#webgl');
const sceneGlow     = document.querySelector('.scene-glow');
const modelFallback = document.querySelector('#model-fallback');
const pageLoader    = document.querySelector('#page-loader');
const reduceMotion  = matchMedia('(prefers-reduced-motion: reduce)').matches;
const heroSection = document.querySelector('.hero');
const philosophySection = document.querySelector('.philosophy');
const cabbageSection = document.querySelector('.cabbage-section');
const cauliflowerSection = document.querySelector('.cauliflower-section');
const finalSection = document.querySelector('.final-section');
const cabbageOrbit = document.querySelector('.cabbage-orbit');
const cauliflowerOrbit = document.querySelector('.cauliflower-orbit');
const finalOrbit = document.querySelector('.final-orbit');
const lowPowerDevice = (navigator.deviceMemory || 8) <= 4 ||
  (navigator.hardwareConcurrency || 8) <= 4 || navigator.connection?.saveData === true;
document.documentElement.classList.toggle('low-power-device', lowPowerDevice);

document.body.classList.add('is-loading');

/* ── Renderer ── */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: !lowPowerDevice, powerPreference: 'high-performance'
  });
} catch (err) {
  showFallback('3D view failed to start.'); throw err;
}
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace   = THREE.SRGBColorSpace;
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled  = !lowPowerDevice;
renderer.shadowMap.type     = THREE.PCFSoftShadowMap;

/* ── Scene & Camera ── */
const scene      = new THREE.Scene();
const camera     = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
const modelRoot  = new THREE.Group();
const modelPivot = new THREE.Group();
const tomatoPivot = new THREE.Group();
const cabbagePivot = new THREE.Group();
const applePivot = new THREE.Group();
const cauliflowerPivot = new THREE.Group();
const broccoliPivot = new THREE.Group();
cabbagePivot.visible = false;
applePivot.visible = false;
cauliflowerPivot.visible = false;
broccoliPivot.visible = false;
modelPivot.add(tomatoPivot, cabbagePivot, applePivot, cauliflowerPivot, broccoliPivot);
modelRoot.add(modelPivot);
scene.add(modelRoot);

/* ── Environment ── */
const pmrem    = new THREE.PMREMGenerator(renderer);
const envScene = new RoomEnvironment();
scene.environment = pmrem.fromScene(envScene, 0.04).texture;
envScene.dispose(); pmrem.dispose();

/* ── Lights ── */
scene.add(new THREE.HemisphereLight(0xfff1d0, 0x17372a, 2.3));
const keyLight = new THREE.DirectionalLight(0xffd6b4, 4.4);
keyLight.position.set(-4, 6, 5);
keyLight.castShadow = !lowPowerDevice;
keyLight.shadow.mapSize.set(lowPowerDevice ? 512 : 1024, lowPowerDevice ? 512 : 1024);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0xd9e75b, 3.2);
rimLight.position.set(5, 2, -4);
scene.add(rimLight);
const accentLight = new THREE.PointLight(0xed4a35, 2.2, 20);
accentLight.position.set(2, -3, 4);
scene.add(accentLight);

/* ── State ── */
let modelLoaded  = false;
let cabbageLoaded = false;
let cabbageAvailable = false;
let appleAvailable = false;
let cauliflowerAvailable = false;
let broccoliAvailable = false;
let sectionModelMix = 0;
let appleSectionMix = 0;
let thirdSectionAlignMix = 0;
let fourthSectionMix = 0;
let cauliflowerSectionMix = 0;
let fifthSectionMix = 0;
let broccoliSectionMix = 0;
let viewportMobile = false;
const thirdOrbitTarget = new THREE.Vector2();
const fourthOrbitTarget = new THREE.Vector2();
const fifthOrbitTarget = new THREE.Vector2();
const tomatoMaterials = [];
const cabbageMaterials = [];
const appleMaterials = [];
const cauliflowerMaterials = [];
const broccoliMaterials = [];

/* These are the LIVE values the render loop reads every frame */
const motion = { x: 0, y: 0, rx: 0.08, ry: -0.55, rz: -0.12, scale: 0.96 };

/* ── Normalize both models into the same centered screen-space anchor ── */
function fitModelToPivot(gltf, targetHeight, fadeMaterials) {
  const model = gltf.scene;
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const fitScale = targetHeight / Math.max(size.y, 0.001);

  // A wrapper applies centering in the model's transformed coordinates. This
  // keeps imported root transforms from pushing one vegetable below the other.
  const fittedModel = new THREE.Group();
  fittedModel.scale.setScalar(fitScale);
  fittedModel.position.copy(center).multiplyScalar(-fitScale);
  fittedModel.add(model);

  model.traverse(child => {
    if (!child.isMesh) return;
    child.castShadow = child.receiveShadow = !lowPowerDevice;
    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const mats = sourceMaterials.map(source => source?.clone());
    child.material = Array.isArray(child.material) ? mats : mats[0];
    mats.forEach(material => {
      if (!material) return;
      material.userData.fadeBaseOpacity = material.opacity;
      material.userData.fadeTransparent = material.transparent;
      material.userData.fadeDepthWrite = material.depthWrite;
      fadeMaterials.push(material);
      material.envMapIntensity = 1.2;
      if (material.map) material.map.anisotropy = Math.min(lowPowerDevice ? 2 : 8, renderer.capabilities.getMaxAnisotropy());
      material.needsUpdate = true;
    });
  });
  return fittedModel;
}

/* ── Load GLB ── */
const gltfLoader = new GLTFLoader();
gltfLoader.load(
  'assets/tomato.glb',
  gltf => {
    tomatoPivot.add(fitModelToPivot(gltf, 3.25, tomatoMaterials));
    modelLoaded = true;
    window.__techwizAnyModelReady = true;
    canvas.style.opacity = '1';
    sceneGlow.style.opacity = '0.9';
    hideModelFallback();
    finishWhenReady();
    updateCanvasClip();
  },
  undefined,
  err => {
    console.error(err);
    if (cabbageAvailable) {
      showModelNotice('One 3D visual could not load.');
      finishPageLoad();
    } else {
      showFallback('3D visual could not load.');
    }
  }
);

const cabbageLoader = new GLTFLoader();
cabbageLoader.load(
  'assets/cabbage.glb',
  gltf => {
    cabbagePivot.add(fitModelToPivot(gltf, 2.45, cabbageMaterials));
    cabbageLoaded = true;
    cabbageAvailable = true;
    window.__techwizAnyModelReady = true;
    if (!modelLoaded) {
      canvas.style.opacity = '1';
      sceneGlow.style.opacity = '0.9';
      hideModelFallback();
    }
    finishWhenReady();
    updateCanvasClip();
  },
  undefined,
  err => {
    console.error('Cabbage model could not load.', err);
    cabbageLoaded = true;
    showModelNotice('One 3D visual could not load.');
    finishWhenReady();
  }
);

function loadAppleModel() {
const appleLoader = new GLTFLoader();
appleLoader.load(
  'assets/red_apple.glb',
  gltf => {
    applePivot.add(fitModelToPivot(gltf, 2.35, appleMaterials));
    appleAvailable = true;
    window.__techwizAnyModelReady = true;
    if (modelFallback?.classList.contains('is-full')) hideModelFallback();
    if (!modelLoaded && !cabbageAvailable) {
      canvas.style.opacity = '1';
      sceneGlow.style.opacity = '0.9';
      hideModelFallback();
    }
    updateCanvasClip();
  },
  undefined,
  err => {
    console.error('Apple model could not load.', err);
    showModelNotice('One 3D visual could not load.');
  }
);
}

function loadCauliflowerModel() {
const cauliflowerLoader = new GLTFLoader();
cauliflowerLoader.load(
  'assets/cauliflower.glb',
  gltf => {
    cauliflowerPivot.add(fitModelToPivot(gltf, 2.45, cauliflowerMaterials));
    cauliflowerAvailable = true;
    window.__techwizAnyModelReady = true;
    if (modelFallback?.classList.contains('is-full')) hideModelFallback();
    if (!modelLoaded && !cabbageAvailable && !appleAvailable) {
      canvas.style.opacity = '1';
      sceneGlow.style.opacity = '0.9';
      hideModelFallback();
    }
    updateCanvasClip();
  },
  undefined,
  err => {
    console.error('Cauliflower model could not load.', err);
    showModelNotice('One 3D visual could not load.');
  }
);
}

function loadBroccoliModel() {
const broccoliLoader = new GLTFLoader();
broccoliLoader.load(
  'assets/broccoli.glb',
  gltf => {
    broccoliPivot.add(fitModelToPivot(gltf, 2.5, broccoliMaterials));
    broccoliAvailable = true;
    window.__techwizAnyModelReady = true;
    if (modelFallback?.classList.contains('is-full')) hideModelFallback();
    if (!modelLoaded && !cabbageAvailable && !appleAvailable && !cauliflowerAvailable) {
      canvas.style.opacity = '1';
      sceneGlow.style.opacity = '0.9';
      hideModelFallback();
    }
    updateCanvasClip();
  },
  undefined,
  err => {
    console.error('Broccoli model could not load.', err);
    showModelNotice('One 3D visual could not load.');
  }
);
}

function queueSecondaryModel(loadModel, delay) {
  if (!lowPowerDevice) {
    loadModel();
    return;
  }
  setTimeout(() => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadModel, { timeout: 2200 });
    } else {
      loadModel();
    }
  }, delay);
}

queueSecondaryModel(loadAppleModel, 500);
queueSecondaryModel(loadCauliflowerModel, 2300);
queueSecondaryModel(loadBroccoliModel, 4100);

function setModelOpacity(pivot, materials, opacity) {
  const alpha = Math.max(0, Math.min(1, opacity));
  pivot.visible = alpha > 0.001;
  materials.forEach(material => {
    const transparent = material.userData.fadeTransparent || alpha < 0.999;
    if (material.transparent !== transparent) {
      material.transparent = transparent;
      material.needsUpdate = true;
    }
    material.opacity = material.userData.fadeBaseOpacity * alpha;
    material.depthWrite = material.userData.fadeDepthWrite && alpha > 0.98;
  });
}

function applySectionModel(progress) {
  sectionModelMix = Math.max(0, Math.min(1, progress));
  let tomatoAlpha = 0;
  let cabbageAlpha = 0;
  let appleAlpha = 0;
  let cauliflowerAlpha = 0;
  let broccoliAlpha = 0;

  if (modelLoaded && cabbageAvailable) {
    const fade = THREE.MathUtils.smoothstep(sectionModelMix, 0.82, 1);
    tomatoAlpha = 1 - fade;
    cabbageAlpha = fade;
  } else if (cabbageAvailable) {
    cabbageAlpha = 1;
  } else if (modelLoaded) {
    tomatoAlpha = 1;
  } else if (appleAvailable) {
    appleAlpha = 1;
  } else if (cauliflowerAvailable) {
    cauliflowerAlpha = 1;
  } else if (broccoliAvailable) {
    broccoliAlpha = 1;
  }

  if (appleAvailable && appleSectionMix > 0 && appleAlpha < 1) {
    if (cabbageAlpha > 0) {
      const transfer = cabbageAlpha * appleSectionMix;
      cabbageAlpha -= transfer;
      appleAlpha += transfer;
    } else if (tomatoAlpha > 0) {
      const transfer = tomatoAlpha * appleSectionMix;
      tomatoAlpha -= transfer;
      appleAlpha += transfer;
    }
  }

  if (cauliflowerAvailable && cauliflowerSectionMix > 0 && cauliflowerAlpha < 1) {
    if (appleAlpha > 0) {
      const transfer = appleAlpha * cauliflowerSectionMix;
      appleAlpha -= transfer;
      cauliflowerAlpha += transfer;
    } else if (cabbageAlpha > 0) {
      const transfer = cabbageAlpha * cauliflowerSectionMix;
      cabbageAlpha -= transfer;
      cauliflowerAlpha += transfer;
    } else if (tomatoAlpha > 0) {
      const transfer = tomatoAlpha * cauliflowerSectionMix;
      tomatoAlpha -= transfer;
      cauliflowerAlpha += transfer;
    }
  }

  if (broccoliAvailable && broccoliSectionMix > 0 && broccoliAlpha < 1) {
    if (cauliflowerAlpha > 0) {
      const transfer = cauliflowerAlpha * broccoliSectionMix;
      cauliflowerAlpha -= transfer;
      broccoliAlpha += transfer;
    } else if (appleAlpha > 0) {
      const transfer = appleAlpha * broccoliSectionMix;
      appleAlpha -= transfer;
      broccoliAlpha += transfer;
    } else if (cabbageAlpha > 0) {
      const transfer = cabbageAlpha * broccoliSectionMix;
      cabbageAlpha -= transfer;
      broccoliAlpha += transfer;
    } else if (tomatoAlpha > 0) {
      const transfer = tomatoAlpha * broccoliSectionMix;
      tomatoAlpha -= transfer;
      broccoliAlpha += transfer;
    }
  }

  setModelOpacity(tomatoPivot, tomatoMaterials, tomatoAlpha);
  setModelOpacity(cabbagePivot, cabbageMaterials, cabbageAlpha);
  setModelOpacity(applePivot, appleMaterials, appleAlpha);
  setModelOpacity(cauliflowerPivot, cauliflowerMaterials, cauliflowerAlpha);
  setModelOpacity(broccoliPivot, broccoliMaterials, broccoliAlpha);
}
function finishWhenReady() {
  if (!modelLoaded || !cabbageLoaded) return;
  finishPageLoad();
}
function finishPageLoad() {
  clearTimeout(window.__techwizLoadFallback);
  if (document.body.classList.contains('is-ready')) return;
  if (pageLoader) {
    pageLoader.setAttribute('aria-hidden', 'true');
    const retireLoader = event => {
      if (event && (event.target !== pageLoader || event.propertyName !== 'transform')) return;
      pageLoader.hidden = true;
      pageLoader.removeEventListener('transitionend', retireLoader);
    };
    pageLoader.addEventListener('transitionend', retireLoader);
    setTimeout(() => retireLoader(), 1700);
  }
  requestAnimationFrame(() => {
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
  });
}
function showFallback(msg) {
  console.error(msg);
  if (modelFallback) {
    modelFallback.hidden = false;
    modelFallback.classList.add('is-full');
    modelFallback.querySelector('.model-fallback-text').textContent = msg;
  }
  finishPageLoad();
}

function showModelNotice(msg) {
  if (!modelFallback || (!modelLoaded && !cabbageAvailable && !appleAvailable && !cauliflowerAvailable && !broccoliAvailable)) return;
  modelFallback.hidden = false;
  modelFallback.classList.remove('is-full');
  modelFallback.querySelector('.model-fallback-text').textContent = msg;
  setTimeout(hideModelFallback, 6000);
}

function hideModelFallback() {
  if (!modelFallback) return;
  modelFallback.hidden = true;
  modelFallback.classList.remove('is-full');
}
/* ═══════════════════════════════════════════════════════
   SCROLL LOGIC
   
   Hero (section 1) → Philosophy (section 2)

   Phase A  [hero scrolling]:
     - tomato moves from center → left side
     - canvas stays fixed fullscreen (normal)

   Phase B  [philosophy is in view]:
     - cabbage replaces tomato at the same left-side position
     - cabbage descends with philosophy scroll progress
     - fixed canvas is not translated or clipped to the section

   Phase C  [layers section]:
     - apple replaces cabbage on the right

   Phase D  [evolve section]:
     - apple travels to the left and becomes cauliflower
═══════════════════════════════════════════════════════ */

function initSectionTextReveals(gsap) {
  const revealGroups = [
    [philosophySection, '.section-index, .headline-wrap .kicker, .headline-wrap h2, .headline-wrap .statement, .facts article'],
    [cabbageSection, '.section-index, .cabbage-copy .kicker, .cabbage-copy h2, .cabbage-copy .statement, .cabbage-points span'],
    [cauliflowerSection, '.section-index, .cauliflower-copy .kicker, .cauliflower-copy h2, .cauliflower-copy .statement, .cauliflower-points span'],
    [finalSection, '.section-index, .final-copy .kicker, .final-copy h2, .final-copy .statement, .final-points span']
  ];

  revealGroups.forEach(([section, selector]) => {
    if (!section) return;
    const items = section.querySelectorAll(selector);
    if (!items.length) return;
    if (reduceMotion) {
      gsap.set(items, { autoAlpha: 1, y: 0 });
      return;
    }
    gsap.set(items, { autoAlpha: 0, y: lowPowerDevice ? 14 : 22 });
    gsap.to(items, {
      autoAlpha: 1,
      y: 0,
      duration: lowPowerDevice ? .72 : .88,
      stagger: lowPowerDevice ? .06 : .08,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 45%',
        end: 'bottom 55%',
        toggleActions: 'restart reset restart reset',
        invalidateOnRefresh: true
      }
    });
  });
}

function initScrollMotion() {
  if (!window.gsap || !window.ScrollTrigger) return;

  const gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);
  const media = gsap.matchMedia();

  media.add('(min-width: 761px)', () => {
    gsap.set(motion, { x: 0, y: 0, rx: 0.08, ry: -0.55, rz: -0.12, scale: 0.96 });
    const aspect = innerWidth / innerHeight;
    const leftAnchor = Math.max(-2.75, -1.9 - Math.max(0, aspect - 1.4) * 1.2);
    const rightAnchor = -leftAnchor;

    const tomatoTravel = gsap.to(motion, {
      x: leftAnchor, y: -0.2,
      rx: 0.22, ry: 1.05, rz: 0.20, scale: 0.74,
      ease: 'none', onUpdate: requestRender,
      scrollTrigger: {
        trigger: '.hero', start: 'top top', end: 'bottom top',
        scrub: reduceMotion ? false : true, invalidateOnRefresh: true
      }
    });
    const cabbageJourney = gsap.fromTo(motion,
      { x: leftAnchor, y: -0.2, rx: 0.22, ry: 1.05, rz: 0.20, scale: 0.74 },
      {
        x: rightAnchor, y: -0.95,
        rx: 0.18, ry: 1.25, rz: -0.12, scale: 0.74,
        ease: 'none', immediateRender: false, onUpdate: requestRender,
        scrollTrigger: {
          trigger: '.philosophy', start: 'top top',
          endTrigger: '.cabbage-section', end: 'top -30%',
          scrub: reduceMotion ? false : true, invalidateOnRefresh: true
        }
      }
    );
    return () => { tomatoTravel.kill(); cabbageJourney.kill(); };
  });

  media.add('(max-width: 760px)', () => {
    gsap.set(motion, { x: 0, y: 0.36, rx: 0.08, ry: -0.55, rz: -0.10, scale: 0.91 });
    const tomatoTravel = gsap.to(motion, {
      x: -0.34, y: 0.62,
      rx: 0.22, ry: 1.05, rz: 0.14, scale: 0.65,
      ease: 'none', onUpdate: requestRender,
      scrollTrigger: {
        trigger: '.hero', start: 'top top', end: 'bottom top',
        scrub: reduceMotion ? false : true, invalidateOnRefresh: true
      }
    });
    const cabbageDescent = gsap.fromTo(motion,
      { x: -0.34, y: 0.62, rx: 0.22, ry: 1.05, rz: 0.14, scale: 0.65 },
      {
        x: -0.34, y: 0.02,
        rx: 0.18, ry: 1.18, rz: 0.04, scale: 0.65,
        ease: 'none', immediateRender: false, onUpdate: requestRender,
        scrollTrigger: {
          trigger: '.philosophy', start: 'top top', end: 'bottom top',
          scrub: reduceMotion ? false : true, invalidateOnRefresh: true
        }
      }
    );
    const cabbageTravel = gsap.fromTo(motion,
      { x: -0.34, y: 0.02, rx: 0.18, ry: 1.18, rz: 0.04, scale: 0.65 },
      {
        x: 0.34, y: 0.02,
        rx: 0.18, ry: 1.25, rz: -0.12, scale: 0.58,
        ease: 'power2.out', immediateRender: false, onUpdate: requestRender,
        scrollTrigger: {
          trigger: '.cabbage-section', start: 'top top', end: 'bottom top',
          scrub: reduceMotion ? false : true, invalidateOnRefresh: true
        }
      }
    );
    return () => { tomatoTravel.kill(); cabbageDescent.kill(); cabbageTravel.kill(); };
  });
  initSectionTextReveals(gsap);
  window.ScrollTrigger.addEventListener('refresh', updateCanvasClip);
}
function updateOrbitTarget(element, target) {
  const rect = element.getBoundingClientRect();
  const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.position.z;
  const visibleWidth = visibleHeight * camera.aspect;
  target.set(
    ((rect.left + rect.width * 0.5) / innerWidth - 0.5) * visibleWidth,
    (0.5 - (rect.top + rect.height * 0.5) / innerHeight) * visibleHeight
  );
}

/* ── Keep each model centered inside its section orbit ── */
function updateCanvasClip() {
  if (!heroSection || !philosophySection || !cabbageSection || !cauliflowerSection || !finalSection || !cabbageOrbit || !cauliflowerOrbit || !finalOrbit) return;

  const heroRect = heroSection.getBoundingClientRect();
  const philRect = philosophySection.getBoundingClientRect();
  const cabbageRect = cabbageSection.getBoundingClientRect();
  const cauliflowerRect = cauliflowerSection.getBoundingClientRect();
  const finalRect = finalSection.getBoundingClientRect();
  const vH = innerHeight;
  const fadeStart = vH * 0.88;
  const rawMix = Math.max(0, Math.min(1, (fadeStart - philRect.top) / (fadeStart + vH * 0.02)));
  const modelMix = rawMix * rawMix * (3 - 2 * rawMix);
  const thirdAlignRaw = Math.max(0, Math.min(1, (vH * 0.92 - cabbageRect.top) / (vH * 0.87)));
  thirdSectionAlignMix = thirdAlignRaw * thirdAlignRaw * thirdAlignRaw *
    (thirdAlignRaw * (thirdAlignRaw * 6 - 15) + 10);
  appleSectionMix = thirdSectionAlignMix;
  const fourthRaw = Math.max(0, Math.min(1, (vH - cauliflowerRect.top) / vH));
  fourthSectionMix = fourthRaw * fourthRaw * (3 - 2 * fourthRaw);
  cauliflowerSectionMix = fourthSectionMix;
  const fifthRaw = Math.max(0, Math.min(1, (vH - finalRect.top) / vH));
  fifthSectionMix = fifthRaw * fifthRaw * (3 - 2 * fifthRaw);
  const broccoliRaw = Math.max(0, Math.min(1, (fifthRaw - 0.72) / 0.28));
  broccoliSectionMix = broccoliRaw * broccoliRaw * (3 - 2 * broccoliRaw);
  updateOrbitTarget(cabbageOrbit, thirdOrbitTarget);
  updateOrbitTarget(cauliflowerOrbit, fourthOrbitTarget);
  updateOrbitTarget(finalOrbit, fifthOrbitTarget);
  applySectionModel(modelMix);

  const hasVisiblePanel = [heroRect, philRect, cabbageRect, cauliflowerRect, finalRect].some(rect => rect.bottom > 0 && rect.top < vH);
  canvas.style.translate = '0 0';
  sceneGlow.style.translate = '0 0';
  const clip = hasVisiblePanel ? 'inset(0px 0px 0px 0px)' : 'inset(0 0 100% 0)';
  canvas.style.clipPath = clip;
  sceneGlow.style.clipPath = clip;
  requestRender();
}

/* ── Resize ── */
function resize() {
  const w = innerWidth, h = innerHeight;
  viewportMobile = w <= 760;
  const dprCap = lowPowerDevice ? 1 : (viewportMobile ? 1.2 : 1.5);
  const dpr = Math.min(devicePixelRatio, dprCap);
  const drawW = Math.floor(w * dpr);
  const drawH = Math.floor(h * dpr);
  if (canvas.width !== drawW || canvas.height !== drawH) {
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
  }
  camera.aspect     = w / h;
  camera.position.z = viewportMobile ? 14.5 : 8.5;
  camera.updateProjectionMatrix();
  updateCanvasClip();
}

/* ── Render only when scroll, resize or a model update needs it ── */
let renderRequest = 0;
function requestRender() {
  if (!renderRequest) renderRequest = requestAnimationFrame(renderScene);
}

function renderScene() {
  renderRequest = 0;

  const sectionThreeX = THREE.MathUtils.lerp(motion.x, thirdOrbitTarget.x, thirdSectionAlignMix);
  const sectionThreeY = THREE.MathUtils.lerp(motion.y, thirdOrbitTarget.y, thirdSectionAlignMix);
  const sectionFourX = THREE.MathUtils.lerp(sectionThreeX, fourthOrbitTarget.x, fourthSectionMix);
  const sectionFourY = THREE.MathUtils.lerp(sectionThreeY, fourthOrbitTarget.y, fourthSectionMix);
  modelRoot.position.set(
    THREE.MathUtils.lerp(sectionFourX, fifthOrbitTarget.x, fifthSectionMix),
    THREE.MathUtils.lerp(sectionFourY, fifthOrbitTarget.y, fifthSectionMix),
    0
  );
  const revealProgress = Math.max(0, Math.min(1, (sectionModelMix - 0.88) / 0.12));
  const revealTurn = Math.sin(Math.PI * revealProgress);
  modelRoot.rotation.set(motion.rx, motion.ry + revealTurn * 0.42, motion.rz);
  modelRoot.scale.setScalar(motion.scale * (1 - revealTurn * 0.1));

  camera.lookAt(0, 0, 0);

  if (!modelLoaded && !cabbageAvailable && !appleAvailable && !cauliflowerAvailable && !broccoliAvailable) {
    canvas.style.opacity    = '0';
    sceneGlow.style.opacity = '0';
  }

  renderer.render(scene, camera);
}

/* ── Events ── */
addEventListener('resize', resize, { passive: true });
let scrollUpdateRequest = 0;
let scrollUpdateTimer = 0;
function scheduleCanvasUpdate() {
  if (lowPowerDevice) {
    if (scrollUpdateTimer) return;
    scrollUpdateTimer = setTimeout(() => {
      scrollUpdateTimer = 0;
      updateCanvasClip();
    }, 24);
    return;
  }
  if (scrollUpdateRequest) return;
  scrollUpdateRequest = requestAnimationFrame(() => {
    scrollUpdateRequest = 0;
    updateCanvasClip();
  });
}
addEventListener('scroll', scheduleCanvasUpdate, { passive: true });

let sectionScrollFrame = 0;
function cancelSectionScroll() {
  if (!sectionScrollFrame) return;
  cancelAnimationFrame(sectionScrollFrame);
  sectionScrollFrame = 0;
}

function scrollToSection(target) {
  cancelSectionScroll();
  const startY = scrollY;
  const maxY = Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const targetY = Math.max(0, Math.min(maxY, startY + target.getBoundingClientRect().top));
  const distance = targetY - startY;

  if (Math.abs(distance) < 2 || reduceMotion) {
    scrollTo(0, targetY);
    return;
  }

  const screens = Math.abs(distance) / Math.max(innerHeight, 1);
  const duration = Math.min(1450, Math.max(1050, 980 + screens * 140));
  const startedAt = performance.now();

  function step(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    scrollTo(0, startY + distance * eased);
    if (progress < 1) {
      sectionScrollFrame = requestAnimationFrame(step);
    } else {
      sectionScrollFrame = 0;
      scrollTo(0, targetY);
    }
  }

  sectionScrollFrame = requestAnimationFrame(step);
}

document.querySelectorAll('.section-scroll').forEach(link => {
  link.addEventListener('click', event => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    scrollToSection(target);
  });
});

addEventListener('wheel', cancelSectionScroll, { passive: true });
addEventListener('touchstart', cancelSectionScroll, { passive: true });
addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
    cancelSectionScroll();
  }
});

/* ── Boot ── */
resize();
initScrollMotion();
requestRender();
