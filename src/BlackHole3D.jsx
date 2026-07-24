import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

function sciNotation(value, digits = 2) {
  if (value === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exp);
  return `${mantissa.toFixed(digits)}×10${toSuperscript(exp)}`;
}
function toSuperscript(n) {
  const map = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return String(n).split('').map((c) => map[c] || c).join('');
}

function makeNebulaTexture(colorA, colorB) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, colorA);
  grad.addColorStop(0.45, colorB);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

const HBAR = 1.0546e-34;
const C = 2.998e8;
const G = 6.674e-11;
const KB = 1.381e-23;
const SOLAR_MASS = 1.989e30;

const VIEWS = {
  overview: { azimuth: 0.6, polar: 1.15, radius: 10 },
  horizon: { azimuth: 0.3, polar: 1.35, radius: 3.4 },
  disk: { azimuth: 0.2, polar: 1.55, radius: 5.5 },
  nebula: { azimuth: 2.4, polar: 1.1, radius: 26 },
};

function MiniChart({ title, points, markerX, markerY, color, yLabelTop, yLabelBottom, deathX }) {
  const w = 300;
  const h = 150;
  const x0 = 34;
  const y0 = 14;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{title}</div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
        <line x1={x0} y1={y0} x2={x0} y2={h - 20} stroke="#4b5563" strokeWidth="0.5" />
        <line x1={x0} y1={h - 20} x2={w - 10} y2={h - 20} stroke="#4b5563" strokeWidth="0.5" />
        <path d={path} fill="none" stroke={color} strokeWidth="2" />
        {deathX != null && <circle cx={deathX} cy={h - 20} r="3.5" fill="#e24b4a" />}
        {markerX != null && (
          <>
            <line x1={markerX} y1={y0} x2={markerX} y2={h - 20} stroke="#facc15" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={markerX} cy={markerY} r="4" fill="#facc15" />
          </>
        )}
        <text x="6" y={y0 + 6} fontSize="9" fill="#6b7280">{yLabelTop}</text>
        <text x="6" y={h - 22} fontSize="9" fill="#6b7280">{yLabelBottom}</text>
      </svg>
    </div>
  );
}

