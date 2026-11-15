/* NUMORA lobby: spotlight hover, greeting name, random tip.
   Does not replace script.js (logout, startRandomMatch, admin card still live there). */
(function () {
    // Cursor spotlight on cards
    document.querySelectorAll('.mode-card, .tile').forEach(function (card) {
        card.addEventListener('pointermove', function (e) {
            var r = card.getBoundingClientRect();
            card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
            card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
    });

    // Greeting: copy the username that script.js puts in the navbar
    var nav = document.getElementById('nav-username');
    var greet = document.getElementById('greetName');
    function sync() {
        var name = nav && nav.textContent.trim();
        if (name && name !== 'User' && greet) greet.textContent = name;
    }
    if (nav) {
        sync();
        new MutationObserver(sync).observe(nav, { childList: true, characterData: true, subtree: true });
    }

    // Random tip
    var tips = [
        'Read the whole question before you start typing.',
        'Warm up against a bot before you challenge your friends.',
        'Private rooms are the easiest way to play with people you know.',
        'Check How to Play for the details on scoring.',
        'Got an idea or found a bug? Tell us in NUMORA Voice.'
    ];
    var tip = document.getElementById('tipText');
    if (tip) tip.textContent = tips[Math.floor(Math.random() * tips.length)];
})();
