
const TypeChart = (() => {

    // Types that an attacking type hits super-effectively
    const weaknesses = {
        normal: [],
        fire: ["grass", "ice", "bug", "steel"],
        water: ["fire", "ground", "rock"],
        electric: ["water", "flying"],
        grass: ["water", "ground", "rock"],
        ice: ["grass", "ground", "flying", "dragon"],
        fighting: ["normal", "ice", "rock", "dark", "steel"],
        poison: ["grass", "fairy"],
        ground: ["fire", "electric", "poison", "rock", "steel"],
        flying: ["grass", "fighting", "bug"],
        psychic: ["fighting", "poison"],
        bug: ["grass", "psychic", "dark"],
        rock: ["fire", "ice", "flying", "bug"],
        ghost: ["psychic", "ghost"],
        dragon: ["dragon"],
        dark: ["psychic", "ghost"],
        steel: ["ice", "rock", "fairy"],
        fairy: ["fighting", "dragon", "dark"]
    };

    // Types that an attacking type is resisted by
    const resistances = {
        normal: ["rock", "steel"],
        fire: ["fire", "water", "rock", "dragon"],
        water: ["water", "grass", "dragon"],
        electric: ["electric", "grass", "dragon"],
        grass: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
        ice: ["fire", "water", "ice", "steel"],
        fighting: ["poison", "flying", "psychic", "bug", "fairy"],
        poison: ["poison", "ground", "rock", "ghost"],
        ground: ["grass", "bug"],
        flying: ["electric", "rock", "steel"],
        psychic: ["psychic", "steel"],
        bug: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"],
        rock: ["fighting", "ground", "steel"],
        ghost: ["dark"],
        dragon: ["steel"],
        dark: ["fighting", "dark", "fairy"],
        steel: ["fire", "water", "electric", "steel"],
        fairy: ["fire", "poison", "steel"]
    };

    // Types that are completely immune to an attacking type
    const immunities = {
        normal: ["ghost"],
        fire: [],
        water: [],
        electric: ["ground"],
        grass: [],
        ice: [],
        fighting: ["ghost"],
        poison: ["steel"],
        ground: ["flying"],
        flying: [],
        psychic: ["dark"],
        bug: [],
        rock: [],
        ghost: ["normal"],
        dragon: ["fairy"],
        dark: [],
        steel: [],
        fairy: []
    };

    function getMultiplier(attackingType, defendingTypes) {

        let multiplier = 1;

        for (const defendingType of defendingTypes) {

            if (immunities[attackingType]?.includes(defendingType)) {
                return 0;
            }

            if (weaknesses[attackingType]?.includes(defendingType)) {
                multiplier *= 2;
            }

            if (resistances[attackingType]?.includes(defendingType)) {
                multiplier *= 0.5;
            }
        }

        return multiplier;
    }

    return {
        getMultiplier
    };

})();
