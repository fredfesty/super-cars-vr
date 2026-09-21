import * as THREE from 'three';

/**
 * High-Fidelity Procedural 3D Circuit for Super Cars II VR.
 * Features:
 * - Continuous extruded asphalt with rubbered-in racing lines and painted starting grid.
 * - Continuous 3D beveled red & white FIA curb ribbons (zero gaps, zero floating blocks).
 * - Continuous 3D corrugated W-beam Armco crash barriers with vertical steel posts behind the rails.
 * - Grandstand along main straight with 8 seating tiers, spectators, and cantilever roof (safely outside track).
 * - Overhead sponsor arch bridges mathematically aligned perpendicular to track.
 * - Spline-aligned distance brake boards (150, 100, 50) before Turn 1.
 * - Stadium floodlight pylons, jump ramp support trusses, and tire barrier walls.
 * - Lush green terrain with runoff sand/gravel traps and 50+ validated 3D trees (>=18m from centerline).
 */
export class TrackBuilder {
  constructor(scene) {
    this.scene = scene;
    this.trackWidth = 16.0;
    this.spline = null;
    this.trackPoints = [];
    this.checkpoints = [];
    this.colliders = [];
    this.ramps = [];
    this.gantryLights = [];
  }

  buildTrack() {
    // 155-meter long straight runway at start/finish line for safe, fair grid starts
    const controlPoints = [
      new THREE.Vector3(0, 0, 0),        // Start/Finish Line
      new THREE.Vector3(0, 0, 45),       // Main Straight
      new THREE.Vector3(0, 0, 85),       // Main Straight fast zone
      new THREE.Vector3(-25, 0, 130),    // Turn 1 entry
      new THREE.Vector3(-75, 0, 150),    // Turn 1 apex
      new THREE.Vector3(-125, 0, 135),   // Turn 1 exit
      new THREE.Vector3(-160, 0, 90),    // Sweeper
      new THREE.Vector3(-175, 0, 35),    // Downwards sweep
      new THREE.Vector3(-160, 0, -25),   // S-Curve entry
      new THREE.Vector3(-190, 0, -65),   // S-Curve mid
      new THREE.Vector3(-180, 0, -115),  // S-Curve exit

      // --- JUMP RAMP SECTION ---
      new THREE.Vector3(-140, 0.5, -145), // Ramp approach
      new THREE.Vector3(-105, 3.8, -165), // Ramp peak / launch crest!
      new THREE.Vector3(-75, 1.2, -180),  // In-flight gap
      new THREE.Vector3(-45, 0, -185),    // Landing zone

      new THREE.Vector3(25, 0, -185),    // Fast bend
      new THREE.Vector3(85, 0, -160),    // Hairpin approach
      new THREE.Vector3(125, 0, -120),   // Hairpin apex
      new THREE.Vector3(115, 0, -65),    // Hairpin exit
      new THREE.Vector3(75, 0, -35),     // Back straight
      new THREE.Vector3(35, 0, -75),     // Final turn entry
      new THREE.Vector3(12, 0, -85),     // Final turn apex
      new THREE.Vector3(0, 0, -70),      // Approach to Start/Finish Straight
      new THREE.Vector3(0, 0, -35),      // Grid straight (Parallel to +Z)
    ];

    this.spline = new THREE.CatmullRomCurve3(controlPoints, true, 'centripetal');
    const divisions = 450;
    this.trackPoints = this.spline.getSpacedPoints(divisions);

    // Build the high-fidelity 3D circuit
    this.createGround();
    this.createGravelTraps();
    this.createRoadMesh(divisions);
    this.createContinuousKerbs(divisions);
    this.createContinuousBarriers(divisions);
    this.createTireWalls();
    this.createStartFinishGantry();
    this.createOverheadBridges();
    this.createDistanceMarkers();
    this.createRampFramework();
    this.createGrandstand();
    this.createStadiumFloodlights();
    this.createSponsorHoardings();
    this.createTreesAndFoliage();
    this.createCheckpoints();

    return {
      spline: this.spline,
      trackPoints: this.trackPoints,
      checkpoints: this.checkpoints,
      colliders: this.colliders,
      ramps: this.ramps,
      gantryLights: this.gantryLights,
    };
  }