function RelationPlots({ mass, spin }) {
  const mRel = Math.max(0.05, mass / 100);

  const w = 300, x0 = 34, xMax = w - 10, y0 = 14, yMax = 130;
  const steps = 50;

  const massTimePts = [];
  const ratePts = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / (steps - 1)) * 99;
    const frac = 1 - t / 100;
    const mr = Math.pow(Math.max(frac, 0.0001), 1 / 3);
    const dmdt = Math.min(25, 1 / (mr * mr));
    const x = x0 + (t / 99) * (xMax - x0);
    massTimePts.push({ x, y: y0 + (1 - mr) * (yMax - y0) });
    ratePts.push({ x, y: yMax - (dmdt / 25) * (yMax - y0) });
  }
  const tNow = 100 * (1 - Math.pow(mRel, 3));
  const xNowTime = x0 + (Math.min(99, tNow) / 99) * (xMax - x0);

  const mRange = [];
  for (let i = 0; i < steps; i++) mRange.push(0.05 + (i / (steps - 1)) * 0.95);
  const xOfM = (m) => x0 + (m) * (xMax - x0);
  const xNowM = xOfM(mRel);

  const tempPts = mRange.map((m) => ({ x: xOfM(m), y: yMax - (Math.min(20, 1 / m) / 20) * (yMax - y0) }));
  const radiusPts = mRange.map((m) => ({ x: xOfM(m), y: y0 + (1 - m) * (yMax - y0) }));
  const densityPts = mRange.map((m) => ({ x: xOfM(m), y: yMax - (Math.min(25, 1 / (m * m)) / 25) * (yMax - y0) }));

  const yAtM = (curve) => {
    let closest = curve[0];
    let bestDiff = Infinity;
    for (const p of curve) {
      const diff = Math.abs(p.x - xNowM);
      if (diff < bestDiff) { bestDiff = diff; closest = p; }
    }
    return closest.y;
  };
  const yAtTime = (curve) => {
    let closest = curve[0];
    let bestDiff = Infinity;
    for (const p of curve) {
      const diff = Math.abs(p.x - xNowTime);
      if (diff < bestDiff) { bestDiff = diff; closest = p; }
    }
    return closest.y;
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-gray-200 w-full">
      <div className="text-sm font-medium mb-3">Relation plots, live with your sliders</div>
      <div className="grid grid-cols-1 gap-y-5">
        <MiniChart title="Mass remaining vs time" points={massTimePts} markerX={xNowTime} markerY={yAtTime(massTimePts)} color="#93c5fd" yLabelTop="M₀" yLabelBottom="0" deathX={x0 + (xMax - x0)} />
        <MiniChart title="Evaporation velocity vs time" points={ratePts} markerX={xNowTime} markerY={yAtTime(ratePts)} color="#fca5a5" yLabelTop="fast" yLabelBottom="slow" deathX={x0 + (xMax - x0)} />
        <MiniChart title="Temperature vs mass (T ∝ 1/M)" points={tempPts} markerX={xNowM} markerY={yAtM(tempPts)} color="#fbbf24" yLabelTop="hot" yLabelBottom="cool" />
        <MiniChart title="Radius vs mass (R ∝ M)" points={radiusPts} markerX={xNowM} markerY={yAtM(radiusPts)} color="#34d399" yLabelTop="large" yLabelBottom="small" />
        <MiniChart title="Density vs mass (ρ ∝ 1/M²)" points={densityPts} markerX={xNowM} markerY={yAtM(densityPts)} color="#c084fc" yLabelTop="dense" yLabelBottom="sparse" />
      </div>
      <div className="text-xs text-gray-500 mt-3">
        Every marker tracks your mass slider live, right next to the black hole itself changing in the viewport.
      </div>
    </div>
  );
}

function SplitLayoutWrapper({ children }) {
  return <div style={{ width: '100%', overflowX: 'auto' }}>{children}</div>;
}

