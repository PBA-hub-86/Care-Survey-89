import * as THREE from 'three';

/**
 * Ultra-Realistic Procedural 3D Highway Vehicles:
 * 1. Highway Express Touring Coach (Modern intercity luxury bus)
 * 2. Heavy 18-Wheeler Semi-Truck & Container Trailer
 * 3. Modern Executive SUV / 4x4
 * 4. High-Performance GT Sports Coupe
 * 5. Commuter Transit Van
 */
export class HighwayVehicles {
  /**
   * Ultra-Realistic Intercity Luxury Express Coach
   * Aerodynamic touring bus with panoramic tinted glass, chrome trim, and 6 alloy wheels
   */
  public static createHighwayExpressCoach(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'HighwayExpressCoach';
    const w = 2.5;
    const h = 2.45;
    const l = 8.2;

    const paintColors = [0x0284c7, 0xdc2626, 0x16a34a, 0x4f46e5, 0x0f172a, 0x7c3aed];
    const coachPaint = paintColors[Math.floor(Math.random() * paintColors.length)];

    const bodyMat = new THREE.MeshStandardMaterial({
      color: coachPaint,
      roughness: 0.25,
      metalness: 0.45,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.3,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.1,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
    });

    // 1. Lower Chassis & Aerodynamic Skirts
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(w, 1.3, l), bodyMat);
    lowerBody.position.y = 1.0;
    group.add(lowerBody);

