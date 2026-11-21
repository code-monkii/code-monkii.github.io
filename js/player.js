function getStatColor(value) {
    const stops = [
        { value: 0, color: [255, 0, 0] },
        { value: 60, color: [255, 50, 0] },
        { value: 95, color: [255, 228, 0] },
        { value: 130, color: [102, 255, 0] },
        { value: 255, color: [102, 255, 0] }
    ];

    let lower = stops[0];
    let upper = stops[stops.length - 1];

    for (let i = 0; i < stops.length - 1; i++) {
        if (value <= stops[i + 1].value) {
            lower = stops[i];
            upper = stops[i + 1];
            break;
        }
    }

    const progress = (value - lower.value) /
        (upper.value - lower.value);

    const rgb = lower.color.map((channel, i) =>
        Math.round(channel + (upper.color[i] - channel) * progress)
    );

    return `rgb(${rgb.join(", ")})`;
}

function createPokemonSprite(pokemon, className, previousSprite = null) {

    const sprite = document.createElement("img");
    const transparentPlaceholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E";

    sprite.className = className;
    sprite.alt = pokemon.name;

    const previousSpriteIsMissingNo = previousSprite
        ?.includes("/assets/images/missingno.png");

    // Keep a real previous sprite visible while loading. For a first load,
    // use an invisible placeholder instead of leaving src empty or showing
    // a broken-image icon.
    if (previousSprite && !previousSpriteIsMissingNo) {
        sprite.src = previousSprite;
    } else if (pokemon.sprite) {
        sprite.src = transparentPlaceholder;
    } else {
        sprite.src = "/assets/images/missingno.png";
    }

    if (pokemon.sprite) {

        const actualSprite = new Image();

        actualSprite.onload = () => {
            sprite.src = pokemon.sprite;
        };

        actualSprite.onerror = () => {
            sprite.src = "/assets/images/missingno.png";
            console.log(`No sprite available for ${pokemon.name}`);
        };

        actualSprite.src = pokemon.sprite;
    }

    return sprite;
}

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
    const megaControllers = [];

    container.innerHTML = "";

    const loadTasks = [];
    let chartIndex = -1;

    for (let i = 0; i < 10; i++) {

        const pokemonId = team[i];

        if (!pokemonId) {

            const emptySlot = document.createElement("div");

            emptySlot.className = "pokemon-slot";
            emptySlot.dataset.originalIndex = i;

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
        slot.dataset.originalIndex = i;
        slot.textContent = "Loading...";

        container.appendChild(slot);

        chartIndex++;
        const thisChartIndex = chartIndex;

        loadTasks.push((async () => {

            try {

                /*
                 * Load the normal Pokémon and discover any available forms.
                 *
                 * The actual alternate form data is still lazy-loaded.
                 */
                const pokemon = await PokemonAPI.getPokemonWithForms(pokemonId);

                loadedPokemon[thisChartIndex] = pokemon;

                slot.classList.remove("pokemon-loading");
                slot.classList.add("pokemon-filled");

                slot.innerHTML = "";

                // Find Mega Evolutions
                const megaForms = pokemon.forms.filter(
                    form => /-mega(?:-|$)/.test(form.id)
                );

                // Find Aegislash's alternate form
                const alternateForms = pokemon.forms.filter(
                    form => form.api === "aegislash-blade"
                );

                // Combine the available toggle forms
                const toggleForms = [...megaForms, ...alternateForms];

                let currentFormIndex = 0;

                const megaController = {
                    toggle: async () => {

                        const previousFormIndex = currentFormIndex;

                        currentFormIndex++;

                        if (currentFormIndex > toggleForms.length) {
                            currentFormIndex = 0;
                        }

                        try {

                            let activePokemon;

                            if (currentFormIndex === 0) {
                                activePokemon = pokemon;

                            } else {

                                const selectedForm = toggleForms[currentFormIndex - 1];

                                activePokemon =
                                    await PokemonAPI.getPokemonForm(selectedForm);
                            }

                            loadedPokemon[thisChartIndex] = activePokemon;

                            updatePokemonCard(
                                slot,
                                activePokemon,
                                megaButton
                            );

                            createDefensiveChart(
                                loadedPokemon,
                                megaControllers
                            );

                        } catch (error) {

                            console.error(
                                "Could not load Pokémon form:",
                                error
                            );

                            currentFormIndex = previousFormIndex;
                        }
                    }
                };

                if (toggleForms.length > 0) {
                    megaControllers[thisChartIndex] = megaController;
                }

                let megaButton = null;

                if (toggleForms.length > 0) {

                    megaButton = document.createElement("button");

                    megaButton.className = "pokemon-mega-toggle";
                    megaButton.type = "button";

                    const isMegaToggle = megaForms.length > 0;

                    megaButton.innerHTML = `
                        <img
                            src="assets/images/${isMegaToggle ? "mega-icon" : "form-icon"}.png"
                            alt="${isMegaToggle ? "Mega Evolution" : "Alternate Form"}"
                        >
                    `;

                    megaButton.title = isMegaToggle
                        ? "Toggle Mega Evolution"
                        : "Toggle Pokémon Form";

                    megaButton.addEventListener("pointerenter", () => {
                        toggleForms.forEach(form => {
                            PokemonAPI.getPokemonForm(form).catch(() => {});
                            PokemonAPI.preloadSprite(form.spriteId);
                        });
                    });

                    megaButton.addEventListener("click", async event => {
                        event.stopPropagation();
                        await megaController.toggle();
                    });

                    slot.appendChild(megaButton);
                }

                updatePokemonCard(
                    slot,
                    pokemon,
                    megaButton
                );

                slot.addEventListener("click", () => {
                    const details = slot.querySelector(".pokemon-details");
                    if (!details) return;

                    const isOpen = !details.hidden;

                    if (isOpen) {
                        // Collapse this Pokémon
                        details.hidden = true;
                        slot.classList.remove("expanded");

                        restorePokemonSlotOrder(container);
                    } else {
                        // Find the previously expanded cards BEFORE expanding this one
                        const expandedSlots = Array.from(
                            container.querySelectorAll(".pokemon-slot.expanded")
                        );

                        const lastExpanded = expandedSlots[expandedSlots.length - 1];

                        // Expand this Pokémon
                        details.hidden = false;
                        slot.classList.add("expanded");

                        // Place it after the previously expanded card
                        if (lastExpanded) {
                            lastExpanded.after(slot);
                        } else {
                            container.prepend(slot);
                        }
                    }
                });

            } catch (error) {

                slot.classList.remove("pokemon-loading");
                slot.classList.add("pokemon-error");

                slot.textContent = `Couldn't load ${pokemonId}`;

                console.error(error);
            }
        })());
    }

    await Promise.all(loadTasks);

    const compactTeam = loadedPokemon.filter(Boolean);
    createDefensiveChart(compactTeam, megaControllers);
}

