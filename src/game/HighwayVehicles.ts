import * as THREE from 'three';

/**
 * Helper to create an extruded vehicle body silhouette centered cleanly along the X axis
 * Profile coordinates: x = Z coordinate (front negative -> rear positive), y = height from ground
 */
function createCenteredCarExtrusion(
  points: Array<[number, number]>,
  width: number,
  bevelSize = 0.06
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevelSize * 2,
    bevelEnabled: true,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 2,
    curveSegments: 4,
  });
  // Rotate so X-axis of 2D profile becomes -Z (front) to +Z (rear), extrusion depth maps to X width
  geo.rotateY(-Math.PI / 2);
  geo.translate(width / 2 - bevelSize, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

function createTurnBlinkers(
  group: THREE.Group,
  halfWidth: number,
  y: number,
  rearZ: number,
  frontZ: number
) {
  const makeMat = () =>
    new THREE.MeshBasicMaterial({
      color: 0xff9500,
      transparent: true,
      opacity: 0.18,
    });
  const leftMat = makeMat();
  const rightMat = makeMat();

  const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.08), leftMat);
  rearL.position.set(-halfWidth * 0.78, y, rearZ);
  group.add(rearL);

  const frontL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.08), leftMat);
  frontL.position.set(-halfWidth * 0.78, y - 0.08, frontZ);
  group.add(frontL);

  const rearR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.08), rightMat);
  rearR.position.set(halfWidth * 0.78, y, rearZ);
  group.add(rearR);

  const frontR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.08), rightMat);
  frontR.position.set(halfWidth * 0.78, y - 0.08, frontZ);
  group.add(frontR);

  group.userData.blinkers = { leftMat, rightMat };
}

/**
 * Realistic Procedural 3D Highway Vehicles with Sculpted Extruded Silhouettes,
 * Clearcoat Automotive Paint, Alloy Wheels, and Functional Turn-Signal Blinkers:
 * 1. Highway Express Touring Coach
 * 2. Heavy 18-Wheeler Semi-Truck & Container Trailer
 * 3. Modern Executive SUV / 4x4
 */
