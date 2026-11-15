/* NUMORA game page extras: quick-pick number pad + round progress.
   Reads the page only; script.js still owns all game logic. */
(function () {
    var input = document.getElementById('number-input');
    var pad = document.getElementById('numPad');

    if (input && pad) {
        for (var n = 1; n <= 20; n++) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'num-chip';
            b.textContent = n;
            pad.appendChild(b);
        }
        var mark = function () {
            pad.querySelectorAll('.num-chip').forEach(function (c) {
                c.classList.toggle('sel', c.textContent === input.value);
            });
            pad.classList.toggle('off', input.disabled);
        };
        pad.addEventListener('click', function (e) {
            var c = e.target.closest('.num-chip');
            if (!c || input.disabled) return;
            input.value = c.textContent;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            mark();
            input.focus();
        });
        input.addEventListener('input', mark);
        setInterval(mark, 400); // catches value/disabled changes made by script.js
        mark();
    }

    var round = document.getElementById('game-round');
    var fill = document.getElementById('roundFill');
    function progress() {
        var m = (round.textContent || '').match(/(\d+)\s*\/\s*(\d+)/);
        if (m && fill) fill.style.width = Math.min(100, (m[1] / m[2]) * 100) + '%';
    }
    if (round) {
        progress();
        new MutationObserver(progress).observe(round, { childList: true, characterData: true, subtree: true });
    }
})();
