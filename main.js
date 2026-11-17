// Navegacao, microinteracoes, cases e formulario. Sem dependencias obrigatorias.
const site = window.MARCONY_SITE || {email:'marconydev@gmail.com',githubRepos:{}};
const menuButton=document.querySelector('.menu-button');
const mobileNav=document.querySelector('#mobile-nav');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const cine=document.querySelector('.cine');
const phases=[...document.querySelectorAll('.phase')];
const indicator=document.querySelector('#scroll-indicator');

// Navegacao desktop com sublinhado e cursores especiais discretos.
const pointer=document.getElementById('tech-pointer');
if(pointer && matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced.matches){
  let x=-100,y=-100,tx=-100,ty=-100,mouseRaf=0;
  const paint=()=>{mouseRaf=0;tx+=(x-tx)*.33;ty+=(y-ty)*.33;pointer.style.transform=`translate3d(${tx}px,${ty}px,0)`;if(Math.abs(x-tx)+Math.abs(y-ty)>0.8)mouseRaf=requestAnimationFrame(paint);};
  document.addEventListener('pointermove',e=>{x=e.clientX;y=e.clientY;pointer.classList.add('visible');if(!mouseRaf)mouseRaf=requestAnimationFrame(paint);},{passive:true});
  document.addEventListener('pointerover',e=>pointer.classList.toggle('active',Boolean(e.target.closest('[data-tech-hover],button,.project'))));
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget)pointer.classList.remove('visible');});
}
menuButton?.addEventListener('click',()=>{
  const isOpen=menuButton.getAttribute('aria-expanded')==='true';
  menuButton.setAttribute('aria-expanded',String(!isOpen));
  mobileNav.hidden=isOpen;
});
mobileNav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mobileNav.hidden=true;menuButton.setAttribute('aria-expanded','false');}));

// 3 capitulos no hero; o THREE usa a rolagem global, independentemente desta timeline.
if(window.gsap && window.ScrollTrigger && cine && phases.length===3){
  gsap.registerPlugin(ScrollTrigger);
  const mm=gsap.matchMedia();
  mm.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)',()=>{
    document.body.classList.add('enhanced');
    phases.forEach((el,i)=>{el.inert=i!==0;el.setAttribute('aria-hidden',String(i!==0));});
    const setPhase=(i)=>{phases.forEach((el,j)=>{el.inert=j!==i;el.setAttribute('aria-hidden',String(j!==i));});};
    gsap.set(phases[0],{opacity:1,visibility:'visible',y:0});
    gsap.set(phases.slice(1),{opacity:0,visibility:'hidden',y:25});
    const tl=gsap.timeline({defaults:{ease:'none'},scrollTrigger:{trigger:cine,start:'top top',end:'bottom bottom',scrub:.6,onUpdate(self){indicator.style.height=`${(self.progress*100).toFixed(2)}%`;setPhase(self.progress<.32?0:self.progress<.65?1:2);}}});
    tl.to({}, {duration:1},0);
    tl.to(phases[0],{opacity:0,y:-20,visibility:'hidden',duration:.12},.26);
    tl.fromTo(phases[1],{opacity:0,y:24,visibility:'hidden'},{opacity:1,y:0,visibility:'visible',immediateRender:false,duration:.12},.34);
    tl.to(phases[1],{opacity:0,y:-20,visibility:'hidden',duration:.12},.57);
    tl.fromTo(phases[2],{opacity:0,y:24,visibility:'hidden'},{opacity:1,y:0,visibility:'visible',immediateRender:false,duration:.12},.67);
    return ()=>{document.body.classList.remove('enhanced');indicator.style.height='0';phases.forEach(el=>{el.inert=false;el.removeAttribute('aria-hidden');});gsap.set(phases,{clearProps:'all'});};
  });
}

