
document.addEventListener("DOMContentLoaded", function () {
    // Canvas setup
    const canvas = document.createElement("canvas");
    canvas.id = "particles-canvas";
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d");

    let width, height;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener("resize", resize);

    // CONFIGURATION
    const PARTICLE_COUNT = 10;
    const CONNECT_DISTANCE = 125;
    const KEEP_DISTANCE = 145;
    const SPEED = 1;

    const COLORS = [
        "#a855f7",
        "#c026d3",
        "#d946ef",
        "#e879f9",
        "#9333ea"
    ];

    const particles = [];
    let edges = new Set();

    // Create particles
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

            glow: Math.random() * 5 + 3
        });
    }

    // Edge key
    function edgeKey(a, b) {
        return a < b ? `${a}_${b}` : `${b}_${a}`;
    }

    // Update particle positions
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

    // Dynamic connections with persistence
    function updateNetwork() {
        const nextEdges = new Set();
        const adjacency = Array.from(
            { length: particles.length },
            () => []
        );

        for (let i = 0; i < particles.length; i++) {
            const a = particles[i];

            for (let j = i + 1; j < particles.length; j++) {
                const b = particles[j];

                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const key = edgeKey(i, j);

                const limit = edges.has(key)
                    ? KEEP_DISTANCE
                    : CONNECT_DISTANCE;

                if (distance < limit) {
                    nextEdges.add(key);

                    adjacency[i].push(j);
                    adjacency[j].push(i);
                }
            }
        }

        edges = nextEdges;

        return adjacency;
    }

    // Draw translucent geometric triangles
    function drawTriangles(adjacency) {
        for (let i = 0; i < particles.length; i++) {
            const neighbors = adjacency[i];

            for (let a = 0; a < neighbors.length; a++) {
                const j = neighbors[a];

                if (j <= i) continue;

                for (let b = a + 1; b < neighbors.length; b++) {
                    const k = neighbors[b];

                    if (k <= j) continue;

                    if (!edges.has(edgeKey(j, k))) continue;

                    const p1 = particles[i];
                    const p2 = particles[j];
                    const p3 = particles[k];

                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.lineTo(p3.x, p3.y);
                    ctx.closePath();

                    const gradient = ctx.createLinearGradient(
                        p1.x, p1.y,
                        p3.x, p3.y
                    );

                    gradient.addColorStop(
                        0, "rgba(192, 38, 211, 0.10)"
                    );

                    gradient.addColorStop(
                        1, "rgba(168, 85, 247, 0.025)"
                    );

                    ctx.fillStyle = gradient;
                    ctx.fill();
                }
            }
        }
    }

    // Draw network lines
    function drawLines() {
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = "rgba(192, 90, 255, 0.38)";

        ctx.beginPath();

        for (const key of edges) {
            const [i, j] = key.split("_").map(Number);

            const a = particles[i];
            const b = particles[j];

            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
        }

        ctx.stroke();
    }

    // Draw glowing particles
    function drawParticles() {
        for (const p of particles) {
            ctx.save();

            ctx.shadowBlur = p.glow + 5;
            ctx.shadowColor = p.color;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.9;
            ctx.fill();

            ctx.restore();
        }
    }

    // Extra neon highlights
    function drawHighlights() {
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            if (i % 17 !== 0) continue;

            ctx.save();

            ctx.shadowBlur = 15;
            ctx.shadowColor = "#e879f9";

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius + 1, 0, Math.PI * 2);

            ctx.fillStyle = "#f0abfc";
            ctx.globalAlpha = 0.85;
            ctx.fill();

            ctx.restore();
        }
    }

    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, width, height);

        updateParticles();

        const adjacency = updateNetwork();

        drawTriangles(adjacency);
        drawLines();
        drawParticles();
        drawHighlights();

        requestAnimationFrame(animate);
    }

    animate();
});
