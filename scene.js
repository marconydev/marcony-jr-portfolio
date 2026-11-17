import * as THREE from 'three';

// Uma unica cena 3D permanece atras de TODA a pagina e responde ao scroll global.
const canvas = document.getElementById('scene3d');
const stage = document.querySelector('.render-stage');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const small = window.matchMedia('(max-width: 768px)');
let renderer, scene, camera, core, halo, particles, raf=0, lastFrame=0, lastProgress=-1, disposed=false, drawFrame=()=>{};
const owned=[];
const own = r => (owned.push(r),r);
let scrollProgress=0;
const scrollEnd = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
let onScroll = () => {scrollProgress=Math.max(0,Math.min(1,window.scrollY/scrollEnd()));if(reduced.matches)invalidate();};
function invalidate(){if(!raf && !disposed && !document.hidden)raf=requestAnimationFrame(drawFrame);}
function resize(){if(!renderer||disposed)return;const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setPixelRatio(Math.min(devicePixelRatio||1,small.matches?1.1:1.45));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();invalidate();}
let observer;
try{
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:!small.matches,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0x080d12,0);
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(40,1,.1,100);
  core=new THREE.Group();scene.add(core);
  core.add(new THREE.Mesh(own(new THREE.IcosahedronGeometry(1.55,2)),own(new THREE.MeshPhongMaterial({color:0x153b41,transparent:true,opacity:.69,shininess:95,flatShading:true,side:THREE.DoubleSide}))));
  const ref=new THREE.IcosahedronGeometry(1.61,1);
  core.add(new THREE.LineSegments(own(new THREE.EdgesGeometry(ref)),own(new THREE.LineBasicMaterial({color:0x79e7dc,transparent:true,opacity:.59}))));ref.dispose();
  core.add(new THREE.Mesh(own(new THREE.IcosahedronGeometry(.8,2)),own(new THREE.MeshBasicMaterial({color:0x70dfd3,transparent:true,opacity:.30,wireframe:true}))));
  halo=new THREE.Group();core.add(halo);
  const ringGeo=own(new THREE.TorusGeometry(2.24,.013,6,132));
  const ringMat=own(new THREE.MeshBasicMaterial({color:0x71d9d0,transparent:true,opacity:.52}));
  for(const rotation of [[.45,.3,.72],[1.12,-.52,-.4],[-.3,.7,1.3]]){const r=new THREE.Mesh(ringGeo,ringMat);r.rotation.set(...rotation);halo.add(r);}
  const vertices=[],linkPositions=[];
  for(let i=0;i<72;i++){const y=1-2*i/71,r=Math.sqrt(Math.max(0,1-y*y)),t=i*Math.PI*(3-Math.sqrt(5));vertices.push(new THREE.Vector3(Math.cos(t)*r*1.84,y*1.84,Math.sin(t)*r*1.84));}
  for(let i=0;i<vertices.length;i++){
    const nearest=vertices.map((v,j)=>({j,d:vertices[i].distanceToSquared(v)})).filter(a=>a.j>i).sort((a,b)=>a.d-b.d).slice(0,2);
    nearest.forEach(a=>linkPositions.push(...vertices[i].toArray(),...vertices[a.j].toArray()));
  }
  const lg=own(new THREE.BufferGeometry());lg.setAttribute('position',new THREE.Float32BufferAttribute(linkPositions,3));
  core.add(new THREE.LineSegments(lg,own(new THREE.LineBasicMaterial({color:0x4ca6a3,transparent:true,opacity:.29}))));
  const ng=own(new THREE.BufferGeometry());ng.setFromPoints(vertices);
  core.add(new THREE.Points(ng,own(new THREE.PointsMaterial({color:0xc4fff4,size:.053,sizeAttenuation:true}))));
  const coords=[];
  for(let i=0;i<200;i++){const t=i*2.399963,y=2*i/199-1,r=Math.sqrt(Math.max(0,1-y*y)),d=3.7+i%14*.14;coords.push(Math.cos(t)*r*d,y*d,Math.sin(t)*r*d);}
  const pg=own(new THREE.BufferGeometry());pg.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
  particles=new THREE.Points(pg,own(new THREE.PointsMaterial({color:0x6db7ad,transparent:true,opacity:.46,size:.019,sizeAttenuation:true})));scene.add(particles);
  scene.add(new THREE.AmbientLight(0x487b80,1.7));
  const a=new THREE.PointLight(0x89eadf,45,17);a.position.set(3,4,6);scene.add(a);
  const b=new THREE.PointLight(0x3e8fa9,19,15);b.position.set(-4,-2,1);scene.add(b);
  drawFrame = function render(now){
    raf=0;if(disposed||document.hidden)return;
    // 30fps como alvo maximo quando a cena esta em repouso; scroll forca atualizacoes sob demanda.
    if(!reduced.matches&&now-lastFrame<28){raf=requestAnimationFrame(drawFrame);return;}
    lastFrame=now;
    const p=scrollProgress;
    const wobble=reduced.matches?0:now*.00005;
    core.rotation.set(-.15+p*.8,p*7.0+wobble,p*.28);
    halo.rotation.y=p*2.0;
    core.scale.setScalar(1+.16*Math.sin(p*Math.PI*3));
    particles.rotation.y=p*1.7;
    // Objeto mais a direita no hero, vai migrando para o centro nas secoes seguintes.
    const x=small.matches?0:1.15+Math.sin(p*Math.PI*3)*.45;
    camera.position.set(x, .16 + .6*Math.sin(p*Math.PI*2), 9.2-1.1*Math.sin(p*Math.PI*2));
    camera.lookAt(0,0,0);
    renderer.render(scene,camera);
    lastProgress=p;
    if(!reduced.matches)raf=requestAnimationFrame(drawFrame);
  }
  const onVisibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else invalidate();};
  const ro=new ResizeObserver(resize);ro.observe(stage);
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll,{passive:true});
  observer=new MutationObserver(()=>{onScroll();});observer.observe(document.body,{childList:true,subtree:false});
  canvas.classList.add('rendered');scrollProgress=Math.max(0,Math.min(1,window.scrollY/scrollEnd()));resize();invalidate();
  window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);ro.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',onScroll);owned.forEach(r=>r.dispose?.());renderer.dispose();},{once:true});
}catch(e){console.warn('WebGL indisponivel; layout alternativo preservado.',e);try{renderer?.dispose();}catch{}}
