/* Maquette 3D « maison de poupée » en coupe (Three.js r110, ES5 uniquement).
   Construite depuis maison.json → niveaux[].plan : sols texturés, murs (fond hauts, avant coupés,
   aucune cloison dans un même « espace » ouvert), mobilier arrondi avec ombres douces, lueur des
   pièces allumées, icônes 💡 / 📺 interactives, étiquettes.
   Contrainte iPad : 2 lumières seulement dans la scène (au-delà, le GPU n'affiche plus rien) ;
   lampes, écrans et LED sont des matières auto-éclairées.

   window.Plan3D.disponible()
   window.Plan3D.segments(plan)   -> murs [{a, b, ouvert}] (aussi utilisé par le plan 2D, sans WebGL)
   window.Plan3D.creer(conteneur, niveaux, options) -> { maj(), detruire() }
     niveaux : [{ plan, zones: [{zone, piece, eids}], dx, dz, alt }]
     options : resume(eids) -> {actif, texte} · actif(eid) -> bool · ouvrir(piece)
               basculer(eid) · camera(entity_id) · lumieres(eids) -> eids des lumières (hors groupes)
*/
(function () {
  'use strict';

  /* ---------- géométrie du plan (sans WebGL) ---------- */

  function contours(zone) {
    var res = [], i;
    if (zone.poly) { res.push(zone.poly); }
    var rects = zone.rects || [];
    for (i = 0; i < rects.length; i++) {
      var r = rects[i];
      res.push([[r[0], r[1]], [r[0] + r[2], r[1]], [r[0] + r[2], r[1] + r[3]], [r[0], r[1] + r[3]]]);
    }
    return res;
  }

  function boite(pts) {
    var b = { x1: 1e9, y1: 1e9, x2: -1e9, y2: -1e9 };
    for (var i = 0; i < pts.length; i++) {
      b.x1 = Math.min(b.x1, pts[i][0]); b.y1 = Math.min(b.y1, pts[i][1]);
      b.x2 = Math.max(b.x2, pts[i][0]); b.y2 = Math.max(b.y2, pts[i][1]);
    }
    return b;
  }

  function soustraire(intervalles, coupe) {
    var res = [];
    for (var i = 0; i < intervalles.length; i++) {
      var l = intervalles[i][0], h = intervalles[i][1];
      if (coupe[1] <= l || coupe[0] >= h) { res.push([l, h]); continue; }
      if (coupe[0] > l + 0.5) { res.push([l, coupe[0]]); }
      if (coupe[1] < h - 0.5) { res.push([coupe[1], h]); }
    }
    return res;
  }

  // Murs du plan : bords des zones, sauf entre deux zones d'un même « espace » (pièce ouverte)
  function segments(plan) {
    var bords = [], res = [], i, j, k;
    for (i = 0; i < plan.zones.length; i++) {
      var z = plan.zones[i];
      if (z.type === 'exterieur') { continue; }
      var polys = contours(z);
      for (k = 0; k < polys.length; k++) {
        for (j = 0; j < polys[k].length; j++) {
          bords.push({ a: polys[k][j], b: polys[k][(j + 1) % polys[k].length], i: i, esp: z.espace });
        }
      }
    }
    for (i = 0; i < bords.length; i++) {
      var e = bords[i];
      var horiz = e.a[1] === e.b[1], vert = e.a[0] === e.b[0];
      if (!e.esp || !(horiz || vert)) { res.push({ a: e.a, b: e.b, ouvert: false }); continue; }
      var ax = horiz ? 0 : 1, ligne = horiz ? e.a[1] : e.a[0];
      var lo = Math.min(e.a[ax], e.b[ax]), hi = Math.max(e.a[ax], e.b[ax]);
      var restes = [[lo, hi]], ouverts = [];
      for (j = 0; j < bords.length; j++) {
        var f = bords[j];
        if (f.i === e.i || f.esp !== e.esp) { continue; }
        var fh = f.a[1] === f.b[1], fv = f.a[0] === f.b[0];
        if ((horiz && fh && f.a[1] === ligne) || (vert && fv && f.a[0] === ligne)) {
          var c = [Math.min(f.a[ax], f.b[ax]), Math.max(f.a[ax], f.b[ax])];
          restes = soustraire(restes, c);
          var o1 = Math.max(lo, c[0]), o2 = Math.min(hi, c[1]);
          if (o2 - o1 > 0.5) { ouverts.push([o1, o2]); }
        }
      }
      var listes = [[restes, false], [ouverts, true]];
      for (k = 0; k < 2; k++) {
        for (j = 0; j < listes[k][0].length; j++) {
          var p = listes[k][0][j];
          res.push({ a: horiz ? [p[0], ligne] : [ligne, p[0]], b: horiz ? [p[1], ligne] : [ligne, p[1]], ouvert: listes[k][1] });
        }
      }
    }
    return res;
  }

  function disponible() {
    if (!window.THREE || !THREE.OrbitControls) { return false; }
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  if (!window.THREE) { window.Plan3D = { disponible: disponible, segments: segments }; return; }

  var MUR_HAUT = 100, MUR_BAS = 40, EP = 7;
  var C = {
    mur: 0xC9C4BC, hautMur: 0x2B2F3A, dalle: 0x15171D,
    blanc: 0xF1EFEA, noir: 0x1B1C21, metal: 0xA7ADB8, chene: 0x9A7148, noyer: 0x5E3D24
  };

  var moteur = null;
  function obtenirMoteur() {
    if (!moteur) {
      // Fond opaque : sur tablette, un canvas transparent se mélange à la page.
      var r = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      r.setClearColor(0x12141B, 1);
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      moteur = { renderer: r };
    }
    return moteur;
  }

  function hex(c, defaut) { return c ? parseInt(String(c).replace('#', ''), 16) : defaut; }
  function alea(graine) { var x = Math.sin(graine * 9301 + 49297) * 233280; return x - Math.floor(x); }

  /* ---------- textures dessinées (canvas) ---------- */

  function canvasTex(taille, dessin, repete) {
    var c = document.createElement('canvas');
    c.width = c.height = taille;
    dessin(c.getContext('2d'), taille);
    var t = new THREE.CanvasTexture(c);
    if (repete) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    return t;
  }

  function texParquet() {
    return canvasTex(512, function (g, n) {
      var rangs = 8, h = n / rangs, s = 1;
      for (var r = 0; r < rangs; r++) {
        var x = -alea(s++) * 200;
        while (x < n) {
          var l = 160 + alea(s++) * 180, v = alea(s++);
          g.fillStyle = 'rgb(' + Math.round(150 + v * 40) + ',' + Math.round(108 + v * 30) + ',' + Math.round(70 + v * 22) + ')';
          g.fillRect(x, r * h, l, h);
          g.strokeStyle = 'rgba(60,35,15,0.35)';
          for (var k = 0; k < 5; k++) {
            g.beginPath();
            var y = r * h + 6 + alea(s++) * (h - 12);
            g.moveTo(x, y); g.bezierCurveTo(x + l / 3, y + 3, x + 2 * l / 3, y - 3, x + l, y);
            g.lineWidth = 1; g.stroke();
          }
          g.fillStyle = 'rgba(40,25,10,0.55)';
          g.fillRect(x, r * h, 2, h);
          x += l;
        }
        g.fillStyle = 'rgba(40,25,10,0.55)';
        g.fillRect(0, r * h, n, 2);
      }
    }, true);
  }

  function texCarrelage(fond, joint, cases) {
    return canvasTex(256, function (g, n) {
      var p = n / cases, s = 3;
      for (var i = 0; i < cases; i++) {
        for (var j = 0; j < cases; j++) {
          var v = alea(s++) * 14 - 7;
          g.fillStyle = 'rgb(' + (fond[0] + v) + ',' + (fond[1] + v) + ',' + (fond[2] + v) + ')';
          g.fillRect(i * p, j * p, p, p);
        }
      }
      g.strokeStyle = joint; g.lineWidth = 2;
      for (i = 0; i <= cases; i++) {
        g.beginPath(); g.moveTo(i * p, 0); g.lineTo(i * p, n); g.stroke();
        g.beginPath(); g.moveTo(0, i * p); g.lineTo(n, i * p); g.stroke();
      }
    }, true);
  }

  function texBeton() {
    return canvasTex(256, function (g, n) {
      g.fillStyle = '#7C7E84'; g.fillRect(0, 0, n, n);
      for (var i = 0; i < 2500; i++) {
        var v = Math.round(alea(i) * 60) + 90;
        g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 4) + ',0.35)';
        g.fillRect(alea(i + 7) * n, alea(i + 13) * n, 2, 2);
      }
    }, true);
  }

  function texTerrasse() {
    return canvasTex(256, function (g, n) {
      var l = n / 8;
      for (var i = 0; i < 8; i++) {
        var v = alea(i + 40);
        g.fillStyle = 'rgb(' + Math.round(132 + v * 30) + ',' + Math.round(96 + v * 20) + ',' + Math.round(66 + v * 14) + ')';
        g.fillRect(i * l, 0, l - 3, n);
        g.fillStyle = 'rgba(30,20,10,0.8)';
        g.fillRect(i * l + l - 3, 0, 3, n);
      }
    }, true);
  }

  function texBois(base) {
    return canvasTex(256, function (g, n) {
      g.fillStyle = base; g.fillRect(0, 0, n, n);
      for (var i = 0; i < 40; i++) {
        g.strokeStyle = 'rgba(40,22,8,' + (0.08 + alea(i) * 0.18) + ')';
        g.lineWidth = 1 + alea(i + 5) * 2;
        var y = alea(i + 9) * n;
        g.beginPath(); g.moveTo(0, y);
        g.bezierCurveTo(n / 3, y + 6 - alea(i) * 12, 2 * n / 3, y - 6 + alea(i + 2) * 12, n, y);
        g.stroke();
      }
    }, false);
  }

  function texRadial(stops) {
    return canvasTex(128, function (g) {
      var d = g.createRadialGradient(64, 64, 2, 64, 64, 64);
      for (var i = 0; i < stops.length; i++) { d.addColorStop(stops[i][0], stops[i][1]); }
      g.fillStyle = d; g.fillRect(0, 0, 128, 128);
    }, false);
  }

  /* ---------- sprites (étiquettes et icônes) ---------- */

  var PROFONDEUR = false;   // vue multi-niveaux : sprites masqués par l'étage
  function spriteTexte(largeur, petit) {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 160;
    var tex = new THREE.CanvasTexture(c);
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: PROFONDEUR, transparent: true }));
    s.scale.set(largeur, largeur * 160 / 512, 1);
    s.renderOrder = 10;
    var dernier = null;
    s.userData.ecrire = function (nom, etat) {
      var cle = nom + '|' + etat;
      if (cle === dernier) { return; }
      dernier = cle;
      var g = c.getContext('2d');
      g.clearRect(0, 0, 512, 160);
      g.textAlign = 'center';
      g.shadowColor = 'rgba(0,0,0,0.9)';
      g.shadowBlur = 14;
      g.fillStyle = '#F2F4FA';
      g.font = '700 ' + (petit ? 58 : 54) + 'px -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
      g.fillText(nom, 256, etat ? 66 : 96);
      if (etat) {
        g.fillStyle = '#FFCF85';
        g.font = '600 40px -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
        g.fillText(etat, 256, 124);
      }
      tex.needsUpdate = true;
    };
    return s;
  }

  function spriteIcone(symbole) {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var tex = new THREE.CanvasTexture(c);
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: PROFONDEUR, transparent: true }));
    s.scale.set(32, 32, 1);
    s.renderOrder = 11;
    var dernier = null;
    s.userData.dessiner = function (actif, couleur) {
      var cle = actif + couleur;
      if (cle === dernier) { return; }
      dernier = cle;
      var g = c.getContext('2d');
      g.clearRect(0, 0, 128, 128);
      g.beginPath();
      g.arc(64, 64, 56, 0, Math.PI * 2);
      g.fillStyle = actif ? couleur : 'rgba(30,33,42,0.9)';
      g.fill();
      g.lineWidth = 5;
      g.strokeStyle = actif ? 'rgba(255,255,255,0.95)' : 'rgba(200,205,220,0.55)';
      g.stroke();
      g.font = '60px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.globalAlpha = actif ? 1 : 0.7;
      g.fillText(symbole, 64, 70);
      g.globalAlpha = 1;
      tex.needsUpdate = true;
    };
    return s;
  }

  /* ---------- briques de modélisation ---------- */

  var R = null;   // ressources de la scène en cours (matériaux, textures, géométries)

  function mat(couleur) {
    var k = 'c' + couleur;
    if (!R.mats[k]) { R.mats[k] = new THREE.MeshLambertMaterial({ color: couleur }); }
    return R.mats[k];
  }
  function matBois(base) {
    var k = 'b' + base;
    if (!R.mats[k]) { R.mats[k] = new THREE.MeshLambertMaterial({ map: texBois(base) }); }
    return R.mats[k];
  }
  function matBrillant(couleur) {
    var k = 'p' + couleur;
    if (!R.mats[k]) { R.mats[k] = new THREE.MeshPhongMaterial({ color: couleur, shininess: 70, specular: 0x555555 }); }
    return R.mats[k];
  }
  function lumineux(couleur) {
    var k = 'l' + couleur;
    if (!R.mats[k]) { R.mats[k] = new THREE.MeshBasicMaterial({ color: couleur }); }
    return R.mats[k];
  }
  function verre(couleur, opacite) {
    var k = 'v' + couleur + opacite;
    if (!R.mats[k]) { R.mats[k] = new THREE.MeshLambertMaterial({ color: couleur, transparent: true, opacity: opacite, depthWrite: false }); }
    return R.mats[k];
  }
  function m(couleurOuMat) { return typeof couleurOuMat === 'number' ? mat(couleurOuMat) : couleurOuMat; }

  // Pavé aux arêtes arrondies (forme arrondie extrudée + biseau), base posée à y = 0
  function geoArrondie(w, h, d, r) {
    r = Math.min(r, w / 2 - 0.05, d / 2 - 0.05, h / 2 - 0.05);
    var cle = [w, h, d, r].join('|');
    if (R.geos[cle]) { return R.geos[cle]; }
    var geo;
    if (r < 0.4) {
      geo = new THREE.BoxGeometry(w, h, d);
      geo.translate(0, h / 2, 0);
    } else {
      var bs = r * 0.5, sw = w - 2 * bs, sd = d - 2 * bs, cr = Math.max(0.05, r - bs);
      var x = -sw / 2, y = -sd / 2, s = new THREE.Shape();
      s.moveTo(x + cr, y);
      s.lineTo(x + sw - cr, y); s.quadraticCurveTo(x + sw, y, x + sw, y + cr);
      s.lineTo(x + sw, y + sd - cr); s.quadraticCurveTo(x + sw, y + sd, x + sw - cr, y + sd);
      s.lineTo(x + cr, y + sd); s.quadraticCurveTo(x, y + sd, x, y + sd - cr);
      s.lineTo(x, y + cr); s.quadraticCurveTo(x, y, x + cr, y);
      geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.1, h - 2 * bs), bevelEnabled: true,
        bevelThickness: bs, bevelSize: bs, bevelSegments: 2, curveSegments: 4 });
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, bs, 0);
    }
    R.geos[cle] = geo;
    return geo;
  }

  function rb(g, w, h, d, r, matiere, x, y, z) {
    var o = new THREE.Mesh(geoArrondie(w, h, d, r), m(matiere));
    o.position.set(x || 0, y || 0, z || 0);
    g.add(o);
    return o;
  }

  function cyl(g, rBas, rHaut, h, matiere, x, y, z, seg) {
    var o = new THREE.Mesh(new THREE.CylinderGeometry(rHaut, rBas, h, seg || 20), m(matiere));
    o.position.set(x || 0, (y || 0) + h / 2, z || 0);
    g.add(o);
    return o;
  }

  function sphere(g, r, matiere, x, y, z) {
    var o = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), m(matiere));
    o.position.set(x || 0, y || 0, z || 0);
    g.add(o);
    return o;
  }

  function feuillage(g, r, couleur, x, y, z) {
    var k = 'f' + couleur;
    if (!R.mats[k]) { R.mats[k] = new THREE.MeshLambertMaterial({ color: couleur, flatShading: true }); }
    var o = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), R.mats[k]);
    o.position.set(x || 0, y || 0, z || 0);
    o.rotation.set(alea(x + y) * 3, alea(z + r) * 3, 0);
    g.add(o);
    return o;
  }

  function plan(g, w, h, matiere, x, y, z, rx) {
    var o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m(matiere));
    o.position.set(x || 0, y || 0, z || 0);
    if (rx) { o.rotation.x = rx; }
    g.add(o);
    return o;
  }

  // Ombre douce au sol sous un meuble
  function ombre(g, w, d, force) {
    var o = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.25, d * 1.25),
      new THREE.MeshBasicMaterial({ map: R.texOmbre, transparent: true, depthWrite: false, opacity: force || 0.6 }));
    o.rotation.x = -Math.PI / 2;
    o.position.y = 0.7;
    g.add(o);
  }

  // Lueur additive (LED, lampe) posée à plat
  function halo(g, w, d, x, y, z, opacite) {
    var o = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: R.texLueur,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: opacite || 0.6 }));
    o.rotation.x = -Math.PI / 2;
    o.position.set(x || 0, y || 0.9, z || 0);
    g.add(o);
  }

  function chaise(g, x, z, rot, assise) {
    var c = new THREE.Group();
    rb(c, 18, 4, 18, 2, assise, 0, 20, 0);
    var dos = rb(c, 18, 17, 3, 1.4, assise, 0, 23, -8);
    dos.rotation.x = -0.12;
    var pieds = [[-7, -7], [7, -7], [-7, 7], [7, 7]];
    for (var i = 0; i < 4; i++) { cyl(c, 0.9, 0.9, 20, C.noir, pieds[i][0], 0, pieds[i][1], 8); }
    c.position.set(x, 0, z);
    c.rotation.y = rot;
    g.add(c);
  }

  function suspension(g, x, z, hauteur, abat) {
    cyl(g, 0.35, 0.35, 100 - hauteur, C.noir, x, hauteur + 8, z, 6);
    var cone = new THREE.Mesh(new THREE.CylinderGeometry(2, 9, 9, 20, 1, true), mat(abat || 0x1E1F24));
    cone.material.side = THREE.DoubleSide;
    cone.position.set(x, hauteur + 4.5, z);
    g.add(cone);
    sphere(g, 3, lumineux(0xFFE3B0), x, hauteur + 2, z);
  }

  /* ---------- mobilier (repère local : centre au sol, avant = +z, largeur w sur x, profondeur d sur z) ---------- */

  var MEUBLES = {
    lit: function (g, o) {
      var w = o.w || 60, d = o.d || 105, i;
      ombre(g, w + 10, d + 6);
      var pieds = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (i = 0; i < 4; i++) { rb(g, 4, 6, 4, 1, C.noir, pieds[i][0] * (w / 2 - 5), 0, pieds[i][1] * (d / 2 - 5)); }
      rb(g, w, 10, d, 2.5, matBois('#7B5634'), 0, 5, 0);
      rb(g, w - 4, 11, d - 6, 4, C.blanc, 0, 13, 2);
      var dl = d * 0.66;
      rb(g, w + 1, 5.5, dl, 3, hex(o.drap, 0x8899AA), 0, 22, d / 2 - dl / 2 + 1);
      rb(g, w + 1.6, 6.5, 9, 3, 0xF4F1EA, 0, 22.2, d / 2 - dl + 4);
      var n = o.double ? 2 : 1;
      for (i = 0; i < n; i++) {
        rb(g, (w - 10) / n - 3, 7, 15, 3.5, 0xF7F4EE, n === 1 ? 0 : (i ? 1 : -1) * w / 4, 24, -d / 2 + 13);
      }
      rb(g, w + 6, 46, 7, 3, 0x6F6A64, 0, 0, -d / 2 - 2);
      var cotes = o.double ? [-1, 1] : [1];
      for (i = 0; i < cotes.length; i++) {
        var cx = cotes[i] * (w / 2 + 13);
        rb(g, 18, 20, 16, 2, matBois('#8A6440'), cx, 0, -d / 2 + 9);
        cyl(g, 2.5, 1.5, 8, 0xD9CFC0, cx, 20, -d / 2 + 9, 12);
        cyl(g, 5.5, 3.5, 7, lumineux(0xFFE0A8), cx, 27, -d / 2 + 9, 16);
        halo(g, 40, 40, cx, 20.5, -d / 2 + 9, 0.35);
      }
    },
    tv: function (g, o, ctx) {
      var w = o.w || 70, h = w * 0.56;
      ombre(g, w * 1.25, 18, 0.5);
      rb(g, w * 1.25, 13, 16, 1.5, matBois('#3B2F28'), 0, 1.5, 2);
      plan(g, w * 1.2, 0.8, lumineux(0xFFB45A), 0, 1.2, 10.1);
      halo(g, w * 1.5, 26, 0, 0.9, 14, 0.5);
      rb(g, w * 0.55, 4, 6, 1.5, C.noir, 0, 14.5, 5);
      rb(g, 3, 8, 2, 0.5, C.noir, 0, 14.5, -3);
      rb(g, w, h, 2.2, 0.8, C.noir, 0, 21, -4);
      var ecran = new THREE.Mesh(new THREE.PlaneGeometry(w - 3, h - 3), new THREE.MeshBasicMaterial({ color: 0x0B0D12 }));
      ecran.position.set(0, 21 + h / 2, -2.85);
      g.add(ecran);
      if (o.entite) { ctx.tvs.push({ ecran: ecran, entite: o.entite, ambilight: o.ambilight, groupe: g, hauteur: 21 + h + 22 }); }
    },
    ps5: function (g) {
      ombre(g, 16, 24, 0.5);
      rb(g, 4, 29, 23, 1.8, C.blanc, -4.6, 0, 0);
      rb(g, 4, 29, 23, 1.8, C.blanc, 4.6, 0, 0);
      rb(g, 5.4, 26, 20, 1, 0x111216, 0, 1, 0);
      plan(g, 0.8, 24, lumineux(0x3D7BFF), -2.65, 14, 11.6);
      plan(g, 0.8, 24, lumineux(0x3D7BFF), 2.65, 14, 11.6);
      var manette = rb(g, 13, 3.5, 8, 1.6, C.blanc, 0, 0, 22);
      manette.rotation.y = 0.3;
    },
    canape: function (g, o) {
      var w = o.w || 150, d = o.d || 44, c = hex(o.couleur, 0x1F2025), i;
      var tissu = c, coussin = c + 0x070707;
      ombre(g, w + 6, d + 6, 0.7);
      rb(g, w, 9, d, 2.5, tissu, 0, 2.5, 0);
      rb(g, w, 28, 9, 3.5, tissu, 0, 8, -d / 2 + 4.5);
      rb(g, 9, 21, d, 3.5, tissu, -w / 2 + 4.5, 2.5, 0);
      rb(g, 9, 21, d, 3.5, tissu, w / 2 - 4.5, 2.5, 0);
      var n = Math.max(2, Math.round(w / 55)), cw = (w - 18) / n;
      for (i = 0; i < n; i++) {
        var x = -w / 2 + 9 + (i + 0.5) * cw;
        rb(g, cw - 1.5, 8, d - 13, 3.5, coussin, x, 11, 4);
        var dos = rb(g, cw - 2, 20, 9, 4, coussin, x, 15, -d / 2 + 12);
        dos.rotation.x = -0.14;
      }
      var p1 = rb(g, 14, 14, 5, 2.5, 0xB98B5E, -w / 2 + 18, 18, -d / 2 + 16);
      p1.rotation.set(-0.3, 0.3, 0);
      var p2 = rb(g, 14, 14, 5, 2.5, 0x8C9AA8, w / 2 - 18, 18, -d / 2 + 16);
      p2.rotation.set(-0.3, -0.3, 0);
    },
    tablebasse: function (g, o) {
      var w = o.w || 80, d = o.d || 44;
      ombre(g, w, d, 0.5);
      rb(g, w - 10, 13, d - 10, 2, C.noir, 0, 0, 0);
      rb(g, w, 4, d, 2, matBois('#A47A50'), 0, 13, 0);
      rb(g, 18, 2, 13, 0.6, 0xC0303A, -w / 4, 17, 0);
      rb(g, 16, 2, 12, 0.6, 0xE8E2D6, -w / 4, 19, 0);
      cyl(g, 3, 4.5, 9, 0xD9CFC0, w / 4, 17, 0, 14);
      feuillage(g, 4.5, 0x4E8A4C, w / 4, 29, 0);
    },
    table: function (g, o) {
      var w = o.w || 150, d = o.d || 78, bois = matBois(o.bois || '#7A4A22'), i;
      ombre(g, w + 30, d + 40, 0.55);
      rb(g, w, 6, d, 1.5, bois, 0, 34, 0);
      rb(g, 6, 34, d - 14, 1, bois, -w / 2 + 16, 0, 0);
      rb(g, 6, 34, d - 14, 1, bois, w / 2 - 16, 0, 0);
      rb(g, 18, 3, d - 10, 1, bois, -w / 2 + 16, 0, 0);
      rb(g, 18, 3, d - 10, 1, bois, w / 2 - 16, 0, 0);
      rb(g, w - 40, 4, 4, 1, bois, 0, 8, 0);
      var n = o.chaises || 6, cote = Math.ceil((n - 2) / 2), pas = w / (cote + 1);
      for (i = 0; i < cote; i++) {
        chaise(g, -w / 2 + pas * (i + 1), -d / 2 - 11, 0, 0xD6C8B2);
        chaise(g, -w / 2 + pas * (i + 1), d / 2 + 11, Math.PI, 0xD6C8B2);
      }
      chaise(g, -w / 2 - 13, 0, Math.PI / 2, 0xD6C8B2);
      chaise(g, w / 2 + 13, 0, -Math.PI / 2, 0xD6C8B2);
      cyl(g, 4, 6, 12, 0xE8E2D6, 0, 40, 0, 16);
      feuillage(g, 6, 0x5A8F4A, 0, 57, 0);
      for (i = -1; i <= 1; i++) { suspension(g, i * w / 3.2, 0, 70); }
      halo(g, w * 1.1, d * 1.2, 0, 40.5, 0, 0.5);
    },
    billard: function (g, o) {
      var w = o.w || 150, d = o.d || 82, i;
      ombre(g, w + 10, d + 10, 0.65);
      var pieds = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (i = 0; i < 4; i++) { cyl(g, 3.5, 5, 12, matBois('#3A2010'), pieds[i][0] * (w / 2 - 12), 0, pieds[i][1] * (d / 2 - 12), 12); }
      rb(g, w - 10, 20, d - 10, 3, matBois('#4A2A14'), 0, 12, 0);
      rb(g, w, 6, d, 3, matBois('#5C3418'), 0, 32, 0);
      rb(g, w - 12, 1.6, d - 12, 0.6, 0x1F7A42, 0, 37.2, 0);
      var poches = [[-1, -1], [0, -1], [1, -1], [-1, 1], [0, 1], [1, 1]];
      for (i = 0; i < 6; i++) { cyl(g, 3, 3, 0.6, C.noir, poches[i][0] * (w / 2 - 6), 38.4, poches[i][1] * (d / 2 - 6), 14); }
      var couleurs = [0xFFFFFF, 0xE8C21E, 0x2350C8, 0xD0302A, 0x6A2C9A, 0xE07A1F, 0x1E8A3A, 0x111111, 0xE8C21E, 0xD0302A];
      for (i = 0; i < couleurs.length; i++) {
        sphere(g, 2.4, matBrillant(couleurs[i]), i === 0 ? -w / 4 : w / 8 + Math.floor((i - 1) / 3) * 4.2,
          41.2, i === 0 ? 0 : (((i - 1) % 3) - 1) * 4.8 + (Math.floor((i - 1) / 3) % 2) * 2.4);
      }
      var queue = cyl(g, 0.6, 1, w * 0.75, matBois('#C9A26B'), -8, 41, d / 2 - 16, 8);
      queue.rotation.z = Math.PI / 2;
      for (i = 0; i < 2; i++) { cyl(g, 0.3, 0.3, 14, C.noir, (i ? 1 : -1) * w * 0.2, 86, 0, 6); }
      rb(g, w * 0.55, 5, 13, 2.5, 0x1E5A3A, 0, 82, 0);
      plan(g, w * 0.52, 10, lumineux(0xFFE3B0), 0, 81.9, 0, Math.PI / 2);
      halo(g, w * 1.1, d * 1.2, 0, 39, 0, 0.45);
    },
    arcade: function (g, o) {
      var c = hex(o.couleur, 0x5B2A9E);
      ombre(g, 38, 34, 0.6);
      var s = new THREE.Shape(), p = [[-14, 0], [14, 0], [14, 46], [21, 52], [20, 56], [9, 60], [11, 86], [15, 90], [15, 98], [-14, 98]];
      s.moveTo(p[0][0], p[0][1]);
      for (var i = 1; i < p.length; i++) { s.lineTo(p[i][0], p[i][1]); }
      var geo = new THREE.ExtrudeGeometry(s, { depth: 34, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 2 });
      geo.rotateY(-Math.PI / 2);
      geo.translate(17, 0, 0);
      var corps = new THREE.Mesh(geo, matBrillant(c));
      g.add(corps);
      var ecran = plan(g, 27, 24, lumineux(0x38E1FF), 0, 73, 10.4);
      ecran.rotation.x = -0.08;
      plan(g, 26, 2, lumineux(0xFF4FD8), 0, 60.5, 10.2);
      rb(g, 30, 7, 1, 0.3, lumineux(0xFFD34E), 0, 89, 15.6);
      var panneau = rb(g, 32, 2, 10, 0.8, 0x15161B, 0, 54, 15);
      panneau.rotation.x = 0.35;
      cyl(g, 0.8, 0.8, 5, C.noir, -8, 55, 15, 8);
      sphere(g, 1.8, matBrillant(0xD0302A), -8, 61, 15);
      var boutons = [0xD0302A, 0x2350C8, 0xE8C21E, 0x1E8A3A];
      for (i = 0; i < 4; i++) { cyl(g, 1.3, 1.3, 1.2, matBrillant(boutons[i]), 1 + i * 3.6, 55.5, 15 + (i % 2) * 2, 10); }
      halo(g, 60, 40, 0, 0.9, 22, 0.35);
    },
    comptoir: function (g, o) {
      var w = o.w || 120, d = o.d || 36, n = Math.max(2, Math.round(w / 32)), i;
      ombre(g, w, d, 0.4);
      rb(g, w, 31, d, 1, 0xE6E2DA, 0, 1, 0);
      for (i = 1; i < n; i++) { rb(g, 0.6, 28, 0.6, 0, 0x8E8A84, -w / 2 + i * w / n, 2, d / 2 + 0.2); }
      for (i = 0; i < n; i++) { rb(g, 8, 0.8, 1, 0.3, C.metal, -w / 2 + (i + 0.5) * w / n, 27, d / 2 + 0.7); }
      rb(g, w + 2, 2.8, d + 2, 0.8, 0xF4F2EE, 0, 32, 0);
      if (o.plaque) {
        rb(g, 30, 0.8, 22, 0.4, 0x0D0D10, w / 4, 34.6, 0);
        rb(g, 24, 1, 16, 0.5, 0x8E949E, -w / 5, 34.4, 0);
        cyl(g, 0.8, 0.8, 10, C.metal, -w / 5, 34.6, -9, 8);
        sphere(g, 4, 0xC0303A, -w / 2 + 14, 38, -4);
        feuillage(g, 5, 0x4E8A4C, w / 2 - 10, 41, -6);
        cyl(g, 3, 4, 6, 0xF0EDE6, w / 2 - 10, 34.6, -6, 12);
      }
      if (o.haut) {
        rb(g, w, 26, 17, 1, 0xE6E2DA, 0, 62, -d / 2 + 8.5);
        for (i = 1; i < n; i++) { rb(g, 0.6, 24, 0.6, 0, 0x8E8A84, -w / 2 + i * w / n, 63, -d / 2 + 17.2); }
        plan(g, w - 4, 1, lumineux(0xFFC77A), 0, 61.6, -d / 2 + 14, Math.PI / 2);
        halo(g, w * 1.05, d * 1.4, 0, 35.3, 0, 0.55);
      }
    },
    ilot: function (g, o) {
      var w = o.w || 120, d = o.d || 50, i;
      ombre(g, w + 20, d + 30, 0.5);
      rb(g, w, 33, d, 1.5, 0x2C2F3A, 0, 0, 0);
      rb(g, w + 10, 3.5, d + 8, 1, 0xF4F2EE, 0, 33, 0);
      rb(g, 3.5, 33, d + 8, 0.8, 0xF4F2EE, -w / 2 - 3.25, 0, 0);
      rb(g, 3.5, 33, d + 8, 0.8, 0xF4F2EE, w / 2 + 3.25, 0, 0);
      for (i = -1; i <= 1; i++) {
        cyl(g, 1, 1, 24, C.noir, i * w / 3, 0, d / 2 + 16, 8);
        cyl(g, 7, 7, 3, matBois('#A47A50'), i * w / 3, 24, d / 2 + 16, 18);
      }
      cyl(g, 4, 9, 4, 0xEDE6D8, -w / 4, 36.5, 0, 18);
      sphere(g, 3, 0xE07A1F, -w / 4 - 2, 41, 1);
      sphere(g, 3, 0xD0302A, -w / 4 + 3, 41, -1);
      for (i = -1; i <= 1; i += 2) { suspension(g, i * w / 4, 0, 72, 0xE6E2DA); }
    },
    frigo: function (g) {
      ombre(g, 38, 34, 0.5);
      rb(g, 38, 84, 34, 2, matBrillant(0xC9CDD4), 0, 0, 0);
      rb(g, 37, 0.5, 0.5, 0, 0x6F747E, 0, 52, 17.1);
      rb(g, 1.5, 22, 2, 0.5, C.metal, 13, 58, 17.5);
      rb(g, 1.5, 30, 2, 0.5, C.metal, 13, 16, 17.5);
    },
    buffet: function (g, o) {
      var w = o.w || 140, d = o.d || 26;
      ombre(g, w, d, 0.5);
      rb(g, w, 28, d, 1.5, matBois('#A47A50'), 0, 4, 0);
      cyl(g, 1, 1, 4, C.noir, -w / 2 + 6, 0, 0); cyl(g, 1, 1, 4, C.noir, w / 2 - 6, 0, 0);
      cyl(g, 4, 6, 14, 0xF0EDE6, -30, 32, 0, 14);
      feuillage(g, 8, 0x4E8A4C, -30, 52, 0);
    },
    voiture: function (g, o) {
      var w = o.w || 100, d = o.d || 230, i;
      ombre(g, w + 20, d + 20, 0.75);
      var L = d / 2, s = new THREE.Shape();
      var prof = [[-L, 12], [L - 4, 12], [L, 20], [L, 30], [L - 8, 38], [L * 0.38, 43], [L * 0.12, 64],
        [-L * 0.42, 66], [-L * 0.78, 48], [-L + 2, 44], [-L, 32]];
      s.moveTo(prof[0][0], prof[0][1]);
      for (i = 1; i < prof.length; i++) { s.lineTo(prof[i][0], prof[i][1]); }
      var geo = new THREE.ExtrudeGeometry(s, { depth: w - 8, bevelEnabled: true, bevelThickness: 4, bevelSize: 4, bevelSegments: 3, curveSegments: 6 });
      geo.rotateY(-Math.PI / 2);
      geo.translate((w - 8) / 2, 0, 0);
      var carrosserie = new THREE.Mesh(geo, matBrillant(hex(o.couleur, 0x2B3A55)));
      g.add(carrosserie);
      var vs = new THREE.Shape(), vit = [[L * 0.34, 44], [L * 0.1, 62], [-L * 0.4, 64], [-L * 0.72, 48]];
      vs.moveTo(vit[0][0], vit[0][1]);
      for (i = 1; i < vit.length; i++) { vs.lineTo(vit[i][0], vit[i][1]); }
      var vgeo = new THREE.ExtrudeGeometry(vs, { depth: w + 1, bevelEnabled: false });
      vgeo.rotateY(-Math.PI / 2);
      vgeo.translate((w + 1) / 2, 0, 0);
      g.add(new THREE.Mesh(vgeo, matBrillant(0x10151E)));
      var roues = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (i = 0; i < 4; i++) {
        var pneu = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 11, 24), mat(0x121214));
        pneu.rotation.z = Math.PI / 2;
        pneu.position.set(roues[i][0] * (w / 2 - 6), 15, roues[i][1] * d * 0.31);
        g.add(pneu);
        var jante = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 11.6, 10), matBrillant(0xBFC4CC));
        jante.rotation.z = Math.PI / 2;
        jante.position.copy(pneu.position);
        g.add(jante);
      }
      for (i = -1; i <= 1; i += 2) {
        rb(g, 18, 4, 2, 1, lumineux(0xF4F8FF), i * (w / 2 - 16), 30, L + 0.5);
        rb(g, 20, 3.5, 2, 1, lumineux(0xE0202A), i * (w / 2 - 15), 33, -L - 0.5);
        rb(g, 3, 4, 7, 1, matBrillant(hex(o.couleur, 0x2B3A55)), i * (w / 2 + 2), 42, L * 0.3);
      }
      rb(g, w * 0.4, 6, 1, 0.5, 0x0B0C10, 0, 17, L + 0.6);
      halo(g, w * 1.3, 60, 0, 0.9, L + 30, 0.35);
    },
    lavelinge: function (g) {
      ombre(g, 34, 34, 0.5);
      rb(g, 34, 40, 34, 2.5, C.blanc, 0, 0, 0);
      var anneau = new THREE.Mesh(new THREE.TorusGeometry(10, 1.6, 10, 24), mat(0x9EA4AE));
      anneau.position.set(0, 18, 17.3);
      g.add(anneau);
      var hublot = new THREE.Mesh(new THREE.CircleGeometry(9, 24), matBrillant(0x2A3A4E));
      hublot.position.set(0, 18, 17.2);
      g.add(hublot);
      rb(g, 30, 4, 1, 0.5, 0xD8DCE2, 0, 33, 17);
    },
    armoire: function (g, o) {
      var w = o.w || 120, d = o.d || 28, n = Math.max(2, Math.round(w / 45)), i;
      ombre(g, w, d, 0.5);
      rb(g, w, 92, d, 1.2, matBois('#CDB9A0'), 0, 0, 0);
      for (i = 1; i < n; i++) { rb(g, 0.6, 88, 0.6, 0, 0x7A6650, -w / 2 + i * w / n, 2, d / 2 + 0.2); }
      for (i = 0; i < n; i++) { rb(g, 0.9, 16, 1.2, 0.4, C.metal, -w / 2 + (i + 0.5) * w / n + 6, 38, d / 2 + 0.8); }
    },
    escalier: function (g, o) {
      var w = o.w || 60, d = o.d || 170, n = 13, h = 104, i;
      var bois = matBois('#9A7148');
      for (i = 0; i < n; i++) {
        var y = h * (i + 1) / n;
        rb(g, w, 3, d / n + 1, 0.8, bois, 0, y - 3, d / 2 - (i + 0.5) * d / n);
        rb(g, w - 2, y - 3, d / n, 0, 0x3A3D46, 0, 0, d / 2 - (i + 0.5) * d / n);
      }
      var rampe = new THREE.Mesh(new THREE.PlaneGeometry(Math.sqrt(d * d + h * h), 24), verre(0xBFE3F0, 0.25));
      rampe.position.set(w / 2, h / 2 + 12, 0);
      rampe.rotation.set(Math.atan2(h, d), Math.PI / 2, 0, 'YXZ');
      g.add(rampe);
    },
    douche: function (g, o) {
      var w = o.w || 46, d = o.d || 56;
      rb(g, w, 3, d, 1, C.blanc, 0, 0, 0);
      plan(g, w, 72, verre(0xCFEAF5, 0.28), 0, 39, d / 2);
      var cote = plan(g, d, 72, verre(0xCFEAF5, 0.28), w / 2, 39, 0);
      cote.rotation.y = Math.PI / 2;
      cyl(g, 0.8, 0.8, 70, C.metal, -w / 2 + 5, 3, -d / 2 + 4, 8);
      cyl(g, 7, 7, 1.2, C.metal, -w / 2 + 12, 72, -d / 2 + 12, 20);
    },
    baignoire: function (g, o) {
      var w = o.w || 130, d = o.d || 42;
      ombre(g, w, d, 0.5);
      rb(g, w, 24, d, 7, C.blanc, 0, 0, 0);
      rb(g, w - 10, 1, d - 10, 5, verre(0x8FD0E8, 0.85), 0, 20.5, 0);
      cyl(g, 1, 1, 10, C.metal, -w / 2 + 8, 24, -d / 2 + 5, 8);
    },
    lavabo: function (g) {
      ombre(g, 46, 24, 0.45);
      rb(g, 46, 30, 24, 1.5, matBois('#8A6440'), 0, 4, 0);
      rb(g, 26, 6, 18, 5, C.blanc, 0, 34, 1);
      cyl(g, 0.8, 0.8, 8, C.metal, 0, 34, -8, 8);
      plan(g, 36, 30, matBrillant(0x9FB4C8), 0, 58, -11.5);
      plan(g, 38, 1, lumineux(0xFFE3B0), 0, 73.5, -11.4);
    },
    wc: function (g) {
      ombre(g, 18, 26, 0.45);
      rb(g, 15, 15, 21, 6, C.blanc, 0, 0, 3);
      rb(g, 16, 2, 20, 6, C.blanc, 0, 15, 3);
      rb(g, 18, 24, 7, 2, C.blanc, 0, 0, -9);
    },
    console: function (g, o) {
      var w = o.w || 60, d = o.d || 20;
      ombre(g, w, d, 0.45);
      rb(g, w, 4, d, 1.5, matBois('#A47A50'), 0, 28, 0);
      cyl(g, 1, 1, 28, C.noir, -w / 2 + 4, 0, 0); cyl(g, 1, 1, 28, C.noir, w / 2 - 4, 0, 0);
      cyl(g, 4, 5, 10, 0xE8E2D6, w / 4, 32, 0, 14);
      feuillage(g, 6, 0x4E8A4C, w / 4, 48, 0);
      var miroir = new THREE.Mesh(new THREE.CircleGeometry(16, 32), matBrillant(0x9FB4C8));
      miroir.position.set(0, 62, -d / 2 + 0.5);
      g.add(miroir);
    },
    bureau: function (g, o) {
      var w = o.w || 80, d = o.d || 34;
      ombre(g, w, d + 20, 0.5);
      rb(g, w, 3, d, 1, C.blanc, 0, 31, 0);
      cyl(g, 1, 1, 31, C.noir, -w / 2 + 4, 0, -d / 2 + 4); cyl(g, 1, 1, 31, C.noir, w / 2 - 4, 0, -d / 2 + 4);
      cyl(g, 1, 1, 31, C.noir, -w / 2 + 4, 0, d / 2 - 4); cyl(g, 1, 1, 31, C.noir, w / 2 - 4, 0, d / 2 - 4);
      rb(g, 34, 20, 1.5, 0.6, C.noir, 0, 38, -d / 2 + 6);
      plan(g, 32, 18, lumineux(0x3A6FD0), 0, 48, -d / 2 + 6.8);
      rb(g, 3, 6, 3, 0.5, C.noir, 0, 34, -d / 2 + 6);
      rb(g, 22, 1, 8, 0.4, 0x2A2C33, 0, 34, 6);
      cyl(g, 4, 4, 1, C.noir, w / 2 - 10, 34, -6);
      cyl(g, 0.6, 0.6, 16, C.noir, w / 2 - 10, 35, -6, 6);
      cyl(g, 2, 5, 5, lumineux(0xFFE0A8), w / 2 - 10, 50, -4, 14);
      var siege = new THREE.Group();
      rb(siege, 22, 5, 22, 2.5, 0x2A2C33, 0, 20, 0);
      rb(siege, 22, 24, 4, 2, 0x2A2C33, 0, 24, -10);
      cyl(siege, 1.2, 1.2, 18, C.metal, 0, 2, 0, 8);
      cyl(siege, 11, 11, 2, C.noir, 0, 0, 0, 5);
      siege.position.set(0, 0, d / 2 + 12);
      siege.rotation.y = Math.PI + 0.3;
      g.add(siege);
    },
    biblio: function (g, o) {
      var w = o.w || 80, i, e;
      ombre(g, w, 16, 0.45);
      rb(g, w, 82, 15, 1, matBois('#B98B5E'), 0, 0, -1);
      var couleurs = [0xC0303A, 0x2D7BD8, 0xE8C21E, 0x3E9A5A, 0x6A2C9A, 0xEDE6D8, 0x2A2C33];
      for (e = 0; e < 3; e++) {
        rb(g, w - 4, 1.5, 13, 0, 0x7A5634, 0, 6 + e * 25, 0.5);
        var x = -w / 2 + 4;
        for (i = 0; x < w / 2 - 8; i++) {
          var bw = 3 + alea(i * 7 + e) * 4, bh = 14 + alea(i * 3 + e) * 7;
          var livre = rb(g, bw, bh, 10, 0.4, couleurs[(i + e * 3) % 7], x + bw / 2, 7.5 + e * 25, 1.5);
          if (alea(i + e * 11) > 0.85) { livre.rotation.z = 0.25; }
          x += bw + 0.6;
        }
      }
    },
    fauteuil: function (g, o) {
      var c = hex(o.couleur, 0xC0303A);
      ombre(g, 30, 30, 0.5);
      cyl(g, 13, 13, 2, C.noir, 0, 0, 0, 5);
      cyl(g, 1.5, 1.5, 14, C.metal, 0, 2, 0, 8);
      rb(g, 26, 7, 24, 3, c, 0, 16, 0);
      rb(g, 24, 42, 6, 3, c, 0, 18, -11);
      rb(g, 14, 10, 6.5, 3, C.noir, 0, 46, -11);
      rb(g, 4, 3, 18, 1.2, C.noir, -14, 26, 0);
      rb(g, 4, 3, 18, 1.2, C.noir, 14, 26, 0);
    },
    pouf: function (g, o) { ombre(g, 26, 26, 0.5); rb(g, 26, 18, 26, 12, hex(o.couleur, 0xC0303A), 0, 0, 0); },
    tapis: function (g, o) {
      var w = o.w || 100, d = o.d || 60, c = hex(o.couleur, 0x5C5348);
      rb(g, w, 1, d, 2, c, 0, 0.3, 0);
      rb(g, w - 8, 1.1, d - 8, 1.5, c + 0x0A0A0A, 0, 0.35, 0);
    },
    plante: function (g, o) {
      ombre(g, 22, 22, 0.5);
      rb(g, 15, 15, 15, 4, hex(o.pot, 0xE8E2D6), 0, 0, 0);
      feuillage(g, 11, 0x3F7D3A, 0, 26, 0);
      feuillage(g, 8, 0x5A9A4A, 6, 34, 3);
      feuillage(g, 7, 0x2F6B34, -5, 33, -4);
      feuillage(g, 6, 0x4E8A4C, 1, 41, -1);
    },
    arbre: function (g) {
      ombre(g, 90, 90, 0.55);
      cyl(g, 6, 3.5, 60, matBois('#6B4A2E'), 0, 0, 0, 10);
      feuillage(g, 30, 0x2F6B34, 0, 74, 0);
      feuillage(g, 22, 0x3E8A42, 18, 88, 10);
      feuillage(g, 20, 0x356F3A, -16, 86, -8);
      feuillage(g, 16, 0x4E9A4C, 4, 102, -2);
    },
    tablejardin: function (g) {
      ombre(g, 120, 120, 0.45);
      cyl(g, 30, 30, 3, 0xE6E1D8, 0, 33, 0, 32);
      cyl(g, 4, 2, 33, 0x9EA4AE, 0, 0, 0, 12);
      cyl(g, 1.2, 1.2, 92, 0xE6E1D8, 0, 36, 0, 8);
      var parasol = new THREE.Mesh(new THREE.ConeGeometry(62, 18, 8), mat(0xECE5D6));
      parasol.position.set(0, 128, 0);
      g.add(parasol);
      for (var i = 0; i < 4; i++) {
        var a = i * Math.PI / 2 + Math.PI / 4;
        chaise(g, Math.cos(a) * 44, Math.sin(a) * 44, -a - Math.PI / 2, 0xD8D2C6);
      }
      cyl(g, 3, 4, 6, 0xF0EDE6, 8, 36, 4, 12);
    },
    transat: function (g) {
      ombre(g, 30, 78, 0.5);
      rb(g, 26, 5, 64, 1.5, matBois('#A47A50'), 0, 8, 8);
      for (var i = -1; i <= 1; i += 2) { rb(g, 3, 8, 3, 0.5, matBois('#A47A50'), i * 10, 0, 34); rb(g, 3, 8, 3, 0.5, matBois('#A47A50'), i * 10, 0, -18); }
      rb(g, 24, 4, 44, 2, 0xF2EEE6, 0, 13, 16);
      var dos = rb(g, 24, 4, 32, 2, 0xF2EEE6, 0, 14, -26);
      dos.rotation.x = 0.75;
      dos.position.y = 22;
    }
  };

  var FACES = { bas: 0, droite: Math.PI / 2, haut: Math.PI, gauche: -Math.PI / 2 };

  function texSol(z) {
    var nom = (z.nom || z.piece || '').toLowerCase();
    if (z.type === 'exterieur') { return R.texTerrasse; }
    if (/sdb|bain|wc/.test(nom)) { return R.texBain; }
    if (/cuisine/.test(nom)) { return R.texCuisine; }
    if (/garage|buanderie/.test(nom)) { return R.texBeton; }
    return R.texParquet;
  }

  /* ---------- scène ---------- */

  function creer(conteneur, niveaux, options) {
    var renderer = obtenirMoteur().renderer;
    var scene = new THREE.Scene();
    PROFONDEUR = niveaux.length > 1;
    R = {
      mats: {}, geos: {},
      texParquet: texParquet(), texBeton: texBeton(), texTerrasse: texTerrasse(),
      texBain: texCarrelage([196, 200, 206], 'rgba(120,124,132,0.9)', 8),
      texCuisine: texCarrelage([92, 94, 100], 'rgba(40,42,48,0.9)', 4),
      texLueur: texRadial([[0, 'rgba(255,200,110,0.9)'], [0.45, 'rgba(255,160,60,0.32)'], [1, 'rgba(255,140,40,0)']]),
      texOmbre: texRadial([[0, 'rgba(0,0,0,0.75)'], [0.55, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']])
    };
    var ressources = R;
    var echelleSol = 1 / 170;
    var textures = [R.texParquet, R.texBeton, R.texTerrasse, R.texBain, R.texCuisine];
    for (var t = 0; t < textures.length; t++) { textures[t].repeat.set(echelleSol, echelleSol); }

    var cliquables = [], zones3d = [], icones = [], groupes = [];
    var ctx = { tvs: [] };
    var global = { x1: 1e9, z1: 1e9, x2: -1e9, z2: -1e9, h: 0 };

    // 2 lumières seulement (limite des iPad) : ciel/sol + soleil chaud
    scene.add(new THREE.HemisphereLight(0xC7D2F0, 0x5A4A3A, 0.85));
    var soleil = new THREE.DirectionalLight(0xFFF1DE, 0.55);
    soleil.position.set(-500, 900, 650);
    scene.add(soleil);
    var matMur = mat(C.mur), matHautMur = lumineux(C.hautMur);

    function construireNiveau(nv) {
      var pl = nv.plan, alt = nv.alt || 0, i, j;
      var groupe = new THREE.Group();
      groupe.position.set(nv.dx || 0, alt, nv.dz || 0);
      scene.add(groupe);
      groupes.push(groupe);
      global.x1 = Math.min(global.x1, nv.dx || 0); global.z1 = Math.min(global.z1, nv.dz || 0);
      global.x2 = Math.max(global.x2, (nv.dx || 0) + pl.largeur); global.z2 = Math.max(global.z2, (nv.dz || 0) + pl.hauteur);
      global.h = Math.max(global.h, alt);

      rb(groupe, pl.largeur + (alt ? 8 : 30), alt ? 8 : 10, pl.hauteur + (alt ? 8 : 30), 0, C.dalle,
        pl.largeur / 2, alt ? -8 : -10, pl.hauteur / 2);

      // murs : fond (haut du plan, côté droit) pleine hauteur, les autres coupés bas ; pas de cloison
      // à l'intérieur d'un espace ouvert
      var murs = segments(pl);
      for (i = 0; i < murs.length; i++) {
        var s = murs[i];
        if (s.ouvert) { continue; }
        var a = s.a, b = s.b, dx = b[0] - a[0], dy = b[1] - a[1];
        var fond = (a[1] === 0 && b[1] === 0) || (a[0] === pl.largeur && b[0] === pl.largeur);
        var h = fond ? MUR_HAUT : MUR_BAS;
        var mur = new THREE.Mesh(new THREE.BoxGeometry(Math.sqrt(dx * dx + dy * dy) + EP, h, EP),
          [matMur, matMur, matHautMur, matMur, matMur, matMur]);
        mur.position.set((a[0] + b[0]) / 2, h / 2, (a[1] + b[1]) / 2);
        mur.rotation.y = -Math.atan2(dy, dx);
        groupe.add(mur);
      }

      for (i = 0; i < nv.zones.length; i++) {
        var info = nv.zones[i], z = info.zone, type = z.type || 'piece';
        var polys = contours(z);
        var matSol = new THREE.MeshLambertMaterial({ map: texSol(z), color: type === 'decor' ? 0xB8B2AA : 0xFFFFFF });
        var tout = [];
        for (var k = 0; k < polys.length; k++) {
          var pts = polys[k], forme = new THREE.Shape();
          for (j = 0; j < pts.length; j++) {
            if (j === 0) { forme.moveTo(pts[j][0], -pts[j][1]); } else { forme.lineTo(pts[j][0], -pts[j][1]); }
          }
          var geo = new THREE.ShapeGeometry(forme);
          geo.rotateX(-Math.PI / 2);
          var sol = new THREE.Mesh(geo, matSol);
          sol.position.y = 0.4;
          sol.userData.zone = info;
          groupe.add(sol);
          cliquables.push(sol);
          tout = tout.concat(pts);
        }
        var bx = boite(tout);
        var cx = z.label ? z.label[0] : (bx.x1 + bx.x2) / 2, cy = z.label ? z.label[1] : (bx.y1 + bx.y2) / 2;
        if (!z.label && z.rects && z.rects.length > 1) { cx = z.rects[0][0] + z.rects[0][2] / 2; cy = z.rects[0][1] + z.rects[0][3] / 2; }
        var petit = (bx.x2 - bx.x1) < 100 || (bx.y2 - bx.y1) < 60;

        var lueur = new THREE.Mesh(new THREE.PlaneGeometry((bx.x2 - bx.x1) * 1.05, (bx.y2 - bx.y1) * 1.05),
          new THREE.MeshBasicMaterial({ map: R.texLueur, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
        lueur.rotation.x = -Math.PI / 2;
        lueur.position.set((bx.x1 + bx.x2) / 2, 1.2, (bx.y1 + bx.y2) / 2);
        lueur.visible = false;
        groupe.add(lueur);

        var lab = spriteTexte(petit ? 115 : 180, petit);
        lab.position.set(cx, MUR_HAUT + (petit ? 8 : 20), cy);
        groupe.add(lab);

        var lums = info.piece ? options.lumieres(info.eids) : [];
        for (j = 0; j < lums.length; j++) {
          var ic = spriteIcone('💡');
          ic.position.set(cx + (j - (lums.length - 1) / 2) * 36, MUR_BAS + 34, cy + (petit ? 0 : 24));
          ic.userData.basculer = lums[j];
          groupe.add(ic);
          cliquables.push(ic);
          icones.push({ sprite: ic, eid: lums[j], couleur: '#FFB547' });
        }
        zones3d.push({ info: info, type: type, matSol: matSol, lueur: lueur, lab: lab });
      }

      var meubles = pl.meubles || [];
      for (i = 0; i < meubles.length; i++) {
        var mb = meubles[i], fab = MEUBLES[mb.t];
        if (!fab) { continue; }
        var g = new THREE.Group();
        fab(g, mb, ctx);
        g.position.set(mb.x, 0, mb.y);
        g.rotation.y = FACES[mb.face] || 0;
        groupe.add(g);
      }
      for (i = 0; i < ctx.tvs.length; i++) {
        var tv = ctx.tvs[i];
        if (tv.icone) { continue; }
        tv.icone = spriteIcone('📺');
        tv.icone.position.set(0, tv.hauteur, 6);
        tv.icone.userData.basculer = tv.entite;
        tv.groupe.add(tv.icone);
        tv.ecran.userData.basculer = tv.entite;
        cliquables.push(tv.icone, tv.ecran);
        icones.push({ sprite: tv.icone, eid: tv.entite, couleur: '#A77BFF' });
      }
      var cams = pl.cameras || [];
      for (i = 0; i < cams.length; i++) {
        var rep = spriteIcone('📷');
        rep.userData.dessiner(true, '#7C5CFF');
        rep.position.set(cams[i].pos[0], MUR_HAUT + 18, cams[i].pos[1]);
        rep.userData.camera = cams[i].entity_id;
        groupe.add(rep);
        cliquables.push(rep);
      }
    }

    for (var n = 0; n < niveaux.length; n++) { construireNiveau(niveaux[n]); }

    var cxg = (global.x1 + global.x2) / 2, czg = (global.z1 + global.z2) / 2;
    for (n = 0; n < groupes.length; n++) { groupes[n].position.x -= cxg; groupes[n].position.z -= czg; }

    var cam = new THREE.PerspectiveCamera(36, 1, 10, 6000);
    var dist = Math.max(global.x2 - global.x1, global.z2 - global.z1) + global.h * 1.1;
    if (niveaux.length > 1) {   // vue globale : plus basse, de face, pour voir sous l'étage
      cam.position.set(-dist * 0.42, dist * 0.5 + global.h, dist * 0.88);
    } else {
      cam.position.set(-dist * 0.36, dist * 0.8 + global.h * 0.3, dist * 0.72);
    }
    var canvas = renderer.domElement;
    conteneur.appendChild(canvas);
    var controles = new THREE.OrbitControls(cam, canvas);
    controles.target.set(0, global.h * 0.4, 0);
    controles.enableDamping = true;
    controles.dampingFactor = 0.12;
    controles.enablePan = false;
    controles.rotateSpeed = 0.6;
    controles.minPolarAngle = 0.15;
    controles.maxPolarAngle = 1.32;
    controles.minAzimuthAngle = -1.45;   // rester du côté de la coupe (murs avant bas)
    controles.maxAzimuthAngle = 0.55;
    controles.minDistance = dist * 0.25;
    controles.maxDistance = dist * 1.7;
    controles.update();

    var enAttente = false, actif = true;
    function rendu() {
      if (enAttente || !actif) { return; }
      enAttente = true;
      window.requestAnimationFrame(function () {
        enAttente = false;
        if (!actif) { return; }
        var bouge = controles.update();
        renderer.render(scene, cam);
        if (bouge) { rendu(); }
      });
    }
    controles.addEventListener('change', rendu);

    function taille() {
      var l = conteneur.clientWidth || 800, h = conteneur.clientHeight || 520;
      renderer.setSize(l, h);
      cam.aspect = l / h;
      cam.updateProjectionMatrix();
      rendu();
    }
    window.addEventListener('resize', taille);

    var depart = null, raycaster = new THREE.Raycaster();
    function point(ev) {
      var tt = ev.changedTouches ? ev.changedTouches[0] : ev;
      return { x: tt.clientX, y: tt.clientY, t: new Date().getTime() };
    }
    function debut(ev) { depart = (ev.touches && ev.touches.length > 1) ? null : point(ev); }
    function fin(ev) {
      if (!depart) { return; }
      var p = point(ev);
      var bouge = Math.abs(p.x - depart.x) + Math.abs(p.y - depart.y), duree = p.t - depart.t;
      depart = null;
      if (bouge > 12 || duree > 600) { return; }
      var r = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2(((p.x - r.left) / r.width) * 2 - 1, -((p.y - r.top) / r.height) * 2 + 1), cam);
      raycaster.camera = cam;
      var touches = raycaster.intersectObjects(cliquables);
      var choix = null;
      for (var i = 0; i < touches.length; i++) {   // priorité aux icônes, puis au premier sol touché
        var o = touches[i].object;
        if (o.userData.basculer || o.userData.camera) { choix = o; break; }
        if (!choix) { choix = o; }
      }
      if (!choix) { return; }
      if (choix.userData.camera) { options.camera(choix.userData.camera); return; }
      if (choix.userData.basculer) { options.basculer(choix.userData.basculer); maj(); return; }
      var zi = choix.userData.zone;
      if (zi && zi.piece) { options.ouvrir(zi.piece); }
    }
    canvas.addEventListener('touchstart', debut, false);
    canvas.addEventListener('touchend', fin, false);
    canvas.addEventListener('mousedown', debut, false);
    canvas.addEventListener('mouseup', fin, false);

    function maj() {
      var i;
      for (i = 0; i < zones3d.length; i++) {
        var q = zones3d[i];
        var res = q.info.piece ? options.resume(q.info.eids) : { actif: false, texte: '' };
        q.lueur.visible = res.actif;
        q.matSol.emissive.setHex(res.actif ? 0x3A2208 : 0x000000);
        q.lab.userData.ecrire(q.info.zone.nom || q.info.zone.piece, res.actif ? res.texte : '');
      }
      for (i = 0; i < icones.length; i++) { icones[i].sprite.userData.dessiner(options.actif(icones[i].eid), icones[i].couleur); }
      for (i = 0; i < ctx.tvs.length; i++) {
        var tv = ctx.tvs[i], on = options.actif(tv.entite);
        tv.ecran.material.color.setHex(on ? (tv.ambilight && options.actif(tv.ambilight) ? 0x8A5CFF : 0x3E7BFF) : 0x0B0D12);
      }
      rendu();
    }

    taille();
    maj();

    return {
      maj: maj,
      detruire: function () {
        actif = false;
        window.removeEventListener('resize', taille);
        canvas.removeEventListener('touchstart', debut, false);
        canvas.removeEventListener('touchend', fin, false);
        canvas.removeEventListener('mousedown', debut, false);
        canvas.removeEventListener('mouseup', fin, false);
        controles.dispose();
        scene.traverse(function (o) {
          if (o.geometry) { o.geometry.dispose(); }
          var mats = o.material ? (o.material.length ? o.material : [o.material]) : [];
          for (var k = 0; k < mats.length; k++) { if (mats[k].map) { mats[k].map.dispose(); } mats[k].dispose(); }
        });
        for (var cle in ressources.geos) { if (ressources.geos.hasOwnProperty(cle)) { ressources.geos[cle].dispose(); } }
        if (canvas.parentNode) { canvas.parentNode.removeChild(canvas); }
      }
    };
  }

  window.Plan3D = { disponible: disponible, segments: segments, creer: creer };
})();
