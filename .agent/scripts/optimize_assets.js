import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SOURCE_DIR = path.join(process.cwd(), 'public/assets/models');
const OUTPUT_DIR = path.join(process.cwd(), 'public/assets/models/optimized');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Get all GLB files
const files = fs.readdirSync(SOURCE_DIR).filter(file => file.endsWith('.glb'));

console.log(`[Optimizer] Encontrados ${files.length} modelos em ${SOURCE_DIR}`);
console.log(`[Optimizer] Saída: ${OUTPUT_DIR}`);

// Check if gltf-transform is available
try {
    execSync('npx @gltf-transform/cli --help', { stdio: 'ignore' });
} catch (e) {
    console.error('[Optimizer] Erro: @gltf-transform/cli não está instalado ou disponível.');
    console.error('Execute: npm install @gltf-transform/cli --save-dev');
    process.exit(1);
}

files.forEach((file, index) => {
    const inputPath = path.join(SOURCE_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);

    // Check if optimized file already exists
    if (fs.existsSync(outputPath)) {
        console.log(`[${index + 1}/${files.length}] Pulo: ${file} (já otimizado)`);
        return;
    }

    console.log(`[${index + 1}/${files.length}] Otimizando: ${file}...`);

    try {
        // Command explanation:
        // optimize: Runs standard optimization pipeline (dedup, prune, etc)
        // --compress draco: Applies Draco geometry compression
        // --texture-compress webp: Converts textures to WebP (optional, good for web)
        // --simplify: Simplify mesh (careful with this, maybe skip for now or use modest ratio)
        // We will start with safe defaults: dedup + draco

        const command = `npx @gltf-transform/cli optimize "${inputPath}" "${outputPath}" --compress draco --texture-compress webp`;

        execSync(command, { stdio: 'inherit' });

        // Compare sizes
        const originalSize = fs.statSync(inputPath).size / (1024 * 1024);
        const optimizedSize = fs.statSync(outputPath).size / (1024 * 1024);
        const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);

        console.log(`   ✅ Sucesso! ${originalSize.toFixed(2)}MB -> ${optimizedSize.toFixed(2)}MB (-${savings}%)`);

    } catch (error) {
        console.error(`   ❌ Falha ao otimizar ${file}:`, error.message);
    }
});

console.log('[Optimizer] Processo concluído!');
