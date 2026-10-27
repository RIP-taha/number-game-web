const API_URL = "https://number-game-api.onrender.com";
let socket;

function startGame() {
    const isLoggedIn = checkLogin();
    if (isLoggedIn) { window.location.href = "lobby.html"; } else { showModal("ورود لازم است", "برای شروع بازی باید وارد حساب کاربری خود بشوید.", "ورود / ثبت‌نام", function() { window.location.href = "login.html"; }); }
}
function checkLogin() { return localStorage.getItem("currentUser") !== null; }
function logout() { localStorage.removeItem("currentUser"); localStorage.removeItem("currentUserId"); window.location.href = "index.html"; }
function confirmExit() { showModal("خروج از بازی", "آیا مطمئنی می‌خوای از بازی خارج بشی؟", "بله، خارج شو", function() { window.location.href = "lobby.html"; }); }
function toggleRule(card) { card.classList.toggle("open"); }
function goToGame() { if (checkLogin()) { window.location.href = "lobby.html"; } else { showModal("ورود لازم است", "برای شروع بازی باید وارد حساب کاربری خود بشوید.", "ورود / ثبت‌نام", function() { window.location.href = "login.html"; }); } }

function showModal(title, message, buttonText, onConfirm) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const modal = document.createElement("div");
    modal.className = "modal";
    const h2 = document.createElement("h2");
    h2.textContent = title;
    const p = document.createElement("p");
    p.textContent = message;
    const btnContainer = document.createElement("div");
    btnContainer.className = "modal-buttons";
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "btn-primary";
    confirmBtn.textContent = buttonText;
    confirmBtn.onclick = function() { document.body.removeChild(overlay); if (onConfirm) onConfirm(); };
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn-secondary";
    cancelBtn.textContent = "بستن";
    cancelBtn.onclick = function() { document.body.removeChild(overlay); };
    btnContainer.appendChild(confirmBtn);
    btnContainer.appendChild(cancelBtn);
    modal.appendChild(h2);
    modal.appendChild(p);
    modal.appendChild(btnContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function switchTab(tab) {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const loginTab = document.getElementById("tab-login");
    const registerTab = document.getElementById("tab-register");
    const message = document.getElementById("auth-message");
    if (!loginForm) return;
    message.textContent = "";
    message.className = "auth-message";
    if (tab === "login") {
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
        loginTab.classList.add("active");
        registerTab.classList.remove("active");
    } else {
        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");
        loginTab.classList.remove("active");
        registerTab.classList.add("active");
    }
}
function showAuthMessage(text, type) { const message = document.getElementById("auth-message"); message.textContent = text; message.className = "auth-message " + type; }
function isStrongPassword(password) { if (password.length < 6) { return { valid: false, message: "رمز عبور باید حداقل ۶ کاراکتر باشد!" }; } return { valid: true, message: "" }; }
function generateRoomCode() { const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let code = ""; for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length)); return code; }

// ==========================================
// 🚀 منطق صفحه اتاق (Room.html)
// ==========================================
function initRoomPage() {
    const user = localStorage.getItem("currentUser");
    if (!user) { window.location.href = "login.html"; return; }

    socket = io(API_URL);

    socket.on('connect', () => { console.log('✅ به سرور WebSocket وصل شد'); });
    
    socket.on('update_players', (data) => {
        const list = document.getElementById("player-list");
        list.innerHTML = ""; 
        data.players.forEach((player, index) => {
            const li = document.createElement("li");
            li.style.cssText = "padding: 10px; background: #16213e; margin-bottom: 5px; border-radius: 8px; border-right: 4px solid #00d9ff;";
            if (player === user) { li.style.color = "#00ff88"; li.textContent = `👤 ${player} (شما)`; }
            else { li.style.color = "#ffd700"; li.textContent = `👤 ${player}`; }
            list.appendChild(li);
        });

        const isHost = data.players[0] === user;
        if (data.players.length >= 2 && isHost) { document.getElementById("start-game-btn").classList.remove("hidden"); }
    });

    socket.on('player_joined', (data) => { showModal("بازیکن جدید!", data.username + " وارد اتاق شد.", "باشه", null); });

    socket.on('game_started', (data) => {
        localStorage.setItem("gameConfig", JSON.stringify({
            numPlayers: data.players.length, numRounds: 5,
            players: data.players.map(name => ({ name: name, isBot: false })),
            difficulty: "medium", roomCode: data.room_code
        }));
        window.location.href = "game.html";
    });

    socket.on('error', (data) => { showModal('خطا', data.message, 'باشه', null); });

    setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        if (action === 'create') {
            const code = generateRoomCode();
            document.getElementById("join-section").classList.add("hidden");
            document.getElementById("room-section").classList.remove("hidden");
            document.getElementById("room-code-display").textContent = code;
            socket.emit('create_room', { room_code: code, username: user });
        } else if (action === 'join') {
            document.getElementById("join-section").classList.remove("hidden");
            document.getElementById("room-section").classList.add("hidden");
        }
    }, 100);
}

