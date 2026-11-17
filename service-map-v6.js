/* Marcony Jr V8 · Topologia direcionada e ciclo didático de incidente. Sem dados reais.
   UI sem biblioteca adicional; mantém funcionalidades com Three.js indisponível. */
(() => {
  'use strict';
  const map = document.getElementById('service-map');
  const wires = document.getElementById('service-map-wires');
  const nodesRoot = document.getElementById('service-map-nodes');
  const mobileSlot = document.getElementById('service-map-mobile-slot');
  const hero = document.querySelector('.cine');
  const desktopContainer = document.querySelector('.cine-sticky');
  const stage = document.querySelector('.render-stage');
  if (!map || !wires || !nodesRoot || !hero || !desktopContainer) return;

  // Três momentos para contar o portfólio. Não equivalem às fases formais do ITIL.
  const names = {
    observe: {focus:'01 / OBSERVAR',readout:'TOPOLOGIA E SINAIS',default:'observabilidade'},
    diagnose: {focus:'02 / DIAGNOSTICAR',readout:'TRIAR · MITIGAR · VALIDAR',default:'itsm'},
    build: {focus:'03 / CONSTRUIR',readout:'EVOLUIR SERVIÇOS E PRODUTOS',default:'automacao'},
  };
  const services = [
    {id:'usuarios',name:'Usuários',code:'USR',x:72,y:100,group:'edge',description:'Uma solicitação começa na experiência do usuário e percorre serviços até consultar ou registrar dados.'},
    {id:'interface',name:'Web / PWA',code:'WEB',x:218,y:87,group:'build',description:'A interface encaminha requisições às APIs e apresenta respostas, formulários e dados.'},
    {id:'gateway',name:'APIs',code:'API',x:361,y:125,group:'build',description:'APIs recebem requisições, validam contratos e encaminham operações para serviços de aplicação.'},
    {id:'servicos',name:'Serviços',code:'APP',x:525,y:87,group:'build',description:'Os serviços executam regras de negócio e dependem de infraestrutura e dados.'},
    {id:'dados',name:'Dados',code:'SQL',x:579,y:270,group:'build',description:'O banco recebe consultas dos serviços; indicadores podem mostrar erros e latência nesse caminho.'},
    {id:'observabilidade',name:'Observabilidade',code:'OBS',x:368,y:263,group:'observe',description:'Métricas, logs e traces dos componentes ajudam a detectar sintomas e investigar dependências afetadas.'},
    {id:'itsm',name:'ITSM / Jira',code:'ITSM',x:184,y:262,group:'diagnose',description:'Alertas ou relatos são triados por impacto e prioridade; a equipe investiga, mitiga e valida a recuperação.'},
    {id:'infra',name:'Infraestrutura',code:'INF',x:66,y:326,group:'observe',description:'Servidores, rede e disponibilidade sustentam aplicações; suas métricas também alimentam a observabilidade.'},
    {id:'automacao',name:'Engenharia',code:'ENG',x:475,y:363,group:'build',description:'Depois de estabilizar o serviço, mudanças, automações e melhorias podem reduzir a reincidência.'},
  ];
  // Direções representam relações distintas, e não um único caminho linear:
  // request = requisição, telemetry = sinais de APM/infra,
  // dependency = sustentação de ambiente, alert = abertura/acionamento,
  // response = coordenação de resposta, improvement = mudança posterior.
  const links = [
    ['usuarios','interface','request'],
    ['interface','gateway','request'],
    ['gateway','servicos','request'],
    ['servicos','dados','request'],
    ['infra','servicos','dependency'],
    ['gateway','observabilidade','telemetry'],
    ['servicos','observabilidade','telemetry'],
    ['dados','observabilidade','telemetry'],
    ['infra','observabilidade','telemetry'],
    ['observabilidade','itsm','alert'],
    ['itsm','automacao','response'],
    ['automacao','servicos','improvement'],
  ];
  const focusNodes = {
    observe:new Set(['usuarios','interface','gateway','servicos','dados','infra','observabilidade']),
    diagnose:new Set(['observabilidade','itsm','servicos','automacao']),
    build:new Set(['interface','gateway','servicos','dados','automacao']),
  };
  const nodeById = new Map(services.map(item => [item.id,item]));
  const ns = 'http://www.w3.org/2000/svg';
  const paths=[];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 1000px)');
  const chapterOrder=['observe','diagnose','build'];
  const autoNodeSequence = {
    observe:['observabilidade','infra','gateway'],
    diagnose:['observabilidade','itsm','servicos'],
    build:['automacao','servicos','interface']
  };
  let chapter='observe', selected=names.observe.default, hovered=null, manualMobile=false;
  let running=false, raf=0, prevFrame=0, visible=true, scrollScheduled=false;
  let lastInteraction=0;

  // Marcadores discretos para separar o fluxo da aplicação do trabalho operacional.
  const defs=document.createElementNS(ns,'defs');
  for (const [type,color] of Object.entries({request:'#8bd8ce',alert:'#e9bb82',response:'#d8b489',improvement:'#a5b8ec'})) {
    const marker=document.createElementNS(ns,'marker');
    marker.setAttribute('id',`map-arrow-${type}`);
    marker.setAttribute('viewBox','0 0 8 8');
    marker.setAttribute('markerWidth','5');
    marker.setAttribute('markerHeight','5');
    marker.setAttribute('refX','7');
    marker.setAttribute('refY','4');
    marker.setAttribute('orient','auto');
    const tip=document.createElementNS(ns,'path');
    tip.setAttribute('d','M 0 0 L 8 4 L 0 8 z');
    tip.setAttribute('fill',color);
    marker.append(tip);
    defs.append(marker);
  }
  wires.append(defs);
  for (const [from,to,type] of links) {
    const a=nodeById.get(from),b=nodeById.get(to);
    const path=document.createElementNS(ns,'path');
    path.setAttribute('d',`M ${a.x} ${a.y} L ${b.x} ${b.y}`);
    path.setAttribute('class',`service-map__edge service-map__edge--${type}`);
    path.setAttribute('data-from',from);
    path.setAttribute('data-to',to);
    path.setAttribute('data-type',type);
    if(['request','alert','response','improvement'].includes(type)) {
      path.setAttribute('marker-end',`url(#map-arrow-${type})`);
    }
    wires.append(path);
    paths.push({el:path,from,to,type,length:Math.hypot(b.x-a.x,b.y-a.y),a,b});
  }
  const motionPaths={
    observe:paths.filter(item=>['request','telemetry'].includes(item.type)),
    diagnose:paths.filter(item=>['telemetry','alert','response'].includes(item.type)),
    build:paths.filter(item=>['request','improvement'].includes(item.type)),
  };
  const packetGroup=document.createElementNS(ns,'g');
  packetGroup.classList.add('service-map__traffic');
  wires.append(packetGroup);
  const packets = Array.from({length:7},(_,i)=>{
    const circle=document.createElementNS(ns,'circle');
    circle.setAttribute('r',i%3===0?'2.9':'2');
    circle.setAttribute('class','service-map__packet');
    packetGroup.append(circle);
    return {el:circle,speed:.000060+i*.000010,offset:(i*.178)%1,edge:i*5%paths.length};
  });

  for (const item of services) {
    const button=document.createElement('button');
    button.type='button';
    button.className='service-map__node';
    button.dataset.node=item.id;
    button.setAttribute('aria-label',`Explorar ${item.name}`);
    button.setAttribute('aria-pressed','false');
    button.style.setProperty('--node-x',`${item.x / 680 * 100}%`);
    button.style.setProperty('--node-y',`${item.y / 420 * 100}%`);
    // Textos são DOM e continuam legíveis mesmo sem canvas/WebGL.
    const glyph=document.createElement('span');glyph.className='service-map__glyph';glyph.textContent=item.code;
    const label=document.createElement('span');label.className='service-map__node-label';label.textContent=item.name;
    button.append(glyph,label);
    button.addEventListener('pointerenter',()=>{lastInteraction=performance.now();hovered=item.id;updateInspector(item.id,false)});
    button.addEventListener('pointerleave',()=>{hovered=null;updateInspector(selected,false)});
    button.addEventListener('focus',()=>{lastInteraction=performance.now();hovered=item.id;updateInspector(item.id,false)});
    button.addEventListener('blur',()=>{hovered=null;updateInspector(selected,false)});
    button.addEventListener('click',()=>{lastInteraction=performance.now();selected=item.id;hovered=null;updateInspector(item.id,true)});
    nodesRoot.append(button);
  }
  function updateInspector(id,fromUser) {
    const item=nodeById.get(id);
    if (!item) return;
    document.getElementById('service-map-name').textContent=item.name;
    document.getElementById('service-map-description').textContent=item.description;
    const selectedSet=focusNodes[chapter];
    nodesRoot.querySelectorAll('button').forEach(button=>{
      const key=button.dataset.node;
      button.classList.toggle('is-selected',key===id);
      button.classList.toggle('is-contextual',selectedSet.has(key));
      button.setAttribute('aria-pressed',String(key===selected));
    });
    for (const edge of paths) {
      const direct = edge.from===id||edge.to===id;
      const emphasis = (chapter==='observe' && ['request','telemetry'].includes(edge.type)) ||
        (chapter==='diagnose' && ['telemetry','alert','response'].includes(edge.type)) ||
        (chapter==='build' && ['request','improvement'].includes(edge.type));
      edge.el.classList.toggle('is-route',direct && emphasis);
      edge.el.classList.toggle('is-contextual',emphasis);
      edge.el.classList.toggle('is-investigating',chapter==='diagnose' && ['alert','response'].includes(edge.type));
    }
    if(fromUser) map.dataset.inspected=id;
  }
  function setChapter(next, options = {}) {
    if (!names[next]) return;
    const preserveSelection = Boolean(options.preserveSelection);
    chapter=next;
    selected = preserveSelection && nodeById.has(selected) ? selected : (options.selected || names[next].default);
    hovered=null;
    map.dataset.chapter=next;
    stage?.setAttribute('data-map-state', next);
    map.querySelectorAll('[data-map-step]').forEach(button=>{
      button.classList.toggle('is-active',button.dataset.mapStep===next);
      button.setAttribute('aria-pressed',String(button.dataset.mapStep===next));
    });
    document.getElementById('service-map-focus').textContent=names[next].focus;
    document.getElementById('service-map-readout').textContent=names[next].readout;
    document.getElementById('service-map-health').textContent=next==='observe'?'SERVIÇOS':next==='diagnose'?'INCIDENTE':'PRODUTOS';
    document.getElementById('service-map-alert').textContent=next==='diagnose'?'MITIGAÇÃO SIMULADA':next==='build'?'MELHORIA CONTÍNUA':'TELEMETRIA';
    updateInspector(selected,false);
  }
  function getHeroProgress() {
    const heroSpan=Math.max(1,hero.offsetHeight-window.innerHeight);
    return Math.max(0,Math.min(1,(window.scrollY-hero.offsetTop)/heroSpan));
  }
  function updateFromScroll() {

    scrollScheduled=false;
    const progress = getHeroProgress();
    if (!(mobile.matches && manualMobile && window.scrollY >= hero.offsetTop + hero.offsetHeight - window.innerHeight)) {
      const next=chapterOrder[progress<.32?0:progress<.66?1:2];
      if(chapter!==next) setChapter(next);
    }
    // Movimento de perspectiva discreto, sem órbita contínua.
    map.style.setProperty('--scroll-shift',`${((progress-.5)*10).toFixed(2)}px`);
  }
  function requestScroll() {
    if(scrollScheduled)return;
    scrollScheduled=true;
    requestAnimationFrame(updateFromScroll);
  }
  function arrange() {
    const parent=mobile.matches && mobileSlot ? mobileSlot : desktopContainer;
    if(map.parentElement!==parent)parent.append(map);
    requestScroll();
  }
  function syncAutoplay(now) {
    if (reduced.matches || mobile.matches) {
      map.dataset.autoplay = 'false';
      return;
    }
    const progress = getHeroProgress();
    const idleEnough = now - lastInteraction > 2200;
    const enabled = visible && progress < 0.08 && idleEnough;
    map.dataset.autoplay = enabled ? 'true' : 'false';
    if (!enabled) return;
    const chapterMs = 3800;
    const chapterIndex = Math.floor((now / chapterMs) % chapterOrder.length);
    const nextChapter = chapterOrder[chapterIndex];
    const sequence = autoNodeSequence[nextChapter];
    const nodeIndex = Math.floor((now / 1400) % sequence.length);
    if (chapter!==nextChapter || selected!==sequence[nodeIndex]) setChapter(nextChapter, { selected: sequence[nodeIndex] });
  }
  function motionFrame(now) {
    raf=0;
    if(!running||reduced.matches||document.hidden||!visible)return;
    syncAutoplay(now);
    if(now-prevFrame >= 1000/30){
      prevFrame=now;
      packets.forEach(({el,speed,offset,edge})=>{
        const options=motionPaths[chapter];
        const selectedLink=options[edge%options.length];
        const t=(now*speed+offset)%1;
        const x=selectedLink.a.x+(selectedLink.b.x-selectedLink.a.x)*t;
        const y=selectedLink.a.y+(selectedLink.b.y-selectedLink.a.y)*t;
        el.setAttribute('cx',x.toFixed(2));el.setAttribute('cy',y.toFixed(2));
      });
    }
    raf=requestAnimationFrame(motionFrame);
  }
  function manageMotion(){
    running=visible&&!document.hidden&&!reduced.matches;
    packetGroup.style.display=running?'':'none';
    if(!running && raf){cancelAnimationFrame(raf);raf=0}
    if(running && !raf)raf=requestAnimationFrame(motionFrame);
  }
  map.querySelectorAll('[data-map-step]').forEach(button=>button.addEventListener('click',()=>{
    lastInteraction=performance.now();
    const key=button.dataset.mapStep;
    if(!names[key])return;
    if(mobile.matches){manualMobile=true;setChapter(key);return;}
    const target=key==='observe'?.12:key==='diagnose'?.49:.86;
    const distance=Math.max(1,hero.offsetHeight-window.innerHeight);
    window.scrollTo({top:hero.offsetTop+distance*target,behavior:reduced.matches?'auto':'smooth'});
    setChapter(key);
  }));
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries=>{
    visible=entries[0]?.isIntersecting??false;
    manageMotion();
  },{threshold:.04}) : null;
  io?.observe(map);
  map.dataset.chapter=chapter;
  document.getElementById('service-map-focus').textContent=names[chapter].focus;
  document.getElementById('service-map-readout').textContent=names[chapter].readout;
  document.getElementById('service-map-health').textContent='SERVIÇOS';
  document.getElementById('service-map-alert').textContent='TELEMETRIA';
  updateInspector(selected,false);
  map.dataset.autoplay='false';
  map.addEventListener('pointerdown',()=>{lastInteraction=performance.now();},{passive:true});
  map.addEventListener('pointerenter',()=>{lastInteraction=performance.now();},{passive:true});
  arrange();
  window.addEventListener('scroll',requestScroll,{passive:true});
  window.addEventListener('resize',requestScroll,{passive:true});
  mobile.addEventListener?.('change',arrange);
  reduced.addEventListener?.('change',manageMotion);
  document.addEventListener('visibilitychange',manageMotion);
  manageMotion();
  window.addEventListener('pagehide',()=>{
    running=false;
    if(raf)cancelAnimationFrame(raf);
    io?.disconnect();
    window.removeEventListener('scroll',requestScroll);
    window.removeEventListener('resize',requestScroll);
    mobile.removeEventListener?.('change',arrange);
    reduced.removeEventListener?.('change',manageMotion);
    document.removeEventListener('visibilitychange',manageMotion);
  },{once:true});
})();