/* =========================
   RESTORE POKÉMON ORDER
========================= */
function restorePokemonSlotOrder(container) {
    const slots = Array.from(container.children);

    const expandedSlots = slots.filter(slot =>
        slot.classList.contains("expanded")
    );

    const collapsedSlots = slots
        .filter(slot => !slot.classList.contains("expanded"))
        .sort((a, b) =>
            Number(a.dataset.originalIndex) -
            Number(b.dataset.originalIndex)
        );

    [...expandedSlots, ...collapsedSlots].forEach(slot => {
        container.appendChild(slot);
    });
}


/*
 * Update the visible Pokémon card with the currently selected form.
 *
 * This function is used both for the original Pokémon and for
 * alternate forms such as Mega Evolutions.
 */
function updatePokemonCard(slot, pokemon, megaButton) {

    const previousSprite = slot.querySelector(".pokemon-sprite")?.src;

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
    const sprite = createPokemonSprite(
        pokemon,
        "pokemon-sprite",
        previousSprite
    );

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
        const value = Number(pokemon.stats[key]) || 0;
        const barWidth = Math.min(100, Math.max(0, (value / 255) * 100));
        const colorProgress = Math.min(1, Math.max(0, (value - 40) / 100));
        const statColor = getStatColor(value);

        stat.className = "pokemon-stat";

        stat.innerHTML = `
            <div class="pokemon-stat-label">
                <span>${label}</span>
                <strong>${value}</strong>
            </div>
            <div
                class="pokemon-stat-bar"
                role="progressbar"
                aria-label="${label}: ${value}"
                aria-valuemin="0"
                aria-valuemax="255"
                aria-valuenow="${value}"
            >
                <span style="width: ${barWidth}%; background-color: ${statColor}"></span>
            </div>
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

        //const shortEffect = document.createElement("p");

        //shortEffect.className = "ability-short-effect";
        //shortEffect.textContent = ability.shortEffect;

        const fullEffect = document.createElement("p");

        fullEffect.className = "ability-full-effect";
        fullEffect.textContent = ability.effect;

        //abilityDescription.appendChild(shortEffect);
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

    const smogonLink = document.createElement("a");

    smogonLink.className = "pokemon-smogon-link";
    smogonLink.href = `https://www.smogon.com/dex/champions/pokemon/${pokemon.smogon || pokemon.id}/`;
    smogonLink.target = "_blank";
    smogonLink.rel = "noopener noreferrer";
    smogonLink.textContent = "View on Smogon";


    details.appendChild(abilities);
        /*
     * Assemble Pokémon card.
     *
     * The sprite, name, and types stay together in a summary column.
     * The Mega/Form button is also anchored to this column instead of
     * the entire expanded card.
     */

    const summary = document.createElement("div");
    summary.className = "pokemon-card-summary";

    summary.appendChild(sprite);
    summary.appendChild(name);
    summary.appendChild(types);

    if (megaButton) {
        summary.appendChild(megaButton);
    }

    slot.appendChild(summary);
    slot.appendChild(details);
    details.appendChild(smogonLink);
}