function joinRoomFromPage() {
    const code = document.getElementById("join-room-code").value.trim().toUpperCase();
    const user = localStorage.getItem("currentUser");
    if (code.length !== 6) { showModal("خطا", "کد اتاق باید ۶ کاراکتر باشد!", "باشه", null); return; }
    if (socket) {
        socket.emit('join_room', { room_code: code, username: user });
        document.getElementById("join-section").classList.add("hidden");
        document.getElementById("room-section").classList.remove("hidden");
        document.getElementById("room-code-display").textContent = code;
    }
}

function startMultiplayerGame() {
    const code = document.getElementById("room-code-display").textContent;
    if (socket && code) { socket.emit('start_game', { room_code: code }); }
}

// ==========================================
// 🤖 منطق بازی با بات و پروفایل
// ==========================================
function startBotGame() {
    const numRounds = parseInt(document.getElementById("bot-rounds").value);
    const botCount = parseInt(document.getElementById("bot-count").value);
    const difficulty = document.getElementById("bot-difficulty").value;

    if (isNaN(numRounds) || numRounds < 1 || numRounds > 10) { showModal("خطا", "تعداد دست باید بین ۱ تا ۱۰ باشد!", "باشه", null); return; }
    if (isNaN(botCount) || botCount < 1 || botCount > 3) { showModal("خطا", "تعداد بات باید بین ۱ تا ۳ باشد!", "باشه", null); return; }

    const myName = localStorage.getItem("currentUser") || "من";
    const players = [{ name: myName, isBot: false }];
    const botNames = ["بات آلفا", "بات بتا", "بات گاما"];
    for (let i = 0; i < botCount; i++) { players.push({ name: botNames[i] || ("بات " + (i + 1)), isBot: true }); }

    localStorage.setItem("gameConfig", JSON.stringify({ numPlayers: players.length, numRounds: numRounds, players: players, difficulty: difficulty, roomCode: null }));
    window.location.href = "game.html";
}

function startRandomMatch() { showModal("مچ رندوم", "این بخش به زودی اضافه می‌شود!", "باشه", null); }

async function loadProfile() {
    const username = localStorage.getItem("currentUser");
    const userId = localStorage.getItem("currentUserId");
    if (!username || !userId) { window.location.href = "login.html"; return; }
    document.getElementById("profile-username").textContent = username;
    document.getElementById("profile-avatar").textContent = username.charAt(0).toUpperCase();

    try {
        const userRes = await fetch(API_URL + "/api/user/" + userId);
        if (userRes.ok) { const userData = await userRes.json(); document.getElementById("profile-email").textContent = userData.email; }
    } catch (e) { console.log(e); }

    try {
        const statsRes = await fetch(API_URL + "/api/stats/" + userId);
        const statsData = await statsRes.json(); const stats = statsData.stats;
        document.getElementById("stat-games").textContent = stats.games;
        document.getElementById("stat-wins").textContent = stats.wins;
        document.getElementById("stat-avg").textContent = stats.avg;
        document.getElementById("stat-best").textContent = stats.best;
    } catch (e) { console.log(e); }

    try {
        const resultsRes = await fetch(API_URL + "/api/results/" + userId);
        const resultsData = await resultsRes.json(); const results = resultsData.results;
        const historyList = document.getElementById("history-list");
        if (results && results.length > 0) {
            let html = "";
            results.forEach(function(h) {
                const winClass = h.rank === 1 ? "win" : "";
                const rankText = h.rank === 1 ? "🥇 اول" : (h.rank === 2 ? "🥈 دوم" : (h.rank === 3 ? "🥉 سوم" : h.rank + "ام"));
                const date = new Date(h.played_at).toLocaleDateString("fa-IR");
                html += `<div class='history-item ${winClass}'><div class='history-left'><span class='history-detail'>${rankText} از ${h.players} بازیکن | ${h.rounds} دست</span><span class='history-date'>${date}</span></div><span class='history-score'>${h.score}</span></div>`;
            });
            historyList.innerHTML = html;
        } else { historyList.innerHTML = "<p class='empty-history'>هنوز بازی نکردی!</p>"; }
    } catch (e) { console.log(e); }
}

