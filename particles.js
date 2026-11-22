
document.addEventListener("DOMContentLoaded", function () {

    // ==========================================
    // NUMORA - DYNAMIC NEON PARTICLE NETWORK
    // ==========================================

    const canvas = document.createElement("canvas");
    canvas.id = "particles-canvas";
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d", {
        alpha: true
    });

    // CONFIGURATION
    const PARTICLE_COUNT = 180;
    const CONNECT_DISTANCE = 125;
    const KEEP_DISTANCE = 145;
    const SPEED = 0.9;

    const MAX_NEIGHBORS = 5;
    const MAX_TRIANGLES = 4;

    const COLORS = [
        "#a855f7",
        "#c026d3",
        "#d946ef",
        "#e879f9",
        "#9333ea"
    ];

    // CANVAS SIZE
    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;

        // Limit rendering resolution for performance
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);

        canvas.style.width = width + "px";
        canvas.style.height = height + "px";

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();

    window.addEventListener("resize", resize);

    // PARTICLES
    const particles = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,

            vx: (Math.random() - 0.5) * SPEED,
            vy: (Math.random() - 0.5) * SPEED,

            radius: Math.random() * 2 + 1,

            color: COLORS[
                Math.floor(Math.random() * COLORS.length)
            ],

            glow: Math.random() * 4 + 2
        });
    }

    // CONNECTION STORAGE
    let edges = new Set();

    function edgeKey(a, b) {
        return a < b
            ? `${a}_${b}`
            : `${b}_${a}`;
    }

    // MOVE PARTICLES
    function updateParticles() {
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x <= 0 || p.x >= width) {
                p.vx *= -1;
                p.x = Math.max(0, Math.min(width, p.x));
            }

            if (p.y <= 0 || p.y >= height) {
                p.vy *= -1;
                p.y = Math.max(0, Math.min(height, p.y));
            }
        }
    }

    // UPDATE NETWORK
    function updateNetwork() {
        const nextEdges = new Set();

        const adjacency = Array.from(
            { length: PARTICLE_COUNT },
            () => []
        );

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const a = particles[i];

            for (let j = i + 1; j < PARTICLE_COUNT; j++) {
                const b = particles[j];

                const dx = a.x - b.x;
                const dy = a.y - b.y;

                const distanceSquared = dx * dx + dy * dy;

                const key = edgeKey(i, j);

                const limit = edges.has(key)
                    ? KEEP_DISTANCE
                    : CONNECT_DISTANCE;

                if (distanceSquared < limit * limit) {
                    nextEdges.add(key);

                    adjacency[i].push(j);
                    adjacency[j].push(i);
                }
            }
        }

        edges = nextEdges;

        return adjacency;
    }

    // DRAW TRANSPARENT TRIANGLES
    function drawTriangles(adjacency) {

        for (let i = 0; i < PARTICLE_COUNT; i++) {

            const p1 = particles[i];

            // Find closest neighbors
            const neighbors = adjacency[i]
                .map(index => {
                    const p = particles[index];

                    const dx = p.x - p1.x;
                    const dy = p.y - p1.y;

                    return {
                        index,
                        distance: dx * dx + dy * dy
                    };
                })
                .sort((a, b) => a.distance - b.distance)
                .slice(0, MAX_NEIGHBORS)
                .map(item => item.index);

            let triangleCount = 0;

            for (let a = 0; a < neighbors.length; a++) {

                const j = neighbors[a];

                if (j <= i) continue;

                for (let b = a + 1; b < neighbors.length; b++) {

                    const k = neighbors[b];

                    if (k <= j) continue;

                    if (!edges.has(edgeKey(j, k))) {
                        continue;
                    }

                    const p2 = particles[j];
                    const p3 = particles[k];

                    // Calculate triangle area
                    const area = Math.abs(
                        (p2.x - p1.x) * (p3.y - p1.y) -
                        (p3.x - p1.x) * (p2.y - p1.y)
                    ) / 2;

                    // Avoid oversized triangles
                    if (area > 4000) continue;

                    ctx.beginPath();

                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.lineTo(p3.x, p3.y);

                    ctx.closePath();

                    // Subtle purple gradient
                    const gradient = ctx.createLinearGradient(
                        p1.x,
                        p1.y,
                        p3.x,
                        p3.y
                    );

                    gradient.addColorStop(
                        0,
                        "rgba(192, 38, 211, 0.045)"
                    );

                    gradient.addColorStop(
                        1,
                        "rgba(168, 85, 247, 0.008)"
                    );

                    ctx.fillStyle = gradient;
                    ctx.fill();

                    triangleCount++;

                    if (triangleCount >= MAX_TRIANGLES) {
                        break;
                    }
                }

                if (triangleCount >= MAX_TRIANGLES) {
                    break;
                }
            }
        }
    }

    // DRAW CONNECTION LINES
    function drawLines() {

        ctx.beginPath();

        for (const key of edges) {

            const [i, j] = key.split("_").map(Number);

            const a = particles[i];
            const b = particles[j];

            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
        }

        ctx.strokeStyle = "rgba(192, 90, 255, 0.32)";
        ctx.lineWidth = 0.7;

        ctx.stroke();
    }

    // DRAW PARTICLES
    function drawParticles() {

        for (const p of particles) {

            ctx.save();

            ctx.shadowBlur = p.glow;
            ctx.shadowColor = p.color;

            ctx.beginPath();

            ctx.arc(
                p.x,
                p.y,
                p.radius,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.9;

            ctx.fill();

            ctx.restore();
        }
    }

    // EXTRA LIGHT POINTS
    function drawHighlights() {

        for (let i = 0; i < PARTICLE_COUNT; i += 17) {

            const p = particles[i];

            ctx.save();

            ctx.shadowBlur = 12;
            ctx.shadowColor = "#e879f9";

            ctx.beginPath();

            ctx.arc(
                p.x,
                p.y,
                p.radius + 0.8,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = "#f0abfc";
            ctx.globalAlpha = 0.85;

            ctx.fill();

            ctx.restore();
        }
    }

    // ANIMATION LOOP
    let animationId = null;

    function animate() {

        ctx.clearRect(0, 0, width, height);

        updateParticles();

        const adjacency = updateNetwork();

        drawTriangles(adjacency);
        drawLines();
        drawParticles();
        drawHighlights();

        animationId = requestAnimationFrame(animate);
    }

    // START
    animate();

    // CLEANUP IF NEEDED
    window.addEventListener("pagehide", function () {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
        }
    });

});
