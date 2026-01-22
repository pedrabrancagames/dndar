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

    /**
     * Verifica suporte a WebXR AR
     */
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

    /**
     * Inicializa a cena AR
     */
    async init() {
        // Verificar suporte
        await this.checkARSupport();

        // Criar cena
        this.scene = new THREE.Scene();

        // Criar câmera (será controlada pelo WebXR)
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

        // Criar renderer com WebXR
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;

        this.container.appendChild(this.renderer.domElement);

        // Configurar loaders
        this.setupLoaders();

        // Adicionar iluminação AR
        this.setupARLighting();

        // Criar reticle para placement
        this.createReticle();

        // Event listeners
        this.setupEventListeners();

        console.log('[ARSceneManager] Inicializado');

        return this.isARSupported;
    }

    setupLoaders() {
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('/public/assets/draco/');

        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }

    setupARLighting() {
        // Luz ambiente para AR
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        // Luz direcional
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
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

        // Seleção por toque em AR
        this.renderer.domElement.addEventListener('click', (e) => this.onSelect(e));
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Inicia sessão AR
     */
    async startAR() {
        if (!this.isARSupported) {
            this.emit('arError', { message: 'AR não suportado neste dispositivo' });
            return false;
        }

        try {
            const sessionInit = {
                requiredFeatures: ['hit-test'],
                optionalFeatures: ['dom-overlay', 'light-estimation'],
                domOverlay: { root: document.getElementById('combat-hud') }
            };

            this.xrSession = await navigator.xr.requestSession('immersive-ar', sessionInit);

            this.renderer.xr.setReferenceSpaceType('local');
            await this.renderer.xr.setSession(this.xrSession);

            this.xrSession.addEventListener('end', () => this.onSessionEnd());

            // Adicionar controller para seleção
            this.controller = this.renderer.xr.getController(0);
            this.controller.addEventListener('select', () => this.onARSelect());
            this.scene.add(this.controller);

            this.isARActive = true;
            this.enemiesPlaced = false;

            // Iniciar render loop XR
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

    /**
     * Encerra sessão AR
     */
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

    /**
     * Loop de renderização AR
     */
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

        // Atualizar animações dos modelos
        this.updateAnimations(time);

        this.renderer.render(this.scene, this.camera);
    }

    updateAnimations(time) {
        // Animação de flutuação dos inimigos
        this.enemyMeshes.forEach((mesh) => {
            if (mesh.visible) {
                mesh.rotation.y = Math.sin(time * 0.001) * 0.1;
                mesh.position.y = mesh.userData.baseY + Math.sin(time * 0.002) * 0.05;
            }
        });
    }

    /**
     * Handler de seleção AR (toque na tela)
     */
    onARSelect() {
        if (!this.isARActive) return;

        console.log('[ARSceneManager] Toque detectado em AR');

        // Se os inimigos ainda não foram posicionados, posiciona-os
        if (!this.enemiesPlaced && this.reticle.visible) {
            this.placeEnemiesAtReticle();
            return;
        }

        // Caso contrário, verifica seleção de inimigo
        this.checkEnemySelectionAR();
    }

    /**
     * Handler de seleção (toque/click) - fallback
     */
    onSelect(event) {
        if (!this.isARActive) return;

        // Se os inimigos ainda não foram posicionados, posiciona-os
        if (!this.enemiesPlaced && this.reticle.visible) {
            this.placeEnemiesAtReticle();
            return;
        }

        // Caso contrário, verifica seleção de inimigo
        this.checkEnemySelection(event);
    }

    /**
     * Posiciona inimigos no local do reticle
     */
    placeEnemiesAtReticle() {
        const position = new THREE.Vector3();
        position.setFromMatrixPosition(this.reticle.matrix);

        // Atualizar posição dos inimigos
        this.enemyMeshes.forEach((mesh, index) => {
            const offset = (index - (this.enemyMeshes.size - 1) / 2) * 0.5;
            mesh.position.set(
                position.x + offset,
                position.y,
                position.z
            );
            mesh.userData.baseY = position.y;
            mesh.visible = true;
        });

        this.reticle.visible = false;
        this.enemiesPlaced = true;

        this.emit('enemiesPlaced', { position });
        console.log('[ARSceneManager] Inimigos posicionados em AR');
    }

    /**
     * Verifica seleção de inimigo em AR (usando controller)
     */
    checkEnemySelectionAR() {
        if (!this.controller) return;

        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(this.controller.matrixWorld);

        this.raycaster.ray.origin.setFromMatrixPosition(this.controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

        const meshes = Array.from(this.enemyMeshes.values())
            .filter(m => m.visible && m.userData.selecionavel);

        const intersects = this.raycaster.intersectObjects(meshes, true);

        if (intersects.length > 0) {
            let target = intersects[0].object;
            while (target && !target.userData.instanceId) {
                target = target.parent;
            }

            if (target && target.userData.instanceId) {
                console.log('[ARSceneManager] Inimigo selecionado:', target.userData.instanceId);
                this.emit('inimigoClicado', { instanceId: target.userData.instanceId });
            }
        }
    }

    /**
     * Verifica se um inimigo foi selecionado (fallback)
     */
    checkEnemySelection(event) {
        // Fallback para click normal
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

        const meshes = Array.from(this.enemyMeshes.values())
            .filter(m => m.visible && m.userData.selecionavel);

        const intersects = this.raycaster.intersectObjects(meshes, true);

        if (intersects.length > 0) {
            let target = intersects[0].object;
            while (target && !target.userData.instanceId) {
                target = target.parent;
            }

            if (target && target.userData.instanceId) {
                this.emit('inimigoClicado', { instanceId: target.userData.instanceId });
            }
        }
    }

    /**
     * Adiciona inimigos à cena AR
     */
    async adicionarInimigos(inimigos) {
        let index = 0;
        for (const inimigo of inimigos) {
            try {
                const modelPath = `/public/assets/models/${inimigo.modelo}`;
                const model = await this.loadModel(modelPath);

                // Escala menor para AR (mundo real)
                model.scale.setScalar((inimigo.escala || 1) * 0.3);

                // Inicialmente invisível até ser posicionado
                model.visible = false;

                model.userData = {
                    instanceId: inimigo.instanceId,
                    tipo: 'inimigo',
                    selecionavel: true,
                    baseY: 0
                };

                this.scene.add(model);
                this.enemyMeshes.set(inimigo.instanceId, model);

                index++;
            } catch (error) {
                console.error(`[ARSceneManager] Erro ao carregar ${inimigo.nome}:`, error);
                this.adicionarInimigoPlaceholder(inimigo, index);
                index++;
            }
        }
    }

    adicionarInimigoPlaceholder(inimigo, index) {
        const geometry = new THREE.BoxGeometry(0.15, 0.3, 0.15);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);

        mesh.visible = false;
        mesh.userData = {
            instanceId: inimigo.instanceId,
            tipo: 'inimigo',
            selecionavel: true,
            baseY: 0
        };

        this.scene.add(mesh);
        this.enemyMeshes.set(inimigo.instanceId, mesh);
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
                undefined,
                reject
            );
        });
    }

    destacarInimigo(instanceId, destacar = true) {
        const mesh = this.enemyMeshes.get(instanceId);
        if (!mesh) return;

        mesh.traverse((child) => {
            if (child.material) {
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
            this.container.removeChild(this.renderer.domElement);
        }
    }
}
