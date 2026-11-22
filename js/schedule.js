/* =========================
   LOAD SCHEDULE
========================= */

async function loadSchedule() {
    const container = document.getElementById("schedule-container");

    if (!container) return;

    try {
        const [playersResponse, scheduleResponse] = await Promise.all([
            fetch("data/players.json"),
            fetch("data/schedule.json")
        ]);

        if (!playersResponse.ok || !scheduleResponse.ok) {
            throw new Error("Could not load schedule data.");
        }

        const playersData = await playersResponse.json();
        const scheduleData = await scheduleResponse.json();

        renderSchedule(
            playersData.players,
            scheduleData.weeks,
            container
        );

    } catch (error) {
        console.error("Could not load schedule:", error);
        container.innerHTML =
            '<p class="loading">Could not load the schedule.</p>';
    }
}


/* =========================
   RENDER TRAINER CARDS
========================= */

function renderSchedule(players, weeks, container) {
    container.innerHTML = "";

    const sortedPlayers = [...players].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
            sensitivity: "base"
        })
    );

    sortedPlayers.forEach(player => {
        const card = document.createElement("article");
        card.className = "player-card schedule-card";

        // Card header
        const header = document.createElement("button");
        header.className = "schedule-card-header";
        header.type = "button";
        header.setAttribute("aria-expanded", "false");

        // Trainer sprite
        const sprite = document.createElement("img");
        sprite.className = "player-sprite";
        sprite.src =
            `https://play.pokemonshowdown.com/sprites/trainers/${player.sprite}`;
        sprite.alt = "";

        // Trainer name
        const name = document.createElement("span");
        name.className = "player-name";
        name.textContent = player.name;

        // Expand indicator
        const arrow = document.createElement("span");
        arrow.className = "schedule-arrow";
        arrow.textContent = "+";

        header.appendChild(sprite);
        header.appendChild(name);
        header.appendChild(arrow);

        // Schedule content
        const content = document.createElement("div");
        content.className = "schedule-card-content";
        content.hidden = true;

        // Find this trainer's opponent each week
        weeks.forEach(week => {
            const matchup = week.matches.find(match =>
                match.includes(player.id)
            );

            if (!matchup) return;

            const opponentId = matchup.find(id =>
                id !== player.id
            );

            const opponent = players.find(p =>
                p.id === opponentId
            );

            if (!opponent) return;

            content.appendChild(
                createMatchupRow(week, opponent)
            );
        });

        // Toggle expansion
        header.addEventListener("click", () => {
            const isExpanded =
                header.getAttribute("aria-expanded") === "true";

            // Close any other expanded card
            const expandedCard =
                container.querySelector(".schedule-card.expanded");

            if (expandedCard && expandedCard !== card) {
                const expandedHeader =
                    expandedCard.querySelector(".schedule-card-header");

                const expandedContent =
                    expandedCard.querySelector(".schedule-card-content");

                const expandedArrow =
                    expandedCard.querySelector(".schedule-arrow");

                expandedHeader.setAttribute("aria-expanded", "false");
                expandedContent.hidden = true;
                expandedArrow.textContent = "+";
                expandedCard.classList.remove("expanded");
            }

            if (isExpanded) {
                // Collapse and restore original position
                header.setAttribute("aria-expanded", "false");
                content.hidden = true;
                arrow.textContent = "+";
                card.classList.remove("expanded");

                const originalIndex = players.indexOf(player);
                const cards = [...container.children];
                const nextCard = cards[originalIndex];

                if (nextCard && nextCard !== card) {
                    container.insertBefore(card, nextCard);
                } else {
                    container.appendChild(card);
                }

            } else {
                // Expand and move card to the top
                header.setAttribute("aria-expanded", "true");
                content.hidden = false;
                arrow.textContent = "−";
                card.classList.add("expanded");

                container.prepend(card);

                requestAnimationFrame(() => {
                    card.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                });
            }
        });

        card.appendChild(header);
        card.appendChild(content);

        container.appendChild(card);
    });
}


/* =========================
   CREATE MATCHUP ROW
========================= */


function createMatchupRow(week, opponent) {
    const row = document.createElement("div");
    row.className = "schedule-matchup";

    const weekInfo = document.createElement("div");
    weekInfo.className = "schedule-week-info";

    const weekName = document.createElement("strong");
    weekName.textContent = `Week ${week.week}`;

    const dates = document.createElement("span");
    dates.textContent = week.dates;

    weekInfo.appendChild(weekName);
    weekInfo.appendChild(dates);

    // VS label
    const vs = document.createElement("span");
    vs.className = "schedule-vs";
    vs.textContent = "VS";

    // Clickable opponent link
    const opponentInfo = document.createElement("a");
    opponentInfo.className = "schedule-opponent";
    opponentInfo.href =
        `player.html?id=${encodeURIComponent(opponent.id)}`;

    const opponentSprite = document.createElement("img");
    opponentSprite.src =
        `https://play.pokemonshowdown.com/sprites/trainers/${opponent.sprite}`;
    opponentSprite.alt = "";

    const opponentName = document.createElement("span");
    opponentName.textContent = opponent.name;

    opponentInfo.appendChild(opponentSprite);
    opponentInfo.appendChild(opponentName);

    row.appendChild(weekInfo);
    row.appendChild(vs);
    row.appendChild(opponentInfo);

    return row;
}



/* =========================
   START
========================= */

document.addEventListener("DOMContentLoaded", loadSchedule);
