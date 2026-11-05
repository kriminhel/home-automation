/* Portail tablette — JavaScript ES5 uniquement (Safari iOS 9) :
   pas de const/let, de fonctions fléchées, de fetch ni de template strings. */
(function () {
  'use strict';

  var ACCUEIL = { id: 'accueil', nom: 'Accueil', svg: 'navMaison' };
  var CAMERAS = { id: 'cameras', nom: 'Caméras', svg: 'navCamera' };
  var MAISON3D = { id: 'maison3d', nom: '3D', svg: 'cube' };
  var PROFILS = { id: 'profils', nom: 'Famille', svg: 'navFamille' };
  var SVG_NIVEAU = { rdc: 'navCanape', etage: 'navEtage' };

  // Pictogrammes au trait (24 × 24, couleur du texte)
  var PICTOS = {
    // pictogrammes de navigation : formes arrondies, deux tons
    navMaison: '<path fill="currentColor" opacity=".35" stroke="none" d="M4.5 10.8 12 4.8l7.5 6V19a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z"/><path d="M3 11.5 12 4l9 7.5"/><rect x="9.6" y="13.6" width="4.8" height="7.4" rx="2.4" fill="currentColor" stroke="none"/>',
    navCanape: '<rect x="5" y="5.5" width="14" height="8" rx="3.2" fill="currentColor" opacity=".35" stroke="none"/><rect x="2.5" y="10" width="19" height="7.5" rx="3.6" fill="currentColor" stroke="none"/><path d="M6 17.5v2M18 17.5v2"/>',
    navEtage: '<path fill="currentColor" opacity=".35" stroke="none" d="M4 20.5h16.5V5h-3a1.5 1.5 0 0 0-1.5 1.5V10h-3a1.5 1.5 0 0 0-1.5 1.5V15H8a1.5 1.5 0 0 0-1.5 1.5v4z"/><path d="M3 20.5h4.5v-4.5H12v-4.5h4.5V7H21"/>',
    navCamera: '<rect x="2.5" y="6.5" width="13" height="11" rx="3.6" fill="currentColor" opacity=".35" stroke="none"/><rect x="2.5" y="6.5" width="13" height="11" rx="3.6"/><path d="M15.5 10.4 21 8v8l-5.5-2.4z" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="2.3" fill="currentColor" stroke="none"/>',
    navFamille: '<circle cx="9" cy="8" r="3.6" fill="currentColor" stroke="none"/><path d="M2.5 20.5a6.5 6.5 0 0 1 13 0z" fill="currentColor" opacity=".4" stroke="none"/><circle cx="17.6" cy="9.4" r="2.6" fill="currentColor" opacity=".7" stroke="none"/><path d="M16 14.6a5 5 0 0 1 5.6 5.9"/>',
    navSoleil: '<circle cx="12" cy="12" r="4.6" fill="currentColor" stroke="none"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    agenda: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="8.5" cy="14.5" r="1.2" fill="currentColor" stroke="none"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    maison: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    cube: '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>',
    canape: '<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 12a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3z"/><path d="M5 17v2M19 17v2"/>',
    escalier: '<path d="M3 20h5v-4h4v-4h4V8h5"/>',
    camera: '<rect x="3" y="7" width="12" height="10" rx="2"/><path d="m15 11 6-3v8l-6-3"/>',
    famille: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17.5" cy="9" r="2.4"/><path d="M16 14.6a4.8 4.8 0 0 1 5.5 4.9"/>',
    wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.8 16a5 5 0 0 1 6.4 0"/><circle cx="12" cy="19.3" r="0.9"/>',
    marche: '<path d="M12 3.5v8"/><path d="M6.5 6.8a7.5 7.5 0 1 0 11 0"/>',
    ampoule: '<path d="M9 17h6M10 20.5h4"/><path d="M8.5 14.5a6 6 0 1 1 7 0c-.7.6-1 1.4-1 2.5h-5c0-1.1-.3-1.9-1-2.5z"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
    garage: '<path d="M3 20V9l9-5 9 5v11"/><path d="M7 20v-8h10v8M7 15h10M7 17.5h10"/>',
    lit: '<path d="M3 18V7M3 13h18v5M21 18v-3a3 3 0 0 0-3-3h-7v1"/><circle cx="7" cy="10.5" r="1.6"/>',
    table: '<path d="M3 9h18M6 9v10M18 9v10M8 13h8"/>',
    cuisine: '<path d="M4 10h16v10H4z"/><path d="M4 14h16M8 6v2M12 5v3M16 6v2"/>',
    bain: '<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2"/>',
    porte: '<path d="M6 21V4h10v17M4 21h16"/><circle cx="13" cy="12.5" r=".9"/>',
    arbre: '<path d="M12 21v-6"/><path d="M12 3a5 5 0 0 1 4.6 7A4 4 0 0 1 15 17H9a4 4 0 0 1-1.6-7A5 5 0 0 1 12 3z"/>',
    manette: '<path d="M6 8h12a4 4 0 0 1 3.9 4.8l-.7 3.5a2.5 2.5 0 0 1-4.3 1.2L15 15H9l-1.9 2.5a2.5 2.5 0 0 1-4.3-1.2l-.7-3.5A4 4 0 0 1 6 8z"/><path d="M7.5 11v3M6 12.5h3"/>',
    telephone: '<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>',
    fleche: '<path d="m9 6 6 6-6 6"/>',
    soleil: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    lune: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    nuage: '<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4.3 4.3 0 0 1-.5 8.5z"/>',
    eclaircie: '<path d="M8.5 6.5A3.8 3.8 0 0 1 15 8"/><path d="M5 4.5 6 5.5M9 2v1.5M2 9h1.5"/><path d="M8 20a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6.6A3.8 3.8 0 0 1 17.5 20z"/>',
    pluie: '<path d="M7 15a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 6.5a4.3 4.3 0 0 1-.5 8.5z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
    neige: '<path d="M7 15a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 6.5a4.3 4.3 0 0 1-.5 8.5z"/><path d="M8 19h.01M12 20h.01M16 19h.01"/>',
    orage: '<path d="M7 15a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 6.5a4.3 4.3 0 0 1-.5 8.5z"/><path d="m13 14-3 4h4l-3 4"/>',
    vent: '<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h8"/>'
  };
  function picto(nom, classe) {
    var s = el('span', 'picto' + (classe ? ' ' + classe : ''));
    s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      (PICTOS[nom] || PICTOS.maison) + '</svg>';
    return s;
  }
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
    var jour = JOURS[d.getDay()];
    $('ligne-date').textContent = h + '  •  ' + d.getDate() + ' ' + MOIS[d.getMonth()] + '  •  ' + jour;
    var grande = $('horloge');
    if (grande) {
      grande.textContent = h;
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
    majRecap();
    majPlan();
    if (vue3d) { vue3d.maj(); }
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
    if (maison.habitants && maison.habitants.length) { l.push(PROFILS); }
    return l;
  }

  function dessinerOnglets() {
    var zone = $('nav');
    zone.innerHTML = '';
    var logo = el('div', 'logo meteo-nav');
    logo.id = 'meteo-nav';
    logo.addEventListener('click', function () { vue = 'accueil'; dessiner(); });
    zone.appendChild(logo);
    majMeteoHaut();
    var liste = niveaux();
    for (var i = 0; i < liste.length; i++) {
      (function (n) {
        var o = el('div', 'nav-item' + (n.id === vue ? ' actif' : ''));
        o.setAttribute('title', n.nom);
        if (n.id === vue) { o.appendChild(el('span', 'creux haut')); o.appendChild(el('span', 'creux bas')); o.appendChild(el('span', 'onglet-actif')); }
        var rond = el('div', 'rond');
        rond.appendChild(picto(n.svg || SVG_NIVEAU[n.id] || 'cube'));
        o.appendChild(rond);
        o.addEventListener('click', function () { vue = n.id; dessiner(); });
        zone.appendChild(o);
      })(liste[i]);
    }
    var tamis = el('div', 'nav-item bas');
    var rt = el('div', 'rond');
    rt.appendChild(picto('navSoleil'));
    tamis.appendChild(rt);
    tamis.addEventListener('click', function () {
      tamise = !tamise;
      document.documentElement.className = (window.PORTAIL_LEGER ? 'leger ' : '') + (tamise ? 'tamise' : '');
    });
    zone.appendChild(tamis);
  }
  var tamise = false;

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

  /* Météo (Home Assistant / met.no) */
  var METEO = {
    'clear-night': ['Nuit claire', 'lune'], cloudy: ['Couvert', 'nuage'], fog: ['Brouillard', 'nuage'],
    hail: ['Grêle', 'pluie'], lightning: ['Orage', 'orage'], 'lightning-rainy': ['Orage', 'orage'],
    partlycloudy: ['Éclaircies', 'eclaircie'], pouring: ['Averses', 'pluie'], rainy: ['Pluie', 'pluie'],
    snowy: ['Neige', 'neige'], 'snowy-rainy': ['Neige fondue', 'neige'], sunny: ['Ensoleillé', 'soleil'],
    windy: ['Venteux', 'vent'], 'windy-variant': ['Venteux', 'vent'], exceptional: ['Exceptionnel', 'nuage']
  };
  function meteo() {
    var e = etats[(maison.infos || {}).meteo];
    if (!e || !METEO[e.state]) { return null; }
    var t = parseFloat(e.temperature);
    return { texte: METEO[e.state][0], picto: METEO[e.state][1], temp: isNaN(t) ? '' : Math.round(t) + '°', humidite: e.humidity };
  }

  /* Courbes (lumières allumées, débit internet) : un point toutes les 30 s, 40 points */
  var historique = { lumieres: [], internet: [] }, dernierPoint = 0;
  function echantillonner() {
    var t = new Date().getTime();
    if (historique.lumieres.length && t - dernierPoint < 30000) { return; }
    if (!etats[(maison.infos || {}).internet]) { return; }   // états pas encore reçus
    dernierPoint = t;
    historique.lumieres.push(compter(function (e) { return domaine(e) === 'light' && estActif(e); }));
    var e = etats[(maison.infos || {}).internet];
    historique.internet.push(e && !isNaN(parseFloat(e.state)) ? parseFloat(e.state) * 8 / 1000 : 0);
    if (historique.lumieres.length > 40) { historique.lumieres.shift(); historique.internet.shift(); }
  }
  function courbe(valeurs) {
    var v = valeurs.length > 1 ? valeurs : [valeurs[0] || 0, valeurs[0] || 0];
    var max = Math.max.apply(null, v.concat([1])) * 1.15, pts = [];
    for (var i = 0; i < v.length; i++) { pts.push((i * 300 / (v.length - 1)).toFixed(1) + ',' + (88 - v[i] / max * 78).toFixed(1)); }
    var dernier = pts[pts.length - 1].split(',');
    return '<svg viewBox="0 0 300 90" preserveAspectRatio="none"><defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#C9A45C" stop-opacity=".45"/><stop offset="1" stop-color="#C9A45C" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="M0,90 L' + pts.join(' L') + ' L300,90 Z" fill="url(#dg)"/>' +
      '<path d="M' + pts.join(' L') + '" fill="none" stroke="#D9B66E" stroke-width="2.5" vector-effect="non-scaling-stroke"/>' +
      '<circle cx="' + dernier[0] + '" cy="' + dernier[1] + '" r="5" fill="#141416" stroke="#E6C67E" stroke-width="2.5"/></svg>';
  }

  /* Illustration de repli : maison contemporaine à toit terrasse, de nuit (noir et or) */
  var ILLUSTRATION = '<svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice" class="illu">' +
    '<defs><linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1220"/><stop offset=".7" stop-color="#1A2233"/><stop offset="1" stop-color="#2A2A2E"/></linearGradient>' +
    '<linearGradient id="vitre" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3D9A0"/><stop offset="1" stop-color="#B98A45"/></linearGradient>' +
    '<radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#E9C27A" stop-opacity=".55"/><stop offset="1" stop-color="#E9C27A" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="eau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A3328"/><stop offset="1" stop-color="#121214"/></linearGradient></defs>' +
    '<rect width="600" height="420" fill="url(#ciel)"/>' +
    '<circle cx="500" cy="70" r="16" fill="#E9E1CC" opacity=".85"/>' +
    '<path d="M0 300 C60 250 90 270 120 240 C150 210 170 260 210 250 L210 330 L0 330Z" fill="#0E1712"/>' +
    '<path d="M470 330 C480 230 520 220 560 200 C600 190 600 260 600 330Z" fill="#0E1712"/>' +
    '<ellipse cx="300" cy="250" rx="260" ry="90" fill="url(#halo)"/>' +
    '<rect x="150" y="196" width="330" height="124" fill="#2B2A2C"/>' +
    '<rect x="140" y="188" width="350" height="10" fill="#E8E2D6"/>' +
    '<rect x="230" y="110" width="230" height="78" fill="#323134"/>' +
    '<rect x="220" y="102" width="252" height="10" fill="#E8E2D6"/>' +
    '<rect x="246" y="124" width="92" height="56" fill="url(#vitre)"/><rect x="350" y="124" width="92" height="56" fill="url(#vitre)" opacity=".85"/>' +
    '<path d="M292 124v56M396 124v56" stroke="#1B1B1D" stroke-width="3"/>' +
    '<rect x="168" y="214" width="120" height="96" fill="url(#vitre)"/><rect x="300" y="214" width="60" height="96" fill="#5C4A33"/>' +
    '<rect x="372" y="230" width="92" height="56" fill="url(#vitre)" opacity=".9"/>' +
    '<path d="M208 214v96M248 214v96M418 230v56" stroke="#1B1B1D" stroke-width="3"/>' +
    '<rect x="150" y="306" width="330" height="4" fill="#E9C27A" opacity=".8"/>' +
    '<rect x="0" y="320" width="600" height="100" fill="url(#eau)"/>' +
    '<path d="M168 330h120M372 330h92" stroke="#E9C27A" stroke-width="2" opacity=".35"/>' +
    '<path d="M60 330v-50M90 330v-30M520 330v-40" stroke="#E9C27A" stroke-width="2" opacity=".5"/>' +
    '</svg>';

  var PICTO_PIECE = [[/salon/i, 'canape'], [/manger/i, 'table'], [/cuisine/i, 'cuisine'], [/bain|wc/i, 'bain'],
    [/garage|buanderie/i, 'garage'], [/entr/i, 'porte'], [/ext/i, 'arbre'], [/jeux/i, 'manette'], [/chambre|parentale/i, 'lit']];
  function pictoPiece(nom) {
    for (var i = 0; i < PICTO_PIECE.length; i++) { if (PICTO_PIECE[i][0].test(nom)) { return PICTO_PIECE[i][1]; } }
    return 'maison';
  }

  function lumieresDe(eids) {
    var l = [];
    for (var i = 0; i < eids.length; i++) {
      if (domaine(eids[i]) === 'light' && noms[eids[i]] && !noms[eids[i]].groupe) { l.push(eids[i]); }
    }
    return l;
  }

  // Bouton marche / arrêt d'une pièce : éteint toutes ses lumières, ou allume la première
  function marchePiece(p) {
    var l = lumieresDe(p.eids), allumees = [], i;
    for (i = 0; i < l.length; i++) { if (estActif(l[i])) { allumees.push(l[i]); } }
    if (!l.length) { message(p.nom + ' : aucune lumière pilotable', true); return; }
    var cibles = allumees.length ? allumees : [l[0]];
    for (i = 0; i < cibles.length; i++) {
      if (etats[cibles[i]]) { etats[cibles[i]].state = allumees.length ? 'off' : 'on'; }
      agir({ entity_id: cibles[i], action: allumees.length ? 'eteindre' : 'allumer' });
    }
    majToutesTuiles();
  }

  function wifiPiece(p) {
    message('Wi-Fi « ' + p.nom + ' » : bientôt disponible (autorisation Freebox à faire)', true);
  }

  function avatar(h, grand) {
    var a = el('div', 'avatar' + (grand ? ' grand' : ''));
    if (h.avatar) { a.style.backgroundImage = 'url(/static/' + h.avatar + ')'; a.className += ' photo'; } else { a.textContent = h.nom.charAt(0); }
    return a;
  }

  function boutonRond(nomPicto, classe, fn) {
    var b = el('div', 'bouton-rond ' + (classe || ''));
    b.appendChild(picto(nomPicto));
    b.addEventListener('click', function (ev) { ev.stopPropagation(); fn(); });
    return b;
  }

  function piecesDe(h) {
    var res = [];
    for (var i = 0; i < PIECES.length; i++) { if ((h.pieces || []).indexOf(PIECES[i].nom) >= 0) { res.push(PIECES[i]); } }
    return res;
  }
  function eidsDe(h) {
    var p = piecesDe(h), e = [];
    for (var i = 0; i < p.length; i++) { e = e.concat(p[i].eids); }
    return e;
  }
  function nomsPieces(h) {
    var p = piecesDe(h), n = [];
    for (var i = 0; i < p.length; i++) { n.push(p[i].nom); }
    return n.join(', ');
  }

  function carteStat(titre, nomPicto) {
    var c = el('div', 'carte stat');
    var t = el('div', 'stat-titre');
    t.appendChild(picto(nomPicto, 'or'));
    t.appendChild(el('span', '', titre));
    c.appendChild(t);
    var v = el('div', 'stat-val');
    c.appendChild(v);
    var g = el('div', 'stat-courbe');
    c.appendChild(g);
    return { el: c, val: v, courbe: g };
  }

  function vueAccueil(c) {
    recap = { pieces: [], profils: [] };
    var haut = el('div', 'acc');

    // Héros : maison, lieu, heure, météo
    var heros = el('div', 'carte acc-heros');
    var fond = el('div', 'heros-fond');
    if (maison.photo) { fond.style.backgroundImage = 'url(/static/photos/' + maison.photo + ')'; } else { fond.innerHTML = ILLUSTRATION; }
    heros.appendChild(fond);
    var bas = el('div', 'heros-bas');
    bas.appendChild(el('div', 'lieu', maison.lieu || 'Maison'));
    var h = el('div', 'horloge'); h.id = 'horloge'; bas.appendChild(h);
    var d = el('div', 'date'); d.id = 'date'; bas.appendChild(d);
    recap.meteo = el('div', 'meteo');
    bas.appendChild(recap.meteo);
    var chips = el('div', 'chips');
    recap.chipLum = el('div', 'chip'); recap.chipEcr = el('div', 'chip'); recap.chipGar = el('div', 'chip');
    chips.appendChild(recap.chipLum); chips.appendChild(recap.chipEcr); chips.appendChild(recap.chipGar);
    bas.appendChild(chips);
    heros.appendChild(bas);
    heros.addEventListener('click', function () { if (maison.niveaux.length) { vue = maison.niveaux[0].id; dessiner(); } });
    haut.appendChild(heros);

    var droite = el('div', 'acc-droite');
    var i;
    if (maison.agendas && maison.agendas.length) {
      var ag = el('div', 'carte agenda');
      var ta = el('div', 'carte-tete');
      var h3 = el('h3', '');
      h3.appendChild(picto('agenda', 'or'));
      h3.appendChild(el('span', '', 'Agenda'));
      ta.appendChild(h3);
      var ajout = el('span', 'lien ajout');
      ajout.appendChild(picto('plus'));
      ajout.appendChild(el('span', '', 'Ajouter'));
      ajout.addEventListener('click', formulaireEvenement);
      ta.appendChild(ajout);
      ag.appendChild(ta);
      recap.agenda = el('div', 'evenements');
      ag.appendChild(recap.agenda);
      droite.appendChild(ag);
      afficherAgenda();
      chargerAgenda();
    }

    var stats = el('div', 'stats');
    recap.statNet = carteStat('Internet', 'wifi');
    stats.appendChild(recap.statNet.el);
    droite.appendChild(stats);

    if (maison.habitants && maison.habitants.length) {
      var fam = el('div', 'carte famille');
      var tf = el('div', 'carte-tete');
      tf.appendChild(el('h3', '', 'Famille'));
      var tout = el('span', 'lien', 'Profils');
      tout.addEventListener('click', function () { vue = 'profils'; dessiner(); });
      tf.appendChild(tout);
      fam.appendChild(tf);
      for (i = 0; i < maison.habitants.length; i++) {
        (function (hb) {
          var ligne = el('div', 'personne');
          ligne.appendChild(avatar(hb));
          ligne.appendChild(el('div', 'nom', hb.nom));
          var statut = el('div', 'statut');
          ligne.appendChild(statut);
          ligne.appendChild(el('div', 'ou', nomsPieces(hb)));
          ligne.appendChild(picto('fleche', 'chevron'));
          ligne.addEventListener('click', function () { ouvrirProfil(hb); });
          recap.profils.push({ h: hb, statut: statut });
          fam.appendChild(ligne);
        })(maison.habitants[i]);
      }
      droite.appendChild(fam);
    }

    var sc = el('div', 'scenes');
    for (i = 0; i < maison.scenes.length; i++) {
      if (maison.scenes[i].entity_id === SCENE_ETEINDRE) { continue; }
      (function (scene) {
        var b = el('div', 'scene-btn', scene.nom);
        b.addEventListener('click', function () {
          b.className = 'scene-btn appui';
          setTimeout(function () { b.className = 'scene-btn'; }, 600);
          agir({ entity_id: scene.entity_id, action: 'activer' });
          message('Scène « ' + scene.nom + ' »', true);
        });
        sc.appendChild(b);
      })(maison.scenes[i]);
    }
    droite.appendChild(sc);
    haut.appendChild(droite);
    c.appendChild(haut);

    // Pièces : cartes photo (photo de la pièce si fournie, sinon pictogramme sur fond dégradé)
    c.appendChild(el('h2', 'titre', 'Pièces'));
    var carrousel = el('div', 'carrousel');
    for (i = 0; i < PIECES.length; i++) {
      (function (p, n) {
        var carte = el('div', 'carte-photo');
        var img = el('div', 'photo teinte' + (n % 6));
        if (p.photo) { img.style.backgroundImage = 'url(/static/photos/' + p.photo + ')'; img.className = 'photo'; } else { img.appendChild(picto(pictoPiece(p.nom), 'geant')); }
        carte.appendChild(img);
        var boutons = el('div', 'boutons-photo');
        var bw = boutonRond('wifi', 'wifi', function () { wifiPiece(p); });
        bw.appendChild(el('span', '', 'Wi-Fi'));
        boutons.appendChild(bw);
        var bm = boutonRond('marche', 'marche', function () { marchePiece(p); });
        boutons.appendChild(bm);
        carte.appendChild(boutons);
        var leg = el('div', 'legende');
        leg.appendChild(el('div', 'nom', p.nom));
        var etat = el('div', 'etat', '');
        leg.appendChild(etat);
        carte.appendChild(leg);
        carte.addEventListener('click', function () { ouvrirPiece(p); });
        recap.pieces.push({ p: p, carte: carte, etat: etat, marche: bm });
        carrousel.appendChild(carte);
      })(PIECES[i], i);
    }
    c.appendChild(carrousel);
  }

  // Météo dans le rond en haut de la barre latérale (à la place du logo)
  function majMeteoHaut() {
    var z = $('meteo-nav');
    if (!z) { return; }
    var m = meteo();
    var cle = m ? m.picto + m.temp : '';
    if (z.getAttribute('data-cle') === cle) { return; }
    z.setAttribute('data-cle', cle);
    z.innerHTML = '';
    if (!m) { z.appendChild(picto('navSoleil')); return; }
    z.setAttribute('title', m.texte);
    z.appendChild(picto(m.picto));
    z.appendChild(el('span', 'temp', m.temp));
  }

  function majRecap() {
    majMeteoHaut();
    echantillonner();
    if (recap && recap.agenda && new Date().getTime() - dernierAgenda > 300000) { chargerAgenda(); }
    if (!recap) { return; }
    var i;
    for (i = 0; i < recap.profils.length; i++) {
      var rp = recap.profils[i], res = resumeEntites(eidsDe(rp.h));
      rp.statut.textContent = res.actif ? res.texte : 'Tout éteint';
      rp.statut.className = 'statut' + (res.actif ? ' on' : '');
    }
    if (!recap.meteo) { return; }
    var m = meteo();
    recap.meteo.innerHTML = '';
    if (m) {
      recap.meteo.appendChild(picto(m.picto, 'or'));
      recap.meteo.appendChild(el('span', 'temp', m.temp));
      recap.meteo.appendChild(el('span', 'cond', m.texte + (m.humidite !== undefined ? ' · ' + m.humidite + ' % d’humidité' : '')));
    }
    var l = compter(function (e) { return domaine(e) === 'light' && estActif(e); });
    var me = compter(function (e) { return domaine(e) === 'media_player' && estActif(e); });
    recap.chipLum.textContent = pluriel(l, 'lumière') + (l > 1 ? ' allumées' : ' allumée');
    recap.chipEcr.textContent = me ? pluriel(me, 'écran') + (me > 1 ? ' allumés' : ' allumé') : 'Écrans éteints';
    recap.chipGar.textContent = '';
    for (var eid in noms) {
      if (noms.hasOwnProperty(eid) && domaine(eid) === 'cover') { recap.chipGar.textContent = 'Garage · ' + libelleEtat(eid).toLowerCase(); }
    }
    recap.chipGar.className = 'chip' + (recap.chipGar.textContent && recap.chipGar.textContent.indexOf('fermé') < 0 ? ' alerte' : '');
    var en = etats[(maison.infos || {}).internet];
    var net = en && !isNaN(parseFloat(en.state)) ? parseFloat(en.state) * 8 / 1000 : 0;   // kB/s -> Mbit/s
    recap.statNet.val.innerHTML = '<b>' + (net < 10 ? net.toFixed(1) : Math.round(net)).toString().replace('.', ',') + '</b><span> Mbit/s</span>';
    recap.statNet.courbe.innerHTML = courbe(historique.internet);
    for (i = 0; i < recap.pieces.length; i++) {
      var r = recap.pieces[i], rs = resumePiece(r.p);
      r.etat.textContent = rs.texte;
      r.carte.className = 'carte-photo' + (rs.actif ? ' on' : '');
      r.marche.className = 'bouton-rond marche' + (rs.actif ? ' on' : '');
    }
  }

  /* ---------- agenda ---------- */

  var evenements = null, dernierAgenda = 0;
  function chargerAgenda() {
    dernierAgenda = new Date().getTime();
    requete('GET', '/api/agenda', null, function (r) { evenements = r || []; afficherAgenda(); },
      function () { evenements = evenements || []; afficherAgenda(); });
  }

  function lireJour(s) {   // "AAAA-MM-JJ" (journée entière) ou date ISO avec heure
    var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : lireDateIso(s);
  }

  function libelleJour(d) {
    var auj = new Date(); auj.setHours(0, 0, 0, 0);
    var j = new Date(d.getTime()); j.setHours(0, 0, 0, 0);
    var ecart = Math.round((j - auj) / 86400000);
    if (ecart === 0) { return 'Aujourd’hui'; }
    if (ecart === 1) { return 'Demain'; }
    var jour = JOURS[d.getDay()];
    return jour.charAt(0).toUpperCase() + jour.slice(1) + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()];
  }

  function afficherAgenda() {
    if (!recap || !recap.agenda) { return; }
    var z = recap.agenda;
    z.innerHTML = '';
    if (evenements === null) { z.appendChild(el('div', 'vide', 'Chargement…')); return; }
    var maintenant = new Date(), n = 0, jourCourant = '';
    for (var i = 0; i < evenements.length && n < 6; i++) {
      var e = evenements[i], d = lireJour(e.debut), f = lireJour(e.fin);
      if (!d || (f && f < maintenant && !e.journee)) { continue; }
      var lj = libelleJour(d);
      if (lj !== jourCourant) { z.appendChild(el('div', 'jour', lj)); jourCourant = lj; }
      var ligne = el('div', 'evenement');
      var point = el('span', 'point');
      point.style.background = e.couleur || '#C9A45C';
      ligne.appendChild(point);
      ligne.appendChild(el('span', 'heure', e.journee ? 'Journée' : deux(d.getHours()) + ':' + deux(d.getMinutes())));
      ligne.appendChild(el('span', 'titre-evt', e.titre));
      z.appendChild(ligne);
      n++;
    }
    if (!n) { z.appendChild(el('div', 'vide', 'Rien de prévu. Touchez « Ajouter ».')); }
  }

  function formulaireEvenement() {
    fermerPiece();
    var fond = el('div', '');
    fond.id = 'feuille';
    var panneau = el('div', 'panneau formulaire');
    var tete = el('div', 'tete');
    tete.appendChild(picto('agenda', 'or grand'));
    var t = el('div', 'titres');
    t.appendChild(el('h1', '', 'Nouvel événement'));
    tete.appendChild(t);
    var fermer = el('button', 'fermer', '✕');
    fermer.addEventListener('click', fermerPiece);
    tete.appendChild(fermer);
    panneau.appendChild(tete);
    function champ(libelle, type, valeur) {
      var l = el('label', 'champ');
      l.appendChild(el('span', '', libelle));
      var i = document.createElement('input');
      i.type = type;
      if (valeur) { i.value = valeur; }
      l.appendChild(i);
      panneau.appendChild(l);
      return i;
    }
    var auj = new Date();
    var titre = champ('Quoi ?', 'text');
    titre.placeholder = 'Ex. : dentiste Amel, foot Naïm…';
    var jour = champ('Quel jour ?', 'date', auj.getFullYear() + '-' + deux(auj.getMonth() + 1) + '-' + deux(auj.getDate()));
    var heure = champ('À quelle heure ? (vide = toute la journée)', 'time');
    var ok = el('button', 'valider', 'Enregistrer');
    ok.addEventListener('click', function () {
      if (!titre.value) { message('Indiquez ce qui est prévu'); return; }
      ok.disabled = true;
      requete('POST', '/api/agenda', { titre: titre.value, date: jour.value, heure: heure.value }, function () {
        fermerPiece();
        message('Ajouté à l’agenda', true);
        chargerAgenda();
      }, function (err) { ok.disabled = false; message('Impossible d’ajouter : ' + err); });
    });
    panneau.appendChild(ok);
    panneau.addEventListener('click', function (ev) { ev.stopPropagation(); });
    fond.addEventListener('click', fermerPiece);
    fond.appendChild(panneau);
    document.body.appendChild(fond);
    titre.focus();
  }

  /* ---------- profils ---------- */

  function ouvrirProfil(h) {
    ouvrirFeuille(function (tete) {
      tete.appendChild(avatar(h, true));
      var t = el('div', 'titres');
      t.appendChild(el('h1', '', h.nom));
      t.appendChild(el('div', 'sous', nomsPieces(h)));
      tete.appendChild(t);
    }, eidsDe(h), function (panneau) {
      var infos = el('div', 'infos-profil');
      var tel = el('div', 'info');
      tel.appendChild(picto('telephone', 'or'));
      tel.appendChild(el('span', '', h.telephone ? h.telephone : 'Téléphone : à connecter (appli Home Assistant)'));
      infos.appendChild(tel);
      var wf = el('div', 'info');
      wf.appendChild(picto('wifi', 'or'));
      wf.appendChild(el('span', '', 'Wi-Fi de la chambre : bientôt (autorisation Freebox)'));
      infos.appendChild(wf);
      panneau.appendChild(infos);
    });
  }

  function vueProfils(c) {
    var ent = el('div', 'entete');
    ent.appendChild(el('h1', '', 'Famille'));
    c.appendChild(ent);
    var grille = el('div', 'grille-profils');
    for (var i = 0; i < maison.habitants.length; i++) {
      (function (hb) {
        var carte = el('div', 'carte profil');
        carte.appendChild(avatar(hb, true));
        carte.appendChild(el('div', 'nom', hb.nom));
        carte.appendChild(el('div', 'ou', nomsPieces(hb)));
        var statut = el('div', 'statut');
        carte.appendChild(statut);
        var tel = el('div', 'tel');
        tel.appendChild(picto('telephone'));
        tel.appendChild(el('span', '', hb.telephone || 'Téléphone à connecter'));
        carte.appendChild(tel);
        carte.addEventListener('click', function () { ouvrirProfil(hb); });
        recap.profils.push({ h: hb, statut: statut });
        grille.appendChild(carte);
      })(maison.habitants[i]);
    }
    c.appendChild(grille);
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
  var vue3d = null;         // maquette 3D affichée (Plan3D) ou null
  var mode3d = true;        // préférence 3D / plan 2D
  try { mode3d = window.localStorage.getItem('portail-plan') !== '2d'; } catch (e) { mode3d = true; }

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
        var petit = aire < 9000 || largeur < 120;
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
    // murs : bords des zones, sauf à l'intérieur d'un espace ouvert (pointillés = zones de lumière)
    if (window.Plan3D && window.Plan3D.segments) {
      var murs = window.Plan3D.segments(plan), gm = svg('g', {});
      for (i = 0; i < murs.length; i++) {
        var s = murs[i];
        gm.appendChild(svg('line', { x1: s.a[0], y1: s.a[1], x2: s.b[0], y2: s.b[1], 'class': 'mur' + (s.ouvert ? ' ouvert' : '') }));
      }
      racine.appendChild(gm);
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

    return racine;
  }

  function zonesPourPlan(niveau) {
    var res = [];
    for (var i = 0; i < niveau.plan.zones.length; i++) {
      var z = niveau.plan.zones[i];
      var p = z.piece ? pieceParNom(niveau.id, z.piece) : null;
      res.push({ zone: z, piece: p, eids: z.entites || (p ? p.eids : []) });
    }
    return res;
  }

  function aDesPlans() {
    for (var i = 0; i < maison.niveaux.length; i++) { if (maison.niveaux[i].plan) { return true; } }
    return false;
  }

  function options3d() {
    return {
      resume: resumeEntites,
      actif: estActif,
      ouvrir: ouvrirPiece,
      basculer: function (eid) { basculer(eid, null); },
      lumieres: function (eids) {
        var l = [];
        for (var i = 0; i < eids.length; i++) {
          if (domaine(eids[i]) === 'light' && noms[eids[i]] && !noms[eids[i]].groupe) { l.push(eids[i]); }
        }
        return l;
      },
      camera: function (eid) { pleinEcran(cameraParId(eid)); },
      garage: function (eid, action) {
        if (action !== 'stop' && !window.confirm((action === 'ouvrir' ? 'Ouvrir' : 'Fermer') + ' le garage ?')) { return; }
        agir({ entity_id: eid, action: action });
        message('Garage : ' + (action === 'ouvrir' ? 'ouverture' : action === 'fermer' ? 'fermeture' : 'arrêt'), true);
      },
      position: function (eid) {
        var e = etats[eid];
        if (!e) { return 0; }
        if (e.current_position !== undefined) { return e.current_position; }
        return e.state === 'open' || e.state === 'opening' ? 100 : 0;
      }
    };
  }

  function niveau3d(niveau, global) {
    var pos = (global && niveau.plan.position3d) || { x: 0, y: 0, altitude: 0 };
    return { plan: niveau.plan, zones: zonesPourPlan(niveau), dx: pos.x, dz: pos.y, alt: pos.altitude };
  }

  function vueMaison3d(c) {
    var ent = el('div', 'entete');
    ent.appendChild(el('h1', '', 'La maison en 3D'));
    c.appendChild(ent);
    var cadre = el('div', 'carte plan');
    var zone = el('div', 'zone-plan en3d grande');
    cadre.appendChild(zone);
    cadre.appendChild(el('div', 'aide', 'Un doigt pour tourner · deux doigts pour zoomer · touchez une ampoule ou une TV pour l’allumer · touchez le sol pour les commandes'));
    c.appendChild(cadre);
    var liste = [];
    for (var i = 0; i < maison.niveaux.length; i++) {
      if (maison.niveaux[i].plan) { liste.push(niveau3d(maison.niveaux[i], true)); }
    }
    setTimeout(function () { vue3d = window.Plan3D.creer(zone, liste, options3d()); }, 0);
  }

  function carteplan(niveau) {
    var avec3d = window.Plan3D && window.Plan3D.disponible();
    var cadre = el('div', 'carte plan');
    var choix = el('div', 'choix-plan');
    var zone = el('div', 'zone-plan');
    var aide = el('div', 'aide');
    function afficher(en3d) {
      if (vue3d) { vue3d.detruire(); vue3d = null; }
      zonesPlan = [];
      zone.innerHTML = '';
      zone.className = 'zone-plan' + (en3d ? ' en3d' : '');
      if (en3d) {
        vue3d = window.Plan3D.creer(zone, [niveau3d(niveau, false)], options3d());
        aide.textContent = 'Un doigt pour tourner · deux doigts pour zoomer · touchez une ampoule ou une TV pour l’allumer · touchez le sol pour les commandes';
      } else if (avec3d && !window.PORTAIL_LEGER) {   // vieux iPad : plan SVG, plus léger que la vue de dessus 3D
        var o = options3d();
        o.dessus = true;
        zone.className = 'zone-plan en3d';
        vue3d = window.Plan3D.creer(zone, [niveau3d(niveau, false)], o);
        aide.textContent = 'Vue de dessus · touchez une ampoule ou une TV pour l’allumer · touchez une pièce pour ses commandes';
      } else {
        zone.appendChild(dessinerPlan(niveau));
        majPlan();
        aide.textContent = 'Toucher une pièce pour la piloter · les pièces allumées brillent';
      }
      b3.className = en3d ? 'actif' : '';
      b2.className = en3d ? '' : 'actif';
    }
    var b3 = el('button', '', '3D');
    var b2 = el('button', '', 'Plan');
    b3.addEventListener('click', function () { mode3d = true; sauver(); afficher(true); });
    b2.addEventListener('click', function () { mode3d = false; sauver(); afficher(false); });
    function sauver() { try { window.localStorage.setItem('portail-plan', mode3d ? '3d' : '2d'); } catch (e) { return; } }
    if (avec3d) { choix.appendChild(b3); choix.appendChild(b2); cadre.appendChild(choix); }
    cadre.appendChild(zone);
    cadre.appendChild(aide);
    // la 3D a besoin que la zone soit dans la page pour connaître sa taille
    setTimeout(function () { afficher(avec3d && mode3d); }, 0);
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

  function ouvrirFeuille(remplirTete, eids, extra) {
    fermerPiece();
    var fond = el('div', '');
    fond.id = 'feuille';
    var panneau = el('div', 'panneau');
    var tete = el('div', 'tete');
    remplirTete(tete);
    var fermer = el('button', 'fermer', '✕');
    fermer.addEventListener('click', fermerPiece);
    tete.appendChild(fermer);
    panneau.appendChild(tete);
    if (extra) { extra(panneau); }
    var ts = el('div', 'tuiles');
    for (var i = 0; i < eids.length; i++) {
      var eid = eids[i];
      var t = creerTuile({ entity_id: eid, nom: noms[eid].nom, icone: noms[eid].icone, confirmer: noms[eid].confirmer });
      majTuile(t, eid);
      ts.appendChild(t);
    }
    panneau.appendChild(ts);
    panneau.addEventListener('click', function (ev) { ev.stopPropagation(); });
    fond.addEventListener('click', fermerPiece);
    fond.appendChild(panneau);
    document.body.appendChild(fond);
  }

  function ouvrirPiece(p) {
    ouvrirFeuille(function (tete) {
      tete.appendChild(picto(pictoPiece(p.nom), 'or grand'));
      var t = el('div', 'titres');
      t.appendChild(el('h1', '', p.nom));
      tete.appendChild(t);
    }, p.eids);
  }

  function vueNiveau(c, niveau) {
    var ent = el('div', 'entete');
    ent.appendChild(el('h1', '', niveau.nom));
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
      c.appendChild(carteplan(niveau));
      c.appendChild(el('h2', 'titre', 'Toutes les commandes'));
    }

    for (i = 0; i < niveau.pieces.length; i++) {
      var p = niveau.pieces[i];
      var bloc = el('div', 'piece');
      bloc.id = 'piece-' + niveau.id + '-' + i;
      bloc.appendChild(el('h2', '', p.nom));
      var ts = el('div', 'tuiles');
      for (j = 0; j < p.equipements.length; j++) {
        var t = creerTuile(p.equipements[j]);
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
    ent.appendChild(el('h1', '', 'Caméras'));
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

  // Bouton « Tout éteindre » du bandeau (page d'accueil) : scène HA si déclarée, sinon lumières de chaque niveau
  var SCENE_ETEINDRE = 'scene.tout_eteindre';
  function boutonEteindre() {
    var b = $('tout-eteindre');
    if (!b) { return; }
    b.style.display = vue === 'accueil' ? '' : 'none';
    if (b.getAttribute('data-pret')) { return; }
    b.setAttribute('data-pret', '1');
    b.innerHTML = '';
    b.appendChild(picto('marche'));
    b.appendChild(el('span', '', 'Tout éteindre'));
    b.addEventListener('click', function () {
      var aScene = false, i;
      for (i = 0; i < maison.scenes.length; i++) { if (maison.scenes[i].entity_id === SCENE_ETEINDRE) { aScene = true; } }
      if (aScene) { agir({ entity_id: SCENE_ETEINDRE, action: 'activer' }); } else {
        for (i = 0; i < maison.niveaux.length; i++) { agir({ niveau: maison.niveaux[i].id, action: 'tout_eteindre' }); }
      }
      for (var eid in etats) { if (etats.hasOwnProperty(eid) && domaine(eid) === 'light') { etats[eid].state = 'off'; } }
      majToutesTuiles();
      b.className = 'appui';
      setTimeout(function () { b.className = ''; }, 700);
      message('Extinction de toute la maison…', true);
    });
  }

  function dessiner() {
    tuiles = {};
    legendesCam = {};
    imagesCam = [];
    zonesPlan = [];
    if (vue3d) { vue3d.detruire(); vue3d = null; }
    fermerPiece();
    var plein = $('plein');
    if (plein) { document.body.removeChild(plein); }
    dessinerOnglets();
    boutonEteindre();
    var c = $('contenu');
    c.innerHTML = '';
    recap = null;
    if (vue === 'accueil') { vueAccueil(c); } else if (vue === 'cameras') { vueCameras(c); } else if (vue === 'maison3d') { vueMaison3d(c); } else if (vue === 'profils') { recap = { pieces: [], profils: [] }; vueProfils(c); } else {
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
          PIECES.push({ id: 'piece-' + m.niveaux[i].id + '-' + j, nom: p.nom, icone: p.icone || '•', photo: p.photo,
            niveau: m.niveaux[i].id, eids: p.equipements.map(function (e) { return e.entity_id; }) });
        }
      }
      var ancre = (window.location.hash || '').replace('#', '');  // lien direct : /#rdc, /#cameras…
      if (ancre === 'cameras' || ancre === 'maison3d' || ancre === 'profils' || niveauParId(ancre)) { vue = ancre; }
      dessiner();
      lireEtats();
      setInterval(lireEtats, window.PORTAIL_LEGER ? 4000 : 2000);
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

  // Glisser le doigt à gauche / à droite : vue suivante / précédente (pas sur la 3D, les carrousels ni les fenêtres)
  var glisse = null;
  document.addEventListener('touchstart', function (ev) {
    glisse = null;
    if (!maison || ev.touches.length !== 1) { return; }
    for (var t = ev.target; t && t !== document.body; t = t.parentNode) {
      var c = typeof t.className === 'string' ? t.className : '';
      if (t.tagName === 'CANVAS' || t.tagName === 'INPUT' || t.id === 'feuille' || t.id === 'plein' || /carrousel/.test(c)) { return; }
    }
    glisse = { x: ev.touches[0].clientX, y: ev.touches[0].clientY, t: new Date().getTime() };
  }, false);
  document.addEventListener('touchend', function (ev) {
    if (!glisse) { return; }
    var p = ev.changedTouches[0], dx = p.clientX - glisse.x, dy = p.clientY - glisse.y, dt = new Date().getTime() - glisse.t;
    glisse = null;
    if (Math.abs(dx) < 90 || Math.abs(dy) > Math.abs(dx) * 0.6 || dt > 800) { return; }
    var l = niveaux(), i;
    for (i = 0; i < l.length; i++) { if (l[i].id === vue) { break; } }
    var j = i + (dx < 0 ? 1 : -1);
    if (j < 0 || j >= l.length) { return; }
    vue = l[j].id;
    dessiner();
  }, false);
  document.addEventListener('click', reveil, false);

  demarrer();
  reveil();
})();
