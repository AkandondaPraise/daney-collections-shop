
/* Daney Collections - Supabase Product Management */

(function () {
    const productForm = document.getElementById("productForm");

    if (!productForm) return;

    const db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

    const productName = document.getElementById("productName");
    const productPrice = document.getElementById("productPrice");
    const productCategory = document.getElementById("productCategory");
    const productImage = document.getElementById("productImage");

    const STORAGE_BUCKET = "product-images";

    let editingId = null;
    let editingImageUrl = null;

    let productList = document.getElementById("productList");

    if (!productList) {
        productList = document.createElement("section");
        productList.id = "productList";
        productList.style.marginTop = "30px";
        productForm.parentElement.appendChild(productList);
    }

    function showMessage(message) {
        alert(message);
    }

    function formatPrice(price) {
        return "UGX " + Number(price).toLocaleString("en-UG");
    }

    function categoryName(category) {
        return category.replaceAll("-", " ");
    }

    async function getProducts() {
        const { data, error } = await db
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async function displayProducts() {
        productList.textContent = "Loading bags...";

        try {
            const products = await getProducts();

            productList.innerHTML = "<h2>Manage Your Bags</h2>";

            if (products.length === 0) {
                productList.innerHTML +=
                    "<p>No bags added yet. Add your first bag above.</p>";
                return;
            }

            products.forEach(function (product) {
                const card = document.createElement("article");
                card.style.cssText =
                    "border:1px solid #ddd;border-radius:8px;" +
                    "padding:15px;margin-bottom:15px;";

                const image = document.createElement("img");
                image.src = product.image_url || "";
                image.alt = product.name;
                image.style.cssText =
                    "width:140px;height:120px;object-fit:contain;" +
                    "background:#f5f2e8;";

                const name = document.createElement("h3");
                name.textContent = product.name;

                const price = document.createElement("p");
                price.textContent = formatPrice(product.price);

                const category = document.createElement("p");
                category.textContent =
                    "Category: " + categoryName(product.category);

                const status = document.createElement("p");
                status.textContent = product.available
                    ? "Status: Available"
                    : "Status: Sold out";

                const statusButton = document.createElement("button");
                statusButton.type = "button";
                statusButton.textContent = product.available
                    ? "Mark as sold out"
                    : "Mark as available";

                statusButton.addEventListener("click", async function () {
                    statusButton.disabled = true;

                    const { error } = await db
                        .from("products")
                        .update({ available: !product.available })
                        .eq("id", product.id);

                    if (error) {
                        showMessage("Could not update availability: " + error.message);
                    } else {
                        await displayProducts();
                    }
                });

                const editButton = document.createElement("button");
                editButton.type = "button";
                editButton.textContent = "Edit details";
                editButton.style.marginLeft = "8px";

                editButton.addEventListener("click", function () {
                    editingId = product.id;
                    editingImageUrl = product.image_url;

                    productName.value = product.name;
                    productPrice.value = product.price;
                    productCategory.value = product.category;

                    productImage.required = false;
                    productForm.querySelector('button[type="submit"]').textContent =
                        "Save Changes";

                    productForm.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                });

                const deleteButton = document.createElement("button");
                deleteButton.type = "button";
                deleteButton.textContent = "Delete bag";
                deleteButton.style.marginLeft = "8px";

                deleteButton.addEventListener("click", async function () {
                    if (!confirm("Are you sure you want to delete this bag?")) {
                        return;
                    }

                    deleteButton.disabled = true;

                    const { error } = await db
                        .from("products")
                        .delete()
                        .eq("id", product.id);

                    if (error) {
                        showMessage("Could not delete the bag: " + error.message);
                        deleteButton.disabled = false;
                        return;
                    }

                    // The database row is removed first. Image cleanup is
                    // attempted separately because image_url may be a full URL.
                    if (product.image_url) {
                        try {
                            const marker = "/" + STORAGE_BUCKET + "/";
                            const position = product.image_url.indexOf(marker);

                            if (position !== -1) {
                                const path = decodeURIComponent(
                                    product.image_url.substring(
                                        position + marker.length
                                    )
                                );

                                await db.storage
                                    .from(STORAGE_BUCKET)
                                    .remove([path]);
                            }
                        } catch (cleanupError) {
                            console.warn("Image cleanup failed:", cleanupError);
                        }
                    }

                    await displayProducts();
                });

        const actions = document.createElement("div");
actions.style.cssText =
    "display:flex;flex-wrap:wrap;gap:10px;" +
    "margin-top:12px;";

[statusButton, editButton, deleteButton].forEach(function (button) {
    button.style.margin = "0";
    button.style.flex = "1 1 140px";
    button.style.minHeight = "44px";
    actions.appendChild(button);
});

card.append(
    image,
    name,
    price,
    category,
    status,
    actions
);        

                productList.appendChild(card);
            });
        } catch (error) {
            console.error("Loading products failed:", error);
            productList.textContent =
                "Could not load bags: " + error.message;
        }
    }

    productForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = productName.value.trim();
        const price = Number(productPrice.value);
        const category = productCategory.value;
        const file = productImage.files[0];

        if (!name || !Number.isFinite(price) || price <= 0 || !category) {
            showMessage("Please enter a valid bag name, price and category.");
            return;
        }

        if (!editingId && !file) {
            showMessage("Please choose a picture for the bag.");
            return;
        }

        if (file) {
            if (!file.type.startsWith("image/")) {
                showMessage("Please choose a valid image.");
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                showMessage("Please choose an image smaller than 5 MB.");
                return;
            }
        }

        const submitButton = productForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = "Saving...";

        let imageUrl = editingImageUrl;
        let uploadedPath = null;

        try {
            if (file) {
                const extension = file.name.split(".").pop().toLowerCase();
                const safeExtension = /^[a-z0-9]+$/.test(extension)
                    ? extension
                    : "jpg";

                uploadedPath =
                    "bags/" + crypto.randomUUID() + "." + safeExtension;

                const { error: uploadError } = await db.storage
                    .from(STORAGE_BUCKET)
                    .upload(uploadedPath, file, {
                        upsert: false,
                        contentType: file.type
                    });

                if (uploadError) throw uploadError;

                const { data: urlData } = db.storage
                    .from(STORAGE_BUCKET)
                    .getPublicUrl(uploadedPath);

                imageUrl = urlData.publicUrl;
            }

            const productData = {
                name: name,
                price: price,
                category: category,
                image_url: imageUrl,
                available: true
            };

            let result;

            if (editingId) {
                // Preserve current availability when editing existing details.
                delete productData.available;

                result = await db
                    .from("products")
                    .update(productData)
                    .eq("id", editingId);
            } else {
                result = await db
                    .from("products")
                    .insert(productData);
            }

            if (result.error) throw result.error;

            productForm.reset();
            editingId = null;
            editingImageUrl = null;
            productImage.required = true;
            submitButton.textContent = "Add Bag";

            showMessage(
                editingId
                    ? "Bag details updated successfully."
                    : "Bag saved online successfully."
            );

            await displayProducts();
        } catch (error) {
            console.error("Saving product failed:", error);

            // Remove a newly uploaded image if saving its database row failed.
            if (uploadedPath) {
                await db.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
            }

            showMessage(
                "Could not save the bag: " + error.message +
                "\nPlease check your Supabase permissions and try again."
            );
        } finally {
            submitButton.disabled = false;

            if (submitButton.textContent === "Saving...") {
                submitButton.textContent = editingId
                    ? "Save Changes"
                    : "Add Bag";
            }
        }
    });

    // Load existing online products when the dashboard opens.
    displayProducts();
})();
