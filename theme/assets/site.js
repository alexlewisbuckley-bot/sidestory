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
  /* The hero sizes itself to the viewport minus the chrome, and the nav's
     real height wanders a few pixels with the viewport's width — enough for
     a sliver of the next section to show under the fold. Measured once at
     rest and on resize; never while the nav is shrunk, which is not the
     state the fold is judged in. */
  const setChrome=()=>{ if(collapsed) return;
    const a=ann?ann.offsetHeight:0, n=nav?nav.offsetHeight:0;
    if(a+n) document.documentElement.style.setProperty('--chromeh',(a+n)+'px'); };
  setChrome();
  addEventListener('resize',setChrome,{passive:true});
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(setChrome);

  /* ---- the announcement ticker ---------------------------------------
     The CSS runs the loop; this only decides how fast. A fixed duration
     means the speed depends on how much text there happens to be and how
     wide the screen is, so the same strip races on a phone and crawls on a
     desktop. Setting it from the measured width fixes the speed in pixels
     per second, which is the thing a reader actually experiences.

     Measured after the webfonts land, because the track is laid out in
     Montserrat and measuring it in the fallback gives a width that is out by
     a few per cent — small, but it is the difference between the loop
     rejoining exactly and drifting a hair each pass. */
  (function(){
    const track=document.querySelector('[data-ann]');
    if(!track) return;
    const SPEED=42;                 /* px per second — slow enough to read */
    const reduce=matchMedia('(prefers-reduced-motion: reduce)');

    /* Two copies only work if one copy is at least as wide as the screen.
       On a very wide display the four messages are narrower than the viewport,
       and translating half the track would drag a band of empty ink across
       the page before the second copy arrived. Each group is padded out with
       repeats of its own items until it covers the screen; the halves stay
       identical, so the loop still rejoins exactly. Repeats are aria-hidden —
       a screen reader is read the four messages once. */
    function fill(){
      if(reduce.matches) return;
      const groups=[...track.querySelectorAll('.anngroup')];
      if(groups.length<2) return;
      const base=groups.map(g=>[...g.children].slice(0,g.__n||g.children.length));
      groups.forEach((g,i)=>{ g.__n=g.__n||g.children.length;
        while(g.getBoundingClientRect().width < innerWidth && g.children.length < g.__n*12){
          base[i].forEach(node=>{ const c=node.cloneNode(true);
            c.setAttribute('aria-hidden','true'); g.appendChild(c); });
        }
      });
    }
    function pace(){
      if(reduce.matches){ track.style.removeProperty('--ann-dur'); return; }
      fill();
      /* half the track is one full copy of the list, which is the distance
         the animation travels */
      const d=track.scrollWidth/2;
      if(d>0) track.style.setProperty('--ann-dur',Math.round(d/SPEED)+'s');
    }
    pace();
    if(document.fonts&&document.fonts.ready) document.fonts.ready.then(pace);
    addEventListener('resize',pace,{passive:true});

    /* Reduced motion: no ticker, one message at a time, swapped on a timer
       with no transition. The alternative — freezing the strip — leaves
       whichever message happens to be under the viewport, often half of one. */
    let timer;
    function rotate(){
      clearInterval(timer);
      const items=[...track.querySelectorAll('.anngroup:first-child .anni')];
      if(!reduce.matches||items.length<2){ items.forEach(i=>i.hidden=false); return; }
      let i=0;
      const show=()=>items.forEach((el,k)=>{ el.hidden = k!==i; });
      show();
      timer=setInterval(()=>{ i=(i+1)%items.length; show(); },7000);
    }
    rotate();
    (reduce.addEventListener?reduce.addEventListener.bind(reduce,'change')
      :reduce.addListener.bind(reduce))(()=>{ pace(); rotate(); });
  })();
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
  /* the phone menu is wired up below, once the overlay contract exists */

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
    /* A queue, not a swap. This used to clearTimeout the previous call and
       drop its mutation — fine when calls were a keystroke apart, and
       exactly wrong at init, where paint() queues the card-hiding and
       applyOne() queues the size imagery in the same tick: the second call
       silently discarded the first, which is why ?scent= arrived pressed
       but unfiltered. Every queued mutation now runs, in order, on the one
       debounced beat. */
    grid.__pending = grid.__pending || [];
    grid.__pending.push(mutate);
    if(grid.__settling){ clearTimeout(grid.__settling); }
    grid.classList.add('sorting');
    grid.__settling = setTimeout(()=>{
      const q = grid.__pending; grid.__pending = []; grid.__settling = null;
      q.forEach(f=>f());
      requestAnimationFrame(()=>grid.classList.remove('sorting'));
    }, 100);   /* --d-instant, the same beat the grid dims over */
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

  /* Background film behind a pull-quote band. It carries its URL in data-src
     and nothing else, so the file is not requested at all until the band is
     near the viewport — it is a decoration halfway down a product page, and
     it should not compete with the page for the first megabyte. It fades in
     only once it can actually play, and pauses when it leaves; if it never
     plays, or the reader has asked for less motion, the photograph beneath is
     already there and stays. */
  /* Sticky add-to-bag on the phone PDP. The real button scrolls away by the
     second screen of a nine-screen page; the bar takes over exactly when the
     button's own block leaves the viewport, and stands down when it returns —
     two buttons for the same act are never on screen together. */
  (function(){
    const bar=document.getElementById('pdpbar');
    const cta=document.querySelector('.pdp .cta');
    if(!bar||!cta||!('IntersectionObserver' in window)) return;
    /* the bar stands in whenever the real button is off screen, in either
       direction — which on a phone includes the moment the page arrives,
       since the buy block starts below the fold. The two are never visible
       together. */
    const io=new IntersectionObserver(es=>es.forEach(e=>{
      const on=!e.isIntersecting;
      bar.hidden=!on;
      /* the page gets the bar's height back at its foot, so the footer's
         last links are never permanently underneath it */
      document.documentElement.classList.toggle('haspdpbar',on);
      requestAnimationFrame(()=>bar.classList.toggle('on',on));
    }));
    io.observe(cta);
  })();

  const films=document.querySelectorAll('.storyband > video[data-src]');
  if(films.length && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    /* The photograph under a film is a different picture, not its first
       frame, so showing it and then dissolving it reads as a mistake. The
       band paints on its own dark ground instead and the still is only
       brought up if the film says it cannot come — on error, or when it has
       had six seconds and still cannot play. */
    const fallback=v=>{ const s=v.closest('.storyband'); if(s) s.classList.add('nofilm'); };
    const start=v=>{
      if(v.dataset.started) return; v.dataset.started='1';
      v.muted=true; v.playsInline=true;
      const late=setTimeout(()=>fallback(v),6000);
      v.addEventListener('canplay',()=>{ clearTimeout(late); v.classList.add('ready'); },{once:true});
      v.addEventListener('error',()=>{ clearTimeout(late); fallback(v); },{once:true});
      v.src=v.dataset.src;
      const go=v.play(); if(go&&go.catch) go.catch(()=>{});
    };
    /* Started well before the band arrives, so on any ordinary connection the
       film is already playing by the time it is looked at. */
    const fio=new IntersectionObserver(es=>es.forEach(e=>{
      const v=e.target;
      if(e.isIntersecting){ start(v); if(v.paused){const g=v.play(); if(g&&g.catch) g.catch(()=>{});} }
      else if(v.dataset.started && !v.paused) v.pause();
    }),{rootMargin:'900px 0px'});
    films.forEach(v=>fio.observe(v));
  }

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
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===top.el)){
      e.preventDefault();last.focus();}
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
    /* Focus the panel, not the first control inside it.

       Focusing the first control is the obvious reading of "move focus into
       the dialog", and it is what this did — but Safari matches
       :focus-visible on a programmatically focused control even when the
       user arrived by touch, so opening the scent filters with a thumb drew
       a two-pixel keyboard ring around Woods & Green. Chromium does not, so
       this only ever showed on a phone.

       Focusing the container is the ARIA authoring practice anyway: a
       screen reader reads the dialog's label on arrival rather than
       starting halfway down its contents, and a keyboard user's first Tab
       lands on the first control with a ring it has earned. The container
       carries tabindex="-1", so it is unreachable by Tab and its own
       outline can be suppressed without hiding anything a user could
       otherwise reach. */
    if(!el.hasAttribute('tabindex')) el.setAttribute('tabindex','-1');
    setTimeout(()=>{ try{ el.focus({preventScroll:true}); }catch(_){ el.focus(); } },60);
  }
  function overlayClose(el){
    const i=OPEN.findIndex(o=>o.el===el); if(i<0)return;
    const rec=OPEN.splice(i,1)[0];
    /* the scrim is unhidden on open and was never hidden again — invisible,
       because it is opacity:0 and pointer-events:none without .on, but it sat
       in the accessibility tree for the rest of the session */
    if(rec.opts&&rec.opts.scrim){ const sc=rec.opts.scrim; sc.classList.remove('on');
      setTimeout(()=>{ if(!sc.classList.contains('on')) sc.hidden=true; },420); }
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

  /* ---- search ---------------------------------------------------------
     Search was a page. Going to it meant leaving whatever you were reading,
     and coming back meant the back button — which is a lot to ask of someone
     who only wanted to check whether the green one is the incense one.

     It is a panel now, opened in place from the header on every page and
     from the phone menu, with results as you type. The index is forty-odd
     entries shipped inline with the page, so there is no request between the
     keystroke and the answer: no spinner, no empty frame, no debounce needed.

     /search stays exactly where it was. It is the destination without
     JavaScript, it is what a bookmark or a shared link resolves to, and when
     JavaScript is on its own field runs the same matcher and renders into
     the same markup — so the page and the panel cannot drift apart. */
  (function(){
    const IDX = window.SS_IDX || [];
    if(!IDX.length) return;

    /* A term matches on the title first, then anywhere in the haystack, and
       a match at the start of a word beats one buried mid-string: typing
       "ros" should find Rosso Levanto before it finds "morning". Every term
       has to match something, so "green stone" narrows rather than widens. */
    function score(row, terms){
      const t = row.t.toLowerCase();
      let total = 0;
      for(const q of terms){
        let s = 0;
        if(t === q) s = 120;
        else if(t.startsWith(q)) s = 90;
        else if(t.indexOf(' '+q) > -1) s = 70;
        else if(t.indexOf(q) > -1) s = 45;
        else if(row.x.indexOf(' '+q) > -1) s = 30;
        else if(row.x.indexOf(q) > -1) s = 12;
        if(!s) return 0;
        total += s;
      }
      return total;
    }
    function search(q){
      const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      if(!terms.length) return [];
      const hits = [];
      for(const row of IDX){ const s = score(row, terms); if(s) hits.push({row, s}); }
      /* stable within a score: the index is already in the order the house
         would put things in, and shuffling equal matches looks like a bug */
      hits.sort((a,b)=>b.s-a.s);
      return hits.slice(0,8).map(h=>h.row);
    }

    const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    /* the matched run is marked in the result, so it is obvious why a row is
       there — particularly for the ones matched on a note or a feeling that
       is not in the visible text */
    function mark(text, terms){
      let out = esc(text);
      for(const q of terms){
        if(q.length < 2) continue;
        const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'ig');
        out = out.replace(re, '<mark>$1</mark>');
      }
      return out;
    }
    function render(rows, q, into){
      const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      /* Collect into groups before writing any markup. Emitting a heading
         whenever the kind changed as the sorted list was walked printed "The
         house" twice with a "Shop" between them, because the sort is by score
         and a strong match and a weak one in the same group need not be
         adjacent. Groups appear in the order their best match did. */
      const order = [], byKind = {};
      for(const r of rows){
        if(!byKind[r.k]){ byKind[r.k] = []; order.push(r.k); }
        byKind[r.k].push(r);
      }
      let html = '';
      for(const k of order){
        html += '<p class="mpfh">' + esc(k) + '</p><div class="srchlist">';
        for(const r of byKind[k]){
          html += '<a href="' + esc(r.h) + '"><span>' + mark(r.t, terms) + '</span>'
                + '<span class="sm">' + mark(r.s, terms) + '</span></a>';
        }
        html += '</div>';
      }
      into.innerHTML = html;
    }

    /* ---- the panel --------------------------------------------------- */
    const panel = document.getElementById('srch');
    const scrim = document.getElementById('srchscrim');
    const q = document.getElementById('srchq');
    const res = document.getElementById('srchres');
    const idle = document.getElementById('srchidle');
    const none = document.getElementById('srchnone');
    const sr = document.getElementById('srchsr');
    const clear = document.getElementById('srchclear');

    if(panel && q){
      const run = () => {
        const v = q.value.trim();
        clear.hidden = !v;
        if(!v){
          idle.hidden = false; res.hidden = true; none.hidden = true;
          res.innerHTML = ''; q.setAttribute('aria-expanded','false'); sr.textContent = '';
          return;
        }
        const rows = search(v);
        idle.hidden = true;
        q.setAttribute('aria-expanded', String(!!rows.length));
        if(rows.length){
          render(rows, v, res); res.hidden = false; none.hidden = true;
          sr.textContent = rows.length + (rows.length===1?' result':' results') + ' for ' + v;
        } else {
          res.hidden = true; res.innerHTML = '';
          none.hidden = false;
          none.innerHTML = 'Nothing for &ldquo;' + esc(v) + '&rdquo;. Try a note &mdash; '
            + '<button type="button" data-srch-try="incense">incense</button>, '
            + '<button type="button" data-srch-try="citrus">citrus</button>, '
            + '<button type="button" data-srch-try="amber">amber</button> &mdash; '
            + 'or a feeling, a stone, or the name of a story.';
          sr.textContent = 'No results for ' + v;
        }
      };
      q.addEventListener('input', run);

      /* same measurement as the phone menu: the announcement bar above the
         header scrolls away, so the header's bottom edge is not a constant */
      const nav = document.querySelector('.nav');
      const open = () => {
        if(panel.classList.contains('open')) return;
        if(nav) panel.style.setProperty('--srch-top',
          Math.round(nav.getBoundingClientRect().bottom) + 'px');
        overlayOpen(panel, {scrim});
        /* overlayOpen focuses the dialog; the one place a control should take
           focus instead is a search field, where the keyboard is the point */
        /* select() on iOS raises the selection UI over an empty field —
           desktop keeps the convenience, touch just gets the caret */
        setTimeout(()=>{ q.focus();
          if(matchMedia('(hover:hover) and (pointer:fine)').matches) q.select();
        }, 90);
      };
      const close = () => overlayClose(panel);
      window.SSsearch = {open, close};

      document.getElementById('srchclose').addEventListener('click', close);
      scrim && scrim.addEventListener('click', close);
      clear.addEventListener('click', ()=>{ q.value=''; run(); q.focus(); });
      none.addEventListener('click', e=>{
        const t = e.target.closest('[data-srch-try]'); if(!t) return;
        q.value = t.dataset.srchTry; run(); q.focus();
      });
      /* following a result closes the panel: without this the overlay's scroll
         lock survives the navigation on a bfcache restore */
      panel.addEventListener('click', e=>{ if(e.target.closest('.srchlist a')) close(); });

      /* Down from the field walks the results, up walks back and returns to
         the field at the top — the same shape as any address bar. Enter in
         the field takes the first result, because that is what the return key
         means to everyone who has ever used a search box. */
      /* only what is actually on screen: the idle suggestions stay in the DOM
         behind the results, and focusing a display:none link silently drops
         focus to <body> — the arrow key appeared to do nothing at all */
      const items = () => [...panel.querySelectorAll('.srchlist a')]
        .filter(a => a.offsetParent !== null);
      panel.addEventListener('keydown', e=>{
        if(e.key === 'Enter' && e.target === q){
          const first = items()[0]; if(first){ e.preventDefault(); first.click(); }
          return;
        }
        if(e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const list = items(); if(!list.length) return;
        e.preventDefault();
        const at = list.indexOf(document.activeElement);
        if(e.key === 'ArrowDown') list[at < 0 ? 0 : Math.min(at+1, list.length-1)].focus();
        else if(at <= 0) q.focus();
        else list[at-1].focus();
      });

      /* Every route in: the header link, the phone menu's, and the footer's.
         They stay real links to /search, so the markup still works with
         no JavaScript and a long press still offers "open in new tab". */
      document.addEventListener('click', e=>{
        const a = e.target.closest('a[href$="/search"]');
        if(!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
        if((location.pathname === '/search')) return;   /* already there */
        e.preventDefault(); open();
      });
      addEventListener('keydown', e=>{
        /* the shortcut every search field has had for a decade */
        if(e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)){
          e.preventDefault(); open();
        }
      });

      /* On a desktop the header's Search opens on hover, with the same
         140ms of intent the mega panel asks for — the two dropdowns are one
         behaviour now, and each yields to the other as the pointer changes
         subject. Click still works, and is still a real link elsewhere. */
      (function(){
        const link=document.querySelector('.util a[href$="/search"]');
        const desk=matchMedia('(min-width:72em) and (hover:hover) and (pointer:fine)');
        if(!link) return;
        let t;
        link.addEventListener('mouseenter',()=>{
          if(!desk.matches || (location.pathname === '/search')) return;
          clearTimeout(t); t=setTimeout(open,140);
        });
        link.addEventListener('mouseleave',()=>clearTimeout(t));
      })();
    }

    /* ---- the page, running the same matcher -------------------------- */
    const pq = document.querySelector('.searchbar input');
    if(pq){
      const pres = document.getElementById('pagesearchres');
      const pidle = document.getElementById('pagesearchidle');
      if(pres){
        const prun = () => {
          const v = pq.value.trim();
          if(!v){ pres.hidden = true; pres.innerHTML=''; if(pidle) pidle.hidden = false; return; }
          const rows = search(v);
          if(pidle) pidle.hidden = true;
          if(rows.length){ render(rows, v, pres); pres.hidden = false; }
          else { pres.innerHTML = '<p class="srchnone">Nothing for &ldquo;'+esc(v)
            +'&rdquo;. Try a note, a feeling, a stone, or the name of a story.</p>';
            pres.hidden = false; }
        };
        pq.addEventListener('input', prun);
        const url = new URLSearchParams(location.search).get('q');
        if(url){ pq.value = url; prun(); }
        pq.form && pq.form.addEventListener('submit', e=>{ e.preventDefault(); prun(); });
      }
    }
  })();

  /* ---- the phone menu -------------------------------------------------
     It used to re-flow the desktop nav into an absolutely-positioned
     dropdown. Three things were wrong with that and they compounded:

       · the desktop links carry data-mega, and the handler focused the first
         one on open — which opened the shop panel, at a higher z-index, over
         the menu that had just opened it;
       · an absolute panel is as tall as its content, so with the page
         scroll-locked behind it the overflow was unreachable;
       · it toggled `display`, which is a layout pass on every open and close
         and cannot be transitioned, so both read as a stutter.

     The panel is now its own element, fixed between the header and the bottom
     of the screen, with its own scroller, and it goes through the same
     overlayOpen/overlayClose contract as the bag drawer and the scent sheet —
     one focus trap, one scroll-lock record, one Escape handler, focus
     returned to the burger on close. */
  (function(){
    const burger=document.querySelector('.burger');
    const panel=document.getElementById('menupanel');
    if(!burger||!panel) return;
    const nav=document.querySelector('.nav');
    const isOpen=()=>panel.classList.contains('open');

    /* The announcement bar above the header scrolls away, so the header's
       bottom edge is not a constant. Measure it at the moment of opening
       rather than guessing, and write it to a custom property so the panel
       positions itself in the same frame it becomes visible. */
    const place=()=>{
      const b=nav?Math.round(nav.getBoundingClientRect().bottom):0;
      panel.style.setProperty('--mp-top',b+'px');
    };
    const open=()=>{ if(isOpen())return; place();
      burger.setAttribute('aria-expanded','true'); overlayOpen(panel); };
    const close=()=>{ if(!isOpen())return;
      burger.setAttribute('aria-expanded','false'); overlayClose(panel);
      panel.scrollTop=0; };

    burger.setAttribute('aria-expanded','false');
    /* One click listener, deliberately. Opening on pointerdown to save the
       old 300ms tap delay and swallowing the click is the usual trick, but a
       touch-synthesised click carries detail:0 exactly like a keyboard one,
       so there is no way to tell them apart and the menu opened and closed
       again on the same tap. The delay it was buying back does not exist on
       this site anyway — the viewport is width=device-width and the burger
       carries touch-action:manipulation, so the click arrives on lift. */
    burger.addEventListener('click',()=>{ isOpen()?close():open(); });

    panel.addEventListener('click',e=>{ if(e.target.closest('a')) close(); });
    /* overlayClose already returns focus to the opener, which is the burger */
    addEventListener('keydown',e=>{ if(e.key==='Escape'&&isOpen()) close(); });

    /* A menu open when the layout crosses back to the desktop nav would leave
       a locked page behind an invisible panel. Close on any width change, and
       keep the measured offset honest while it is open. */
    const desk=matchMedia('(min-width:72em)');
    (desk.addEventListener?desk.addEventListener.bind(desk,'change'):desk.addListener.bind(desk))(()=>close());
    addEventListener('resize',()=>{ if(isOpen()) place(); },{passive:true});
    addEventListener('orientationchange',close);
    /* the header shrinks on scroll; the panel's top edge follows it */
    addEventListener('scroll',()=>{ if(isOpen()) place(); },{passive:true});
  })();

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
    /* the threshold is one number, written by the build and read here — it
       used to be typed into this line twice and into five pieces of copy
       elsewhere, all of which had to be found and changed together */
    const FREE = window.SS_FREE || 40;
    const pct=Math.min(100,Math.round(total()/FREE*100));
    const fill=document.getElementById('tfill'); if(fill) fill.style.width=pct+'%';
    const th=document.getElementById('thresh');
    if(th) th.textContent = total()>=FREE ? 'Complimentary delivery — unlocked'
      : 'Complimentary delivery at £'+FREE+' — £'+(FREE-total())+' away';
    document.querySelectorAll('[data-bagtotal]').forEach(e=>e.textContent=money(total()));
    document.querySelectorAll('[data-bagcount]').forEach(e=>e.textContent=bag.length);
    renderBagPage();
  }
  window.SSremove=i=>{bag.splice(i,1);save();renderBag();};
  window.addToBag=(slug,kind,btn)=>{
    const p=CAT[slug]||CAT.set||{name:'The First Lines',img:'https://sidestory-rho.vercel.app/assets/img/set-first-lines.jpg',price:38,stone:''};
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
    /* This used to bail whenever #baglines was absent, which is exactly the
       case on /checkout — so checkout read "Pay £0" for a full bag. Only
       the line list depends on the list container; the totals never did. */
    const wrap=document.getElementById('baglines');
    if(wrap) wrap.innerHTML = bag.length? bag.map((i,ix)=>`<div class="line">
      <img src="${i.img}" alt="" width="112" height="112">
      <div><h3>${i.label}</h3><p class="meta">${i.meta}</p>
        <div class="act"><span class="meta">${money(i.price)}</span>
          <button class="ul" onclick="SSremove(${ix})">Remove</button></div></div>
    </div>`).join('')
      : `<div class="empty"><p class="k">Nothing here yet</p>
         <p>Your bag is empty. The shelf is seven stories long.</p>
         <div class="tagrow"><a href="/collections/the-fragrances">See the fragrances</a><a href="/products/discovery-set">Begin with samples</a></div></div>`;
    /* a dedication belongs to something. With an empty bag the offer sat
       under the empty state offering to typeset a line onto no flyleaf. */
    document.querySelectorAll('.cart .tryfirst').forEach(el=>{ el.hidden=!bag.length; });
    /* There is no sample credit. The bag used to deduct £5 whenever a sample
       was in it, which was an offer the house does not make. */
    const set=(id,v)=>{const e=document.getElementById(id); if(e) e.textContent=v;};
    set('subtotal',money(total())); set('bagsub',money(total())); set('cosub',money(total()));
    set('grandtotal',money(total()));
    set('bagtotal',money(total()));
    set('cototal',money(total()));
    document.querySelectorAll('form [type=submit]').forEach(b=>{
      if(/^Pay /.test(b.textContent)) b.textContent='Pay '+money(total());
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
    const key=b.dataset.size||'100ml';
    /* every size row on the page — the buy column's and the sticky bar's —
       shows the same selection, whichever of them was tapped */
    document.querySelectorAll('.sizes').forEach(r=>{
      r.querySelectorAll('button').forEach(x=>x.removeAttribute('aria-current'));
      const m=r.querySelector('button[data-size="'+key+'"]');
      if(m) m.setAttribute('aria-current','true');
    });
    const src=document.querySelector('.sizes button[data-price][data-size="'+key+'"]')||b;
    const price=src.dataset.price||(src.textContent.match(/£(\d+)/)||[])[1];
    const add=document.querySelector('.pdp .cta .btn-ink');
    if(add&&price){ add.textContent='Add to bag — '+price; add.dataset.size=key; }
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
    const bar=document.getElementById('pdpbar');
    if(bar&&price){
      const bb=bar.querySelector('.r .btn-ink'), bp=bar.querySelector('[data-barprice]');
      if(bb) bb.dataset.size=key;
      if(bp) bp.textContent=price+' · '+(v&&v.label?v.label:'100 ml');
    }
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
    const sheet=scope.querySelector('[data-scent-sheet]');
    const scrim=scope.querySelector('[data-scent-scrim]');
    const applied=scope.querySelector('[data-applied]');
    const chipbox=scope.querySelector('[data-applied-chips]');

    /* The controller names no filter. It reads the groups out of the markup,
       which the build wrote from one declaration, so adding an axis — feeling,
       price, in stock — is an entry in that list and nothing here changes.

       Two kinds of group, and the distinction is the whole point. A `one`
       group is a choice: exactly one value is always active, radio semantics,
       and it never hides a card. A `many` group is a filter: none active by
       default, checkbox semantics, and a card survives only if it matches
       something in every group that has a selection. Size and scent used to be
       drawn identically and behave differently, which is exactly what made the
       size control feel broken — you pressed a filter and nothing filtered. */
    const groups = new Map();
    scope.querySelectorAll('[data-filter]').forEach(btn=>{
      const k = btn.dataset.filter;
      if(!groups.has(k)) groups.set(k, {
        key:k, mode: btn.hasAttribute('role') && btn.getAttribute('role')==='radio' ? 'one' : 'many',
        btns:[], chosen:new Set()
      });
      const g = groups.get(k);
      g.btns.push(btn);
      if(g.mode==='one' && btn.getAttribute('aria-checked')==='true') g.chosen.add(btn.dataset.value);
    });
    if(!groups.size) return;
    /* the shelf's card markup carries data-family, data-feeling, … — the
       group key is the attribute name, so no mapping table is needed */
    const cardVal = (card,key) => card.dataset[key] || '';
    const label = btn => (btn.querySelector('.long,.slab')||btn).textContent.trim();

    /* size is a `one` group and the only one that restyles the cards */
    function applyOne(g){
      if(g.key!=='size') return;
      const key=[...g.chosen][0]; if(!key) return;
      grid.dataset.size=key;
      settle(grid, ()=>cards.forEach(card=>{
        const p=CAT[card.dataset.slug]; if(!p||!p.sizes) return;
        const v=p.sizes[key]; if(!v) return;
        const shot=card.querySelector('[data-shot]');
        if(shot&&shot.getAttribute('src')!==v.img) swapPicture(shot,v.img,v.set);
        const buy=card.querySelector('[data-buy]');
        if(buy){ buy.dataset.size=key; buy.innerHTML=v.label+' — '+(window.SSP?SSP(card.dataset.slug,key,v.price):('£'+v.price)); }
        const line=card.querySelector('[data-priceline]');
        if(line) line.innerHTML=(window.SSP?SSP(card.dataset.slug,key,v.price):('£'+v.price))+' · '+v.label;
        const incl=card.querySelector('[data-incl]');
        if(incl) incl.textContent=v.incl;
        card.querySelectorAll('[data-href]').forEach(a=>{
          a.href='/products/'+card.dataset.slug+(key==='100ml'?'':'?size='+key);
        });
      }));
    }

    function paint(){
      /* every control that represents this value, in the row and in the
         sheet, moves together — there is one state, drawn twice */
      groups.forEach(g=>g.btns.forEach(b=>{
        const on = g.chosen.has(b.dataset.value);
        if(g.mode==='one'){ b.setAttribute('aria-checked',String(on)); b.tabIndex = on?0:-1; }
        else b.setAttribute('aria-pressed',String(on));
      }));

      let shown=0;
      const next=cards.map(card=>{
        let on=true;
        groups.forEach(g=>{
          if(g.mode!=='many'||!g.chosen.size) return;
          /* the card carries every family its style names, space-separated;
             it survives if any chosen family is among them */
          const vals=cardVal(card,g.key).split(/\s+/).filter(Boolean);
          if(![...g.chosen].some(v=>vals.includes(v))) on=false;
        });
        if(on) shown++;
        return [card,!on];
      });
      const narrowing=[...groups.values()].filter(g=>g.mode==='many'&&g.chosen.size);
      settle(grid, ()=>{
        next.forEach(([card,hide])=>{ card.hidden=hide; });
        /* the discovery-set card is not a fragrance, so it only belongs on an
           unfiltered shelf */
        if(promo) promo.hidden = narrowing.length>0;
      });

      const n = narrowing.reduce((s,g)=>s+g.chosen.size,0);
      const count = shown===7 ? 'Seven stories' : shown+(shown===1?' story':' stories');
      bar.querySelectorAll('[data-count]').forEach(c=>c.textContent=count);
      const sc=scope.querySelector('[data-sheetcount]');
      if(sc) sc.textContent = shown+(shown===1?' story':' stories');
      const tally=bar.querySelector('[data-tally]');
      if(tally){ tally.hidden = n===0; tally.textContent=n; }
      bar.classList.toggle('on', n>0);

      /* What is applied, in the open, each one its own undo. Before this the
         only record of a choice made inside the sheet was a number on the
         button that opened it. */
      if(chipbox){
        let html='';
        groups.forEach(g=>{
          if(g.mode!=='many') return;
          g.btns.forEach(b=>{ if(!g.chosen.has(b.dataset.value)) return;
            if(html.indexOf('data-value="'+b.dataset.value+'"')>-1) return;
            html += '<button type="button" class="achip" data-remove data-filter="'+g.key
                 +'" data-value="'+b.dataset.value+'">'+label(b)
                 +'<span aria-hidden="true">×</span>'
                 +'<span class="vh">— remove this filter</span></button>';
          });
        });
        chipbox.innerHTML=html;
      }
      if(applied) applied.hidden = n===0;
    }

    function toggle(key,value){
      const g=groups.get(key); if(!g) return;
      if(g.mode==='one'){
        if(g.chosen.has(value)) return;
        g.chosen.clear(); g.chosen.add(value); paint(); applyOne(g);
      } else {
        g.chosen.has(value) ? g.chosen.delete(value) : g.chosen.add(value);
        paint();
      }
    }
    function clearAll(){
      let touched=false;
      groups.forEach(g=>{ if(g.mode==='many'&&g.chosen.size){ g.chosen.clear(); touched=true; } });
      if(touched) paint();
    }

    /* ---- the sheet, on the shared overlay contract -------------------- */
    function openSheet(from){
      if(!sheet) return;
      bar.querySelectorAll('[data-open-filters]').forEach(b=>b.setAttribute('aria-expanded','true'));
      SSoverlay.open(sheet,{scrim});
    }
    function closeSheet(){
      if(!sheet||sheet.hidden) return;
      bar.querySelectorAll('[data-open-filters]').forEach(b=>b.setAttribute('aria-expanded','false'));
      SSoverlay.close(sheet);
    }

    scope.addEventListener('click',e=>{
      if(e.target.closest('[data-open-filters]')){ openSheet(); return; }
      if(e.target.closest('[data-close-scent]')||e.target.closest('[data-scent-scrim]')){ closeSheet(); return; }
      if(e.target.closest('[data-clear]')){ clearAll(); return; }
      const rm=e.target.closest('[data-remove]');
      if(rm){ toggle(rm.dataset.filter, rm.dataset.value);
        /* the chip removed itself; put focus somewhere that still exists */
        const nxt=chipbox&&chipbox.querySelector('.achip');
        (nxt||bar.querySelector('[data-open-filters]')||bar).focus&&(nxt||bar.querySelector('[data-open-filters]')||bar).focus();
        return; }
      const f=e.target.closest('[data-filter]');
      if(f){ toggle(f.dataset.filter, f.dataset.value); }
    });

    /* Arrow keys inside a radio group, which is what a `one` group is: one
       tab stop for the whole group and the arrows move between the options.
       Tabbing through three sizes to reach the scent filters was three stops
       where the standard says one. */
    scope.addEventListener('keydown',e=>{
      if(!/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
      const btn=e.target.closest('[data-filter]'); if(!btn) return;
      const g=groups.get(btn.dataset.filter); if(!g||g.mode!=='one') return;
      const sibs=g.btns.filter(b=>b.offsetParent!==null); if(sibs.length<2) return;
      const at=sibs.indexOf(btn); if(at<0) return;
      const fwd=e.key==='ArrowRight'||e.key==='ArrowDown';
      const to=sibs[(at + (fwd?1:-1) + sibs.length) % sibs.length];
      e.preventDefault();
      toggle(to.dataset.filter,to.dataset.value);
      to.focus();
    });

    /* the shared contract owns Escape and closes the sheet without telling
       the button that opened it — read the state back rather than keeping a
       second copy of it here */
    addEventListener('keydown',e=>{
      if(e.key!=='Escape'||!sheet) return;
      setTimeout(()=>{ bar.querySelectorAll('[data-open-filters]').forEach(b=>
        b.setAttribute('aria-expanded', String(sheet.classList.contains('open')))); },0);
    });

    /* ?scent=woods (or woods,floral) arrives pre-filtered — it is how the
       homepage's style index opens the shelf on one family. Unknown values
       are ignored rather than wedged into state. */
    (function(){
      const want=new URLSearchParams(location.search).get('scent');
      const g=groups.get('family');
      if(!want||!g) return;
      want.split(',').forEach(v=>{
        v=v.replace(/[^a-z]/g,'');
        if(g.btns.some(b=>b.dataset.value===v)) g.chosen.add(v);
      });
    })();
    paint();
    groups.forEach(g=>{ if(g.mode==='one') applyOne(g); });
  });

  /* A second, byte-identical copy of the PDP gallery + size block stood
     here — same window.pdpSwap assignment, same .sizes listeners, everything
     bound twice. Same disease as the twin shelf controllers, same cure. */
  /* The shelf controller that used to stand here was a second, older copy of
     the one above: same selector, same handlers, both bound. Every size tap
     and every scent tap ran twice, and settle() — which dims the grid, waits
     100ms, mutates and restores — ran twice with it, which is most of why the
     size control felt sluggish. Deleted, not merged: the one above is the
     live one and now reads its groups from the markup. */


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
     emitted since the checkout was rebuilt — /checkout carries the
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
    /* Below the collapse breakpoint the primary links are display:none and the
       phone menu is a separate panel — but a hidden link can still take focus
       programmatically, and that is exactly what the old burger handler did.
       The panel is desktop-only, so say so here as well as in the stylesheet. */
    const desk=matchMedia('(min-width:72em)');
    const set=v=>{
      if(v&&!desk.matches) return;
      /* while any overlay is up — search, drawer, sheet, menu — the reader
         is somewhere else, and hover must not summon the panel over it */
      if(v&&document.documentElement.classList.contains('overlay-open')) return;
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
    /* The panel belongs to The Fragrances alone. Reaching any other primary
       link, or the utilities — Search, Account, Bag — is a change of subject,
       and the panel was staying open under the pointer because the whole
       journey happens inside .nav, whose mouseleave never fires. */
    /* changing subject also dismisses a search the reader has not begun to
       use — hover opened it, hover moves on, it steps back. Anything typed
       keeps the panel: a drifting pointer must never cost a query. */
    const yieldSearch=()=>{
      const sq=document.getElementById('srchq');
      if(window.SSsearch && sq && !sq.value.trim()
         && document.getElementById('srch').classList.contains('open'))
        window.SSsearch.close();
    };
    [...links.querySelectorAll('a')].forEach(a=>{
      a.addEventListener('mouseenter',yieldSearch);
    });
    [...links.querySelectorAll('a:not([data-mega])')].forEach(a=>{
      a.addEventListener('mouseenter',wantClose);
      a.addEventListener('focus',()=>{ if(open) wantClose(); });
    });
    const util=nav.querySelector('.util');
    if(util){
      util.addEventListener('mouseenter',wantClose);
      util.addEventListener('focusin',()=>{ if(open) wantClose(); });
    }
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
