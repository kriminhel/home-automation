/* Maquette 3D « en coupe » d'un niveau (Three.js r110, ES5 uniquement).
   Construite à partir de maison.json → niveaux[].plan (mêmes zones que le plan 2D) :
   sols, murs bas sans plafond, lueur + ampoule dans les pièces allumées, étiquettes.
   Un doigt = tourner, deux doigts = zoomer, toucher court = ouvrir la pièce.

   window.Plan3D.disponible()                      -> WebGL utilisable ?
   window.Plan3D.creer(conteneur, plan, options)   -> { maj(), detruire() }
     options.zones   : [{ zone, piece, eids }]  (une entrée par zone de plan.zones)
     options.resume  : function(eids) -> { actif, texte }
     options.ouvrir  : function(piece)          (toucher une pièce)
     options.camera  : function(entity_id)      (toucher un repère caméra)
*/
(function () {
  'use strict';

  var HAUTEUR_MUR = 70, EPAISSEUR = 7;
  var COULEURS = {
    mur: 0xD8D3CB, sol: 0x2B2F3A, solDecor: 0x1C1F28, solExt: 0x1E3A2C,
    solAllume: 0x6B4A22, ambre: 0xFFB04A, camera: 0xA77BFF
  };

  var moteur = null;  // un seul contexte WebGL pour toute la vie de la page

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

  /* ---------- textures dessinées sur canvas ---------- */

  function textureLueur() {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var g = c.getContext('2d');
    var d = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    d.addColorStop(0, 'rgba(255,200,110,0.95)');
    d.addColorStop(0.45, 'rgba(255,160,60,0.35)');
    d.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = d;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  function etiquette(nom, petit) {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 160;
    var tex = new THREE.CanvasTexture(c);
    var mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    var s = new THREE.Sprite(mat);
    var largeur = petit ? 95 : 150;
    s.scale.set(largeur, largeur * 160 / 512, 1);
    s.renderOrder = 10;
    var dernier = null;
    s.userData.ecrire = function (etat) {
      var cle = nom + '|' + etat;
      if (cle === dernier) { return; }
      dernier = cle;
      var g = c.getContext('2d');
      g.clearRect(0, 0, 512, 160);
      g.textAlign = 'center';
      g.shadowColor = 'rgba(0,0,0,0.85)';
      g.shadowBlur = 12;
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

  /* ---------- géométrie ---------- */

  function contours(zone) {
    // Liste de polygones [[x,y],...] (plan 2D) pour une zone faite de rectangles ou d'un polygone
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

  function creer(conteneur, plan, options) {
    var M = obtenirMoteur();
    var renderer = M.renderer;
    var scene = new THREE.Scene();
    var ox = plan.largeur / 2, oz = plan.hauteur / 2;
    function X(x) { return x - ox; }
    function Z(y) { return y - oz; }

    scene.add(new THREE.AmbientLight(0x8C93AD, 0.75));
    var soleil = new THREE.DirectionalLight(0xFFFFFF, 0.55);
    soleil.position.set(-400, 900, 500);
    scene.add(soleil);

    var matMur = new THREE.MeshLambertMaterial({ color: COULEURS.mur });
    var matHautMur = new THREE.MeshBasicMaterial({ color: 0x3A3F4E });
    var texLueur = textureLueur();
    var cliquables = [];
    var zones3d = [];

    // Socle sous la maison
    var socle = new THREE.Mesh(new THREE.BoxGeometry(plan.largeur + 40, 10, plan.hauteur + 40),
      new THREE.MeshLambertMaterial({ color: 0x151821 }));
    socle.position.y = -6;
    scene.add(socle);

    function mur(a, b) {
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var long = Math.sqrt(dx * dx + dy * dy) + EPAISSEUR;
      var m = new THREE.Mesh(new THREE.BoxGeometry(long, HAUTEUR_MUR, EPAISSEUR),
        [matMur, matMur, matHautMur, matMur, matMur, matMur]);
      m.position.set(X((a[0] + b[0]) / 2), HAUTEUR_MUR / 2, Z((a[1] + b[1]) / 2));
      m.rotation.y = -Math.atan2(dy, dx);
      scene.add(m);
    }

    for (var i = 0; i < options.zones.length; i++) {
      var info = options.zones[i];
      var z = info.zone;
      var type = z.type || 'piece';
      var polys = contours(z);
      var couleurSol = type === 'decor' ? COULEURS.solDecor : (type === 'exterieur' ? COULEURS.solExt : COULEURS.sol);
      var matSol = new THREE.MeshLambertMaterial({ color: couleurSol, emissive: 0x000000, side: THREE.DoubleSide });
      var tout = [];
      for (var k = 0; k < polys.length; k++) {
        var pts = polys[k];
        var forme = new THREE.Shape();
        for (var j = 0; j < pts.length; j++) {
          if (j === 0) { forme.moveTo(X(pts[j][0]), -Z(pts[j][1])); } else { forme.lineTo(X(pts[j][0]), -Z(pts[j][1])); }
        }
        var geo = new THREE.ShapeGeometry(forme);
        geo.rotateX(-Math.PI / 2);
        var sol = new THREE.Mesh(geo, matSol);
        sol.position.y = 0.5;
        sol.userData.zone = i;
        scene.add(sol);
        cliquables.push(sol);
        if (type !== 'exterieur') {
          for (j = 0; j < pts.length; j++) { mur(pts[j], pts[(j + 1) % pts.length]); }
        }
        tout = tout.concat(pts);
      }
      var b = boite(tout);
      var cx = z.label ? z.label[0] : (b.x1 + b.x2) / 2;
      var cy = z.label ? z.label[1] : (b.y1 + b.y2) / 2;
      if (!z.label && !z.poly && z.rects && z.rects.length > 1) {
        var r0 = z.rects[0];
        cx = r0[0] + r0[2] / 2; cy = r0[1] + r0[3] / 2;
      }
      var petit = (b.x2 - b.x1) < 100 || (b.y2 - b.y1) < 60;

      // Lueur au sol + ampoule (visibles seulement quand la pièce est allumée)
      var lueur = new THREE.Mesh(new THREE.PlaneGeometry((b.x2 - b.x1) * 1.05, (b.y2 - b.y1) * 1.05),
        new THREE.MeshBasicMaterial({ map: texLueur, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      lueur.rotation.x = -Math.PI / 2;
      lueur.position.set(X((b.x1 + b.x2) / 2), 1.5, Z((b.y1 + b.y2) / 2));
      lueur.visible = false;
      scene.add(lueur);
      var ampoule = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xFFE2A8 }));
      ampoule.position.set(X(cx), HAUTEUR_MUR * 0.85, Z(cy) - (petit ? 0 : 18));
      ampoule.visible = false;
      scene.add(ampoule);
      var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texLueur, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending }));
      halo.scale.set(70, 70, 1);
      halo.position.copy(ampoule.position);
      halo.visible = false;
      scene.add(halo);

      var lab = etiquette(z.nom || z.piece, petit);
      lab.position.set(X(cx), HAUTEUR_MUR + (petit ? 18 : 30), Z(cy));
      scene.add(lab);

      zones3d.push({ info: info, type: type, matSol: matSol, couleurSol: couleurSol, lueur: lueur,
        ampoule: ampoule, halo: halo, lab: lab });
    }

    // Repères caméra
    var cams = plan.cameras || [];
    for (i = 0; i < cams.length; i++) {
      var rep = new THREE.Mesh(new THREE.SphereGeometry(13, 20, 14),
        new THREE.MeshLambertMaterial({ color: COULEURS.camera, emissive: 0x4B2C99 }));
      rep.position.set(X(cams[i].pos[0]), HAUTEUR_MUR + 14, Z(cams[i].pos[1]));
      rep.userData.camera = cams[i].entity_id;
      scene.add(rep);
      cliquables.push(rep);
    }

    // Caméra et contrôles
    var cam = new THREE.PerspectiveCamera(38, 1, 10, 5000);
    var dist = Math.max(plan.largeur, plan.hauteur) * 1.25;
    cam.position.set(-dist * 0.35, dist * 0.8, dist * 0.75);
    var canvas = renderer.domElement;
    conteneur.appendChild(canvas);
    var controles = new THREE.OrbitControls(cam, canvas);
    controles.target.set(0, 0, 0);
    controles.enableDamping = true;
    controles.dampingFactor = 0.12;
    controles.enablePan = false;
    controles.rotateSpeed = 0.6;
    controles.minPolarAngle = 0.12;
    controles.maxPolarAngle = 1.2;
    controles.minDistance = dist * 0.45;
    controles.maxDistance = dist * 1.8;
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
      var l = conteneur.clientWidth || 800;
      var h = conteneur.clientHeight || 520;
      renderer.setSize(l, h);
      cam.aspect = l / h;
      cam.updateProjectionMatrix();
      rendu();
    }
    window.addEventListener('resize', taille);

    // Toucher court = sélection (un glissement fait tourner la maquette)
    var depart = null;
    var raycaster = new THREE.Raycaster();
    function point(ev) {
      var t = ev.changedTouches ? ev.changedTouches[0] : ev;
      return { x: t.clientX, y: t.clientY, t: new Date().getTime() };
    }
    function debut(ev) { depart = (ev.touches && ev.touches.length > 1) ? null : point(ev); }
    function fin(ev) {
      if (!depart) { return; }
      var p = point(ev);
      var bouge = Math.abs(p.x - depart.x) + Math.abs(p.y - depart.y);
      var duree = p.t - depart.t;
      depart = null;
      if (bouge > 12 || duree > 600) { return; }
      var r = canvas.getBoundingClientRect();
      var v = new THREE.Vector2(((p.x - r.left) / r.width) * 2 - 1, -((p.y - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(v, cam);
      var touches = raycaster.intersectObjects(cliquables);
      if (!touches.length) { return; }
      var o = touches[0].object;
      if (o.userData.camera) { options.camera(o.userData.camera); return; }
      var zi = options.zones[o.userData.zone];
      if (zi && zi.piece) { options.ouvrir(zi.piece); }
    }
    canvas.addEventListener('touchstart', debut, false);
    canvas.addEventListener('touchend', fin, false);
    canvas.addEventListener('mousedown', debut, false);
    canvas.addEventListener('mouseup', fin, false);

    function maj() {
      for (var n = 0; n < zones3d.length; n++) {
        var q = zones3d[n];
        var res = q.info.piece ? options.resume(q.info.eids) : { actif: false, texte: '' };
        q.lueur.visible = q.ampoule.visible = q.halo.visible = res.actif;
        q.matSol.color.setHex(res.actif && q.type !== 'exterieur' ? COULEURS.solAllume : q.couleurSol);
        q.matSol.emissive.setHex(res.actif ? 0x3A2408 : 0x000000);
        q.lab.userData.ecrire(res.actif ? res.texte : '');
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
          for (var m = 0; m < mats.length; m++) {
            if (mats[m].map) { mats[m].map.dispose(); }
            mats[m].dispose();
          }
        });
        texLueur.dispose();
        if (canvas.parentNode) { canvas.parentNode.removeChild(canvas); }
      }
    };
  }

  window.Plan3D = { disponible: disponible, creer: creer };
})();
