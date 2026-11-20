
async function loadPlayer() {

    const header = document.getElementById("player-header");
    const pokemonContainer = document.getElementById("pokemon-container");

    try {

        const params = new URLSearchParams(window.location.search);
        const playerId = params.get("id");

        if (!playerId) {
            throw new Error("No player ID provided.");
        }

        const response = await fetch("data/players.json");

        if (!response.ok) {
            throw new Error("Could not load players.json");
        }

        const data = await response.json();

        const player = data.players.find(
            player => player.id.toLowerCase() === playerId.toLowerCase()
        );

        if (!player) {
            throw new Error("Player not found.");
        }

        document.title = `${player.name} — Season 13 Champions OU`;

        header.innerHTML = `
            <div class="player-profile-card">

                <div class="player-profile-sprite">
                    <img
                        src="https://play.pokemonshowdown.com/sprites/trainers/${player.sprite}"
                        alt="${player.name}"
                    >
                </div>

                <div class="player-profile-info">
                    <p class="eyebrow">SEASON 13 TRAINER</p>
                    <h2>${player.name}</h2>
                    <p class="player-profile-id">
                        SHOWDOWN ID: ${player.id}
                    </p>
                </div>

            </div>
        `;

        await loadTeam(player, pokemonContainer);

    } catch (error) {

        header.innerHTML = `
            <p class="loading">
                Couldn't load this trainer. Check the player ID and try again.
            </p>
        `;

        console.error(error);
    }
}


// Load the player's Pokémon and generate their defensive chart
async function loadTeam(player, container) {

    const team = player.team || [];
    const loadedPokemon = [];

    container.innerHTML = "";

    for (let i = 0; i < 10; i++) {

        const pokemonId = team[i];

        if (!pokemonId) {

            const emptySlot = document.createElement("div");

            emptySlot.className = "pokemon-slot";

            emptySlot.innerHTML = `
                <div class="pokemon-slot-number">
                    ${String(i + 1).padStart(2, "0")}
                </div>

                <div class="pokemon-slot-empty">
                    EMPTY SLOT
                </div>
            `;

            container.appendChild(emptySlot);
            continue;
        }

        const slot = document.createElement("div");

        slot.className = "pokemon-slot pokemon-loading";
        slot.textContent = "Loading...";

        container.appendChild(slot);

        try {

            /*
             * Load the normal Pokémon and discover any available forms.
             *
             * The actual alternate form data is still lazy-loaded.
             */
            const pokemon = await PokemonAPI.getPokemonWithForms(pokemonId);

            loadedPokemon.push(pokemon);

            // Index of this Pokémon inside the defensive chart team
            const chartIndex = loadedPokemon.length - 1;

            slot.classList.remove("pokemon-loading");
            slot.classList.add("pokemon-filled");

            slot.innerHTML = "";

            /*
             * Find Mega forms.
             *
             * The normal form is included in pokemon.forms, so we
             * specifically look for forms containing "-mega-".
             */
            const megaForms = pokemon.forms.filter(
                form => /-mega(?:-|$)/.test(form.id)
            );


            /*
             * The current form index starts at 0, which represents
             * the normal drafted Pokémon.
             *
             * The Mega forms follow it.
             */
            let currentFormIndex = 0;

            /*
             * Pokémon sprite
             */
            const sprite = document.createElement("img");

            sprite.className = "pokemon-sprite";
            sprite.src = pokemon.sprite;
            sprite.alt = pokemon.name;

            /*
             * Mega toggle button
             *
             * Only create this button if the Pokémon actually has
             * Mega forms.
             */
            let megaButton = null;

            if (megaForms.length > 0) {

                megaButton = document.createElement("button");

                megaButton.className = "pokemon-mega-toggle";
                megaButton.type = "button";
                megaButton.innerHTML = `
                    <img
                        src="assets/images/mega-icon.png"
                        alt="Mega Evolution"
                    >
                `;
                megaButton.title = "Toggle Mega Evolution";

                /*
                 * Prevent clicking the Mega button from also
                 * expanding/collapsing the Pokémon card.
                 */
                megaButton.addEventListener("click", async event => {

                    event.stopPropagation();

                    /*
                     * Move to the next form.
                     *
                     * 0 = normal Pokémon
                     * 1 = first Mega
                     * 2 = second Mega
                     * etc.
                     *
                     * Once we reach the end, return to normal.
                     */
                    currentFormIndex++;

                    if (currentFormIndex > megaForms.length) {
                        currentFormIndex = 0;
                    }

                    try {

                        let activePokemon;

                        if (currentFormIndex === 0) {

                            // Return to the original normal form
                            activePokemon = pokemon;

                        } else {

                            /*
                             * Load the selected Mega form only when
                             * the user actually chooses it.
                             */
                            const selectedForm =
                                megaForms[currentFormIndex - 1];

                            activePokemon =
                                await PokemonAPI.getPokemonForm(
                                    selectedForm
                                );
                        }

                        /*
                         * Replace the Pokémon currently represented
                         * in the defensive chart.
                         */
                        loadedPokemon[chartIndex] = activePokemon;

                        /*
                         * Update the visible card to match the
                         * selected form.
                         */
                        updatePokemonCard(
                            slot,
                            activePokemon,
                            megaButton
                        );

                        /*
                         * Rebuild the defensive chart so the
                         * current form's typing is represented.
                         */
                        createDefensiveChart(loadedPokemon);

                    } catch (error) {

                        console.error(
                            "Could not load Pokémon form:",
                            error
                        );

                        /*
                         * If loading failed, go back to the previous
                         * form so the button state remains valid.
                         */
                        currentFormIndex--;

                        if (currentFormIndex < 0) {
                            currentFormIndex = megaForms.length;
                        }
                    }
                });

                slot.appendChild(megaButton);
            }


            // Build the initial card
            updatePokemonCard(
                slot,
                pokemon,
                megaButton
            );


            // Expand or collapse Pokémon card
            slot.addEventListener("click", () => {

                const details = slot.querySelector(".pokemon-details");

                if (!details) {
                    return;
                }

                const isOpen = !details.hidden;

                details.hidden = isOpen;

                slot.classList.toggle("expanded", !isOpen);

            });

        } catch (error) {

            slot.classList.remove("pokemon-loading");
            slot.classList.add("pokemon-error");

            slot.textContent = `Couldn't load ${pokemonId}`;

            console.error(error);
        }
    }

    // Generate the chart after the roster has loaded
    createDefensiveChart(loadedPokemon);
}


