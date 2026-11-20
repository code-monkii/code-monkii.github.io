const PokemonAPI = (() => {

    const API_BASE = "https://pokeapi.co/api/v2/pokemon/";
    const SPECIES_API_BASE = "https://pokeapi.co/api/v2/pokemon-species/";
    const ABILITY_API_BASE = "https://pokeapi.co/api/v2/ability/";

    const SHOWDOWN_SPRITE_BASE =
        "https://play.pokemonshowdown.com/sprites/gen5/";

    // Cache Pokémon, species, and ability requests separately
    const pokemonCache = new Map();
    const speciesCache = new Map();
    const abilityCache = new Map();
    const overrideCache = new Map();
    let overridesPromise = null;


    // Convert identifiers into readable names
    function formatName(name) {
        return name
            .replace(/-/g, " ")
            .replace(/\b\w/g, letter => letter.toUpperCase());
    }

    function getPokemonOverrides() {

        if (!overridesPromise) {
            overridesPromise = fetch("data/pokemon.json")
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Could not load pokemon.json");
                    }
                    return response.json();
                })
                .catch(error => {
                    overridesPromise = null;
                    throw error;
                });
        }

        return overridesPromise;
    }

    async function getPokemonOverride(identifier) {
    const pokemonId = identifier
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");

    if (overrideCache.has(pokemonId)) {
        return overrideCache.get(pokemonId);
    }

    const request = getPokemonOverrides()
        .then(data => data[pokemonId] || null);

    overrideCache.set(pokemonId, request);

    return request;
    }


    // Convert a PokéAPI form ID into its Showdown sprite ID
    function getSpriteId(pokemonId) {

        return pokemonId
            .replace("-mega-x", "-megax")
            .replace("-mega-y", "-megay")
            .replace("-mega-z", "-megaz");
    }


    // Retrieve ability information
    async function getAbility(identifier) {

        const abilityId = identifier.toLowerCase();

        // Return cached ability if available
        if (abilityCache.has(abilityId)) {
            return abilityCache.get(abilityId);
        }

        const request = fetch(
            `${ABILITY_API_BASE}${encodeURIComponent(abilityId)}`
        )
            .then(async response => {

                if (!response.ok) {
                    throw new Error(
                        `Ability "${abilityId}" could not be found. Status: ${response.status}`
                    );
                }

                const text = await response.text();

                if (!text) {
                    throw new Error(
                        `Ability "${abilityId}" returned an empty response.`
                    );
                }

                try {
                    return JSON.parse(text);
                } catch (error) {
                    throw new Error(
                        `Ability "${abilityId}" returned invalid JSON.`
                    );
                }
            })
            .then(data => {

                // Find the English description
                const englishEffect = data.effect_entries.find(
                    entry => entry.language.name === "en"
                );

                return {
                    name: data.name,
                    displayName: formatName(data.name),

                    shortEffect:
                        englishEffect?.short_effect ||
                        "No short description available.",

                    effect:
                        englishEffect?.effect ||
                        "No detailed description available."
                };
            })
            .catch(error => {

                // Allow failed requests to be retried
                abilityCache.delete(abilityId);

                throw error;
            });

        abilityCache.set(abilityId, request);

        return request;
    }


    // Retrieve available Pokémon varieties/forms
    async function getPokemonForms(identifier) {

        const speciesId = identifier
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-");

        // Return cached species information if available
        if (speciesCache.has(speciesId)) {
            return speciesCache.get(speciesId);
        }

        const request = fetch(
            `${SPECIES_API_BASE}${encodeURIComponent(speciesId)}`
        )
            .then(response => {

                if (!response.ok) {
                    throw new Error(
                        `Pokémon species "${speciesId}" could not be found.`
                    );
                }

                return response.json();
            })
            .then(data => {

                /*
                 * PokéAPI provides all varieties for the species.
                 *
                 * We only want forms that are relevant to the tournament.
                 * G-Max forms are excluded because they are not legal in
                 * our format.
                 */
                return data.varieties
                    .filter(variety => {

                        const varietyId = variety.pokemon.name;

                        return !varietyId.includes("-gmax");
                    })
                    .map(variety => {

                        const varietyId = variety.pokemon.name;

                        return {
                            id: varietyId,
                            name: formatName(varietyId),

                            // The URL points directly to the Pokémon API
                            apiUrl: variety.pokemon.url,

                            /*
                             * PokéAPI and Showdown sometimes use slightly
                             * different names for the same form.
                             *
                             * getSpriteId() handles predictable naming
                             * differences automatically.
                             */
                            spriteId: getSpriteId(varietyId)
                        };
                    });
            })
            .catch(error => {

                // Allow failed species requests to be retried
                speciesCache.delete(speciesId);

                throw error;
            });

        speciesCache.set(speciesId, request);

        return request;
    }


    // Retrieve Pokémon information
    async function getPokemon(identifier, spriteId = identifier) {

        const pokemonId = identifier
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-");

        // Check whether we already requested this Pokémon
        if (!pokemonCache.has(pokemonId)) {

            const request = fetch(
                `${API_BASE}${encodeURIComponent(pokemonId)}`
            )
                .then(response => {

                    if (!response.ok) {
                        throw new Error(
                            `Pokémon "${pokemonId}" could not be found.`
                        );
                    }

                    return response.json();
                })
                .then(async data => {

                    // Organize base stats
                    const stats = {};

                    data.stats.forEach(stat => {
                        stats[stat.stat.name] = stat.base_stat;
                    });

                    // Organize types
                    const types = data.types
                        .sort((a, b) => a.slot - b.slot)
                        .map(entry => ({
                            name: entry.type.name,
                            displayName: formatName(entry.type.name)
                        }));

                    // Retrieve abilities and their descriptions
                    const abilities = await Promise.all(
                        data.abilities.map(async entry => {

                            try {

                                const ability = await getAbility(
                                    entry.ability.name
                                );

                                return {
                                    ...ability,
                                    isHidden: entry.is_hidden
                                };

                            } catch (error) {

                                console.warn(
                                    `Could not load ability: ${entry.ability.name}`,
                                    error
                                );

                                return {
                                    name: entry.ability.name,
                                    displayName: formatName(
                                        entry.ability.name
                                    ),
                                    shortEffect: "Description unavailable.",
                                    effect: "Description unavailable.",
                                    isHidden: entry.is_hidden
                                };
                            }
                        })
                    );

                    // Return organized Pokémon information
                    return {
                        id: data.name,
                        name: formatName(data.name),
                        types: types,
                        stats: stats,
                        abilities: abilities
                    };
                })
                .catch(error => {

                    // Allow failed requests to be retried
                    pokemonCache.delete(pokemonId);

                    throw error;
                });

            pokemonCache.set(pokemonId, request);
        }

        // Wait for the cached Pokémon data
        const pokemonData = await pokemonCache.get(pokemonId);

        // Generate the sprite URL separately
        return {
            ...pokemonData,
            sprite:
                `${SHOWDOWN_SPRITE_BASE}${spriteId.toLowerCase()}.png`
        };
    }


    /*
     * Retrieve a Pokémon and discover its available forms.
     *
     * The normal Pokémon data is loaded immediately.
     * Alternate forms are only identified here; their full data is NOT
     * fetched until getPokemonForm() is called.
     */
    async function getPokemonWithForms(identifier, spriteId = identifier) {

        // Load the override so we can check for manually defined forms
        const override = await getPokemonOverride(identifier);

        let pokemon;

        try {

            // Try the normal Pokémon API request first
            pokemon = await getPokemon(identifier, spriteId);

        } catch (error) {

            // If the normal request fails, try the override API identifier
            if (!override?.api) {
                throw error;
            }

            console.warn(
                `Could not load Pokémon "${identifier}". Trying override...`,
                error
            );

            pokemon = await getPokemon(
                override.api,
                override.sprite || spriteId
            );
        }

        let forms = [];

        // Use manually defined forms when available
        if (override?.forms?.length) {

            forms = override.forms.map(form => ({
                id: form.id,
                name: formatName(`${identifier}-${form.id}`),
                api: form.api,
                spriteId: form.sprite || getSpriteId(form.api)
            }));

        } else {

            // Otherwise, retrieve forms normally from PokéAPI
            try {
                forms = await getPokemonForms(identifier);
            } catch (error) {
                console.warn(
                    `Could not load forms for Pokémon "${identifier}".`,
                    error
                );
            }
        }

        return {
            ...pokemon,
            forms,
            smogon: override?.smogon || pokemon.id
        };
    }


    /*
     * Retrieve the complete data for a specific alternate form.
     *
     * This is intentionally separate from getPokemonWithForms() so Mega
     * Pokémon are loaded only when the user actually selects them.
     */
    async function getPokemonForm(form) {

        return getPokemon(
            form.api || form.id,
            form.spriteId
        );
    }

    function preloadSprite(spriteId) {

        if (!spriteId) {
            return Promise.resolve(false);
        }

        const url = `${SHOWDOWN_SPRITE_BASE}${spriteId.toLowerCase()}.png`;

        if (typeof window === "undefined") {
            return Promise.resolve(false);
        }

        return new Promise(resolve => {
            const image = new Image();
            image.onload = () => resolve(true);
            image.onerror = () => resolve(false);
            image.src = url;
        });
    }


    return {
        getPokemon,
        getPokemonWithForms,
        getPokemonForm,
        getPokemonForms,
        getAbility,
        preloadSprite
    };

})();
