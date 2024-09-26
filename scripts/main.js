import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let xrSession = null;
let gl = null;
let xrRefSpace = null;
let track = null;
document.addEventListener('DOMContentLoaded',()=>{
    var xrButton = document.getElementById('xr-button');
    //xrButton.style.zIndex=10000;
    xrButton.addEventListener('click', onButtonClicked);
});
function onButtonClicked() {
    if (!xrSession) {
        // Check if WebXR is supported
        if (!navigator.xr) {
            console.log('WebXR not supported on this browser.');
            return;
        }
        navigator.xr.isSessionSupported('immersive-ar').then((supported)=>{
            if (supported){
                navigator.xr.requestSession("immersive-ar").then(async(session)=>{
                    xrSession=session;
                    const stream = await navigator.mediaDevices.getUserMedia({audio:false,video:true});
                    const videoTracks = stream.getVideoTracks();
                    track = videoTracks[0];
                    document.getElementById('viewer-camera').srcObject = stream ;
                    onSessionStarted(); 
                });
            }
        });
    } else { // activateButton est un Toggle Button
        xrSession.end().then(() =>{
            xrSession = null;
            document.getElementById('xr-button').innerText = "Enter XR";
        });
    }
}

async function onSessionStarted() {
    try {
        xrSession.addEventListener('end',onSessionEnded);
        // Initialize a WebGL context that is compatible with WebXR
        const canvas = document.createElement("canvas");
        document.body.appendChild(canvas);
        const gl = canvas.getContext("webgl2", { xrCompatible: true });
        
        if (!gl) {
            console.error("WebGL 2 is not supported. Please ensure your browser and device support it.");
            return;
        } else {
            console.log("WebGL 2 is supported")
        }
        
        // Set up Three.js scene
        const scene = new THREE.Scene();
        const materials = [
            new THREE.MeshBasicMaterial({ color: 0xff0000 }),
            new THREE.MeshBasicMaterial({ color: 0x0000ff }),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
            new THREE.MeshBasicMaterial({ color: 0xff00ff }),
            new THREE.MeshBasicMaterial({ color: 0x00ffff }),
            new THREE.MeshBasicMaterial({ color: 0xffff00 })
        ];
        const cube = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), materials);
        cube.position.set(0, 0, -1);
        scene.add(cube);
        const video=document.getElementById('viewer-camera');
        const background_texture = new THREE.VideoTexture(video);
        scene.background = background_texture;
        
        // Set up the WebGLRenderer, which handles rendering to the session's base layer
        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            preserveDrawingBuffer: true,
            canvas: canvas,
            context: gl
        });
        renderer.autoClear = false;
        
        // Create a Three.js perspective camera
        const camera = new THREE.PerspectiveCamera();
        camera.matrixAutoUpdate = false;
        
        // Request an AR session
        xrSession.updateRenderState({
            baseLayer: new XRWebGLLayer(xrSession, gl)
        });
        
        // Request a 'local' reference space for the session
        xrRefSpace = await xrSession.requestReferenceSpace('local');
        
        // Rendering loop for AR
        const onXRFrame = (time, frame) => {
            xrSession.requestAnimationFrame(onXRFrame);
            
            
            // Bind the graphics framebuffer to the baseLayer's framebuffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, xrSession.renderState.baseLayer.framebuffer);
            
            // Retrieve the pose of the device
            const pose = frame.getViewerPose(xrRefSpace);
            
            if (pose) {
                // Use the first view (the only view in AR)
                const view = pose.views[0];
                const viewport = xrSession.renderState.baseLayer.getViewport(view);
                renderer.setSize(viewport.width, viewport.height);
                
                // Update the camera matrices with the current view
                camera.matrix.fromArray(view.transform.matrix);
                camera.projectionMatrix.fromArray(view.projectionMatrix);
                camera.updateMatrixWorld(true);
                
                // Render the scene with Three.js
                renderer.render(scene, camera);
            }
        };
        
        // Start rendering loop
        xrSession.requestAnimationFrame(onXRFrame);
        
        // Update the UI to show that the session has started
        document.getElementById('xr-button').innerText = "Exit XR";

    } catch (err) {
        console.error('Error while trying to activate AR session:', err);
    }
}
async function onSessionEnded() {
    xrSession = null;
    document.getElementById('xr-button').innerText = "Start XR";
    track.stop();
}

