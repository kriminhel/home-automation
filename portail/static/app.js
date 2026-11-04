/* Portail tablette — JavaScript ES5 uniquement (Safari iOS 9) :
   pas de const/let, de fonctions fléchées, de fetch ni de template strings. */
(function () {
  'use strict';

  var ACCUEIL = { id: 'accueil', nom: 'Accueil', icone: '🏠', couleur: '#3949AB' };
  var CAMERAS = { id: 'cameras', nom: 'Caméras', icone: '📷', couleur: '#546E7A' };
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
    'septembre', 'octobre', 'novembre', 'décembre'];

  var maison = null;
  var etats = {};
  var vue = 'accueil';
  var tuiles = {};          // entity_id -> [éléments tuile] de la vue courante
  var noms = {};            // entity_id -> {nom, icone, piece}
  var minuteurMessage = null;
  var legendesCam = {};     // entity_id -> élément légende (vue Caméras)
  var imagesCam = [];       // [{img, eid}] à rafraîchir

  function $(id) { return document.getElementById(id); }

  function el(tag, classe, texte) {
    var e = document.createElement(tag);
    if (classe) { e.className = classe; }
    if (texte !== undefined) { e.appendChild(document.createTextNode(texte)); }
    return e;
  }

  function requete(methode, url, corps, ok, ko) {
    var x = new XMLHttpRequest();
    x.open(methode, url, true);
    x.timeout = 8000;
    x.setRequestHeader('Content-Type', 'application/json');
    x.onreadystatechange = function () {
      if (x.readyState !== 4) { return; }
      var r = null;
      try { r = JSON.parse(x.responseText); } catch (e) { r = null; }
      if (x.status >= 200 && x.status < 300) { ok(r); } else {
        ko((r && r.erreur) || (x.status ? 'Erreur ' + x.status : 'Serveur injoignable'));
      }
    };
    x.ontimeout = function () { ko('Le serveur ne répond pas'); };
    x.send(corps ? JSON.stringify(corps) : null);
  }

  function message(texte, info) {
    var m = $('message');
    m.textContent = texte;
    m.className = info ? 'info' : '';
    m.style.display = 'block';
    if (minuteurMessage) { clearTimeout(minuteurMessage); }
    minuteurMessage = setTimeout(function () { m.style.display = 'none'; }, 4000);
  }

  function deux(n) { return n < 10 ? '0' + n : '' + n; }

  function majHorloge() {
    var d = new Date();
    var h = deux(d.getHours()) + ':' + deux(d.getMinutes());
    $('horloge-mini').textContent = vue === 'accueil' ? '' : h;
    var grande = $('horloge');
    if (grande) {
      grande.textContent = h;
      var jour = JOURS[d.getDay()];
      $('date').textContent = jour.charAt(0).toUpperCase() + jour.slice(1) + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()];
    }
    var nuit = d.getHours() >= 20 || d.getHours() < 7;
    document.body.className = nuit ? 'nuit' : '';
  }

  /* ---------- état d'une entité ---------- */

  function domaine(eid) { return eid.split('.')[0]; }

  function estActif(eid) {
    var s = (etats[eid] || {}).state;
    return s === 'on' || s === 'open' || s === 'opening' || s === 'playing' || s === 'paused' || s === 'idle';
  }

  function libelleEtat(eid) {
    var e = etats[eid];
    if (!e) { return '…'; }
    var s = e.state;
    if (s === 'absent') { return 'pas encore intégré'; }
    if (s === 'unavailable' || s === 'unknown') { return 'injoignable'; }
    var d = domaine(eid);
    if (d === 'light' || d === 'switch') { return s === 'on' ? 'Allumé' : 'Éteint'; }
    if (d === 'cover') {
      if (e.current_position !== undefined) {
        if (e.current_position <= 0) { return 'Fermé'; }
        if (e.current_position >= 100) { return 'Ouvert'; }
        return 'Entrouvert';
      }
      return { open: 'Ouvert', closed: 'Fermé', opening: 'Ouverture…', closing: 'Fermeture…' }[s] || s;
    }
    if (d === 'media_player') { return s === 'off' ? 'Éteint' : (e.source || 'Allumé'); }
    return s;
  }

  function majTuile(t, eid) {
    var e = etats[eid];
    var s = e ? e.state : '';
    var classes = 'tuile ' + domaine(eid) + ' ' + s;
    if (s === 'unavailable' || s === 'unknown' || s === 'absent') { classes += ' indispo'; }
    if (estActif(eid)) { classes += ' on'; }
    t.className = classes;
    var etat = t.querySelector('.etat');
    if (etat) { etat.textContent = libelleEtat(eid); }
  }

  function majToutesTuiles() {
    var eid, i;
    for (eid in tuiles) {
      if (tuiles.hasOwnProperty(eid)) {
        for (i = 0; i < tuiles[eid].length; i++) { majTuile(tuiles[eid][i], eid); }
      }
    }
    if (vue === 'accueil') { majRecap(); }
    majPlan();
    for (eid in legendesCam) {
      if (legendesCam.hasOwnProperty(eid)) { legendesCam[eid].textContent = libelleMouvement(eid); }
    }
  }

  /* ---------- actions ---------- */

  function agir(corps, tuile) {
    if (tuile) { tuile.className += ' appui'; }
    requete('POST', '/api/action', corps, function () {
      setTimeout(lireEtats, 400);
      setTimeout(lireEtats, 1500);
    }, function (err) {
      message('Action impossible : ' + err);
      lireEtats();
    });
  }

  function basculer(eid, tuile) {
    var e = etats[eid];
    if (e && (e.state === 'unavailable' || e.state === 'absent')) {
      message(noms[eid].nom + ' : ' + libelleEtat(eid));
      return;
    }
    if (e && (domaine(eid) === 'light' || domaine(eid) === 'switch')) {
      e.state = e.state === 'on' ? 'off' : 'on';   // retour visuel immédiat
      majToutesTuiles();
    }
    agir({ entity_id: eid, action: domaine(eid) === 'scene' ? 'activer' : 'basculer' }, tuile);
  }

  /* ---------- construction des tuiles ---------- */

  function bouton(texte, fn) {
    var b = el('button', '', texte);
    b.addEventListener('click', function (ev) { ev.stopPropagation(); fn(); });
    return b;
  }

  function creerTuile(eq, sousTitre) {
    var eid = eq.entity_id;
    var d = domaine(eid);
    var t = el('div', 'tuile ' + d);
    t.appendChild(el('div', 'ico', eq.icone || '•'));
    var bas = el('div');
    bas.appendChild(el('div', 'nom', eq.nom));
    bas.appendChild(el('div', 'etat', sousTitre || ''));
    t.appendChild(bas);

    if (d === 'cover') {
      var bc = el('div', 'boutons');
      // Équipement sensible (garage) : confirmation avant d'ouvrir ou de fermer
      var ordre = function (action, verbe) {
        return function () {
          if (eq.confirmer && !window.confirm(verbe + ' : ' + eq.nom + ' ?')) { return; }
          agir({ entity_id: eid, action: action }, t);
        };
      };
      bc.appendChild(bouton('▲', ordre('ouvrir', 'Ouvrir')));
      bc.appendChild(bouton('■', function () { agir({ entity_id: eid, action: 'stop' }, t); }));
      bc.appendChild(bouton('▼', ordre('fermer', 'Fermer')));
      t.appendChild(bc);
    } else if (d === 'media_player') {
      var bm = el('div', 'boutons');
      bm.appendChild(bouton('🔉', function () { agir({ entity_id: eid, action: 'volume_moins' }, t); }));
      bm.appendChild(bouton('⏯', function () { agir({ entity_id: eid, action: 'lecture_pause' }, t); }));
      bm.appendChild(bouton('🔊', function () { agir({ entity_id: eid, action: 'volume_plus' }, t); }));
      t.appendChild(bm);
      t.addEventListener('click', function () { basculer(eid, t); });
    } else {
      t.addEventListener('click', function () { basculer(eid, t); });
    }
    if (d !== 'scene') {
      if (!tuiles[eid]) { tuiles[eid] = []; }
      tuiles[eid].push(t);
    }
    return t;
  }

  /* ---------- vues ---------- */

  function niveaux() {
    var l = [ACCUEIL].concat(maison.niveaux);
    if (maison.cameras && maison.cameras.length) { l.push(CAMERAS); }
    return l;
  }

  function dessinerOnglets() {
    var zone = $('onglets');
    zone.innerHTML = '';
    var liste = niveaux();
    for (var i = 0; i < liste.length; i++) {
      (function (n) {
        var o = el('div', 'onglet' + (n.id === vue ? ' actif' : ''));
        var ico = el('span', 'ico', n.icone);
        o.appendChild(ico);
        o.appendChild(document.createTextNode(n.nom));
        if (n.id === vue) { o.style.background = n.couleur; o.style.borderBottomColor = 'rgba(0,0,0,.25)'; }
        else { o.style.borderBottomColor = n.couleur; }
        o.addEventListener('click', function () { vue = n.id; dessiner(); });
        zone.appendChild(o);
      })(liste[i]);
    }
  }

  /* ---------- récapitulatif (Accueil) ---------- */

  var PIECES = [];          // [{id, nom, icone, niveau, eids}]
  var recap = null;         // éléments du récapitulatif à mettre à jour sur place

  function compter(filtre) {
    var n = 0;
    for (var eid in noms) {
      if (noms.hasOwnProperty(eid) && !noms[eid].groupe && filtre(eid)) { n++; }
    }
    return n;
  }

  function pluriel(n, mot) { return n + ' ' + mot + (n > 1 ? 's' : ''); }

  function resumeMaison() {
    var morceaux = [];
    var l = compter(function (e) { return domaine(e) === 'light' && estActif(e); });
    var m = compter(function (e) { return domaine(e) === 'media_player' && estActif(e); });
    if (l) { morceaux.push(pluriel(l, 'lumière') + ' ' + (l > 1 ? 'allumées' : 'allumée')); }
    if (m) { morceaux.push(pluriel(m, 'écran') + ' ' + (m > 1 ? 'allumés' : 'allumé')); }
    for (var eid in noms) {
      if (noms.hasOwnProperty(eid) && domaine(eid) === 'cover' && libelleEtat(eid) !== 'Fermé' &&
          etats[eid] && etats[eid].state !== 'unknown' && etats[eid].state !== 'unavailable') {
        morceaux.push(noms[eid].nom + ' ' + libelleEtat(eid).toLowerCase());
      }
    }
    return morceaux.length ? morceaux.join(' · ') : 'Tout est éteint et fermé.';
  }

  function resumePiece(p) { return resumeEntites(p.eids); }

  function resumeEntites(eids) {
    var l = 0, m = 0, autres = [];
    for (var i = 0; i < eids.length; i++) {
      var eid = eids[i];
      if (!noms[eid]) { continue; }
      if (noms[eid].groupe || !estActif(eid)) { continue; }
      if (domaine(eid) === 'light') { l++; } else if (domaine(eid) === 'media_player') { m++; } else {
        autres.push(noms[eid].nom + ' ' + libelleEtat(eid).toLowerCase());
      }
    }
    var t = [];
    if (l) { t.push(l > 1 ? l + ' lumières' : '1 lumière'); }
    if (m) { t.push(m > 1 ? m + ' écrans' : '1 écran'); }
    t = t.concat(autres);
    return { actif: t.length > 0, texte: t.length ? t.join(' · ') : 'Éteint' };
  }

  function cameraRecente() {
    var meilleur = null, date = null;
    for (var i = 0; i < (maison.cameras || []).length; i++) {
      var cam = maison.cameras[i];
      var d = lireDateIso((etats[cam.entity_id] || {}).state);
      if (d && (!date || d > date)) { date = d; meilleur = cam; }
    }
    return meilleur;
  }

  function debitInternet() {
    var e = etats[(maison.infos || {}).internet];
    if (!e || isNaN(parseFloat(e.state))) { return '—'; }
    var v = parseFloat(e.state);
    var u = e.unit_of_measurement || 'kB/s';
    var mbits = u === 'kB/s' ? v * 8 / 1000 : (u === 'MB/s' ? v * 8 : v);
    return '↓ ' + (mbits < 10 ? mbits.toFixed(1) : Math.round(mbits)).toString().replace('.', ',') + ' Mbit/s';
  }

  function soleil() {
    var e = etats[(maison.infos || {}).soleil];
    if (!e) { return null; }
    var leve = e.state === 'above_horizon';
    var d = lireDateIso(leve ? e.next_setting : e.next_rising);
    if (!d) { return null; }
    return { ico: leve ? '🌇' : '🌅', texte: (leve ? 'Coucher ' : 'Lever ') + deux(d.getHours()) + ':' + deux(d.getMinutes()) };
  }

  function allerA(niveauId, pieceId) {
    vue = niveauId;
    dessiner();
    var cible = pieceId ? $(pieceId) : null;
    if (cible) { window.scrollTo(0, cible.offsetTop - 100); }
  }

  function puce(ico, libelle, fn) {
    var c = el('div', 'puce');
    c.appendChild(el('span', 'ico', ico));
    var t = el('div', 'txt');
    var v = el('div', 'val', '…');
    t.appendChild(v);
    t.appendChild(el('div', 'lib', libelle));
    c.appendChild(t);
    if (fn) { c.addEventListener('click', fn); c.className += ' lien'; }
    return { el: c, val: v, ico: c.firstChild };
  }

  function pieceDe(eid) {
    for (var i = 0; i < PIECES.length; i++) {
      if (PIECES[i].eids.indexOf(eid) >= 0) { return PIECES[i]; }
    }
    return null;
  }

  function vueAccueil(c) {
    recap = { pieces: [] };
    var haut = el('div', 'heros');

    var bienvenue = el('div', 'carte bienvenue');
    recap.salut = el('div', 'salut');
    bienvenue.appendChild(recap.salut);
    var h = el('div', 'horloge'); h.id = 'horloge'; bienvenue.appendChild(h);
    var d = el('div', 'date'); d.id = 'date'; bienvenue.appendChild(d);
    recap.resume = el('div', 'resume');
    bienvenue.appendChild(recap.resume);
    haut.appendChild(bienvenue);

    if (maison.cameras && maison.cameras.length) {
      var cam = el('div', 'carte cam-heros');
      recap.camImg = el('img', '');
      cam.appendChild(recap.camImg);
      recap.camLeg = el('div', 'legende');
      cam.appendChild(recap.camLeg);
      cam.addEventListener('click', function () { vue = 'cameras'; dessiner(); });
      haut.appendChild(cam);
    }
    c.appendChild(haut);

    var puces = el('div', 'puces');
    recap.lumieres = puce('💡', 'Lumières');
    recap.ecrans = puce('📺', 'Écrans');
    puces.appendChild(recap.lumieres.el);
    puces.appendChild(recap.ecrans.el);
    recap.covers = [];
    for (var eid in noms) {
      if (noms.hasOwnProperty(eid) && domaine(eid) === 'cover') {
        (function (id) {
          var p = pieceDe(id);
          var pc = puce(noms[id].icone || '🚪', noms[id].nom, function () { allerA(p.niveau, p.id); });
          pc.eid = id;
          recap.covers.push(pc);
          puces.appendChild(pc.el);
        })(eid);
      }
    }
    if ((maison.infos || {}).internet) { recap.internet = puce('📶', 'Internet'); puces.appendChild(recap.internet.el); }
    if ((maison.infos || {}).soleil) { recap.soleil = puce('🌅', 'Soleil'); puces.appendChild(recap.soleil.el); }
    c.appendChild(puces);

    c.appendChild(el('h2', 'titre', 'Scènes'));
    var sc = el('div', 'scenes');
    for (var i = 0; i < maison.scenes.length; i++) {
      (function (scene) {
        var b = el('div', 'scene-btn');
        b.appendChild(el('span', 'ico', scene.icone));
        b.appendChild(document.createTextNode(scene.nom));
        b.addEventListener('click', function () {
          b.className = 'scene-btn appui';
          setTimeout(function () { b.className = 'scene-btn'; }, 600);
          agir({ entity_id: scene.entity_id, action: 'activer' });
          message('Scène « ' + scene.nom + ' »', true);
        });
        sc.appendChild(b);
      })(maison.scenes[i]);
    }
    c.appendChild(sc);

    c.appendChild(el('h2', 'titre', 'Pièces'));
    var grille = el('div', 'grille-pieces');
    for (i = 0; i < PIECES.length; i++) {
      (function (p) {
        var niv = niveauParId(p.niveau);
        var carte = el('div', 'carte-piece');
        var ico = el('div', 'rond', p.icone);
        carte.appendChild(ico);
        var t = el('div', 'txt');
        t.appendChild(el('div', 'nom', p.nom));
        var etat = el('div', 'etat', '…');
        t.appendChild(etat);
        carte.appendChild(t);
        var badge = el('div', 'badge', niv.nom);
        badge.style.color = niv.couleur;
        carte.appendChild(badge);
        carte.addEventListener('click', function () { allerA(p.niveau, p.id); });
        recap.pieces.push({ p: p, carte: carte, etat: etat });
        grille.appendChild(carte);
      })(PIECES[i]);
    }
    c.appendChild(grille);
  }

  function majRecap() {
    if (!recap) { return; }
    var heure = new Date().getHours();
    recap.salut.textContent = heure >= 18 || heure < 5 ? 'Bonsoir' : 'Bonjour';
    var resume = resumeMaison();
    recap.resume.textContent = resume;
    recap.resume.className = 'resume' + (resume.indexOf('Tout est') === 0 ? ' calme' : '');

    var l = compter(function (e) { return domaine(e) === 'light' && estActif(e); });
    var lt = compter(function (e) { return domaine(e) === 'light'; });
    recap.lumieres.val.textContent = l + ' / ' + lt;
    recap.lumieres.el.className = 'puce' + (l ? ' on' : '');
    var m = compter(function (e) { return domaine(e) === 'media_player' && estActif(e); });
    recap.ecrans.val.textContent = m ? pluriel(m, 'allumé') : 'Éteints';
    recap.ecrans.el.className = 'puce' + (m ? ' media' : '');
    for (var i = 0; i < recap.covers.length; i++) {
      var pc = recap.covers[i];
      var lib = libelleEtat(pc.eid);
      pc.val.textContent = lib;
      pc.el.className = 'puce lien' + (lib !== 'Fermé' && lib !== 'injoignable' && lib !== '…' ? ' alerte' : '');
    }
    if (recap.internet) { recap.internet.val.textContent = debitInternet(); }
    if (recap.soleil) {
      var so = soleil();
      recap.soleil.val.textContent = so ? so.texte : '—';
      if (so) { recap.soleil.ico.textContent = so.ico; }
    }

    if (recap.camImg) {
      var cam = cameraRecente() || maison.cameras[0];
      if (recap.camEid !== cam.entity_id) {
        recap.camEid = cam.entity_id;
        recap.camImg.src = urlImage(cam.entity_id);
        imagesCam = [{ img: recap.camImg, eid: cam.entity_id }];
      }
      recap.camLeg.textContent = cam.icone + ' ' + cam.nom + ' · ' + libelleMouvement(cam.entity_id);
    }

    for (i = 0; i < recap.pieces.length; i++) {
      var r = recap.pieces[i];
      var res = resumePiece(r.p);
      r.etat.textContent = res.texte;
      r.carte.className = 'carte-piece' + (res.actif ? ' on' : '');
    }
  }

  function niveauParId(id) {
    for (var i = 0; i < maison.niveaux.length; i++) {
      if (maison.niveaux[i].id === id) { return maison.niveaux[i]; }
    }
    return null;
  }

  /* ---------- plan de la maison (SVG) ---------- */

  var SVG = 'http://www.w3.org/2000/svg';
  var zonesPlan = [];       // [{g, p}] zones liées à une pièce, mises à jour sur place

  function svg(tag, attrs) {
    var e = document.createElementNS(SVG, tag);
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) { e.setAttribute(k, attrs[k]); } }
    return e;
  }

  function pieceParNom(niveauId, nom) {
    for (var i = 0; i < PIECES.length; i++) {
      if (PIECES[i].niveau === niveauId && PIECES[i].nom === nom) { return PIECES[i]; }
    }
    return null;
  }

  function cameraParId(eid) {
    for (var i = 0; i < (maison.cameras || []).length; i++) {
      if (maison.cameras[i].entity_id === eid) { return maison.cameras[i]; }
    }
    return null;
  }

  function dessinerPlan(niveau) {
    var plan = niveau.plan;
    var marge = 12;
    var racine = svg('svg', {
      viewBox: (-marge) + ' ' + (-marge) + ' ' + (plan.largeur + 2 * marge) + ' ' + (plan.hauteur + 2 * marge),
      width: '100%', 'class': 'plan-svg'
    });
    var defs = svg('defs', {});
    var grad = svg('radialGradient', { id: 'lueur-' + niveau.id, cx: '50%', cy: '50%', r: '70%' });
    grad.appendChild(svg('stop', { offset: '0%', 'stop-color': '#FFC56B', 'stop-opacity': '0.75' }));
    grad.appendChild(svg('stop', { offset: '100%', 'stop-color': '#FF9F2E', 'stop-opacity': '0.12' }));
    defs.appendChild(grad);
    racine.appendChild(defs);

    var textes = svg('g', {});   // les libellés passent au-dessus de tous les murs
    for (var i = 0; i < plan.zones.length; i++) {
      (function (z) {
        var p = z.piece ? pieceParNom(niveau.id, z.piece) : null;
        var g = svg('g', { 'class': 'zone ' + (z.type || 'piece') });
        var cx = 0, cy = 0, aire = 0, largeur = 0, j;
        var rects = z.rects || [];
        for (j = 0; j < rects.length; j++) {
          var r = rects[j];
          g.appendChild(svg('rect', { x: r[0], y: r[1], width: r[2], height: r[3], rx: 6 }));
          var a = r[2] * r[3];
          if (a > aire) { aire = a; largeur = r[2]; cx = r[0] + r[2] / 2; cy = r[1] + r[3] / 2; }
        }
        if (z.poly) {
          var pts = [];
          for (j = 0; j < z.poly.length; j++) { pts.push(z.poly[j][0] + ',' + z.poly[j][1]); }
          g.appendChild(svg('polygon', { points: pts.join(' ') }));
          aire = 100000; largeur = 1000;
        }
        if (z.label) { cx = z.label[0]; cy = z.label[1]; }
        racine.appendChild(g);
        var t = svg('g', { 'class': 'etiquette ' + (z.type || 'piece') });
        var petit = aire < 9000 || largeur < 70;
        var nom = svg('text', { x: cx, y: cy - (p && !petit ? 4 : -6), 'text-anchor': 'middle', 'class': 'nom' + (petit ? ' petit' : '') });
        nom.appendChild(document.createTextNode(z.nom || z.piece));
        t.appendChild(nom);
        var etat = null;
        if (p && !petit) {
          etat = svg('text', { x: cx, y: cy + 22, 'text-anchor': 'middle', 'class': 'etat' });
          etat.appendChild(document.createTextNode(''));
          t.appendChild(etat);
        }
        textes.appendChild(t);
        if (p) {
          var ouvrir = function () { ouvrirPiece(p); };
          g.addEventListener('click', ouvrir);
          t.addEventListener('click', ouvrir);
          zonesPlan.push({ g: g, p: p, eids: z.entites || p.eids, etat: etat, niveau: niveau.id, type: z.type || 'piece' });
        }
      })(plan.zones[i]);
    }
    racine.appendChild(textes);

    var cams = plan.cameras || [];
    for (i = 0; i < cams.length; i++) {
      (function (mc) {
        var cam = cameraParId(mc.entity_id);
        if (!cam) { return; }
        var g = svg('g', { 'class': 'repere-cam' });
        g.appendChild(svg('circle', { cx: mc.pos[0], cy: mc.pos[1], r: 22 }));
        var ic = svg('text', { x: mc.pos[0], y: mc.pos[1] + 8, 'text-anchor': 'middle' });
        ic.appendChild(document.createTextNode('📷'));
        g.appendChild(ic);
        g.addEventListener('click', function () { pleinEcran(cam); });
        racine.appendChild(g);
      })(cams[i]);
    }

    var cadre = el('div', 'carte plan');
    cadre.appendChild(racine);
    cadre.appendChild(el('div', 'aide', 'Toucher une pièce pour la piloter · les pièces allumées brillent'));
    return cadre;
  }

  function majPlan() {
    for (var i = 0; i < zonesPlan.length; i++) {
      var z = zonesPlan[i];
      var res = resumeEntites(z.eids);
      z.g.setAttribute('class', 'zone ' + z.type + (res.actif ? ' on' : ''));
      if (res.actif) { z.g.style.fill = 'url(#lueur-' + z.niveau + ')'; } else { z.g.style.fill = ''; }
      if (z.etat) { z.etat.textContent = res.actif ? res.texte : ''; }
    }
  }

  /* ---------- fenêtre d'une pièce ---------- */

  function fermerPiece() {
    var f = $('feuille');
    if (!f) { return; }
    document.body.removeChild(f);
    for (var eid in tuiles) {
      if (tuiles.hasOwnProperty(eid)) {
        tuiles[eid] = tuiles[eid].filter(function (t) { return !f.contains(t); });
      }
    }
  }

  function ouvrirPiece(p) {
    fermerPiece();
    var fond = el('div', '');
    fond.id = 'feuille';
    var panneau = el('div', 'panneau');
    var tete = el('div', 'tete');
    tete.appendChild(el('h1', '', p.icone + ' ' + p.nom));
    var fermer = el('button', 'fermer', '✕');
    fermer.addEventListener('click', fermerPiece);
    tete.appendChild(fermer);
    panneau.appendChild(tete);
    var ts = el('div', 'tuiles');
    var niv = niveauParId(p.niveau);
    for (var i = 0; i < p.eids.length; i++) {
      var eid = p.eids[i];
      var t = creerTuile({ entity_id: eid, nom: noms[eid].nom, icone: noms[eid].icone, confirmer: noms[eid].confirmer });
      t.style.borderLeftColor = niv.couleur;
      majTuile(t, eid);
      ts.appendChild(t);
    }
    panneau.appendChild(ts);
    panneau.addEventListener('click', function (ev) { ev.stopPropagation(); });
    fond.addEventListener('click', fermerPiece);
    fond.appendChild(panneau);
    document.body.appendChild(fond);
  }

  function vueNiveau(c, niveau) {
    var ent = el('div', 'entete');
    ent.style.background = niveau.couleur;
    ent.appendChild(el('h1', '', niveau.icone + ' ' + niveau.nom));
    var aVolets = false, i, j;
    for (i = 0; i < niveau.pieces.length; i++) {
      for (j = 0; j < niveau.pieces[i].equipements.length; j++) {
        var eqv = niveau.pieces[i].equipements[j];
        if (domaine(eqv.entity_id) === 'cover' && !eqv.confirmer) { aVolets = true; }
      }
    }
    var actions = [['💡 Tout éteindre', 'tout_eteindre', 'Extinction']];
    if (aVolets) {
      actions.push(['▲ Ouvrir volets', 'tout_ouvrir', 'Ouverture des volets'],
        ['▼ Fermer volets', 'tout_fermer', 'Fermeture des volets']);
    }
    for (i = 0; i < actions.length; i++) {
      (function (a) {
        var b = el('button', 'rapide', a[0]);
        b.addEventListener('click', function () { agir({ niveau: niveau.id, action: a[1] }); message(a[2] + '…', true); });
        ent.appendChild(b);
      })(actions[i]);
    }
    c.appendChild(ent);
    if (niveau.plan) {
      c.appendChild(dessinerPlan(niveau));
      c.appendChild(el('h2', 'titre', 'Toutes les commandes'));
    }

    for (i = 0; i < niveau.pieces.length; i++) {
      var p = niveau.pieces[i];
      var bloc = el('div', 'piece');
      bloc.id = 'piece-' + niveau.id + '-' + i;
      bloc.appendChild(el('h2', '', (p.icone ? p.icone + ' ' : '') + p.nom));
      var ts = el('div', 'tuiles');
      for (j = 0; j < p.equipements.length; j++) {
        var t = creerTuile(p.equipements[j]);
        t.style.borderLeftColor = niveau.couleur;
        ts.appendChild(t);
      }
      bloc.appendChild(ts);
      c.appendChild(bloc);
    }
  }

  /* ---------- caméras : dernière image de mouvement (cloud EZVIZ) ---------- */

  // Date ISO de Home Assistant -> Date (Safari iOS 9 ne lit pas les microsecondes)
  function lireDateIso(s) {
    var m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d+)?(Z|([+-])(\d\d):(\d\d))?$/.exec(s || '');
    if (!m) { return null; }
    if (!m[7]) { return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]); }  // heure locale (EZVIZ)
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    if (m[8]) { t -= (m[8] === '-' ? -1 : 1) * (+m[9] * 60 + +m[10]) * 60000; }
    return new Date(t);
  }

  function libelleMouvement(eid) {
    var e = etats[eid];
    if (!e) { return '…'; }
    var d = lireDateIso(e.state);
    if (!d) { return 'Pas encore de mouvement'; }
    var h = deux(d.getHours()) + ':' + deux(d.getMinutes());
    var auj = new Date();
    var hier = new Date(auj.getTime() - 86400000);
    if (d.toDateString() === auj.toDateString()) { return 'Mouvement à ' + h; }
    if (d.toDateString() === hier.toDateString()) { return 'Mouvement hier à ' + h; }
    return 'Mouvement le ' + d.getDate() + ' ' + MOIS[d.getMonth()] + ' à ' + h;
  }

  function urlImage(eid) { return '/api/image/' + eid + '?t=' + new Date().getTime(); }

  function rafraichirImages() {
    for (var i = 0; i < imagesCam.length; i++) { imagesCam[i].img.src = urlImage(imagesCam[i].eid); }
  }

  function pleinEcran(cam) {
    var fond = el('div', '');
    fond.id = 'plein';
    var img = el('img', '');
    img.src = urlImage(cam.entity_id);
    fond.appendChild(img);
    var leg = el('div', 'legende', cam.nom + ' — ' + libelleMouvement(cam.entity_id) + ' · toucher pour fermer');
    fond.appendChild(leg);
    imagesCam.push({ img: img, eid: cam.entity_id });
    fond.addEventListener('click', function () {
      document.body.removeChild(fond);
      imagesCam.pop();
    });
    document.body.appendChild(fond);
  }

  function vueCameras(c) {
    var ent = el('div', 'entete');
    ent.style.background = CAMERAS.couleur;
    ent.appendChild(el('h1', '', CAMERAS.icone + ' Caméras'));
    c.appendChild(ent);
    c.appendChild(el('div', 'vide', 'Dernière image prise lors d’un mouvement. Toucher une image pour l’agrandir.'));
    var zone = el('div', 'tuiles');
    for (var i = 0; i < maison.cameras.length; i++) {
      (function (cam) {
        var bloc = el('div', 'camera');
        var img = el('img', '');
        img.src = urlImage(cam.entity_id);
        bloc.appendChild(img);
        bloc.appendChild(el('div', 'nom', cam.icone + ' ' + cam.nom));
        var leg = el('div', 'etat', libelleMouvement(cam.entity_id));
        bloc.appendChild(leg);
        legendesCam[cam.entity_id] = leg;
        imagesCam.push({ img: img, eid: cam.entity_id });
        bloc.addEventListener('click', function () { pleinEcran(cam); });
        zone.appendChild(bloc);
      })(maison.cameras[i]);
    }
    c.appendChild(zone);
  }

  function dessiner() {
    tuiles = {};
    legendesCam = {};
    imagesCam = [];
    zonesPlan = [];
    fermerPiece();
    var plein = $('plein');
    if (plein) { document.body.removeChild(plein); }
    dessinerOnglets();
    var c = $('contenu');
    c.innerHTML = '';
    recap = null;
    if (vue === 'accueil') { vueAccueil(c); } else if (vue === 'cameras') { vueCameras(c); } else {
      for (var i = 0; i < maison.niveaux.length; i++) {
        if (maison.niveaux[i].id === vue) { vueNiveau(c, maison.niveaux[i]); }
      }
    }
    majHorloge();
    majToutesTuiles();
    window.scrollTo(0, 0);
  }

  /* ---------- boucle de mise à jour ---------- */

  var enCours = false;
  function lireEtats() {
    if (enCours) { return; }
    enCours = true;
    requete('GET', '/api/etats', null, function (r) {
      enCours = false;
      etats = r || {};
      $('liaison').className = 'ok';
      majToutesTuiles();
    }, function (err) {
      enCours = false;
      $('liaison').className = 'ko';
      if (err.indexOf('HA_TOKEN') >= 0) { message(err); }
    });
  }

  function demarrer() {
    requete('GET', '/api/maison', null, function (m) {
      maison = m;
      for (var i = 0; i < m.niveaux.length; i++) {
        for (var j = 0; j < m.niveaux[i].pieces.length; j++) {
          var p = m.niveaux[i].pieces[j];
          for (var k = 0; k < p.equipements.length; k++) {
            var eq = p.equipements[k];
            noms[eq.entity_id] = { nom: eq.nom, icone: eq.icone, piece: p.nom, confirmer: !!eq.confirmer,
              groupe: !!eq.groupe };
          }
          PIECES.push({ id: 'piece-' + m.niveaux[i].id + '-' + j, nom: p.nom, icone: p.icone || '•',
            niveau: m.niveaux[i].id, eids: p.equipements.map(function (e) { return e.entity_id; }) });
        }
      }
      var ancre = (window.location.hash || '').replace('#', '');  // lien direct : /#rdc, /#cameras…
      if (ancre === 'cameras' || niveauParId(ancre)) { vue = ancre; }
      dessiner();
      lireEtats();
      setInterval(lireEtats, 2000);
      setInterval(majHorloge, 10000);
      setInterval(rafraichirImages, 30000);
    }, function (err) {
      $('contenu').innerHTML = '';
      $('contenu').appendChild(el('p', 'attente', 'Serveur injoignable (' + err + '). Nouvel essai…'));
      setTimeout(demarrer, 5000);
    });
  }

  // Revenir à l'accueil après 2 minutes sans toucher l'écran
  var inactivite = null;
  function reveil() {
    if (inactivite) { clearTimeout(inactivite); }
    inactivite = setTimeout(function () { if (vue !== 'accueil') { vue = 'accueil'; dessiner(); } }, 120000);
  }
  document.addEventListener('touchstart', reveil, false);
  document.addEventListener('click', reveil, false);

  demarrer();
  reveil();
})();
