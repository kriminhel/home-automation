/* Maquette 3D « maison de poupée » en coupe (Three.js r110, ES5 uniquement).
   Construite depuis maison.json → niveaux[].plan : sols, murs (fond hauts, avant coupés bas),
   meubles, lueur des pièces allumées, icônes 💡 / 📺 interactives, étiquettes.
   Un doigt = tourner, deux doigts = zoomer, toucher court = icône (bascule) ou pièce (commandes).

   window.Plan3D.disponible()
   window.Plan3D.creer(conteneur, niveaux, options) -> { maj(), detruire() }
     niveaux : [{ plan, zones: [{zone, piece, eids}], dx, dz, alt }]
     options : resume(eids) -> {actif, texte} · actif(eid) -> bool · ouvrir(piece)
               basculer(eid) · camera(entity_id) · lumieres(eids) -> eids des lumières (hors groupes)
*/
(function () {
  'use strict';

  var MUR_HAUT = 100, MUR_BAS = 42, EP = 7;
  var C = {
    mur: 0xD9D4CC, hautMur: 0x3A3F4E, sol: 0x34302C, solDecor: 0x26282F, solExt: 0x2C4A36,
    solAllume: 0x6B4A22, dalle: 0x1A1C24,
    blanc: 0xEDEDED, noir: 0x1A1B20, bois: 0x8B5A2B, boisClair: 0xB98B5E, metal: 0x9AA0AC
  };

  var moteur = null;

  function disponible() {
    if (!window.THREE || !THREE.OrbitControls) { return false; }
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  function obtenirMoteur() {
    if (!moteur) {
      var r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      moteur = { renderer: r };
    }
    return moteur;
  }

  function hex(c, defaut) { return c ? parseInt(String(c).replace('#', ''), 16) : defaut; }

  /* ---------- textures canvas ---------- */

  function textureLueur() {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var g = c.getContext('2d');
    var d = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    d.addColorStop(0, 'rgba(255,200,110,0.9)');
    d.addColorStop(0.45, 'rgba(255,160,60,0.32)');
    d.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = d;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  function spriteTexte(largeur, petit) {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 160;
    var tex = new THREE.CanvasTexture(c);
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
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

  // Icône ronde (💡, 📺, 📷) : fond coloré si actif, gris sinon
  function spriteIcone(symbole) {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var tex = new THREE.CanvasTexture(c);
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.scale.set(34, 34, 1);
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
      g.fillStyle = actif ? couleur : 'rgba(40,44,56,0.92)';
      g.fill();
      g.lineWidth = 6;
      g.strokeStyle = actif ? 'rgba(255,255,255,0.95)' : 'rgba(200,205,220,0.6)';
      g.stroke();
      g.font = '62px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.globalAlpha = actif ? 1 : 0.75;
      g.fillText(symbole, 64, 70);
      g.globalAlpha = 1;
      tex.needsUpdate = true;
    };
    return s;
  }

  /* ---------- meubles (repère local : centre au sol, avant = +z, largeur w sur x, profondeur d sur z) ---------- */

  var cacheMat = {};
  function mat(couleur) {
    if (!cacheMat[couleur]) { cacheMat[couleur] = new THREE.MeshLambertMaterial({ color: couleur }); }
    return cacheMat[couleur];
  }

  function bloc(g, w, h, d, couleur, x, y, z, m) {
    var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m || mat(couleur));
    b.position.set(x || 0, (y || 0) + h / 2, z || 0);
    g.add(b);
    return b;
  }

  function cylindre(g, r, h, couleur, x, y, z, rHaut) {
    var c = new THREE.Mesh(new THREE.CylinderGeometry(rHaut === undefined ? r : rHaut, r, h, 20), mat(couleur));
    c.position.set(x || 0, (y || 0) + h / 2, z || 0);
    g.add(c);
    return c;
  }

  function boule(g, r, couleur, x, y, z) {
    var s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(couleur));
    s.position.set(x || 0, y || 0, z || 0);
    g.add(s);
    return s;
  }

  function lumineux(couleur) { return new THREE.MeshBasicMaterial({ color: couleur }); }

  function chaise(g, x, z, rot, couleur) {
    var c = new THREE.Group();
    bloc(c, 18, 3, 18, couleur, 0, 20, 0);
    bloc(c, 18, 22, 3, couleur, 0, 23, -8);
    var pieds = [[-7, -7], [7, -7], [-7, 7], [7, 7]];
    for (var i = 0; i < 4; i++) { bloc(c, 2.5, 20, 2.5, couleur, pieds[i][0], 0, pieds[i][1]); }
    c.position.set(x, 0, z);
    c.rotation.y = rot;
    g.add(c);
  }

  var MEUBLES = {
    lit: function (g, m) {
      var w = m.w || 60, d = m.d || 105, i;
      bloc(g, w, 16, d, C.bois, 0, 0, 0);
      bloc(g, w - 4, 10, d - 6, C.blanc, 0, 16, 2);
      bloc(g, w - 2, 5, d * 0.62, hex(m.drap, 0x8899AA), 0, 24, d * 0.17);
      var n = m.double ? 2 : 1;
      for (i = 0; i < n; i++) {
        bloc(g, (w - 12) / n, 6, 14, 0xF7F4EE, n === 1 ? 0 : (i ? 1 : -1) * w / 4, 26, -d / 2 + 13);
      }
      bloc(g, w + 4, 42, 5, C.bois, 0, 0, -d / 2 - 1);
      var cotes = m.double ? [-1, 1] : [1];
      for (i = 0; i < cotes.length; i++) {
        bloc(g, 16, 20, 16, C.boisClair, cotes[i] * (w / 2 + 11), 0, -d / 2 + 9);
        cylindre(g, 3, 10, 0xFFE2A8, cotes[i] * (w / 2 + 11), 20, -d / 2 + 9, 5);
      }
    },
    tv: function (g, m, ctx) {
      var w = m.w || 70, h = w * 0.56;
      bloc(g, w * 1.15, 14, 16, C.noir, 0, 0, 2);
      bloc(g, w, h, 3, C.noir, 0, 22, -4);
      var ecran = new THREE.Mesh(new THREE.PlaneGeometry(w - 4, h - 4), new THREE.MeshBasicMaterial({ color: 0x0B0D12 }));
      ecran.position.set(0, 22 + h / 2, -2.4);
      g.add(ecran);
      if (m.entite) { ctx.tvs.push({ ecran: ecran, entite: m.entite, ambilight: m.ambilight, groupe: g, hauteur: 22 + h + 22 }); }
    },
    ps5: function (g) {
      bloc(g, 7, 26, 20, 0xF4F4F6, -4, 0, 0);
      bloc(g, 3, 26, 20, 0x111216, 1, 0, 0);
      bloc(g, 7, 26, 20, 0xF4F4F6, 6, 0, 0);
      bloc(g, 1, 24, 1, 0x3D7BFF, 2.6, 1, 10, lumineux(0x3D7BFF));
      bloc(g, 12, 3, 8, 0xF4F4F6, 0, 0, 22);
    },
    canape: function (g, m) {
      var w = m.w || 150, d = m.d || 44, c = hex(m.couleur, C.noir);
      bloc(g, w, 16, d, c, 0, 0, 0);
      bloc(g, w, 34, 11, c, 0, 0, -d / 2 + 5);
      bloc(g, 10, 24, d, c, -w / 2 + 5, 0, 0);
      bloc(g, 10, 24, d, c, w / 2 - 5, 0, 0);
      var n = Math.max(2, Math.round(w / 55));
      for (var i = 0; i < n; i++) {
        bloc(g, (w - 24) / n - 2, 6, d - 14, 0x2A2C33, -w / 2 + 12 + (i + 0.5) * (w - 24) / n, 16, 4);
      }
    },
    tablebasse: function (g, m) {
      bloc(g, m.w || 80, 4, m.d || 44, C.boisClair, 0, 16, 0);
      bloc(g, (m.w || 80) - 8, 2, (m.d || 44) - 8, C.noir, 0, 4, 0);
      cylindre(g, 4, 6, 0xE0D5C0, 10, 20, 0, 5);
    },
    table: function (g, m) {
      var w = m.w || 150, d = m.d || 78, b = hex(m.bois, C.bois);
      bloc(g, w, 7, d, b, 0, 36, 0);
      bloc(g, 10, 36, d - 16, b, -w / 2 + 14, 0, 0);
      bloc(g, 10, 36, d - 16, b, w / 2 - 14, 0, 0);
      bloc(g, w - 30, 6, 6, b, 0, 10, 0);
      var n = m.chaises || 6, cote = Math.ceil((n - 2) / 2), pas = w / (cote + 1);
      for (var i = 0; i < cote; i++) {
        chaise(g, -w / 2 + pas * (i + 1), -d / 2 - 12, 0, 0x2B2B30);
        chaise(g, -w / 2 + pas * (i + 1), d / 2 + 12, Math.PI, 0x2B2B30);
      }
      chaise(g, -w / 2 - 14, 0, Math.PI / 2, 0x2B2B30);
      chaise(g, w / 2 + 14, 0, -Math.PI / 2, 0x2B2B30);
      cylindre(g, 7, 10, 0xE8E2D6, 0, 43, 0, 9);
      boule(g, 8, 0x4E8A4C, 0, 58, 0);
    },
    billard: function (g, m) {
      var w = m.w || 150, d = m.d || 82, i;
      bloc(g, w - 8, 26, d - 8, 0x4A2A14, 0, 8, 0);
      bloc(g, w, 6, d, 0x5C3418, 0, 34, 0);
      bloc(g, w - 12, 1.5, d - 12, 0x1F7A42, 0, 39.5, 0);
      var pieds = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (i = 0; i < 4; i++) { bloc(g, 9, 10, 9, 0x3A2010, pieds[i][0] * (w / 2 - 10), 0, pieds[i][1] * (d / 2 - 10)); }
      var couleurs = [0xFFFFFF, 0xE8C21E, 0x2350C8, 0xD0302A, 0x6A2C9A, 0xE07A1F, 0x1E8A3A, 0x111111];
      for (i = 0; i < couleurs.length; i++) {
        boule(g, 2.6, couleurs[i], (i === 0 ? -w / 4 : w / 8 + (i % 3) * 5), 43.5, (i === 0 ? 0 : ((i % 4) - 1.5) * 5.5));
      }
      bloc(g, w * 0.7, 1.5, 1.5, 0xC9A26B, -6, 41, d / 2 - 14);
      cylindre(g, 1, 40, 0x2B2B30, 0, 95, 0);
      cylindre(g, 14, 8, 0x1E8A3A, 0, 87, 0, 4);
    },
    arcade: function (g, m) {
      var c = hex(m.couleur, 0x5B2A9E);
      bloc(g, 34, 60, 30, c, 0, 0, -2);
      bloc(g, 34, 34, 18, c, 0, 60, -8);
      bloc(g, 34, 6, 14, 0x15161B, 0, 52, 8);
      var ecran = new THREE.Mesh(new THREE.PlaneGeometry(26, 22), lumineux(0x38E1FF));
      ecran.position.set(0, 76, 1.2);
      ecran.rotation.x = -0.25;
      g.add(ecran);
      bloc(g, 34, 9, 10, 0xFFD34E, 0, 94, -10, lumineux(0xFFD34E));
      boule(g, 2.2, 0xD0302A, -7, 59, 9);
      boule(g, 2.2, 0x2350C8, 4, 59, 9);
      boule(g, 2.2, 0xE8C21E, 9, 59, 9);
    },
    comptoir: function (g, m) {
      var w = m.w || 120, d = m.d || 36;
      bloc(g, w, 34, d, 0xE9E6E0, 0, 0, 0);
      bloc(g, w + 2, 3, d + 2, 0x2A2A2E, 0, 34, 0);
      if (m.plaque) { bloc(g, 34, 0.6, 24, 0x0D0D10, w / 4, 37, 0); bloc(g, 22, 4, 14, C.metal, -w / 4, 37, 0); }
    },
    ilot: function (g, m) {
      var w = m.w || 120, d = m.d || 50;
      bloc(g, w, 34, d, 0x2E3140, 0, 0, 0);
      bloc(g, w + 8, 3, d + 6, 0xEDEBE6, 0, 34, 0);
      for (var i = -1; i <= 1; i++) { cylindre(g, 6, 26, C.metal, i * w / 3, 0, d / 2 + 14, 6); }
      cylindre(g, 6, 8, 0xD86B2A, -w / 4, 37, 0, 8);
    },
    frigo: function (g) { bloc(g, 36, 82, 34, 0xC7CBD2, 0, 0, 0); bloc(g, 2, 30, 1, 0x555A66, 12, 45, 17.5); },
    buffet: function (g, m) {
      bloc(g, m.w || 140, 30, m.d || 26, C.boisClair, 0, 0, 0);
      cylindre(g, 6, 14, 0xF0EDE6, -30, 30, 0, 4);
      boule(g, 9, 0x4E8A4C, -30, 48, 0);
      bloc(g, 22, 18, 3, 0xD9C8A0, 30, 30, -6);
    },
    voiture: function (g, m) {
      var w = m.w || 100, d = m.d || 230;
      bloc(g, w, 24, d, 0x2F5A9E, 0, 12, 0);
      bloc(g, w - 12, 22, d * 0.48, 0x1A2A3E, 0, 36, -d * 0.06);
      var roues = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (var i = 0; i < 4; i++) {
        var r = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 12, 18), mat(0x111111));
        r.rotation.z = Math.PI / 2;
        r.position.set(roues[i][0] * (w / 2 - 4), 15, roues[i][1] * d * 0.32);
        g.add(r);
      }
      bloc(g, 18, 6, 2, 0xFFF3C4, -w / 2 + 16, 24, d / 2, lumineux(0xFFF3C4));
      bloc(g, 18, 6, 2, 0xFFF3C4, w / 2 - 16, 24, d / 2, lumineux(0xFFF3C4));
    },
    lavelinge: function (g) {
      bloc(g, 34, 40, 34, C.blanc, 0, 0, 0);
      var hublot = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 2, 20), mat(0x6F7B8C));
      hublot.rotation.x = Math.PI / 2;
      hublot.position.set(0, 20, 17.5);
      g.add(hublot);
    },
    armoire: function (g, m) {
      var w = m.w || 120, d = m.d || 28, n = Math.max(2, Math.round(w / 45));
      bloc(g, w, 90, d, 0xCDB9A0, 0, 0, 0);
      for (var i = 1; i < n; i++) { bloc(g, 1, 86, 1, 0x7A6650, -w / 2 + i * w / n, 2, d / 2 + 0.5); }
    },
    escalier: function (g, m) {
      var w = m.w || 60, d = m.d || 170, n = 12, h = 100;
      for (var i = 0; i < n; i++) { bloc(g, w, h * (i + 1) / n, d / n, 0x8E7A62, 0, 0, d / 2 - (i + 0.5) * d / n); }
      bloc(g, 3, 30, d, C.metal, w / 2, h / 2, 0);
    },
    douche: function (g, m) {
      var w = m.w || 46, d = m.d || 56;
      bloc(g, w, 3, d, C.blanc, 0, 0, 0);
      bloc(g, w, 70, 1.5, 0xBFE3F0, 0, 3, d / 2, new THREE.MeshLambertMaterial({ color: 0xBFE3F0, transparent: true, opacity: 0.35 }));
      cylindre(g, 1, 60, C.metal, -w / 2 + 6, 3, -d / 2 + 4);
      cylindre(g, 6, 2, C.metal, -w / 2 + 6, 62, -d / 2 + 10);
    },
    baignoire: function (g, m) {
      var w = m.w || 130, d = m.d || 42;
      bloc(g, w, 24, d, C.blanc, 0, 0, 0);
      bloc(g, w - 10, 1, d - 10, 0x8FD0E8, 0, 22, 0);
    },
    lavabo: function (g) {
      bloc(g, 40, 30, 22, C.boisClair, 0, 0, 0);
      bloc(g, 30, 4, 18, C.blanc, 0, 30, 1);
      bloc(g, 30, 30, 1.5, 0x8FA9C2, 0, 40, -10, lumineux(0x8FA9C2));
    },
    wc: function (g) {
      bloc(g, 14, 15, 18, C.blanc, 0, 0, 3);
      bloc(g, 16, 24, 7, C.blanc, 0, 0, -8);
    },
    console: function (g, m) {
      bloc(g, m.w || 60, 30, m.d || 20, C.boisClair, 0, 0, 0);
      cylindre(g, 5, 10, 0xE8E2D6, 15, 30, 0, 7);
    },
    bureau: function (g, m) {
      var w = m.w || 80, d = m.d || 34;
      bloc(g, w, 3, d, C.blanc, 0, 32, 0);
      bloc(g, 3, 32, d, C.blanc, -w / 2 + 2, 0, 0);
      bloc(g, 3, 32, d, C.blanc, w / 2 - 2, 0, 0);
      bloc(g, 34, 20, 2, C.noir, 0, 37, -d / 2 + 5);
      bloc(g, 30, 16, 1, 0x2F5FAF, 0, 39, -d / 2 + 6.2, lumineux(0x2F5FAF));
      chaise(g, 0, d / 2 + 6, Math.PI, 0xE0E0E0);
    },
    biblio: function (g, m) {
      var w = m.w || 80;
      bloc(g, w, 80, 14, C.boisClair, 0, 0, 0);
      var couleurs = [0xC0303A, 0x2D7BD8, 0xE8C21E, 0x3E9A5A, 0x6A2C9A];
      for (var e = 0; e < 3; e++) {
        for (var i = 0; i < 7; i++) { bloc(g, w / 9, 16, 10, couleurs[(i + e) % 5], -w / 2 + 6 + i * w / 8, 6 + e * 25, 3); }
      }
    },
    fauteuil: function (g, m) {
      var c = hex(m.couleur, 0xC0303A);
      bloc(g, 26, 14, 26, c, 0, 8, 0);
      bloc(g, 26, 34, 6, c, 0, 8, -11);
      cylindre(g, 2, 8, C.noir, 0, 0, 0);
    },
    pouf: function (g, m) { cylindre(g, 14, 18, hex(m.couleur, 0xC0303A), 0, 0, 0, 13); },
    tapis: function (g, m) { bloc(g, m.w || 100, 1, m.d || 60, hex(m.couleur, 0x5C5348), 0, 0.6, 0); },
    plante: function (g) { cylindre(g, 7, 14, 0xC9B79C, 0, 0, 0, 9); boule(g, 14, 0x3F7D3A, 0, 28, 0); boule(g, 9, 0x5A9A4A, 6, 38, 3); },
    arbre: function (g) { cylindre(g, 5, 50, 0x6B4A2E, 0, 0, 0); boule(g, 34, 0x2F6B34, 0, 70, 0); boule(g, 24, 0x3E8A42, 14, 88, 8); },
    tablejardin: function (g) {
      cylindre(g, 32, 4, 0xE6E1D8, 0, 34, 0);
      cylindre(g, 3, 34, C.metal, 0, 0, 0);
      cylindre(g, 1.5, 80, 0xE6E1D8, 0, 38, 0);
      var parasol = new THREE.Mesh(new THREE.ConeGeometry(60, 20, 8), mat(0xE9E2D2));
      parasol.position.set(0, 124, 0);
      g.add(parasol);
      for (var i = 0; i < 4; i++) {
        var a = i * Math.PI / 2 + Math.PI / 4;
        chaise(g, Math.cos(a) * 46, Math.sin(a) * 46, -a - Math.PI / 2, 0xE6E1D8);
      }
    },
    transat: function (g) {
      bloc(g, 26, 6, 70, C.boisClair, 0, 8, 6);
      var dos = bloc(g, 26, 4, 30, C.boisClair, 0, 20, -34);
      dos.rotation.x = 0.7;
      bloc(g, 24, 3, 50, 0xF2EEE6, 0, 14, 10);
    }
  };

  var FACES = { bas: 0, droite: Math.PI / 2, haut: Math.PI, gauche: -Math.PI / 2 };

  /* ---------- géométrie des zones ---------- */

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

  /* ---------- scène ---------- */

  function creer(conteneur, niveaux, options) {
    var renderer = obtenirMoteur().renderer;
    var scene = new THREE.Scene();
    cacheMat = {};
    var texLueur = textureLueur();
    var cliquables = [], zones3d = [], icones = [], groupes = [];
    var ctx = { tvs: [] };
    var global = { x1: 1e9, z1: 1e9, x2: -1e9, z2: -1e9, h: 0 };

    scene.add(new THREE.AmbientLight(0x9098B0, 0.72));
    var soleil = new THREE.DirectionalLight(0xFFFFFF, 0.5);
    soleil.position.set(-500, 900, 600);
    scene.add(soleil);
    var matMur = mat(C.mur);
    var matHautMur = lumineux(C.hautMur);

    function construireNiveau(nv) {
      var plan = nv.plan, alt = nv.alt || 0, i, j;
      var groupe = new THREE.Group();
      groupe.position.set(nv.dx || 0, alt, nv.dz || 0);
      scene.add(groupe);
      groupes.push(groupe);
      global.x1 = Math.min(global.x1, nv.dx || 0); global.z1 = Math.min(global.z1, nv.dz || 0);
      global.x2 = Math.max(global.x2, (nv.dx || 0) + plan.largeur); global.z2 = Math.max(global.z2, (nv.dz || 0) + plan.hauteur);
      global.h = Math.max(global.h, alt);

      bloc(groupe, plan.largeur + (alt ? 6 : 30), alt ? 8 : 10, plan.hauteur + (alt ? 6 : 30), C.dalle,
        plan.largeur / 2, alt ? -8 : -10, plan.hauteur / 2);

      function mur(a, b) {
        var dx = b[0] - a[0], dy = b[1] - a[1];
        // murs du fond (haut du plan et côté droit) pleine hauteur, les autres coupés bas : vue en coupe
        var fond = (a[1] === 0 && b[1] === 0) || (a[0] === plan.largeur && b[0] === plan.largeur);
        var h = fond ? MUR_HAUT : MUR_BAS;
        var m = new THREE.Mesh(new THREE.BoxGeometry(Math.sqrt(dx * dx + dy * dy) + EP, h, EP),
          [matMur, matMur, matHautMur, matMur, matMur, matMur]);
        m.position.set((a[0] + b[0]) / 2, h / 2, (a[1] + b[1]) / 2);
        m.rotation.y = -Math.atan2(dy, dx);
        groupe.add(m);
      }

      for (i = 0; i < nv.zones.length; i++) {
        var info = nv.zones[i], z = info.zone, type = z.type || 'piece';
        var polys = contours(z);
        var couleurSol = type === 'decor' ? C.solDecor : (type === 'exterieur' ? C.solExt : C.sol);
        var matSol = new THREE.MeshLambertMaterial({ color: couleurSol, side: THREE.DoubleSide });
        var tout = [];
        for (var k = 0; k < polys.length; k++) {
          var pts = polys[k], forme = new THREE.Shape();
          for (j = 0; j < pts.length; j++) {
            if (j === 0) { forme.moveTo(pts[j][0], -pts[j][1]); } else { forme.lineTo(pts[j][0], -pts[j][1]); }
          }
          var geo = new THREE.ShapeGeometry(forme);
          geo.rotateX(-Math.PI / 2);
          var sol = new THREE.Mesh(geo, matSol);
          sol.position.y = 0.5;
          sol.userData.zone = info;
          groupe.add(sol);
          cliquables.push(sol);
          if (type !== 'exterieur') { for (j = 0; j < pts.length; j++) { mur(pts[j], pts[(j + 1) % pts.length]); } }
          tout = tout.concat(pts);
        }
        var b = boite(tout);
        var cx = z.label ? z.label[0] : (b.x1 + b.x2) / 2, cy = z.label ? z.label[1] : (b.y1 + b.y2) / 2;
        if (!z.label && z.rects && z.rects.length > 1) { cx = z.rects[0][0] + z.rects[0][2] / 2; cy = z.rects[0][1] + z.rects[0][3] / 2; }
        var petit = (b.x2 - b.x1) < 100 || (b.y2 - b.y1) < 60;

        var lueur = new THREE.Mesh(new THREE.PlaneGeometry((b.x2 - b.x1) * 1.05, (b.y2 - b.y1) * 1.05),
          new THREE.MeshBasicMaterial({ map: texLueur, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        lueur.rotation.x = -Math.PI / 2;
        lueur.position.set((b.x1 + b.x2) / 2, 1.5, (b.y1 + b.y2) / 2);
        lueur.visible = false;
        groupe.add(lueur);
        var lampe = new THREE.PointLight(0xFFB45A, 0, Math.max(b.x2 - b.x1, b.y2 - b.y1) * 1.2, 1.5);
        lampe.position.set(cx, MUR_BAS + 30, cy);
        groupe.add(lampe);

        var lab = spriteTexte(petit ? 120 : 190, petit);
        lab.position.set(cx, MUR_HAUT + (petit ? 8 : 20), cy);
        groupe.add(lab);

        // une icône 💡 par lumière de la zone, en ligne au-dessus de la pièce
        var lums = info.piece ? options.lumieres(info.eids) : [];
        for (j = 0; j < lums.length; j++) {
          var ic = spriteIcone('💡');
          ic.position.set(cx + (j - (lums.length - 1) / 2) * 38, MUR_BAS + 30, cy + (petit ? 0 : 24));
          ic.userData.basculer = lums[j];
          groupe.add(ic);
          cliquables.push(ic);
          icones.push({ sprite: ic, eid: lums[j], couleur: '#FFB547' });
        }
        zones3d.push({ info: info, type: type, matSol: matSol, couleurSol: couleurSol, lueur: lueur, lampe: lampe, lab: lab });
      }

      var meubles = plan.meubles || [];
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
      var cams = plan.cameras || [];
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

    // centrer la maison sur l'origine
    var cxg = (global.x1 + global.x2) / 2, czg = (global.z1 + global.z2) / 2;
    for (n = 0; n < groupes.length; n++) { groupes[n].position.x -= cxg; groupes[n].position.z -= czg; }

    var cam = new THREE.PerspectiveCamera(36, 1, 10, 6000);
    var dist = Math.max(global.x2 - global.x1, global.z2 - global.z1) * 1.0 + global.h * 1.1;
    cam.position.set(-dist * 0.36, dist * 0.8 + global.h * 0.3, dist * 0.72);
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
    controles.minDistance = dist * 0.3;
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
      var t = ev.changedTouches ? ev.changedTouches[0] : ev;
      return { x: t.clientX, y: t.clientY, t: new Date().getTime() };
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
        q.lampe.intensity = res.actif ? 1.1 : 0;
        q.matSol.color.setHex(res.actif && q.type !== 'exterieur' ? C.solAllume : q.couleurSol);
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
          for (var m = 0; m < mats.length; m++) { if (mats[m].map) { mats[m].map.dispose(); } mats[m].dispose(); }
        });
        texLueur.dispose();
        if (canvas.parentNode) { canvas.parentNode.removeChild(canvas); }
      }
    };
  }

  window.Plan3D = { disponible: disponible, creer: creer };
})();