// ==========================================
// 🎮 منطق اصلی بازی (Game.html)
// ==========================================
let gameState = { players: [], numRounds: 0, currentRound: 0, currentPlayerIdx: 0, roundsWithMath: [], timeLimit: null, correctAnswer: null, timerJob: null, questionActive: false, startTime: 0, difficulty: "medium" };

const easyQuestions = [];
for (let a = 1; a <= 10; a++) { for (let b = 1; b <= 10; b++) { if (a + b <= 20) easyQuestions.push([a + " + " + b, a + b]); } }
const mediumQuestions = [];
for (let a = 1; a <= 20; a++) { for (let b = 1; b <= 20; b++) { if (a - b >= 1 && a - b <= 20) mediumQuestions.push([a + " - " + b, a - b]); } }
const hardQuestions = [];
for (let a = 1; a <= 20; a++) { for (let b = 1; b <= 20; b++) { if (a * b <= 20) hardQuestions.push([a + " × " + b, a * b]); } }

function initGame() {
    const configData = localStorage.getItem("gameConfig");
    if (!configData) { window.location.href = "lobby.html"; return; }
    const config = JSON.parse(configData);
    
    if (config.roomCode) {
        socket = io(API_URL);
        
        socket.on('connect', () => {
            console.log('✅ به سرور WebSocket (بازی) وصل شد');
            // به سرور می‌گیم ما عضو این اتاقیم و منتظر آپدیت هستیم
            socket.emit('join_room', { room_code: config.roomCode, username: localStorage.getItem("currentUser") });
        });
        
        // ساخت جدول اولیه
        gameState.players = config.players.map(p => ({ name: p.name, isBot: false, numbers: new Array(5).fill(0), score: 0 }));
        gameState.numRounds = 5;
        gameState.currentRound = 0;
        gameState.currentPlayerIdx = 0;
        renderTable();
        updateTurnOnline("در حال اتصال...");
        
        // وقتی سرور وضعیت بازی رو فرستاد، جدول و نوبت رو آپدیت کن
        socket.on('update_game_state', (data) => {
            const state = data.state;
            gameState.players = state.players;
            gameState.numRounds = state.num_rounds;
            gameState.currentRound = state.current_round;
            gameState.currentPlayerIdx = state.current_player_idx;
            gameState.roundsWithMath = state.rounds_with_math;
            
            renderTable();
            updateTurnOnline();
        });
    } else {
        const numRounds = config.numRounds;
        gameState.players = config.players.map((p, i) => ({ name: p.name, isBot: p.isBot, numbers: new Array(numRounds).fill(0), score: 0, order: i + 1 }));
        gameState.numRounds = numRounds;
        gameState.currentRound = 0;
        gameState.currentPlayerIdx = 0;
        gameState.difficulty = config.difficulty || "medium";
        gameState.roundsWithMath = [];
        for (let i = 0; i < numRounds; i++) { gameState.roundsWithMath.push(Math.random() < 0.3); }
        renderTable();
        startRound();
    }
}

function updateTurnOnline(text = "") {
    if (text) {
        document.getElementById("game-turn").textContent = text;
        return;
    }
    if (gameState.currentPlayerIdx >= gameState.players.length) {
        document.getElementById("game-turn").textContent = "در حال حساب کردن...";
        document.getElementById("submit-btn").disabled = true;
        return;
    }
    const currentPlayer = gameState.players[gameState.currentPlayerIdx];
    const isMyTurn = (currentPlayer.name === localStorage.getItem("currentUser"));
    document.getElementById("game-turn").textContent = "نوبت: " + currentPlayer.name;
    
    if (isMyTurn) {
        document.getElementById("submit-btn").disabled = false;
        document.getElementById("number-input").disabled = false;
        document.getElementById("number-input").value = "";
        document.getElementById("number-input").focus();
    } else {
        document.getElementById("submit-btn").disabled = true;
        document.getElementById("number-input").disabled = true;
        document.getElementById("number-input").value = "";
    }
}

