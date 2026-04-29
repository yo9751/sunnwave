// ==========================================
// 1. Three.js Background Logic (Bright Cream Version)
// ==========================================
class TouchTexture {
    constructor() {
        this.size = 64;
        this.width = this.height = this.size;
        this.maxAge = 64;
        this.radius = 0.25 * this.size;
        this.speed = 1 / this.maxAge;
        this.trail = [];
        this.last = null;
        this.initTexture();
    }

    initTexture() {
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext("2d");
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.texture = new THREE.Texture(this.canvas);
    }

    update() {
        this.clear();
        let speed = this.speed;
        for (let i = this.trail.length - 1; i >= 0; i--) {
            const point = this.trail[i];
            let f = point.force * speed * (1 - point.age / this.maxAge);
            point.x += point.vx * f;
            point.y += point.vy * f;
            point.age++;
            if (point.age > this.maxAge) {
                this.trail.splice(i, 1);
            } else {
                this.drawPoint(point);
            }
        }
        this.texture.needsUpdate = true;
    }

    clear() {
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    addTouch(point) {
        let force = 0;
        let vx = 0;
        let vy = 0;
        const last = this.last;
        if (last) {
            const dx = point.x - last.x;
            const dy = point.y - last.y;
            if (dx === 0 && dy === 0) return;
            const dd = dx * dx + dy * dy;
            let d = Math.sqrt(dd);
            vx = dx / d;
            vy = dy / d;
            force = Math.min(dd * 20000, 2.0);
        }
        this.last = { x: point.x, y: point.y };
        this.trail.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
    }

    drawPoint(point) {
        const pos = {
            x: point.x * this.width,
            y: (1 - point.y) * this.height
        };

        let intensity = 1;
        if (point.age < this.maxAge * 0.3) {
            intensity = Math.sin((point.age / (this.maxAge * 0.3)) * (Math.PI / 2));
        } else {
            const t = 1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7);
            intensity = -t * (t - 2);
        }
        intensity *= point.force;

        const radius = this.radius;
        let color = `${((point.vx + 1) / 2) * 255}, ${((point.vy + 1) / 2) * 255}, ${intensity * 255}`;
        let offset = this.size * 5;
        this.ctx.shadowOffsetX = offset;
        this.ctx.shadowOffsetY = offset;
        this.ctx.shadowBlur = radius * 1;
        this.ctx.shadowColor = `rgba(${color},${0.2 * intensity})`;

        this.ctx.beginPath();
        this.ctx.fillStyle = "rgba(255,0,0,1)";
        this.ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }
}

