
(() => {
    "use strict";

    const API_BASE = "https://number-game-api.onrender.com";

    const token = localStorage.getItem("access_token");
    const currentUser = localStorage.getItem("currentUser");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const $ = (selector) => document.querySelector(selector);

    const elements = {
        username: $("#currentUsername"),
        friendsCount: $("#friendsCount"),
        incomingCount: $("#incomingCount"),
        outgoingCount: $("#outgoingCount"),
        requestBadge: $("#requestBadge"),

        searchInput: $("#searchInput"),
        searchResults: $("#searchResults"),

        friendsList: $("#friendsList"),
        incomingRequests: $("#incomingRequests"),
        outgoingRequests: $("#outgoingRequests"),

        toast: $("#toast")
    };

    let searchTimer = null;
    let toastTimer = null;

    let cachedFriends = [];
    let cachedIncoming = [];
    let cachedOutgoing = [];

    // =========================
    // HELPERS
    // =========================

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function getInitial(username) {
        return escapeHTML(
            String(username || "?").trim().charAt(0).toUpperCase()
        );
    }

    function showToast(message, isError = false) {
        elements.toast.textContent = message;
        elements.toast.classList.toggle("error", isError);
        elements.toast.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            elements.toast.classList.remove("show");
        }, 3000);
    }

    function formatDate(value) {
        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return date.toLocaleDateString("en", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function emptyState(title, description) {
        return `
            <div class="empty-state">
                <div class="empty-icon">✦</div>
                <h3>${escapeHTML(title)}</h3>
                <p>${escapeHTML(description)}</p>
            </div>
        `;
    }

    // =========================
    // API REQUEST
    // =========================

    async function api(path, options = {}) {
        const response = await fetch(`${API_BASE}${path}`, {
            ...options,

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                ...(options.headers || {})
            }
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (response.status === 401) {
            localStorage.removeItem("access_token");
            window.location.href = "login.html";

            throw new Error("Your session has expired. Please log in again.");
        }

        if (!response.ok) {
            throw new Error(
                data.error || data.message || "Something went wrong."
            );
        }

        return data;
    }

    // =========================
    // TAB NAVIGATION
    // =========================

    function initializeTabs() {
        document.querySelectorAll(".tab").forEach((button) => {
            button.addEventListener("click", () => {
                const target = button.dataset.tab;

                document.querySelectorAll(".tab").forEach((tab) => {
                    tab.classList.remove("active");
                });

                document.querySelectorAll(".tab-content").forEach((panel) => {
                    panel.classList.remove("active");
                });

                button.classList.add("active");

                const targetPanel = document.getElementById(
                    `${target}Tab`
                );

                if (targetPanel) {
                    targetPanel.classList.add("active");
                }
            });
        });
    }

    // =========================
    // SEARCH USERS
    // =========================

    function renderSearchResults(users) {
        if (!users.length) {
            elements.searchResults.innerHTML = emptyState(
                "No players found",
                "Try another username."
            );

            return;
        }

        elements.searchResults.innerHTML = users.map((user) => {
            let action = "";

            if (user.relationship === "friends") {
                action = `
                    <button class="action-button secondary-button" disabled>
                        Friends
                    </button>
                `;
            } else if (user.relationship === "outgoing") {
                action = `
                    <button class="action-button secondary-button" disabled>
                        Request Sent
                    </button>
                `;
            } else if (user.relationship === "incoming") {
                action = `
                    <button
                        class="action-button success-button"
                        data-action="quick-accept"
                        data-username="${escapeHTML(user.username)}"
                    >
                        Accept Request
                    </button>
                `;
            } else {
                action = `
                    <button
                        class="action-button primary-button"
                        data-action="send-request"
                        data-username="${escapeHTML(user.username)}"
                    >
                        + Add Friend
                    </button>
                `;
            }

            return `
                <article class="user-card">
                    <div class="user-info">
                        <div class="avatar">
                            ${getInitial(user.username)}
                        </div>

                        <div>
                            <div class="user-name">
                                ${escapeHTML(user.username)}
                            </div>

                            <div class="user-meta">
                                NUMORA PLAYER
                            </div>
                        </div>
                    </div>

                    <div class="user-actions">
                        ${action}
                    </div>
                </article>
            `;
        }).join("");
    }

    async function searchUsers(query) {
        if (query.length < 2) {
            elements.searchResults.innerHTML = emptyState(
                "Discover new players",
                "Enter at least two characters to search."
            );

            return;
        }

        elements.searchResults.innerHTML = `
            <div class="loading-state">Searching NUMORA players...</div>
        `;

        try {
            const data = await api(
                `/api/friends/search?q=${encodeURIComponent(query)}`
            );

            // Prevent old search results from replacing newer results.
            if (elements.searchInput.value.trim() !== query) {
                return;
            }

            renderSearchResults(data.users || []);

        } catch (error) {
            elements.searchResults.innerHTML = emptyState(
                "Search failed",
                error.message
            );
        }
    }

    function initializeSearch() {
        elements.searchInput.addEventListener("input", () => {
            clearTimeout(searchTimer);

            const query = elements.searchInput.value.trim();

            searchTimer = setTimeout(() => {
                searchUsers(query);
            }, 350);
        });
    }

    // =========================
    // FRIEND LIST
    // =========================

    function renderFriends(friends) {
        if (!friends.length) {
            elements.friendsList.innerHTML = emptyState(
                "Your circle is empty",
                "Find players and send your first friend request."
            );

            return;
        }

        elements.friendsList.innerHTML = friends.map((friend) => `
            <article class="user-card">
                <div class="user-info">
                    <div class="avatar">
                        ${getInitial(friend.username)}
                    </div>

                    <div>
                        <div class="user-name">
                            ${escapeHTML(friend.username)}
                        </div>

                        <div class="user-meta">
                            FRIEND SINCE ${escapeHTML(
                                formatDate(friend.friends_since) || "UNKNOWN"
                            )}
                        </div>
                    </div>
                </div>

                <div class="user-actions">
                    <button
                        class="action-button danger-button"
                        data-action="remove-friend"
                        data-id="${Number(friend.id)}"
                        data-username="${escapeHTML(friend.username)}"
                    >
                        Remove
                    </button>
                </div>
            </article>
        `).join("");
    }

    // =========================
    // REQUESTS
    // =========================

    function renderIncomingRequests(requests) {
        if (!requests.length) {
            elements.incomingRequests.innerHTML = emptyState(
                "No incoming requests",
                "New friend requests will appear here."
            );

            return;
        }

        elements.incomingRequests.innerHTML = requests.map((request) => `
            <article class="user-card">
                <div class="user-info">
                    <div class="avatar">
                        ${getInitial(request.username)}
                    </div>

                    <div>
                        <div class="user-name">
                            ${escapeHTML(request.username)}
                        </div>

                        <div class="user-meta">
                            SENT ${escapeHTML(
                                formatDate(request.created_at)
                            )}
                        </div>
                    </div>
                </div>

                <div class="user-actions">
                    <button
                        class="action-button success-button"
                        data-action="accept-request"
                        data-id="${Number(request.id)}"
                    >
                        Accept
                    </button>

                    <button
                        class="action-button danger-button"
                        data-action="reject-request"
                        data-id="${Number(request.id)}"
                    >
                        Decline
                    </button>
                </div>
            </article>
        `).join("");
    }

    function renderOutgoingRequests(requests) {
        if (!requests.length) {
            elements.outgoingRequests.innerHTML = emptyState(
                "No outgoing requests",
                "Requests you send will appear here."
            );

            return;
        }

        elements.outgoingRequests.innerHTML = requests.map((request) => `
            <article class="user-card">
                <div class="user-info">
                    <div class="avatar">
                        ${getInitial(request.username)}
                    </div>

                    <div>
                        <div class="user-name">
                            ${escapeHTML(request.username)}
                        </div>

                        <div class="user-meta">
                            WAITING FOR RESPONSE
                        </div>
                    </div>
                </div>

                <div class="user-actions">
                    <button
                        class="action-button danger-button"
                        data-action="cancel-request"
                        data-id="${Number(request.id)}"
                    >
                        Cancel
                    </button>
                </div>
            </article>
        `).join("");
    }

    // =========================
    // LOAD DATA
    // =========================

    async function loadDashboard() {
        try {
            const [friendsData, requestsData] = await Promise.all([
                api("/api/friends"),
                api("/api/friends/requests")
            ]);

            cachedFriends = friendsData.friends || [];
            cachedIncoming = requestsData.incoming || [];
            cachedOutgoing = requestsData.outgoing || [];

            renderFriends(cachedFriends);
            renderIncomingRequests(cachedIncoming);
            renderOutgoingRequests(cachedOutgoing);

            elements.friendsCount.textContent = cachedFriends.length;
            elements.incomingCount.textContent = cachedIncoming.length;
            elements.outgoingCount.textContent = cachedOutgoing.length;

            elements.requestBadge.textContent = cachedIncoming.length;

        } catch (error) {
            showToast(error.message, true);
        }
    }

    // =========================
    // ACTIONS
    // =========================

    async function performAction(button, action) {
        if (button.disabled) return;

        button.disabled = true;

        try {
            switch (action) {

                case "send-request": {
                    const username = button.dataset.username;

                    await api("/api/friends/request", {
                        method: "POST",
                        body: JSON.stringify({ username })
                    });

                    showToast(`Friend request sent to ${username}.`);
                    break;
                }

                case "quick-accept": {
                    const username = button.dataset.username;

                    await api("/api/friends/request", {
                        method: "POST",
                        body: JSON.stringify({ username })
                    });

                    showToast(`You are now friends with ${username}.`);
                    break;
                }

                case "accept-request": {
                    const id = Number(button.dataset.id);

                    await api(`/api/friends/requests/${id}/accept`, {
                        method: "POST"
                    });

                    showToast("Friend request accepted.");
                    break;
                }

                case "reject-request": {
                    const id = Number(button.dataset.id);

                    await api(`/api/friends/requests/${id}/reject`, {
                        method: "POST"
                    });

                    showToast("Friend request declined.");
                    break;
                }

                case "cancel-request": {
                    const id = Number(button.dataset.id);

                    await api(`/api/friends/requests/${id}`, {
                        method: "DELETE"
                    });

                    showToast("Friend request cancelled.");
                    break;
                }

                case "remove-friend": {
                    const id = Number(button.dataset.id);
                    const username = button.dataset.username;

                    if (!confirm(`Remove ${username} from your friends?`)) {
                        button.disabled = false;
                        return;
                    }

                    await api(`/api/friends/${id}`, {
                        method: "DELETE"
                    });

                    showToast(`${username} was removed.`);
                    break;
                }

                case "refresh":
                    await loadDashboard();
                    return;

                default:
                    return;
            }

            await loadDashboard();

            const query = elements.searchInput.value.trim();

            if (query.length >= 2) {
                await searchUsers(query);
            }

        } catch (error) {
            showToast(error.message, true);
            button.disabled = false;
        }
    }

    function initializeActions() {
        document.addEventListener("click", (event) => {
            const button = event.target.closest("[data-action]");

            if (!button) return;

            const action = button.dataset.action;

            performAction(button, action);
        });
    }

    // =========================
    // INITIALIZE
    // =========================

    function initializePage() {
        elements.username.textContent = currentUser || "Player";

        initializeTabs();
        initializeSearch();
        initializeActions();

        loadDashboard();
    }

    initializePage();

})();
