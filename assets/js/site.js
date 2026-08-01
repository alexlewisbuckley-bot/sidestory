/* Side Story — demo behaviour. Cart state is in-memory + sessionStorage for the demo only. */
(function(){
  /* The arrival veil covers the page at 92% opacity and is lifted by a CSS
     animation. If that animation never runs — an engine that suppresses it, a
     paint the compositor drops — the site is a black rectangle and there is no
     way back. One line makes that impossible. */
  var veilSafety=setTimeout(function(){
    document.querySelectorAll('.enter-veil').forEach(function(v){v.remove()});
  },2500);
  document.addEventListener('animationend',function(e){
    if(e.target&&e.target.classList&&e.target.classList.contains('enter-veil')){
      e.target.remove(); clearTimeout(veilSafety);}
  },true);

  /* The page supplies the catalogue (window.SS_CAT), generated from the same
     data the pages and the photo pipeline use. */
  const CAT = window.SS_CAT || {};

  const KEY='ss_bag_v1';
  let bag = [];
  try { bag = JSON.parse(sessionStorage.getItem(KEY)||'[]'); } catch(e){ bag=[]; }
  const save=()=>{ try{ sessionStorage.setItem(KEY,JSON.stringify(bag)); }catch(e){} };
  const money=n=>'£'+n;
  const total=()=>bag.reduce((s,i)=>s+i.price,0);

  /* nav + announcement */
  const nav=document.querySelector('header.nav'), ann=document.querySelector('.ann');
  // Hysteresis: collapse past 140, restore under 40. The 100px dead band is wider than
  // the 40px of layout the announcement removes, so collapsing can never re-trigger itself.
  let collapsed=false, ticking=false;
  function onScroll(){
    if(ticking) return; ticking=true;
    requestAnimationFrame(()=>{
      const y=window.scrollY||0;
      /* the announcement no longer collapses — it scrolls away with the page
         it belongs to, which is what it did on every reference site and what
         removes the shift. Only the nav still shrinks. */
      if(!collapsed && y>140){collapsed=true;nav&&nav.classList.add('shrunk');}
      else if(collapsed && y<40){collapsed=false;nav&&nav.classList.remove('shrunk');}
      ticking=false;
    });
  }
  addEventListener('scroll',onScroll,{passive:true}); onScroll();
  /* A thumbnail already carries the whole picture — the same file at 480, 960
     and 1600 in all three formats. Copying its sources into the main plate is
     both correct and free; nothing new has to be emitted for it. */
  function swapFromThumb(main, btn, src){
    const from = btn.querySelector('picture');
    if(from && main.parentElement && main.parentElement.tagName==='PICTURE'){
      const to = main.parentElement.querySelectorAll('source');
      const src2 = from.querySelectorAll('source');
      to.forEach(t=>{
        const match=[...src2].find(x=>x.type===t.type);
        if(match) t.srcset=match.srcset; else t.removeAttribute('srcset');
      });
      const fimg = from.querySelector('img');
      if(fimg && fimg.getAttribute('srcset')) main.srcset=fimg.getAttribute('srcset');
      else main.removeAttribute('srcset');
    } else { main.removeAttribute('srcset'); }
    main.src = src;
  }

  window.showSwap=(btn,src)=>{
    document.querySelectorAll('.show .thumbs button').forEach(b=>b.removeAttribute('aria-current'));
    btn.setAttribute('aria-current','true');
    const big=document.getElementById('showbig');
    if(!big) return; big.style.opacity=0;
    setTimeout(()=>{swapFromThumb(big,btn,src);big.style.opacity=1;},200);
  };
  /* the homepage nav uses .links, the other pages .navlinks — accept either */
  const burger=document.querySelector('.burger');
  const navlinks=document.querySelector('.navlinks,.links');
  if(burger&&navlinks){
    burger.setAttribute('aria-expanded','false');
    burger.addEventListener('click',()=>{
      const open=!navlinks.classList.contains('open');
      navlinks.classList.toggle('open',open);
      burger.setAttribute('aria-expanded',String(open));
      document.documentElement.classList.toggle('overlay-open',open);
      if(open){ const f=navlinks.querySelector('a'); if(f) setTimeout(()=>f.focus(),60); }
    });
    navlinks.addEventListener('click',e=>{
      if(e.target.tagName==='A'){navlinks.classList.remove('open');
        burger.setAttribute('aria-expanded','false');
        document.documentElement.classList.remove('overlay-open');}
    });
    addEventListener('keydown',e=>{
      if(e.key==='Escape'&&navlinks.classList.contains('open')){
        navlinks.classList.remove('open');
        burger.setAttribute('aria-expanded','false');
        document.documentElement.classList.remove('overlay-open');
        burger.focus();
      }
    });
  }

  /* Swapping an image that lives inside a <picture>.

     Setting `src` on the <img> does nothing when a <source> above it matches —
     the source wins, every time. Every image on this site was wrapped in a
     <picture> for AVIF and WebP, and three things swap images at runtime: the
     shelf when you change size, the product gallery when you tap a thumbnail,
     and the homepage's signature show. All three had been dissolving politely
     and then putting the same photograph back. The size filter was the worst
     of them: it changed the price, the link and the caption, and left the
     100ml bottle on screen.

     Given the srcsets the page would have been built with, this replaces the
     whole picture rather than half of it. Given none, it clears the sources so
     at least the `src` is honoured. */
  function swapPicture(img, jpg, set){
    if(!img) return;
    const pic = img.parentElement;
    if(pic && pic.tagName === 'PICTURE'){
      pic.querySelectorAll('source').forEach(sc=>{
        const kind = (sc.type||'').split('/')[1];
        if(set && set[kind]) sc.srcset = set[kind];
        else sc.removeAttribute('srcset');
      });
    }
    if(set && set.jpg) img.srcset = set.jpg; else img.removeAttribute('srcset');
    img.src = jpg;
  }

  /* A filter that changes the shelf instantly is the one moment on this site
     where something happens and nothing acknowledges it — cards vanish and
     appear between two frames, and the eye reads it as a glitch rather than a
     result. The grid dims for a beat, the change is made behind that, and it
     comes back. One composited layer, not eight, and it steps aside entirely
     for anyone who has asked for less motion.

     The state on the control itself — pressed, the count, the rule under the
     label — is never delayed: the button answers the finger immediately and
     only the shelf takes the beat. */
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  function settle(grid, mutate){
    if(!grid || REDUCED.matches){ mutate(); return; }
    if(grid.__settling){ clearTimeout(grid.__settling); }
    grid.classList.add('sorting');
    grid.__settling = setTimeout(()=>{
      mutate();
      grid.__settling = null;
      requestAnimationFrame(()=>grid.classList.remove('sorting'));
    }, 130);
  }

  /* Scroll reveals.

     The delay used to be the element's index in the document modulo four,
     written inline at load and left on the element for good — so a card that
     happened to be third in the page answered a filter change 140ms after the
     two beside it, for the life of the session. And because the index was
     global, arriving at a new section could mean waiting 210ms for its first
     line to appear, for no reason the eye could connect to anything.

     The delay is now decided at the moment of reveal, from the group that is
     entering together: a row of four cascades across itself, a paragraph
     arriving on its own does not wait at all. It is removed as soon as the
     entrance is over — on transitionend, and on a timer in case the
     transition never fires. */
  const STEP=70, io=new IntersectionObserver(entries=>{
    const arriving=entries.filter(e=>e.isIntersecting)
      .sort((a,b)=>{
        const ra=a.boundingClientRect, rb=b.boundingClientRect;
        return (ra.top-rb.top) || (ra.left-rb.left);
      });
    arriving.forEach((e,i)=>{
      const el=e.target, d=Math.min(i,5)*STEP;
      if(d) el.style.transitionDelay=d+'ms';
      el.classList.add('in');
      io.unobserve(el);
      let done=false;
      const clear=()=>{ if(done) return; done=true;
        el.style.transitionDelay=''; el.classList.add('done');
        el.removeEventListener('transitionend',clear); };
      el.addEventListener('transitionend',clear);
      setTimeout(clear, d+1200);
    });
  },{threshold:.12,rootMargin:'0px 0px -40px'});
  document.querySelectorAll('.rev').forEach(el=>io.observe(el));
  /* and if the observer never fires — a browser without it, an error earlier
     in this file, anything — nothing stays hidden */
  setTimeout(()=>{document.querySelectorAll('.rev:not(.in)').forEach(el=>{
    el.classList.add('in','done');});},3000);

  /* ------------------------------------------------------------ overlays
     One contract for every overlay: move focus in, trap Tab, lock the page
     behind, close on Escape and on the scrim, and put focus back where it
     came from. The scent sheet already worked this way; the bag drawer and
     the mobile menu did not, so a keyboard user opening the bag was left
     reading a page they could no longer see. */
  const OPEN=[];
  function trap(e){
    const top=OPEN[OPEN.length-1]; if(!top||e.key!=='Tab')return;
    const f=[...top.el.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')]
      .filter(x=>x.offsetParent!==null||getComputedStyle(x).position==='fixed');
    if(!f.length)return;
    const first=f[0], last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
  function overlayOpen(el,opts){
    if(!el||OPEN.some(o=>o.el===el))return;
    opts=opts||{};
    OPEN.push({el,opener:document.activeElement,opts});
    if(opts.scrim){ opts.scrim.hidden=false;
      requestAnimationFrame(()=>opts.scrim.classList.add('on')); }
    el.hidden=false;
    requestAnimationFrame(()=>el.classList.add('open','on'));
    document.documentElement.classList.add('overlay-open');
    const f=el.querySelector('a[href],button:not([disabled]),input,textarea');
    if(f) setTimeout(()=>f.focus(),60);
  }
  function overlayClose(el){
    const i=OPEN.findIndex(o=>o.el===el); if(i<0)return;
    const rec=OPEN.splice(i,1)[0];
    if(rec.opts&&rec.opts.scrim) rec.opts.scrim.classList.remove('on');
    el.classList.remove('open','on');
    if(!OPEN.length) document.documentElement.classList.remove('overlay-open');
    setTimeout(()=>{ if(!el.classList.contains('open')&&!el.classList.contains('on')) el.hidden=true; },420);
    /* the opener is often the add-to-bag button, which disables itself for
       1.4s after the click — focusing a disabled control silently drops focus
       to <body>, so fall back to the main landmark and keep the user placed */
    const back=rec.opener;
    if(back&&back.focus&&!back.disabled&&back.isConnected) back.focus();
    else { const m=document.getElementById('main');
      if(m){ m.setAttribute('tabindex','-1'); m.focus(); } }
  }
  addEventListener('keydown',trap);
  addEventListener('keydown',e=>{ if(e.key==='Escape'&&OPEN.length) overlayClose(OPEN[OPEN.length-1].el); });
  window.SSoverlay={open:overlayOpen,close:overlayClose};

  /* bag drawer */
  const scrim=document.getElementById('scrim'), drawer=document.getElementById('drawer');
  window.openDrawer=()=>{ if(drawer) overlayOpen(drawer,{scrim}); };
  window.closeDrawer=()=>{ if(drawer) overlayClose(drawer); };
  scrim&&scrim.addEventListener('click',closeDrawer);

  function renderBag(){
    const c=document.getElementById('bagcount'); if(c){c.textContent=bag.length;}
    const items=document.getElementById('ditems');
    if(items){
      items.innerHTML = bag.length? bag.map((i,ix)=>`<div class="ditem">
        <img src="${i.img}" alt="" width="112" height="112">
        <div><h3>${i.label}</h3><p class="meta">${i.meta}</p>
          <span class="price">${money(i.price)}</span>
          <button class="ul" onclick="SSremove(${ix})">Remove</button></div></div>`).join('')
        : '<p class="crumb" style="padding-block:var(--s-5)">Empty — every story starts somewhere.</p>';
    }
    const t=document.getElementById('dtotal'); if(t) t.textContent=money(total());
    const pct=Math.min(100,Math.round(total()/100*100));
    const fill=document.getElementById('tfill'); if(fill) fill.style.width=pct+'%';
    const th=document.getElementById('thresh');
    if(th) th.textContent = total()>=100 ? 'Complimentary delivery — unlocked' : 'Complimentary delivery at £100 — £'+(100-total())+' away';
    document.querySelectorAll('[data-bagtotal]').forEach(e=>e.textContent=money(total()));
    document.querySelectorAll('[data-bagcount]').forEach(e=>e.textContent=bag.length);
    renderBagPage();
  }
  window.SSremove=i=>{bag.splice(i,1);save();renderBag();};
  window.addToBag=(slug,kind,btn)=>{
    const p=CAT[slug]||CAT.set||{name:'The First Lines',img:'assets/img/set-first-lines.jpg',price:38,stone:''};
    /* 'full' is the old name for the 100ml and still arrives from older markup */
    const key = kind==='full' ? '100ml' : kind;
    const v = (p.sizes||{})[key];
    const isSample = key==='sample';
    const meta = slug==='set' ? 'ALL SEVEN IN MINIATURE'
      : isSample ? '2ML · ITS OPENING PAGE'
      : key==='7-5ml' ? '7.5ML SPRAY · PRINTED SLEEVE'
      : (p.stone? p.stone.toUpperCase()+' LID · STORY INCLUDED' : 'ALL SEVEN IN MINIATURE');
    bag.push({slug,
      label: p.name + (slug==='set' ? '' : ' — ' + (v ? v.label : '100 ml')),
      meta,
      price: v ? v.price : (isSample?5:p.price),
      img: v ? v.img : p.img});
    save();
    const c=document.getElementById('bagcount'); if(c){c.classList.add('tick');setTimeout(()=>c.classList.remove('tick'),300);}
    /* The label used to become "In the bag ✓" — the one system glyph on a site
       that draws its own marks, and on a button that hugs its label it changed
       the button's width mid-press. The words and the disabled state say it,
       and the drawer that follows says it properly. */
    if(btn){const t=btn.textContent, w=btn.getBoundingClientRect().width;
      btn.style.minWidth=Math.round(w)+'px';
      btn.textContent='In the bag'; btn.disabled=true;
      setTimeout(()=>{btn.textContent=t;btn.disabled=false;btn.style.minWidth='';},1400);}
    renderBag(); setTimeout(openDrawer,420);
  };
  function renderBagPage(){
    const wrap=document.getElementById('baglines'); if(!wrap) return;
    wrap.innerHTML = bag.length? bag.map((i,ix)=>`<div class="line">
      <img src="${i.img}" alt="" width="112" height="112">
      <div><h3>${i.label}</h3><p class="meta">${i.meta}</p>
        <div class="act"><span class="meta">${money(i.price)}</span>
          <button class="ul" onclick="SSremove(${ix})">Remove</button></div></div>
    </div>`).join('')
      : `<div class="empty"><p class="k">Nothing here yet</p>
         <p>Your bag is empty. The shelf is seven stories long.</p>
         <div class="tagrow"><a href="collection.html">See the fragrances</a><a href="samples.html">Begin with samples</a></div></div>`;
    /* a dedication belongs to something. With an empty bag the offer sat
       under the empty state offering to typeset a line onto no flyleaf. */
    document.querySelectorAll('.cart .tryfirst').forEach(el=>{ el.hidden=!bag.length; });
    const cred=bag.some(i=>i.price===5)?5:0;
    const set=(id,v)=>{const e=document.getElementById(id); if(e) e.textContent=v;};
    set('subtotal',money(total())); set('bagsub',money(total())); set('cosub',money(total()));
    set('grandtotal',money(Math.max(0,total()-cred)));
    set('bagtotal',money(Math.max(0,total()-cred)));
    set('cototal',money(Math.max(0,total()-cred)));
    const cr=document.getElementById('creditrow'); if(cr) cr.style.display=cred?'flex':'none';
    document.querySelectorAll('form [type=submit]').forEach(b=>{
      if(/^Pay /.test(b.textContent)) b.textContent='Pay '+money(Math.max(0,total()-cred));
    });
  }

  /* PDP gallery + size selector (rebuilt markup) */
  window.pdpSwap=(btn,src)=>{
    const main=document.getElementById('pdpmain'); if(!main) return;
    btn.parentElement.querySelectorAll('button').forEach(b=>b.removeAttribute('aria-current'));
    btn.setAttribute('aria-current','true');
    main.style.opacity=0;
    setTimeout(()=>{swapFromThumb(main,btn,src);main.style.opacity=1;},180);
  };
  /* One product per fragrance; the variant is chosen by the button, or by the
     ?size= on the link that brought you here, which is how the shop-by-size
     collections open on the right one. */
  function pickSize(row,b,scroll){
    if(!b) return;
    row.querySelectorAll('button').forEach(x=>x.removeAttribute('aria-current'));
    b.setAttribute('aria-current','true');
    const key=b.dataset.size||'100ml';
    const price=b.dataset.price||(b.textContent.match(/£(\d+)/)||[])[1];
    const add=document.querySelector('.pdp .cta .btn-ink');
    if(add&&price){ add.textContent='Add to bag — £'+price; add.dataset.size=key; }
    const slug=document.body.dataset.slug;
    const v=slug && CAT[slug] && CAT[slug].sizes && CAT[slug].sizes[key];
    const main=document.getElementById('pdpmain');
    if(v&&main&&v.main&&main.src.indexOf(v.main)<0){
      main.style.opacity=0;
      setTimeout(()=>{swapPicture(main,v.main,v.mainset);main.style.opacity=1;},180);
      document.querySelectorAll('.gal .strip button').forEach(x=>x.removeAttribute('aria-current'));
    }
    const incl=document.querySelector('[data-sizeline]');
    if(v&&incl) incl.textContent=v.incl;
  }
  document.querySelectorAll('.sizes').forEach(row=>{
    row.addEventListener('click',e=>pickSize(row,e.target.closest('button')));
    const want=new URLSearchParams(location.search).get('size');
    if(want){
      const b=row.querySelector('button[data-size="'+want.replace(/[^a-z0-9-]/gi,'')+'"]');
      if(b) pickSize(row,b);
    }
  });
  /* ------------------------------------------------------------------ shelf
     Seven fragrances fit on one screen, so a filter is only worth having if
     each option returns a real, small set. Stone was dropped as a control:
     seven stones, seven fragrances, so every option returned exactly one
     card — a menu of the products under another name. Scent family is the
     one axis a shopper arrives with a preference on, and each family holds
     one or two, so choosing more widens.

     Size is a different kind of control and behaves like one: it changes
     what you are buying, not what you can see, so it never hides a card.

     On a phone the bar is compact and sticky, and scent opens a sheet: five
     full-width rows beat five cramped chips, the shelf is never pushed off
     the first screen, and the controls stay reachable once you have scrolled
     into the products. */
  document.querySelectorAll('[data-shelf-for]').forEach(bar=>{
    const grid=document.querySelector(bar.dataset.shelfFor); if(!grid) return;
    const scope=bar.parentElement;
    const cards=[...grid.querySelectorAll('.card[data-slug]')];
    const promo=grid.querySelector('.promo');
    const famBtns=[...bar.querySelectorAll('[data-family]')];
    const sizeBtns=[...bar.querySelectorAll('[data-size]')];
    const sheet=scope.querySelector('[data-scent-sheet]');
    const scrim=scope.querySelector('[data-scent-scrim]');
    const list=scope.querySelector('[data-scent-list]');
    const chosen=new Set();
    let opener=null;


    /* the sheet mirrors the chips, so there is one source of families */
    if(list) list.innerHTML = famBtns.map(b=>
      '<button type="button" class="srow" data-family="'+b.dataset.family+'" aria-pressed="false">'
      + '<span>'+b.innerHTML+'</span><i aria-hidden="true"></i></button>').join('');
    const allFam=()=>[...scope.querySelectorAll('[data-family]')];

    function applySize(key){
      grid.dataset.size=key;
      settle(grid, ()=>cards.forEach(card=>{
        const p=CAT[card.dataset.slug]; if(!p||!p.sizes) return;
        const v=p.sizes[key]; if(!v) return;
        const shot=card.querySelector('[data-shot]');
        if(shot&&shot.getAttribute('src')!==v.img) swapPicture(shot,v.img,v.set);
        const buy=card.querySelector('[data-buy]');
        if(buy){ buy.dataset.size=key; buy.innerHTML=v.label+' — £'+v.price; }
        const line=card.querySelector('[data-priceline]');
        if(line) line.innerHTML='£'+v.price+' · '+v.label;
        const incl=card.querySelector('[data-incl]');
        if(incl) incl.textContent=v.incl;
        card.querySelectorAll('[data-href]').forEach(a=>{
          a.href='product-'+card.dataset.slug+'.html'+(key==='100ml'?'':'?size='+key);
        });
      }));
      sizeBtns.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.size===key)));
    }

    function applyScent(){
      let shown=0;
      const next=[...cards].map(card=>{
        const on = !chosen.size || chosen.has(card.dataset.family);
        if(on) shown++;
        return [card,!on];
      });
      settle(grid, ()=>{
        next.forEach(([card,hide])=>{ card.hidden=hide; });
        if(promo) promo.hidden = chosen.size>0;
      });
      allFam().forEach(b=>b.setAttribute('aria-pressed',String(chosen.has(b.dataset.family))));
      const count=bar.querySelector('[data-count]');
      if(count) count.textContent = !chosen.size ? 'Seven stories'
        : shown+(shown===1?' story':' stories');
      scope.querySelectorAll('[data-clear]').forEach(c=>{c.hidden=chosen.size===0;});
      const tally=bar.querySelector('[data-tally]');
      if(tally){ tally.hidden=chosen.size===0; tally.textContent=chosen.size; }
      const sc=scope.querySelector('[data-sheetcount]');
      if(sc) sc.textContent = shown+(shown===1?' story':' stories');
      bar.classList.toggle('on', chosen.size>0);
    }

    function openSheet(from){
      if(!sheet) return;
      opener=from||null;
      scrim.hidden=false; sheet.hidden=false;
      requestAnimationFrame(()=>{scrim.classList.add('on');sheet.classList.add('on');});
      document.documentElement.classList.add('sheet-open');
      const first=sheet.querySelector('.srow'); if(first) first.focus();
    }
    function closeSheet(){
      if(!sheet||sheet.hidden) return;
      scrim.classList.remove('on'); sheet.classList.remove('on');
      document.documentElement.classList.remove('sheet-open');
      setTimeout(()=>{scrim.hidden=true;sheet.hidden=true;},320);
      if(opener) opener.focus();
    }
    scope.addEventListener('click',e=>{
      if(e.target.closest('[data-open-scent]')){ openSheet(e.target.closest('[data-open-scent]')); return; }
      if(e.target.closest('[data-close-scent]')||e.target.closest('[data-scent-scrim]')){ closeSheet(); return; }
      const sz=e.target.closest('[data-size]');
      if(sz){ applySize(sz.dataset.size); return; }
      const fam=e.target.closest('[data-family]');
      if(fam){
        const k=fam.dataset.family;
        chosen.has(k)? chosen.delete(k) : chosen.add(k);
        applyScent(); return;
      }
      if(e.target.closest('[data-clear]')){ chosen.clear(); applyScent(); return; }
    });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeSheet(); });
    /* keep focus inside the sheet while it is open */
    scope.addEventListener('keydown',e=>{
      if(e.key!=='Tab'||!sheet||sheet.hidden) return;
      const f=[...sheet.querySelectorAll('button')].filter(b=>!b.hidden);
      if(!f.length) return;
      const first=f[0], last=f[f.length-1];
      if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
    });

    applySize(grid.dataset.size||'100ml');
    applyScent();
  });

  /* PDP gallery + size selector (rebuilt markup) */
  window.pdpSwap=(btn,src)=>{
    const main=document.getElementById('pdpmain'); if(!main) return;
    btn.parentElement.querySelectorAll('button').forEach(b=>b.removeAttribute('aria-current'));
    btn.setAttribute('aria-current','true');
    main.style.opacity=0;
    setTimeout(()=>{swapFromThumb(main,btn,src);main.style.opacity=1;},180);
  };
  /* One product per fragrance; the variant is chosen by the button, or by the
     ?size= on the link that brought you here, which is how the shop-by-size
     collections open on the right one. */
  function pickSize(row,b,scroll){
    if(!b) return;
    row.querySelectorAll('button').forEach(x=>x.removeAttribute('aria-current'));
    b.setAttribute('aria-current','true');
    const key=b.dataset.size||'100ml';
    const price=b.dataset.price||(b.textContent.match(/£(\d+)/)||[])[1];
    const add=document.querySelector('.pdp .cta .btn-ink');
    if(add&&price){ add.textContent='Add to bag — £'+price; add.dataset.size=key; }
    const slug=document.body.dataset.slug;
    const v=slug && CAT[slug] && CAT[slug].sizes && CAT[slug].sizes[key];
    const main=document.getElementById('pdpmain');
    if(v&&main&&v.main&&main.src.indexOf(v.main)<0){
      main.style.opacity=0;
      setTimeout(()=>{swapPicture(main,v.main,v.mainset);main.style.opacity=1;},180);
      document.querySelectorAll('.gal .strip button').forEach(x=>x.removeAttribute('aria-current'));
    }
    const incl=document.querySelector('[data-sizeline]');
    if(v&&incl) incl.textContent=v.incl;
  }
  document.querySelectorAll('.sizes').forEach(row=>{
    row.addEventListener('click',e=>pickSize(row,e.target.closest('button')));
    const want=new URLSearchParams(location.search).get('size');
    if(want){
      const b=row.querySelector('button[data-size="'+want.replace(/[^a-z0-9-]/gi,'')+'"]');
      if(b) pickSize(row,b);
    }
  });
  /* ------------------------------------------------------------------ shelf
     Seven fragrances fit on one screen, so a filter is only worth having if
     each option returns a real, small set. Stone was dropped as a control:
     there are seven stones and seven fragrances, so every option returned
     exactly one card — a menu of the products under another name, not a
     filter. Scent family is the one axis a shopper arrives with a preference
     on, and each family holds one or two, so choosing more widens.

     Size is a different kind of control and looks like one: it changes what
     you are buying, not what you can see, so it never hides a card. */
  document.querySelectorAll('[data-shelf-for]').forEach(bar=>{
    const grid=document.querySelector(bar.dataset.shelfFor); if(!grid) return;
    const cards=[...grid.querySelectorAll('.card[data-slug]')];
    const promo=grid.querySelector('.promo');
    const famBtns=[...bar.querySelectorAll('[data-family]')];
    const sizeBtns=[...bar.querySelectorAll('[data-size]')];
    const countEl=bar.querySelector('[data-count]');
    const clearEl=bar.querySelector('[data-clear]');
    const labelEl=bar.querySelector('[data-scentlabel]');
    const disclose=bar.querySelector('[data-disclose]');
    const chips=bar.querySelector('#scentchips');
    const chosen=new Set();

    function applySize(key){
      grid.dataset.size=key;
      settle(grid, ()=>cards.forEach(card=>{
        const p=CAT[card.dataset.slug]; if(!p||!p.sizes) return;
        const v=p.sizes[key]; if(!v) return;
        const shot=card.querySelector('[data-shot]');
        if(shot&&shot.getAttribute('src')!==v.img) swapPicture(shot,v.img,v.set);
        const buy=card.querySelector('[data-buy]');
        if(buy){ buy.dataset.size=key; buy.innerHTML=v.label+' — £'+v.price; }
        const line=card.querySelector('[data-priceline]');
        if(line) line.innerHTML='£'+v.price+' · '+v.label;
        const incl=card.querySelector('[data-incl]');
        if(incl) incl.textContent=v.incl;
        card.querySelectorAll('[data-href]').forEach(a=>{
          a.href='product-'+card.dataset.slug+'.html'+(key==='100ml'?'':'?size='+key);
        });
      }));
      sizeBtns.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.size===key)));
    }

    function applyScent(){
      let shown=0;
      const next=[...cards].map(card=>{
        const on = !chosen.size || chosen.has(card.dataset.family);
        if(on) shown++;
        return [card,!on];
      });
      settle(grid, ()=>{
        next.forEach(([card,hide])=>{ card.hidden=hide; });
        /* the discovery-set card is not a fragrance, so it only belongs on the
           unfiltered shelf */
        if(promo) promo.hidden = chosen.size>0;
      });
      famBtns.forEach(b=>b.setAttribute('aria-pressed',String(chosen.has(b.dataset.family))));
      const names=famBtns.filter(b=>chosen.has(b.dataset.family)).map(b=>b.textContent.trim());
      if(labelEl) labelEl.textContent = names.length? names.join(', ') : 'All seven';
      if(countEl) countEl.textContent = !chosen.size ? 'Seven stories'
        : shown+(shown===1?' story':' stories');
      if(clearEl) clearEl.hidden = chosen.size===0;
      bar.classList.toggle('on', chosen.size>0);
    }

    bar.addEventListener('click',e=>{
      const sz=e.target.closest('[data-size]');
      if(sz){ applySize(sz.dataset.size); return; }
      const fam=e.target.closest('[data-family]');
      if(fam){
        const k=fam.dataset.family;
        chosen.has(k)? chosen.delete(k) : chosen.add(k);
        applyScent(); return;
      }
      if(e.target.closest('[data-clear]')){ chosen.clear(); applyScent(); return; }
      if(e.target.closest('[data-disclose]')){
        const open=disclose.getAttribute('aria-expanded')==='true';
        disclose.setAttribute('aria-expanded',String(!open));
        if(chips) chips.classList.toggle('open',!open);
      }
    });
    applySize(grid.dataset.size||'100ml');
    applyScent();
  });


  /* PDP */
  window.selectSize=(el,price,kind)=>{
    document.querySelectorAll('.size').forEach(s=>s.classList.remove('on'));
    el.classList.add('on');
    const b=document.getElementById('addbtn');
    if(b){ b.dataset.kind=kind; b.textContent = kind==='sample' ? 'Add sample to bag — £5' : 'Add to bag — £'+price; }
  };
  window.swapShot=(el,src)=>{
    document.querySelectorAll('.thumbs img').forEach(t=>t.classList.remove('sel'));
    el.classList.add('sel');
    const m=document.getElementById('mainshot');
    m.style.opacity=0; setTimeout(()=>{m.src=src;m.style.opacity=1;},180);
  };
  document.querySelectorAll('.acc button').forEach(b=>b.addEventListener('click',()=>{
    const a=b.closest('.acc'); a.classList.toggle('open');
    b.querySelector('i').textContent=a.classList.contains('open')?'—':'+';
  }));

  /* newsletter + story form.
     What was here wrote confirmation markup with innerHTML using five class
     names — .centered .rule .kicker .fine .mut — that exist nowhere in the
     stylesheet, and set the heading size inline at a raw 30px, so both
     confirmations rendered as unstyled browser default. The story-form half
     of it referenced #storyform and #formwrap, neither of which has existed
     since the share page was rebuilt, so it had also been dead for a while.
     Both confirmations are now a .formdone block authored in the page and
     revealed on submit, which needs no JavaScript to look right. */
  const nf=document.getElementById('newsform');
  nf&&nf.addEventListener('submit',e=>{
    e.preventDefault();
    const done=nf.parentElement.querySelector('.formdone');
    if(!done) return;
    /* the pitch has done its job — leaving it above the confirmation left the
       same sentence on the page twice, once as an offer and once as a fact */
    nf.parentElement.querySelectorAll(':scope>h2,:scope>.s,:scope>#newsform,:scope>.fine')
      .forEach(el=>{ el.hidden=true; });
    done.hidden=false; done.setAttribute('tabindex','-1'); done.focus();
  });

  /* the #checkoutform handler that stood here referenced an id no page has
     emitted since the checkout was rebuilt — checkout.html carries the
     navigation on the form itself. Removed rather than left to rot. */

  renderBag();

  /* ---- P10 · A2 mega menu -------------------------------------------
     Frame A2 opens the panel from the primary navigation itself — there is no
     separate menu button in the prototype's nav, and adding one put the control
     somewhere nobody would look for it. Hovering or focusing any primary link
     opens the shared Shop/Read panel; leaving the header closes it. Clicking a
     link still navigates, so the panel is an enrichment, not a gate. */
  (function(){
    const nav=document.querySelector('.nav');
    const links=document.querySelector('.links');
    const mega=document.getElementById('mega');
    const dim=document.getElementById('menudim');
    if(!nav||!links||!mega) return;
    const items=[...links.querySelectorAll('a[data-mega]')];   /* The Fragrances only */
    if(!items.length) return;
    let open=false, hideTimer, intentTimer, suppress=false;
    const set=v=>{
      if(v===open) return;
      open=v; if(v) mega.hidden=false;
      mega.classList.toggle('on',v);
      dim&&dim.classList.toggle('on',v);
      items.forEach(a=>a.setAttribute('aria-expanded',String(v)));
      clearTimeout(hideTimer);
      if(!v) hideTimer=setTimeout(()=>{ if(!open) mega.hidden=true; },400);
    };
    const wantOpen=()=>{ clearTimeout(intentTimer); intentTimer=setTimeout(()=>set(true),140); };
    const wantClose=()=>{ clearTimeout(intentTimer); set(false); };
    items.forEach(a=>{
      a.setAttribute('aria-controls','mega');
      a.setAttribute('aria-expanded','false');
      a.addEventListener('mouseenter',wantOpen);
      a.addEventListener('focus',()=>{ if(!suppress) set(true); });
    });
    links.addEventListener('mouseleave',()=>clearTimeout(intentTimer));
    nav.addEventListener('mouseleave',wantClose);
    mega.addEventListener('mouseenter',()=>clearTimeout(intentTimer));
    mega.addEventListener('mouseleave',wantClose);
    dim&&dim.addEventListener('click',wantClose);
    /* Escape closes and returns focus to the nav — briefly suppressing the
       focus-opens rule, or the panel would reopen the instant focus lands. */
    addEventListener('keydown',e=>{
      if(e.key!=='Escape'||!open) return;
      suppress=true; wantClose(); items[0].focus();
      setTimeout(()=>{suppress=false;},250);
    });
  })();

  /* ---- P10 · A0→A1b arrival: the hero is a sequence ------------------ */
  (function(){
    const shots=[...document.querySelectorAll('.hero .shots img')];
    const dots=[...document.querySelectorAll('.hero .dots button')];
    if(shots.length<2) return;
    let i=0, timer;
    const show=n=>{
      i=(n+shots.length)%shots.length;
      shots.forEach((s,k)=>s.classList.toggle('on',k===i));
      dots.forEach((d,k)=>k===i?d.setAttribute('aria-current','true'):d.removeAttribute('aria-current'));
    };
    const play=()=>{ clearInterval(timer);
      if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      timer=setInterval(()=>show(i+1),7000); };
    dots.forEach((d,k)=>d.addEventListener('click',()=>{show(k);play();}));
    play();
    document.addEventListener('visibilitychange',()=>document.hidden?clearInterval(timer):play());
  })();

})();