function renderTable() {
    const thead = document.getElementById("game-thead");
    const tbody = document.getElementById("game-tbody");
    if (!thead || !tbody) return;
    let headHtml = "<tr><th>بازیکن</th>";
    for (let j = 0; j < gameState.numRounds; j++) { headHtml += "<th>دست " + (j + 1) + "</th>"; }
    headHtml += "<th>امتیاز</th></tr>";
    thead.innerHTML = headHtml;
    let bodyHtml = "";
    for (const p of gameState.players) {
        const isCurrent = gameState.players[gameState.currentPlayerIdx] && gameState.players[gameState.currentPlayerIdx].name === p.name && !p.isBot && gameState.currentPlayerIdx < gameState.players.length;
        bodyHtml += "<tr class='" + (isCurrent ? "highlight-row" : "") + "'>";
        bodyHtml += "<td>" + p.name + "</td>";
        for (let j = 0; j < gameState.numRounds; j++) {
            const val = p.numbers[j];
            bodyHtml += "<td>" + (val === 0 && j >= gameState.currentRound ? "—" : val) + "</td>";
        }
        bodyHtml += "<td class='score-cell'>" + p.score + "</td></tr>";
    }
    tbody.innerHTML = bodyHtml;
    const myPlayer = gameState.players.find(p => p.name === localStorage.getItem("currentUser"));
    if (document.getElementById("my-score") && myPlayer) document.getElementById("my-score").textContent = myPlayer.score;
}

function startRound() {
    if (gameState.currentRound >= gameState.numRounds) { showFinalScreen(); return; }
    document.getElementById("game-round").textContent = "دست " + (gameState.currentRound + 1) + " از " + gameState.numRounds;
    gameState.questionActive = false;
    gameState.correctAnswer = null;
    gameState.timeLimit = null;
    gameState.currentPlayerIdx = 0;
    const qCard = document.getElementById("question-card");
    const qText = document.getElementById("question-text");
    const qTimer = document.getElementById("question-timer");
    if (gameState.roundsWithMath[gameState.currentRound]) {
        const level = ["easy", "medium", "hard"][Math.floor(Math.random() * 3)];
        let question, answer;
        if (level === "easy") { gameState.timeLimit = 7; [question, answer] = easyQuestions[Math.floor(Math.random() * easyQuestions.length)]; }
        else if (level === "medium") { gameState.timeLimit = 10; [question, answer] = mediumQuestions[Math.floor(Math.random() * mediumQuestions.length)]; }
        else { gameState.timeLimit = 15; [question, answer] = hardQuestions[Math.floor(Math.random() * hardQuestions.length)]; }
        gameState.correctAnswer = answer;
        gameState.questionActive = true;
        qCard.classList.remove("hidden");
        qText.textContent = question + " = ?";
        qTimer.textContent = "⏱ " + gameState.timeLimit + " ثانیه";
    } else { qCard.classList.add("hidden"); }
    askPlayer();
}

function askPlayer() {
    if (gameState.currentPlayerIdx >= gameState.players.length) { endRound(); return; }
    const player = gameState.players[gameState.currentPlayerIdx];
    document.getElementById("game-turn").textContent = "نوبت: " + player.name;
    document.getElementById("input-message").textContent = "";
    if (player.isBot) {
        document.getElementById("submit-btn").disabled = true;
        document.getElementById("number-input").disabled = true;
        setTimeout(botPlay, 1200);
    } else {
        document.getElementById("submit-btn").disabled = false;
        document.getElementById("number-input").disabled = false;
        document.getElementById("number-input").value = "";
        document.getElementById("number-input").focus();
        if (gameState.questionActive) { gameState.startTime = Date.now(); startTimer(); }
    }
}