// Todos os cartoes apontam para o perfil indicado; links individuais opcionais prevalecem.
const allowGitHub=url=>{try{const x=new URL(url);return x.protocol==='https:'&&x.hostname==='github.com';}catch{return false;}};
document.querySelectorAll('[data-repo]').forEach(a=>{
  const repo=site.githubRepos?.[a.dataset.repo]||'';
  const profile=site.githubProfile||'';
  const url=allowGitHub(repo)?repo:allowGitHub(profile)?profile:null;
  if(!url){a.removeAttribute('href');a.setAttribute('aria-disabled','true');return;}
  a.href=url;
  const isSpecific=allowGitHub(repo);
  a.innerHTML=isSpecific?'VER REPOSITÓRIO <span aria-hidden="true">↗</span>':'VER TODOS OS REPOSITÓRIOS <span aria-hidden="true">↗</span>';
  a.setAttribute('aria-label',isSpecific?'Ver o repositório deste projeto no GitHub':'Ver todos os repositórios de Marcony Jr no GitHub');
});

// Capturas fornecidas pelo autor: carregadas com seus NOMES ORIGINAIS.
// Arquivos de futuras capturas podem ser adicionados em assets/projetos/.
const projectImages = {
  frotas: 'Frota.png',
  barbearias: 'Barbearia.png',
  ats: 'JobSearch - ATS.png',
  pdv: 'PDV.png',
  'bi-hospitalar': 'BI-Hospitalar.png'
};
document.querySelectorAll('[data-project-image]').forEach(frame => {
  const slug = frame.dataset.projectImage;
  const name = projectImages[slug];
  const img = frame.querySelector('img');
  if (!img || !name) return;
  const imgUrl = `./assets/projetos/${encodeURIComponent(name)}`;
  img.onload = () => frame.classList.add('has-shot');
  img.onerror = () => frame.classList.remove('has-shot');
  img.src = imgUrl;
  // Se uma captura futura ainda nao existe, o placeholder permanece visivel.
  const captureLink = frame.parentElement?.querySelector('.screenshot-link');
  if(captureLink) captureLink.href = imgUrl;
});

const form=document.getElementById('contact-form');
const status=document.getElementById('form-status');
const submit=document.getElementById('submit-contact');
const fallback=document.getElementById('direct-submit');
const textarea=document.getElementById('mensagem');
textarea?.addEventListener('input',()=>{document.getElementById('message-count').textContent=String(textarea.value.length);});
fallback?.addEventListener('click',()=>{if(form.reportValidity())HTMLFormElement.prototype.submit.call(form);});
form?.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!form.reportValidity()){status.textContent='REVISE OS CAMPOS OBRIGATÓRIOS';return;}
  const honey=form.querySelector('[name="_honey"]');
  if(honey?.value)return;
  if(!document.getElementById('consent').checked){status.textContent='CONFIRME O CONSENTIMENTO';return;}
  const data=new FormData(form);
  data.append('_captcha','false');
  submit.disabled=true;status.textContent='ENVIANDO MENSAGEM...';fallback.hidden=true;
  try{
    const response=await fetch('https://formsubmit.co/ajax/'+encodeURIComponent(site.email||'marconydev@gmail.com'),{method:'POST',headers:{Accept:'application/json'},body:data});
    let result={};try{result=await response.json();}catch{}
    if(!response.ok || result.success===false || result.success==='false')throw new Error(result.message||'Falha no envio');
    form.reset();document.getElementById('message-count').textContent='0';
    status.textContent='SOLICITAÇÃO ENVIADA — CONFIRA A CAIXA DE E-MAIL';
    status.classList.add('success');
    // O FormSubmit solicita ativacao pelo destinatario no primeiro envio.
  }catch(err){
    console.warn('Envio de formulario indisponivel:',err);
    status.textContent='NÃO FOI POSSÍVEL CONFIRMAR O ENVIO';
    fallback.hidden=false;
  }finally{submit.disabled=false;}
});
