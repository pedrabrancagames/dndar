/**
 * Particle System
 * Sistema de partículas para efeitos visuais em AR/3D
 */
import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.activeEffects = [];
    }

    /**
     * Efeito de impacto de ataque (faíscas)
     */
    impactoAtaque(position, cor = 0xffaa00) {
        const particles = this.criarParticulasExplosao(position, {
            count: 20,
            color: cor,
            size: 0.08,
            speed: 2,
            duration: 600,
            gravity: -0.5
        });

        this.animarParticulas(particles);
    }

    /**
     * Efeito de cura (brilhos verdes subindo)
     */
    efeitoCura(position) {
        const particles = this.criarParticulasSubindo(position, {
            count: 15,
            color: 0x00ff88,
            size: 0.06,
            speed: 1.5,
            duration: 1000
        });

        this.animarParticulas(particles);
    }

    /**
     * Efeito de fogo (chamas)
     */
    efeitoFogo(position) {
        const cores = [0xff4400, 0xff6600, 0xffaa00, 0xff0000];

        const particles = this.criarParticulasSubindo(position, {
            count: 25,
            colors: cores,
            size: 0.1,
            speed: 2,
            duration: 800,
            spread: 0.3
        });

        this.animarParticulas(particles);
    }

    /**
     * Efeito de gelo (cristais)
     */
    efeitoGelo(position) {
        const particles = this.criarParticulasExplosao(position, {
            count: 15,
            color: 0x88ccff,
            size: 0.07,
            speed: 1,
            duration: 1000,
            gravity: 0.2
        });

        this.animarParticulas(particles);
    }

    /**
     * Efeito de raio/eletricidade
     */
    efeitoRaio(position) {
        const particles = this.criarParticulasExplosao(position, {
            count: 30,
            color: 0xffff00,
            size: 0.05,
            speed: 4,
            duration: 400,
            gravity: 0
        });

        this.animarParticulas(particles);
    }

    /**
     * Efeito de buff (aura)
     */
    efeitoBuff(position) {
        const particles = this.criarParticulasOrbitando(position, {
            count: 12,
            color: 0x00ffff,
            size: 0.05,
            duration: 1500,
            radius: 0.3
        });

        this.animarParticulas(particles);
    }

    /**
     * Efeito de debuff (aura negativa)
     */
    efeitoDebuff(position) {
        const particles = this.criarParticulasDescendo(position, {
            count: 10,
            color: 0x8800ff,
            size: 0.06,
            duration: 1200
        });

        this.animarParticulas(particles);
    }

    /**
     * Efeito de morte/dissolução
     */
    efeitoMorte(position) {
        const particles = this.criarParticulasExplosao(position, {
            count: 40,
            color: 0x333333,
            size: 0.1,
            speed: 1.5,
            duration: 1500,
            gravity: 0.3
        });

        this.animarParticulas(particles);
    }

    /**
     * Cria partículas que explodem em todas as direções
     */
    criarParticulasExplosao(position, options) {
        const { count, color, colors, size, speed, duration, gravity = 0 } = options;
        const group = new THREE.Group();
        group.position.copy(position);

        const particles = [];

        for (let i = 0; i < count; i++) {
            const particleColor = colors ? colors[Math.floor(Math.random() * colors.length)] : color;

            const geometry = new THREE.SphereGeometry(size * (0.5 + Math.random() * 0.5), 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: particleColor,
                transparent: true,
                opacity: 1
            });

            const particle = new THREE.Mesh(geometry, material);

            // Direção aleatória
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;

            particle.userData = {
                velocity: new THREE.Vector3(
                    Math.sin(phi) * Math.cos(theta) * speed * (0.5 + Math.random() * 0.5),
                    Math.cos(phi) * speed * (0.5 + Math.random() * 0.5),
                    Math.sin(phi) * Math.sin(theta) * speed * (0.5 + Math.random() * 0.5)
                ),
                gravity,
                startTime: performance.now(),
                duration
            };

            group.add(particle);
            particles.push(particle);
        }

        this.scene.add(group);

        return { group, particles, duration };
    }

    /**
     * Cria partículas que sobem
     */
    criarParticulasSubindo(position, options) {
        const { count, color, colors, size, speed, duration, spread = 0.2 } = options;
        const group = new THREE.Group();
        group.position.copy(position);

        const particles = [];

        for (let i = 0; i < count; i++) {
            const particleColor = colors ? colors[Math.floor(Math.random() * colors.length)] : color;

            const geometry = new THREE.SphereGeometry(size * (0.5 + Math.random() * 0.5), 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: particleColor,
                transparent: true,
                opacity: 1
            });

            const particle = new THREE.Mesh(geometry, material);

            // Posição inicial espalhada
            particle.position.set(
                (Math.random() - 0.5) * spread,
                0,
                (Math.random() - 0.5) * spread
            );

            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    speed * (0.8 + Math.random() * 0.4),
                    (Math.random() - 0.5) * 0.5
                ),
                gravity: 0,
                startTime: performance.now(),
                duration: duration * (0.5 + Math.random() * 0.5)
            };

            group.add(particle);
            particles.push(particle);
        }

        this.scene.add(group);

        return { group, particles, duration };
    }

    /**
     * Cria partículas que descem
     */
    criarParticulasDescendo(position, options) {
        const { count, color, size, duration } = options;
        const group = new THREE.Group();
        group.position.copy(position);
        group.position.y += 0.5;

        const particles = [];

        for (let i = 0; i < count; i++) {
            const geometry = new THREE.SphereGeometry(size, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 1
            });

            const particle = new THREE.Mesh(geometry, material);

            particle.position.set(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.3
            );

            particle.userData = {
                velocity: new THREE.Vector3(0, -0.5, 0),
                gravity: 0.3,
                startTime: performance.now(),
                duration
            };

            group.add(particle);
            particles.push(particle);
        }

        this.scene.add(group);

        return { group, particles, duration };
    }

    /**
     * Cria partículas orbitando
     */
    criarParticulasOrbitando(position, options) {
        const { count, color, size, duration, radius } = options;
        const group = new THREE.Group();
        group.position.copy(position);

        const particles = [];

        for (let i = 0; i < count; i++) {
            const geometry = new THREE.SphereGeometry(size, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 1
            });

            const particle = new THREE.Mesh(geometry, material);

            const angle = (i / count) * Math.PI * 2;
            particle.position.set(
                Math.cos(angle) * radius,
                Math.random() * 0.3,
                Math.sin(angle) * radius
            );

            particle.userData = {
                angle,
                radius,
                angularSpeed: 3 + Math.random() * 2,
                verticalSpeed: 0.5 + Math.random() * 0.5,
                startTime: performance.now(),
                duration
            };

            group.add(particle);
            particles.push(particle);
        }

        this.scene.add(group);

        return { group, particles, duration, isOrbiting: true };
    }

    /**
     * Anima as partículas
     */
    animarParticulas(effect) {
        const { group, particles, duration, isOrbiting } = effect;
        const startTime = performance.now();

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            particles.forEach(particle => {
                const pData = particle.userData;
                const pElapsed = performance.now() - pData.startTime;
                const pProgress = Math.min(pElapsed / pData.duration, 1);

                if (isOrbiting) {
                    // Movimento orbital
                    pData.angle += pData.angularSpeed * 0.016;
                    particle.position.x = Math.cos(pData.angle) * pData.radius;
                    particle.position.z = Math.sin(pData.angle) * pData.radius;
                    particle.position.y += pData.verticalSpeed * 0.016;
                } else {
                    // Movimento linear com gravidade
                    particle.position.add(pData.velocity.clone().multiplyScalar(0.016));
                    pData.velocity.y -= pData.gravity * 0.016;
                }

                // Fade out
                if (particle.material) {
                    particle.material.opacity = 1 - pProgress;
                }

                // Escala diminui
                const scale = 1 - pProgress * 0.5;
                particle.scale.setScalar(scale);
            });

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Limpar
                this.scene.remove(group);
                particles.forEach(p => {
                    p.geometry.dispose();
                    p.material.dispose();
                });
            }
        };

        animate();
    }

    /**
     * Dispara efeito baseado no tipo de ação
     */
    dispararEfeito(tipo, position) {
        switch (tipo) {
            case 'dano':
            case 'ataque':
                this.impactoAtaque(position, 0xffaa00);
                break;
            case 'cura':
            case 'heal':
                this.efeitoCura(position);
                break;
            case 'fogo':
            case 'fire':
            case 'queimando':
                this.efeitoFogo(position);
                break;
            case 'gelo':
            case 'ice':
            case 'congelado':
                this.efeitoGelo(position);
                break;
            case 'raio':
            case 'lightning':
            case 'eletricidade':
                this.efeitoRaio(position);
                break;
            case 'buff':
            case 'escudo':
                this.efeitoBuff(position);
                break;
            case 'debuff':
            case 'envenenado':
            case 'marcado':
                this.efeitoDebuff(position);
                break;
            case 'morte':
            case 'death':
                this.efeitoMorte(position);
                break;
            default:
                this.impactoAtaque(position);
        }
    }
}
