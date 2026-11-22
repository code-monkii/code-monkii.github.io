/* =========================
   LOAD RULES
========================= */

async function loadRules() {
    try {
        const response = await fetch("data/rules.json");

        if (!response.ok) {
            throw new Error(
                `Could not load rules.json: ${response.status}`
            );
        }

        const rules = await response.json();

        renderClauses(rules.clauses);

        renderItemList(
            rules.items,
            "banned-items-container"
        );

        renderList(
            rules.abilities,
            "banned-abilities-container"
        );

        renderList(
            rules.moves,
            "banned-moves-container"
        );

        renderPokemonList(
            rules.pokemon,
            "banned-pokemon-container"
        );

        renderPokemonList(
            rules["mega-pokemon"],
            "banned-mega-pokemon-container"
        );

    } catch (error) {
        console.error("Could not load tournament rules:", error);
    }
}


/* =========================
   CLAUSES
========================= */

function renderClauses(clauses) {
    const container =
        document.getElementById("clauses-container");

    if (!container) return;

    container.innerHTML = "";

    clauses.forEach(clause => {
        const card = document.createElement("div");
        card.className = "clause-card";

        const title = document.createElement("h3");
        title.textContent = clause.title;

        const description = document.createElement("p");
        description.textContent = clause.description;

        card.appendChild(title);
        card.appendChild(description);

        container.appendChild(card);
    });
}


/* =========================
   BANNED ITEMS
========================= */

function renderItemList(items, containerId) {
    const container =
        document.getElementById(containerId);

    if (!container) return;

    container.innerHTML = "";

    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "banlist-entry banlist-description-entry";

        const sprite = document.createElement("img");
        sprite.className = "banlist-sprite";
        sprite.src =
            `https://play.pokemonshowdown.com/sprites/itemicons/${item.id}.png`;
        sprite.alt = item.name;

        const name = document.createElement("span");
        name.textContent = item.name;

        const description = document.createElement("p");
        description.className = "banlist-description";
        description.textContent = "Loading description...";
        description.hidden = true;

        card.appendChild(sprite);
        card.appendChild(name);
        card.appendChild(description);
        setupBanlistDescriptionToggle(card, description);
        container.appendChild(card);

        fetchApiDescription("item", item.id).then(text => {
            description.textContent = text;
        });
    });
}


/* =========================
   BANNED ABILITIES / MOVES
========================= */

function renderList(entries, containerId) {
    const container =
        document.getElementById(containerId);

    if (!container) return;

    container.innerHTML = "";

    const isAbilityList = containerId.includes("abilities");

    entries.forEach(entry => {
        const card = document.createElement("div");
        card.className = "banlist-entry banlist-description-entry";

        const name = document.createElement("span");
        name.textContent = entry.name;

        const description = document.createElement("p");
        description.className = "banlist-description";
        description.textContent = "Loading description...";
        description.hidden = true;

        card.appendChild(name);
        card.appendChild(description);
        container.appendChild(card);

        if (isAbilityList && typeof PokemonAPI !== "undefined") {

            PokemonAPI.getAbility(normalizeRulesApiId(entry.id))
                .then(ability => {
                    description.textContent =
                        ability.effect || "Description unavailable.";
                })
                .catch(() => {
                    description.textContent = "Description unavailable.";
                });

        } else {

            fetchApiDescription("move", entry.id).then(text => {
                description.textContent = text;
            });
        }

        setupBanlistDescriptionToggle(card, description);
    });
}


/* =========================
   BANNED POKÉMON / MEGAS
========================= */

function normalizePokemonApiId(id) {
    return id
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/-megax$/, "-mega-x")
        .replace(/-megay$/, "-mega-y")
        .replace(/-megaz$/, "-mega-z");
}

async function renderPokemonList(pokemonIds, containerId) {
    const container =
        document.getElementById(containerId);

    if (!container) return;

    container.innerHTML = "";

    await Promise.all(
        pokemonIds.map(async pokemonId => {

            const card = document.createElement("div");
            card.className = "banlist-entry";

            const sprite = document.createElement("img");
            sprite.className = "banlist-sprite";
            sprite.alt = formatPokemonName(pokemonId);
            sprite.src = "/assets/images/missingno.png";

            const name = document.createElement("span");
            name.textContent = formatPokemonName(pokemonId);

            card.appendChild(sprite);
            card.appendChild(name);
            container.appendChild(card);

            try {

                const pokemon = await PokemonAPI.getPokemon(
                    normalizePokemonApiId(pokemonId)
                );

                if (pokemon.sprite) {
                    sprite.src = pokemon.sprite;
                }

            } catch (error) {

                console.warn(
                    `Could not load API sprite for ${pokemonId}:`,
                    error
                );
            }
        })
    );
}


/* =========================
   FORMAT POKÉMON NAMES
========================= */

function formatPokemonName(id) {
    return id
        .replace(/-megax$/i, " Mega X")
        .replace(/-megay$/i, " Mega Y")
        .replace(/-megaz$/i, " Mega Z")
        .replace(/-mega$/i, " Mega")
        .replace(/-/g, " ")
        .replace(/\b\w/g, letter =>
            letter.toUpperCase()
        );
}


/* =========================
   START
========================= */

document.addEventListener(
    "DOMContentLoaded",
    loadRules
);

/* =========================
   API DESCRIPTION FETCHING
========================= */

const RULES_API_BASE = "https://pokeapi.co/api/v2/";

function normalizeRulesApiId(id) {
    const normalizedIds = {
        brightpowder: "bright-powder",
        sandveil: "sand-veil",
        snowcloak: "snow-cloak",
        doubleteam: "double-team",
        sleeppowder: "sleep-powder",
        kingsrock: "kings-rock"
    };

    const normalized = id
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");

    return normalizedIds[normalized] || normalized;
}

async function fetchApiDescription(endpoint, id) {

    try {

        const response = await fetch(
            `${RULES_API_BASE}${endpoint}/${encodeURIComponent(normalizeRulesApiId(id))}`
        );

        if (!response.ok) {
            return "Description unavailable.";
        }

        const data = await response.json();

        if (endpoint === "item") {

            const englishEntry = data.effect_entries?.find(
                entry => entry.language.name === "en"
            );

            return englishEntry?.effect
                ?.replace(/\s+/g, " ")
                .trim() || "Description unavailable.";
        }

        const englishEntry = data.effect_entries?.find(
            entry => entry.language.name === "en"
        );

        return englishEntry?.effect
            ?.replace(/\s+/g, " ")
            .trim() || "Description unavailable.";

    } catch (error) {

        console.warn(`Could not load ${endpoint} description for ${id}:`, error);
        return "Description unavailable.";
    }
}

/* =========================
   TOGGLE DESCRIPTION
========================= */

function setupBanlistDescriptionToggle(card, description) {
    card.classList.add("banlist-description-entry");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-expanded", "false");
    description.hidden = true;

    const toggleDescription = () => {

        const isOpen = !description.hidden;

        card.closest(".banlist-grid")
            ?.querySelectorAll(".banlist-description")
            .forEach(otherDescription => {

                if (otherDescription !== description) {
                    otherDescription.hidden = true;

                    const otherCard = otherDescription.closest(".banlist-entry");
                    otherCard?.classList.remove("active");
                    otherCard?.setAttribute("aria-expanded", "false");
                }
            });

        description.hidden = isOpen;
        card.classList.toggle("active", !isOpen);
        card.setAttribute("aria-expanded", String(!isOpen));
    };

    card.addEventListener("click", toggleDescription);

    card.addEventListener("keydown", event => {

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleDescription();
        }
    });
}