class GradientBackground {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.mesh = null;
        this.uniforms = {
            uTime: { value: 0 },
            uResolution: {
                value: new THREE.Vector2(window.innerWidth, window.innerHeight)
            },
            uColor1: { value: new THREE.Vector3(0.88, 0.83, 0.76) }, // 은은한 샌드 베이지
            uColor2: { value: new THREE.Vector3(0.85, 0.82, 0.79) }, // 차분한 웜 그레이
            uColor3: { value: new THREE.Vector3(0.86, 0.81, 0.74) }, // 탁기를 더한 뮤트 골드
            uColor4: { value: new THREE.Vector3(0.85, 0.82, 0.79) }, 
            uColor5: { value: new THREE.Vector3(0.88, 0.83, 0.76) }, 
            uColor6: { value: new THREE.Vector3(0.89, 0.86, 0.83) }, // 부드러운 오트밀
            uSpeed: { value: 0.6 }, // 속도를 늦춰서 더 나른하고 우아하게
            uIntensity: { value: 1.0 }, // 색이 하얗게 날아가지 않도록 조정
            uTouchTexture: { value: null },
            uGrainIntensity: { value: 0.04 }, // 밝은 톤에 맞춰 노이즈를 살짝 걷어냄
            uZoom: { value: 1.0 },
            uDarkNavy: { value: new THREE.Vector3(0.92, 0.90, 0.85) }, // 밝은 웜그레이/베이지
            uGradientSize: { value: 0.6 },
            uGradientCount: { value: 12.0 },
            uColor1Weight: { value: 1.0 },
            uColor2Weight: { value: 1.0 }
        };
    }

    init() {
        const viewSize = this.sceneManager.getViewSize();
        const geometry = new THREE.PlaneGeometry(viewSize.width, viewSize.height, 1, 1);

        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: `
                varying vec2 vUv;
                void main() {
                  vec3 pos = position.xyz;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
                  vUv = uv;
                }
            `,
            // 밝은 배경을 위해 제어 로직을 완전히 뜯어고친 셰이더
            fragmentShader: `
                uniform float uTime;
                uniform vec2 uResolution;
                uniform vec3 uColor1;
                uniform vec3 uColor2;
                uniform vec3 uColor3;
                uniform vec3 uColor4;
                uniform vec3 uColor5;
                uniform vec3 uColor6;
                uniform float uSpeed;
                uniform float uIntensity;
                uniform sampler2D uTouchTexture;
                uniform float uGrainIntensity;
                uniform vec3 uDarkNavy; // (이제는 크림 베이스 컬러)
                uniform float uGradientSize;
                uniform float uColor1Weight;
                uniform float uColor2Weight;
                
                varying vec2 vUv;
                
                float grain(vec2 uv, float time) {
                  vec2 grainUv = uv * uResolution * 0.5;
                  float grainValue = fract(sin(dot(grainUv + time, vec2(12.9898, 78.233))) * 43758.5453);
                  return grainValue * 2.0 - 1.0;
                }
                
                vec3 getGradientColor(vec2 uv, float time) {
                  float gradientRadius = uGradientSize;
                  
                  vec2 center1 = vec2(0.5 + sin(time * uSpeed * 0.4) * 0.4, 0.5 + cos(time * uSpeed * 0.5) * 0.4);
                  vec2 center2 = vec2(0.5 + cos(time * uSpeed * 0.6) * 0.5, 0.5 + sin(time * uSpeed * 0.45) * 0.5);
                  vec2 center3 = vec2(0.5 + sin(time * uSpeed * 0.35) * 0.45, 0.5 + cos(time * uSpeed * 0.55) * 0.45);
                  vec2 center4 = vec2(0.5 + cos(time * uSpeed * 0.5) * 0.4, 0.5 + sin(time * uSpeed * 0.4) * 0.4);
                  vec2 center5 = vec2(0.5 + sin(time * uSpeed * 0.7) * 0.35, 0.5 + cos(time * uSpeed * 0.6) * 0.35);
                  vec2 center6 = vec2(0.5 + cos(time * uSpeed * 0.45) * 0.5, 0.5 + sin(time * uSpeed * 0.65) * 0.5);
                  
                  float dist1 = length(uv - center1); float dist2 = length(uv - center2);
                  float dist3 = length(uv - center3); float dist4 = length(uv - center4);
                  float dist5 = length(uv - center5); float dist6 = length(uv - center6);
                  
                  float influence1 = 1.0 - smoothstep(0.0, gradientRadius, dist1);
                  float influence2 = 1.0 - smoothstep(0.0, gradientRadius, dist2);
                  float influence3 = 1.0 - smoothstep(0.0, gradientRadius, dist3);
                  float influence4 = 1.0 - smoothstep(0.0, gradientRadius, dist4);
                  float influence5 = 1.0 - smoothstep(0.0, gradientRadius, dist5);
                  float influence6 = 1.0 - smoothstep(0.0, gradientRadius, dist6);
                  
                  vec3 color = vec3(0.0);
                  color += uColor1 * influence1 * (0.55 + 0.45 * sin(time * uSpeed)) * uColor1Weight;
                  color += uColor2 * influence2 * (0.55 + 0.45 * cos(time * uSpeed * 1.2)) * uColor2Weight;
                  color += uColor3 * influence3 * (0.55 + 0.45 * sin(time * uSpeed * 0.8)) * uColor1Weight;
                  color += uColor4 * influence4 * (0.55 + 0.45 * cos(time * uSpeed * 1.3)) * uColor2Weight;
                  color += uColor5 * influence5 * (0.55 + 0.45 * sin(time * uSpeed * 1.1)) * uColor1Weight;
                  color += uColor6 * influence6 * (0.55 + 0.45 * cos(time * uSpeed * 0.9)) * uColor2Weight;
                  
                  color = clamp(color, vec3(0.0), vec3(1.0)) * uIntensity;
                  
                  // 밝은 컬러가 돋보이도록 크림 베이스와 부드럽게 믹스
                  float mixFactor = clamp(length(color) * 0.7, 0.0, 1.0);
                  color = mix(uDarkNavy, color, mixFactor);
                  
                  return color;
                }
                
                void main() {
                  vec2 uv = vUv;
                  
                  vec4 touchTex = texture2D(uTouchTexture, uv);
                  float vx = -(touchTex.r * 2.0 - 1.0);
                  float vy = -(touchTex.g * 2.0 - 1.0);
                  float intensity = touchTex.b;
                  uv.x += vx * 0.8 * intensity;
                  uv.y += vy * 0.8 * intensity;
                  
                  vec2 center = vec2(0.5);
                  float dist = length(uv - center);
                  float ripple = sin(dist * 20.0 - uTime * 3.0) * 0.04 * intensity;
                  float wave = sin(dist * 15.0 - uTime * 2.0) * 0.03 * intensity;
                  uv += vec2(ripple + wave);
                  
                  vec3 color = getGradientColor(uv, uTime);
                  
                  // 필름 그레인 추가
                  float grainValue = grain(uv, uTime);
                  color += grainValue * uGrainIntensity;
                  
                  // 최종 컬러 출력 (어둡게 깎는 로직 삭제)
                  color = clamp(color, vec3(0.0), vec3(1.0));
                  gl_FragColor = vec4(color, 1.0);
                }
            `
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.z = 0;
        this.sceneManager.scene.add(this.mesh);
    }

    update(delta) {
        if (this.uniforms.uTime) {
            this.uniforms.uTime.value += delta;
        }
    }

    onResize(width, height) {
        const viewSize = this.sceneManager.getViewSize();
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.geometry = new THREE.PlaneGeometry(viewSize.width, viewSize.height, 1, 1);
        }
        if (this.uniforms.uResolution) {
            this.uniforms.uResolution.value.set(width, height);
        }
    }
}

