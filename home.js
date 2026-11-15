/* NUMORA homepage: looping demo round in the preview card.
   The questions below are SAMPLES. Replace them with your real game style. */
(function () {
    var rounds = [
        { q: '7 × 8 − 6', a: '50' },
        { q: '144 ÷ 12 + 9', a: '21' },
        { q: '19 + 23 × 2', a: '65' }
    ];

    var el = {
        round: document.getElementById('gpRound'),
        q: document.getElementById('gpQ'),
        a: document.getElementById('gpA'),
        box: document.getElementById('gpBox'),
        bar: document.getElementById('gpBar'),
        toast: document.getElementById('gpToast'),
        me: document.getElementById('gpMe'),
        meBar: document.getElementById('gpMeBar')
    };
    if (!el.q) return;

    var score = 840, i = 0;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setScore() {
        el.me.textContent = score;
        el.meBar.style.width = Math.min(100, score / 12) + '%';
    }

    function show(r, typed) {
        el.q.textContent = r.q;
        el.a.textContent = typed ? r.a : '';
        el.box.classList.toggle('ok', !!typed);
    }

    if (reduce) { show(rounds[0], true); return; }

    function play() {
        var r = rounds[i % rounds.length];
        if (i % rounds.length === 0) { score = 840; setScore(); }
        el.round.textContent = (i % rounds.length) + 3;
        show(r, false);

        el.bar.classList.remove('run');
        void el.bar.offsetWidth;
        el.bar.classList.add('run');

        var n = 0;
        setTimeout(function type() {
            if (n < r.a.length) {
                el.a.textContent = r.a.slice(0, ++n);
                setTimeout(type, 260);
            } else {
                el.box.classList.add('ok');
                el.toast.classList.remove('show');
                void el.toast.offsetWidth;
                el.toast.classList.add('show');
                score += 120;
                setScore();
                i++;
                setTimeout(play, 2200);
            }
        }, 1100);
    }

    setScore();
    play();
})();