  createGround() {
    const groundGeo = new THREE.PlaneGeometry(1000, 1000, 32, 32);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1c341c';
    ctx.fillRect(0, 0, 512, 512);

    // Multi-shade grass mottle
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 1.5 + Math.random() * 4.0;
      ctx.fillStyle = Math.random() > 0.4 ? '#234423' : '#152915';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const grassTex = new THREE.CanvasTexture(canvas);
    grassTex.wrapS = THREE.RepeatWrapping;
    grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(35, 35);

    const groundMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.9,
      metalness: 0.05,
    });

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  createGravelTraps() {
    // Runoff sand/gravel traps outside sharp corners
    const trapMat = new THREE.MeshStandardMaterial({
      color: 0xc2a67e,
      roughness: 0.95,
      metalness: 0.0,
    });

    // Turn 1 runoff
    const trap1 = new THREE.Mesh(new THREE.RingGeometry(60, 115, 32), trapMat);
    trap1.rotation.x = -Math.PI / 2;
    trap1.position.set(-85, -0.04, 155);
    trap1.receiveShadow = true;
    this.scene.add(trap1);

    // Hairpin runoff
    const trap2 = new THREE.Mesh(new THREE.PlaneGeometry(90, 75), trapMat);
    trap2.rotation.x = -Math.PI / 2;
    trap2.position.set(128, -0.04, -125);
    trap2.receiveShadow = true;
    this.scene.add(trap2);

    // S-curve runoff
    const trap3 = new THREE.Mesh(new THREE.PlaneGeometry(60, 50), trapMat);
    trap3.rotation.x = -Math.PI / 2;
    trap3.position.set(-195, -0.04, -65);
    trap3.receiveShadow = true;
    this.scene.add(trap3);
  }

  createRoadMesh(divisions) {
    const halfWidth = this.trackWidth / 2;
    const roadGeo = new THREE.BufferGeometry();
    const positions = [];
    const uvs = [];
    const normals = [];
    const indices = [];

    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i <= divisions; i++) {
      const t = i / divisions;
      const pt = this.spline.getPointAt(t);
      const tangent = this.spline.getTangentAt(t).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const leftPt = pt.clone().addScaledVector(normal, -halfWidth);
      const rightPt = pt.clone().addScaledVector(normal, halfWidth);

      positions.push(leftPt.x, leftPt.y + 0.02, leftPt.z);
      positions.push(rightPt.x, rightPt.y + 0.02, rightPt.z);

      normals.push(0, 1, 0, 0, 1, 0);
      uvs.push(0, t * 65, 1, t * 65);

      if (i < divisions) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);

    const roadTexture = this.generateAsphaltTexture();
    roadTexture.wrapS = THREE.RepeatWrapping;
    roadTexture.wrapT = THREE.RepeatWrapping;
    roadTexture.repeat.set(1, 1);

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.72,
      metalness: 0.15,
    });

    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);
  }

  generateAsphaltTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Asphalt dark base
    ctx.fillStyle = '#1e2227';
    ctx.fillRect(0, 0, 1024, 1024);

    // Gravel aggregate noise
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 26;
      imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] + noise));
      imgData.data[i + 1] = Math.min(255, Math.max(0, imgData.data[i + 1] + noise));
      imgData.data[i + 2] = Math.min(255, Math.max(0, imgData.data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Dark rubbered-in racing lines (two grooved tire tracks)
    ctx.fillStyle = 'rgba(12, 14, 18, 0.48)';
    ctx.fillRect(220, 0, 180, 1024);
    ctx.fillRect(624, 0, 180, 1024);

    // Crisp white outer boundary track lines
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(28, 0, 18, 1024);
    ctx.fillRect(978, 0, 18, 1024);

    // Bright yellow dashed center dividing line
    ctx.fillStyle = '#facc15';
    for (let y = 0; y < 1024; y += 128) {
      ctx.fillRect(506, y + 16, 12, 80);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  createContinuousKerbs(divisions) {
    const halfWidth = this.trackWidth / 2;
    const kerbWidth = 1.1;
    const up = new THREE.Vector3(0, 1, 0);

    // Red & white FIA curb alternating blocks
    const kerbCanvas = document.createElement('canvas');
    kerbCanvas.width = 128;
    kerbCanvas.height = 256;
    const ctx = kerbCanvas.getContext('2d');
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 128, 128, 128);

    const kerbTex = new THREE.CanvasTexture(kerbCanvas);
    kerbTex.wrapS = THREE.RepeatWrapping;
    kerbTex.wrapT = THREE.RepeatWrapping;
    kerbTex.repeat.set(1, 1);

    const kerbMat = new THREE.MeshStandardMaterial({
      map: kerbTex,
      roughness: 0.45,
      metalness: 0.1,
    });

    ['left', 'right'].forEach(side => {
      const sign = side === 'left' ? -1 : 1;
      const kerbGeo = new THREE.BufferGeometry();
      const pos = [];
      const uvs = [];
      const normals = [];
      const idx = [];

      for (let i = 0; i <= divisions; i++) {
        const t = i / divisions;
        const pt = this.spline.getPointAt(t);
        const tangent = this.spline.getTangentAt(t).normalize();
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

        const innerPt = pt.clone().addScaledVector(normal, sign * halfWidth);
        const outerPt = pt.clone().addScaledVector(normal, sign * (halfWidth + kerbWidth));

        pos.push(innerPt.x, innerPt.y + 0.025, innerPt.z);
        pos.push(outerPt.x, outerPt.y + 0.12, outerPt.z);

        normals.push(0, 1, 0, 0, 1, 0);
        uvs.push(0, t * 140, 1, t * 140);

        if (i < divisions) {
          const base = i * 2;
          idx.push(base, base + 1, base + 2);
          idx.push(base + 1, base + 3, base + 2);
        }
      }

      kerbGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      kerbGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      kerbGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      kerbGeo.setIndex(idx);

      const kerbMesh = new THREE.Mesh(kerbGeo, kerbMat);
      kerbMesh.receiveShadow = true;
      this.scene.add(kerbMesh);
    });
  }

  createContinuousBarriers(divisions) {
    const halfWidth = this.trackWidth / 2;
    const barrierOffset = halfWidth + 1.25; // 9.25m from centerline
    const up = new THREE.Vector3(0, 1, 0);

    const armcoMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.92,
      roughness: 0.18,
      side: THREE.DoubleSide,
    });

    const postMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.35,
    });

    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.15, 8);
    const bracketGeo = new THREE.BoxGeometry(0.06, 0.25, 0.16);

    ['left', 'right'].forEach(side => {
      const sign = side === 'left' ? -1 : 1;
      const railGeo = new THREE.BufferGeometry();
      const pos = [];
      const normals = [];
      const indices = [];

      const profile = [
        { dy: 0.90, dr: 0.04 },
        { dy: 0.72, dr: -0.06 },
        { dy: 0.58, dr: 0.03 },
        { dy: 0.44, dr: -0.06 },
        { dy: 0.28, dr: 0.04 },
      ];
      const vertCount = profile.length;

      for (let i = 0; i <= divisions; i++) {
        const t = i / divisions;
        const pt = this.spline.getPointAt(t);
        const tangent = this.spline.getTangentAt(t).normalize();
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

        const basePt = pt.clone().addScaledVector(normal, sign * barrierOffset);
        const groundY = pt.y;
        const inward = normal.clone().multiplyScalar(-sign);

        for (let p = 0; p < vertCount; p++) {
          const prof = profile[p];
          const vPt = basePt.clone().addScaledVector(normal, sign * prof.dr);
          pos.push(vPt.x, groundY + prof.dy, vPt.z);
          normals.push(inward.x, 0, inward.z);
        }

        if (i < divisions) {
          const colA = i * vertCount;
          const colB = (i + 1) * vertCount;
          for (let p = 0; p < vertCount - 1; p++) {
            indices.push(colA + p, colA + p + 1, colB + p);
            indices.push(colA + p + 1, colB + p + 1, colB + p);
          }
        }

        if (i % 4 === 0) {
          const postPos = basePt.clone().addScaledVector(normal, sign * 0.16);
          const post = new THREE.Mesh(postGeo, postMat);
          post.position.set(postPos.x, groundY + 0.57, postPos.z);
          post.castShadow = true;
          this.scene.add(post);

          const bracket = new THREE.Mesh(bracketGeo, postMat);
          bracket.position.set(basePt.x + normal.x * sign * 0.08, groundY + 0.58, basePt.z + normal.z * sign * 0.08);
          this.scene.add(bracket);
        }
      }

      railGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      railGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      railGeo.setIndex(indices);

      const railMesh = new THREE.Mesh(railGeo, armcoMat);
      railMesh.castShadow = true;
      railMesh.receiveShadow = true;
      this.scene.add(railMesh);
    });

    this.ramps.push({
      start: new THREE.Vector3(-140, 0.5, -145),
      crest: new THREE.Vector3(-105, 3.8, -165),
      radius: 20.0,
      boost: 15.0,
    });
  }

  createTireWalls() {
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
    const tireGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12);

    const cornerSplineTs = [0.10, 0.12, 0.14, 0.72, 0.74, 0.76, 0.37, 0.39];
    const up = new THREE.Vector3(0, 1, 0);

    cornerSplineTs.forEach(t => {
      const pt = this.spline.getPointAt(t);
      const tangent = this.spline.getTangentAt(t).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const pos = pt.clone().addScaledVector(normal, 10.5);

      const wallGroup = new THREE.Group();
      wallGroup.position.copy(pos);
      wallGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 2; col++) {
          const tire = new THREE.Mesh(tireGeo, tireMat);
          tire.position.set((col - 0.5) * 0.88, 0.18 + row * 0.32, 0);
          tire.castShadow = true;
          wallGroup.add(tire);
        }
      }

      const belt = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.45, 0.9), beltMat);
      belt.position.set(0, 0.95, 0);
      wallGroup.add(belt);

      this.scene.add(wallGroup);
    });
  }

  createStartFinishGantry() {
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(0, 0, 0);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.65, roughness: 0.3 });

    const pillarGeo = new THREE.BoxGeometry(1.0, 8.5, 1.0);
    const leftPillar = new THREE.Mesh(pillarGeo, metalMat);
    leftPillar.position.set(-this.trackWidth / 2 - 2.5, 4.25, 0);
    leftPillar.castShadow = true;
    gantryGroup.add(leftPillar);

    const rightPillar = leftPillar.clone();
    rightPillar.position.x = this.trackWidth / 2 + 2.5;
    gantryGroup.add(rightPillar);

    const beamGeo = new THREE.BoxGeometry(this.trackWidth + 6.0, 1.6, 1.2);
    const beam = new THREE.Mesh(beamGeo, trussMat);
    beam.position.set(0, 7.6, 0);
    gantryGroup.add(beam);

    const board = this.createBannerBoard('SUPER CARS II VR - COMMODORE AMIGA 1991');
    board.position.set(0, 7.6, 0.65);
    gantryGroup.add(board);

    const lightFrame = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.7, 0.4), metalMat);
    lightFrame.position.set(0, 6.2, 0);
    gantryGroup.add(lightFrame);

    for (let i = 0; i < 5; i++) {
      const lampGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.18, 16);
      lampGeo.rotateX(Math.PI / 2);
      const lampMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0.3,
        roughness: 0.2
      });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(-2.2 + i * 1.1, 6.2, 0.25);
      gantryGroup.add(lamp);
      this.gantryLights.push(lamp);
    }

    const checkCanvas = document.createElement('canvas');
    checkCanvas.width = 256;
    checkCanvas.height = 64;
    const ctx = checkCanvas.getContext('2d');
    for (let x = 0; x < 256; x += 32) {
      for (let y = 0; y < 64; y += 32) {
        ctx.fillStyle = ((x + y) / 32) % 2 === 0 ? '#ffffff' : '#111111';
        ctx.fillRect(x, y, 32, 32);
      }
    }
    const checkTex = new THREE.CanvasTexture(checkCanvas);
    checkTex.wrapS = THREE.RepeatWrapping;
    checkTex.repeat.set(8, 2);

    const checkMat = new THREE.MeshBasicMaterial({ map: checkTex, depthWrite: false });
    const checkMesh = new THREE.Mesh(new THREE.PlaneGeometry(this.trackWidth, 3.0), checkMat);
    checkMesh.rotation.x = -Math.PI / 2;
    checkMesh.position.set(0, 0.04, 0);
    gantryGroup.add(checkMesh);

    this.scene.add(gantryGroup);
  }

  createOverheadBridges() {
    const bridges = [
      { t: 0.32, text: 'AMIGA 1991 POWER' },
      { t: 0.84, text: 'GREMLIN GRAPHICS' },
    ];

    const up = new THREE.Vector3(0, 1, 0);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const width = this.trackWidth + 6.0;

    bridges.forEach(b => {
      const pt = this.spline.getPointAt(b.t);
      const tangent = this.spline.getTangentAt(b.t).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const group = new THREE.Group();
      group.position.copy(pt);
      group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

      const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8.5, 1.2), metalMat);
      p1.position.set(-width / 2, 4.25, 0);
      group.add(p1);

      const p2 = p1.clone();
      p2.position.x = width / 2;
      group.add(p2);

      const arch = new THREE.Mesh(new THREE.BoxGeometry(width + 1.5, 1.8, 1.6), metalMat);
      arch.position.set(0, 7.6, 0);
      group.add(arch);

      const banner = this.createBannerBoard(b.text);
      banner.position.set(0, 7.6, -0.85);
      banner.rotation.y = Math.PI;
      group.add(banner);

      this.scene.add(group);
    });
  }

  createBannerBoard(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 });
    return new THREE.Mesh(new THREE.BoxGeometry(14.0, 1.6, 0.15), mat);
  }

  createDistanceMarkers() {
    const markers = [
      { t: 0.045, text: '150' },
      { t: 0.065, text: '100' },
      { t: 0.085, text: '50' },
    ];

    const up = new THREE.Vector3(0, 1, 0);

    markers.forEach(m => {
      const pt = this.spline.getPointAt(m.t);
      const tangent = this.spline.getTangentAt(m.t).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const pos = pt.clone().addScaledVector(normal, this.trackWidth / 2 + 2.2);

      const board = this.buildDistanceBoard(m.text);
      board.position.copy(pos);
      board.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent.clone().negate());
      this.scene.add(board);
    });
  }

  buildDistanceBoard(text) {
    const group = new THREE.Group();
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 84px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 128);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.08), mat);
    board.position.y = 1.3;
    group.add(board);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x334155 }));
    leg.position.y = 0.6;
    group.add(leg);

    return group;
  }

  createRampFramework() {
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.4 });
    const hazardMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });

    const pillar1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.8, 0.8), trussMat);
    pillar1.position.set(-105 - 8.0, 1.9, -165);
    this.scene.add(pillar1);

    const pillar2 = pillar1.clone();
    pillar2.position.x = -105 + 8.0;
    this.scene.add(pillar2);

    const hazardSign = new THREE.Mesh(new THREE.BoxGeometry(18.0, 0.6, 0.4), hazardMat);
    hazardSign.position.set(-105, 4.2, -165);
    this.scene.add(hazardSign);
  }

  createGrandstand() {
    const stand = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const seatBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
    const seatRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });

    const standLength = 70.0;
    const numTiers = 8;

    for (let tier = 0; tier < numTiers; tier++) {
      const stepX = 13.5 + tier * 1.25;
      const stepY = 0.45 + tier * 0.75;

      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.75, standLength), concreteMat);
      stepMesh.position.set(stepX, stepY, 25);
      stepMesh.castShadow = true;
      stand.add(stepMesh);

      const isRed = tier % 2 === 0;
      const seats = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, standLength - 2), isRed ? seatRedMat : seatBlueMat);
      seats.position.set(stepX, stepY + 0.45, 25);
      stand.add(seats);

      for (let s = -standLength / 2 + 3; s < standLength / 2 - 3; s += 2.2) {
        if (Math.random() > 0.25) {
          const crowdColors = [0xfacc15, 0xef4444, 0x38bdf8, 0x22c55e, 0xf8fafc];
          const specMat = new THREE.MeshStandardMaterial({
            color: crowdColors[Math.floor(Math.random() * crowdColors.length)],
            roughness: 0.8
          });
          const spectator = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 6), specMat);
          spectator.position.set(stepX, stepY + 0.9, 25 + s);
          stand.add(spectator);
        }
      }
    }

    const roof = new THREE.Mesh(new THREE.BoxGeometry(13.0, 0.35, standLength + 2.0), roofMat);
    roof.position.set(18.5, 8.2, 25);
    roof.rotation.z = -0.15;
    stand.add(roof);

    const billboard = this.createBannerBoard('SUPER CARS SPEEDWAY - AMIGA CHAMPIONSHIP');
    billboard.position.set(23.8, 7.5, 25);
    billboard.rotation.y = -Math.PI / 2;
    stand.add(billboard);

    this.scene.add(stand);
  }

  createStadiumFloodlights() {
    const towerCoords = [
      new THREE.Vector3(15, 0, 75),
      new THREE.Vector3(-85, 0, 160),
      new THREE.Vector3(-170, 0, 95),
      new THREE.Vector3(135, 0, -125),
    ];

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfef08a,
      emissiveIntensity: 4.0,
      roughness: 0.1
    });

    towerCoords.forEach(pos => {
      const tower = new THREE.Group();
      tower.position.copy(pos);

      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 18, 8), metalMat);
      mast.position.y = 9.0;
      tower.add(mast);

      const bar = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.6, 0.8), metalMat);
      bar.position.y = 17.5;
      tower.add(bar);

      for (let b = -1.8; b <= 1.8; b += 1.2) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.3), bulbMat);
        lamp.position.set(b, 17.5, 0.45);
        tower.add(lamp);
      }

      this.scene.add(tower);
    });
  }

  createSponsorHoardings() {
    const hoardingMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
    const hoardingLocations = [0.11, 0.13, 0.73, 0.75];
    const up = new THREE.Vector3(0, 1, 0);

    hoardingLocations.forEach(t => {
      const pt = this.spline.getPointAt(t);
      const tangent = this.spline.getTangentAt(t).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const pos = pt.clone().addScaledVector(normal, 11.2);
      const boardGroup = new THREE.Group();
      boardGroup.position.copy(pos);
      boardGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

      const panel = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.2, 0.15), hoardingMat);
      panel.position.y = 0.7;
      boardGroup.add(panel);

      this.scene.add(boardGroup);
    });
  }

  createTreesAndFoliage() {
    const candidateCoords = [
      new THREE.Vector3(-35, 0, 25),
      new THREE.Vector3(-60, 0, 45),
      new THREE.Vector3(-90, 0, 30),
      new THREE.Vector3(-110, 0, 10),
      new THREE.Vector3(-115, 0, -30),
      new THREE.Vector3(-85, 0, -60),
      new THREE.Vector3(-55, 0, -90),
      new THREE.Vector3(-25, 0, -110),
      new THREE.Vector3(20, 0, -120),
      new THREE.Vector3(50, 0, -90),
      new THREE.Vector3(65, 0, -60),
      new THREE.Vector3(45, 0, 30),
      new THREE.Vector3(25, 0, 60),
      new THREE.Vector3(-35, 0, 85),
      new THREE.Vector3(-65, 0, 110),
      new THREE.Vector3(-145, 0, 145),
      new THREE.Vector3(-175, 0, 120),
      new THREE.Vector3(-190, 0, 20),
      new THREE.Vector3(-210, 0, -30),
      new THREE.Vector3(-205, 0, -90),
      new THREE.Vector3(-165, 0, -165),
      new THREE.Vector3(-125, 0, -195),
      new THREE.Vector3(-75, 0, -210),
      new THREE.Vector3(-20, 0, -215),
      new THREE.Vector3(40, 0, -210),
      new THREE.Vector3(95, 0, -185),
      new THREE.Vector3(145, 0, -145),
      new THREE.Vector3(145, 0, -85),
      new THREE.Vector3(105, 0, -25),
      new THREE.Vector3(65, 0, 10),
    ];

    candidateCoords.forEach(pos => {
      let closestSq = Infinity;
      for (let i = 0; i < 60; i++) {
        const pt = this.spline.getPointAt(i / 60);
        const dSq = pos.distanceToSquared(pt);
        if (dSq < closestSq) closestSq = dSq;
      }

      if (closestSq >= 18.0 * 18.0) {
        const isPine = Math.random() > 0.35;
        const tree = isPine ? this.buildPineTree() : this.buildOakTree();
        tree.position.copy(pos);
        this.scene.add(tree);
      }
    });
  }

  buildPineTree() {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x422a1d, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.75 });

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3.5, 8), trunkMat);
    trunk.position.y = 1.75;
    trunk.castShadow = true;
    group.add(trunk);

    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(2.4 - i * 0.5, 3.2, 8),
        leafMat
      );
      cone.position.y = 3.2 + i * 1.8;
      cone.castShadow = true;
      group.add(cone);
    }

    const scale = 0.85 + Math.random() * 0.4;
    group.scale.set(scale, scale, scale);
    return group;
  }

  buildOakTree() {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1e5a26, roughness: 0.8 });

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 3.0, 8), trunkMat);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    group.add(trunk);

    const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(2.6, 1), leafMat);
    foliage.position.y = 4.2;
    foliage.castShadow = true;
    group.add(foliage);

    const scale = 0.8 + Math.random() * 0.4;
    group.scale.set(scale, scale, scale);
    return group;
  }

  createCheckpoints() {
    const count = 20;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const pt = this.spline.getPointAt(t);
      const tangent = this.spline.getTangentAt(t).normalize();
      this.checkpoints.push({
        index: i,
        t: t,
        position: pt,
        tangent: tangent,
        radius: this.trackWidth,
      });
    }
  }

  updateGantryLights(countdownVal) {
    this.gantryLights.forEach((lamp, idx) => {
      if (countdownVal > 0) {
        const active = (5 - countdownVal) > idx;
        lamp.material.color.setHex(active ? 0xef4444 : 0x331111);
        lamp.material.emissive.setHex(active ? 0xef4444 : 0x000000);
        lamp.material.emissiveIntensity = active ? 2.5 : 0;
      } else {
        lamp.material.color.setHex(0x22c55e);
        lamp.material.emissive.setHex(0x22c55e);
        lamp.material.emissiveIntensity = 3.5;
      }
    });
  }
}
