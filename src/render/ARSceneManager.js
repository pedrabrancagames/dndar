/**
 * AR Scene Manager
 * Gerencia a cena de Realidade Aumentada usando WebXR + Three.js
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export class ARSceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        this.modelCache = new Map();
        this.enemyMeshes = new Map();

        this.gltfLoader = null;
        this.dracoLoader = null;

        this.callbacks = {};
        this.animationId = null;

        this.isARSupported = false;
        this.isARActive = false;
        this.xrSession = null;
        this.xrRefSpace = null;

        // Raycaster para seleção
        this.raycaster = new THREE.Raycaster();
        this.hitTestSource = null;
        this.hitTestSourceRequested = false;

        // Reticle para placement
        this.reticle = null;
        this.enemiesPlaced = false;

        // Controller para seleção em AR
        this.controller = null;
    }

    on(evento, callback) {
        this.callbacks[evento] = callback;
    }

    emit(evento, data) {
        if (this.callbacks[evento]) {
            this.callbacks[evento](data);
        }
    }

    async checkARSupport() {
        if ('xr' in navigator) {
            try {
                this.isARSupported = await navigator.xr.isSessionSupported('immersive-ar');
                console.log('[ARSceneManager] WebXR AR suportado:', this.isARSupported);
            } catch (e) {
                console.warn('[ARSceneManager] Erro ao verificar suporte AR:', e);
                this.isARSupported = false;
            }
        } else {
            console.warn('[ARSceneManager] WebXR não disponível');
            this.isARSupported = false;
        }
        return this.isARSupported;
    }

    async init() {
        await this.checkARSupport();

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;

        this.container.appendChild(this.renderer.domElement);

        this.setupLoaders();
        this.setupARLighting();
        this.createReticle();
        this.setupEventListeners();

        console.log('[ARSceneManager] Inicializado');
        return this.isARSupported;
    }

    setupLoaders() {
        this.dracoLoader = new DRACOLoader();
        // Usar decoder DRACO do CDN (mais confiável)
        this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }

    setupARLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 6, 0);
        this.scene.add(directionalLight);
    }

    createReticle() {
        const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.7
        });
        this.reticle = new THREE.Mesh(geometry, material);
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add(this.reticle);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onResize());
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    async startAR() {
        if (!this.isARSupported) {
            this.emit('arError', { message: 'AR não suportado neste dispositivo' });
            return false;
        }

        try {
            const sessionInit = {
                requiredFeatures: ['hit-test'],
                optionalFeatures: ['dom-overlay'],
                domOverlay: { root: document.getElementById('combat-hud') }
            };

            this.xrSession = await navigator.xr.requestSession('immersive-ar', sessionInit);

            this.renderer.xr.setReferenceSpaceType('local');
            await this.renderer.xr.setSession(this.xrSession);

            this.xrSession.addEventListener('end', () => this.onSessionEnd());

            // Controller para detectar toques
            this.controller = this.renderer.xr.getController(0);
            this.controller.addEventListener('select', () => this.onARSelect());
            this.scene.add(this.controller);

            this.isARActive = true;
            this.enemiesPlaced = false;

            this.renderer.setAnimationLoop((time, frame) => this.renderAR(time, frame));

            this.emit('arStarted');
            console.log('[ARSceneManager] Sessão AR iniciada');

            return true;
        } catch (e) {
            console.error('[ARSceneManager] Erro ao iniciar AR:', e);
            this.emit('arError', { message: e.message });
            return false;
        }
    }

    async stopAR() {
        if (this.xrSession) {
            await this.xrSession.end();
        }
    }

    onSessionEnd() {
        this.isARActive = false;
        this.xrSession = null;
        this.hitTestSource = null;
        this.hitTestSourceRequested = false;
        this.renderer.setAnimationLoop(null);

        this.emit('arEnded');
        console.log('[ARSceneManager] Sessão AR encerrada');
    }

    renderAR(time, frame) {
        if (!frame) return;

        const session = this.renderer.xr.getSession();

        // Hit test para encontrar superfícies
        if (!this.enemiesPlaced) {
            if (!this.hitTestSourceRequested) {
                session.requestReferenceSpace('viewer').then((refSpace) => {
                    session.requestHitTestSource({ space: refSpace }).then((source) => {
                        this.hitTestSource = source;
                    });
                });
                this.hitTestSourceRequested = true;
            }

            if (this.hitTestSource) {
                const hitTestResults = frame.getHitTestResults(this.hitTestSource);

                if (hitTestResults.length > 0) {
                    const hit = hitTestResults[0];
                    const refSpace = this.renderer.xr.getReferenceSpace();
                    const pose = hit.getPose(refSpace);

                    this.reticle.visible = true;
                    this.reticle.matrix.fromArray(pose.transform.matrix);
                } else {
                    this.reticle.visible = false;
                }
            }
        }

        this.updateAnimations(time);
        this.renderer.render(this.scene, this.camera);
    }

    updateAnimations(time) {
        this.enemyMeshes.forEach((mesh) => {
            if (mesh.visible && mesh.userData.baseY !== undefined) {
                mesh.rotation.y = Math.sin(time * 0.001) * 0.2;
                mesh.position.y = mesh.userData.baseY + Math.sin(time * 0.003) * 0.03;
            }
        });
    }

    onARSelect() {
        if (!this.isARActive) return;

        console.log('[ARSceneManager] Toque detectado em AR');
        console.log('[ARSceneManager] enemiesPlaced:', this.enemiesPlaced);
        console.log('[ARSceneManager] reticle.visible:', this.reticle.visible);
        console.log('[ARSceneManager] enemyMeshes.size:', this.enemyMeshes.size);

        if (!this.enemiesPlaced && this.reticle.visible) {
            this.placeEnemiesAtReticle();
            return;
        }

        this.checkEnemySelectionAR();
    }

    placeEnemiesAtReticle() {
        console.log('[ARSceneManager] Posicionando inimigos...');

        if (this.enemyMeshes.size === 0) {
            console.warn('[ARSceneManager] Nenhum inimigo para posicionar!');
            return;
        }

        const position = new THREE.Vector3();
        position.setFromMatrixPosition(this.reticle.matrix);

        console.log('[ARSceneManager] Posição:', position.x.toFixed(2), position.y.toFixed(2), position.z.toFixed(2));

        const meshesArray = Array.from(this.enemyMeshes.values());

        meshesArray.forEach((mesh, index) => {
            const offset = (index - (meshesArray.length - 1) / 2) * 0.4;
            mesh.position.set(
                position.x + offset,
                position.y + 0.15,
                position.z
            );
            mesh.userData.baseY = position.y + 0.15;
            mesh.visible = true;

            console.log('[ARSceneManager] Inimigo', index, 'visível:', mesh.visible);
        });

        this.reticle.visible = false;
        this.enemiesPlaced = true;

        this.emit('enemiesPlaced', { position });
        console.log('[ARSceneManager] Inimigos posicionados com sucesso!');
    }

    checkEnemySelectionAR() {
        console.log('[ARSceneManager] Verificando seleção de inimigo...');

        if (!this.controller) {
            console.warn('[ARSceneManager] Controller não disponível');
            return;
        }

        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(this.controller.matrixWorld);

        this.raycaster.ray.origin.setFromMatrixPosition(this.controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

        const meshes = Array.from(this.enemyMeshes.values())
            .filter(m => m.visible && m.userData.selecionavel);

        console.log('[ARSceneManager] Meshes selecionáveis:', meshes.length);

        const intersects = this.raycaster.intersectObjects(meshes, true);

        console.log('[ARSceneManager] Intersecções encontradas:', intersects.length);

        if (intersects.length > 0) {
            let target = intersects[0].object;
            while (target && !target.userData.instanceId) {
                target = target.parent;
            }

            if (target && target.userData.instanceId) {
                console.log('[ARSceneManager] Inimigo selecionado:', target.userData.instanceId);
                this.emit('inimigoClicado', { instanceId: target.userData.instanceId });
            } else {
                console.warn('[ARSceneManager] Target encontrado mas sem instanceId');
            }
        } else {
            console.log('[ARSceneManager] Nenhum inimigo na mira');
        }
    }

    async adicionarInimigos(inimigos) {
        console.log('[ARSceneManager] Adicionando', inimigos.length, 'inimigos');

        const cores = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];

        for (let index = 0; index < inimigos.length; index++) {
            const inimigo = inimigos[index];
            const cor = cores[index % cores.length];

            // Tentar carregar modelo GLB primeiro
            try {
                const modelPath = `/public/assets/models/${inimigo.modelo}`;
                console.log('[ARSceneManager] Carregando modelo:', modelPath);

                const model = await this.loadModel(modelPath);

                // Escala para AR (5x maior)
                model.scale.setScalar((inimigo.escala || 1) * 1.25);
                model.visible = false;
                model.userData = {
                    instanceId: inimigo.instanceId,
                    nome: inimigo.nome,
                    tipo: 'inimigo',
                    selecionavel: true,
                    baseY: 0
                };

                this.scene.add(model);
                this.enemyMeshes.set(inimigo.instanceId, model);

                console.log('[ARSceneManager] Modelo GLB carregado:', inimigo.nome);
            } catch (error) {
                console.warn('[ARSceneManager] Fallback para placeholder:', inimigo.nome, error.message);

                // Fallback: usar placeholder colorido
                const placeholder = this.criarPlaceholderVisivel(inimigo, cor);
                this.scene.add(placeholder);
                this.enemyMeshes.set(inimigo.instanceId, placeholder);
            }
        }

        console.log('[ARSceneManager] Total inimigos:', this.enemyMeshes.size);
    }

    async loadModel(modelPath) {
        if (this.modelCache.has(modelPath)) {
            return this.modelCache.get(modelPath).clone();
        }

        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                modelPath,
                (gltf) => {
                    const model = gltf.scene;
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    this.modelCache.set(modelPath, model.clone());
                    resolve(model);
                },
                (progress) => {
                    // Progress callback
                },
                (error) => {
                    reject(error);
                }
            );
        });
    }

    criarPlaceholderVisivel(inimigo, cor) {
        const group = new THREE.Group();

        // Corpo
        const bodyGeometry = new THREE.CapsuleGeometry(0.08, 0.15, 4, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: cor,
            metalness: 0.2,
            roughness: 0.8
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.12;
        group.add(body);

        // Olhos
        const eyeGeometry = new THREE.SphereGeometry(0.02, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.03, 0.18, 0.06);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.03, 0.18, 0.06);
        group.add(rightEye);

        // Pupilas
        const pupilGeometry = new THREE.SphereGeometry(0.01, 8, 8);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-0.03, 0.18, 0.075);
        group.add(leftPupil);

        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.03, 0.18, 0.075);
        group.add(rightPupil);

        group.visible = false;
        group.userData = {
            instanceId: inimigo.instanceId,
            nome: inimigo.nome,
            tipo: 'inimigo',
            selecionavel: true,
            baseY: 0
        };

        return group;
    }

    destacarInimigo(instanceId, destacar = true) {
        const mesh = this.enemyMeshes.get(instanceId);
        if (!mesh) return;

        mesh.traverse((child) => {
            if (child.material && child.material.emissive) {
                if (destacar) {
                    child.material.emissive = new THREE.Color(0x00ff00);
                    child.material.emissiveIntensity = 0.5;
                } else {
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            }
        });
    }

    destacarAlvosInimigos(instanceIds) {
        this.enemyMeshes.forEach((mesh, id) => {
            this.destacarInimigo(id, instanceIds.includes(id));
        });
    }

    limparDestaques() {
        this.enemyMeshes.forEach((_, id) => {
            this.destacarInimigo(id, false);
        });
    }

    atualizarBarraVida(instanceId, pvPercent) {
        // Placeholder não tem barra de vida visual
    }

    mostrarDanoInimigo(instanceId, dano) {
        const mesh = this.enemyMeshes.get(instanceId);
        if (!mesh) return;

        // Flash vermelho
        mesh.traverse((child) => {
            if (child.material) {
                const original = child.material.color.clone();
                child.material.color.set(0xff0000);
                setTimeout(() => {
                    child.material.color.copy(original);
                }, 200);
            }
        });
    }

    removerInimigo(instanceId) {
        const mesh = this.enemyMeshes.get(instanceId);
        if (!mesh) return;

        this.scene.remove(mesh);
        this.enemyMeshes.delete(instanceId);
    }

    limparInimigos() {
        this.enemyMeshes.forEach((mesh) => {
            this.scene.remove(mesh);
        });
        this.enemyMeshes.clear();
        this.enemiesPlaced = false;
    }

    dispose() {
        this.stopAR();
        this.limparInimigos();
        this.modelCache.clear();

        if (this.renderer) {
            this.renderer.dispose();
            if (this.container.contains(this.renderer.domElement)) {
                this.container.removeChild(this.renderer.domElement);
            }
        }
    }
}