function startTimer() {
    const timerEl = document.getElementById("question-timer");
    function tick() {
        if (!gameState.questionActive) return;
        const elapsed = (Date.now() - gameState.startTime) / 1000;
        const remaining = gameState.timeLimit - elapsed;
        if (remaining <= 0) { timerEl.textContent = "⏰ وقت تمام!"; timerEl.classList.add("warning"); gameState.questionActive = false; return; }
        timerEl.textContent = "⏱ " + remaining.toFixed(1) + " ثانیه";
        timerEl.classList.remove("warning");
        if (remaining < 3) timerEl.classList.add("warning");
        gameState.timerJob = setTimeout(tick, 100);
    }
    tick();
}

function submitNumber() {
    const input = document.getElementById("number-input");
    const msg = document.getElementById("input-message");
    const val = parseInt(input.value);
    const config = JSON.parse(localStorage.getItem("gameConfig"));

    if (isNaN(val) || val < 1 || val > 20) { msg.textContent = "❌ عدد باید بین ۱ تا ۲۰ باشد!"; msg.className = "input-message error"; return; }

    if (config.roomCode) {
        socket.emit('submit_number', { room_code: config.roomCode, username: localStorage.getItem("currentUser"), number: val });
        msg.textContent = "⏳ در حال ارسال...";
        msg.className = "input-message";
        input.value = "";
    } else {
        const player = gameState.players[gameState.currentPlayerIdx];
        if (gameState.questionActive) {
            const elapsed = (Date.now() - gameState.startTime) / 1000;
            if (elapsed <= gameState.timeLimit && val === gameState.correctAnswer) { player.score += 2; msg.textContent = "✅ درست! +۲ امتیاز"; msg.className = "input-message success"; }
            else if (elapsed > gameState.timeLimit) { msg.textContent = "⏰ دیر شد! امتیازی نداره"; msg.className = "input-message error"; }
            else { msg.textContent = "❌ غلط! امتیازی نداره"; msg.className = "input-message error"; }
            gameState.questionActive = false;
            if (gameState.timerJob) clearTimeout(gameState.timerJob);
        } else { msg.textContent = ""; }
        player.numbers[gameState.currentRound] = val;
        gameState.currentPlayerIdx++;
        renderTable();
        setTimeout(function() { askPlayer(); }, 600);
    }
}

function botPlay() {
    if (gameState.currentPlayerIdx >= gameState.players.length) return;
    const player = gameState.players[gameState.currentPlayerIdx];
    let chosenNumber;
    const difficulty = gameState.difficulty || "medium";
    if (gameState.questionActive && Math.random() < (difficulty === "hard" ? 0.85 : difficulty === "medium" ? 0.55 : 0.3)) {
        chosenNumber = gameState.correctAnswer;
        if (Math.random() < (difficulty === "hard" ? 0.85 : difficulty === "medium" ? 0.6 : 0.4)) { player.score += 2; }
    } else { chosenNumber = Math.floor(Math.random() * 20) + 1; }
    player.numbers[gameState.currentRound] = chosenNumber;
    gameState.currentPlayerIdx++;
    renderTable();
    setTimeout(function() { askPlayer(); }, 600);
}

function endRound() {
    const r = gameState.currentRound;
    let oneCount = 0, twoCount = 0;
    for (const p of gameState.players) { if (p.numbers[r] < 10) oneCount++; else twoCount++; }
    if (oneCount < twoCount) { for (const p of gameState.players) if (p.numbers[r] < 10) p.score += 3; }
    else if (twoCount < oneCount) { for (const p of gameState.players) if (p.numbers[r] >= 10) p.score += 3; }
    for (let i = 0; i < gameState.players.length; i++) {
        const num = gameState.players[i].numbers[r];
        let unique = true;
        for (let k = 0; k < gameState.players.length; k++) { if (k !== i && gameState.players[k].numbers[r] === num) { unique = false; break; } }
        if (unique) gameState.players[i].score += 1;
    }
    gameState.players.sort((a, b) => b.score - a.score);
    renderTable();
    gameState.currentRound++;
    setTimeout(function() { startRound(); }, 1200);
}

