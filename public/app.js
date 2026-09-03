/* =========================================================
       GAME STATE
    ========================================================= */

    let grid = [
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
    ];

    let score = 0;

    let best =
        Number(
            localStorage.getItem("pi2048_best") || 0
        );

    let currentUser = null;

    let accessToken = null;

    let isAuthenticated = false;

    let scoreSubmitted = false;

    let touchStartX = 0;

    let touchStartY = 0;

    let touchTracking = false;


    /*
        Same secure Rails deployment.

        /api/auth/validate
        /api/score
        /api/leaderboard
    */

    const BACKEND_URL =
        "https://2048.joshuadelacruz.solutions";


    /*
        Leaderboard request generation.

        This prevents an older public leaderboard request
        from finishing after login/logout and overwriting
        the leaderboard using stale identity information.
    */

    let leaderboardRequestId = 0;


    /* =========================================================
       DOM
    ========================================================= */

    const gameGrid =
        document.getElementById("grid");

    const gameArea =
        document.getElementById("gameArea");

    const authArea =
        document.getElementById("authArea");

    const authStatus =
        document.getElementById("authStatus");

    const loginBtn =
        document.getElementById("loginBtn");

    const demoBtn =
        document.getElementById("demoBtn");

    const newGameBtn =
        document.getElementById("newGameBtn");

    const logoutBtn =
        document.getElementById("logoutBtn");

    const userInfo =
        document.getElementById("userInfo");

    const scoreElement =
        document.getElementById("score");

    const bestElement =
        document.getElementById("best");

    const gameOverElement =
        document.getElementById("gameOver");

    const gameOverText =
        document.getElementById("gameOverText");

    const gameOverIcon =
        document.getElementById("gameOverIcon");

    const finalScoreElement =
        document.getElementById("finalScore");

    const scoreSaveStatus =
        document.getElementById("scoreSaveStatus");

    const playAgainBtn =
        document.getElementById("playAgainBtn");

    const leaderboardList =
        document.getElementById("leaderboardList");

    const leaderboardRefresh =
        document.getElementById("leaderboardRefresh");

    loginBtn.addEventListener("click", handleLogin);
    demoBtn.addEventListener("click", startDemoGame);
    newGameBtn.addEventListener("click", newGame);
    logoutBtn.addEventListener("click", logoutUser);
    leaderboardRefresh.addEventListener("click", loadLeaderboard);
    playAgainBtn.addEventListener("click", newGame);


    bestElement.textContent = best;


    /* =========================================================
       PI SDK INITIALIZATION
    ========================================================= */

    async function initPiSDK() {

        try {

            if (
                !window.Pi ||
                typeof window.Pi.init !== "function"
            ) {

                throw new Error(
                    "Pi SDK is not available. Open the app in Pi Browser."
                );

            }

            setAuthStatus(
                "Initializing Pi Network...",
                "normal"
            );

            await Pi.init({
                version: "2.0"
            });

            setAuthStatus(
                "Pi Network ready.",
                "success"
            );

        } catch (error) {

            console.error(
                "Pi SDK initialization error:",
                error
            );

            setAuthStatus(
                "⚠️ " +
                (
                    error.message ||
                    "Pi authentication is unavailable."
                ),
                "error"
            );

        }

    }


    /* =========================================================
       AUTH STATUS
    ========================================================= */

    function setAuthStatus(
        message,
        type = "normal"
    ) {

        authStatus.textContent =
            message;

        authStatus.classList.add(
            "active"
        );

        authStatus.classList.remove(
            "success",
            "error"
        );

        if (type === "success") {

            authStatus.classList.add(
                "success"
            );

        }

        if (type === "error") {

            authStatus.classList.add(
                "error"
            );

        }

    }


    /* =========================================================
       PI LOGIN
    ========================================================= */

    async function handleLogin() {

        try {

            if (
                !window.Pi ||
                typeof Pi.authenticate !== "function"
            ) {

                throw new Error(
                    "Pi SDK is not ready. Please open this app in Pi Browser."
                );

            }

            loginBtn.disabled = true;

            loginBtn.textContent =
                "🔄  Authenticating...";

            setAuthStatus(
                "Authenticating with Pi Network...",
                "normal"
            );

            const auth =
                await Pi.authenticate(
                    ["username"],
                    onIncorrectUserErr
                );

            if (
                !auth ||
                !auth.accessToken ||
                !auth.user
            ) {

                throw new Error(
                    "Pi authentication did not return the required credentials."
                );

            }

            accessToken =
                auth.accessToken;

            setAuthStatus(
                "Validating your Pi account...",
                "normal"
            );

            const validationResult =
                await validateTokenWithBackend(
                    accessToken
                );

            if (
                !validationResult.success ||
                !validationResult.user
            ) {

                throw new Error(
                    validationResult.error ||
                    "Token validation failed."
                );

            }

            currentUser =
                validationResult.user;

            isAuthenticated = true;

            scoreSubmitted = false;

            setAuthStatus(
                "✓ Connected to Pi Network",
                "success"
            );

            showUserInfo(
                currentUser
            );

            startGame();

            /*
                Load leaderboard only after the backend has
                verified the Pi identity.

                The leaderboard renderer can now reliably
                identify the current player.
            */

            await loadLeaderboard();

        } catch (error) {

            console.error(
                "Authentication error:",
                error
            );

            currentUser = null;

            accessToken = null;

            isAuthenticated = false;

            setAuthStatus(
                "✗ " +
                (
                    error.message ||
                    "Authentication failed."
                ),
                "error"
            );

            loginBtn.disabled = false;

            loginBtn.textContent =
                "🔐  Login with Pi";

        }

    }


    /* =========================================================
       VALIDATE PI TOKEN
    ========================================================= */

    async function validateTokenWithBackend(
        token
    ) {

        const response =
            await fetch(
                `${BACKEND_URL}/api/auth/validate`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        accessToken: token
                    })
                }
            );

        let data = null;

        try {

            data =
                await response.json();

        } catch (_) {

            data = null;

        }

        if (!response.ok) {

            throw new Error(
                data?.error?.message ||
                `Backend validation failed (${response.status})`
            );

        }

        return data;

    }


    /* =========================================================
       USER INFO
    ========================================================= */

    function showUserInfo(
        user
    ) {

        userInfo.textContent =
            `👤 ${user.username}`;

    }


    /* =========================================================
       DEMO MODE
    ========================================================= */

    function startDemoGame() {

        currentUser = {
            username: "Demo User",
            uid: "demo"
        };

        accessToken = null;

        isAuthenticated = false;

        scoreSubmitted = false;

        setAuthStatus(
            "🎮 Demo Mode — your score stays on this device.",
            "normal"
        );

        showUserInfo(
            currentUser
        );

        startGame();

        /*
            Demo users cannot access private identity
            information. The public leaderboard can
            still be displayed.
        */

        loadLeaderboard();

    }


    /* =========================================================
       START GAME
    ========================================================= */

    function startGame() {

        authArea.classList.add(
            "hidden"
        );

        gameArea.classList.add(
            "active"
        );

        newGame();

    }


    /* =========================================================
       LOGOUT
    ========================================================= */

    function logoutUser() {

        /*
            Invalidate any leaderboard request that may
            still be in flight under the previous identity.
        */

        leaderboardRequestId++;

        currentUser = null;

        accessToken = null;

        isAuthenticated = false;

        scoreSubmitted = false;

        gameArea.classList.remove(
            "active"
        );

        authArea.classList.remove(
            "hidden"
        );

        userInfo.textContent =
            "";

        loginBtn.disabled =
            false;

        loginBtn.textContent =
            "🔐  Login with Pi";

        hideGameOver();

        setAuthStatus(
            "Logged out. Login with Pi or play Demo.",
            "normal"
        );

        /*
            Reload the public leaderboard with no current
            identity. No previous player can remain marked
            as YOU.
        */

        loadLeaderboard();

    }


    /* =========================================================
       PI USER ERROR
    ========================================================= */

    function onIncorrectUserErr(
        error
    ) {

        console.error(
            "Pi user validation error:",
            error
        );

    }


    /* =========================================================
       FORMAT SCORE
    ========================================================= */

    function formatScore(
        value
    ) {

        const number =
            Number(value);

        if (
            !Number.isFinite(number)
        ) {

            return "0";

        }

        return number.toLocaleString(
            "en-US"
        );

    }


    /* =========================================================
       NORMALIZE USER IDENTITY
    ========================================================= */

    function normalizeIdentity(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }

        return String(value)
            .trim()
            .toLowerCase();

    }


    /*
        Production /api/leaderboard returns privacy-safe
        leaderboard fields such as:

            {
                player_id,
                username,
                score,
                created_at
            }

        player_id is an opaque server-generated HMAC. The same
        value is returned for the authenticated player without
        exposing the raw Pi UID on the public leaderboard.
    */

    function isLeaderboardEntryCurrentUser(
        entry,
        user
    ) {

        if (
            !entry ||
            !user
        ) {

            return false;

        }


        const currentPlayerId =
            normalizeIdentity(
                user.player_id
            );

        const entryPlayerId =
            normalizeIdentity(
                entry.player_id
            );

        if (
            currentPlayerId &&
            entryPlayerId
        ) {
            return (
                currentPlayerId ===
                entryPlayerId
            );
        }
        return false;

    }


    /* =========================================================
       LEADERBOARD
    ========================================================= */

    async function loadLeaderboard() {

        if (!leaderboardList) {
            return;
        }


        /*
            Give this request a unique generation.

            If another login/logout/refresh starts before this
            request finishes, its result cannot overwrite the
            newer leaderboard state.
        */

        const requestId =
            ++leaderboardRequestId;


        /*
            Capture the identity at request start.

            This is important because currentUser may change
            while fetch() is in progress.
        */

        const identitySnapshot =
            currentUser
                ? {
                    player_id:
                        currentUser.player_id || null,

                    uid:
                        currentUser.uid || null,

                    username:
                        currentUser.username || null
                }
                : null;


        leaderboardList.innerHTML =
            `
                <div class="leaderboard-loading">
                    Loading leaderboard...
                </div>
            `;

        leaderboardRefresh.disabled =
            true;

        try {

            const response =
                await fetch(
                    `${BACKEND_URL}/api/leaderboard`,
                    {
                        method: "GET",

                        headers: {
                            "Accept":
                                "application/json"
                        },

                        cache: "no-store"
                    }
                );


            let data = null;

            try {

                data =
                    await response.json();

            } catch (_) {

                data = null;

            }


            if (!response.ok) {

                throw new Error(
                    data?.error?.message ||
                    `Leaderboard request failed (${response.status})`
                );

            }


            if (
                !data ||
                data.success !== true
            ) {

                throw new Error(
                    data?.error?.message ||
                    "Invalid leaderboard response"
                );

            }


            const leaderboard =
                Array.isArray(
                    data.leaderboard
                )
                    ? data.leaderboard
                    : [];


            /*
                Ignore stale responses.

                Example:

                Request A = public leaderboard
                User logs in
                Request B = authenticated leaderboard

                If A finishes after B, A is discarded.
            */

            if (
                requestId !==
                leaderboardRequestId
            ) {

                return;

            }


            renderLeaderboard(
                leaderboard,
                identitySnapshot
            );


        } catch (error) {

            /*
                Do not replace a newer leaderboard with an
                error from an older request.
            */

            if (
                requestId !==
                leaderboardRequestId
            ) {

                return;

            }


            console.error(
                "Leaderboard error:",
                error
            );


            leaderboardList.innerHTML =
                `
                    <div class="leaderboard-error">
                        ⚠️ Unable to load leaderboard.
                    </div>
                `;

        } finally {

            if (
                requestId ===
                leaderboardRequestId
            ) {

                leaderboardRefresh.disabled =
                    false;

            }

        }

    }


    /* =========================================================
       RENDER LEADERBOARD
    ========================================================= */

    function renderLeaderboard(
        leaderboard,
        userSnapshot = currentUser
    ) {

        if (
            !Array.isArray(leaderboard) ||
            !leaderboard.length
        ) {

            leaderboardList.innerHTML =
                `
                    <div class="leaderboard-empty">
                        No scores yet.<br>
                        Be the first Pi 2048 player!
                    </div>
                `;

            return;

        }


        leaderboardList.innerHTML = "";


        /*
            The backend is responsible for determining the
            leaderboard order.

            We preserve that order here and only display the
            first 10 entries.
        */

        leaderboard
            .slice(0, 10)
            .forEach(
                (
                    entry,
                    index
                ) => {


                    /*
                        IMPORTANT:

                        Match the opaque player_id returned by both
                        authenticated validation and the public
                        leaderboard. Never expose or compare raw UID.
                    */

                    const isCurrentUser =
                        isLeaderboardEntryCurrentUser(
                            entry,
                            userSnapshot
                        );


                    let displayName;


                    if (
                        isCurrentUser
                    ) {

                        displayName =
                            "YOU";

                    } else {

                        displayName =
                            entry.username || "***";

                    }


                    const row =
                        document.createElement(
                            "div"
                        );

                    row.className =
                        "leaderboard-row";


                    if (
                        isCurrentUser
                    ) {

                        row.classList.add(
                            "current-user"
                        );

                    }


                    const rank =
                        document.createElement(
                            "div"
                        );

                    rank.className =
                        "leaderboard-rank";


                    if (
                        index === 0
                    ) {

                        rank.textContent =
                            "🥇";

                    } else if (
                        index === 1
                    ) {

                        rank.textContent =
                            "🥈";

                    } else if (
                        index === 2
                    ) {

                        rank.textContent =
                            "🥉";

                    } else {

                        rank.textContent =
                            String(
                                index + 1
                            );

                    }


                    const name =
                        document.createElement(
                            "div"
                        );

                    name.className =
                        "leaderboard-name";

                    name.textContent =
                        displayName;


                    const scoreValue =
                        document.createElement(
                            "div"
                        );

                    scoreValue.className =
                        "leaderboard-score";

                    scoreValue.textContent =
                        formatScore(
                            entry.score
                        );


                    row.appendChild(
                        rank
                    );

                    row.appendChild(
                        name
                    );

                    row.appendChild(
                        scoreValue
                    );


                    leaderboardList.appendChild(
                        row
                    );

                }
            );

    }


    /* =========================================================
       NEW GAME
    ========================================================= */

    function newGame() {

        grid = [
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0
        ];

        score = 0;

        scoreSubmitted = false;

        scoreElement.textContent =
            "0";

        scoreSaveStatus.textContent =
            "";

        scoreSaveStatus.className =
            "score-save-status";

        hideGameOver();

        addNewTile(false);

        addNewTile(false);

        updateDisplay();

    }


    /* =========================================================
       ADD NEW TILE
    ========================================================= */

    function addNewTile(
        animate = true
    ) {

        const empty =
            grid
                .map(
                    (
                        value,
                        index
                    ) =>
                        value === 0
                            ? index
                            : null
                )
                .filter(
                    index =>
                        index !== null
                );

        if (
            empty.length === 0
        ) {

            return;

        }

        const index =
            empty[
                Math.floor(
                    Math.random() *
                    empty.length
                )
            ];

        grid[index] =
            Math.random() < 0.9
                ? 2
                : 4;

        if (animate) {

            requestAnimationFrame(
                () => {

                    const cell =
                        document.querySelector(
                            `[data-index="${index}"]`
                        );

                    if (!cell) {
                        return;
                    }

                    cell.classList.remove(
                        "tile-new"
                    );

                    void cell.offsetWidth;

                    cell.classList.add(
                        "tile-new"
                    );

                }
            );

        }

    }


    /* =========================================================
       UPDATE BOARD
    ========================================================= */

    function updateDisplay(
        mergedIndexes = []
    ) {

        for (
            let i = 0;
            i < 16;
            i++
        ) {

            const cell =
                document.querySelector(
                    `[data-index="${i}"]`
                );

            if (!cell) {
                continue;
            }

            const value =
                grid[i];

            cell.setAttribute(
                "data-value",
                value || ""
            );

            cell.textContent =
                value || "";

            cell.classList.remove(
                "tile-merged"
            );

            if (
                mergedIndexes.includes(i)
            ) {

                void cell.offsetWidth;

                cell.classList.add(
                    "tile-merged"
                );

            }

        }

    }


    /* =========================================================
       MOVE
    ========================================================= */

    function move(
        direction
    ) {

        const oldGrid =
            [...grid];

        let newGrid =
            [...grid];

        let gainedScore = 0;


        if (
            direction === "left" ||
            direction === "right"
        ) {

            for (
                let row = 0;
                row < 4;
                row++
            ) {

                let line = [
                    newGrid[row * 4],
                    newGrid[row * 4 + 1],
                    newGrid[row * 4 + 2],
                    newGrid[row * 4 + 3]
                ];

                if (
                    direction === "right"
                ) {

                    line.reverse();

                }

                const result =
                    processLine(line);

                line =
                    result.line;

                gainedScore +=
                    result.score;

                if (
                    direction === "right"
                ) {

                    line.reverse();

                }

                for (
                    let col = 0;
                    col < 4;
                    col++
                ) {

                    newGrid[
                        row * 4 + col
                    ] =
                        line[col] || 0;

                }

            }

        } else {

            for (
                let col = 0;
                col < 4;
                col++
            ) {

                let line = [
                    newGrid[col],
                    newGrid[col + 4],
                    newGrid[col + 8],
                    newGrid[col + 12]
                ];

                if (
                    direction === "down"
                ) {

                    line.reverse();

                }

                const result =
                    processLine(line);

                line =
                    result.line;

                gainedScore +=
                    result.score;

                if (
                    direction === "down"
                ) {

                    line.reverse();

                }

                for (
                    let row = 0;
                    row < 4;
                    row++
                ) {

                    newGrid[
                        col + row * 4
                    ] =
                        line[row] || 0;

                }

            }

        }


        const moved =
            !arraysEqual(
                oldGrid,
                newGrid
            );


        if (!moved) {

            return;

        }


        grid =
            newGrid;

        score +=
            gainedScore;

        updateScoreDisplay();

        addNewTile(true);

        updateDisplay();

        checkGameOver();

    }


    /* =========================================================
       PROCESS LINE
    ========================================================= */

    function processLine(
        line
    ) {

        let filtered =
            line.filter(
                value =>
                    value !== 0
            );

        let result = [];

        let gainedScore = 0;


        for (
            let i = 0;
            i < filtered.length;
            i++
        ) {

            if (
                i <
                    filtered.length - 1 &&
                filtered[i] ===
                    filtered[i + 1]
            ) {

                const merged =
                    filtered[i] * 2;

                result.push(
                    merged
                );

                gainedScore +=
                    merged;

                i++;

            } else {

                result.push(
                    filtered[i]
                );

            }

        }


        while (
            result.length < 4
        ) {

            result.push(0);

        }


        return {
            line: result,
            score: gainedScore
        };

    }


    /* =========================================================
       ARRAY COMPARISON
    ========================================================= */

    function arraysEqual(
        a,
        b
    ) {

        if (
            a.length !==
            b.length
        ) {

            return false;

        }

        for (
            let i = 0;
            i < a.length;
            i++
        ) {

            if (
                a[i] !== b[i]
            ) {

                return false;

            }

        }

        return true;

    }


    /* =========================================================
       SCORE DISPLAY
    ========================================================= */

    function updateScoreDisplay() {

        scoreElement.textContent =
            score;

        scoreElement.classList.remove(
            "bump"
        );

        void scoreElement.offsetWidth;

        scoreElement.classList.add(
            "bump"
        );

        if (
            score > best
        ) {

            best =
                score;

            localStorage.setItem(
                "pi2048_best",
                best
            );

            bestElement.textContent =
                best;

        }

    }


    /* =========================================================
       GAME OVER CHECK
    ========================================================= */

    function checkGameOver() {

        if (
            grid.includes(2048)
        ) {

            gameOverText.textContent =
                "You Won!";

            gameOverIcon.textContent =
                "🏆";

            finalScoreElement.textContent =
                score;

            showGameOver();

            submitScore();

            return;

        }


        if (
            !canMove()
        ) {

            gameOverText.textContent =
                "Game Over!";

            gameOverIcon.textContent =
                "💥";

            finalScoreElement.textContent =
                score;

            showGameOver();

            submitScore();

        }

    }


    /* =========================================================
       CAN MOVE
    ========================================================= */

    function canMove() {

        for (
            let i = 0;
            i < 16;
            i++
        ) {

            if (
                grid[i] === 0
            ) {

                return true;

            }

            if (
                i % 4 < 3 &&
                grid[i] ===
                    grid[i + 1]
            ) {

                return true;

            }

            if (
                i < 12 &&
                grid[i] ===
                    grid[i + 4]
            ) {

                return true;

            }

        }

        return false;

    }


    /* =========================================================
       GAME OVER UI
    ========================================================= */

    function showGameOver() {

        gameOverElement.classList.add(
            "show"
        );

    }


    function hideGameOver() {

        gameOverElement.classList.remove(
            "show"
        );

    }


    /* =========================================================
       SAVE SCORE
    ========================================================= */

    async function submitScore() {

        if (
            !isAuthenticated ||
            !accessToken ||
            !currentUser
        ) {

            scoreSaveStatus.textContent =
                "🎮 Demo score — not submitted.";

            return;

        }


        if (
            scoreSubmitted
        ) {

            return;

        }


        if (
            score <= 0
        ) {

            return;

        }


        scoreSubmitted = true;


        scoreSaveStatus.className =
            "score-save-status";

        scoreSaveStatus.textContent =
            "💾 Saving your score...";


        try {

            const response =
                await fetch(
                    `${BACKEND_URL}/api/score`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            accessToken:
                                accessToken,

                            score:
                                score

                        })
                    }
                );


            let data = null;


            try {

                data =
                    await response.json();

            } catch (_) {

                data = null;

            }


            if (
                !response.ok
            ) {

                throw new Error(
                    data?.error?.message ||
                    `Score submission failed (${response.status})`
                );

            }


            scoreSaveStatus.className =
                "score-save-status success";

            scoreSaveStatus.textContent =
                "✓ Score saved to the leaderboard!";


            /*
                Refresh leaderboard immediately after
                successfully saving the score.

                The authenticated identity is still in
                currentUser, so the newly returned score
                can correctly become YOU.
            */

            await loadLeaderboard();


        } catch (error) {

            scoreSubmitted = false;

            scoreSaveStatus.className =
                "score-save-status error";

            scoreSaveStatus.textContent =
                "⚠️ Score could not be saved. Please try again.";

            console.error(
                "Score submission error:",
                error
            );

        }

    }


    /* =========================================================
       TOUCH CONTROLS
    ========================================================= */

    gameGrid.addEventListener(
        "touchstart",
        function(e) {

            if (
                !gameArea.classList.contains(
                    "active"
                )
            ) {

                return;

            }

            if (
                e.touches.length !== 1
            ) {

                return;

            }

            const touch =
                e.touches[0];

            touchStartX =
                touch.clientX;

            touchStartY =
                touch.clientY;

            touchTracking =
                true;

        },
        {
            passive: true
        }
    );


    gameGrid.addEventListener(
        "touchmove",
        function(e) {

            if (
                !touchTracking
            ) {

                return;

            }

            e.preventDefault();

        },
        {
            passive: false
        }
    );


    gameGrid.addEventListener(
        "touchend",
        function(e) {

            if (
                !touchTracking
            ) {

                return;

            }

            e.preventDefault();

            const touch =
                e.changedTouches[0];

            const dx =
                touch.clientX -
                touchStartX;

            const dy =
                touch.clientY -
                touchStartY;

            touchTracking =
                false;

            const minimumSwipe =
                35;

            if (
                Math.max(
                    Math.abs(dx),
                    Math.abs(dy)
                ) < minimumSwipe
            ) {

                return;

            }

            if (
                Math.abs(dx) >
                Math.abs(dy)
            ) {

                if (
                    dx > 0
                ) {

                    move("right");

                } else {

                    move("left");

                }

            } else {

                if (
                    dy > 0
                ) {

                    move("down");

                } else {

                    move("up");

                }

            }

        },
        {
            passive: false
        }
    );


    /* =========================================================
       KEYBOARD CONTROLS
    ========================================================= */

    document.addEventListener(
        "keydown",
        function(e) {

            if (
                !gameArea.classList.contains(
                    "active"
                )
            ) {

                return;

            }

            const keys = {

                ArrowLeft: "left",

                ArrowRight: "right",

                ArrowUp: "up",

                ArrowDown: "down"

            };

            if (
                keys[e.key]
            ) {

                e.preventDefault();

                move(
                    keys[e.key]
                );

            }

        }
    );


    /* =========================================================
       PREVENT PAGE SCROLL DURING BOARD TOUCH
    ========================================================= */

    document.addEventListener(
        "touchmove",
        function(e) {

            if (
                touchTracking
            ) {

                e.preventDefault();

            }

        },
        {
            passive: false
        }
    );


    /* =========================================================
       INITIALIZE
    ========================================================= */

    window.addEventListener(
        "load",
        async function() {

            await initPiSDK();

            /*
                Load the public leaderboard immediately.

                Before login:
                    all names are masked.

                After login:
                    the verified Pi username is used to
                    identify the current player's entry as YOU.

                If the production API includes UID, UID is
                preferred automatically.
            */

            await loadLeaderboard();

        }
    );
