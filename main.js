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

// Um único painel na abertura. O contêiner nunca desaparece;
// apenas as camadas de texto cruzam com fade/translate durante o scroll.
// GSAP é progressivo: sem a biblioteca ou com reduced-motion, os conteúdos
// continuam no fluxo normal e plenamente acessíveis.
if(window.gsap && window.ScrollTrigger && cine && phases.length===3){
  gsap.registerPlugin(ScrollTrigger);
  const mm=gsap.matchMedia();
  mm.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)',()=>{
    document.body.classList.add('enhanced');
    const shell=document.querySelector('.hero-copy-shell');
    const getIndex=(progress)=>progress<.32?0:progress<.65?1:2;
    let active=-1;
    // Inicializa todas as camadas na mesma área. A estrutura externa
    // (.hero-copy-shell) não recebe qualquer animação de opacidade.
    gsap.set(phases,{autoAlpha:0,y:14});
    const showPhase=(next,immediate=false)=>{
      if(next===active)return;
      const previous=active;
      active=next;
      shell?.setAttribute('data-phase',String(next+1));
      gsap.killTweensOf(phases);
      phases.forEach((el,i)=>{
        const isCurrent=i===next;
        el.inert=!isCurrent;
        el.setAttribute('aria-hidden',String(!isCurrent));
      });
      if(immediate){
        phases.forEach((el,i)=>gsap.set(el,{autoAlpha:i===next?1:0,y:0}));
        return;
      }
      // Crossfade curto e sobreposto, sem estado em que ambos ficam invisíveis.
      // O novo texto entra levemente de baixo e o anterior sai alguns pixels.
      phases.forEach((el,i)=>{
        if(i!==next && i!==previous)gsap.set(el,{autoAlpha:0,y:0});
      });
      if(previous!==-1){
        gsap.to(phases[previous],{autoAlpha:0,y:-10,duration:.28,ease:'power2.inOut',overwrite:'auto'});
      }
      gsap.fromTo(phases[next],{autoAlpha:0,y:15},{autoAlpha:1,y:0,duration:.48,ease:'power3.out',overwrite:'auto',immediateRender:false});
    };
    const trigger=ScrollTrigger.create({
      trigger:cine,start:'top top',end:'bottom bottom',
      onUpdate(self){
        if(indicator)indicator.style.height=`${(self.progress*100).toFixed(2)}%`;
        showPhase(getIndex(self.progress));
      },
      onRefresh(self){showPhase(getIndex(self.progress),true);}
    });
    showPhase(getIndex(trigger.progress),true);
    return ()=>{
      trigger.kill();
      document.body.classList.remove('enhanced');
      if(indicator)indicator.style.height='0';
      phases.forEach(el=>{el.inert=false;el.removeAttribute('aria-hidden');});
      shell?.removeAttribute('data-phase');
      gsap.killTweensOf(phases);
      gsap.set(phases,{clearProps:'all'});
    };
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
  submit.disabled=true;status.classList.remove('success');status.textContent='ENVIANDO MENSAGEM...';fallback.hidden=true;
  try{
    const response=await fetch('https://formsubmit.co/ajax/'+encodeURIComponent(site.email||'marconydev@gmail.com'),{method:'POST',headers:{Accept:'application/json'},body:data});
    let result={};try{result=await response.json();}catch{}
    const accepted = result && (result.success === true || result.success === 'true');
    if(!response.ok || !accepted)throw new Error(result.message || 'O serviço não confirmou o recebimento');
    form.reset();document.getElementById('message-count').textContent='0';
    status.textContent='FORMULÁRIO ACEITO PELO SERVIÇO — VERIFIQUE A ATIVAÇÃO DO E-MAIL';
    status.classList.add('success');
    // O FormSubmit solicita ativacao pelo destinatario no primeiro envio.
  }catch(err){
    console.warn('Envio de formulario indisponivel:',err);
    status.textContent='NÃO FOI POSSÍVEL CONFIRMAR O ENVIO';
    fallback.hidden=false;
  }finally{submit.disabled=false;}
});