class App {
    constructor() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance",
            alpha: true, 
            stencil: false,
            depth: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const container = document.getElementById("webGLApp");
        container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.camera.position.z = 50;
        
        this.scene = new THREE.Scene();
        // 씬 배경도 완전한 네이비가 아닌 크림 화이트로 변경!
        this.scene.background = new THREE.Color(0xfaf8f5); 
        this.clock = new THREE.Clock();

        this.touchTexture = new TouchTexture();
        this.gradientBackground = new GradientBackground(this);
        this.gradientBackground.uniforms.uTouchTexture.value = this.touchTexture.texture;

        this.init();
    }

    init() {
        this.gradientBackground.init();
        this.render();
        this.tick();

        window.addEventListener("resize", () => this.onResize());
        window.addEventListener("mousemove", (ev) => this.onMouseMove(ev));
        window.addEventListener("touchmove", (ev) => this.onTouchMove(ev));
    }

    onTouchMove(ev) {
        const touch = ev.touches[0];
        this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }

    onMouseMove(ev) {
        this.mouse = {
            x: ev.clientX / window.innerWidth,
            y: 1 - ev.clientY / window.innerHeight
        };
        this.touchTexture.addTouch(this.mouse);
    }

    getViewSize() {
        const fovInRadians = (this.camera.fov * Math.PI) / 180;
        const height = Math.abs(this.camera.position.z * Math.tan(fovInRadians / 2) * 2);
        return { width: height * this.camera.aspect, height };
    }

    update(delta) {
        this.touchTexture.update();
        this.gradientBackground.update(delta);
    }

    render() {
        const delta = this.clock.getDelta();
        const clampedDelta = Math.min(delta, 0.1);
        this.renderer.render(this.scene, this.camera);
        this.update(clampedDelta);
    }

    tick() {
        this.render();
        requestAnimationFrame(() => this.tick());
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.gradientBackground.onResize(window.innerWidth, window.innerHeight);
    }
}