async function showFinalScreen() {
    await saveGameResult();
    const overlay = document.getElementById("result-overlay");
    const ranking = document.getElementById("final-ranking");
    let html = "";
    const medals = ["🥇", "🥈", "🥉"];
    gameState.players.forEach(function(p, i) {
        const medal = i < 3 ? medals[i] : (i + 1) + ".";
        html += "<div class='final-ranking-item " + (i === 0 ? "first" : "") + "'>";
        html += "<span class='rank-name'>" + medal + " " + p.name + "</span>";
        html += "<span class='rank-score'>" + p.score + " امتیاز</span></div>";
    });
    ranking.innerHTML = html;
    overlay.classList.remove("hidden");
}

async function saveGameResult() {
    const userId = localStorage.getItem("currentUserId");
    const myName = localStorage.getItem("currentUser");
    if (!userId || !myName) return;
    const myPlayer = gameState.players.find(p => p.name === myName);
    if (!myPlayer) return;
    const myRank = gameState.players.indexOf(myPlayer) + 1;
    try {
        await fetch(API_URL + "/api/save-result", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: parseInt(userId), score: myPlayer.score, rank: myRank, players: gameState.players.length, rounds: gameState.numRounds })
        });
    } catch (e) { console.log("Could not save result:", e); }
}

document.addEventListener("DOMContentLoaded", function() {
    const navUser = document.getElementById("nav-username");
    const loginBtn = document.getElementById("login-btn");
    const logoutBtn = document.getElementById("logout-btn");

    if (navUser) {
        const user = localStorage.getItem("currentUser");
        if (user) {
            navUser.textContent = "👤 " + user;
            navUser.classList.remove("hidden");
            if (loginBtn) loginBtn.classList.add("hidden");
            if (logoutBtn) logoutBtn.classList.remove("hidden");
        } else {
            navUser.classList.add("hidden");
            if (loginBtn) loginBtn.classList.remove("hidden");
            if (logoutBtn) logoutBtn.classList.add("hidden");
        }
    }

    if (document.getElementById("profile-username")) { loadProfile(); }
    if (document.getElementById("game-table")) { initGame(); }
    if (document.getElementById("join-section") || document.getElementById("room-section")) { initRoomPage(); }

    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    if (loginForm) {
        loginForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const username = document.getElementById("login-username").value.trim();
            const password = document.getElementById("login-password").value;
            if (!username || !password) { showAuthMessage("❌ همه فیلدها الزامی است!", "error"); return; }
            try {
                const res = await fetch(API_URL + "/api/login", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: username, password: password })
                });
                const data = await res.json();
                if (!res.ok) { showAuthMessage("❌ " + (data.error || "خطا در ورود!"), "error"); return; }
                localStorage.setItem("currentUser", data.user.username);
                localStorage.setItem("currentUserId", data.user.id);
                showAuthMessage("✅ ورود موفق! در حال انتقال...", "success");
                setTimeout(function() { window.location.href = "lobby.html"; }, 1000);
            } catch (err) { showAuthMessage("❌ خطا در ارتباط با سرور!", "error"); }
        });
    }

    if (registerForm) {
        registerForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const username = document.getElementById("register-username").value.trim();
            const email = document.getElementById("register-email").value.trim();
            const password = document.getElementById("register-password").value;
            const password2 = document.getElementById("register-password2").value;
            if (!username || !email || !password || !password2) { showAuthMessage("❌ همه فیلدها الزامی است!", "error"); return; }
            if (username.length < 3) { showAuthMessage("❌ نام کاربری باید حداقل ۳ کاراکتر باشد!", "error"); return; }
            const passwordCheck = isStrongPassword(password);
            if (!passwordCheck.valid) { showAuthMessage("❌ " + passwordCheck.message, "error"); return; }
            if (password !== password2) { showAuthMessage("❌ رمزهای عبور یکسان نیستند!", "error"); return; }
            try {
                const res = await fetch(API_URL + "/api/register", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: username, email: email, password: password })
                });
                const data = await res.json();
                if (!res.ok) { showAuthMessage("❌ " + (data.error || "خطا در ثبت‌نام!"), "error"); return; }
                localStorage.setItem("currentUser", data.user.username);
                localStorage.setItem("currentUserId", data.user.id);
                showAuthMessage("✅ ثبت‌نام موفق! در حال انتقال...", "success");
                setTimeout(function() { window.location.href = "lobby.html"; }, 1000);
            } catch (err) { showAuthMessage("❌ خطا در ارتباط با سرور!", "error"); }
        });
    }
});