/*
 * Build the defensive type chart
 */
function createDefensiveChart(team, megaControllers = []) {

    const container = document.getElementById(
        "defensive-chart-container"
    );

    const toggleButton = document.getElementById("toggle-chart");

    if (!container || !toggleButton) {
        return;
    }

    const previousChartSprites = Array.from(
        container.querySelectorAll(".type-chart-pokemon-heading img"),
        image => image.src
    );

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

    team.forEach((pokemon, chartIndex) => {

        const heading = document.createElement("th");
        heading.className = "type-chart-pokemon-heading";

        const sprite = createPokemonSprite(
            pokemon,
            "type-chart-sprite",
            previousChartSprites[chartIndex]
        );

        const name = document.createElement("span");
        name.className = "type-chart-pokemon-name";
        name.textContent = pokemon.name;

        heading.appendChild(sprite);


        // Add a Mega toggle when this Pokémon has Mega forms
        const megaController = megaControllers[chartIndex];

        if (megaController) {

            const megaButton = document.createElement("button");

            megaButton.className = "type-chart-mega-toggle";
            megaButton.type = "button";
            megaButton.title = `Toggle Mega Evolution for ${pokemon.name}`;
            megaButton.setAttribute(
                "aria-label",
                `Toggle Mega Evolution for ${pokemon.name}`
            );

            megaButton.innerHTML = `
                <img
                    src="assets/images/mega-icon.png"
                    alt=""
                >
            `;

            megaButton.addEventListener("click", async event => {

                event.stopPropagation();

                megaButton.disabled = true;

                try {
                    await megaController.toggle();
                } finally {
                    megaButton.disabled = false;
                }
            });

            heading.appendChild(megaButton);
        }

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