async function loadPlayers() {
    const container = document.getElementById("players-container");
    const count = document.getElementById("player-count");

    try {
        const response = await fetch("data/players.json");

        if (!response.ok) {
            throw new Error("Could not load players.json");
        }

        const data = await response.json();

        // Update the player count
        count.textContent = `${data.players.length} TRAINERS`;

        // Clear the loading message
        container.innerHTML = "";

        // Create a card for each player
        data.players.forEach((player) => {

            const card = document.createElement("a");

            card.className = "player-card";

            // We'll connect this to the player's page later
            card.href = `player.html?id=${encodeURIComponent(player.id)}`;

            card.innerHTML = `
                <div class="player-card-top">

                    <!-- Player sprite will be loaded from player.sprite -->
                    <img
                        class="player-sprite"
                        src="https://play.pokemonshowdown.com/sprites/trainers/${player.sprite}"
                        alt="${player.name}"
                    >

                    <div class="player-name">
                        ${player.name}
                    </div>

                    <div class="player-id">
                        ${player.id}
                    </div>

                </div>


            `;

            container.appendChild(card);
        });

    } catch (error) {

        container.innerHTML = `
            <p class="loading">
                Couldn't load the player data.
            </p>
        `;

        console.error(error);
    }
}


// Load the players when the page is ready
document.addEventListener("DOMContentLoaded", loadPlayers);