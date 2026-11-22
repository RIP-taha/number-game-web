
document.addEventListener("DOMContentLoaded", function () {
    // ==============================
    // NUMORA - Animated Network
    // ==============================

    const canvas = document.createElement("canvas");
    canvas.id = "particles-canvas";
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d", { alpha: true });

    // Network settings
    const PARTICLE_COUNT = 180;
    const CONNECT_DISTANCE = 125;
    const KEEP_DISTANCE = 145;
    const SPEED = 0.9;
    const MAX_NEIGHBORS = 5;
    const MAX_TRIANGLES = 4;

    // Energy light settings
    const ENERGY_SPEED = 85; // pixels per second
    const ENERGY_COLOR = "#a59a76";
    const ENERGY_GLOW = "#85804b";
    const ENERGY_TAIL_LENGTH = 28;

    const COLORS = [
        "#a855f7",
        "#c026d3",
        "#d946ef",
        "#e879f9",
        "#9333ea"
    ];

    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;

        dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);

        canvas.style.width = width + "px";
        canvas.style.height = height + "px";

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    // ==============================
    // Create particles
    // ==============================

    const particles = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,

            vx: (Math.random() - 0.5) * SPEED,
            vy: (Math.random() - 0.5) * SPEED,

            radius: Math.random() * 2 + 1,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            glow: Math.random() * 4 + 2
        });
    }

    // ==============================
    // Energy light
    // ==============================

    const energyLight = {
        from: null,
        to: null,
        progress: 0,
        speed: ENERGY_SPEED,
        active: false
    };

    function edgeKey(a, b) {
        return a < b ? `${a}_${b}` : `${b}_${a}`;
    }

    function randomItem(array) {
        if (!array || array.length === 0) return null;

        return array[Math.floor(Math.random() * array.length)];
    }

    function startEnergyLight(adjacency) {
        // If the light has no starting point,
        // select one real connection from the network.

        if (energyLight.from === null) {
            const availableEdges = Array.from(edges);

            const selectedEdge = randomItem(availableEdges);

            if (!selectedEdge) return;

            const [a, b] = selectedEdge.split("_").map(Number);

            energyLight.from = a;
            energyLight.to = b;
            energyLight.progress = 0;
            energyLight.active = true;

            return;
        }

        // If the previous connection disappeared,
        // continue from the closest endpoint.

        const neighbors = adjacency[energyLight.from] || [];

        if (neighbors.length > 0) {
            const next = randomItem(neighbors);

            energyLight.to = next;
            energyLight.progress = 0;
            energyLight.active = true;
        }
    }

    function updateEnergyLight(deltaTime, adjacency) {
        if (!energyLight.active) {
            startEnergyLight(adjacency);
            return;
        }

        const from = energyLight.from;
        const to = energyLight.to;

        if (from === null || to === null) {
            energyLight.active = false;
            return;
        }

        const key = edgeKey(from, to);

        // Never move through a connection
        // that is no longer part of the network.

        if (!edges.has(key)) {
            const anchor =
                energyLight.progress < 0.5 ? from : to;

            energyLight.from = anchor;
            energyLight.to = null;
            energyLight.progress = 0;
            energyLight.active = false;

            return;
        }

        const a = particles[from];
        const b = particles[to];

        const dx = b.x - a.x;
        const dy = b.y - a.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 1) return;

        // Move at a consistent speed.

        energyLight.progress +=
            (energyLight.speed * deltaTime) / distance;

        // Reached the next junction.

        if (energyLight.progress >= 1) {
            const previousNode = from;
            const currentNode = to;

            const neighbors = adjacency[currentNode] || [];

            // Prefer a different connection.
            // If there isn't one, reverse direction.

            let options = neighbors.filter(
                index => index !== previousNode
            );

            if (options.length === 0) {
                options = neighbors.filter(
                    index => index === previousNode
                );
            }

            const nextNode = randomItem(options);

            energyLight.from = currentNode;
            energyLight.progress = 0;

            if (nextNode === null) {
                energyLight.to = null;
                energyLight.active = false;
            } else {
                energyLight.to = nextNode;
                energyLight.active = true;
            }
        }
    }

    // ==============================
    // Update particle positions
    // ==============================

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

    // ==============================
    // Build network connections
    // ==============================

    let edges = new Set();

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

    // ==============================
    // Draw geometric triangles
    // ==============================

    function drawTriangles(adjacency) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const p1 = particles[i];

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

                    if (!edges.has(edgeKey(j, k))) continue;

                    const p2 = particles[j];
                    const p3 = particles[k];

                    const area = Math.abs(
                        (p2.x - p1.x) * (p3.y - p1.y) -
                        (p3.x - p1.x) * (p2.y - p1.y)
                    ) / 2;

                    if (area > 4000) continue;

                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.lineTo(p3.x, p3.y);
                    ctx.closePath();

                    const gradient = ctx.createLinearGradient(
                        p1.x, p1.y, p3.x, p3.y
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

                    if (triangleCount >= MAX_TRIANGLES) break;
                }

                if (triangleCount >= MAX_TRIANGLES) break;
            }
        }
    }

    // ==============================
    // Draw network lines
    // ==============================

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

    // ==============================
    // Draw the moving energy light
    // ==============================

    function drawEnergyLight() {
        if (!energyLight.active) return;

        const a = particles[energyLight.from];
        const b = particles[energyLight.to];

        if (!a || !b) return;

        const progress = Math.max(
            0,
            Math.min(1, energyLight.progress)
        );

        // Position on the actual network line.

        const x = a.x + (b.x - a.x) * progress;
        const y = a.y + (b.y - a.y) * progress;

        const dx = b.x - a.x;
        const dy = b.y - a.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 1) return;

        // Tail remains on the same real connection.

        const tailProgress = Math.max(
            0,
            progress - ENERGY_TAIL_LENGTH / distance
        );

        const tailX = a.x + dx * tailProgress;
        const tailY = a.y + dy * tailProgress;

        ctx.save();

        // Outer energy trail.

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(x, y);

        ctx.lineCap = "round";
        ctx.lineWidth = 3.5;

        ctx.strokeStyle = "rgba(133, 128, 75, 0.55)";
        ctx.shadowBlur = 18;
        ctx.shadowColor = ENERGY_GLOW;

        ctx.stroke();

        // Inner luminous trail.

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(x, y);

        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(190, 180, 125, 0.9)";
        ctx.shadowBlur = 8;

        ctx.stroke();

        // Energy core glow.

        const glow = ctx.createRadialGradient(
            x, y, 0,
            x, y, 11
        );

        glow.addColorStop(
            0,
            "rgba(235, 225, 170, 0.95)"
        );

        glow.addColorStop(
            0.25,
            "rgba(165, 154, 118, 0.75)"
        );

        glow.addColorStop(
            1,
            "rgba(133, 128, 75, 0)"
        );

        ctx.beginPath();
        ctx.arc(x, y, 11, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Bright center.

        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);

        ctx.fillStyle = "#eee6bd";
        ctx.shadowBlur = 15;
        ctx.shadowColor = ENERGY_COLOR;

        ctx.fill();

        ctx.restore();
    }

    // ==============================
    // Draw particles
    // ==============================

    function drawParticles() {
        for (const p of particles) {
            ctx.save();

            ctx.shadowBlur = p.glow;
            ctx.shadowColor = p.color;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.9;

            ctx.fill();

            ctx.restore();
        }
    }

    // ==============================
    // Extra particle highlights
    // ==============================

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

    // ==============================
    // Main animation loop
    // ==============================

    let animationId = null;
    let lastTime = 0;

    function animate(timestamp) {
        const deltaTime = lastTime
            ? Math.min((timestamp - lastTime) / 1000, 0.05)
            : 0;

        lastTime = timestamp;

        ctx.clearRect(0, 0, width, height);

        updateParticles();

        const adjacency = updateNetwork();

        updateEnergyLight(deltaTime, adjacency);

        drawTriangles(adjacency);
        drawLines();
        drawEnergyLight();
        drawParticles();
        drawHighlights();

        animationId = requestAnimationFrame(animate);
    }

    animate();

    // ==============================
    // Cleanup
    // ==============================

    window.addEventListener("pagehide", function () {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
        }
    });
});
