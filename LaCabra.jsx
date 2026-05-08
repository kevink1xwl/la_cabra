import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { GoatController, GOAT_STATES } from './GoatController';
import './LaCabra.css';

// ── Particle ─────────────────────────────────────────────────────────────────
class Particle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 1) * 10;
        this.life = 1;
        this.color = Math.random() > 0.5 ? '#48BB78' : '#38A169';
        this.size = 5 + Math.random() * 5;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotV = (Math.random() - 0.5) * 0.2;
    }
    update() {
        this.x += this.vx; this.y += this.vy; this.vy += 0.2;
        this.life -= 0.02; this.rotation += this.rotV;
    }
}

// ── Pivot offsets for lying/jumping poses ────────────────────────────────────
const PIVOTS = {
    relax: 55, calm: 45, sleep1: 60, sleep2: 60, sleeping: 60,
    'eat grass': 15, 'eat grass 2': 15, 'eat grass3': 15,
    atack1: 15, atack2: 15, walk_3: 15,
    jump1: -40, jump2: -90, jump3: -90, jump4: -40,
    'high jump': -110, 'high jump2': -80
};

const GOAT_SIZE = 300; // canvas display size in px

// ── Component ─────────────────────────────────────────────────────────────────
const LaCabra = ({
    phrases = null,
    goatSize = 300,
    assetsPath = '/cabra/',
    initialPosition = { bottom: '20px', right: '20px' }
}) => {
    const canvasRef      = useRef(null);
    const containerRef   = useRef(null);
    const controllerRef  = useRef(null);
    const lastTimeRef    = useRef(0);
    const timeRef        = useRef(0);
    const particlesRef   = useRef([]);
    const goatFramesRef  = useRef({});
    const envAssetsRef   = useRef({});
    const environmentRef = useRef([]);
    const animIdRef      = useRef(null);

    const GOAT_DISPLAY_SIZE = goatSize;

    // Physics state
    const posRef         = useRef({ x: 0, y: 0 });
    const velRef         = useRef({ x: -12, y: -12 });
    const rotRef         = useRef(0);
    const isAbsoluteRef  = useRef(false); // whether container is in absolute mode

    // Drag state
    const isDraggingRef  = useRef(false);
    const dragOffsetRef  = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
    const hasMovedRef    = useRef(false);

    // UI state
    const [message, setMessage]   = useState('');
    const [isChaos, setIsChaos]   = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // ── Asset loading ─────────────────────────────────────────────────────────
    useEffect(() => {
        const removeWhiteBg = (img) => {
            const c = document.createElement('canvas');
            c.width = img.width; c.height = img.height;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const d = ctx.getImageData(0, 0, c.width, c.height);
            for (let i = 0; i < d.data.length; i += 4) {
                if (d.data[i] > 230 && d.data[i+1] > 230 && d.data[i+2] > 230) d.data[i+3] = 0;
            }
            ctx.putImageData(d, 0, 0);
            return c;
        };

        const load = (src) => new Promise(resolve => {
            const img = new Image();
            img.src = src;
            img.onload  = () => resolve(removeWhiteBg(img));
            img.onerror = () => resolve(null);
        });

        const goatKeys = [
            'idle_1','idle_2','idle_3','idle_4','idle_5','idle_6','relax','calm',
            'alerrt0','alert_1','confuse',
            'walk_2','walk_3','walk_4',
            'eat grass','eat grass 2','eat grass3',
            'surprised_1','surprised_2','surprised_4','surprised_5','atack1','atack2',
            'run1','run2','run3','jump1','jump2','jump3','jump4','high jump','high jump2',
            'sleep1','sleep2','sleeping'
        ];

        const envKeys = [
            { id:'baaa',         src:'/cabra/ui_baaa.png' },
            { id:'grass_small',  src:'/cabra/grass small.png' },
            { id:'grass_mediun', src:'/cabra/grass mediun.png' },
            { id:'grasll_tall',  src:'/cabra/grasll tall.png' },
            { id:'flower_blue',  src:'/cabra/flower blue.png' },
            { id:'flower_pink',  src:'/cabra/flower pink.png' },
            { id:'fruit',        src:'/cabra/fruit.png' },
            { id:'roca_large',   src:'/cabra/roca large.png' },
            { id:'roca_small',   src:'/cabra/roca small.png' },
        ];

        Promise.all([
            ...goatKeys.map(k => load(`${assetsPath}${k}.png`).then(c => { if (c) goatFramesRef.current[k] = c; })),
            ...envKeys .map(({ id, src }) => load(src.replace('/cabra/', assetsPath)).then(c => { if (c) envAssetsRef.current[id] = c; }))
        ]).then(() => {
            // Build environment once
            const items = [];
            items.push({ type:'roca_large', x:140, y:352, w:120, h:88, layer:'back' });
            items.push({ type:'roca_small', x:295, y:378, w:64,  h:48, layer:'front' });
            const envTypes = ['flower_blue','flower_pink','fruit','grass_small','grass_mediun','grasll_tall'];
            for (let i = 0; i < 22; i++) {
                items.push({
                    type: envTypes[Math.floor(Math.random() * envTypes.length)],
                    x: Math.random() * 455, y: 378 + Math.random() * 62,
                    w: 58 + Math.random() * 62, h: 55 + Math.random() * 60,
                    layer: Math.random() > 0.4 ? 'front' : 'back'
                });
            }
            environmentRef.current = items;
            setIsLoaded(true);
        });
    }, []);

    // ── Helpers: switch container to absolute/fixed CSS mode ─────────────────
    const goAbsolute = useCallback(() => {
        if (isAbsoluteRef.current) return;
        isAbsoluteRef.current = true;
        const c = containerRef.current;
        if (!c) return;
        c.style.bottom = 'auto'; c.style.right = 'auto';
        c.style.top    = '0px';  c.style.left  = '0px';
    }, []);

    const goFixed = useCallback(() => {
        if (!isAbsoluteRef.current) return;
        isAbsoluteRef.current = false;
        const c = containerRef.current;
        if (!c) return;
        c.style.bottom = initialPosition.bottom || 'auto';
        c.style.right  = initialPosition.right || 'auto';
        c.style.top    = initialPosition.top || 'auto';
        c.style.left   = initialPosition.left || 'auto';
        c.style.transform = 'none';
        posRef.current = { x: 0, y: 0 };
        velRef.current = { x: -12, y: -12 };
    }, [initialPosition]);

    // ── Main animation loop ───────────────────────────────────────────────────
    useEffect(() => {
        if (!isLoaded) return;

        const ctrl = new GoatController({
            phrases: phrases,
            onMessageChange: (msg) => setMessage(msg),
            onSpeak: () => {
                for (let i = 0; i < 12; i++) particlesRef.current.push(new Particle(250, 260));
            }
        });
        controllerRef.current = ctrl;

        const animate = (time) => {
            if (lastTimeRef.current === 0) lastTimeRef.current = time;
            const dt = Math.min(time - lastTimeRef.current, 100); // cap at 100ms to avoid spiral
            lastTimeRef.current = time;
            timeRef.current += dt;

            ctrl.update(dt);
            setIsChaos(ctrl.isChaosMode); // sync chaos state for React render

            // Auto-mirror: if on left half of screen, face right (direction = -1 faces left in canvas)
            if (!isDraggingRef.current && ctrl.state !== GOAT_STATES.WALKING) {
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                    const centerX = rect.left + rect.width / 2;
                    ctrl.direction = centerX < window.innerWidth / 2 ? -1 : 1;
                }
            }

            updatePhysics(ctrl);
            updateParticles();
            renderScene(ctrl);

            animIdRef.current = requestAnimationFrame(animate);
        };

        animIdRef.current = requestAnimationFrame(animate);
        return () => { if (animIdRef.current) cancelAnimationFrame(animIdRef.current); };
    }, [isLoaded, goAbsolute, goFixed]); // eslint-disable-line

    // ── Physics update ────────────────────────────────────────────────────────
    const updatePhysics = (ctrl) => {
        const container = containerRef.current;
        if (!container || isDraggingRef.current) return;

        const { isBouncing, isChaosMode, isMovedManually } = ctrl;
        const isWalkingHome = ctrl.state === GOAT_STATES.WALKING && !isMovedManually;

        if (isBouncing) {
            if (!isAbsoluteRef.current) {
                const rect = container.getBoundingClientRect();
                posRef.current = { x: rect.left, y: rect.top };
                goAbsolute();
            }
            posRef.current.x += velRef.current.x;
            posRef.current.y += velRef.current.y;
            const maxX = window.innerWidth  - GOAT_DISPLAY_SIZE;
            const maxY = window.innerHeight - GOAT_DISPLAY_SIZE;
            if (posRef.current.x <= 0)    { posRef.current.x = 0;    velRef.current.x =  Math.abs(velRef.current.x); }
            if (posRef.current.x >= maxX)  { posRef.current.x = maxX; velRef.current.x = -Math.abs(velRef.current.x); }
            if (posRef.current.y <= 0)    { posRef.current.y = 0;    velRef.current.y =  Math.abs(velRef.current.y); }
            if (posRef.current.y >= maxY)  { posRef.current.y = maxY; velRef.current.y = -Math.abs(velRef.current.y); }
            container.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`;

        } else if (isWalkingHome && isAbsoluteRef.current) {
            const targetX = window.innerWidth  - GOAT_DISPLAY_SIZE - (parseInt(initialPosition.right) || 20);
            const targetY = window.innerHeight - GOAT_DISPLAY_SIZE - (parseInt(initialPosition.bottom) || 20);
            const dx = targetX - posRef.current.x;
            const dy = targetY - posRef.current.y;
            ctrl.direction = dx > 0 ? 1 : -1;

            if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                posRef.current.x += dx * 0.06;
                posRef.current.y += dy * 0.06;
                container.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`;
            } else {
                ctrl.isMovedManually = false;
                ctrl.setState(GOAT_STATES.IDLE);
                goFixed();
            }

        } else if (isChaosMode && !isBouncing) {
            // Just spinning in place — keep absolute if already there
            if (isMovedManually) goAbsolute();
        }
    };

    // ── Particle update ───────────────────────────────────────────────────────
    const updateParticles = () => {
        particlesRef.current.forEach(p => p.update());
        particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const renderScene = (ctrl) => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const { state, direction, isChaosMode, isBouncing, isMovedManually } = ctrl;
        const frameKey = ctrl.getCurrentFrameNumber();
        const goatFrame = goatFramesRef.current[frameKey];
        const isAway = isMovedManually || isBouncing || isChaosMode; // env hides any time goat is not home
        const isDragging = state === GOAT_STATES.DRAGGING;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Environment — only at home
        if (!isAway && !isDragging) {
            // Particles
            particlesRef.current.forEach(p => {
                ctx.save(); ctx.globalAlpha = p.life;
                ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
                ctx.fillStyle = p.color; ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                ctx.restore();
            });
            // Back layer env
            environmentRef.current.filter(i => i.layer === 'back').forEach(item => {
                const a = envAssetsRef.current[item.type]; if (a) ctx.drawImage(a, item.x, item.y, item.w, item.h);
            });
        }

        // Goat
        if (goatFrame) {
            let scaleX = 1, scaleY = 1;
            if (state === GOAT_STATES.IDLE || state === GOAT_STATES.ALERT || state === GOAT_STATES.SLEEPING) {
                const b = 0.0008, a = 0.025;
                scaleY = 1 + Math.sin(timeRef.current * b) * a;
                scaleX = 1 - Math.sin(timeRef.current * b) * (a / 2);
            }

            ctx.save();
            const yOff = PIVOTS[frameKey] || 0;
            ctx.translate(250, 420 + yOff);

            if (isChaosMode || isBouncing) {
                rotRef.current += 0.22;
                ctx.rotate(rotRef.current);
            }

            ctx.scale(scaleX * direction, scaleY);
            ctx.drawImage(goatFrame, -180, -320, 360, 360);
            ctx.restore();
        }

        // Front layer env — only at home
        if (!isAway && !isDragging) {
            environmentRef.current.filter(i => i.layer === 'front').forEach(item => {
                const a = envAssetsRef.current[item.type]; if (a) ctx.drawImage(a, item.x, item.y, item.w, item.h);
            });
        }
    };

    // ── Drag handlers ─────────────────────────────────────────────────────────
    const handleMouseDown = useCallback((e) => {
        const ctrl = controllerRef.current;
        if (!ctrl || ctrl.isChaosMode) return; // Disable drag during chaos
        isDraggingRef.current = true;
        hasMovedRef.current = false;

        const rect = containerRef.current.getBoundingClientRect();
        dragOffsetRef.current = { 
            x: e.clientX - rect.left, 
            y: e.clientY - rect.top,
            startX: e.clientX,
            startY: e.clientY
        };
        
        if (!isAbsoluteRef.current) {
            posRef.current = { x: rect.left, y: rect.top };
            containerRef.current.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`;
            goAbsolute();
        }

        e.preventDefault();
    }, [goAbsolute]);

    useEffect(() => {
        const onMove = (e) => {
            if (!isDraggingRef.current || !containerRef.current) return;
            
            if (!hasMovedRef.current) {
                const dx = e.clientX - dragOffsetRef.current.startX;
                const dy = e.clientY - dragOffsetRef.current.startY;
                if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;

                hasMovedRef.current = true;
                containerRef.current.classList.add('is-dragging');
                if (controllerRef.current) {
                    controllerRef.current.setState(GOAT_STATES.DRAGGING);
                    controllerRef.current.isMovedManually = true;
                    controllerRef.current.idleReturnTimer = 0;
                }
            }

            posRef.current.x = e.clientX - dragOffsetRef.current.x;
            posRef.current.y = e.clientY - dragOffsetRef.current.y;
            containerRef.current.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`;
        };
        const onUp = () => {
            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;
            
            if (hasMovedRef.current) {
                containerRef.current?.classList.remove('is-dragging');
                if (controllerRef.current) controllerRef.current.setState(GOAT_STATES.IDLE);
            } else {
                if (controllerRef.current) controllerRef.current.registerClick();
            }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',   onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, []);



    // Hover-to-speak
    const handleMouseEnter = useCallback(() => {
        const ctrl = controllerRef.current;
        if (ctrl && !ctrl.currentMessage && !ctrl.isChaosMode) ctrl.speak();
    }, []);

    return (
        <>
            <div
                ref={containerRef}
                className={`la-cabra-container${isChaos ? ' is-chaos' : ''}`}
                style={!isAbsoluteRef.current ? initialPosition : {}}
                onMouseDown={handleMouseDown}
                onMouseEnter={handleMouseEnter}
            >
                {/* Normal bubble — child of container, positioned above goat */}
                {message && !isChaos && (
                    <div 
                        className="la-cabra-bubble"
                        style={{ bottom: `${GOAT_DISPLAY_SIZE - 10}px` }}
                    >
                        {message}
                        <div className="la-cabra-bubble-tail" />
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    width={500} height={500}
                    className="la-cabra-canvas"
                    style={{ width: `${GOAT_DISPLAY_SIZE}px`, height: `${GOAT_DISPLAY_SIZE}px` }}
                />
            </div>

            {/* Chaos bubble — Portal at body root so it's immune to container transforms */}
            {message && isChaos && ReactDOM.createPortal(
                <div className="la-cabra-bubble chaos">
                    {message}
                </div>,
                document.body
            )}
        </>
    );
};

export default LaCabra;
