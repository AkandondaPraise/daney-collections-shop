
/* Daney Collections - Website JavaScript */

document.addEventListener("DOMContentLoaded", function () {

    // Display the current year in the footer
    const yearElement = document.getElementById("year");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    console.log("Welcome to Daney Collections!");

    // Smooth scrolling for links to sections on the same page
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener("click", function (event) {
            const targetId = link.getAttribute("href");

            if (!targetId || targetId === "#") return;

            const target = document.querySelector(targetId);

            if (target) {
                event.preventDefault();
                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    });

    // Load products from Supabase on category pages
    const productContainer = document.getElementById("categoryProducts");
    const mainElement = document.querySelector("main[data-category]");

    if (!productContainer || !mainElement) return;

    const category = mainElement.dataset.category;

    productContainer.replaceChildren();

    const loadingMessage = document.createElement("p");
    loadingMessage.textContent = "Loading our beautiful collection...";
    productContainer.appendChild(loadingMessage);

    async function loadProducts() {
        try {
            // Load the Supabase library if it is not already available
            if (!window.supabase) {
                await new Promise(function (resolve, reject) {
                    const script = document.createElement("script");
                    script.src =
                        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

                    script.onload = resolve;
                    script.onerror = function () {
                        reject(new Error("Could not load the online shop service."));
                    };

                    document.head.appendChild(script);
                });
            }

            // Load the website's existing Supabase settings
            if (typeof SUPABASE_URL === "undefined" ||
                typeof SUPABASE_PUBLISHABLE_KEY === "undefined") {

                await new Promise(function (resolve, reject) {
                    const script = document.createElement("script");
                    script.src = "supabase-config.js";

                    script.onload = resolve;
                    script.onerror = function () {
                        reject(new Error("Could not load Supabase settings."));
                    };

                    document.head.appendChild(script);
                });
            }

            const db = window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY
            );

            const { data: products, error } = await db
                .from("products")
                .select("id, name, price, category, image_url, available")
                .eq("category", category)
                .eq("available", true)
                .order("created_at", { ascending: false });

            if (error) throw error;

            productContainer.replaceChildren();

            if (!products || products.length === 0) {
                const emptyMessage = document.createElement("p");
                emptyMessage.className = "empty-collection";
                emptyMessage.textContent =
                    "Our collection is coming soon. Please check back shortly!";
                productContainer.appendChild(emptyMessage);
                return;
            }

            products.forEach(function (product) {
                const card = document.createElement("article");
                card.className = "product-card";

                // Use the actual photo uploaded by the shop owner
                const image = document.createElement("img");
                image.src = product.image_url;
                image.alt = product.name;
                image.loading = "lazy";

                image.onerror = function () {
                    image.alt = "Product photo unavailable";
                    image.style.display = "none";
                };

                const name = document.createElement("h3");
                name.textContent = product.name;

                const price = document.createElement("p");
                price.className = "price";
                price.textContent =
                    "UGX " + Number(product.price).toLocaleString("en-UG");

                const orderButton = document.createElement("a");
                orderButton.className = "order-btn button";
                orderButton.href = "#";
                orderButton.textContent = "Order on WhatsApp";

                orderButton.addEventListener("click", function (event) {
                    event.preventDefault();

                    const message =
                        "Hello Daney Collections! I would like to order " +
                        product.name +
                        " priced at " +
                        price.textContent +
                        ".";

                    const whatsappURL =
                        "https://wa.me/256789725765?text=" +
                        encodeURIComponent(message);

                    window.open(
                        whatsappURL,
                        "_blank",
                        "noopener,noreferrer"
                    );
                });

                card.appendChild(image);
                card.appendChild(name);
                card.appendChild(price);
                card.appendChild(orderButton);

                productContainer.appendChild(card);
            });

            console.log("Products loaded:", products.length);

        } catch (error) {
            console.error("Could not load products:", error);

            productContainer.replaceChildren();

            const errorMessage = document.createElement("p");
            errorMessage.textContent =
                "We could not load the collection right now. Please try again later.";

            productContainer.appendChild(errorMessage);
        }
    }

    loadProducts();
});
