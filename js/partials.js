/* =========================
   LOAD SHARED PARTIALS
========================= */

async function loadPartial(elementId, filePath) {
    const container = document.getElementById(elementId);

    if (!container) return;

    try {
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(`Could not load ${filePath}`);
        }

        container.innerHTML = await response.text();

        if (elementId === "site-header") {
            updateActiveNav();
            initializeMobileNavigation();
}

    } catch (error) {
        console.error(error);
    }
}


/* =========================
   LOAD TRAINER DROPDOWN
========================= */

async function loadTrainers() {
    const container = document.getElementById("trainer-dropdown");

    if (!container) return;

    try {
        const response = await fetch("data/players.json");

        if (!response.ok) {
            throw new Error("Could not load players.json");
        }

        const data = await response.json();

        container.innerHTML = "";

        const sortedPlayers = [...data.players].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, {
                sensitivity: "base"
            })
        );

        sortedPlayers.forEach(player => {
            const link = document.createElement("a");

            link.href = `player.html?id=${encodeURIComponent(player.id)}`;
            link.textContent = player.name;

            container.appendChild(link);
        });

    } catch (error) {
        console.error("Could not load trainers:", error);
        container.textContent = "Could not load trainers";
    }
}

function updateActiveNav() {
    const currentPage = window.location.pathname.split("/").pop();

    document.querySelectorAll("nav a, nav .nav-dropdown-label").forEach(element => {
        element.classList.remove("active");
    });

    if (currentPage === "" || currentPage === "index.html") {
        document.querySelector('nav a[href="index.html"]')
            ?.classList.add("active");
    } else if (currentPage === "schedule.html") {
        document.querySelector('nav a[href="schedule.html"]')
            ?.classList.add("active");
    } else if (currentPage === "rules.html" || currentPage === "status.html") {
        document.querySelector('[aria-controls="guide-dropdown"]')
            ?.classList.add("active");
    } else if (currentPage === "player.html") {
        document.querySelector('[aria-controls="trainer-dropdown"]')
            ?.classList.add("active");
    }
}


function initializeMobileNavigation() {
    const menuToggle = document.querySelector(".menu-toggle");
    const navigation = document.getElementById("main-navigation");

    if (!menuToggle || !navigation || menuToggle.dataset.initialized === "true") return;

    const dropdowns = [...navigation.querySelectorAll(".nav-dropdown")];

    menuToggle.dataset.initialized = "true";

    const closeMenu = () => {
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation menu");
        navigation.classList.remove("is-open");

        dropdowns.forEach(dropdown => {
            dropdown.classList.remove("open");
            dropdown.querySelector(".nav-dropdown-label")
                ?.setAttribute("aria-expanded", "false");
        });
    };

    menuToggle.addEventListener("click", () => {
        const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
        menuToggle.setAttribute("aria-expanded", String(!isOpen));
        menuToggle.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
        navigation.classList.toggle("is-open", !isOpen);

        if (isOpen) {
            dropdowns.forEach(dropdown => dropdown.classList.remove("open"));
        }
    });

    dropdowns.forEach(dropdown => {
        const dropdownToggle = dropdown.querySelector(".nav-dropdown-label");

        dropdownToggle?.addEventListener("click", event => {
            if (!window.matchMedia("(max-width: 600px)").matches) return;

            event.preventDefault();

            dropdowns.forEach(otherDropdown => {
                if (otherDropdown !== dropdown) {
                    otherDropdown.classList.remove("open");
                    otherDropdown.querySelector(".nav-dropdown-label")
                        ?.setAttribute("aria-expanded", "false");
                }
            });

            const isOpen = dropdown.classList.toggle("open");
            dropdownToggle.setAttribute("aria-expanded", String(isOpen));
        });
    });

    navigation.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 600) closeMenu();
    });
}


/* =========================
   START
========================= */

document.addEventListener("DOMContentLoaded", async () => {
    await loadPartial("site-header", "partials/header.html");
    await loadPartial("site-footer", "partials/footer.html");

    await loadTrainers();

});