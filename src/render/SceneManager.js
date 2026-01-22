/**
 * Scene Manager
 * Gerencia a cena 3D/AR usando Three.js
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export class SceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.modelCache = new Map();
        this.enemyMeshes = new Map(); // instanceId -> mesh

        this.gltfLoader = null;
        this.dracoLoader = null;

        this.callbacks = {};

        this.animationId = null;
    }

    /**
     * Registra callback
     */
    on(evento, callback) {
        this.callbacks[evento] = callback;
    }

    /**
     * Emite evento
     */
    emit(evento, data) {
        if (this.callbacks[evento]) {
            this.callbacks[evento](data);
        }
    }

    /**
     * Inicializa a cena 3D
     */
    async init() {
        // Criar cena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0f);

        // Obter dimensões do container (com fallback para evitar divisão por zero)
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;
        const aspect = width / height;

        // Criar câmera
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(0, 2, 4); // Posição elevada atrás
        this.camera.lookAt(0, 0.5, -3); // Olhar para os inimigos

        // Criar renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Configurar loaders
        this.setupLoaders();

        // Adicionar iluminação
        this.setupLighting();

        // Adicionar chão básico
        this.addGround();

        // Event listeners
        this.setupEventListeners();

        // Iniciar loop de animação
        this.animate();

        console.log('[SceneManager] Cena 3D inicializada');
    }

    /**
     * Configura os loaders de modelos
     */
    setupLoaders() {
        // DRACO Loader para modelos comprimidos
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('/public/assets/draco/');

        // GLTF Loader
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }

    /**
     * Configura iluminação da cena
     */
    setupLighting() {
        // Luz ambiente
        const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
        this.scene.add(ambientLight);

        // Luz direcional principal (simulando lua/luz ambiente)
        const directionalLight = new THREE.DirectionalLight(0x6c5ce7, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        this.scene.add(directionalLight);

        // Luz de preenchimento
        const fillLight = new THREE.DirectionalLight(0xa29bfe, 0.3);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);

        // Luz pontual para efeito atmosférico
        const pointLight = new THREE.PointLight(0xff6b35, 0.5, 10);
        pointLight.position.set(0, 2, -5);
        this.scene.add(pointLight);
    }

    /**
     * Adiciona chão à cena
     */
    addGround() {
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.8,
            metalness: 0.2
        });

        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grid para referência visual
        const gridHelper = new THREE.GridHelper(20, 20, 0x333355, 0x222244);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Resize
        window.addEventListener('resize', () => this.onResize());

        // Click/Touch para seleção
        this.renderer.domElement.addEventListener('click', (event) => this.onClick(event));
        this.renderer.domElement.addEventListener('touchend', (event) => this.onTouch(event));
    }

    /**
     * Handler de resize
     */
    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Handler de click para raycasting
     */
    onClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.checkIntersections();
    }

    /**
     * Handler de touch para raycasting
     */
    onTouch(event) {
        if (event.changedTouches.length === 0) return;

        const touch = event.changedTouches[0];
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

        this.checkIntersections();
    }

    /**
     * Verifica interseções com objetos clicáveis
     */
    checkIntersections() {
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const meshes = Array.from(this.enemyMeshes.values())
            .filter(m => m.visible && m.userData.selecionavel);

        const intersects = this.raycaster.intersectObjects(meshes, true);

        if (intersects.length > 0) {
            // Encontrar o mesh pai que tem o instanceId
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
     * Carrega um modelo 3D
     */
    async loadModel(modelPath) {
        // Verificar cache
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

                    // Cachear modelo original
                    this.modelCache.set(modelPath, model.clone());

                    resolve(model);
                },
                undefined,
                (error) => {
                    console.error(`[SceneManager] Erro ao carregar modelo ${modelPath}:`, error);
                    reject(error);
                }
            );
        });
    }

    /**
     * Adiciona inimigos à cena
     */
    async adicionarInimigos(inimigos) {
        for (const inimigo of inimigos) {
            try {
                const modelPath = `/public/assets/models/${inimigo.modelo}`;
                const model = await this.loadModel(modelPath);

                // Configurar modelo
                model.scale.setScalar(inimigo.escala || 1);
                model.position.set(
                    inimigo.posicao.x,
                    inimigo.posicao.y,
                    inimigo.posicao.z
                );

                // Rotacionar para olhar para a câmera
                model.lookAt(this.camera.position);

                // Metadata
                model.userData = {
                    instanceId: inimigo.instanceId,
                    tipo: 'inimigo',
                    selecionavel: true
                };

                // Adicionar barra de vida
                this.adicionarBarraVida(model, inimigo);

                this.scene.add(model);
                this.enemyMeshes.set(inimigo.instanceId, model);

                console.log(`[SceneManager] Inimigo adicionado: ${inimigo.nome}`);
            } catch (error) {
                console.error(`[SceneManager] Erro ao adicionar inimigo ${inimigo.nome}:`, error);

                // Fallback: criar cubo placeholder
                this.adicionarInimigoPlaceholder(inimigo);
            }
        }
    }

    /**
     * Cria um placeholder para inimigo que falhou ao carregar
     */
    adicionarInimigoPlaceholder(inimigo) {
        const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(
            inimigo.posicao.x,
            inimigo.posicao.y + 0.5,
            inimigo.posicao.z
        );

        mesh.userData = {
            instanceId: inimigo.instanceId,
            tipo: 'inimigo',
            selecionavel: true
        };

        this.adicionarBarraVida(mesh, inimigo);

        this.scene.add(mesh);
        this.enemyMeshes.set(inimigo.instanceId, mesh);
    }

    /**
     * Adiciona barra de vida acima do modelo
     */
    adicionarBarraVida(model, inimigo) {
        // Container da barra
        const barContainer = document.createElement('div');
        barContainer.className = 'enemy-health-bar';
        barContainer.innerHTML = `
      <div class="health-bar-bg">
        <div class="health-bar-fill" style="width: 100%"></div>
      </div>
      <span class="enemy-name">${inimigo.nome}</span>
    `;

        // Por enquanto, não usar CSS 3D labels
        // Implementação simplificada: usar Three.js Sprite

        // Criar sprite de nome
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, 256, 64);

        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(4, 40, 248, 16);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(inimigo.nome, 128, 28);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            depthTest: false
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(1.5, 0.4, 1);
        sprite.position.y = 1.5;
        sprite.userData.healthBar = true;

        model.add(sprite);
        model.userData.healthSprite = sprite;
    }

    /**
     * Atualiza a barra de vida de um inimigo
     */
    atualizarBarraVida(instanceId, pvPercent) {
        const mesh = this.enemyMeshes.get(instanceId);
        if (!mesh || !mesh.userData.healthSprite) return;

        // Recriar textura com nova porcentagem
        const sprite = mesh.userData.healthSprite;
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, 256, 64);

        // Background da barra
        ctx.fillStyle = '#333';
        ctx.fillRect(4, 40, 248, 16);

        // Preenchimento da barra
        const fillWidth = (248 * pvPercent) / 100;
        ctx.fillStyle = pvPercent > 50 ? '#27ae60' : pvPercent > 25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(4, 40, fillWidth, 16);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(mesh.userData.nome || 'Inimigo', 128, 28);

        sprite.material.map.dispose();
        sprite.material.map = new THREE.CanvasTexture(canvas);
        sprite.material.needsUpdate = true;
    }

    /**
     * Remove um inimigo da cena
     */
    removerInimigo(instanceId) {
        const mesh = this.enemyMeshes.get(instanceId);
        if (!mesh) return;

        // Animação de fade out
        const fadeOut = () => {
            mesh.traverse((child) => {
                if (child.material) {
                    child.material.transparent = true;
                    child.material.opacity -= 0.05;
                }
            });

            if (mesh.children[0]?.material?.opacity > 0) {
                requestAnimationFrame(fadeOut);
            } else {
                this.scene.remove(mesh);
                this.enemyMeshes.delete(instanceId);
            }
        };

        fadeOut();
    }

    /**
     * Destaca um inimigo como selecionável
     */
    destacarInimigo(instanceId, destacar = true) {
        const mesh = this.enemyMeshes.get(instanceId);
        if (!mesh) return;

        mesh.traverse((child) => {
            if (child.material) {
                if (destacar) {
                    child.material.emissive = new THREE.Color(0x6c5ce7);
                    child.material.emissiveIntensity = 0.3;
                } else {
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            }
        });
    }

    /**
     * Destaca inimigos como alvos válidos
     */
    destacarAlvosInimigos(instanceIds) {
        this.enemyMeshes.forEach((mesh, id) => {
            this.destacarInimigo(id, instanceIds.includes(id));
        });
    }

    /**
     * Limpa destaque de todos os inimigos
     */
    limparDestaques() {
        this.enemyMeshes.forEach((_, id) => {
            this.destacarInimigo(id, false);
        });
    }

    /**
     * Mostra efeito visual de dano em um inimigo
     */
    mostrarDanoInimigo(instanceId, dano) {
        const mesh = this.enemyMeshes.get(instanceId);
        if (!mesh) return;

        // Flash vermelho
        mesh.traverse((child) => {
            if (child.material) {
                const originalColor = child.material.color.clone();
                child.material.color.set(0xff0000);

                setTimeout(() => {
                    child.material.color.copy(originalColor);
                }, 200);
            }
        });

        // Shake
        const originalPos = mesh.position.clone();
        const shake = () => {
            mesh.position.x = originalPos.x + (Math.random() - 0.5) * 0.1;
            mesh.position.z = originalPos.z + (Math.random() - 0.5) * 0.1;
        };

        const shakeInterval = setInterval(shake, 50);
        setTimeout(() => {
            clearInterval(shakeInterval);
            mesh.position.copy(originalPos);
        }, 300);
    }

    /**
     * Limpa todos os inimigos da cena
     */
    limparInimigos() {
        this.enemyMeshes.forEach((mesh) => {
            this.scene.remove(mesh);
        });
        this.enemyMeshes.clear();
    }

    /**
     * Loop de animação
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        // Atualizações de animação podem ir aqui

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Para o loop de animação
     */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Limpa recursos
     */
    dispose() {
        this.stop();

        this.enemyMeshes.forEach((mesh) => {
            mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        });

        this.modelCache.clear();
        this.enemyMeshes.clear();

        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }

        console.log('[SceneManager] Recursos liberados');
    }
}
