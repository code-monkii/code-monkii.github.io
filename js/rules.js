
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
        card.className = "banlist-entry";

        const sprite = document.createElement("img");
        sprite.className = "banlist-sprite";
        sprite.src =
            `https://play.pokemonshowdown.com/sprites/itemicons/${item.id}.png`;
        sprite.alt = item.name;

        const name = document.createElement("span");
        name.textContent = item.name;

        card.appendChild(sprite);
        card.appendChild(name);

        container.appendChild(card);
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

    entries.forEach(entry => {
        const card = document.createElement("div");
        card.className = "banlist-entry";

        const name = document.createElement("span");
        name.textContent = entry.name;

        card.appendChild(name);

        container.appendChild(card);
    });
}


/* =========================
   BANNED POKÉMON / MEGAS
========================= */

function renderPokemonList(pokemonIds, containerId) {
    const container =
        document.getElementById(containerId);

    if (!container) return;

    container.innerHTML = "";

    pokemonIds.forEach(pokemonId => {
        const card = document.createElement("div");
        card.className = "banlist-entry";

        const sprite = document.createElement("img");
        sprite.className = "banlist-sprite";
        sprite.src =
            `https://play.pokemonshowdown.com/sprites/gen5/${pokemonId}.png`;
        sprite.alt = formatPokemonName(pokemonId);

        const name = document.createElement("span");
        name.textContent = formatPokemonName(pokemonId);

        card.appendChild(sprite);
        card.appendChild(name);

        container.appendChild(card);
    });
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