export default function BlackHole3D() {
  const mountRef = useRef(null);
  const engineRef = useRef({});
  const [mass, setMass] = useState(100);
  const [spin, setSpin] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [showPlots, setShowPlots] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    const height = enlarged ? 800 : 560;
    const width = mount.clientWidth;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03030a);
    scene.fog = new THREE.FogExp2(0x03030a, 0.006);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x334466, 0.8));
    const key = new THREE.PointLight(0xffb066, 3, 40, 2);
    key.position.set(4, 3, 3);
    scene.add(key);
    const rim = new THREE.PointLight(0x6fb3ff, 1.6, 40, 2);
    rim.position.set(-5, -2, -4);
    scene.add(rim);

    const nebulaSpecs = [
      { color: 'rgba(255,120,190,0.95)', edge: 'rgba(150,50,140,0.55)', pos: [-24, 10, -32], scale: 44 },
      { color: 'rgba(110,190,255,0.95)', edge: 'rgba(50,80,170,0.5)', pos: [30, -12, -38], scale: 50 },
      { color: 'rgba(150,255,220,0.9)', edge: 'rgba(30,140,120,0.45)', pos: [6, 24, -44], scale: 40 },
      { color: 'rgba(255,195,120,0.9)', edge: 'rgba(160,85,25,0.45)', pos: [-34, -16, -28], scale: 36 },
      { color: 'rgba(200,150,255,0.85)', edge: 'rgba(90,50,150,0.4)', pos: [40, 18, -50], scale: 46 },
    ];
    nebulaSpecs.forEach((spec) => {
      const tex = makeNebulaTexture(spec.color, spec.edge);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(...spec.pos);
      sprite.scale.set(spec.scale, spec.scale, 1);
      scene.add(sprite);
    });

    const starCount = 2600;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const palette = [
      [0.8, 0.85, 1.0],
      [1.0, 1.0, 1.0],
      [1.0, 0.92, 0.7],
      [1.0, 0.75, 0.5],
      [1.0, 0.55, 0.45],
    ];
    for (let i = 0; i < starCount; i++) {
      const r = 15 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
      const c = palette[Math.floor(Math.random() * palette.length)];
      starCol[i * 3] = c[0];
      starCol[i * 3 + 1] = c[1];
      starCol[i * 3 + 2] = c[2];
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const starMat = new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0.95, sizeAttenuation: true, fog: false });
    scene.add(new THREE.Points(starGeo, starMat));

    const horizonGeo = new THREE.SphereGeometry(1, 64, 64);
    const horizonMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1, metalness: 0 });
    const horizon = new THREE.Mesh(horizonGeo, horizonMat);
    scene.add(horizon);

    const glowGeo = new THREE.SphereGeometry(1.18, 48, 48);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.22, side: THREE.BackSide });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glow);

    const ergoGeo = new THREE.SphereGeometry(1.45, 48, 48);
    const ergoMat = new THREE.MeshBasicMaterial({ color: 0x8ad6ff, transparent: true, opacity: 0.0, side: THREE.BackSide });
    const ergo = new THREE.Mesh(ergoGeo, ergoMat);
    scene.add(ergo);

    const diskGroup = new THREE.Group();
    diskGroup.rotation.x = Math.PI / 2.15;
    scene.add(diskGroup);

    const ringColors = [0xeaf6ff, 0xffe0a0, 0xffa855, 0xe0693a, 0x9a3420];
    const rings = [];
    ringColors.forEach((color, i) => {
      const inner = 1.55 + i * 0.42;
      const outer = inner + 0.34;
      const geo = new THREE.RingGeometry(inner, outer, 96);
      const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.88 - i * 0.06 });
      const ring = new THREE.Mesh(geo, mat);
      diskGroup.add(ring);
      rings.push({ mesh: ring, base: new THREE.Color(color) });
    });

    const pairGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const inMat = new THREE.MeshBasicMaterial({ color: 0xe24b4a });
    const outMat = new THREE.MeshBasicMaterial({ color: 0x4fc3e0 });
    const pairs = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const inP = new THREE.Mesh(pairGeo, inMat.clone());
      const outP = new THREE.Mesh(pairGeo, outMat.clone());
      scene.add(inP, outP);
      pairs.push({ inP, outP, angle, offset: Math.random() * 10 });
    }

    const view = VIEWS[activeView] || VIEWS.overview;
    const cam = { azimuth: view.azimuth, polar: view.polar, radius: view.radius, targetAzimuth: view.azimuth, targetPolar: view.polar, targetRadius: view.radius };

    engineRef.current = { scene, camera, renderer, horizon, glow, ergo, diskGroup, rings, pairs, spinSpeed: 0.25, evapRate: 1, cam, mount };

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e) => {
      dragging = true;
      lastX = e.touches ? e.touches[0].clientX : e.clientX;
      lastY = e.touches ? e.touches[0].clientY : e.clientY;
    };
    const onMove = (e) => {
      if (!dragging) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = x - lastX;
      const dy = y - lastY;
      lastX = x;
      lastY = y;
      const c = engineRef.current.cam;
      c.azimuth += dx * 0.006;
      c.polar = Math.min(Math.PI - 0.1, Math.max(0.1, c.polar - dy * 0.006));
      c.targetAzimuth = c.azimuth;
      c.targetPolar = c.polar;
    };
    const onUp = () => { dragging = false; };
    const onWheel = (e) => {
      e.preventDefault();
      const c = engineRef.current.cam;
      c.targetRadius = Math.min(35, Math.max(2.2, c.targetRadius + e.deltaY * 0.01));
    };
    renderer.domElement.addEventListener('mousedown', onDown);
    renderer.domElement.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    renderer.domElement.addEventListener('touchstart', onDown);
    renderer.domElement.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    let frameId;
    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      const eng = engineRef.current;
      eng.diskGroup.rotation.z = t * eng.spinSpeed;
      const pulse = 0.22 + Math.sin(t * 1.4) * 0.05;
      eng.glow.material.opacity = pulse;

      const c = eng.cam;
      c.azimuth += (c.targetAzimuth - c.azimuth) * 0.08;
      c.polar += (c.targetPolar - c.polar) * 0.08;
      c.radius += (c.targetRadius - c.radius) * 0.08;
      camera.position.set(
        c.radius * Math.sin(c.polar) * Math.sin(c.azimuth),
        c.radius * Math.cos(c.polar),
        c.radius * Math.sin(c.polar) * Math.cos(c.azimuth)
      );
      camera.lookAt(0, 0, 0);

      eng.pairs.forEach((p) => {
        const cycle = ((t + p.offset) * eng.evapRate) % 3;
        const scale = eng.horizon.scale.x;
        const rIn = 1.6 * scale * (1 - cycle / 3);
        const rOut = 1.6 * scale * (1 + cycle * 1.6);
        p.inP.position.set(Math.cos(p.angle) * rIn, Math.sin(p.angle * 0.7) * 0.3, Math.sin(p.angle) * rIn);
        p.outP.position.set(Math.cos(p.angle) * rOut, Math.sin(p.angle * 0.7) * 0.5, Math.sin(p.angle) * rOut);
        p.inP.material.transparent = true;
        p.outP.material.transparent = true;
        p.inP.material.opacity = Math.max(0, 1 - cycle / 3);
        p.outP.material.opacity = Math.max(0, 1 - cycle / 3);
      });

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      const w = mount.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onDown);
      renderer.domElement.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      renderer.domElement.removeEventListener('touchstart', onDown);
      renderer.domElement.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [enlarged]);

  useEffect(() => {
    const eng = engineRef.current;
    if (!eng.horizon) return;
    const mRel = Math.max(0.05, mass / 100);
    const scale = Math.max(0.35, mRel);
    const spinFrac = spin / 100;

    eng.horizon.scale.set(scale, scale * (1 - spinFrac * 0.35), scale);
    eng.glow.scale.set(scale, scale * (1 - spinFrac * 0.3), scale);
    eng.ergo.scale.set(scale * (1 + spinFrac * 0.25), scale * (1 - spinFrac * 0.1), scale * (1 + spinFrac * 0.25));
    eng.ergo.material.opacity = spinFrac * 0.12;
    eng.diskGroup.scale.setScalar(scale);

    const tRel = 1 / mRel;
    eng.spinSpeed = (0.22 + spinFrac * 0.5) * tRel;
    eng.evapRate = tRel;
    const hot = new THREE.Color(0xffffff);
    eng.rings.forEach(({ mesh, base }) => {
      const mixAmt = Math.min(0.7, (tRel - 1) / 8);
      mesh.material.color = base.clone().lerp(hot, mixAmt);
    });
  }, [mass, spin]);

  const goToView = (name) => {
    setActiveView(name);
    const eng = engineRef.current;
    if (!eng.cam) return;
    const v = VIEWS[name];
    eng.cam.targetAzimuth = v.azimuth;
    eng.cam.targetPolar = v.polar;
    eng.cam.targetRadius = v.radius;
  };

  const mRel = Math.max(0.05, mass / 100);
  const M = mRel * SOLAR_MASS;
  const T_H = (HBAR * Math.pow(C, 3)) / (8 * Math.PI * G * M * KB);
  const R_s = (2 * G * M) / Math.pow(C, 2);
  const lifetimeSeconds = (5120 * Math.PI * Math.pow(G, 2) * Math.pow(M, 3)) / (HBAR * Math.pow(C, 4));
  const lifetimeYears = lifetimeSeconds / 3.156e7;

  const viewLabels = { overview: 'Overview', horizon: 'Horizon close-up', disk: 'Disk view', nebula: 'Nebula tour' };

  return (
    <SplitLayoutWrapper>
    <div className="flex flex-row gap-4 items-start" style={{ flexWrap: 'nowrap' }}>
      <div style={{ flex: '1 1 0%', minWidth: 0 }}>
        <div ref={mountRef} className="w-full rounded-lg overflow-hidden" style={{ height: enlarged ? 800 : 560, cursor: 'grab' }} />

        <div className="mt-3 flex flex-wrap gap-2">
          {Object.keys(VIEWS).map((name) => (
            <button
              key={name}
              onClick={() => goToView(name)}
              className="px-3 py-1 rounded text-xs border"
              style={{
                borderColor: activeView === name ? '#93c5fd' : '#4b5563',
                color: activeView === name ? '#93c5fd' : '#d1d5db',
                background: activeView === name ? 'rgba(147,197,253,0.1)' : 'transparent',
              }}
            >
              {viewLabels[name]}
            </button>
          ))}
          <button onClick={() => setEnlarged(!enlarged)} className="px-3 py-1 rounded text-xs border border-gray-600 text-gray-200 hover:bg-gray-800 ml-auto">
            {enlarged ? 'Minimize' : 'Enlarge'}
          </button>
        </div>
        <div className="mt-1 text-xs text-gray-500">Drag to rotate 360° in any direction, scroll or pinch to zoom, or tap a view above</div>

        <div className="mt-3 flex items-center gap-3">
          <label className="text-xs text-gray-400 w-20 flex-shrink-0">Mass</label>
          <input type="range" min="5" max="100" value={mass} step="1" onChange={(e) => setMass(Number(e.target.value))} className="flex-1" />
          <span className="text-xs font-medium w-14 text-right text-gray-200">{mass}% M☉</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <label className="text-xs text-gray-400 w-20 flex-shrink-0">Spin (a/M)</label>
          <input type="range" min="0" max="99" value={spin} step="1" onChange={(e) => setSpin(Number(e.target.value))} className="flex-1" />
          <span className="text-xs font-medium w-14 text-right text-gray-200">{(spin / 100).toFixed(2)}</span>
        </div>

        <div className="mt-3">
          <button onClick={() => setShowPlots(!showPlots)} className="px-3 py-1.5 rounded text-xs border border-gray-600 text-gray-200 hover:bg-gray-800">
            {showPlots ? 'Hide relation plots' : 'Show relation plots'}
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900 p-4 text-gray-200" style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.9 }}>
          <div style={{ color: '#93c5fd' }}>Live equation, recomputed each time you move a slider</div>
          <div className="mt-2">T_H = ħc³ / (8πGM k_B) = <span style={{ color: '#fca5a5' }}>{sciNotation(T_H)} K</span></div>
          <div>R_s = 2GM / c² = <span style={{ color: '#fca5a5' }}>{sciNotation(R_s)} m</span></div>
          <div>Evaporation time ∝ M³ = <span style={{ color: '#fca5a5' }}>{sciNotation(lifetimeYears)} years</span></div>
          <div className="mt-2 text-gray-500">M = {sciNotation(M)} kg ({mass}% of one solar mass) — the only quantity you're changing</div>
          <div className="text-gray-500">ħ, c, G, k_B stay fixed at their real values the whole time</div>
          <div className="text-gray-500">Spin (a/M) flattens the horizon and grows a faint ergosphere, schematic only, not the full Kerr metric</div>
        </div>
      </div>

      {showPlots && (
        <div style={{ width: 300, flexShrink: 0 }}>
          <RelationPlots mass={mass} spin={spin} />
        </div>
      )}
    </div>
    </SplitLayoutWrapper>
  );
}