export class HighwayVehicles {
  /**
   * Intercity Luxury Express Coach with Beveled Front Fascia & Panoramic Glass
   */
  public static createHighwayExpressCoach(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'HighwayExpressCoach';
    const w = 2.5;
    const l = 8.2;

    const paintColors = [0x0284c7, 0xdc2626, 0x16a34a, 0x4f46e5, 0x1e293b, 0x7c3aed];
    const coachPaint = paintColors[Math.floor(Math.random() * paintColors.length)];

    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: coachPaint,
      roughness: 0.24,
      metalness: 0.45,
      clearcoat: 0.85,
      clearcoatRoughness: 0.14,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.22,
      metalness: 0.25,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.92,
      roughness: 0.14,
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x091322,
      roughness: 0.06,
      metalness: 0.9,
      clearcoat: 1.0,
    });

    // 1. Sculpted Aerodynamic Coach Body Shell
    const bodyGeo = createCenteredCarExtrusion(
      [
        [-l / 2 - 0.45, 0.36],
        [-l / 2 - 0.5, 1.35],
        [-l / 2 - 0.18, 2.66],
        [l / 2, 2.72],
        [l / 2 + 0.05, 0.42],
      ],
      w,
      0.08
    );
    const shell = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(shell);

    // Side Accent Livery Stripe & Undercarriage Skirt
    const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, 0.3, l * 0.96), accentMat);
    sideStripe.position.set(0, 1.15, 0);
    group.add(sideStripe);

    const chassisSkirt = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.35, l * 0.92), darkMat);
    chassisSkirt.position.set(0, 0.38, 0);
    group.add(chassisSkirt);

    // 2. Panoramic Side Windows + Pillars + Sloped Windshield
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.92, l * 0.9), glassMat);
    sideGlass.position.set(0, 2.02, 0.15);
    group.add(sideGlass);

    for (let pz = -l / 2 + 1.1; pz <= l / 2 - 0.8; pz += 1.45) {
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.94, 0.11), darkMat);
      mullion.position.set(0, 2.02, pz);
      group.add(mullion);
    }

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 1.05, 0.12), glassMat);
    windshield.rotation.x = -0.22;
    windshield.position.set(0, 2.0, -l / 2 - 0.32);
    group.add(windshield);

    // Side Mirrors on Stalks
    [-w / 2 - 0.16, w / 2 + 0.16].forEach((mx) => {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.16), darkMat);
      mirror.position.set(mx, 1.92, -l / 2 - 0.15);
      group.add(mirror);
    });

    // Chrome Grille & Front Bumper
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.4, 0.1), chromeMat);
    grille.position.set(0, 0.72, -l / 2 - 0.52);
    group.add(grille);

    // LED Destination Sign
    const destCanvas = document.createElement('canvas');
    destCanvas.width = 512;
    destCanvas.height = 100;
    const dctx = destCanvas.getContext('2d');
    if (dctx) {
      dctx.fillStyle = '#09111f';
      dctx.fillRect(0, 0, 512, 100);
      dctx.strokeStyle = '#38bdf8';
      dctx.lineWidth = 4;
      dctx.strokeRect(4, 4, 504, 92);
      dctx.fillStyle = '#fde047';
      dctx.font = 'bold 34px sans-serif';
      dctx.textAlign = 'center';
      dctx.fillText('EXPRESS INTERCITY', 256, 46);
      dctx.fillStyle = '#38bdf8';
      dctx.font = 'bold 24px sans-serif';
      dctx.fillText('HIGHWAY TRANSIT COACH', 256, 82);
    }
    const destTex = new THREE.CanvasTexture(destCanvas);
    destTex.colorSpace = THREE.SRGBColorSpace;
    const destSign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 0.42),
      new THREE.MeshBasicMaterial({ map: destTex })
    );
    destSign.position.set(0, 2.52, -l / 2 - 0.24);
    destSign.rotation.y = Math.PI;
    group.add(destSign);

    const acPod = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.2, 2.1), darkMat);
    acPod.position.set(0, 2.82, 0.5);
    group.add(acPod);

    // Headlights, Taillights & Blinkers
    [-0.92, 0.92].forEach((hx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.08), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
      hl.position.set(hx, 0.74, -l / 2 - 0.52);
      group.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.08), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      tl.position.set(hx, 1.38, l / 2 + 0.06);
      group.add(tl);
    });
    createTurnBlinkers(group, w / 2, 0.88, l / 2 + 0.07, -l / 2 - 0.51);

    // 6 Wheels with Chrome Hubcaps
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const wheelGeom = new THREE.CylinderGeometry(0.48, 0.48, 0.3, 18);
    const hubGeom = new THREE.CylinderGeometry(0.27, 0.27, 0.32, 14);

    [
      [-w / 2 - 0.04, -2.6], [w / 2 + 0.04, -2.6],
      [-w / 2 - 0.04, 1.9], [w / 2 + 0.04, 1.9],
      [-w / 2 - 0.04, 3.1], [w / 2 + 0.04, 3.1],
    ].forEach(([wx, wz]) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeom, tireMat);
      tire.rotation.z = Math.PI / 2;
      wg.add(tire);
      const hub = new THREE.Mesh(hubGeom, chromeMat);
      hub.rotation.z = Math.PI / 2;
      wg.add(hub);
      wg.position.set(wx, 0.48, wz);
      group.add(wg);
    });

    return group;
  }

  /**
   * Realistic 18-Wheeler Semi-Truck & Container Trailer with Sloped Sleeper Cab
   */
  public static createSemiTruckTrailer(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'SemiTruckTrailer';
    const w = 2.6;
    const trailerL = 8.6;

    const cabColors = [0xdc2626, 0x2563eb, 0x15803d, 0xd97706, 0x334155];
    const cabPaint = cabColors[Math.floor(Math.random() * cabColors.length)];

    const cabMat = new THREE.MeshPhysicalMaterial({
      color: cabPaint,
      metalness: 0.65,
      roughness: 0.25,
      clearcoat: 0.8,
    });
    const trailerMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.45, roughness: 0.52 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.12 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x091322, metalness: 0.92, roughness: 0.06 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const wheelGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.32, 16);

    // 1. Sloped Aerodynamic Sleeper Tractor Cab (ExtrudeGeometry)
    const cabGeo = createCenteredCarExtrusion(
      [
        [-6.65, 0.42],
        [-6.65, 1.62],
        [-5.45, 1.72],
        [-4.95, 2.76],
        [-3.05, 2.9],
        [-3.05, 0.45],
      ],
      w * 0.96,
      0.07
    );
    const cab = new THREE.Mesh(cabGeo, cabMat);
    group.add(cab);

    const cabWindshield = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.82, 0.1), glassMat);
    cabWindshield.position.set(0, 2.22, -5.22);
    cabWindshield.rotation.x = -0.35;
    group.add(cabWindshield);

    // Side Fuel Tanks & Aero Step Rails
    [-w / 2 + 0.12, w / 2 - 0.12].forEach((fx) => {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.7, 12), chromeMat);
      tank.rotation.x = Math.PI / 2;
      tank.position.set(fx, 0.68, -4.1);
      group.add(tank);

      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.14), chromeMat);
      mirror.position.set(fx + (fx < 0 ? -0.26 : 0.26), 2.15, -5.25);
      group.add(mirror);
    });

    // Chrome Grille & Heavy Bumper
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.05, 0.12), chromeMat);
    grille.position.set(0, 1.12, -6.68);
    group.add(grille);

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, 0.4, 0.25), chromeMat);
    bumper.position.set(0, 0.52, -6.72);
    group.add(bumper);

    // Vertical Dual Chrome Exhaust Stacks
    [-w / 2 - 0.1, w / 2 + 0.1].forEach((sx) => {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.25, 10), chromeMat);
      stack.position.set(sx, 2.35, -3.15);
      group.add(stack);
    });

    // 2. 40ft Shipping Container Trailer + Underrun Chassis Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, trailerL + 2.2), darkMat);
    frame.position.set(0, 0.82, 0.6);
    group.add(frame);

    const trailer = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 2.75, trailerL), trailerMat);
    trailer.position.set(0, 2.3, 1.6);
    group.add(trailer);

    for (let rz = -trailerL / 2 + 0.6; rz < trailerL / 2 - 0.4; rz += 0.85) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, 2.65, 0.08), chromeMat);
      rib.position.set(0, 2.3, 1.6 + rz);
      group.add(rib);
    }

    // Rear Reflective Safety Chevron Bar
    const safetyBar = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.92, 0.14, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    safetyBar.position.set(0, 0.62, 1.6 + trailerL / 2 + 0.04);
    group.add(safetyBar);

    // 3. Headlights, Rear Lights & Turn Blinkers
    [-0.95, 0.95].forEach((hx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(hx, 0.88, -6.74);
      group.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.36, 0.08), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      tl.position.set(hx, 0.96, 1.6 + trailerL / 2 + 0.06);
      group.add(tl);
    });
    createTurnBlinkers(group, w / 2, 0.96, 1.6 + trailerL / 2 + 0.08, -6.74);

    // 4. 10 Wheels (Tractor & Trailer Axles)
    const wheelPositions = [
      [-w / 2 - 0.05, -6.0], [w / 2 + 0.05, -6.0],
      [-w / 2 - 0.05, -3.7], [w / 2 + 0.05, -3.7],
      [-w / 2 - 0.05, -2.5], [w / 2 + 0.05, -2.5],
      [-w / 2 - 0.05, 4.2], [w / 2 + 0.05, 4.2],
      [-w / 2 - 0.05, 5.4], [w / 2 + 0.05, 5.4],
    ];

    wheelPositions.forEach(([wx, wz]) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeom, tireMat);
      tire.rotation.z = Math.PI / 2;
      wg.add(tire);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.34, 12), chromeMat);
      hub.rotation.z = Math.PI / 2;
      wg.add(hub);
      wg.position.set(wx, 0.5, wz);
      group.add(wg);
    });

    return group;
  }

  /**
   * Sculpted Executive Highway SUV / 4x4 with Beveled Extruded Profile & Clearcoat Paint
   */
  public static createHighwaySUV(paintColor?: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'HighwaySUV';
    const w = 1.96;
    const l = 4.45;

    const paint = paintColor ?? [0x0f172a, 0xf8fafc, 0x1e3a8a, 0x475569, 0xb91c1c, 0x065f46][Math.floor(Math.random() * 6)];
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: paint,
      metalness: 0.78,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x071120,
      metalness: 0.92,
      roughness: 0.06,
      clearcoat: 1.0,
    });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72, metalness: 0.2 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.94, roughness: 0.12 });

    // Sculpted SUV Body Profile
    const suvBodyGeo = createCenteredCarExtrusion(
      [
        [-l / 2, 0.3],
        [-l / 2 - 0.06, 0.84],
        [-1.18, 0.98],
        [-0.58, 1.56],
        [1.52, 1.54],
        [l / 2 - 0.06, 1.0],
        [l / 2, 0.34],
      ],
      w,
      0.07
    );
    const body = new THREE.Mesh(suvBodyGeo, bodyMat);
    group.add(body);

    // Recessed Tinted Glass Cabin & Side Mirrors
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.44, l * 0.56), glassMat);
    cabin.position.set(0, 1.24, 0.38);
    group.add(cabin);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.52, 0.1), glassMat);
    windshield.position.set(0, 1.23, -0.88);
    windshield.rotation.x = -0.58;
    group.add(windshield);

    [-w / 2 - 0.1, w / 2 + 0.1].forEach((mx) => {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.16), bodyMat);
      mirror.position.set(mx, 1.02, -0.68);
      group.add(mirror);
    });

    // Lower Wheel Arch Cladding + Roof Rails
    const cladding = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.16, l * 0.94), trimMat);
    cladding.position.set(0, 0.34, 0);
    group.add(cladding);

    [-w * 0.36, w * 0.36].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, l * 0.46), chromeMat);
      rail.position.set(rx, 1.6, 0.42);
      group.add(rail);
    });

    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.3, 0.08), chromeMat);
    grille.position.set(0, 0.64, -l / 2 - 0.05);
    group.add(grille);

    [-w * 0.36, w * 0.36].forEach((hx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.13, 0.08), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
      hl.position.set(hx, 0.72, -l / 2 - 0.05);
      group.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.08), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      tl.position.set(hx, 0.88, l / 2 + 0.03);
      group.add(tl);
    });
    createTurnBlinkers(group, w / 2, 0.78, l / 2 + 0.04, -l / 2 - 0.05);

    // 4 Alloy Wheels
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.78 });
    const wheelGeom = new THREE.CylinderGeometry(0.41, 0.41, 0.28, 18);
    [
      [-w / 2 - 0.03, -1.36], [w / 2 + 0.03, -1.36],
      [-w / 2 - 0.03, 1.36], [w / 2 + 0.03, 1.36],
    ].forEach(([wx, wz]) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeom, tireMat);
      tire.rotation.z = Math.PI / 2;
      wg.add(tire);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.3, 14), chromeMat);
      hub.rotation.z = Math.PI / 2;
      wg.add(hub);
      wg.position.set(wx, 0.41, wz);
      group.add(wg);
    });

    return group;
  }
}
