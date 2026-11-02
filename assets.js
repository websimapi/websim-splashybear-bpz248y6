import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Voxel models exported from Blender by art/blender/build_assets.py.
const MODELS = [
    'bear_splashy', 'bear_grizzly', 'bear_polar', 'bear_panda',
    'fish_classic', 'fish_zak', 'fish_golden', 'fish_marly',
    'puffer', 'branch', 'log',
    'pine', 'pine_tall', 'round_tree', 'bush', 'rock_a', 'rock_b',
];

// One cheap material for everything: colour comes from the per-voxel vertex colours.
export const voxelMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

const cache = {};
const loading = {};
let loader = null;

function loadOne(name) {
    loader ||= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    return loading[name] ||= loader.loadAsync(`assets/models/${name}.glb`).then((gltf) => {
        gltf.scene.traverse((o) => {
            if (!o.isMesh) return;
            o.material = voxelMaterial;
            o.castShadow = true;
            o.receiveShadow = true;
        });
        cache[name] = gltf.scene;
        return gltf.scene;
    });
}

export async function loadAssets(onProgress) {
    let done = 0;
    await Promise.all(MODELS.map(async (name) => {
        await loadOne(name);
        onProgress?.(++done / MODELS.length);
    }));
}

/** Loads models that aren't needed at start (gear), once each. */
export function loadModels(names) {
    return Promise.all(names.map(loadOne));
}

export const hasModel = (name) => !!cache[name];

/** A fresh copy of a model (geometry is shared, so copies are cheap). */
export function getModel(name) {
    const src = cache[name];
    if (!src) throw new Error(`Model not loaded: ${name}`);
    return src.clone();
}

/** The single mesh geometry of a one-piece model, for InstancedMesh scattering. */
export function getGeometry(name) {
    let geo = null;
    cache[name]?.traverse((o) => { if (o.isMesh && !geo) geo = o.geometry; });
    return geo;
}
