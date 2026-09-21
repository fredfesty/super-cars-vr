import * as THREE from 'three';

/**
 * Procedural 3D Race Circuit for Super Cars II VR.
 * Generates continuous tarmac with custom PBR asphalt, 3D red/white kerbs,
 * guardrails, tire walls, jump ramps, start gantry, and trackside scenery.
 */
export class TrackBuilder {
  constructor(scene) {
    this.scene = scene;
    this.trackWidth = 14.0;
    this.spline = null;
    this.trackPoints = [];
    this.checkpoints = [];
    this.colliders = []; // Wall and barrier bounding segments
    this.ramps = [];     // Jump ramp trigger zones
    this.gantryLights = [];
  }

  buildTrack() {
    // Define the circuit centerline control points (X, Y elevation, Z)
    // Circuit features: Start straight, fast curves, S-chicane, JUMP RAMP, hairpin, back straight.
    const controlPoints = [
      new THREE.Vector3(0, 0, 0),        // Start/Finish Line
      new THREE.Vector3(0, 0, 60),       // Main Straight
      new THREE.Vector3(-15, 0, 110),    // Turn 1 entry
      new THREE.Vector3(-60, 0, 140),    // Turn 1 apex
      new THREE.Vector3(-110, 0, 130),   // Turn 1 exit
      new THREE.Vector3(-150, 0, 90),    // Sweeper
      new THREE.Vector3(-170, 0, 40),    // Downwards sweep
      new THREE.Vector3(-160, 0, -20),   // S-Curve entry
      new THREE.Vector3(-190, 0, -60),   // S-Curve mid
      new THREE.Vector3(-180, 0, -110),  // S-Curve exit

      // --- JUMP RAMP SECTION ---
      new THREE.Vector3(-140, 0.5, -145), // Ramp approach
      new THREE.Vector3(-105, 3.8, -165), // Ramp peak / launch crest!
      new THREE.Vector3(-75, 1.2, -180),  // In-flight gap
      new THREE.Vector3(-45, 0, -185),    // Landing zone

      new THREE.Vector3(20, 0, -185),    // Fast bend
      new THREE.Vector3(80, 0, -160),    // Hairpin approach
      new THREE.Vector3(120, 0, -120),   // Hairpin apex
      new THREE.Vector3(110, 0, -60),    // Hairpin exit
      new THREE.Vector3(70, 0, -20),     // Back straight
      new THREE.Vector3(40, 0, -40),     // Final chicane right
      new THREE.Vector3(15, 0, -25),     // Final chicane left
      new THREE.Vector3(0, 0, -10),      // Approach to Start/Finish
    ];

    this.spline = new THREE.CatmullRomCurve3(controlPoints, true, 'centripetal');
    const divisions = 400;
    this.trackPoints = this.spline.getSpacedPoints(divisions);

    // Build the 3D meshes
    this.createGround();
    this.createRoadMesh(divisions);
    this.createKerbsAndBarriers(divisions);
    this.createStartFinishGantry();
    this.createScenery();
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
    // Expansive terrain plane
    const groundGeo = new THREE.PlaneGeometry(800, 800, 64, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x163820,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Infield dirt / sand patches
    const dirtGeo = new THREE.RingGeometry(50, 160, 32);
    const dirtMat = new THREE.MeshStandardMaterial({
      color: 0x2b2219,
      roughness: 0.9,
    });
    const dirt = new THREE.Mesh(dirtGeo, dirtMat);
    dirt.rotation.x = -Math.PI / 2;
    dirt.position.set(-80, -0.04, -30);
    dirt.receiveShadow = true;
    this.scene.add(dirt);
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
      uvs.push(0, t * 60, 1, t * 60);

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

    // Canvas procedural asphalt texture
    const roadTexture = this.generateAsphaltTexture();
    roadTexture.wrapS = THREE.RepeatWrapping;
    roadTexture.wrapT = THREE.RepeatWrapping;
    roadTexture.repeat.set(1, 40);

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.8,
      metalness: 0.15,
    });

    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);
  }

  generateAsphaltTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark asphalt base
    ctx.fillStyle = '#1c2026';
    ctx.fillRect(0, 0, 512, 512);

    // Asphalt gravel grain
    const imgData = ctx.getImageData(0, 0, 512, 512);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 26;
      imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] + noise));
      imgData.data[i + 1] = Math.min(255, Math.max(0, imgData.data[i + 1] + noise));
      imgData.data[i + 2] = Math.min(255, Math.max(0, imgData.data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // White edge boundary lines
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(16, 0, 10, 512);
    ctx.fillRect(486, 0, 10, 512);

    // Dashed center line
    ctx.fillStyle = '#e2e8f0';
    for (let y = 0; y < 512; y += 64) {
      ctx.fillRect(252, y, 8, 36);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  createKerbsAndBarriers(divisions) {
    const halfWidth = this.trackWidth / 2;
    const up = new THREE.Vector3(0, 1, 0);

    const kerbMatRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
    const kerbMatWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });

    // Store collision segments for boundary collision detection
    for (let i = 0; i < divisions; i++) {
      const t1 = i / divisions;
      const t2 = (i + 1) / divisions;

      const pt1 = this.spline.getPointAt(t1);
      const pt2 = this.spline.getPointAt(t2);

      const tan1 = this.spline.getTangentAt(t1).normalize();
      const tan2 = this.spline.getTangentAt(t2).normalize();

      const n1 = new THREE.Vector3().crossVectors(tan1, up).normalize();
      const n2 = new THREE.Vector3().crossVectors(tan2, up).normalize();

      // Left & Right barrier bounds (offset by halfWidth + 0.8m)
      const leftB1 = pt1.clone().addScaledVector(n1, -halfWidth - 0.7);
      const leftB2 = pt2.clone().addScaledVector(n2, -halfWidth - 0.7);
      const rightB1 = pt1.clone().addScaledVector(n1, halfWidth + 0.7);
      const rightB2 = pt2.clone().addScaledVector(n2, halfWidth + 0.7);

      this.colliders.push({ p1: leftB1, p2: leftB2, side: 'left' });
      this.colliders.push({ p1: rightB1, p2: rightB2, side: 'right' });

      // Instanced or stepped red/white curbs along corners
      if (i % 2 === 0) {
        const mat = (i % 4 < 2) ? kerbMatRed : kerbMatWhite;
        const kerbWidth = 1.0;
        const kerbGeo = new THREE.BoxGeometry(kerbWidth, 0.12, pt1.distanceTo(pt2) * 1.05);

        // Left Kerb
        const leftKerb = new THREE.Mesh(kerbGeo, mat);
        leftKerb.position.copy(pt1).addScaledVector(n1, -halfWidth - kerbWidth / 2);
        leftKerb.position.y += 0.05;
        leftKerb.lookAt(pt2.clone().addScaledVector(n2, -halfWidth - kerbWidth / 2));
        this.scene.add(leftKerb);

        // Right Kerb
        const rightKerb = new THREE.Mesh(kerbGeo, mat);
        rightKerb.position.copy(pt1).addScaledVector(n1, halfWidth + kerbWidth / 2);
        rightKerb.position.y += 0.05;
        rightKerb.lookAt(pt2.clone().addScaledVector(n2, halfWidth + kerbWidth / 2));
        this.scene.add(rightKerb);
      }

      // Metal Armco Guardrail posts & rails every 4 segments
      if (i % 3 === 0) {
        const railLength = pt1.distanceTo(pt2) * 3.2;
        const railGeo = new THREE.BoxGeometry(0.18, 0.45, railLength);

        // Left Rail
        const leftRail = new THREE.Mesh(railGeo, barrierMat);
        leftRail.position.copy(leftB1);
        leftRail.position.y += 0.45;
        leftRail.lookAt(leftB2);
        leftRail.castShadow = true;
        this.scene.add(leftRail);

        // Right Rail
        const rightRail = new THREE.Mesh(railGeo, barrierMat);
        rightRail.position.copy(rightB1);
        rightRail.position.y += 0.45;
        rightRail.lookAt(rightB2);
        rightRail.castShadow = true;
        this.scene.add(rightRail);

        // Support Post
        const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8);
        const postLeft = new THREE.Mesh(postGeo, barrierMat);
        postLeft.position.copy(leftB1);
        postLeft.position.y += 0.35;
        this.scene.add(postLeft);

        const postRight = new THREE.Mesh(postGeo, barrierMat);
        postRight.position.copy(rightB1);
        postRight.position.y += 0.35;
        this.scene.add(postRight);
      }
    }

    // Register the jump ramp zone (near indices around t = 0.52 to 0.58)
    this.ramps.push({
      start: new THREE.Vector3(-140, 0.5, -145),
      crest: new THREE.Vector3(-105, 3.8, -165),
      radius: 20.0,
      boost: 17.0,
    });
  }

  createStartFinishGantry() {
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(0, 0, 0);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const bannerMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });

    // Dual vertical truss pillars
    const pillarGeo = new THREE.BoxGeometry(0.8, 7.5, 0.8);
    const leftPillar = new THREE.Mesh(pillarGeo, metalMat);
    leftPillar.position.set(-this.trackWidth / 2 - 1.8, 3.75, 0);
    gantryGroup.add(leftPillar);

    const rightPillar = leftPillar.clone();
    rightPillar.position.x = this.trackWidth / 2 + 1.8;
    gantryGroup.add(rightPillar);

    // Cross beam spanning across the track
    const beamGeo = new THREE.BoxGeometry(this.trackWidth + 4.5, 1.4, 1.0);
    const beam = new THREE.Mesh(beamGeo, metalMat);
    beam.position.set(0, 6.8, 0);
    gantryGroup.add(beam);

    // Banner board
    const boardGeo = new THREE.BoxGeometry(this.trackWidth + 3.0, 1.0, 0.1);
    const board = new THREE.Mesh(boardGeo, bannerMat);
    board.position.set(0, 6.8, 0.55);
    gantryGroup.add(board);

    // Start Lights (5 clusters: red LEDs that switch off or turn green)
    const lightFrameGeo = new THREE.BoxGeometry(6.0, 0.6, 0.4);
    const lightFrame = new THREE.Mesh(lightFrameGeo, metalMat);
    lightFrame.position.set(0, 5.5, 0);
    gantryGroup.add(lightFrame);

    for (let i = 0; i < 5; i++) {
      const lampGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.15, 16);
      lampGeo.rotateX(Math.PI / 2);
      const lampMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0.3,
        roughness: 0.2
      });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(-2.0 + i * 1.0, 5.5, 0.22);
      gantryGroup.add(lamp);

      this.gantryLights.push(lamp);
    }

    // Checkered Finish Line decal on track
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
    const checkMat = new THREE.MeshBasicMaterial({ map: checkTex, depthWrite: false });
    const checkMesh = new THREE.Mesh(new THREE.PlaneGeometry(this.trackWidth, 2.5), checkMat);
    checkMesh.rotation.x = -Math.PI / 2;
    checkMesh.position.set(0, 0.04, 0);
    gantryGroup.add(checkMesh);

    this.scene.add(gantryGroup);
  }

  createScenery() {
    // Grandstand on start straight
    const grandstand = this.buildGrandstand();
    grandstand.position.set(this.trackWidth / 2 + 7.0, 0, 30);
    grandstand.rotation.y = -Math.PI / 2;
    this.scene.add(grandstand);

    // Floodlight towers around the track
    const towerCoords = [
      new THREE.Vector3(-25, 0, 40),
      new THREE.Vector3(-80, 0, 150),
      new THREE.Vector3(-180, 0, 20),
      new THREE.Vector3(-120, 0, -140),
      new THREE.Vector3(50, 0, -170),
      new THREE.Vector3(80, 0, -50),
    ];

    towerCoords.forEach(pos => {
      const tower = this.buildFloodlight();
      tower.position.copy(pos);
      this.scene.add(tower);
    });

    // Sponsor billboards
    const billboards = [
      { pos: new THREE.Vector3(-110, 0, 155), rot: 0.4, title: "GREMLIN GRAPHICS" },
      { pos: new THREE.Vector3(-175, 0, -80), rot: 1.8, title: "SUPER CARS II" },
      { pos: new THREE.Vector3(-60, 0, -195), rot: 0.0, title: "TARACO NEORODER" },
      { pos: new THREE.Vector3(125, 0, -90), rot: -1.2, title: "RETRON PARSEC" },
    ];

    billboards.forEach(b => {
      const board = this.buildBillboard(b.title);
      board.position.copy(b.pos);
      board.rotation.y = b.rot;
      this.scene.add(board);
    });
  }

  buildGrandstand() {
    const stand = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 });

    // 5 tiered bleacher steps
    for (let step = 0; step < 6; step++) {
      const stepGeo = new THREE.BoxGeometry(40, 0.8, 1.8);
      const stepMesh = new THREE.Mesh(stepGeo, concreteMat);
      stepMesh.position.set(0, 0.4 + step * 0.8, step * 1.8);
      stand.add(stepMesh);

      // Seats
      const seatGeo = new THREE.BoxGeometry(39, 0.25, 1.2);
      const seats = new THREE.Mesh(seatGeo, seatMat);
      seats.position.set(0, 0.8 + step * 0.8 + 0.1, step * 1.8);
      stand.add(seats);
    }

    // Cantilever Roof
    const roofGeo = new THREE.BoxGeometry(44, 0.3, 14);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 8.5, 4.0);
    roof.rotation.x = 0.1;
    stand.add(roof);

    return stand;
  }

  buildFloodlight() {
    const lightGroup = new THREE.Group();
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.4 });

    const mastGeo = new THREE.CylinderGeometry(0.3, 0.5, 18, 8);
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.y = 9;
    mast.castShadow = true;
    lightGroup.add(mast);

    const headGeo = new THREE.BoxGeometry(3.5, 1.8, 0.8);
    const head = new THREE.Mesh(headGeo, mastMat);
    head.position.set(0, 18, 0);
    lightGroup.add(head);

    // Glow lamps
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfef08a,
      emissiveIntensity: 2.5
    });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 0.1), lampMat);
    lamp.position.set(0, 18, 0.45);
    lightGroup.add(lamp);

    return lightGroup;
  }

  buildBillboard(text) {
    const boardGroup = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 });

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.18, 0.18, 4.0, 8);
    const l1 = new THREE.Mesh(legGeo, metalMat);
    l1.position.set(-4.5, 2.0, 0);
    boardGroup.add(l1);

    const l2 = l1.clone();
    l2.position.x = 4.5;
    boardGroup.add(l2);

    // Canvas banner texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 504, 120);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);

    const tex = new THREE.CanvasTexture(canvas);
    const boardMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(10.5, 2.8, 0.2), boardMat);
    board.position.set(0, 4.6, 0);
    board.castShadow = true;
    boardGroup.add(board);

    return boardGroup;
  }

  createCheckpoints() {
    // Distribute 16 checkpoints evenly along the track spline
    const count = 16;
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
    // 3 -> 3 red lights
    // 2 -> 4 red lights
    // 1 -> 5 red lights
    // 0 (GO!) -> all 5 lights turn vibrant GREEN!
    this.gantryLights.forEach((lamp, idx) => {
      if (countdownVal > 0) {
        const active = (5 - countdownVal) > idx;
        lamp.material.color.setHex(active ? 0xef4444 : 0x331111);
        lamp.material.emissive.setHex(active ? 0xef4444 : 0x000000);
        lamp.material.emissiveIntensity = active ? 2.5 : 0;
      } else {
        // GO!
        lamp.material.color.setHex(0x22c55e);
        lamp.material.emissive.setHex(0x22c55e);
        lamp.material.emissiveIntensity = 3.5;
      }
    });
  }
}
