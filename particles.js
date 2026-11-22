
document.addEventListener("DOMContentLoaded", function () {
    // =====================================
    // NUMORA - Living Energy Network + Virus Glow
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

    // Virus look (olive leaning purple) - tweak these freely
    const VIRUS_RGB = "176, 140, 198";       // main glow: olive-lavender
    const VIRUS_CORE_RGB = "214, 200, 160";  // bright core: pale olive
    const VIRUS_COLOR = "#b08cc6";
    const VIRUS_CORE_COLOR = "#d6c8a0";

    // Infection (how the virus colors the network around it)
    const INFECT_RADIUS = 115;   // how far ahead/around the head it infects
    const INFECT_DECAY = 1.6;    // higher = network returns to normal faster
    const PULSE_LIFE = 0.9;      // seconds
    const PULSE_SPEED = 150;     // px per second
    const MAX_PULSES = 24;

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
                    : CONNECT_DISTANCE;if (distanceSquared < limit * limit) {
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
    // Energy spreading system (the virus head)
    // =====================================

    const energyWaves = [];
    const pulses = [];

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

    function addPulse(x, y, intensity) {
        if (pulses.length >= MAX_PULSES) pulses.shift();
        pulses.push({ x, y, age: 0, intensity });
    }

    function startEnergy() {
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
        startEnergy();

        for (let i = energyWaves.length - 1; i >= 0; i--) {
            const wave = energyWaves[i];

            wave.age += deltaTime;

            const from = wave.from;
            const to = wave.to;

            if (from === null || to === null) {
                energyWaves.splice(i, 1);
                continue;
            }

            // The wave can only travel on existing connections.
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

            wave.progress += (ENERGY_SPEED * deltaTime) / distance;

            // Reached a junction.
            if (wave.progress >= 1) {
                const previousNode = from;
                const currentNode = to;

                // Ring pulse where the virus lands on a node.
                addPulse(b.x, b.y, wave.intensity);

                const neighbors = adjacency[currentNode] || [];

                const options = neighbors.filter(
                    node => node !== previousNode
                );

                energyWaves.splice(i, 1);

                if (options.length === 0) {
                    continue;
                }

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

        // If all branches die out, a new infection starts.
        if (energyWaves.length === 0) {
            energyStarted = false;
        }
    }// =====================================
    // Infection: the virus tints the network around it,
    // then everything fades back to normal.
    // =====================================

    const nodeInfection = new Float32Array(PARTICLE_COUNT);
    const edgeInfection = new Map();

    function pointSegmentDistance(px, py, ax, ay, bx, by) {
        const abx = bx - ax;
        const aby = by - ay;
        const lengthSquared = abx * abx + aby * aby;

        let t = 0;

        if (lengthSquared > 0) {
            t = ((px - ax) * abx + (py - ay) * aby) / lengthSquared;
            t = Math.max(0, Math.min(1, t));
        }

        const cx = ax + abx * t;
        const cy = ay + aby * t;

        const dx = px - cx;
        const dy = py - cy;

        return Math.sqrt(dx * dx + dy * dy);
    }

    function updateInfection(deltaTime, adjacency) {
        // 1) Fade everything back toward normal.
        const decay = Math.exp(-INFECT_DECAY * deltaTime);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            nodeInfection[i] *= decay;
        }

        for (const [key, value] of edgeInfection) {
            const next = value * decay;

            if (next < 0.01 || !edges.has(key)) {
                edgeInfection.delete(key);
            } else {
                edgeInfection.set(key, next);
            }
        }

        // 2) Every virus head infects what is around it.
        for (const wave of energyWaves) {
            const a = particles[wave.from];
            const b = particles[wave.to];

            if (!a || !b) continue;

            const progress = Math.max(0, Math.min(1, wave.progress));

            const hx = a.x + (b.x - a.x) * progress;
            const hy = a.y + (b.y - a.y) * progress;

            const strength = Math.max(0.35, wave.intensity);

            // Nodes near the head.
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const p = particles[i];

                const dx = p.x - hx;
                const dy = p.y - hy;

                const distanceSquared = dx * dx + dy * dy;

                if (distanceSquared > INFECT_RADIUS * INFECT_RADIUS) continue;

                const falloff = 1 - Math.sqrt(distanceSquared) / INFECT_RADIUS;
                const value = Math.pow(falloff, 1.6) * strength;

                if (value > nodeInfection[i]) {
                    nodeInfection[i] = value;
                }
            }

            // Connections near the head.
            const ownKey = edgeKey(wave.from, wave.to);

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const neighbors = adjacency[i];

                for (let n = 0; n < neighbors.length; n++) {
                    const j = neighbors[n];

                    if (j <= i) continue;

                    const key = edgeKey(i, j);

                    let value;

                    if (key === ownKey) {
                        // The edge the virus is crossing right now
                        // lights up gradually as the head advances.
                        value = (0.35 + 0.65 * progress) * strength;
                    } else {
                        const p1 = particles[i];
                        const p2 = particles[j];

                        const d = pointSegmentDistance(
                            hx, hy,
                            p1.x, p1.y,
                            p2.x, p2.y
                        );

                        if (d > INFECT_RADIUS) continue;

                        const falloff = 1 - d / INFECT_RADIUS;
                        value = Math.pow(falloff, 1.5) * strength;
                    }

                    const current = edgeInfection.get(key) || 0;

                    if (value > current) {
                        edgeInfection.set(key, value);
                    }
                }
            }
        }

        // 3) Expand ring pulses.
        for (let i = pulses.length - 1; i >= 0; i--) {
            pulses[i].age += deltaTime;
            if (pulses[i].age >= PULSE_LIFE) {
                pulses.splice(i, 1);
            }
        }
    }

    // =====================================
    // Draw: virus head
    // =====================================

    function drawEnergyGlow(wave) {
        const a = particles[wave.from];
        const b = particles[wave.to];

        if (!a || !b) return;

        const progress = Math.max(0, Math.min(1, wave.progress));

        const x = a.x + (b.x - a.x) * progress;
        const y = a.y + (b.y - a.y) * progress;

        const dx = b.x - a.x;
        const dy = b.y - a.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 1) return;

        const intensity = Math.max(0.25, wave.intensity);

        // Luminous trail behind the head.
        const tailProgress = Math.max(
            0,
            progress - ENERGY_TAIL / distance
        );

        const tailX = a.x + dx * tailProgress;
        const tailY = a.y + dy * tailProgress;

        ctx.save();

        ctx.globalAlpha = intensity;

        // Large soft halo.
        const radius = ENERGY_RADIUS * (0.85 + intensity * 0.25);

        const halo = ctx.createRadialGradient(x, y, 0, x, y, radius);

        halo.addColorStop(0, `rgba(${VIRUS_RGB}, 0.30)`);
        halo.addColorStop(0.25, `rgba(${VIRUS_RGB}, 0.20)`);
        halo.addColorStop(0.6, `rgba(${VIRUS_RGB}, 0.08)`);
        halo.addColorStop(1, `rgba(${VIRUS_RGB}, 0)`);

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        // Wide blurred trail along the real line.
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(x, y);

        ctx.lineCap = "round";
        ctx.lineWidth = 19;

        ctx.strokeStyle = `rgba(${VIRUS_RGB}, 0.12)`;
        ctx.shadowBlur = 28;
        ctx.shadowColor = VIRUS_COLOR;

        ctx.stroke();

        // Inner glow.
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(x, y);

        ctx.lineWidth = 8;
        ctx.strokeStyle = `rgba(${VIRUS_RGB}, 0.26)`;
        ctx.shadowBlur = 17;
        ctx.shadowColor = VIRUS_COLOR;

        ctx.stroke();

        // Bright pale-olive center.
        const centerGlow = ctx.createRadialGradient(x, y, 0, x, y, 14);

        centerGlow.addColorStop(0, `rgba(${VIRUS_CORE_RGB}, 0.42)`);
        centerGlow.addColorStop(0.5, `rgba(${VIRUS_RGB}, 0.20)`);
        centerGlow.addColorStop(1, `rgba(${VIRUS_RGB}, 0)`);

        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);

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
    // Draw: infected connections, nodes, pulses
    // =====================================

    function drawInfectedEdges() {
        ctx.save();
        ctx.lineCap = "round";

        for (const [key, value] of edgeInfection) {
            const t = Math.min(1, value);

            if (t < 0.02) continue;

            const [i, j] = key.split("_").map(Number);

            const a = particles[i];
            const b = particles[j];

            // Soft wide aura.
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineWidth = 5 + 5 * t;
            ctx.strokeStyle = `rgba(${VIRUS_RGB}, ${0.10 * t})`;
            ctx.stroke();

            // Colored core line.
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineWidth = 0.9 + 1.2 * t;
            ctx.strokeStyle = `rgba(${VIRUS_RGB}, ${0.25 + 0.6 * t})`;
            ctx.stroke();
            // Hot center of the line when strongly infected.
            if (t > 0.5) {
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.lineWidth = 0.6;
                ctx.strokeStyle = `rgba(${VIRUS_CORE_RGB}, ${(t - 0.5) * 1.1})`;
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    function drawInfectedParticles() {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const t = Math.min(1, nodeInfection[i]);

            if (t < 0.03) continue;

            const p = particles[i];

            ctx.save();

            ctx.shadowBlur = 8 + 18 * t;
            ctx.shadowColor = VIRUS_COLOR;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius + 2.4 * t, 0, Math.PI * 2);

            ctx.fillStyle = t > 0.6 ? VIRUS_CORE_COLOR : VIRUS_COLOR;
            ctx.globalAlpha = 0.35 + 0.6 * t;

            ctx.fill();

            ctx.restore();
        }
    }

    function drawPulses() {
        ctx.save();

        for (const pulse of pulses) {
            const life = pulse.age / PULSE_LIFE;
            const radius = 4 + pulse.age * PULSE_SPEED;
            const alpha = Math.pow(1 - life, 2) * 0.5 * Math.max(0.4, pulse.intensity);

            ctx.beginPath();
            ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
            ctx.lineWidth = 1.6 * (1 - life) + 0.4;
            ctx.strokeStyle = `rgba(${VIRUS_RGB}, ${alpha})`;
            ctx.stroke();
        }

        ctx.restore();
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

                    gradient.addColorStop(0, "rgba(192, 38, 211, 0.045)");
                    gradient.addColorStop(1, "rgba(168, 85, 247, 0.008)");

                    ctx.fillStyle = gradient;
                    ctx.fill();

                    // Infected triangles glow in the virus color.
                    const infection =
                        (nodeInfection[i] + nodeInfection[j] + nodeInfection[k]) / 3;

                    if (infection > 0.04) {
                        ctx.fillStyle = `rgba(${VIRUS_RGB}, ${Math.min(1, infection) * 0.17})`;
                        ctx.fill();
                    }

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
            ctx.arc(p.x, p.y, p.radius + 0.8, 0, Math.PI * 2);

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
        updateInfection(deltaTime, adjacency);

        drawTriangles(adjacency);
        drawLines();
        drawInfectedEdges();
        drawPulses();
        drawEnergy();
        drawParticles();
        drawInfectedParticles();
        drawHighlights();

        animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);

    // =====================================
    // Cleanup
    // =====================================

    window.addEventListener("pagehide", function () {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
        }
    });
});
