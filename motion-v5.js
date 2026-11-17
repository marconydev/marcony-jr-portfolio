/* Reveal editorial: apenas quando há suporte e o movimento é permitido.
 * Conteúdo permanece acessível sem JS, sem IntersectionObserver e em reduced motion. */
(() => {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const elements = [...document.querySelectorAll('.section-topline,.section-heading,.about-intro,.about-body,.capability,.evidence,.project,.timeline article,.contact-panel')];
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    }
  },{threshold:.07,rootMargin:'0px 0px -24px 0px'});
  for (const el of elements) {
    // Somente adicionamos estado de entrada a blocos abaixo da primeira tela.
    if (el.getBoundingClientRect().top > innerHeight*.75) {
      el.classList.add('motion-reveal');
      io.observe(el);
    }
  }
  window.addEventListener('pagehide',()=>io.disconnect(),{once:true});
})();
