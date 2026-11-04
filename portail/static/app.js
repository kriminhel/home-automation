/* Portail tablette — JavaScript ES5 uniquement (Safari iOS 9) :
   pas de const/let, de fonctions fléchées, de fetch ni de template strings. */
(function () {
  'use strict';

  var ACCUEIL = { id: 'accueil', nom: 'Accueil', icone: '🏠', couleur: '#3949AB' };
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
    'septembre', 'octobre', 'novembre', 'décembre'];

  var maison = null;
  var etats = {};
  var vue = 'accueil';
  var tuiles = {};          // entity_id -> [éléments tuile] de la vue courante
  var noms = {};            // entity_id -> {nom, icone, piece}
  var minuteurMessage = null;

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
      $('date').textContent = JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()];
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
    if (vue === 'accueil') { majAllumes(); }
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

  function niveaux() { return [ACCUEIL].concat(maison.niveaux); }

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

  var signatureAllumes = null;
  function majAllumes() {
    var zone = $('allumes');
    if (!zone) { return; }
    // Ne reconstruire que si la liste change (sinon un toucher en cours serait perdu)
    var sig = [];
    for (var id in noms) { if (noms.hasOwnProperty(id) && estActif(id)) { sig.push(id); } }
    sig = sig.join(',');
    if (sig === signatureAllumes) { return; }
    signatureAllumes = sig;
    zone.innerHTML = '';
    tuiles = {};
    var n = 0;
    for (var eid in noms) {
      if (noms.hasOwnProperty(eid) && domaine(eid) !== 'scene' && estActif(eid)) {
        var t = creerTuile({ entity_id: eid, nom: noms[eid].nom, icone: noms[eid].icone, confirmer: noms[eid].confirmer });
        t.querySelector('.etat').textContent = noms[eid].piece;
        t.className += ' on';
        zone.appendChild(t);
        n++;
      }
    }
    if (!n) { zone.appendChild(el('div', 'vide', 'Tout est éteint et fermé.')); }
  }

  function vueAccueil(c) {
    var h = el('div', 'horloge'); h.id = 'horloge'; c.appendChild(h);
    var d = el('div', 'date'); d.id = 'date'; c.appendChild(d);

    var ps = el('div', 'piece');
    ps.appendChild(el('h2', '', 'Scènes'));
    var ts = el('div', 'tuiles');
    for (var i = 0; i < maison.scenes.length; i++) {
      ts.appendChild(creerTuile(maison.scenes[i], 'Toucher pour activer'));
    }
    ps.appendChild(ts);
    c.appendChild(ps);

    var pa = el('div', 'piece');
    pa.appendChild(el('h2', '', 'Allumé ou ouvert en ce moment'));
    var ta = el('div', 'tuiles'); ta.id = 'allumes';
    pa.appendChild(ta);
    c.appendChild(pa);
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

    for (i = 0; i < niveau.pieces.length; i++) {
      var p = niveau.pieces[i];
      var bloc = el('div', 'piece');
      bloc.appendChild(el('h2', '', p.nom));
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

  function dessiner() {
    tuiles = {};
    dessinerOnglets();
    var c = $('contenu');
    c.innerHTML = '';
    signatureAllumes = null;
    if (vue === 'accueil') { vueAccueil(c); } else {
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
            noms[eq.entity_id] = { nom: eq.nom, icone: eq.icone, piece: p.nom, confirmer: !!eq.confirmer };
          }
        }
      }
      dessiner();
      lireEtats();
      setInterval(lireEtats, 2000);
      setInterval(majHorloge, 10000);
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
