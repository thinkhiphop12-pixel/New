'use client';

/**
 * 3D stadium background for the main menu (gap 77).
 *
 * Scope, honestly stated (see also the commit message): this builds a stadium
 * that reads as a stadium at a glance from menu-camera distance — it is not a
 * photoreal match-day render.
 *   - Procedural pitch texture: real markings, mown stripes, turf grain. Full.
 *   - Procedural crowd texture: noise-based seat/shirt colour grid tiled over
 *     the seating decks. Full (no individual spectator geometry or animation —
 *     deliberately simplified; a static crowd texture is what this needs).
 *   - Built stands: box/plane geometry — raked seating deck, roof, back wall
 *     and hoardings per side. Deliberately simplified (no concourses,
 *     stairwells, tunnel or tiered upper decks).
 *   - Floodlights: 4 corner pylons, each a real PointLight plus an
 *     additive-blended glow sprite. Full.
 *   - Animated camera: slow continuous orbit with a gentle vertical drift.
 *     Full, and disabled (single static frame) under
 *     `prefers-reduced-motion: reduce`.
 *
 * SSR/build safety: every `window`/`document`/WebGL touch happens inside the
 * `useEffect` below — nothing at module scope, nothing during render — so this
 * component is safe for Next.js to prerender.
 *
 * Lifecycle: the effect returns a cleanup that cancels the animation frame,
 * drops the resize listener, disposes every geometry/material/texture it
 * created, disposes the renderer and forces WebGL context loss. A three.js
 * scene that keeps rendering (or leaks a GL context) after unmount is a real
 * and common bug; this component is mounted/unmounted every time the player
 * enters and leaves the main menu, so it would leak a context per visit.
 *
 * Verification note: the scene was checked by screenshotting the running dev
 * server with the menu UI hidden, i.e. by looking at what actually rendered —
 * the compiler was happy with a first version whose full-depth stand roofs
 * covered the entire bowl and hid the pitch and every seat from the menu
 * camera, and whose camera elevation was too low to see over the near stand at
 * all. Both are fixed here; neither was visible from a green build.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { makeCrowdTexture, makeGlowTexture, makePitchTexture } from './textures';

// Pitch is 105 x 68 m, laid out on the XZ plane centred at the origin.
const PITCH_L = 105;
const PITCH_W = 68;

export default function StadiumScene() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Everything created here is tracked so cleanup can dispose all of it.
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];
    const track = <T extends THREE.BufferGeometry>(g: T): T => (geometries.push(g), g);
    const trackM = <T extends THREE.Material>(m: T): T => (materials.push(m), m);
    const trackT = <T extends THREE.Texture>(t: T): T => (textures.push(t), t);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    } catch {
      // No WebGL (old browser, blocked GPU): leave the menu on its flat
      // background rather than throwing inside the menu screen.
      return;
    }

    const size = () => ({
      w: host.clientWidth || window.innerWidth,
      h: host.clientHeight || window.innerHeight,
    });
    const { w: w0, h: h0 } = size();

    // Cap the pixel ratio: on a 3x phone / 2x retina laptop an uncapped ratio
    // is a 4-9x fill-rate cost for no visible gain on a background.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w0, h0, false);
    renderer.setClearColor(0x070b12, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x070b12, 300, 560);

    const camera = new THREE.PerspectiveCamera(42, w0 / h0, 1, 600);

    // ---- lighting -------------------------------------------------------
    scene.add(new THREE.AmbientLight(0x8fa2bc, 1.9));
    scene.add(new THREE.HemisphereLight(0x9fb4d4, 0x161d26, 1.0));

    // ---- pitch ----------------------------------------------------------
    const pitchTex = trackT(makePitchTexture());
    const pitch = new THREE.Mesh(
      track(new THREE.PlaneGeometry(PITCH_L + 10, PITCH_W + 10)),
      trackM(new THREE.MeshLambertMaterial({ map: pitchTex, emissive: 0x18391d, emissiveIntensity: 1 })),
    );
    pitch.rotation.x = -Math.PI / 2;
    scene.add(pitch);

    // Surrounding bowl floor, so the pitch doesn't float in the void.
    const floor = new THREE.Mesh(
      track(new THREE.PlaneGeometry(420, 360)),
      trackM(new THREE.MeshLambertMaterial({ color: 0x16202b })),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.2;
    scene.add(floor);

    // ---- goals ----------------------------------------------------------
    const goalMat = trackM(new THREE.MeshLambertMaterial({ color: 0xe6ebf2 }));
    const postGeo = track(new THREE.BoxGeometry(0.4, 2.44, 0.4));
    const barGeo = track(new THREE.BoxGeometry(0.4, 0.4, 7.32));
    for (const sx of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(sx * (PITCH_L / 2 - 2), 0, 0);
      for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(postGeo, goalMat);
        post.position.set(0, 1.22, (sz * 7.32) / 2);
        g.add(post);
      }
      const bar = new THREE.Mesh(barGeo, goalMat);
      bar.position.y = 2.44;
      g.add(bar);
      scene.add(g);
    }

    // ---- stands ---------------------------------------------------------
    // One template per side, rotated into place. Each stand = raked seating
    // deck (crowd texture) + roof slab + back wall + pitchside hoarding.
    const RAKE = 0.95; // radians from vertical; ~33 degrees of rake off horizontal
    const TIER = 34; // slope length of the seating deck
    const cosR = Math.cos(RAKE);
    const sinR = Math.sin(RAKE);

    const roofMat = trackM(new THREE.MeshLambertMaterial({ color: 0x3c4757 }));
    const wallMat = trackM(new THREE.MeshLambertMaterial({ color: 0x232c38 }));
    const boardMat = trackM(new THREE.MeshLambertMaterial({ color: 0x0e5fa8 }));

    const buildStand = (length: number, dist: number, rotY: number, tiles: number) => {
      const group = new THREE.Group();
      group.rotation.y = rotY;

      const crowdTex = trackT(makeCrowdTexture(tiles, 2));
      const deck = new THREE.Mesh(
        track(new THREE.PlaneGeometry(length, TIER)),
        trackM(new THREE.MeshLambertMaterial({ map: crowdTex, side: THREE.DoubleSide })),
      );
      deck.rotation.x = -RAKE;
      // Front edge sits at z = -dist, y = 2; the deck rises away from the pitch.
      deck.position.set(0, 2 + (TIER / 2) * cosR, -dist - (TIER / 2) * sinR);
      group.add(deck);

      // Narrow roof band over the BACK of the deck only. A full-depth roof
      // (the first version) completely hid the seating and the pitch from the
      // elevated menu camera — caught by screenshotting the bare scene.
      const ROOF_D = 13;
      const roof = new THREE.Mesh(track(new THREE.BoxGeometry(length + 6, 1.2, ROOF_D)), roofMat);
      roof.position.set(0, 2 + TIER * cosR + 7, -dist - TIER * sinR + ROOF_D / 2 - 1);
      group.add(roof);

      const back = new THREE.Mesh(
        track(new THREE.BoxGeometry(length + 6, 2 + TIER * cosR + 6, 2)),
        wallMat,
      );
      back.position.set(0, (2 + TIER * cosR + 6) / 2, -dist - TIER * sinR - 4);
      group.add(back);

      const board = new THREE.Mesh(track(new THREE.BoxGeometry(length, 1.6, 0.8)), boardMat);
      board.position.set(0, 0.8, -dist + 0.4);
      group.add(board);

      scene.add(group);
    };

    // Two side stands (behind the touchlines) and two end stands (behind goal).
    buildStand(130, PITCH_W / 2 + 8, 0, 10);
    buildStand(130, PITCH_W / 2 + 8, Math.PI, 10);
    buildStand(92, PITCH_L / 2 + 10, Math.PI / 2, 7);
    buildStand(92, PITCH_L / 2 + 10, -Math.PI / 2, 7);

    // ---- floodlights ----------------------------------------------------
    const glowTex = trackT(makeGlowTexture());
    const pylonMat = trackM(new THREE.MeshLambertMaterial({ color: 0x39424f }));
    const headMat = trackM(new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
    const pylonGeo = track(new THREE.CylinderGeometry(0.7, 1.4, 62, 8));
    const headGeo = track(new THREE.BoxGeometry(11, 6, 1.2));
    const glowMat = trackM(
      new THREE.SpriteMaterial({
        map: glowTex,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.75,
      }),
    );

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const x = sx * 78;
        const z = sz * 60;
        const pylon = new THREE.Mesh(pylonGeo, pylonMat);
        pylon.position.set(x, 31, z);
        scene.add(pylon);

        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(x, 63, z);
        head.lookAt(0, 0, 0);
        scene.add(head);

        // Real light + additive glow sprite. Distance-limited so four point
        // lights stay cheap.
        const light = new THREE.PointLight(0xfff3d0, 3.6, 300, 1.5);
        light.position.set(x, 62, z);
        scene.add(light);

        const glow = new THREE.Sprite(glowMat);
        glow.position.set(x, 63, z);
        glow.scale.set(30, 30, 1);
        scene.add(glow);
      }
    }

    // ---- night sky ------------------------------------------------------
    const starCount = 420;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      // Deterministic placement (no Math.random) so the sky is stable.
      const a = i * 2.399963; // golden-angle spiral
      const r = 320 + ((i * 37) % 90);
      const y = 60 + ((i * 53) % 190);
      starPos[i * 3] = Math.cos(a) * r;
      starPos[i * 3 + 1] = y;
      starPos[i * 3 + 2] = Math.sin(a) * r;
    }
    const starGeo = track(new THREE.BufferGeometry());
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      trackM(new THREE.PointsMaterial({ color: 0x9fb4d4, size: 1.8, sizeAttenuation: true, fog: false })),
    );
    scene.add(stars);

    // ---- camera + loop --------------------------------------------------
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const RADIUS = 218;
    let angle = Math.PI * 0.28;
    let raf = 0;
    let last = performance.now();

    const placeCamera = (t: number) => {
      camera.position.set(
        Math.cos(angle) * RADIUS,
        152 + Math.sin(t * 0.00021) * 14,
        Math.sin(angle) * RADIUS,
      );
      camera.lookAt(0, 4, 0);
    };

    const onResize = () => {
      const { w, h } = size();
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    window.addEventListener('resize', onResize);

    if (reduceMotion) {
      placeCamera(0);
      renderer.render(scene, camera);
    } else {
      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        const dt = Math.min(now - last, 100);
        last = now;
        angle += dt * 0.000055; // ~1 full orbit every ~1.9 minutes
        placeCamera(now);
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        // The canvas is decoration only — never let it swallow a click meant
        // for a menu button sitting above it.
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  );
}