/* Share your story — the frame shows a live word count under the moment field. */
(function(){
  var ta = document.querySelector('textarea[data-count]');
  var out = document.querySelector('[data-countout]');
  if (!ta || !out) return;
  function tick(){
    var words = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
    out.textContent = words;
    out.parentNode.classList.toggle('over', words > 500);
  }
  ta.addEventListener('input', tick);
  tick();
})();

/* ---------------------------------------------------------------- forms ----
   Validation was left entirely to the browser: a system-styled bubble in the
   wrong typeface that disappears on the next click, at the exact moment a
   customer is most invested. This replaces it with the site's own voice —
   inline, persistent, announced, and cleared as soon as the field is fixed.
   Native constraints still do the checking; only the presentation changes. */
(function(){
  const MSG={valueMissing:'This one is needed.',
             typeMismatch:'That does not look like an email address.',
             tooShort:'A little more, please.',
             patternMismatch:'That format is not quite right.'};
  function reason(el){
    const v=el.validity;
    for(const k of Object.keys(MSG)) if(v[k]) return MSG[k];
    return el.validationMessage||'Please check this.';
  }
  function field(el){ return el.closest('.ffield,.field,label')||el.parentElement; }
  function clear(el){
    const f=field(el); if(!f)return;
    f.classList.remove('invalid'); el.removeAttribute('aria-invalid');
    const m=f.querySelector('.err'); if(m) m.remove();
  }
  function mark(el){
    const f=field(el); if(!f)return;
    f.classList.add('invalid'); el.setAttribute('aria-invalid','true');
    let m=f.querySelector('.err');
    if(!m){ m=document.createElement('span'); m.className='err';
      m.id=(el.name||'f')+'-err-'+Math.random().toString(36).slice(2,7);
      f.appendChild(m); el.setAttribute('aria-describedby',m.id); }
    m.textContent=reason(el);
  }
  document.querySelectorAll('form').forEach(form=>{
    if(!form.querySelector('[required],[type=email],[pattern]'))return;
    form.setAttribute('novalidate','');
    let live=form.querySelector('.formlive');
    if(!live){ live=document.createElement('p'); live.className='formlive';
      live.setAttribute('role','status'); live.setAttribute('aria-live','polite');
      form.prepend(live); }
    form.addEventListener('submit',e=>{
      const bad=[...form.elements].filter(el=>el.willValidate&&!el.checkValidity());
      [...form.elements].forEach(el=>{ if(el.willValidate&&el.checkValidity()) clear(el); });
      if(bad.length){
        e.preventDefault(); e.stopImmediatePropagation();
        bad.forEach(mark);
        live.textContent = bad.length===1 ? 'One field needs your attention.'
          : bad.length+' fields need your attention.';
        bad[0].focus();
        return false;
      }
      live.textContent='';
    },true);
    form.addEventListener('input',e=>{ if(e.target.willValidate&&e.target.checkValidity()) clear(e.target); });
    form.addEventListener('blur',e=>{ if(e.target.willValidate&&!e.target.checkValidity()&&e.target.value) mark(e.target); },true);
  });
})();
