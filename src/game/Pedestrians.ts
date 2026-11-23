import * as THREE from 'three';

export interface PedestrianEntity {
  group: THREE.Group;
  baseX: number;
  z: number;
  speed: number;
  direction: 1 | -1; // 1 = walking forward, -1 = walking backward
  walkCycle: number;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  torso: THREE.Mesh;
  torsoBaseY: number;
  head: THREE.Mesh;
  initialY: number;
}

export class PedestrianManager {
  private pedestrians: PedestrianEntity[] = [];
  private scene: THREE.Scene;
  private sidewalks: THREE.Mesh[] = [];
  private sidewalkTex: THREE.CanvasTexture | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private createSidewalkTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#9aa5b4';
    ctx.fillRect(0, 0, 256, 512);

    // Concrete grain noise
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)';
      ctx.fillRect(Math.random() * 256, Math.random() * 512, 3, 3);
    }

    // Paving slab joints
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.42)';
    ctx.lineWidth = 3;
    for (let y = 0; y <= 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 512);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 140);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Builds elevated concrete sidewalks and curbs along both sides of the highway
   */
  public buildSidewalks(length: number = 1500) {
    this.sidewalks.forEach((sw) => {
      this.scene.remove(sw);
      sw.geometry.dispose();
      if (Array.isArray(sw.material)) {
        sw.material.forEach((m) => m.dispose());
      } else {
        sw.material.dispose();
      }
    });
    this.sidewalks = [];
    if (this.sidewalkTex) {
      this.sidewalkTex.dispose();
      this.sidewalkTex = null;
    }

    this.sidewalkTex = this.createSidewalkTexture();
    const sidewalkMat = new THREE.MeshStandardMaterial({
      map: this.sidewalkTex,
      roughness: 0.85,
      metalness: 0.05,
    });
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.65,
      metalness: 0.15,
    });

    [-1, 1].forEach((side) => {
      // Paved Pedestrian Walkway (3.2m wide, subdivided along length for curve bending)
      const walkGeo = new THREE.PlaneGeometry(3.2, length, 2, 120);
      const walk = new THREE.Mesh(walkGeo, sidewalkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(side * 16.6, 0.08, -length / 2 + 100);
      const walkPos = walkGeo.attributes.position;
      const walkBaseXs = new Float32Array(walkPos.count);
      for (let i = 0; i < walkPos.count; i++) {
        walkBaseXs[i] = walkPos.getX(i);
      }
      walk.userData.baseXs = walkBaseXs;
      this.scene.add(walk);
      this.sidewalks.push(walk);

      // Roadside Safety Curb (subdivided along length for curve bending)
      const curbGeo = new THREE.PlaneGeometry(0.45, length, 1, 120);
      const curb = new THREE.Mesh(curbGeo, curbMat);
      curb.rotation.x = -Math.PI / 2;
      curb.position.set(side * 14.8, 0.14, -length / 2 + 100);
      const curbPos = curbGeo.attributes.position;
      const curbBaseXs = new Float32Array(curbPos.count);
      for (let i = 0; i < curbPos.count; i++) {
        curbBaseXs[i] = curbPos.getX(i);
      }
      curb.userData.baseXs = curbBaseXs;
      this.scene.add(curb);
      this.sidewalks.push(curb);
    });
  }

  /**
   * Spawns realistic procedural 3D pedestrians walking along the sidewalks
   */
  public spawnPedestrians(count: number = 28) {
    this.clear();

    const skinTones = [0xf5d0b0, 0xd4a373, 0xbb8357, 0x8d5524, 0xe0ac69];
    const shirtColors = [
      0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899,
      0xf8fafc, 0x1e293b, 0x0284c7, 0x15803d, 0xd97706,
    ];
    const pantsColors = [0x1e293b, 0x334155, 0x475569, 0x1e3a8a, 0x0f172a];
    const hairColors = [0x0f172a, 0x372314, 0x5a3825, 0x1c1917];

    for (let i = 0; i < count; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const baseX = side * (15.8 + Math.random() * 1.6);
      const z = -Math.random() * 1100 + 40;
      const direction = Math.random() > 0.4 ? 1 : -1;

      const group = new THREE.Group();
      group.name = `Pedestrian_${i}`;

      const skinMat = new THREE.MeshStandardMaterial({
        color: skinTones[Math.floor(Math.random() * skinTones.length)],
        roughness: 0.6,
      });
      const shirtMat = new THREE.MeshStandardMaterial({
        color: shirtColors[Math.floor(Math.random() * shirtColors.length)],
        roughness: 0.7,
      });
      const pantsMat = new THREE.MeshStandardMaterial({
        color: pantsColors[Math.floor(Math.random() * pantsColors.length)],
        roughness: 0.8,
      });
      const hairMat = new THREE.MeshStandardMaterial({
        color: hairColors[Math.floor(Math.random() * hairColors.length)],
        roughness: 0.9,
      });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });

      // Scale variation (height ~1.65m to 1.88m)
      const scale = 0.88 + Math.random() * 0.18;
      const torsoBaseY = 1.08 * scale;

      // 1. Torso / Shirt
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.54, 0.22), shirtMat);
      torso.position.y = torsoBaseY;
      group.add(torso);

      // 2. Head & Hair
      const headGroup = new THREE.Group();
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.22), skinMat);
      head.position.y = 0.12;
      headGroup.add(head);

      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.24), hairMat);
      hair.position.y = 0.22;
      headGroup.add(hair);

      headGroup.position.y = torso.position.y + 0.36 * scale;
      group.add(headGroup);

      // 3. Legs & Shoes
      const legGeom = new THREE.BoxGeometry(0.14, 0.62, 0.16);
      const shoeGeom = new THREE.BoxGeometry(0.15, 0.08, 0.24);

      // Left Leg Pivot
      const leftLegPivot = new THREE.Group();
      leftLegPivot.position.set(-0.11, torso.position.y - 0.26 * scale, 0);
      const leftLeg = new THREE.Mesh(legGeom, pantsMat);
      leftLeg.position.y = -0.31 * scale;
      leftLegPivot.add(leftLeg);
      const leftShoe = new THREE.Mesh(shoeGeom, shoeMat);
      leftShoe.position.set(0, -0.60 * scale, 0.04);
      leftLegPivot.add(leftShoe);
      group.add(leftLegPivot);

      // Right Leg Pivot
      const rightLegPivot = new THREE.Group();
      rightLegPivot.position.set(0.11, torso.position.y - 0.26 * scale, 0);
      const rightLeg = new THREE.Mesh(legGeom, pantsMat);
      rightLeg.position.y = -0.31 * scale;
      rightLegPivot.add(rightLeg);
      const rightShoe = new THREE.Mesh(shoeGeom, shoeMat);
      rightShoe.position.set(0, -0.60 * scale, 0.04);
      rightLegPivot.add(rightShoe);
      group.add(rightLegPivot);

      // 4. Arms
      const armGeom = new THREE.BoxGeometry(0.11, 0.52, 0.12);

      const leftArmPivot = new THREE.Group();
      leftArmPivot.position.set(-0.25, torso.position.y + 0.18 * scale, 0);
      const leftArm = new THREE.Mesh(armGeom, shirtMat);
      leftArm.position.y = -0.24 * scale;
      leftArmPivot.add(leftArm);
      group.add(leftArmPivot);

      const rightArmPivot = new THREE.Group();
      rightArmPivot.position.set(0.25, torso.position.y + 0.18 * scale, 0);
      const rightArm = new THREE.Mesh(armGeom, shirtMat);
      rightArm.position.y = -0.24 * scale;
      rightArmPivot.add(rightArm);
      group.add(rightArmPivot);

      // Align facing direction
      group.rotation.y = direction === 1 ? 0 : Math.PI;
      group.position.set(baseX, 0.22, z);
      this.scene.add(group);

      this.pedestrians.push({
        group,
        baseX,
        z,
        speed: 1.2 + Math.random() * 0.9,
        direction,
        walkCycle: Math.random() * Math.PI * 2,
        leftLeg: leftLegPivot as unknown as THREE.Mesh,
        rightLeg: rightLegPivot as unknown as THREE.Mesh,
        leftArm: leftArmPivot as unknown as THREE.Mesh,
        rightArm: rightArmPivot as unknown as THREE.Mesh,
        torso,
        torsoBaseY,
        head: headGroup as unknown as THREE.Mesh,
        initialY: 0.22,
      });
    }
  }

  /**
   * Updates pedestrian walking animations, sidewalk curve alignment, and highway relative scrolling
   */
  public update(dt: number, roadMovement: number, getCurveX: (z: number) => number) {
    if (this.sidewalkTex) {
      this.sidewalkTex.offset.y = (this.sidewalkTex.offset.y + (roadMovement * 140) / 1500) % 1;
    }

    // Bend sidewalks & curbs smoothly with the highway curvature
    this.sidewalks.forEach((sw) => {
      const baseXs = sw.userData.baseXs as Float32Array | undefined;
      if (!baseXs) return;
      const posAttr = sw.geometry.attributes.position;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        const localY = posAttr.getY(i);
        const worldZ = sw.position.z - localY;
        posAttr.setX(i, baseXs[i] + getCurveX(worldZ));
      }
      posAttr.needsUpdate = true;
    });

    this.pedestrians.forEach((p) => {
      // 1. Natural Walking Stride Animation
      p.walkCycle += dt * p.speed * 4.2;
      const legAngle = Math.sin(p.walkCycle) * 0.55;
      const armAngle = Math.sin(p.walkCycle) * 0.45;

      p.leftLeg.rotation.x = legAngle;
      p.rightLeg.rotation.x = -legAngle;
      p.leftArm.rotation.x = -armAngle;
      p.rightArm.rotation.x = armAngle;

      // Subtle vertical torso bobbing
      p.torso.position.y = p.torsoBaseY + Math.abs(Math.sin(p.walkCycle * 2)) * 0.04;

      // 2. Independent walking displacement along sidewalk
      p.z += p.direction * p.speed * dt * 0.8;

      // 3. Relative highway scroll movement
      p.z += roadMovement;
      if (p.z > 35) {
        p.z -= 1150;
      } else if (p.z < -1150) {
        p.z += 1150;
      }

      // 4. Align with road curvature
      const curveOffset = getCurveX(p.z);
      p.group.position.set(p.baseX + curveOffset, p.initialY, p.z);
    });
  }

  public clear() {
    this.pedestrians.forEach((p) => {
      p.group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      this.scene.remove(p.group);
    });
    this.pedestrians = [];
  }

  public destroy() {
    this.clear();
    this.sidewalks.forEach((sw) => {
      this.scene.remove(sw);
      sw.geometry.dispose();
      if (Array.isArray(sw.material)) {
        sw.material.forEach((m) => m.dispose());
      } else {
        sw.material.dispose();
      }
    });
    this.sidewalks = [];
    if (this.sidewalkTex) {
      this.sidewalkTex.dispose();
      this.sidewalkTex = null;
    }
  }
}
