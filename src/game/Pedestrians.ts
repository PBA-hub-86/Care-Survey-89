import * as THREE from 'three';

export interface PedestrianEntity {
  group: THREE.Group;
  baseX: number;
  z: number;
  speed: number;
  direction: 1 | -1; // 1 = walking forward, -1 = walking backward
  walkCycle: number;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  torsoGroup: THREE.Group;
  torsoBaseY: number;
  headGroup: THREE.Group;
  initialY: number;
}

export class PedestrianManager {
  private pedestrians: PedestrianEntity[] = [];
  private scene: THREE.Scene;
  private sidewalks: THREE.Mesh[] = [];
  private sidewalkProps: THREE.Group[] = [];
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

    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)';
      ctx.fillRect(Math.random() * 256, Math.random() * 512, 3, 3);
    }

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

  private disposeGroup(group: THREE.Object3D) {
    group.traverse((obj) => {
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
    this.scene.remove(group);
  }

  /**
   * Builds elevated concrete sidewalks, curbs, and realistic safety bollards along both sides of the highway
   */
  public buildSidewalks(length: number = 1500) {
    this.sidewalks.forEach((sw) => this.disposeGroup(sw));
    this.sidewalks = [];
    this.sidewalkProps.forEach((sp) => this.disposeGroup(sp));
    this.sidewalkProps = [];

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
      const walkGeo = new THREE.PlaneGeometry(3.4, length, 2, 120);
      const walk = new THREE.Mesh(walkGeo, sidewalkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(side * 16.7, 0.08, -length / 2 + 100);
      const walkPos = walkGeo.attributes.position;
      const walkBaseXs = new Float32Array(walkPos.count);
      for (let i = 0; i < walkPos.count; i++) {
        walkBaseXs[i] = walkPos.getX(i);
      }
      walk.userData.baseXs = walkBaseXs;
      this.scene.add(walk);
      this.sidewalks.push(walk);

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

    // Realistic sidewalk benches & safety bollards spaced along the boulevard
    const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.82 });
    const benchIronMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.78, roughness: 0.32 });
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.35 });
    const bollardBandMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    for (let z = -1120; z < 60; z += 75) {
      [-1, 1].forEach((side) => {
        const propGroup = new THREE.Group();
        // Safety bollard near curb
        const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.82, 10), bollardMat);
        bollard.position.set(0, 0.41, 0);
        propGroup.add(bollard);

        const reflBand = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.11, 10), bollardBandMat);
        reflBand.position.set(0, 0.66, 0);
        propGroup.add(reflBand);

        const bx = side * 15.15;
        propGroup.position.set(bx, 0.08, z);
        propGroup.userData = { baseX: bx };
        this.scene.add(propGroup);
        this.sidewalkProps.push(propGroup);

        // Occasional park bench facing the road
        if (Math.abs(z) % 150 === 0) {
          const bench = new THREE.Group();
          const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 1.55), benchWoodMat);
          seat.position.set(0, 0.44, 0);
          bench.add(seat);

          const back = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.44, 1.55), benchWoodMat);
          back.position.set(side * 0.2, 0.68, 0);
          back.rotation.z = side * -0.14;
          bench.add(back);

          [-0.62, 0.62].forEach((lz) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.07), benchIronMat);
            leg.position.set(0, 0.22, lz);
            bench.add(leg);
          });

          const benchX = side * 17.8;
          bench.position.set(benchX, 0.08, z + 18);
          bench.userData = { baseX: benchX };
          this.scene.add(bench);
          this.sidewalkProps.push(bench);
        }
      });
    }
  }

  /**
   * Spawns realistic articulated 3D pedestrians walking along the sidewalks
   */
  public spawnPedestrians(count: number = 36) {
    this.clear();

    const skinTones = [0xf5d0b0, 0xd4a373, 0xbb8357, 0x8d5524, 0xe0ac69];
    const jacketColors = [
      0xdc2626, 0x2563eb, 0x059669, 0xd97706, 0x7c3aed, 0xdb2777,
      0xf1f5f9, 0x1e293b, 0x0284c7, 0x15803d, 0x475569,
    ];
    const pantsColors = [0x1e293b, 0x334155, 0x475569, 0x1e3a8a, 0x0f172a, 0x44403c];
    const hairColors = [0x0f172a, 0x372314, 0x5a3825, 0x1c1917];

    for (let i = 0; i < count; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const baseX = side * (15.8 + Math.random() * 1.7);
      const z = -Math.random() * 1100 + 40;
      const direction = Math.random() > 0.45 ? 1 : -1;

      const group = new THREE.Group();
      group.name = `Pedestrian_${i}`;

      const skinMat = new THREE.MeshStandardMaterial({
        color: skinTones[Math.floor(Math.random() * skinTones.length)],
        roughness: 0.65,
      });
      const jacketMat = new THREE.MeshStandardMaterial({
        color: jacketColors[Math.floor(Math.random() * jacketColors.length)],
        roughness: 0.78,
      });
      const pantsMat = new THREE.MeshStandardMaterial({
        color: pantsColors[Math.floor(Math.random() * pantsColors.length)],
        roughness: 0.85,
      });
      const hairMat = new THREE.MeshStandardMaterial({
        color: hairColors[Math.floor(Math.random() * hairColors.length)],
        roughness: 0.88,
      });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
      const packMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.75 });

      const scale = 0.9 + Math.random() * 0.16;
      const hipY = 0.78 * scale;
      const torsoBaseY = 1.08 * scale;

      // 1. Tapered Human Torso + Pelvis + Collar + Optional Backpack
      const torsoGroup = new THREE.Group();
      torsoGroup.position.y = torsoBaseY;

      const torsoMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.185 * scale, 0.155 * scale, 0.52 * scale, 10),
        jacketMat
      );
      torsoMesh.scale.set(1.15, 1, 0.68);
      torsoGroup.add(torsoMesh);

      const pelvis = new THREE.Mesh(
        new THREE.CylinderGeometry(0.155 * scale, 0.145 * scale, 0.14 * scale, 10),
        pantsMat
      );
      pelvis.scale.set(1.12, 1, 0.68);
      pelvis.position.y = -0.28 * scale;
      torsoGroup.add(pelvis);

      if (Math.random() < 0.38) {
        const backpack = new THREE.Mesh(
          new THREE.BoxGeometry(0.26 * scale, 0.34 * scale, 0.14 * scale),
          packMat
        );
        backpack.position.set(0, 0.02 * scale, -0.15 * scale);
        torsoGroup.add(backpack);
      }
      group.add(torsoGroup);

      // 2. Neck, Rounded Head, Hair Cap & Optional Baseball Cap
      const headGroup = new THREE.Group();
      const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048 * scale, 0.056 * scale, 0.09 * scale, 8),
        skinMat
      );
      neck.position.y = 0.02 * scale;
      headGroup.add(neck);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.118 * scale, 12, 10), skinMat);
      head.position.y = 0.14 * scale;
      headGroup.add(head);

      const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.124 * scale, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
        hairMat
      );
      hair.position.y = 0.155 * scale;
      hair.rotation.x = -0.18;
      headGroup.add(hair);

      if (Math.random() < 0.25) {
        const capBrim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.125 * scale, 0.13 * scale, 0.025 * scale, 10, 1, false, -0.9, 1.8),
          jacketMat
        );
        capBrim.position.set(0, 0.19 * scale, 0.04 * scale);
        headGroup.add(capBrim);
      }

      headGroup.position.y = torsoBaseY + 0.27 * scale;
      group.add(headGroup);

      // 3. Articulated Legs + Shoes
      const legGeom = new THREE.CylinderGeometry(0.068 * scale, 0.054 * scale, 0.66 * scale, 8);
      const shoeGeom = new THREE.BoxGeometry(0.12 * scale, 0.075 * scale, 0.23 * scale);

      const makeLeg = (xOffset: number) => {
        const pivot = new THREE.Group();
        pivot.position.set(xOffset * scale, hipY, 0);
        const legMesh = new THREE.Mesh(legGeom, pantsMat);
        legMesh.position.y = -0.34 * scale;
        pivot.add(legMesh);

        const shoe = new THREE.Mesh(shoeGeom, shoeMat);
        shoe.position.set(0, -0.71 * scale, 0.045 * scale);
        pivot.add(shoe);
        return pivot;
      };

      const leftLeg = makeLeg(-0.1);
      const rightLeg = makeLeg(0.1);
      group.add(leftLeg, rightLeg);

      // 4. Articulated Cylindrical Arms + Hands
      const upperArmGeom = new THREE.CylinderGeometry(0.052 * scale, 0.042 * scale, 0.46 * scale, 8);
      const handGeom = new THREE.SphereGeometry(0.046 * scale, 8, 8);

      const makeArm = (xOffset: number) => {
        const pivot = new THREE.Group();
        pivot.position.set(xOffset * scale, torsoBaseY + 0.2 * scale, 0);
        const sleeve = new THREE.Mesh(upperArmGeom, jacketMat);
        sleeve.position.y = -0.22 * scale;
        pivot.add(sleeve);

        const hand = new THREE.Mesh(handGeom, skinMat);
        hand.position.y = -0.47 * scale;
        pivot.add(hand);
        return pivot;
      };

      const leftArm = makeArm(-0.245);
      const rightArm = makeArm(0.245);
      group.add(leftArm, rightArm);

      // Grounded on top of sidewalk deck (y = 0.09)
      group.rotation.y = direction === 1 ? 0 : Math.PI;
      group.position.set(baseX, 0.09, z);
      this.scene.add(group);

      this.pedestrians.push({
        group,
        baseX,
        z,
        speed: 1.25 + Math.random() * 0.85,
        direction,
        walkCycle: Math.random() * Math.PI * 2,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        torsoGroup,
        torsoBaseY,
        headGroup,
        initialY: 0.09,
      });
    }
  }

  /**
   * Updates pedestrian walking animations, sidewalk curve alignment, props, and highway relative scrolling
   */
  public update(dt: number, roadMovement: number, getCurveX: (z: number) => number) {
    if (this.sidewalkTex) {
      this.sidewalkTex.offset.y = (this.sidewalkTex.offset.y + (roadMovement * 140) / 1500) % 1;
    }

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

    this.sidewalkProps.forEach((sp) => {
      sp.position.z += roadMovement;
      if (sp.position.z > 35) sp.position.z -= 1200;
      if (sp.userData.baseX !== undefined) {
        sp.position.x = sp.userData.baseX + getCurveX(sp.position.z);
        const dCurv = getCurveX(sp.position.z - 3) - getCurveX(sp.position.z + 3);
        sp.rotation.y = Math.atan2(dCurv, 6);
      }
    });

    this.pedestrians.forEach((p) => {
      p.walkCycle += dt * p.speed * 4.4;
      const legAngle = Math.sin(p.walkCycle) * 0.56;
      const armAngle = Math.sin(p.walkCycle) * 0.44;

      p.leftLeg.rotation.x = legAngle;
      p.rightLeg.rotation.x = -legAngle;
      p.leftArm.rotation.x = -armAngle;
      p.rightArm.rotation.x = armAngle;

      const strideBob = Math.abs(Math.sin(p.walkCycle)) * 0.035;
      p.torsoGroup.position.y = p.torsoBaseY + strideBob;
      p.headGroup.rotation.y = Math.sin(p.walkCycle * 0.25) * 0.14;

      p.z += p.direction * p.speed * dt * 0.9;
      p.z += roadMovement;
      if (p.z > 35) {
        p.z -= 1150;
      } else if (p.z < -1150) {
        p.z += 1150;
      }

      const curveOffset = getCurveX(p.z);
      p.group.position.set(p.baseX + curveOffset, p.initialY, p.z);
    });
  }

  public clear() {
    this.pedestrians.forEach((p) => this.disposeGroup(p.group));
    this.pedestrians = [];
  }

  public destroy() {
    this.clear();
    this.sidewalks.forEach((sw) => this.disposeGroup(sw));
    this.sidewalks = [];
    this.sidewalkProps.forEach((sp) => this.disposeGroup(sp));
    this.sidewalkProps = [];
    if (this.sidewalkTex) {
      this.sidewalkTex.dispose();
      this.sidewalkTex = null;
    }
  }
}
