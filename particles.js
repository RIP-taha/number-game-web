
document.addEventListener("DOMContentLoaded", function () {
    // =====================================
    // NUMORA - Living Energy Network
    // =====================================

    const canvas = document.createElement("canvas");
    canvas.id = "particles-canvas";
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d", { alpha: true });

    // Network
    const PARTICLE_COUNT = 180;
    const CONNECT_DISTANCE = 125;
    const KEEP_DISTANCE = 145;
    const SPEED = 0.9;
    const MAX_NEIGHBORS = 5;
    const MAX_TRIANGLES = 4;

    // Energy spreading
    const ENERGY_SPEED = 95;
    const MAX_WAVES = 16;
    const BRANCH_CHANCE = 0.75;
    const MAX_BRANCHES = 2;
    const ENERGY_RADIUS = 42;
    const ENERGY_TAIL = 0.24;

    // Olive energy colors
    const ENERGY_COLOR = "#a49b65";
    const ENERGY_LIGHT = "#c3b987";
    const ENERGY_DARK = "#747345";

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

    // =====================================
    // Particles
    // =====================================

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

    // =====================================
    // Network
    // =====================================

    let edges = new Set();

    function edgeKey(a, b) {
        return a < b ? `${a}_${b}` : `${b}_${a}`;
    }

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

    // =====================================
    // Energy spreading system
    // =====================================

    // One original energy source.
    // It can create branches when it reaches junctions.

    const energyWaves = [];

    let energyStarted = false;

    function createWave(from, to, intensity = 1) {
        if (energyWaves.length >= MAX_WAVES) return;

        energyWaves.push({
            from,
            to,
            progress: 0,
            intensity,
            age: 0
        });
    }

    function startEnergy(adjacency) {
        if (energyStarted) return;

        const availableEdges = Array.from(edges);

        if (availableEdges.length === 0) return;

        const selected = availableEdges[
            Math.floor(Math.random() * availableEdges.length)
        ];

        const [from, to] = selected.split("_").map(Number);

        createWave(from, to, 1);

        energyStarted = true;
    }

    function updateEnergy(deltaTime, adjacency) {
        startEnergy(adjacency);

        for (let i = energyWaves.length - 1; i >= 0; i--) {
            const wave = energyWaves[i];

            wave.age += deltaTime;

            const from = wave.from;
            const to = wave.to;

            if (from === null || to === null) {
                energyWaves.splice(i, 1);
                continue;
            }

            // The wave can only use existing network connections.

            if (!edges.has(edgeKey(from, to))) {
                energyWaves.splice(i, 1);
                continue;
            }

            const a = particles[from];
            const b = particles[to];

            const dx = b.x - a.x;
            const dy = b.y - a.y;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 1) continue;

            wave.progress +=
                (ENERGY_SPEED * deltaTime) / distance;

            // Reached a junction.
            if (wave.progress >= 1) {
                const previousNode = from;
                const currentNode = to;

                const neighbors = adjacency[currentNode] || [];

                // Only connected paths are possible.
                const options = neighbors.filter(
                    node => node !== previousNode
                );

                // Remove the current wave.
                energyWaves.splice(i, 1);

                if (options.length === 0) {
                    continue;
                }

                // Sometimes spread into multiple paths.
                // This creates the spreading / infection effect.

                const canBranch =
                    Math.random() < BRANCH_CHANCE &&
                    options.length > 1;

                let selectedOptions = [];

                if (canBranch) {
                    const shuffled = [...options].sort(
                        () => Math.random() - 0.5
                    );

                    selectedOptions = shuffled.slice(
                        0,
                        Math.min(MAX_BRANCHES, shuffled.length)
                    );
                } else {
                    selectedOptions = [
                        options[Math.floor(Math.random() * options.length)]
                    ];
                }

                for (const nextNode of selectedOptions) {
                    if (energyWaves.length >= MAX_WAVES) break;

                    createWave(
                        currentNode,
                        nextNode,
                        wave.intensity * 0.88
                    );
                }
            }
        }

        // If all branches disappear, start a new wave.
        if (energyWaves.length === 0) {
            energyStarted = false;
        }
    }

    // =====================================
    // Draw energy glow
    // =====================================

    function drawEnergyGlow(wave) {
        const a = particles[wave.from];
        const b = particles[wave.to];

        if (!a || !b) return;

        const progress = Math.max(
            0,
            Math.min(1, wave.progress)
        );

        const x = a.x + (b.x - a.x) * progress;
        const y = a.y + (b.y - a.y) * progress;

        const dx = b.x - a.x;
        const dy = b.y - a.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 1) return;

        const intensity = Math.max(0.25, wave.intensity);

        // Length of the luminous trail.
        const tailProgress = Math.max(
            0,
            progress - ENERGY_TAIL / distance
        );

        const tailX = a.x + dx * tailProgress;
        const tailY = a.y + dy * tailProgress;

        ctx.save();

        ctx.globalAlpha = intensity;

        // Large diffuse halo around the energy.
        // This is intentionally soft, not a small glowing dot.

        const radius = ENERGY_RADIUS * (0.85 + intensity * 0.25);

        const halo = ctx.createRadialGradient(
            x, y, 0,
            x, y, radius
        );

        halo.addColorStop(
            0,
            "rgba(195, 185, 135, 0.28)"
        );

        halo.addColorStop(
            0.22,
            "rgba(164, 155, 101, 0.20)"
        );

        halo.addColorStop(
            0.55,
            "rgba(133, 128, 75, 0.10)"
        );

        halo.addColorStop(
            1,
            "rgba(116, 115, 69, 0)"
        );

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        // Wide blurred energy trail along the actual line.

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(x, y);

        ctx.lineCap = "round";
        ctx.lineWidth = 19;

        ctx.strokeStyle = "rgba(133, 128, 75, 0.12)";
        ctx.shadowBlur = 28;
        ctx.shadowColor = ENERGY_DARK;

        ctx.stroke();

        // Soft inner glow.

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(x, y);

        ctx.lineWidth = 8;
        ctx.strokeStyle = "rgba(164, 155, 101, 0.22)";
        ctx.shadowBlur = 17;
        ctx.shadowColor = ENERGY_COLOR;

        ctx.stroke();

        // Very subtle bright center.
        // No visible hard particle.

        const centerGlow = ctx.createRadialGradient(
            x, y, 0,
            x, y, 13
        );

        centerGlow.addColorStop(
            0,
            "rgba(220, 211, 164, 0.30)"
        );

        centerGlow.addColorStop(
            0.5,
            "rgba(164, 155, 101, 0.18)"
        );

        centerGlow.addColorStop(
            1,
            "rgba(133, 128, 75, 0)"
        );

        ctx.beginPath();
        ctx.arc(x, y, 13, 0, Math.PI * 2);

        ctx.fillStyle = centerGlow;
        ctx.fill();

        ctx.restore();
    }

    function drawEnergy() {
        for (const wave of energyWaves) {
            drawEnergyGlow(wave);
        }
    }

    // =====================================
    // Triangles
    // =====================================

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

    // =====================================
    // Network lines
    // =====================================

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

    // =====================================
    // Particles
    // =====================================

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

    // =====================================
    // Animation loop
    // =====================================

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

        updateEnergy(deltaTime, adjacency);

        drawTriangles(adjacency);
        drawLines();
        drawEnergy();
        drawParticles();
        drawHighlights();

        animationId = requestAnimationFrame(animate);
    }

    animate();

    // =====================================
    // Cleanup
    // =====================================

    window.addEventListener("pagehide", function () {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
        }
    });
});
