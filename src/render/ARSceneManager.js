/**
 * AR Scene Manager
 * Gerencia a cena de Realidade Aumentada usando WebXR + Three.js
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { ParticleSystem } from './ParticleSystem.js';

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

        // Sistema de partículas
        this.particleSystem = null;

        // Visual Feedback
        this.selectionRing = null;
        this.shadowCatcher = null;

        // Performance Check
        this.lastFrameTime = 0;
        this.lowFpsFrames = 0;
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
            } catch (e) {
                this.isARSupported = false;
            }
        } else {
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
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.container.appendChild(this.renderer.domElement);

        this.setupLoaders();
        this.setupARLighting();
        this.createReticle();
        this.createSelectionRing();

        // Inicializar sistema de partículas
        this.particleSystem = new ParticleSystem(this.scene);

        return this.isARSupported;
    }

    setupLoaders() {
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }

    setupARLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Reduzido para dar destaque à luz direcional
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(2, 6, 2); // Leve angulação
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.bias = -0.0001;
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

    createSelectionRing() {
        const geometry = new THREE.RingGeometry(0.3, 0.35, 32).rotateX(-Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        this.selectionRing = new THREE.Mesh(geometry, material);
        this.selectionRing.visible = false;
        // Desenhar sempre por cima do chão para evitar z-fighting
        this.selectionRing.renderOrder = 1;
        this.scene.add(this.selectionRing);
    }

    createShadowCatcher() {
        // Plane que recebe sombras mas é transparente
        const geometry = new THREE.PlaneGeometry(10, 10);
        const material = new THREE.ShadowMaterial({
            opacity: 0.4
        });

        const catcher = new THREE.Mesh(geometry, material);
        catcher.rotation.x = -Math.PI / 2;
        catcher.receiveShadow = true;
        return catcher;
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
            return true;
        } catch (e) {
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
    }

    renderAR(time, frame) {
        if (!frame) return;

        // Monitoramento de FPS para Performance
        if (this.lastFrameTime > 0) {
            const delta = time - this.lastFrameTime;
            // < 30 FPS aprox (33ms)
            if (delta > 33) {
                this.lowFpsFrames++;

                // Se mantiver FPS baixo por ~2 segundos (60 frames ruins)
                if (this.lowFpsFrames > 60) {
                    // Verificar se já desativou para não floodar
                    if (this.particleSystem && this.particleSystem.enabled) {
                        console.warn('[AR] Performance baixa detectada. Desativando partículas.');
                        this.particleSystem.setEnabled(false);
                    }
                }
            } else {
                this.lowFpsFrames = Math.max(0, this.lowFpsFrames - 1);
            }
        }
        this.lastFrameTime = time;

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
                // Flutuação suave
                mesh.rotation.y = Math.sin(time * 0.001) * 0.2;
                mesh.position.y = mesh.userData.baseY + Math.sin(time * 0.003) * 0.05;

                // Fazer barra de vida olhar para a câmera
                if (mesh.userData.healthBar) {
                    mesh.userData.healthBar.lookAt(this.camera.position);
                }
            }
        });
    }

    onARSelect() {
        if (!this.isARActive) return;

        if (!this.enemiesPlaced && this.reticle.visible) {
            this.placeEnemiesAtReticle();
            return;
        }

        this.checkEnemySelectionAR();
    }

    placeEnemiesAtReticle() {
        if (this.enemyMeshes.size === 0) return;

        const position = new THREE.Vector3();
        position.setFromMatrixPosition(this.reticle.matrix);

        const meshesArray = Array.from(this.enemyMeshes.values());
        const spacing = 1.5; // Reduzido (User Request) para caber melhor em ambientes reais

        // Adicionar Shadow Catcher
        if (!this.shadowCatcher) {
            this.shadowCatcher = this.createShadowCatcher();
            this.scene.add(this.shadowCatcher);
        }
        this.shadowCatcher.position.set(position.x, position.y, position.z);
        this.shadowCatcher.visible = true;

        meshesArray.forEach((mesh, index) => {
            const offset = (index - (meshesArray.length - 1) / 2) * spacing;
            mesh.position.set(
                position.x + offset,
                position.y, // Removido +0.1 para ficar no chão e projetar sombra correta
                position.z
            );
            mesh.userData.baseY = position.y;
            mesh.visible = true;
        });

        this.reticle.visible = false;
        this.enemiesPlaced = true;

        this.emit('enemiesPlaced', { position });
    }

    checkEnemySelectionAR() {
        if (!this.controller) return;

        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(this.controller.matrixWorld);

        this.raycaster.ray.origin.setFromMatrixPosition(this.controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

        // Configurar câmera para raycasting de sprites
        this.raycaster.camera = this.camera;

        // Coletar apenas meshes selecionáveis (excluindo barras de vida)
        const selectableMeshes = [];
        this.enemyMeshes.forEach((mesh) => {
            if (mesh.visible && mesh.userData.selecionavel) {
                mesh.traverse((child) => {
                    if (child.isMesh && !child.parent?.name?.includes('healthBar') && child.parent?.name !== 'healthBar') {
                        selectableMeshes.push(child);
                    }
                });
            }
        });

        const intersects = this.raycaster.intersectObjects(selectableMeshes, false);

        if (intersects.length > 0) {
            let target = intersects[0].object;
            while (target && !target.userData.instanceId) {
                target = target.parent;
            }

            if (target && target.userData.instanceId) {
                // Feedback visual de seleção
                this.selectionRing.position.copy(target.position);
                this.selectionRing.position.y = target.userData.baseY + 0.02; // Levemente acima do chão
                this.selectionRing.visible = true;

                this.emit('inimigoClicado', { instanceId: target.userData.instanceId });
            }
        }
    }

    async adicionarInimigos(inimigos) {
        const cores = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];

        for (let index = 0; index < inimigos.length; index++) {
            const inimigo = inimigos[index];
            const cor = cores[index % cores.length];

            try {
                const modelPath = `/assets/models/${inimigo.modelo}`;
                const model = await this.loadModel(modelPath);

                // Escala 3.0 para AR
                model.scale.setScalar((inimigo.escala || 1) * 3.0);
                model.visible = false;
                model.userData = {
                    instanceId: inimigo.instanceId,
                    nome: inimigo.nome,
                    tipo: 'inimigo',
                    selecionavel: true,
                    baseY: 0,
                    pvMax: inimigo.pvMax || 10,
                    pv: inimigo.pv || 10
                };

                // Criar barra de vida
                const healthBar = this.criarBarraVida(inimigo.nome, inimigo.pv, inimigo.pvMax);
                healthBar.position.y = 1.2; // Acima do modelo
                model.add(healthBar);
                model.userData.healthBar = healthBar;

                this.scene.add(model);
                this.enemyMeshes.set(inimigo.instanceId, model);
            } catch (error) {
                // Fallback: usar placeholder colorido
                const placeholder = this.criarPlaceholderVisivel(inimigo, cor);

                // Adicionar barra de vida ao placeholder também
                const healthBar = this.criarBarraVida(inimigo.nome, inimigo.pv || 10, inimigo.pvMax || 10);
                healthBar.position.y = 0.6; // Acima do placeholder
                placeholder.add(healthBar);
                placeholder.userData.healthBar = healthBar;
                placeholder.userData.pvMax = inimigo.pvMax || 10;
                placeholder.userData.pv = inimigo.pv || 10;

                this.scene.add(placeholder);
                this.enemyMeshes.set(inimigo.instanceId, placeholder);
            }
        }
    }

    /**
     * Cria barra de vida 3D
     */
    criarBarraVida(nome, pv, pvMax) {
        const group = new THREE.Group();
        group.name = 'healthBar';

        // Fundo da barra (preto/cinza)
        const bgGeometry = new THREE.PlaneGeometry(0.5, 0.08);
        const bgMaterial = new THREE.MeshBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const bgBar = new THREE.Mesh(bgGeometry, bgMaterial);
        bgBar.position.z = 0.001;
        group.add(bgBar);

        // Barra de HP (verde)
        const hpPercent = Math.max(0, Math.min(1, pv / pvMax));
        const hpGeometry = new THREE.PlaneGeometry(0.48 * hpPercent, 0.06);
        const hpMaterial = new THREE.MeshBasicMaterial({
            color: this.getHealthColor(hpPercent),
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const hpBar = new THREE.Mesh(hpGeometry, hpMaterial);
        hpBar.position.x = -0.24 * (1 - hpPercent); // Alinha à esquerda
        hpBar.position.z = 0.002;
        hpBar.name = 'hpFill';
        group.add(hpBar);

        // Borda da barra
        const borderGeometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.52, 0.1));
        const borderMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        const border = new THREE.LineSegments(borderGeometry, borderMaterial);
        group.add(border);

        // Nome do inimigo (usando sprite de texto) - Esquerda
        const nameSprite = this.criarTextoSprite(nome, 'left');
        nameSprite.position.y = 0.12;
        nameSprite.position.x = -0.15; // Deslocar para esquerda
        nameSprite.scale.set(0.3, 0.1, 1);
        group.add(nameSprite);

        // HP Numérico - Direita
        const hpText = `${pv}/${pvMax}`;
        const hpSprite = this.criarTextoSprite(hpText, 'right');
        hpSprite.position.y = 0.12;
        hpSprite.position.x = 0.15; // Deslocar para direita
        hpSprite.scale.set(0.2, 0.1, 1);
        hpSprite.name = 'hpText';
        group.add(hpSprite);

        // Guardar max PV para updates
        group.userData.pvMax = pvMax;

        // A barra deve sempre olhar para a câmera
        group.userData.lookAtCamera = true;

        return group;
    }

    /**
     * Cria sprite de texto
     */
    criarTextoSprite(texto, align = 'center') {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        // Fundo semi-transparente
        context.fillStyle = 'rgba(0, 0, 0, 0.6)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Texto
        context.font = 'bold 36px Inter, Arial, sans-serif';
        context.fillStyle = '#ffffff';
        context.textBaseline = 'middle';

        if (align === 'left') {
            context.textAlign = 'left';
            context.fillText(texto, 10, canvas.height / 2);
        } else if (align === 'right') {
            context.textAlign = 'right';
            context.fillText(texto, canvas.width - 10, canvas.height / 2);
        } else {
            context.textAlign = 'center';
            context.fillText(texto, canvas.width / 2, canvas.height / 2);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });

        return new THREE.Sprite(spriteMaterial);
    }

    /**
     * Retorna cor baseada no HP
     */
    getHealthColor(percent) {
        if (percent > 0.6) return 0x44ff44; // Verde
        if (percent > 0.3) return 0xffaa00; // Laranja
        return 0xff4444; // Vermelho
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
                (error) => reject(error)
            );
        });
    }

    criarPlaceholderVisivel(inimigo, cor) {
        const group = new THREE.Group();

        const bodyGeometry = new THREE.CapsuleGeometry(0.15, 0.3, 4, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: cor,
            metalness: 0.2,
            roughness: 0.8
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.25;
        group.add(body);

        // Olhos
        const eyeGeometry = new THREE.SphereGeometry(0.04, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.05, 0.35, 0.12);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.05, 0.35, 0.12);
        group.add(rightEye);

        // Pupilas
        const pupilGeometry = new THREE.SphereGeometry(0.02, 8, 8);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-0.05, 0.35, 0.15);
        group.add(leftPupil);

        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.05, 0.35, 0.15);
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
        const mesh = this.enemyMeshes.get(instanceId);
        if (!mesh || !mesh.userData.healthBar) return;

        const healthBar = mesh.userData.healthBar;
        const hpPercent = Math.max(0, Math.min(1, pvPercent / 100));

        // Encontrar a barra de HP
        const hpFill = healthBar.children.find(c => c.name === 'hpFill');
        if (hpFill) {
            // Atualizar geometria
            hpFill.geometry.dispose();
            hpFill.geometry = new THREE.PlaneGeometry(0.48 * hpPercent, 0.06);
            hpFill.position.x = -0.24 * (1 - hpPercent);

            // Atualizar cor
            hpFill.material.color.setHex(this.getHealthColor(hpPercent));
        }

        // Atualizar texto de HP
        const hpSprite = healthBar.children.find(c => c.name === 'hpText');
        if (hpSprite) {
            const pvMax = healthBar.userData.pvMax || 10;
            const pvAtual = Math.ceil((pvPercent / 100) * pvMax);
            const novoTexto = `${pvAtual}/${pvMax}`;

            // Recriar sprite (limitação do three.js sprite simples)
            // Primeiro remover antigo
            healthBar.remove(hpSprite);
            // Limpar material antigo
            if (hpSprite.material.map) hpSprite.material.map.dispose();
            hpSprite.material.dispose();

            // Criar novo
            const novoHpSprite = this.criarTextoSprite(novoTexto, 'right');
            novoHpSprite.position.y = 0.12;
            novoHpSprite.position.x = 0.15;
            novoHpSprite.scale.set(0.2, 0.1, 1);
            novoHpSprite.name = 'hpText';
            healthBar.add(novoHpSprite);
        }
    }

    mostrarDanoInimigo(instanceId, dano, tipoEfeito = 'dano') {
        const mesh = this.enemyMeshes.get(instanceId);
        if (!mesh) return;

        // Efeito de partículas
        if (this.particleSystem) {
            this.particleSystem.dispararEfeito(tipoEfeito, mesh.position);
        }

        // Flash vermelho
        mesh.traverse((child) => {
            if (child.material) {
                const original = child.material.color?.clone();
                if (original) {
                    child.material.color.set(0xff0000);
                    setTimeout(() => {
                        child.material.color.copy(original);
                    }, 200);
                }
            }
        });
    }

    /**
     * Mostra efeito de cura em um herói (para uso futuro)
     */
    mostrarCura(position) {
        if (this.particleSystem) {
            this.particleSystem.efeitoCura(position);
        }
    }

    /**
     * Mostra efeito de buff
     */
    mostrarBuff(position) {
        if (this.particleSystem) {
            this.particleSystem.efeitoBuff(position);
        }
    }

    /**
     * Mostra efeito de debuff em um inimigo
     */
    mostrarDebuff(instanceId) {
        const mesh = this.enemyMeshes.get(instanceId);
        if (!mesh || !this.particleSystem) return;

        this.particleSystem.efeitoDebuff(mesh.position);
    }

    /**
     * Mostra efeito de fogo
     */
    mostrarFogo(instanceId) {
        const mesh = this.enemyMeshes.get(instanceId);
        if (!mesh || !this.particleSystem) return;

        this.particleSystem.efeitoFogo(mesh.position);
    }

    /**
     * Mostra efeito de gelo
     */
    mostrarGelo(instanceId) {
        const mesh = this.enemyMeshes.get(instanceId);
        if (!mesh || !this.particleSystem) return;

        this.particleSystem.efeitoGelo(mesh.position);
    }

    /**
     * Remove inimigo com animação de morte
     */
    removerInimigo(instanceId) {
        const mesh = this.enemyMeshes.get(instanceId);
        if (!mesh) return;

        // Desabilitar interações imediatamente
        mesh.userData.selecionavel = false;

        // Esconder barra de vida imediatamente para evitar persistência visual
        if (mesh.userData.healthBar) {
            mesh.userData.healthBar.visible = false;
        }

        // Remover da lista de meshes ativos para evitar click
        this.enemyMeshes.delete(instanceId);

        // Efeito de partículas de morte
        if (this.particleSystem) {
            this.particleSystem.efeitoMorte(mesh.position);
        }

        // Animação de morte: shrink + fade
        const duration = 500;
        const startTime = performance.now();
        const originalScale = mesh.scale.clone();

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Shrink (Encolher até sumir)
            // Usamos apenas scale para evitar problemas com materiais compartilhados entre clones
            const scale = 1 - progress;
            mesh.scale.copy(originalScale).multiplyScalar(scale);

            // Subir levemente
            mesh.position.y += 0.002;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remover após animação
                this.scene.remove(mesh);
                // Garantir limpeza total (embora já tenhamos removido do map antes)
                if (mesh.userData.healthBar) {
                    mesh.userData.healthBar.visible = false;
                }
            }
        };

        animate();
    }

    limparInimigos() {
        // Disparar efeitos de morte para todos os inimigos restantes
        this.enemyMeshes.forEach((mesh) => {
            if (this.particleSystem && mesh.visible) {
                this.particleSystem.efeitoMorte(mesh.position);
            }
            this.scene.remove(mesh);
        });
        this.enemyMeshes.clear();
        this.enemiesPlaced = false;
    }

    dispose() {
        this.stopAR();
        this.limparInimigos();
        this.modelCache.clear();

        // Limpar callbacks
        this.callbacks = {};

        // Limpar scene
        if (this.scene) {
            this.scene.traverse((object) => {
                this.disposeObject(object);
            });
            this.scene.clear();
        }

        // Limpar renderer e remover canvas
        if (this.renderer) {
            this.renderer.setAnimationLoop(null);
            this.renderer.dispose();
            this.renderer.forceContextLoss(); // Forçar perda de contexto
            if (this.container && this.renderer.domElement && this.container.contains(this.renderer.domElement)) {
                this.container.removeChild(this.renderer.domElement);
            }
            this.renderer = null;
        }

        // Resetar flags
        this.isARActive = false;
        this.isARSupported = false;
        console.log('[AR] Recursos liberados e memória limpa');
    }

    disposeObject(object) {
        if (!object) return;

        if (object.geometry) {
            object.geometry.dispose();
        }

        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(material => this.disposeMaterial(material));
            } else {
                this.disposeMaterial(object.material);
            }
        }
    }

    disposeMaterial(material) {
        if (!material) return;

        // Dispor texturas
        for (const key of Object.keys(material)) {
            const value = material[key];
            if (value && typeof value === 'object' && 'minFilter' in value) {
                value.dispose();
            }
        }

        material.dispose();
    }
}
