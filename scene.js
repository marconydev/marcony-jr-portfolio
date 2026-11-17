import * as THREE from 'three';

/**
 * MARCONY JR — Service topology (visualização conceitual).
 * A topologia é ilustrativa: nenhum ponto ou dado representa monitoramento real.
 * Sem órbita infinita e sem controles disputando a câmera: o scroll dita a narrativa.
 * Three.js 0.187.0, render sob demanda fora da abertura e DPR limitado.
 */
const canvas = document.getElementById('scene3d');
const stage = document.querySelector('.render-stage');
const hero = document.querySelector('.cine');
const stateTitle = document.getElementById('topology-state');
const stateCopy = document.getElementById('topology-caption');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const compact = matchMedia('(max-width: 768px)');
const finePointer = matchMedia('(pointer: fine) and (hover: hover)');

if (canvas && stage && hero) {
  const palette = {
    base: new THREE.Color('#4f8c93'),
    bright: new THREE.Color('#b2fff1'),
    muted: new THREE.Color('#5f9ea4'),
    amber: new THREE.Color('#e7bf84'),
    pale: new THREE.Color('#d7f5ef'),
  };
  const topics = [
    ['Topologia de serviços', 'Infraestrutura, aplicações e dados conectados'],
    ['Diagnóstico e resposta', 'Relações entre incidentes, serviços e equipes'],
    ['Sistemas e produtos', 'Arquitetura, APIs e interfaces em uma mesma operação'],
  ];

  // A posição e os vínculos dos serviços foram desenhados para lembrar
  // mapas de dependências, e não um globo de partículas genérico.
  const services = [
    {id:'usuários',group:'edge',x:-2.90,y: 1.55,z:  .12},
    {id:'web',group:'product',x:-1.35,y: 1.52,z: -.25},
    {id:'gateway',group:'api',x: .14,y: 1.04,z:  .05},
    {id:'serviços',group:'api',x: 1.85,y: 1.43,z: -.30},
    {id:'app',group:'product',x: 3.02,y:  .45,z:  .12},
    {id:'suporte',group:'ops',x:-2.92,y:-.05,z: -.15},
    {id:'itsm',group:'ops',x:-1.25,y: -.25,z:  .27},
    {id:'observabilidade',group:'ops',x:.40,y: -.25,z:  .55},
    {id:'logs',group:'ops',x:1.70,y:-1.10,z: -.15},
    {id:'banco',group:'data',x:3.02,y:-1.32,z:  .10},
    {id:'rede',group:'infra',x:-3.1,y:-1.8,z:  .08},
    {id:'servidores',group:'infra',x:-1.48,y:-1.80,z: -.18},
    {id:'automação',group:'product',x:.20,y:-1.90,z:  .12},
    {id:'dashboards',group:'data',x: 1.88,y: .40,z: -.38},
  ];
  const edges = [
    [0,1],[1,2],[2,3],[3,4],[4,9],[3,13],[13,7],
    [5,6],[6,7],[7,8],[8,9],[10,11],[11,7],[11,12],
    [7,12],[2,7],[6,11],[7,13],[12,9],[1,6],
  ];
  const affected = new Set([2,3,7,8,13]);
  const emphasizeBuild = new Set([1,2,3,4,9,12,13]);

  let renderer, scene, camera, network, points, signals, lines, backdrop;
  let lastRAF = 0, lastPaint = 0, lastIdle = 0, ready = false, alive = true;
  let targetScroll = 0, easedScroll = 0, targetMouseX = 0, targetMouseY = 0;
  let mouseX = 0, mouseY = 0, chapter = -1, heroDistance = 1;
  let lastScroll = 0, needsPaint = true;
  let owned = [];
  let observer;
  const keep = (resource) => (owned.push(resource), resource);
  const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
  const smooth = (a,b,v) => {let t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
  const tempObject = new THREE.Object3D();
  const tempColor = new THREE.Color();
  const nodePositions = services.map(() => new THREE.Vector3());
  const colorAttributes = new Float32Array(edges.length * 6);
  const linkCoordinates = new Float32Array(edges.length * 6);
  const particleCount = compact.matches ? 15 : 30;

  function getHeroProgress() {
    heroDistance = Math.max(1,hero.offsetHeight-innerHeight);
    return clamp(window.scrollY/heroDistance);
  }

  function syncState() {
    targetScroll = getHeroProgress();
    const nowChapter = targetScroll < .32 ? 0 : targetScroll < .66 ? 1 : 2;
    if (chapter !== nowChapter) {
      chapter = nowChapter;
      if (stateTitle) stateTitle.textContent = topics[chapter][0];
      if (stateCopy) stateCopy.textContent = topics[chapter][1];
      stage.dataset.chapter = String(chapter);
    }
    const inHero = window.scrollY < hero.offsetTop + hero.offsetHeight - innerHeight * .12;
    stage.classList.toggle('is-reading',!inHero);
    lastScroll = performance.now();
    needsPaint = true;
    invalidate();
  }

  function invalidate() {
    if (alive && ready && !document.hidden && !lastRAF) lastRAF = requestAnimationFrame(render);
  }

  function resize() {
    if (!renderer || !camera) return;
    const w = Math.max(1,stage.clientWidth), h=Math.max(1,stage.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,compact.matches?1:1.4));
    renderer.setSize(w,h,false);
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    needsPaint=true;
    invalidate();
  }

  // Em vez de trocar peças durante o scroll, os nós sempre representam
  // os mesmos tipos de serviço; mudam o foco, a posição e o fluxo.
  function updateGraph(time) {
    const p = easedScroll;
    const incident = smooth(.24,.44,p)*(1-smooth(.60,.79,p));
    const build = smooth(.59,.90,p);
    const isMobile = compact.matches;
    const baseX = isMobile ? .10 : 2.62;
    const graphScale = isMobile ? .82 : 1.12;
    network.position.set(baseX, isMobile?-.22:.02,0);
    network.scale.setScalar(graphScale);
    network.rotation.y = (isMobile?0:-.065) + (reduced.matches?0:mouseX*.035) + build*.055;
    network.rotation.x = (reduced.matches?0:mouseY*.032) + incident*.02;

    services.forEach((n,i) => {
      const v=nodePositions[i];
      const processing = n.group==='ops';
      const product = n.group==='product'||n.group==='api';
      v.set(
        n.x + build*((product?.35:-.20)) + incident*(affected.has(i)?-.11:.05),
        n.y + build*((n.group==='infra'?.24:n.group==='data'?-.12:.03)) + incident*(processing?.09:-.02),
        n.z + incident*(affected.has(i)?.22:-.03) + build*(product?.18:-.08)
      );
      tempObject.position.copy(v);
      const intensity = (incident&&affected.has(i)) ? (1 + incident*.3) : 1;
      tempObject.scale.setScalar((i===7||i===2||i===12?1.38:1)*intensity);
      tempObject.updateMatrix();
      points.setMatrixAt(i,tempObject.matrix);
      const base= n.group==='ops'?palette.bright:n.group==='product'?palette.pale:palette.base;
      tempColor.copy(base);
      if (affected.has(i)) tempColor.lerp(palette.amber,incident*.88);
      if (emphasizeBuild.has(i)) tempColor.lerp(palette.bright,build*.50);
      points.setColorAt(i,tempColor);
    });
    points.instanceMatrix.needsUpdate=true;
    if(points.instanceColor) points.instanceColor.needsUpdate=true;

    edges.forEach(([a,b],i)=>{
      const v=nodePositions[a],w=nodePositions[b],k=i*6;
      linkCoordinates.set([v.x,v.y,v.z,w.x,w.y,w.z],k);
      const alert=affected.has(a)&&affected.has(b);
      const highlighted=emphasizeBuild.has(a)&&emphasizeBuild.has(b);
      tempColor.copy(palette.muted);
      if (alert) tempColor.lerp(palette.amber,incident*.9);
      if (highlighted) tempColor.lerp(palette.bright,build*.55);
      colorAttributes.set([tempColor.r,tempColor.g,tempColor.b,tempColor.r,tempColor.g,tempColor.b],k);
    });
    lines.geometry.attributes.position.needsUpdate=true;
    lines.geometry.attributes.color.needsUpdate=true;

    // Pacotes atravessando os links; movimento em velocidade constante,
    // desacelerado com reduced-motion e ausente quando a cena está distante.
    const active=!reduced.matches&&!stage.classList.contains('is-reading');
    for(let i=0;i<particleCount;i++){
      const e=edges[(i*7+3)%edges.length];
      const v=nodePositions[e[0]],w=nodePositions[e[1]];
      const along=active?((time*.00009*(1+(i%3)*.18)+i*.137)%1):((i*.137)%1);
      tempObject.position.copy(v).lerp(w,along);
      tempObject.scale.setScalar(i%5===0?1.6:.88);
      tempObject.updateMatrix();signals.setMatrixAt(i,tempObject.matrix);
    }
    signals.instanceMatrix.needsUpdate=true;
    signals.visible= !stage.classList.contains('is-reading') && !reduced.matches;
    const driftX = reduced.matches ? 0 : Math.sin(time * 0.00022) * 0.08;
    const driftY = reduced.matches ? 0 : Math.cos(time * 0.00017) * 0.05;
    camera.position.set((isMobile?0:.10)+mouseX*.13+driftX,mouseY*.11+driftY,12.4);
    camera.lookAt(0,0,0);
  }

  function render(time) {
    lastRAF=0;
    if (!alive || document.hidden || !renderer) return;
    const activeHero = !stage.classList.contains('is-reading');
    const motion = !reduced.matches && activeHero;
    const limit = motion ? 1000/30 : 0;
    if (limit && time-lastPaint<limit) {invalidate();return;}
    lastPaint=time;
    const smoothing = reduced.matches?1:.145;
    easedScroll += (targetScroll-easedScroll)*smoothing;
    mouseX += (targetMouseX-mouseX)*.11;
    mouseY += (targetMouseY-mouseY)*.11;
    updateGraph(time);
    renderer.render(scene,camera);
    if (!stage.classList.contains('is-rendered')) stage.classList.add('is-rendered');
    needsPaint=false;
    const settling = Math.abs(targetScroll-easedScroll)>.001 ||Math.abs(mouseX-targetMouseX)+Math.abs(mouseY-targetMouseY)>.003;
    if (motion||settling||needsPaint) invalidate();
  }

  try {
    renderer = new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.setClearColor(0x080d12,0);
    scene = new THREE.Scene();
    camera=new THREE.PerspectiveCamera(38,1,.1,70);
    network=new THREE.Group();scene.add(network);
    const nodeGeometry=keep(new THREE.SphereGeometry(.095,14,10));
    const nodeMaterial=keep(new THREE.MeshBasicMaterial({color:0xffffff}));
    points=new THREE.InstancedMesh(nodeGeometry,nodeMaterial,services.length);
    points.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    points.frustumCulled=false;
    network.add(points);

    const lineGeometry=keep(new THREE.BufferGeometry());
    lineGeometry.setAttribute('position',new THREE.BufferAttribute(linkCoordinates,3).setUsage(THREE.DynamicDrawUsage));
    lineGeometry.setAttribute('color',new THREE.BufferAttribute(colorAttributes,3).setUsage(THREE.DynamicDrawUsage));
    lines=new THREE.LineSegments(lineGeometry,keep(new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.68})));
    lines.frustumCulled=false;network.add(lines);

    const packetGeom=keep(new THREE.SphereGeometry(.028,8,6));
    signals=new THREE.InstancedMesh(packetGeom,keep(new THREE.MeshBasicMaterial({color:0xcffff1,transparent:true,opacity:.96})),particleCount);
    signals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    signals.frustumCulled=false;network.add(signals);

    // Discos de orientação discretos: referência à infraestrutura, não holograma.
    const ringGeometry=keep(new THREE.RingGeometry(.17,.182,48));
    const ringMaterial=keep(new THREE.MeshBasicMaterial({color:0x9eddd5,transparent:true,opacity:.56,side:THREE.DoubleSide,depthWrite:false}));
    for(let i of [2,7,12]){
      const r=new THREE.Mesh(ringGeometry,ringMaterial);
      r.position.copy(new THREE.Vector3(services[i].x,services[i].y,services[i].z));
      network.add(r);
    }

    ready=true;
    const ro=new ResizeObserver(resize);ro.observe(stage);observer=ro;
    const onMove=(event)=>{
      if(!finePointer.matches || reduced.matches) return;
      targetMouseX=clamp((event.clientX/innerWidth-.5)*2,-1,1);
      targetMouseY=clamp((event.clientY/innerHeight-.5)*2,-1,1);
      invalidate();
    };
    const onVisibility=()=>{if(document.hidden){cancelAnimationFrame(lastRAF);lastRAF=0;}else invalidate()};
    window.addEventListener('scroll',syncState,{passive:true});
    window.addEventListener('resize',syncState,{passive:true});
    window.addEventListener('pointermove',onMove,{passive:true});
    document.addEventListener('visibilitychange',onVisibility);
    reduced.addEventListener?.('change',syncState);
    syncState();resize();

    window.addEventListener('pagehide',()=>{
      alive=false;cancelAnimationFrame(lastRAF);lastRAF=0;
      observer?.disconnect();
      window.removeEventListener('scroll',syncState);
      window.removeEventListener('resize',syncState);
      window.removeEventListener('pointermove',onMove);
      document.removeEventListener('visibilitychange',onVisibility);
      reduced.removeEventListener?.('change',syncState);
      owned.forEach(r=>r.dispose?.());
      renderer.dispose();
    },{once:true});
  } catch(error) {
    console.warn('Mapa 3D indisponível; ilustração SVG preservada.',error);
    try{renderer?.dispose();}catch{}
    stage.classList.add('webgl-unavailable');
  }
}