// ==========================================
// 2. Drag & Drop Interaction Logic (MPA Routing)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();

    const screenA = document.getElementById('main_screen');
    const screenB = document.getElementById('second_screen');
    const cdPlayerDropZone = document.getElementById('cd-player-drop-zone');
    const cdDiscs = document.querySelectorAll('.cd-collection .cd-disc');

    let currentScreen = 'A';
    let isAnimating = false;
    let currentDraggedCD = null; 

    // 마우스 휠 이벤트 (메인 인트로 -> CD 플레이어 화면 전환)
    window.addEventListener('wheel', (e) => {
        if (isAnimating || currentScreen === 'CONTENT') return;

        if (currentScreen === 'A' && e.deltaY > 0) {
            isAnimating = true;
            screenA.classList.add('scale-down-hidden');
            screenB.classList.remove('hidden');
            currentScreen = 'B';
            setTimeout(() => isAnimating = false, 1200);
        } else if (currentScreen === 'B' && e.deltaY < 0) {
            isAnimating = true;
            screenB.classList.add('hidden');
            screenA.classList.remove('scale-down-hidden');
            currentScreen = 'A';
            setTimeout(() => isAnimating = false, 1200);
        }
    });

    // 터치 스와이프 이벤트 (모바일 대응)
    let touchStartY = 0;
    window.addEventListener('touchstart', e => touchStartY = e.touches[0].clientY);
    window.addEventListener('touchend', e => {
        if (isAnimating || currentScreen === 'CONTENT') return;
        const touchEndY = e.changedTouches[0].clientY;

        if (currentScreen === 'A' && touchStartY > touchEndY + 50) {
            isAnimating = true;
            screenA.classList.add('scale-down-hidden');
            screenB.classList.remove('hidden');
            currentScreen = 'B';
            setTimeout(() => isAnimating = false, 1200);
        } else if (currentScreen === 'B' && touchStartY < touchEndY - 50) {
            isAnimating = true;
            screenB.classList.add('hidden');
            screenA.classList.remove('scale-down-hidden');
            currentScreen = 'A';
            setTimeout(() => isAnimating = false, 1200);
        }
    });

    // CD 드래그 이벤트
    cdDiscs.forEach(cd => {
        cd.addEventListener('dragstart', (e) => {
            if (isAnimating) {
                e.preventDefault(); 
                return;
            }
            currentDraggedCD = cd;
            // HTML 마크업에 설정된 data-target(예: "about.html")을 데이터로 저장
            e.dataTransfer.setData('text/plain', cd.getAttribute('data-target'));
            setTimeout(() => cd.style.opacity = '0.5', 0);
        });

        cd.addEventListener('dragend', () => {
            cd.style.opacity = '1';
            currentDraggedCD = null;
        });
    });

    // 드롭 존 설정
    cdPlayerDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        cdPlayerDropZone.classList.add('drag-over');
    });

    cdPlayerDropZone.addEventListener('dragleave', () => {
        cdPlayerDropZone.classList.remove('drag-over');
    });

    // 드롭 시 애니메이션 실행 후 실제 페이지(HTML) 이동
    cdPlayerDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        cdPlayerDropZone.classList.remove('drag-over');

        if (currentDraggedCD && !isAnimating) {
            isAnimating = true; 
            const targetUrl = currentDraggedCD.getAttribute('data-target');

            const playingClone = currentDraggedCD.cloneNode(true);
            playingClone.classList.remove('cd-disc');
            playingClone.classList.add('playing-clone'); 
            playingClone.setAttribute('draggable', 'false'); 

            cdPlayerDropZone.appendChild(playingClone);

            // 3초간 재생 애니메이션 후 설정된 URL로 이동 (MPA 방식)
            setTimeout(() => {
                if(targetUrl) {
                    window.location.href = targetUrl;
                }
            }, 3000);
        }
    });
});