    // Dynamic Sweeping Side Accent Stripe
    const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.38, l * 0.98), accentMat);
    sideStripe.position.y = 1.15;
    group.add(sideStripe);

    // Front Aerodynamic Curved Nose
    const nose = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 1.15, 0.65), bodyMat);
    nose.position.set(0, 1.05, -l / 2 - 0.25);
    group.add(nose);

    // Front Chrome Grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.45, 0.12), chromeMat);
    grille.position.set(0, 0.72, -l / 2 - 0.58);
    group.add(grille);

    // 2. Panoramic Tinted Windows & Cabin
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.08,
      metalness: 0.92,
    });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.98, l * 0.95), glassMat);
    cabin.position.set(0, 2.1, 0);
    group.add(cabin);

    // Aerodynamic Sloped Windshield
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, 0.95), glassMat);
    windshield.rotation.x = 0.22;
    windshield.position.set(0, 2.1, -l / 2 - 0.22);
    group.add(windshield);

    // Digital LED Destination Display: [ HIGHWAY EXPRESS ]
    const destCanvas = document.createElement('canvas');
    destCanvas.width = 512; destCanvas.height = 100;
    const dctx = destCanvas.getContext('2d');
    if (dctx) {
      dctx.fillStyle = '#0f172a';
      dctx.fillRect(0, 0, 512, 100);
      dctx.strokeStyle = '#38bdf8';
      dctx.lineWidth = 4;
      dctx.strokeRect(4, 4, 504, 92);
      dctx.fillStyle = '#fde047';
      dctx.font = 'bold 36px sans-serif';
      dctx.textAlign = 'center';
      dctx.fillText('EXPRESS INTERCITY', 256, 46);
      dctx.fillStyle = '#38bdf8';
      dctx.font = 'bold 26px sans-serif';
      dctx.fillText('HIGHWAY TRANSIT COACH', 256, 84);
    }
    const destSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 0.48),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(destCanvas) })
    );
    destSign.position.set(0, 2.56, -l / 2 - 0.16);
    group.add(destSign);

    // 3. Roof & Climate Control Pod
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.18, l * 0.96), bodyMat);
    roof.position.set(0, 2.65, 0);
    group.add(roof);

    const acPod = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 1.8), darkMat);
    acPod.position.set(0, 2.8, 0.5);
    group.add(acPod);

    // 4. Headlights & Taillights
    [-0.92, 0.92].forEach((hx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(hx, 0.76, -l / 2 - 0.55);
      group.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.1), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      tl.position.set(hx, 1.45, l / 2 + 0.03);
      group.add(tl);
    });

    // 5. 6 Wheels with Chrome Hubcaps
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const wheelGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16);
    const hubGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.32, 12);

    [
      [-w / 2 - 0.05, -2.6], [w / 2 + 0.05, -2.6],
      [-w / 2 - 0.05, 1.9], [w / 2 + 0.05, 1.9],
      [-w / 2 - 0.05, 3.1], [w / 2 + 0.05, 3.1],
    ].forEach(([wx, wz]) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeom, tireMat);
      tire.rotation.z = Math.PI / 2;
      wg.add(tire);
      const hub = new THREE.Mesh(hubGeom, chromeMat);
      hub.rotation.z = Math.PI / 2;
      wg.add(hub);
      wg.position.set(wx, 0.5, wz);
      group.add(wg);
    });

    return group;
  }

  /**
   * Ultra-Realistic Highway 18-Wheeler Semi-Truck & Container Trailer
   * Massive tractor cab, chrome smokestacks, and 40ft container trailer
   */
  public static createSemiTruckTrailer(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'SemiTruckTrailer';
    const w = 2.6;
    const cabL = 3.6;
    const trailerL = 8.5;

    const cabColors = [0xdc2626, 0x2563eb, 0x15803d, 0xd97706, 0x475569];
    const cabPaint = cabColors[Math.floor(Math.random() * cabColors.length)];

    const cabMat = new THREE.MeshStandardMaterial({ color: cabPaint, metalness: 0.6, roughness: 0.3 });
    const trailerMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.5 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const wheelGeom = new THREE.CylinderGeometry(0.52, 0.52, 0.32, 16);

    // 1. Tractor Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, cabL), cabMat);
    cab.position.set(0, 1.6, -4.8);
    group.add(cab);

    // Front Chrome Monster Grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.3, 0.2), chromeMat);
    grille.position.set(0, 1.25, -4.8 - cabL / 2 - 0.1);
    group.add(grille);

    // Chrome Bumper
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(w * 1.05, 0.45, 0.3), chromeMat);
    bumper.position.set(0, 0.5, -4.8 - cabL / 2 - 0.15);
    group.add(bumper);

    // Vertical Dual Chrome Exhaust Smokestacks
    [-w / 2 - 0.15, w / 2 + 0.15].forEach((sx) => {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 12), chromeMat);
      stack.position.set(sx, 2.4, -4.8 + cabL / 2 - 0.2);
      group.add(stack);
    });

    // 2. 40ft Shipping Container Trailer
    const trailer = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 2.8, trailerL), trailerMat);
    trailer.position.set(0, 2.2, 1.6);
    group.add(trailer);

    // Container Corrugation Ribs
    for (let rz = -trailerL / 2 + 0.6; rz < trailerL / 2 - 0.4; rz += 0.8) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(w * 1.05, 2.7, 0.08), chromeMat);
      rib.position.set(0, 2.2, 1.6 + rz);
      group.add(rib);
    }

    // 3. Headlights & Rear Lights
    [-0.95, 0.95].forEach((hx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(hx, 0.9, -4.8 - cabL / 2 - 0.18);
      group.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, 0.1), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      tl.position.set(hx, 1.0, 1.6 + trailerL / 2 + 0.05);
      group.add(tl);
    });

    // 4. Wheels (Tractor & Trailer Axles)
    const wheelPositions = [
      // Tractor Front
      [-w / 2 - 0.06, -6.1], [w / 2 + 0.06, -6.1],
      // Tractor Dual Rear
      [-w / 2 - 0.06, -3.8], [w / 2 + 0.06, -3.8],
      [-w / 2 - 0.06, -2.6], [w / 2 + 0.06, -2.6],
      // Trailer Dual Rear
      [-w / 2 - 0.06, 4.2], [w / 2 + 0.06, 4.2],
      [-w / 2 - 0.06, 5.4], [w / 2 + 0.06, 5.4],
    ];

    wheelPositions.forEach(([wx, wz]) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeom, tireMat);
      tire.rotation.z = Math.PI / 2;
      wg.add(tire);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.34, 12), chromeMat);
      hub.rotation.z = Math.PI / 2;
      wg.add(hub);
      wg.position.set(wx, 0.52, wz);
      group.add(wg);
    });

    return group;
  }

  /**
   * Ultra-Realistic Executive Highway SUV
   */
  public static createHighwaySUV(paintColor?: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'HighwaySUV';
    const w = 1.95;
    const h = 0.95;
    const l = 4.4;

    const paint = paintColor ?? [0x0f172a, 0xf8fafc, 0x1e3a8a, 0x475569, 0xb91c1c][Math.floor(Math.random() * 5)];
    const bodyMat = new THREE.MeshStandardMaterial({ color: paint, metalness: 0.8, roughness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a1424, metalness: 0.9, roughness: 0.08 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });

    const lower = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.7, l), bodyMat);
    lower.position.y = 0.65;
    group.add(lower);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.68, l * 0.58), glassMat);
    cabin.position.set(0, 1.25, 0.1);
    group.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.08, l * 0.52), bodyMat);
    roof.position.set(0, 1.62, 0.1);
    group.add(roof);

    // Roof Rails
    [-w * 0.38, w * 0.38].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, l * 0.48), chromeMat);
      rail.position.set(rx, 1.68, 0.1);
      group.add(rail);
    });

    // Front Grille & Headlights
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.32, 0.1), chromeMat);
    grille.position.set(0, 0.72, -l / 2 - 0.04);
    group.add(grille);

    [-w * 0.36, w * 0.36].forEach((hx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(hx, 0.75, -l / 2 - 0.04);
      group.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.08), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      tl.position.set(hx, 0.85, l / 2 + 0.04);
      group.add(tl);
    });

    // 4 Wheels
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
    const wheelGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 16);
    [
      [-w / 2 - 0.04, -1.4], [w / 2 + 0.04, -1.4],
      [-w / 2 - 0.04, 1.4], [w / 2 + 0.04, 1.4],
    ].forEach(([wx, wz]) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeom, tireMat);
      tire.rotation.z = Math.PI / 2;
      wg.add(tire);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.3, 12), chromeMat);
      hub.rotation.z = Math.PI / 2;
      wg.add(hub);
      wg.position.set(wx, 0.42, wz);
      group.add(wg);
    });

    return group;
  }
}
