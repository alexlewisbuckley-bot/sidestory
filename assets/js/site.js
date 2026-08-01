/* Side Story — demo behaviour. Cart state is in-memory + sessionStorage for the demo only. */
(function(){
  const CAT = {
    'hotel-lobby':{name:'Hotel Lobby',stone:'Nero Marquina',col:'#1C1E1D',notes:'woods, spice, green',img:'p-hotel-lobby.jpg',price:160},
    'sibling-rivalry':{name:'Sibling Rivalry',stone:'Leopard Salome',col:'#8A6A3F',notes:'grapefruit, vetiver, smoke',img:'p-sibling-rivalry.jpg',price:160},
    'pillow-talk':{name:'Pillow Talk',stone:'Calacatta',col:'#E0DCD0',notes:'musk, powder, warm skin',img:'p-pillow-talk.jpg',price:160},
    'sunday-service':{name:'Sunday Service',stone:'Verde Jade',col:'#3E5147',notes:'incense, linen, morning air',img:'p-sunday-service.jpg',price:160},
    'third-date':{name:'Third Date',stone:'Rosso Levanto',col:'#6E3B34',notes:'plum, tobacco, candlelight',img:'p-third-date.jpg',price:160},
    'road-trip':{name:'Road Trip',stone:'Rosso Francia',col:'#B5593F',notes:'amber, leather, warm air',img:'p-road-trip.jpg',price:160},
    '4pm-matinee':{name:'4pm Matinee',stone:'Giallo Siena',col:'#C79A4B',notes:'citrus, velvet, dark rooms',img:'p-4pm-matinee.jpg',price:160}
  };
  window.SS_CAT = CAT;
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
  const burger=document.querySelector('.burger');
  burger&&burger.addEventListener('click',()=>document.querySelector('.navlinks').classList.toggle('open'));

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
        <img src="assets/img/${i.img}" alt="">
        <div style="flex:1"><h4>${i.label}</h4><p class="dmeta">${i.meta}</p>
        <button class="dmeta" style="background:none;border:0;text-decoration:underline;cursor:pointer;padding:0" onclick="SSremove(${ix})">Remove</button></div>
        <span>${money(i.price)}</span></div>`).join('')
        : '<p class="empty">Empty — every story starts somewhere.</p>';
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
    const p=CAT[slug]||{name:'The First Lines',img:'set-first-lines.jpg',price:38,stone:'—'};
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
      <img src="assets/img/${i.img}" alt="">
      <div style="flex:1"><h3 style="font-family:'Libre Caslon Text',serif;font-size:17px">${i.label}</h3>
      <p class="dmeta">${i.meta}</p>
      <button class="dmeta" style="background:none;border:0;text-decoration:underline;cursor:pointer;padding:0" onclick="SSremove(${ix})">Remove</button></div>
      <span style="font-size:16px">${money(i.price)}</span></div>`).join('')
      : '<p class="empty">Your bag is empty — <a class="link-ul" href="collection.html">begin with the seven</a>.</p>';
    const sub=document.getElementById('subtotal'); if(sub) sub.textContent=money(total());
    const cred=bag.some(i=>i.price===5)?5:0;
    const tot=document.getElementById('grandtotal'); if(tot) tot.textContent=money(Math.max(0,total()-cred));
    const cr=document.getElementById('creditrow'); if(cr) cr.style.display=cred?'flex':'none';
  }

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
})();