/*
 * Update the visible Pokémon card with the currently selected form.
 *
 * This function is used both for the original Pokémon and for
 * alternate forms such as Mega Evolutions.
 */
function updatePokemonCard(slot, pokemon, megaButton) {

    /*
     * Remove everything currently inside the card.
     *
     * The Mega button needs to be preserved because its event
     * listener is attached to the existing button element.
     */

    const wasExpanded = slot.classList.contains("expanded");

    slot.querySelectorAll(":scope > *").forEach(element => {

        if (element !== megaButton) {
            element.remove();
        }
    });

    /*
     * Make sure the Mega button remains in the card.
     */
    if (megaButton && !slot.contains(megaButton)) {
        slot.appendChild(megaButton);
    }

    // Pokémon sprite
    const sprite = document.createElement("img");

    sprite.className = "pokemon-sprite";
    sprite.src = pokemon.sprite;
    sprite.alt = pokemon.name;

    // Pokémon name
    const name = document.createElement("div");

    name.className = "pokemon-slot-name";
    name.textContent = pokemon.name;

    // Pokémon types
    const types = document.createElement("div");

    types.className = "pokemon-types";

    pokemon.types.forEach(type => {

        const typeLabel = document.createElement("span");

        typeLabel.className = `pokemon-type type-${type.name}`;
        typeLabel.textContent = type.displayName;

        types.appendChild(typeLabel);
    });

    // Expanded details
    const details = document.createElement("div");

    details.className = "pokemon-details";
    details.hidden = !wasExpanded;

    if (wasExpanded) {
        slot.classList.add("expanded");
    } else {
        slot.classList.remove("expanded");
    }

    // Base stats heading
    const statsHeading = document.createElement("h4");

    statsHeading.textContent = "BASE STATS";

    details.appendChild(statsHeading);

    // Base stats
    const stats = document.createElement("div");

    stats.className = "pokemon-stats";

    const statNames = [
        ["hp", "HP"],
        ["attack", "ATK"],
        ["defense", "DEF"],
        ["special-attack", "SP. ATK"],
        ["special-defense", "SP. DEF"],
        ["speed", "SPEED"]
    ];

    statNames.forEach(([key, label]) => {

        const stat = document.createElement("div");

        stat.className = "pokemon-stat";

        stat.innerHTML = `
            <span>${label}</span>
            <strong>${pokemon.stats[key]}</strong>
        `;

        stats.appendChild(stat);
    });

    details.appendChild(stats);

    // Abilities heading
    const abilityHeading = document.createElement("h4");

    abilityHeading.textContent = "POSSIBLE ABILITIES";

    details.appendChild(abilityHeading);

    // Ability list
    const abilities = document.createElement("div");

    abilities.className = "pokemon-abilities";

    pokemon.abilities.forEach(ability => {

        const abilityContainer = document.createElement("div");

        abilityContainer.className = "pokemon-ability-container";

        // Clickable ability name
        const abilityButton = document.createElement("button");

        abilityButton.className = "pokemon-ability-button";
        abilityButton.type = "button";

        abilityButton.textContent =
            ability.displayName +
            (ability.isHidden ? " (Hidden)" : "");

        // Ability description
        const abilityDescription = document.createElement("div");

        abilityDescription.className = "pokemon-ability-description";
        abilityDescription.hidden = true;

        const shortEffect = document.createElement("p");

        shortEffect.className = "ability-short-effect";
        shortEffect.textContent = ability.shortEffect;

        const fullEffect = document.createElement("p");

        fullEffect.className = "ability-full-effect";
        fullEffect.textContent = ability.effect;

        abilityDescription.appendChild(shortEffect);
        abilityDescription.appendChild(fullEffect);

        // Toggle ability explanation
        abilityButton.addEventListener("click", event => {

            event.stopPropagation();

            const isOpen = !abilityDescription.hidden;

            abilities.querySelectorAll(
                ".pokemon-ability-description"
            ).forEach(description => {
                description.hidden = true;
            });

            abilities.querySelectorAll(
                ".pokemon-ability-button"
            ).forEach(button => {
                button.classList.remove("active");
            });

            if (!isOpen) {

                abilityDescription.hidden = false;

                abilityButton.classList.add("active");
            }
        });

        abilityContainer.appendChild(abilityButton);
        abilityContainer.appendChild(abilityDescription);

        abilities.appendChild(abilityContainer);
    });

    details.appendChild(abilities);

    /*
     * Assemble Pokémon card.
     *
     * The Mega button is already inside the card and is intentionally
     * not recreated here.
     */
    slot.appendChild(sprite);
    slot.appendChild(name);
    slot.appendChild(types);
    slot.appendChild(details);
}


