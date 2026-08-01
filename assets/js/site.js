/* Side Story — demo behaviour. Cart state is in-memory + sessionStorage for the demo only. */
(function(){
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
      if(!collapsed && y>140){collapsed=true;nav&&nav.classList.add('shrunk');ann&&ann.classList.add('hide');}
      else if(collapsed && y<40){collapsed=false;nav&&nav.classList.remove('shrunk');ann&&ann.classList.remove('hide');}
      ticking=false;
    });
  }
  addEventListener('scroll',onScroll,{passive:true}); onScroll();
  window.showSwap=(btn,src)=>{
    document.querySelectorAll('.show .thumbs button').forEach(b=>b.removeAttribute('aria-current'));
    btn.setAttribute('aria-current','true');
    const big=document.getElementById('showbig');
    if(!big) return; big.style.opacity=0;
    setTimeout(()=>{big.src=src;big.style.opacity=1;},200);
  };
  /* the homepage nav uses .links, the other pages .navlinks — accept either */
  const burger=document.querySelector('.burger');
  const navlinks=document.querySelector('.navlinks,.links');
  if(burger&&navlinks){
    burger.setAttribute('aria-expanded','false');
    burger.addEventListener('click',()=>{
      const open=navlinks.classList.toggle('open');
      burger.setAttribute('aria-expanded',String(open));
    });
    navlinks.addEventListener('click',e=>{
      if(e.target.tagName==='A'){navlinks.classList.remove('open');burger.setAttribute('aria-expanded','false');}
    });
  }

  /* scroll reveals */
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.12,rootMargin:'0px 0px -40px'});
  document.querySelectorAll('.rev').forEach((el,i)=>{el.style.transitionDelay=(i%4*70)+'ms';io.observe(el);});

  /* bag drawer */
  const scrim=document.getElementById('scrim'), drawer=document.getElementById('drawer');
  window.openDrawer=()=>{drawer&&drawer.classList.add('open');scrim&&scrim.classList.add('on');};
  window.closeDrawer=()=>{drawer&&drawer.classList.remove('open');scrim&&scrim.classList.remove('on');};
  scrim&&scrim.addEventListener('click',closeDrawer);
  addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();});

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
    const isSample=kind==='sample';
    bag.push({slug,label:p.name+(isSample?' — sample':(slug==='set'?'':' — 100ml')),
      meta:isSample?'2ml · its story, printed small':(p.stone?p.stone.toUpperCase()+' LID · STORY INCLUDED':'ALL SEVEN IN MINIATURE'),
      price:isSample?5:p.price,img:p.img});
    save();
    const c=document.getElementById('bagcount'); if(c){c.classList.add('tick');setTimeout(()=>c.classList.remove('tick'),300);}
    if(btn){const t=btn.textContent;btn.textContent='In the bag ✓';btn.disabled=true;
      setTimeout(()=>{btn.textContent=t;btn.disabled=false;},1400);}
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
         <div class="chips" style="justify-content:center"><a href="collection.html">See the fragrances</a><a href="samples.html">Begin with samples</a></div></div>`;
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
    main.style.opacity=0; setTimeout(()=>{main.src=src;main.style.opacity=1;},180);
  };
  document.querySelectorAll('.sizes').forEach(row=>{
    row.addEventListener('click',e=>{
      const b=e.target.closest('button'); if(!b) return;
      row.querySelectorAll('button').forEach(x=>x.removeAttribute('aria-current'));
      b.setAttribute('aria-current','true');
      const price=b.dataset.price||(b.textContent.match(/£(\d+)/)||[])[1];
      const add=document.querySelector('.pdp .cta .btn-ink');
      if(add&&price) add.textContent='Add to bag — £'+price;
    });
  });
  /* Collection sort. The grid is re-ordered with the CSS `order` property, so
     nothing is added or removed from the DOM and no layout is rebuilt. */
  document.querySelectorAll('.filters[data-sort-for]').forEach(row=>{
    const grid=document.querySelector(row.dataset.sortFor); if(!grid) return;
    const cards=[...grid.querySelectorAll('.card')];
    const promo=grid.querySelector('.promo');
    const label={order:'7 stories · 1 set',feeling:'by feeling · A–Z',
                 stone:'by stone · A–Z',note:'by opening note · A–Z'};
    const apply=key=>{
      const sorted=[...cards].sort((a,b)=> key==='order'
        ? (+a.dataset.order)-(+b.dataset.order)
        : (a.dataset[key]||'').localeCompare(b.dataset[key]||''));
      sorted.forEach((c,i)=>{c.style.order=i;});
      if(promo) promo.style.order=sorted.length;
      const c=row.querySelector('[data-count]'); if(c) c.textContent=label[key]||label.order;
    };
    row.addEventListener('click',e=>{
      const b=e.target.closest('button[data-sort]'); if(!b) return;
      row.querySelectorAll('button').forEach(x=>x.removeAttribute('aria-current'));
      b.setAttribute('aria-current','true');
      grid.classList.add('sorting');
      setTimeout(()=>{apply(b.dataset.sort);grid.classList.remove('sorting');},180);
    });
    apply('order');
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

  /* newsletter + story form */
  const nf=document.getElementById('newsform');
  nf&&nf.addEventListener('submit',e=>{e.preventDefault();
    nf.parentElement.innerHTML='<div class="centered"><div class="rule"></div><h2 style="font-size:30px">The first letter is on its way.</h2><p class="fine" style="margin-top:12px">One letter a month. Unsubscribe any time — your address is never shared.</p></div>';});
  const ta=document.getElementById('moment');
  ta&&ta.addEventListener('input',()=>{
    const w=ta.value.trim()?ta.value.trim().split(/\s+/).length:0;
    document.getElementById('wcount').textContent=w+' / 500 words';
  });
  const sf=document.getElementById('storyform');
  sf&&sf.addEventListener('submit',e=>{e.preventDefault();
    document.getElementById('formwrap').innerHTML=
     '<div class="centered"><div class="rule"></div><p class="kicker">Received</p>'+
     '<h2 style="font-size:clamp(28px,3.4vw,44px);margin:14px 0 16px">It’s in the postbag.</h2>'+
     '<p class="mut" style="line-height:1.85">Someone here will read it — a person, not a filter — and you’ll hear from us within the month, whichever way it goes. Thank you for trusting us with it.</p>'+
     '<p style="margin-top:22px"><a class="btn btn-ink" href="stories.html">Read the seven</a></p></div>';
    window.scrollTo({top:document.getElementById('formwrap').offsetTop-120,behavior:'smooth'});});

  /* checkout */
  const co=document.getElementById('checkoutform');
  co&&co.addEventListener('submit',e=>{e.preventDefault();location.href='confirmation.html';});

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
