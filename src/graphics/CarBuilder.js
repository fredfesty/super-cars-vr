import * as THREE from 'three';

/**
 * Creates high-detail procedural 3D arcade race cars inspired by Super Cars II.
 * Features PBR clearcoat paint, aerodynamic spoilers, detailed wheels,
 * glowing headlights, neon taillights, and integrated missile launchers.
 */
export class CarBuilder {
  static createCar(colorHex, isPlayer = false) {
    const carRoot = new THREE.Group();

    // Visual sub-group (allows suspension pitch/roll without affecting physics transform)
    const visualGroup = new THREE.Group();
    carRoot.add(visualGroup);
    carRoot.visualGroup = visualGroup;

    // --- PBR Materials ---
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      metalness: 0.6,
      roughness: 0.22,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 0.9,
    });

    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.45,
      metalness: 0.2,
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x050811,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85,
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.1,
    });

    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x93c5fd,
      emissiveIntensity: 3.5,
      roughness: 0.1,
    });

    const taillightMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff1e1e,
      emissiveIntensity: 2.0,
      roughness: 0.2,
    });

    const tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85,
      metalness: 0.1,
    });

    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.85,
      roughness: 0.2,
    });

    const caliperMaterial = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.3,
      metalness: 0.4,
    });

    // --- Main Car Body Chassis ---
    // Lower main chassis
    const lowerBodyGeo = new THREE.BoxGeometry(1.6, 0.42, 3.2);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, bodyMaterial);
    lowerBody.position.y = 0.38;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    visualGroup.add(lowerBody);

    // Front wedge nose
    const noseGeo = new THREE.BoxGeometry(1.52, 0.28, 0.9);
    const nose = new THREE.Mesh(noseGeo, bodyMaterial);
    nose.position.set(0, 0.32, 1.6);
    nose.rotation.x = 0.08;
    nose.castShadow = true;
    visualGroup.add(nose);

    // Front splitter (carbon fiber)
    const splitterGeo = new THREE.BoxGeometry(1.68, 0.06, 0.4);
    const splitter = new THREE.Mesh(splitterGeo, carbonMaterial);
    splitter.position.set(0, 0.18, 2.0);
    splitter.castShadow = true;
    visualGroup.add(splitter);

    // Hood scoop / air intake
    const hoodScoopGeo = new THREE.BoxGeometry(0.55, 0.08, 0.7);
    const hoodScoop = new THREE.Mesh(hoodScoopGeo, carbonMaterial);
    hoodScoop.position.set(0, 0.54, 0.8);
    visualGroup.add(hoodScoop);

    // Cabin / Cockpit Roof
    const cabinGeo = new THREE.BoxGeometry(1.22, 0.42, 1.45);
    const cabin = new THREE.Mesh(cabinGeo, bodyMaterial);
    cabin.position.set(0, 0.72, -0.2);
    cabin.castShadow = true;
    visualGroup.add(cabin);

    // Windshield Glass (front)
    const windshieldGeo = new THREE.BoxGeometry(1.18, 0.4, 0.6);
    const windshield = new THREE.Mesh(windshieldGeo, glassMaterial);
    windshield.position.set(0, 0.68, 0.45);
    windshield.rotation.x = -0.45;
    visualGroup.add(windshield);

    // Rear window Glass
    const rearGlassGeo = new THREE.BoxGeometry(1.18, 0.38, 0.55);
    const rearGlass = new THREE.Mesh(rearGlassGeo, glassMaterial);
    rearGlass.position.set(0, 0.68, -0.85);
    rearGlass.rotation.x = 0.5;
    visualGroup.add(rearGlass);

    // Side windows
    const sideWindowGeo = new THREE.BoxGeometry(1.24, 0.32, 0.8);
    const sideWindow = new THREE.Mesh(sideWindowGeo, glassMaterial);
    sideWindow.position.set(0, 0.70, -0.2);
    visualGroup.add(sideWindow);

    // Rear Spoiler Wing (Sporty Super Cars style)
    const spoilerStrutGeo = new THREE.BoxGeometry(0.06, 0.32, 0.15);
    const leftStrut = new THREE.Mesh(spoilerStrutGeo, carbonMaterial);
    leftStrut.position.set(-0.55, 0.68, -1.45);
    visualGroup.add(leftStrut);

    const rightStrut = leftStrut.clone();
    rightStrut.position.x = 0.55;
    visualGroup.add(rightStrut);

    const wingGeo = new THREE.BoxGeometry(1.72, 0.06, 0.35);
    const wing = new THREE.Mesh(wingGeo, carbonMaterial);
    wing.position.set(0, 0.84, -1.48);
    wing.rotation.x = -0.06;
    wing.castShadow = true;
    visualGroup.add(wing);

    // Rear Diffuser
    const diffuserGeo = new THREE.BoxGeometry(1.5, 0.12, 0.3);
    const diffuser = new THREE.Mesh(diffuserGeo, carbonMaterial);
    diffuser.position.set(0, 0.22, -1.6);
    visualGroup.add(diffuser);

    // Dual Chrome Exhaust Pipes
    const exhaustGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.25, 12);
    const exhaustLeft = new THREE.Mesh(exhaustGeo, chromeMaterial);
    exhaustLeft.rotation.x = Math.PI / 2;
    exhaustLeft.position.set(-0.35, 0.24, -1.65);
    visualGroup.add(exhaustLeft);

    const exhaustRight = exhaustLeft.clone();
    exhaustRight.position.x = 0.35;
    visualGroup.add(exhaustRight);

    // Headlights (High-tech horizontal LEDs)
    const headlightGeo = new THREE.BoxGeometry(0.35, 0.08, 0.1);
    const leftHeadlight = new THREE.Mesh(headlightGeo, headlightMaterial);
    leftHeadlight.position.set(-0.58, 0.42, 1.95);
    leftHeadlight.rotation.y = 0.15;
    visualGroup.add(leftHeadlight);

    const rightHeadlight = leftHeadlight.clone();
    rightHeadlight.position.x = 0.58;
    rightHeadlight.rotation.y = -0.15;
    visualGroup.add(rightHeadlight);

    // Real-time Headlight beams
    const headSpotLeft = new THREE.SpotLight(0xffffff, 2.5, 30, Math.PI / 6, 0.3);
    headSpotLeft.position.set(-0.58, 0.42, 1.95);
    headSpotLeft.target.position.set(-0.58, 0.2, 15);
    visualGroup.add(headSpotLeft);
    visualGroup.add(headSpotLeft.target);

    const headSpotRight = new THREE.SpotLight(0xffffff, 2.5, 30, Math.PI / 6, 0.3);
    headSpotRight.position.set(0.58, 0.42, 1.95);
    headSpotRight.target.position.set(0.58, 0.2, 15);
    visualGroup.add(headSpotRight);
    visualGroup.add(headSpotRight.target);

    // Taillight bar (Cyberpunk full-width LED strip)
    const taillightGeo = new THREE.BoxGeometry(1.4, 0.08, 0.06);
    const taillight = new THREE.Mesh(taillightGeo, taillightMaterial);
    taillight.position.set(0, 0.48, -1.62);
    visualGroup.add(taillight);
    carRoot.taillightMaterial = taillightMaterial;

    // Twin Rocket Launcher Pods (Super Cars II Tribute)
    const launcherGeo = new THREE.BoxGeometry(0.18, 0.12, 0.55);
    const leftPod = new THREE.Mesh(launcherGeo, carbonMaterial);
    leftPod.position.set(-0.45, 0.54, 1.15);
    visualGroup.add(leftPod);

    const rightPod = leftPod.clone();
    rightPod.position.x = 0.45;
    visualGroup.add(rightPod);

    const rocketTipGeo = new THREE.ConeGeometry(0.045, 0.15, 8);
    const rocketTipMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const tipL = new THREE.Mesh(rocketTipGeo, rocketTipMat);
    tipL.rotation.x = Math.PI / 2;
    tipL.position.set(-0.45, 0.54, 1.45);
    visualGroup.add(tipL);

    const tipR = tipL.clone();
    tipR.position.x = 0.45;
    visualGroup.add(tipR);

    // --- Detailed Wheels (Front & Rear) ---
    const wheelRadius = 0.34;
    const wheelWidth = 0.28;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
    wheelGeo.rotateZ(Math.PI / 2);

    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.72, wheelRadius * 0.72, wheelWidth + 0.01, 16);
    rimGeo.rotateZ(Math.PI / 2);

    const caliperGeo = new THREE.BoxGeometry(0.08, 0.14, 0.12);

    function makeWheel(x, z) {
      const wheelAssembly = new THREE.Group();
      wheelAssembly.position.set(x, wheelRadius, z);

      // Rotating hub
      const rotatingHub = new THREE.Group();

      const tireMesh = new THREE.Mesh(wheelGeo, tireMaterial);
      tireMesh.castShadow = true;
      rotatingHub.add(tireMesh);

      const rimMesh = new THREE.Mesh(rimGeo, rimMaterial);
      rotatingHub.add(rimMesh);

      wheelAssembly.add(rotatingHub);
      wheelAssembly.rotatingHub = rotatingHub;

      // Brake caliper (static inside wheel)
      const caliper = new THREE.Mesh(caliperGeo, caliperMaterial);
      caliper.position.set(x > 0 ? -0.06 : 0.06, 0.12, 0);
      wheelAssembly.add(caliper);

      visualGroup.add(wheelAssembly);
      return wheelAssembly;
    }

    const frontLeftWheel = makeWheel(-0.82, 1.05);
    const frontRightWheel = makeWheel(0.82, 1.05);
    const rearLeftWheel = makeWheel(-0.82, -1.05);
    const rearRightWheel = makeWheel(0.82, -1.05);

    carRoot.wheels = {
      fl: frontLeftWheel,
      fr: frontRightWheel,
      rl: rearLeftWheel,
      rr: rearRightWheel,
    };

    // Soft fake ambient shadow under car
    const shadowGeo = new THREE.PlaneGeometry(2.0, 3.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.02;
    visualGroup.add(shadowMesh);

    return carRoot;
  }
}
