document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------------
    // SUPABASE CONFIGURATION
    // --------------------------------------------------------
    // TODO: Enter your Supabase Project URL and Anon Key here
    const SUPABASE_URL = 'https://dmbmlhtatylfzochgopl.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtYm1saHRhdHlsZnpvY2hnb3BsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDA1MDEsImV4cCI6MjA4MzI3NjUwMX0.8CYeo7DAfaL21meh2SKQC9Gke2iTlcaMzNKl9Bco7ls';

    let supabaseClient = null;
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.warn('Supabase client library not found.');
    }

    let isDownloadUnlocked = false; // State for download lock

    // 1. Navigation & UI Setup
    const buyBtn = document.getElementById('buy-now-btn');
    if (buyBtn) {
        buyBtn.addEventListener('click', () => {
            const shopSection = document.getElementById('shop');
            if (shopSection) shopSection.scrollIntoView({ behavior: 'smooth' });
        });
    }

    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });

    const seqGenBtn = document.getElementById('sequence-generator-btn');
    if (seqGenBtn) {
        seqGenBtn.addEventListener('click', () => startTransition('generator'));
    }

    // 2. Canvas Setup
    const canvas = document.getElementById('thread-canvas');
    const ctx = canvas.getContext('2d');

    let width, height;

    // State Management
    let appState = 'hero'; // 'hero', 'transition', 'generator'
    let transitionStartTime = 0;
    const TRANSITION_DURATION = 2000;

    // --------------------------------------------------------
    // CLASSES
    // --------------------------------------------------------

    class IdleThread {
        constructor(width, height) {
            this.init(width, height);
            this.phase = Math.random() * Math.PI * 2;
            this.speed = 0.0005 + Math.random() * 0.001;
        }

        init(w, h) {
            const edge = Math.floor(Math.random() * 4);
            if (edge === 0) this.start = { x: Math.random() * w, y: 0 };
            else if (edge === 1) this.start = { x: w, y: Math.random() * h };
            else if (edge === 2) this.start = { x: Math.random() * w, y: h };
            else this.start = { x: 0, y: Math.random() * h };

            this.centerBase = {
                x: w * 0.5 + (Math.random() - 0.5) * w * 0.5,
                y: h * 0.5 + (Math.random() - 0.5) * h * 0.5
            };
        }

        update(time, w, h) {
            this.end = {
                x: this.centerBase.x + Math.sin(time * this.speed + this.phase) * (w * 0.1),
                y: this.centerBase.y + Math.cos(time * this.speed * 1.3 + this.phase) * (h * 0.1)
            };
            this.cp1 = {
                x: this.start.x + (this.end.x - this.start.x) * 0.3 + Math.sin(time * 0.001 + this.phase) * 50,
                y: this.start.y + (this.end.y - this.start.y) * 0.3 + Math.cos(time * 0.001 + this.phase) * 50
            };
            this.cp2 = {
                x: this.start.x + (this.end.x - this.start.x) * 0.7 + Math.cos(time * 0.0008 + this.phase) * 50,
                y: this.start.y + (this.end.y - this.start.y) * 0.7 + Math.sin(time * 0.0008 + this.phase) * 50
            };
        }

        draw(ctx, opacity, color = '0, 0, 0') {
            ctx.beginPath();
            ctx.moveTo(this.start.x, this.start.y);
            ctx.bezierCurveTo(this.cp1.x, this.cp1.y, this.cp2.x, this.cp2.y, this.end.x, this.end.y);
            ctx.strokeStyle = `rgba(${color}, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    class TransitionThread {
        constructor(w, h) {
            this.w = w;
            this.h = h;
            this.reset();
        }

        reset() {
            const edge = Math.floor(Math.random() * 4);

            if (edge === 0) { // Top
                this.start = { x: Math.random() * this.w, y: -20 };
                this.target = { x: Math.random() * this.w, y: this.h + 20 };
            } else if (edge === 1) { // Right
                this.start = { x: this.w + 20, y: Math.random() * this.h };
                this.target = { x: -20, y: Math.random() * this.h };
            } else if (edge === 2) { // Bottom
                this.start = { x: Math.random() * this.w, y: this.h + 20 };
                this.target = { x: Math.random() * this.w, y: -20 };
            } else { // Left
                this.start = { x: -20, y: Math.random() * this.h };
                this.target = { x: this.w + 20, y: Math.random() * this.h };
            }

            // Randomized control points for "organic" tension
            this.cp1 = {
                x: this.start.x + (this.target.x - this.start.x) * 0.3 + (Math.random() - 0.5) * 200,
                y: this.start.y + (this.target.y - this.start.y) * 0.3 + (Math.random() - 0.5) * 200
            };
            this.cp2 = {
                x: this.start.x + (this.target.x - this.start.x) * 0.7 + (Math.random() - 0.5) * 200,
                y: this.start.y + (this.target.y - this.start.y) * 0.7 + (Math.random() - 0.5) * 200
            };

            this.progress = 0;
            // Accelerate: starts slow-ish, gets faster
            this.speed = 0.02 + Math.random() * 0.03;
            // Constant acceleration factor
            this.acceleration = 1.05;
        }

        update() {
            this.speed *= this.acceleration;
            this.progress += this.speed;
        }

        draw(ctx) {
            // Draw the FULL curve to stack it
            ctx.beginPath();
            ctx.moveTo(this.start.x, this.start.y);

            ctx.bezierCurveTo(
                this.cp1.x, this.cp1.y,
                this.cp2.x, this.cp2.y,
                this.target.x, this.target.y
            );

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'; // Thread-like darkness
            ctx.lineWidth = 0.6; // Thinner lines
            ctx.stroke();
        }
    }

    // --------------------------------------------------------
    // INITIALIZATION & STATE
    // --------------------------------------------------------

    let idleThreads = [];
    let generatorThreads = [];

    const initIdleThreads = () => {
        idleThreads = [];
        const numThreads = 25;
        for (let i = 0; i < numThreads; i++) {
            idleThreads.push(new IdleThread(width, height));
        }
    };

    const initGeneratorThreads = () => {
        generatorThreads = [];
        const numThreads = 30;
        for (let i = 0; i < numThreads; i++) {
            const t = new IdleThread(width, height);
            generatorThreads.push(t);
        }
    };

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        if (typeof initIdleThreads === 'function') initIdleThreads();
        if (appState === 'generator') {
            initGeneratorThreads();
        }
    }

    window.addEventListener('resize', resize);
    resize();

    // --------------------------------------------------------
    // ANIMATION LOOP VARIABLES
    // --------------------------------------------------------

    const numPoints = 120;
    const radiusScale = 0.35;
    let rotation = 0;
    let breathing = 0;
    let mouseX = 0;
    let mouseY = 0;
    let targetRotation = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - width / 2) / width;
        mouseY = (e.clientY - height / 2) / height;
    });

    let lastActivity = Date.now();
    let idleOpacity = 0;
    const idleThreshold = 3000;

    const resetIdle = () => {
        lastActivity = Date.now();
    };
    ['mousemove', 'scroll', 'click', 'touchstart'].forEach(evt =>
        window.addEventListener(evt, resetIdle)
    );

    // --------------------------------------------------------
    // MAIN DRAW LOOP
    // --------------------------------------------------------

    function draw() {
        const time = Date.now();

        if (appState === 'hero') {
            ctx.clearRect(0, 0, width, height); // Clear white

            drawCircularArt(ctx, width, height, time, '0, 0, 0');

            const isIdle = (time - lastActivity) > idleThreshold;
            const targetOpacity = isIdle ? 0.2 : 0;
            idleOpacity += (targetOpacity - idleOpacity) * 0.02;

            if (idleOpacity > 0.001) {
                idleThreads.forEach(thread => {
                    thread.update(time, width, height);
                    thread.draw(ctx, idleOpacity, '0, 0, 0');
                });
            }

        } else if (appState === 'transition') {
            // DO NOT clear rect. Accumulate lines.

            const elapsed = time - transitionStartTime;
            const progress = Math.min(elapsed / TRANSITION_DURATION, 1);

            // "Motion should accelerate quickly in the first second"
            // "Slow slightly as density increases" (meaning perception, or spawn rate?)
            // Prompt says: "Motion should accelerate quickly ... then slow slightly"
            // This might refer to the individual thread speed or the overall pacing.
            // Let's interpret as generation rate increases.

            // Spawn Rate Strategy:
            let linesToAdd = 0;
            if (progress < 0.5) {
                // Accelerating spawn
                linesToAdd = 3 + Math.floor(progress * 40);
            } else {
                // High density, slower spawn increase
                linesToAdd = 23 + Math.floor((progress - 0.5) * 10);
            }

            // Toward the end, massive dump to ensure black
            if (progress > 0.85) linesToAdd += 40;

            for (let i = 0; i < linesToAdd; i++) {
                const t = new TransitionThread(width, height);
                t.draw(ctx);
            }

            if (elapsed > TRANSITION_DURATION) {
                appState = 'generator'; // Keep 'generator' state for drawing background threads even if About is shown

                // Common Hide Actions
                document.querySelector('.navbar').style.display = 'none';
                const shopSection = document.getElementById('shop');
                if (shopSection) shopSection.style.display = 'none';

                // Force black background
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, width, height);

                // Initialize Generator Threads (background animation)
                initGeneratorThreads();

                // Destination Logic
                if (transitionDestination === 'about') {
                    const aboutSection = document.getElementById('about-section');
                    if (aboutSection) {
                        aboutSection.classList.remove('hidden');
                        setTimeout(() => aboutSection.classList.add('active'), 50);
                    }
                } else if (transitionDestination === 'contact') {
                    const contactSection = document.getElementById('contact-section');
                    if (contactSection) {
                        contactSection.classList.remove('hidden');
                        setTimeout(() => contactSection.classList.add('active'), 50);
                    }
                } else {
                    // Default: Generator
                    const setGen = document.getElementById('sequence-generator');
                    setGen.classList.remove('hidden');
                    setGen.classList.add('active');
                }
            }

        } else if (appState === 'generator') {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height); // Always clear with black

            drawCircularArt(ctx, width, height, time, '255, 255, 255');

            // Idle logic for Generator (same as Hero)
            const isIdle = (time - lastActivity) > idleThreshold;
            const targetOpacity = isIdle ? 0.2 : 0;
            idleOpacity += (targetOpacity - idleOpacity) * 0.02;

            if (idleOpacity > 0.001) {
                generatorThreads.forEach(thread => {
                    thread.update(time, width, height);
                    thread.draw(ctx, idleOpacity, '255, 255, 255');
                });
            }
        }

        requestAnimationFrame(draw);
    }

    function drawCircularArt(ctx, w, h, time, colorRGB) {
        const cx = w / 2;
        const cy = h / 2;
        const minDim = Math.min(w, h);
        const radius = minDim * radiusScale + (Math.sin(breathing) * 20);

        ctx.strokeStyle = `rgba(${colorRGB}, 0.2)`;
        ctx.lineWidth = 1;

        const points = [];
        targetRotation = mouseX * 0.2;
        rotation += (targetRotation - rotation) * 0.02;
        const currentRotation = rotation + (time * 0.00005);

        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2 + currentRotation;
            const distort = Math.sin(angle * 3) * (mouseY * 20);
            points.push({
                x: cx + Math.cos(angle) * (radius + distort),
                y: cy + Math.sin(angle) * (radius + distort)
            });
        }

        const offsets = [30, 40, 50];
        offsets.forEach(offset => {
            ctx.beginPath();
            for (let i = 0; i < numPoints; i++) {
                const p1 = points[i];
                const p2 = points[(i + offset) % numPoints];
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
            }
            ctx.stroke();
        });

        breathing += 0.005;
    }

    let transitionDestination = 'generator'; // 'generator' or 'about'

    function startTransition(txnTarget = 'generator') {
        if (appState !== 'hero') return;
        appState = 'transition';
        transitionDestination = txnTarget;
        transitionStartTime = Date.now();

        // Hide UI elements smoothly via CSS
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) heroContent.style.opacity = '0';

        const navbar = document.querySelector('.navbar');
        if (navbar) navbar.style.opacity = '0';
    }

    draw();

    // Event Listener for About
    const navAboutBtn = document.getElementById('nav-about-btn');
    if (navAboutBtn) {
        navAboutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            startTransition('about');
        });
    }

    // Event Listener for Contact
    const navContactBtn = document.getElementById('nav-contact-btn');
    if (navContactBtn) {
        navContactBtn.addEventListener('click', (e) => {
            e.preventDefault();
            startTransition('contact');
        });
    }



    // --------------------------------------------------------
    // INTRO ANIMATION
    // --------------------------------------------------------
    const logoContainer = document.querySelector('.logo');
    const navLinks = document.querySelector('.nav-links');
    const heroContent = document.querySelector('.hero-content');
    const hasPlayed = sessionStorage.getItem('logoAnimationPlayed');

    if (!hasPlayed) {
        logoContainer.classList.add('logo-animate');
        setTimeout(() => navLinks.classList.add('visible'), 1500);
        setTimeout(() => heroContent.classList.add('visible'), 2000);
        sessionStorage.setItem('logoAnimationPlayed', 'true');
    } else {
        logoContainer.classList.add('logo-static');
        navLinks.classList.add('visible');
        heroContent.classList.add('visible');
    }

    // --------------------------------------------------------
    // GENERATOR WORKSPACE LOGIC
    // --------------------------------------------------------

    const generateNowBtn = document.getElementById('generate-now-btn');
    const generatorWorkspace = document.getElementById('generator-workspace');

    if (generateNowBtn) {
        generateNowBtn.addEventListener('click', () => {
            if (generatorWorkspace) {
                generatorWorkspace.classList.remove('hidden');

                // Show Interface Card
                const interfaceCard = document.getElementById('interface-card');
                if (interfaceCard) {
                    interfaceCard.classList.remove('hidden');
                    interfaceCard.classList.remove('wide-mode');
                }

                // Reset views to ensure "Upload a picture" is the destination
                const uploadTrigger = document.getElementById('upload-trigger');
                const cropperContainer = document.getElementById('cropper-container');
                const processingView = document.getElementById('processing-view');
                const galleryContainer = document.getElementById('gallery-container');

                if (uploadTrigger) uploadTrigger.classList.remove('hidden');
                if (cropperContainer) cropperContainer.classList.add('hidden');
                if (processingView) processingView.classList.add('hidden');
                if (galleryContainer) galleryContainer.classList.add('hidden');

                // Reset Text
                const workspaceHeader = document.querySelector('#generator-workspace h2');
                const workspaceSub = document.querySelector('#generator-workspace .workspace-sub');
                if (workspaceHeader) workspaceHeader.innerText = "Upload Your Photo";
                if (workspaceSub) workspaceSub.innerText = "Process your image into string art.";

                setTimeout(() => {
                    generatorWorkspace.scrollIntoView({ behavior: 'smooth' });
                }, 10);
            }
        });
    }

    // --------------------------------------------------------
    // STRING ART GENERATOR INTEGRATION
    // --------------------------------------------------------
    const uploadTrigger = document.getElementById('upload-trigger');
    const imageInput = document.getElementById('image-upload');
    const processingView = document.getElementById('processing-view');
    const artCanvas = document.getElementById('art-canvas');
    const statusText = document.getElementById('status-text');
    const progressBar = document.getElementById('progress-bar');

    // Controls
    const btnStart = document.getElementById('btn-start-gen');
    const btnStop = document.getElementById('btn-stop-gen');
    const btnReset = document.getElementById('btn-reset-gen');
    const btnSaveGallery = document.getElementById('btn-save-gallery');
    const galleryContainer = document.getElementById('gallery-container');
    const galleryGrid = document.getElementById('gallery-grid');

    let generatorEngine = null;
    let isGenerating = false;
    let animationFrameId = null;

    if (uploadTrigger && imageInput && artCanvas) {
        const ctx = artCanvas.getContext('2d');


        const cropperContainer = document.getElementById('cropper-container');
        const cropCanvas = document.getElementById('crop-canvas');
        const cropCancelBtn = document.getElementById('crop-cancel-btn');
        const cropConfirmBtn = document.getElementById('crop-confirm-btn');

        let uploadedImage = null;
        let cropState = { x: 0, y: 0, scale: 1, minScale: 1 };

        // 1. Image Upload Handler
        const handleImageUpload = (file) => {
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    uploadedImage = img;
                    initCropper();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        };

        // --- CROPPER LOGIC ---
        function initCropper() {
            if (!uploadedImage) return;

            uploadTrigger.classList.add('hidden');
            cropperContainer.classList.remove('hidden');

            const size = Math.min(window.innerWidth - 40, 400);
            cropCanvas.width = size;
            cropCanvas.height = size;
            const ctx = cropCanvas.getContext('2d');

            const scaleW = size / uploadedImage.width;
            const scaleH = size / uploadedImage.height;
            const initialScale = Math.max(scaleW, scaleH);

            cropState = {
                x: (size - uploadedImage.width * initialScale) / 2,
                y: (size - uploadedImage.height * initialScale) / 2,
                scale: initialScale,
                minScale: 0.1
            };

            drawCrop(ctx);
            setupCropEvents(cropCanvas, ctx);
        }

        function drawCrop(ctx) {
            if (!uploadedImage) return;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

            ctx.save();
            ctx.translate(cropState.x, cropState.y);
            ctx.scale(cropState.scale, cropState.scale);
            ctx.drawImage(uploadedImage, 0, 0);
            ctx.restore();
        }

        function setupCropEvents(canvas, ctx) {
            let isDragging = false;
            let startX, startY, lastX, lastY;
            let initialPinchDistance = null;
            let initialScale = 1;

            // Mouse Events (Desktop)
            const onMouseDown = (x, y) => {
                isDragging = true;
                startX = x; startY = y;
                lastX = cropState.x; lastY = cropState.y;
            };

            const onMouseMove = (x, y) => {
                if (!isDragging) return;
                const dx = x - startX;
                const dy = y - startY;
                cropState.x = lastX + dx;
                cropState.y = lastY + dy;
                drawCrop(ctx);
            };

            canvas.addEventListener('mousedown', (e) => onMouseDown(e.clientX, e.clientY));
            window.addEventListener('mousemove', (e) => onMouseMove(e.clientX, e.clientY));
            window.addEventListener('mouseup', () => isDragging = false);

            // Wheel Zoom (Desktop)
            canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                const zoomSpeed = 0.0002; // Reduced sensitivity for smoother zooming
                const newScale = cropState.scale - e.deltaY * zoomSpeed;
                cropState.scale = Math.max(cropState.minScale, newScale);
                drawCrop(ctx);
            }, { passive: false });


            // Touch Events (Mobile - Pinch & Drag)
            canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    // Single touch: Drag
                    onMouseDown(e.touches[0].clientX, e.touches[0].clientY);
                } else if (e.touches.length === 2) {
                    // Double touch: Pinch Start
                    e.preventDefault(); // Prevent page zoom
                    isDragging = false; // Stop dragging if we were

                    const t1 = e.touches[0];
                    const t2 = e.touches[1];
                    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

                    initialPinchDistance = dist;
                    initialScale = cropState.scale;
                }
            }, { passive: false });

            canvas.addEventListener('touchmove', (e) => {
                e.preventDefault(); // CRITICAL: Stop browser scroll/zoom

                if (e.touches.length === 1 && isDragging) {
                    // Single touch: Drag
                    onMouseMove(e.touches[0].clientX, e.touches[0].clientY);
                } else if (e.touches.length === 2 && initialPinchDistance) {
                    // Double touch: Pinch Resize
                    const t1 = e.touches[0];
                    const t2 = e.touches[1];
                    const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

                    if (currentDist > 0) {
                        const scaleFactor = currentDist / initialPinchDistance;
                        const newScale = initialScale * scaleFactor;
                        cropState.scale = Math.max(cropState.minScale, newScale);
                        drawCrop(ctx);
                    }
                }
            }, { passive: false });

            canvas.addEventListener('touchend', (e) => {
                // If fingers lift, reset pinch state
                if (e.touches.length < 2) {
                    initialPinchDistance = null;
                }
                // If 0 fingers, stop drag
                if (e.touches.length === 0) {
                    isDragging = false;
                }
            });
        }

        cropCancelBtn.addEventListener('click', () => {
            uploadedImage = null;
            cropperContainer.classList.add('hidden');
            uploadTrigger.classList.remove('hidden');
        });

        cropConfirmBtn.addEventListener('click', () => {
            if (!uploadedImage) return;

            // Capture cropped content
            // Capture cropped content
            processingView.classList.remove('hidden');
            cropperContainer.classList.add('hidden');
            document.getElementById('interface-card').classList.add('wide-mode');

            const size = 500;
            // Draw crop to temp canvas then to art canvas
            // actually we can just draw from cropped canvas logic, but higher res?
            // Let's just redraw the cropped view onto the 500x500 canvas

            // Map crop canvas view (W x H) to 500x500
            // cropState was for 'cropCanvas.width/height'.
            // scaling factor = 500 / cropCanvas.width

            const upscale = size / cropCanvas.width;

            ctx.clearRect(0, 0, size, size);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, size, size);

            ctx.save();
            ctx.scale(upscale, upscale);
            ctx.translate(cropState.x, cropState.y);
            ctx.scale(cropState.scale, cropState.scale);
            ctx.drawImage(uploadedImage, 0, 0);
            ctx.restore();

            // Display Source Image separately
            const sourceDisplay = document.getElementById('source-image-display');
            if (sourceDisplay) {
                sourceDisplay.src = artCanvas.toDataURL();
            }

            // Save source state for regeneration
            if (!window.sourceCanvasCache) {
                window.sourceCanvasCache = document.createElement('canvas');
            }
            window.sourceCanvasCache.width = size;
            window.sourceCanvasCache.height = size;
            window.sourceCanvasCache.getContext('2d').drawImage(artCanvas, 0, 0);

            // Initialize Engine
            if (typeof StringArtGenerator !== 'undefined') {
                // Header Updates
                const workspaceHeader = document.querySelector('#generator-workspace h2');
                const workspaceSub = document.querySelector('#generator-workspace .workspace-sub');
                if (workspaceHeader) workspaceHeader.innerText = "Generator Ready";
                if (workspaceSub) workspaceSub.innerText = "Click start to begin.";

                generatorEngine = new StringArtGenerator(size, size);
                generatorEngine.loadFromElement(artCanvas);

                // Clear canvas again to prepare for drawing lines
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, size, size);

                statusText.innerText = "Image Processed. Ready.";
                btnStart.disabled = false;
            }
        });
        uploadTrigger.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', (e) => handleImageUpload(e.target.files[0]));

        // Drag & Drop
        uploadTrigger.addEventListener('dragover', (e) => { e.preventDefault(); uploadTrigger.style.borderColor = '#fff'; });
        uploadTrigger.addEventListener('dragleave', (e) => { e.preventDefault(); uploadTrigger.style.borderColor = '#444'; });
        uploadTrigger.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadTrigger.style.borderColor = '#444';
            handleImageUpload(e.dataTransfer.files[0]);
        });

        // 2. Generation Logic
        if (btnStart) {
            btnStart.addEventListener('click', () => {
                if (!generatorEngine) return;
                if (isGenerating) return;

                // Reset canvas
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, 500, 500);

                // Reload original image data to ensure clean state
                if (window.sourceCanvasCache) {
                    generatorEngine.loadFromElement(window.sourceCanvasCache);
                }

                isGenerating = true;
                btnStart.disabled = true;

                // Setup Pins
                const NAILS = 200;
                generatorEngine.initPins(NAILS, 'square');

                // Style for drawing
                ctx.lineWidth = 0.5;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';

                const lineSelect = document.getElementById('line-count-select');
                const MAX_LINES = lineSelect ? parseInt(lineSelect.value, 10) : 3000;
                let linesDrawn = 0;

                statusText.innerText = "Generating...";

                const loop = () => {
                    if (!isGenerating) return;
                    if (linesDrawn >= MAX_LINES) {
                        isGenerating = false;
                        statusText.innerText = "Complete!";
                        btnStart.disabled = false;
                        if (btnSaveGallery) btnSaveGallery.disabled = false;
                        if (document.getElementById('btn-download-seq')) document.getElementById('btn-download-seq').disabled = false;
                        return;
                    }

                    const steps = generatorEngine.generateSteps(10);

                    steps.forEach(step => {
                        ctx.beginPath();
                        ctx.moveTo(step.p1.x, step.p1.y);
                        ctx.lineTo(step.p2.x, step.p2.y);
                        ctx.stroke();
                    });

                    linesDrawn += steps.length;

                    if (progressBar) {
                        progressBar.style.width = `${(linesDrawn / MAX_LINES) * 100}%`;
                    }

                    animationFrameId = requestAnimationFrame(loop);
                };

                loop();
            });
        }

        // Download Sequence
        const btnDownloadSeq = document.getElementById('btn-download-seq');
        const redeemModal = document.getElementById('redeem-modal');
        const btnCancelRedeem = document.getElementById('btn-cancel-redeem');
        const btnConfirmRedeem = document.getElementById('btn-confirm-redeem');
        const redeemInput = document.getElementById('redeem-code-input');
        const redeemError = document.getElementById('redeem-error');

        // Update Button Styling for Lock State
        if (btnDownloadSeq) {
            btnDownloadSeq.classList.add('locked-btn'); // Add red/locked style
            // Note: Add this class in CSS or handling styling in JS
            btnDownloadSeq.style.backgroundColor = '#ff4444';
            btnDownloadSeq.innerText = '🔒 Download Sequence';
        }

        if (btnDownloadSeq) {
            btnDownloadSeq.addEventListener('click', () => {
                if (!generatorEngine || !generatorEngine.sequence) return;

                if (!isDownloadUnlocked) {
                    // Show Redeem Modal
                    if (redeemModal) {
                        redeemModal.classList.remove('hidden');
                        redeemInput.value = '';
                        redeemError.style.display = 'none';
                    }
                    return;
                }

                // Proceed to Download
                performDownload();
            });
        }

        // Modal Actions
        if (btnCancelRedeem) {
            btnCancelRedeem.addEventListener('click', () => {
                if (redeemModal) redeemModal.classList.add('hidden');
            });
        }

        if (btnConfirmRedeem) {
            btnConfirmRedeem.addEventListener('click', async () => {
                const code = redeemInput.value.trim();
                if (code.length !== 10) {
                    showRedeemError("Please enter a valid 10-digit code.");
                    return;
                }

                if (!supabaseClient) {
                    showRedeemError("Database connection not set up.");
                    return;
                }

                btnConfirmRedeem.disabled = true;
                btnConfirmRedeem.innerText = "Verifying...";

                try {
                    // 1. Check Code
                    const { data, error } = await supabaseClient
                        .from('redeem_codes')
                        .select('*')
                        .eq('code', code)
                        .single();

                    if (error || !data) {
                        showRedeemError("Invalid code. Please check and try again.");
                        resetRedeemBtn();
                        return;
                    }

                    if (data.is_used) {
                        showRedeemError("This code has already been used.");
                        resetRedeemBtn();
                        return;
                    }

                    // 2. Mark as Used
                    const { error: updateError } = await supabaseClient
                        .from('redeem_codes')
                        .update({ is_used: true })
                        .eq('id', data.id);

                    if (updateError) {
                        showRedeemError("Error updating code status. Try again.");
                        resetRedeemBtn();
                        return;
                    }

                    // 3. Success! Unlock and Download
                    isDownloadUnlocked = true;
                    if (redeemModal) redeemModal.classList.add('hidden');

                    // Update Button Visuals
                    btnDownloadSeq.style.backgroundColor = ''; // Revert to default or green
                    btnDownloadSeq.classList.remove('locked-btn');
                    btnDownloadSeq.innerText = 'Download Sequence';

                    // Trigger Save to Gallery (Force Save)
                    // We call the click handler, but we need to ensuring it knows it is a forced save
                    // We can reuse the logic or just manually save here to ensure `unlocked: true` is set.
                    // Let's modify save logic to handle this state.
                    saveCurrentToGallery(true); // Pass true for isRedeemed

                    // Trigger Download
                    performDownload();

                    alert("Code valid! Download unlocked and art saved to gallery.");

                } catch (err) {
                    console.error(err);
                    showRedeemError("An unexpected error occurred.");
                    resetRedeemBtn();
                }
            });
        }

        function showRedeemError(msg) {
            if (redeemError) {
                redeemError.innerText = msg;
                redeemError.style.display = 'block';
            }
        }

        function resetRedeemBtn() {
            btnConfirmRedeem.disabled = false;
            btnConfirmRedeem.innerText = "Redeem & Download";
        }

        function performDownload() {
            const seq = generatorEngine.sequence.map(n => n + 1);
            const text = seq.join(', ');
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `string_art_sequence_${Date.now()}.txt`;
            a.click();
        }

        // Go to Reader
        const btnGoReader = document.getElementById('btn-go-reader');
        const readerView = document.getElementById('reader-view');

        if (btnGoReader && readerView) {
            btnGoReader.addEventListener('click', () => {
                // Switch Views
                // Hide wrapper card content
                const interfaceCard = document.getElementById('interface-card');
                if (interfaceCard) interfaceCard.classList.add('hidden');

                processingView.classList.add('hidden');
                galleryContainer.classList.add('hidden');
                readerView.classList.remove('hidden');

                // Hide Main Headers for Cleaner Look
                const workspaceHeader = document.querySelector('#generator-workspace h2');
                const workspaceSub = document.querySelector('#generator-workspace .workspace-sub');
                if (workspaceHeader) workspaceHeader.style.display = 'none';
                if (workspaceSub) workspaceSub.style.display = 'none';

                // Initialize Reader
                initReader();
            });
        }

        const btnHeroReader = document.getElementById('hero-reader-btn');
        if (btnHeroReader && readerView) {
            btnHeroReader.addEventListener('click', () => {
                // Ensure generator workspace is shown
                if (generatorWorkspace) generatorWorkspace.classList.remove('hidden');

                const interfaceCard = document.getElementById('interface-card');
                if (interfaceCard) interfaceCard.classList.add('hidden');

                // Hide other main views including Upload
                uploadTrigger.classList.add('hidden');
                cropperContainer.classList.add('hidden');
                processingView.classList.add('hidden');
                galleryContainer.classList.add('hidden');

                // Show Reader
                readerView.classList.remove('hidden');

                // Hide Main Headers for Cleaner Look
                const workspaceHeader = document.querySelector('#generator-workspace h2');
                const workspaceSub = document.querySelector('#generator-workspace .workspace-sub');
                if (workspaceHeader) workspaceHeader.style.display = 'none';
                if (workspaceSub) workspaceSub.style.display = 'none';

                // Scroll to workspace
                generatorWorkspace.scrollIntoView({ behavior: 'smooth' });

                // Initialize Reader
                initReader();
            });
        }

        if (btnReset) {
            btnReset.addEventListener('click', () => {
                isGenerating = false;
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                generatorEngine = null;

                processingView.classList.add('hidden');
                uploadTrigger.classList.remove('hidden');
                document.getElementById('interface-card').classList.remove('wide-mode');

                const sourceDisplay = document.getElementById('source-image-display');
                if (sourceDisplay) sourceDisplay.src = '';

                // Reset Headers
                const workspaceHeader = document.querySelector('#generator-workspace h2');
                const workspaceSub = document.querySelector('#generator-workspace .workspace-sub');
                if (workspaceHeader) {
                    workspaceHeader.innerText = "Upload Your Photo";
                    workspaceHeader.style.display = 'block';
                }
                if (workspaceSub) {
                    workspaceSub.innerText = "Process your image into string art.";
                    workspaceSub.style.display = 'block';
                }

                imageInput.value = '';
                btnStart.disabled = false;
                if (progressBar) progressBar.style.width = '0%';
                if (btnSaveGallery) btnSaveGallery.disabled = true;

                // Reset Lock State
                isDownloadUnlocked = false;
                if (btnDownloadSeq) {
                    btnDownloadSeq.classList.add('locked-btn');
                    btnDownloadSeq.style.backgroundColor = '#ff4444';
                    btnDownloadSeq.innerText = '🔒 Download Sequence';
                    btnDownloadSeq.disabled = true; // Ensure disabled until generation complete
                }
            });
        }

        // Gallery Logic
        const deleteGalleryItem = (id) => {
            const saved = JSON.parse(localStorage.getItem('stringArtGallery') || '[]');
            const updated = saved.filter(item => item.id !== id);
            localStorage.setItem('stringArtGallery', JSON.stringify(updated));
            renderGallery();
        };

        const renderGallery = () => {
            if (!galleryGrid || !galleryContainer) return;
            let saved = JSON.parse(localStorage.getItem('stringArtGallery') || '[]');

            // Migration & Cleanup Logic
            saved = saved.map(item => {
                if (item.data && !item.artData) {
                    return { ...item, artData: item.data };
                }
                return item;
            }).filter(item => item.artData && item.artData.length > 100);

            // Force limit if exceeded (e.g. from previous versions)
            if (saved.length > 3) {
                saved = saved.slice(saved.length - 3);
            }

            // Always persist the cleaned/migrated list
            localStorage.setItem('stringArtGallery', JSON.stringify(saved));

            galleryGrid.innerHTML = '';

            if (saved.length > 0) {
                galleryContainer.classList.remove('hidden');

                // Show newest first
                [...saved].reverse().forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'gallery-item';
                    div.style.width = '100%'; // Full width
                    div.style.marginBottom = '2rem'; // Spacing between items

                    // Handle missing source data for older items
                    const sourceDisplay = item.sourceData ?
                        `<img src="${item.sourceData}" style="width: 100%; height: auto; border-radius: 4px; display: block; object-fit: cover;" title="Original">` :
                        `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #555; background: #000; font-size: 0.9rem;">No Source</div>`;

                    div.innerHTML = `
                        <div class="gallery-click-area" data-id="${item.id}" style="display: flex; gap: 10px; margin-bottom: 12px; cursor: pointer; position: relative;">
                            ${item.unlocked ? '<div style="position: absolute; top: -10px; right: -10px; background: #00ff88; color: black; border-radius: 50%; width: 24px; height: 24px; display: flex; justify-content: center; align-items: center; font-size: 14px; font-weight: bold; border: 2px solid white; z-index: 10;">✓</div>' : ''}
                            <div style="flex: 1; aspect-ratio: 1; overflow: hidden; border-radius: 4px; background: #000; pointer-events: none;">
                                ${sourceDisplay}
                            </div>
                             <div style="flex: 1; aspect-ratio: 1; overflow: hidden; border-radius: 4px; background: #000; pointer-events: none;">
                                <img src="${item.artData}" style="width: 100%; height: 100%; object-fit: cover;" title="String Art">
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 5px;">
                            <span style="font-size: 0.75rem; color: #666; font-family: 'Inter', sans-serif;">${new Date(item.id).toLocaleDateString()} ${item.unlocked ? '<span style="color: #00ff88; margin-left: 5px;">(Unlocked)</span>' : ''}</span>
                            <button class="gallery-delete-btn" data-id="${item.id}" style="
                                background: transparent; 
                                border: none; 
                                color: #666; 
                                font-size: 0.75rem; 
                                cursor: pointer;
                                transition: all 0.2s;
                                text-decoration: underline;
                            ">Delete</button>
                        </div>
                    `;
                    galleryGrid.appendChild(div);
                });
            } else {
                galleryGrid.innerHTML = '<div style="text-align: center; width: 100%; color: #888; padding: 2rem 0;">No items in gallery.</div>';
            }
        };


        // Refactored Gallery Save Logic to be reusable
        function saveCurrentToGallery(isRedeemed = false) {
            if (!artCanvas) return;

            // Capture Source
            let sourceData = '';
            if (window.sourceCanvasCache) {
                sourceData = window.sourceCanvasCache.toDataURL();
            } else {
                const sourceDisplay = document.getElementById('source-image-display');
                if (sourceDisplay) sourceData = sourceDisplay.src;
            }

            const artData = artCanvas.toDataURL();
            const saved = JSON.parse(localStorage.getItem('stringArtGallery') || '[]');

            // Check if already exists (by approximate match of data or just assume new?)
            // For simplicity, we assume new unless we track current ID.
            // But if we just redeemed, we want to save THIS art.

            // LIMIT CHECK: Only if NOT redeemed. Redeemed art bypasses limit.
            if (!isRedeemed && saved.length >= 3) {
                alert("Gallery is full (Max 3). Please delete an old item below to save this new one.");
                galleryContainer.scrollIntoView({ behavior: 'smooth' });
                return;
            }

            const newItem = {
                id: Date.now(),
                artData,
                sourceData,
                unlocked: isRedeemed || isDownloadUnlocked, // Save lock state
                sequence: generatorEngine ? generatorEngine.sequence : null // Save sequence data
            };

            saved.push(newItem);
            localStorage.setItem('stringArtGallery', JSON.stringify(saved));

            renderGallery();
            if (!isRedeemed) alert('Saved to Gallery!');
        }

        if (btnSaveGallery) {
            btnSaveGallery.addEventListener('click', () => saveCurrentToGallery(isDownloadUnlocked));
        }

        if (galleryGrid) {
            galleryGrid.addEventListener('click', (e) => {
                // Handle Delete
                if (e.target.classList.contains('gallery-delete-btn')) {
                    const id = Number(e.target.dataset.id);
                    if (confirm("Permanently delete this item?")) {
                        deleteGalleryItem(id);
                    }
                    return;
                }

                // Handle Load Item (Click on image area)
                const clickArea = e.target.closest('.gallery-click-area');
                if (clickArea) {
                    const id = Number(clickArea.dataset.id);
                    const saved = JSON.parse(localStorage.getItem('stringArtGallery') || '[]');
                    const item = saved.find(i => i.id === id);

                    if (item && generatorWorkspace) {
                        // SET UNLOCKED STATE based on Saved Item
                        isDownloadUnlocked = !!item.unlocked;

                        // Update Button Visuals accordingly
                        const btnDownloadSeq = document.getElementById('btn-download-seq');
                        if (btnDownloadSeq) {
                            if (isDownloadUnlocked) {
                                btnDownloadSeq.style.backgroundColor = '';
                                btnDownloadSeq.classList.remove('locked-btn');
                                btnDownloadSeq.innerText = 'Download Sequence';
                            } else {
                                btnDownloadSeq.classList.add('locked-btn');
                                btnDownloadSeq.style.backgroundColor = '#ff4444';
                                btnDownloadSeq.innerText = '🔒 Download Sequence';
                            }
                            // Important: Enable button if sequence is present!
                            btnDownloadSeq.disabled = !item.sequence;
                        }

                        const btnSaveGallery = document.getElementById('btn-save-gallery');
                        if (btnSaveGallery) {
                            // Disable saving again if just loaded, or enable if you want duplicates? 
                            // Best to disable to avoid confusion unless regenerated.
                            // But let's leave default behavior or enable.
                            btnSaveGallery.disabled = false;
                        }
                        // Switch Views
                        galleryContainer.classList.add('hidden');
                        processingView.classList.remove('hidden');
                        document.getElementById('interface-card').classList.add('wide-mode');

                        // Load Data
                        const artCanvas = document.getElementById('art-canvas');
                        const ctx = artCanvas.getContext('2d');
                        const sourceDisplay = document.getElementById('source-image-display');
                        const statusText = document.getElementById('status-text');

                        // Clear and Draw Art
                        const artImg = new Image();
                        artImg.onload = () => {
                            ctx.clearRect(0, 0, artCanvas.width, artCanvas.height);
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, artCanvas.width, artCanvas.height);
                            ctx.drawImage(artImg, 0, 0, artCanvas.width, artCanvas.height);
                        };
                        artImg.src = item.artData;

                        // Load Source
                        if (item.sourceData) {
                            if (sourceDisplay) sourceDisplay.src = item.sourceData;

                            // Rehydrate Engine for regeneration capability
                            if (typeof StringArtGenerator !== 'undefined') {
                                const sourceImg = new Image();
                                sourceImg.onload = () => {
                                    // Make a temp canvas to load into engine
                                    const tempCanvas = document.createElement('canvas');
                                    tempCanvas.width = 500;
                                    tempCanvas.height = 500;
                                    const tCtx = tempCanvas.getContext('2d');
                                    tCtx.fillStyle = '#fff';
                                    tCtx.fillRect(0, 0, 500, 500);
                                    tCtx.drawImage(sourceImg, 0, 0, 500, 500);

                                    // Init Engine
                                    generatorEngine = new StringArtGenerator(500, 500);
                                    generatorEngine.loadFromElement(tempCanvas);

                                    // Cache for reset
                                    window.sourceCanvasCache = tempCanvas;

                                    // RESTORE SEQUENCE IF AVAILABLE
                                    if (item.sequence) {
                                        generatorEngine.sequence = item.sequence;
                                        // Also need to set pins if not set? 
                                        // The initPins is called on Start. 
                                        // We might need to manually ensure pins are ready or just trust sequence data.
                                        // Actually, to download, we just need `generatorEngine.sequence`.
                                        // But we might need `generatorEngine.pins` if we were to re-draw. 
                                        // For now, just setting sequence is enough to enable download.
                                        const btnDownloadSeq = document.getElementById('btn-download-seq');
                                        if (btnDownloadSeq) btnDownloadSeq.disabled = false;
                                    }
                                };
                                sourceImg.src = item.sourceData;
                            }
                        }

                        // UI Updates
                        if (statusText) statusText.innerText = "Loaded from Gallery";

                        // Reset Headers
                        const workspaceHeader = document.querySelector('#generator-workspace h2');
                        const workspaceSub = document.querySelector('#generator-workspace .workspace-sub');
                        if (workspaceHeader) {
                            workspaceHeader.innerText = "Generator Ready";
                            workspaceHeader.style.display = 'block';
                        }
                        if (workspaceSub) {
                            workspaceSub.innerText = "View or regenerate your art.";
                            workspaceSub.style.display = 'block';
                        }

                        // Scroll up
                        generatorWorkspace.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        }



        const btnViewGalleryInternal = document.getElementById('btn-view-gallery-internal');
        const handleViewGallery = () => {
            // Ensure generator workspace is visible
            if (generatorWorkspace) generatorWorkspace.classList.remove('hidden');

            // Show Interface Card (as Gallery is inside it now)
            const interfaceCard = document.getElementById('interface-card');
            if (interfaceCard) interfaceCard.classList.remove('hidden');

            // Hide other main views
            uploadTrigger.classList.add('hidden');
            cropperContainer.classList.add('hidden');
            processingView.classList.add('hidden');

            // Show Gallery (it is inside the card)
            galleryContainer.classList.remove('hidden');
            renderGallery(); // Ensure content is updated

            setTimeout(() => {
                galleryContainer.scrollIntoView({ behavior: 'smooth' });
            }, 10);

            // Also update header to indicate Gallery View? Optional.
            const workspaceHeader = document.querySelector('#generator-workspace h2');
            const workspaceSub = document.querySelector('#generator-workspace .workspace-sub');
            if (workspaceHeader) {
                workspaceHeader.innerText = "Gallery";
                workspaceHeader.style.display = 'block';
            }
            if (workspaceSub) {
                workspaceSub.innerText = "Your saved designs.";
                workspaceSub.style.display = 'block';
            }
        };

        const viewGalleryBtn = document.getElementById('view-gallery-btn');
        if (viewGalleryBtn) {
            viewGalleryBtn.addEventListener('click', handleViewGallery);
        }
        if (btnViewGalleryInternal) {
            btnViewGalleryInternal.addEventListener('click', handleViewGallery);
        }

        // --- READER LOGIC ---
        let readerSequence = [];
        let readerStep = 0;
        let readerPlaying = false;
        let readerInterval = null;
        let speechUtterance = null;

        function initReader() {
            // Reset UI
            const readerSetupCard = document.getElementById('reader-setup-card');
            const readerUploadTrigger = document.getElementById('reader-upload-trigger');
            const readerLangSelect = document.getElementById('reader-language-select');
            const readerInterface = document.getElementById('reader-interface');

            if (readerSetupCard) readerSetupCard.classList.remove('hidden');
            if (readerUploadTrigger) readerUploadTrigger.classList.remove('hidden');
            if (readerLangSelect) readerLangSelect.classList.add('hidden');
            if (readerInterface) readerInterface.classList.add('hidden');

            readerStep = 0;
            readerPlaying = false;
        }

        let readerTempSequenceText = null;
        let readerLanguage = 'en-US';

        const readerFileUpload = document.getElementById('reader-file-upload');
        const readerUploadTrigger = document.getElementById('reader-upload-trigger');
        const readerInterface = document.getElementById('reader-interface');
        const readerLangSelect = document.getElementById('reader-language-select');

        if (readerUploadTrigger && readerFileUpload) {
            readerUploadTrigger.addEventListener('click', () => readerFileUpload.click());
            readerFileUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (evt) => {
                    readerTempSequenceText = evt.target.result;
                    // Show Language Select
                    readerUploadTrigger.classList.add('hidden');
                    if (readerLangSelect) readerLangSelect.classList.remove('hidden');
                };
                reader.readAsText(file);
            });
        }

        // Language Buttons
        const langBtns = document.querySelectorAll('.lang-btn');
        langBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const selectedLang = e.target.dataset.lang;
                if (selectedLang !== 'en-US') {
                    alert('Still in Beta');
                    return; // Do not proceed
                }

                readerLanguage = 'en-US';
                if (readerTempSequenceText && readerLangSelect) {
                    readerLangSelect.classList.add('hidden');
                    loadReaderSequence(readerTempSequenceText);
                }
            });
        });

        let readerPins = [];

        function initReaderPins(numPins = 200) {
            readerPins = [];
            const rCanvas = document.getElementById('reader-canvas');
            if (!rCanvas) return;
            const width = rCanvas.width;
            const height = rCanvas.height;
            const margin = 30;

            // Square Logic: Top -> Right -> Bottom -> Left
            // Pin 1 (Index 0) at Top-Left (margin, margin)

            const w = width - 2 * margin;
            const h = height - 2 * margin;
            const x0 = margin;
            const y0 = margin;
            const perimeter = 2 * (w + h);
            const step = perimeter / numPins;

            for (let i = 0; i < numPins; i++) {
                let d = (i * step) % perimeter;
                let x, y;

                if (d < w) { // Top Edge
                    x = x0 + d;
                    y = y0;
                } else if (d < w + h) { // Right Edge
                    x = x0 + w;
                    y = y0 + (d - w);
                } else if (d < 2 * w + h) { // Bottom Edge
                    x = x0 + w - (d - (w + h));
                    y = y0 + h;
                } else { // Left Edge
                    x = x0;
                    y = y0 + h - (d - (2 * w + h));
                }
                readerPins.push({ x, y });
            }
        }

        function drawReaderCanvas(limitStep = null) {
            const rCanvas = document.getElementById('reader-canvas');
            if (!rCanvas || readerPins.length === 0) return;
            const ctx = rCanvas.getContext('2d');

            // Force White Background for visibility against dark UI
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, rCanvas.width, rCanvas.height);

            // Determine drawing limit
            // If limitStep provided, use it. Else use global readerStep.
            const drawUntilIndex = (limitStep !== null) ? limitStep : readerStep;

            // Draw Pins
            const pinCount = readerPins.length;
            readerPins.forEach((p, i) => {
                ctx.beginPath();
                // 1-based index for logic: (i+1)
                // Mark 1, 10, 20... which corresponds to i=0, i=9, i=19...
                // Only mark every 10th (10, 20..) and also 1.
                // i+1 % 10 === 0 means 10, 20...
                // i === 0 means 1.

                const isMarker = (i === 0) || ((i + 1) % 10 === 0);

                if (isMarker) {
                    ctx.fillStyle = '#ff0000'; // Red markers
                    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                } else {
                    ctx.fillStyle = '#ccc'; // Light gray non-markers
                    ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
                }
                ctx.fill();

                // Add labels for key pins (1, 10, 20...)
                if ((i === 0) || ((i + 1) % 10 === 0)) {
                    ctx.fillStyle = '#666';
                    ctx.font = '9px Arial';

                    // Calculate direction from center to place label outside
                    const cx = rCanvas.width / 2;
                    const cy = rCanvas.height / 2;
                    const dx = p.x - cx;
                    const dy = p.y - cy;
                    // Normalize
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Shift text out by ~10px
                    const textX = p.x + nx * 12;
                    const textY = p.y + ny * 12;

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText((i + 1).toString(), textX, textY);
                }
            });

            // Draw Lines
            if (readerSequence.length > 0) {
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'; // Black strings
                ctx.lineWidth = 0.5;

                // Draw all history
                // Note: sequence is 1-based pin numbers. Adjust to 0-based for array index.
                const currentSeq = readerSequence.slice(0, drawUntilIndex + 1);

                if (currentSeq.length > 1) {
                    const firstPinIdx = currentSeq[0] - 1;
                    if (readerPins[firstPinIdx]) {
                        ctx.moveTo(readerPins[firstPinIdx].x, readerPins[firstPinIdx].y);
                    }

                    for (let i = 1; i < currentSeq.length; i++) {
                        const pIdx = currentSeq[i] - 1;
                        if (readerPins[pIdx]) {
                            ctx.lineTo(readerPins[pIdx].x, readerPins[pIdx].y);
                        }
                    }
                }
                ctx.stroke();

                // Highlight Current Line
                if (drawUntilIndex > 0) {
                    const prevPinIdx = readerSequence[drawUntilIndex - 1] - 1;
                    const currPinIdx = readerSequence[drawUntilIndex] - 1;
                    if (readerPins[prevPinIdx] && readerPins[currPinIdx]) {
                        ctx.beginPath();
                        ctx.strokeStyle = '#00ffcc'; // Highlight color
                        ctx.lineWidth = 2;
                        ctx.moveTo(readerPins[prevPinIdx].x, readerPins[prevPinIdx].y);
                        ctx.lineTo(readerPins[currPinIdx].x, readerPins[currPinIdx].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function loadReaderSequence(text) {
            // Parse CSV
            readerSequence = text.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));

            if (readerSequence.length > 0) {
                const readerSetupCard = document.getElementById('reader-setup-card');
                if (readerSetupCard) readerSetupCard.classList.add('hidden');

                readerInterface.classList.remove('hidden');

                // Init Visualization (Assume 200 for now or max in sequence?)
                // Heuristic: If max pin > 200, use 288 or max.
                const maxPin = Math.max(...readerSequence);
                const pinCount = maxPin > 200 ? Math.max(maxPin, 288) : 200;
                initReaderPins(pinCount);

                readerStep = 0;
                updateReaderUI();
            } else {
                alert("Invalid sequence file.");
            }
        }

        let readerCurrentAudio = null;
        let readerTimeout = null;

        function updateReaderUI(shouldSpeak = false) {
            const pinDisplay = document.getElementById('reader-pin-display');
            const stepStatus = document.getElementById('reader-step-status');

            if (readerStep < readerSequence.length) {
                const pin = readerSequence[readerStep];

                // MANUAL MODE: Update immediately
                if (!readerPlaying) {
                    if (pinDisplay) {
                        pinDisplay.innerText = pin;
                        pinDisplay.style.opacity = '1';
                    }
                    if (stepStatus) stepStatus.innerText = `Step ${readerStep + 1} / ${readerSequence.length}`;
                    drawReaderCanvas(readerStep);
                }
                // PLAY MODE: Defer updates to processStepAudio to match voice
                else if (shouldSpeak) {
                    // Just trigger the audio load, visuals will update in callback
                    processStepAudio(pin, readerStep);
                }
            } else {
                if (stepStatus) stepStatus.innerText = "Done!";
                stopReading();
            }
        }

        function processStepAudio(pin, contextStepIndex) {
            // Do NOT update innerText yet to avoid jumping ahead visually
            document.getElementById('reader-pin-display').style.opacity = '0.5';

            // Cancel prev
            // Ensure we don't trigger onend logic for the canceled utterance by invalidating current
            speechUtterance = null;
            window.speechSynthesis.cancel();

            const stepNum = contextStepIndex + 1;
            const textToRead = `Step ${stepNum}, ${pin}`;

            // Offline / System TTS Only
            const utterance = new SpeechSynthesisUtterance(textToRead);
            speechUtterance = utterance; // Track global current

            utterance.lang = 'en-US'; // Force English
            const speedVal = parseFloat(document.getElementById('reader-speed').value) || 100;
            utterance.rate = speedVal / 100;

            utterance.onstart = () => {
                if (!readerPlaying) {
                    window.speechSynthesis.cancel();
                    return;
                }

                // Audio Started -> Update Visuals (SYNCED HERE)
                const pDisplay = document.getElementById('reader-pin-display');
                if (pDisplay) {
                    pDisplay.innerText = pin;
                    pDisplay.style.opacity = '1';
                }

                const sStatus = document.getElementById('reader-step-status');
                if (sStatus) {
                    sStatus.innerText = `Step ${contextStepIndex + 1} / ${readerSequence.length}`;
                }

                drawReaderCanvas(contextStepIndex);
            };

            utterance.onend = () => {
                // Prevent race condition: If this utterance is not the active one, ignore.
                if (speechUtterance !== utterance) return;
                scheduleNextStep();
            };

            utterance.onerror = (e) => {
                // Prevent race condition
                if (speechUtterance !== utterance) return;

                console.error("System TTS Error", e);
                // Even if error, try to move on?
                scheduleNextStep();
            };

            // Speak
            window.speechSynthesis.speak(utterance);
        }

        function scheduleNextStep() {
            if (!readerPlaying) return;
            // Calculate delay based on speed? Or fixed gap?
            // Fixed gap of 500ms sounds natural
            readerTimeout = setTimeout(() => {
                if (readerStep < readerSequence.length - 1) {
                    readerStep++;
                    updateReaderUI(true); // Trigger next speak
                } else {
                    stopReading();
                }
            }, 500);
        }

        function stopReading() {
            readerPlaying = false;
            clearTimeout(readerTimeout);

            // Cancel any ongoing speech immediately
            window.speechSynthesis.cancel();

            const btnPlay = document.getElementById('reader-play');
            if (btnPlay) btnPlay.innerText = "Play";

            document.getElementById('reader-pin-display').style.opacity = '1';
        }

        const btnReaderPrev = document.getElementById('reader-prev');
        const btnReaderNext = document.getElementById('reader-next');
        const btnReaderPlay = document.getElementById('reader-play');

        if (btnReaderPrev) {
            btnReaderPrev.addEventListener('click', () => {
                stopReading();
                if (readerStep > 0) {
                    readerStep--;
                    updateReaderUI(false);
                }
            });
        }

        if (btnReaderNext) {
            btnReaderNext.addEventListener('click', () => {
                stopReading();
                if (readerStep < readerSequence.length - 1) {
                    readerStep++;
                    updateReaderUI(false);
                }
            });
        }

        if (btnReaderPlay) {
            btnReaderPlay.addEventListener('click', () => {
                if (readerPlaying) {
                    stopReading();
                } else {
                    readerPlaying = true;
                    btnReaderPlay.innerText = "Pause";
                    updateReaderUI(true); // Start Loop
                }
            });
        }

        const sliderSpeed = document.getElementById('reader-speed');
        if (sliderSpeed) {
            sliderSpeed.addEventListener('input', (e) => {
                document.getElementById('reader-speed-val').innerText = e.target.value + '%';
                if (readerPlaying) {
                    // Restart with new speed
                    stopReading();
                    // Optionally auto-restart, but stop is safer to avoid confusion
                }
            });
        }

        const btnJump = document.getElementById('reader-jump-btn');
        const inputJump = document.getElementById('reader-jump-input');

        if (btnJump && inputJump) {
            btnJump.addEventListener('click', () => {
                const val = parseInt(inputJump.value);
                if (!isNaN(val) && val >= 1 && val <= readerSequence.length) {
                    stopReading();
                    readerStep = val - 1;
                    updateReaderUI(false);
                    inputJump.value = '';
                } else {
                    alert(`Please enter a step between 1 and ${readerSequence.length}`);
                }
            });
        }


        // Initial render
        renderGallery();
    }
});
