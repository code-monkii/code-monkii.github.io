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

        data.players.forEach(player => {
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

    // Remove existing active states
    document.querySelectorAll("nav a, nav .nav-dropdown-label").forEach(element => {
        element.classList.remove("active");
    });

    // Home page
    if (currentPage === "" || currentPage === "index.html") {
        document.querySelector('nav a[href="index.html"]')
            ?.classList.add("active");
    }

    // Rules page
    else if (currentPage === "rules.html") {
        document.querySelector('nav a[href="rules.html"]')
            ?.classList.add("active");
    }

    // Trainer pages
    else if (currentPage === "player.html") {
        document.querySelector(".nav-dropdown-label")
            ?.classList.add("active");
    }
}


/* =========================
   START
========================= */

document.addEventListener("DOMContentLoaded", async () => {
    await loadPartial("site-header", "partials/header.html");
    await loadPartial("site-footer", "partials/footer.html");

    await loadTrainers();
});