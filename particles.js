
document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.createElement("canvas");
    canvas.id = "particles-canvas";
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d");

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener("resize", function () {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    // CONFIGURATION
    const particleCount = 300;

    const colors = [
        "#00d9ff",
        "#ff006e",
        "#ffd700"
    ];

    const particles = [];

    // CREATE PARTICLES
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,

            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,

            radius: Math.random() * 2 + 1,

            color: colors[
                Math.floor(Math.random() * colors.length)
            ],

            links: []
        });
    }

    // FIND A NEW NEIGHBOR
    function findTarget(source, current, excluded) {
        const candidates = [];

        const p = particles[source];

        for (let i = 0; i < particles.length; i++) {
            if (
                i === source ||
                i === current ||
                i === excluded
            ) continue;

            const other = particles[i];

            const dx = p.x - other.x;
            const dy = p.y - other.y;

            candidates.push({
                index: i,
                distance: dx * dx + dy * dy
            });
        }

        candidates.sort((a, b) =>
            a.distance - b.distance
        );

        const pool = candidates.slice(
            0,
            Math.min(12, candidates.length)
        );

        if (!pool.length) return current;

        return pool[
            Math.floor(Math.random() * pool.length)
        ].index;
    }

    // CREATE PERSISTENT CONNECTIONS
    for (let i = 0; i < particles.length; i++) {
        const first = findTarget(i, -1, -1);

        const second = findTarget(i, -1, first);

        particles[i].links = [
            {
                target: first,
                from: first,
                to: first,
                progress: 1,
                transitioning: false,
                nextChange: Math.random() * 2
            },
            {
                target: second,
                from: second,
                to: second,
                progress: 1,
                transitioning: false,
                nextChange: Math.random() * 3
            }
        ];
    }

    // START CONNECTION TRANSITION
    function startTransition(link, source, otherTarget) {
        const next = findTarget(
            source,
            link.target,
            otherTarget
        );

        if (next === link.target) return;

        link.from = link.target;
        link.to = next;

        link.progress = 0;
        link.transitioning = true;
    }

    // UPDATE CONNECTIONS
    function updateConnections(delta, elapsed) {
        for (let i = 0; i < particles.length; i++) {
            const links = particles[i].links;

            for (let j = 0; j < links.length; j++) {
                const link = links[j];

                const otherTarget =
                    links[1 - j].target;

                if (!link.transitioning) {
                    if (elapsed >= link.nextChange) {
                        startTransition(
                            link,
                            i,
                            otherTarget
                        );
                    }
                } else {
                    link.progress += delta / 1.8;

                    if (link.progress >= 1) {
                        link.progress = 1;

                        link.target = link.to;
                        link.from = link.to;

                        link.transitioning = false;

                        link.nextChange =
                            elapsed + 2.2 + Math.random() * 3;
                    }
                }
            }
        }
    }

    // DRAW THE NETWORK
    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            for (const link of p.links) {
                const oldTarget = particles[link.from];
                const newTarget = particles[link.to];

                // Smooth movement between connections
                const t = link.transitioning
                    ? link.progress * link.progress *
                      (3 - 2 * link.progress)
                    : 1;

                const targetX =
                    oldTarget.x +
                    (newTarget.x - oldTarget.x) * t;

                const targetY =
                    oldTarget.y +
                    (newTarget.y - oldTarget.y) * t;

                ctx.beginPath();

                ctx.moveTo(p.x, p.y);
                ctx.lineTo(targetX, targetY);

                // Constant line visibility
                ctx.strokeStyle = p.color;
                ctx.globalAlpha = 0.55;
                ctx.lineWidth = 0.5;

                ctx.stroke();
            }
        }
    }

    // DRAW PARTICLES
    function drawParticles() {
        for (const p of particles) {
            ctx.beginPath();

            ctx.arc(
                p.x,
                p.y,
                p.radius,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.7;

            ctx.fill();
        }
    }

    // MAIN ANIMATION
    let lastTime = 0;
    let elapsed = 0;

    function animate(timestamp) {
        const delta = lastTime
            ? Math.min((timestamp - lastTime) / 1000, 0.05)
            : 0;

        lastTime = timestamp;
        elapsed += delta;

        ctx.clearRect(0, 0, width, height);

        // Move particles
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > width) {
                p.vx *= -1;
            }

            if (p.y < 0 || p.y > height) {
                p.vy *= -1;
            }
        }

        // Change network structure
        updateConnections(delta, elapsed);

        // Draw everything
        drawConnections();
        drawParticles();

        ctx.globalAlpha = 1;

        requestAnimationFrame(animate);
    }

    animate();
});