/*
 * Build the defensive type chart
 */
function createDefensiveChart(team) {

    const container = document.getElementById(
        "defensive-chart-container"
    );

    const toggleButton = document.getElementById("toggle-chart");

    if (!container || !toggleButton) {
        return;
    }

    // All 18 attacking types
    const attackingTypes = [
        "normal",
        "fire",
        "water",
        "electric",
        "grass",
        "ice",
        "fighting",
        "poison",
        "ground",
        "flying",
        "psychic",
        "bug",
        "rock",
        "ghost",
        "dragon",
        "dark",
        "steel",
        "fairy"
    ];

    // Display names for type labels
    const formatType = type =>
        type.charAt(0).toUpperCase() + type.slice(1);

    // Create the chart table
    const table = document.createElement("table");

    table.className = "type-chart-table";

    // Header row
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    const typeHeading = document.createElement("th");

    typeHeading.textContent = "ATTACKING TYPE";

    headerRow.appendChild(typeHeading);

    team.forEach(pokemon => {

        const heading = document.createElement("th");

        const sprite = document.createElement("img");

        sprite.src = pokemon.sprite;
        sprite.alt = pokemon.name;
        sprite.className = "type-chart-sprite";

        const name = document.createElement("span");

        name.textContent = pokemon.name;
        name.className = "type-chart-pokemon-name";

        heading.appendChild(sprite);
        heading.appendChild(name);

        headerRow.appendChild(heading);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Chart body
    const tbody = document.createElement("tbody");

    attackingTypes.forEach(attackingType => {

        const row = document.createElement("tr");

        const typeCell = document.createElement("th");

        typeCell.textContent = formatType(attackingType);
        typeCell.className = `type-chart-type type-${attackingType}`;

        row.appendChild(typeCell);

        team.forEach(pokemon => {

            const cell = document.createElement("td");

            const defendingTypes = pokemon.types.map(
                type => type.name
            );

            const multiplier = TypeChart.getMultiplier(
                attackingType,
                defendingTypes
            );

            const value = document.createElement("span");

            value.className = "type-chart-cell";

            if (multiplier === 0) {

                value.textContent = "0×";
                value.classList.add("effectiveness-immune");

            } else if (multiplier < 1) {

                value.textContent = `${multiplier}×`;
                value.classList.add("effectiveness-resist");

            } else if (multiplier > 1) {

                value.textContent = `${multiplier}×`;
                value.classList.add("effectiveness-weak");

            } else {

                value.textContent = "1×";
                value.classList.add("effectiveness-neutral");
            }

            cell.appendChild(value);
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);

    // Add table to a scrollable wrapper
    const wrapper = document.createElement("div");

    wrapper.className = "type-chart-wrapper";
    wrapper.appendChild(table);

    container.innerHTML = "";

    container.appendChild(wrapper);

    // Toggle chart visibility
    toggleButton.onclick = () => {

        const isHidden = container.hidden;

        container.hidden = !isHidden;

        toggleButton.textContent = isHidden
            ? "HIDE DEFENSIVE TYPE CHART"
            : "VIEW DEFENSIVE TYPE CHART";

    };
}


document.addEventListener("DOMContentLoaded", loadPlayer);
