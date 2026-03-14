window.currentUser = null;

async function setCurrentUser() {
  try {
    const { data, error } = await window.db.auth.getUser();
    window.currentUser = !error ? data?.user || null : null;
  } catch {
    window.currentUser = null;
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  await setCurrentUser();

  highlightActiveNav();
  initMobileMenu();
  initHomeRentalSearch();
  initSignupForm();
  initLoginForm();
  initLogoutButtons();

  await loadSiteSettings();
  await updateHeaderAuthState();

  if (document.getElementById("featuredRentalsGrid")) await loadFeaturedRentals();
  if (document.getElementById("featuredSaleGrid")) await loadFeaturedCarsForSale();
  if (document.getElementById("featuredAccessoriesGrid")) await loadFeaturedAccessories();

  if (document.getElementById("rentalsGrid")) {
    await loadRentalCars();
    initRentalsFilters();
  }

  if (document.getElementById("saleGrid")) {
    await loadCarsForSale();
    initSaleFilters();
  }

  if (document.getElementById("accessoriesGrid")) {
    await loadAccessories();
  }

  if (document.getElementById("carDetailsPage")) await loadCarDetails();
  if (document.getElementById("rentalDetailsPage")) await loadRentalDetails();
  if (document.getElementById("accessoryDetailsPage")) await loadAccessoryDetails();

  updateCartBadge();

  if (document.getElementById("cartItems")) {
    renderCartPage();
  }

  if (document.getElementById("checkoutSummaryItems")) {
    renderCheckoutPage();
    initCheckoutForm();
  }

  if (
    document.getElementById("accountProfile") ||
    document.getElementById("accountOrders") ||
    document.getElementById("accountRentals")
  ) {
    await loadAccountPage();
  }

  if (document.getElementById("rentalCheckoutSummary")) {
    await renderRentalCheckoutPage();
    initRentalPaymentMethodUI();
    initRentalCheckoutForm();
  }

  hideLoader();
});
const pageLoader = document.getElementById("pageLoader");

function showLoader() {
  if (!pageLoader) return;
  pageLoader.classList.remove("hide");
}

function hideLoader() {
  document.body.classList.add("is-ready");

  if (!pageLoader) return;

  setTimeout(() => {
    pageLoader.classList.add("hide");
  }, 300);
}

showLoader();

document.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (!a) return;

  const href = a.getAttribute("href");
  if (!href) return;

  if (
    a.target === "_blank" ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return;
  }

  if (a.origin !== window.location.origin) return;

  showLoader();
});
  function highlightActiveNav() {
    const links = document.querySelectorAll(".main-nav a");
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
  
    links.forEach((link) => {
      const linkPage = link.getAttribute("href");
      if (linkPage === currentPage) {
        link.classList.add("active");
      }
    });
  }
  let siteSettings = null;

function sanitizePhoneNumber(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function getWhatsAppLink(message = "Hello") {
  const number = sanitizePhoneNumber(siteSettings?.whatsapp_number || "96100000000");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
  
  function initHomeRentalSearch() {
    const form = document.getElementById("homeRentalSearchForm");
    if (!form) return;
  
    form.addEventListener("submit", (e) => {
      e.preventDefault();
  
      const location = document.getElementById("location")?.value.trim() || "";
      const pickup = document.getElementById("pickup")?.value || "";
      const returnDate = document.getElementById("returnDate")?.value || "";
  
      const params = new URLSearchParams();
  
      if (location) params.set("location", location.toLowerCase());
      if (pickup) params.set("pickup", pickup);
      if (returnDate) params.set("returnDate", returnDate);
  
      window.location.href = `rentals.html?${params.toString()}`;
    });
  }
  async function loadSiteSettings() {
    try {
      const { data, error } = await window.db
        .from("site_settings")
        .select("*")
        .single();
  
      if (error) {
        console.error("Failed to load site settings:", error);
        return;
      }
  
      siteSettings = data || null;
  
      if (!siteSettings) return;
  
      const companyName = siteSettings.company_name || "Prestige Auto Group";
      const tagline = siteSettings.tagline || "Drive Excellence";
      const phone = siteSettings.phone || "+1 (555) 123-4567";
      const email = siteSettings.email || "info@prestigeauto.com";
      const address = siteSettings.address || "123 Luxury Lane, Beverly Hills, CA";
      const facebook = siteSettings.facebook_url || "#";
      const instagram = siteSettings.instagram_url || "#";
      const tiktok = siteSettings.tiktok_url || "#";
  
      const footerCompanyName = document.getElementById("footerCompanyName");
      const footerPhone = document.getElementById("footerPhone");
      const footerEmail = document.getElementById("footerEmail");
      const footerAddress = document.getElementById("footerAddress");
      const footerFacebook = document.getElementById("footerFacebook");
      const footerInstagram = document.getElementById("footerInstagram");
      const footerTiktok = document.getElementById("footerTiktok");
      const siteTagline = document.getElementById("siteTagline");
      const siteWhatsappLink = document.getElementById("siteWhatsappLink");
  
      if (footerCompanyName) footerCompanyName.textContent = companyName;
      if (footerPhone) footerPhone.textContent = `Phone: ${phone}`;
      if (footerEmail) footerEmail.textContent = `Email: ${email}`;
      if (footerAddress) footerAddress.textContent = `Address: ${address}`;
      if (siteTagline) siteTagline.textContent = tagline;
  
      if (footerFacebook) footerFacebook.href = facebook;
      if (footerInstagram) footerInstagram.href = instagram;
      if (footerTiktok) footerTiktok.href = tiktok;
  
      if (siteWhatsappLink) {
        siteWhatsappLink.href = getWhatsAppLink("Hello, I want more details.");
      }
    } catch (error) {
      console.error("Unexpected site settings error:", error);
    }
  }
  
  async function loadRentalCars() {
    const rentalsContainer = document.getElementById("rentalsGrid");
    if (!rentalsContainer) return;
  
   
    try {
      const today = new Date();
      const todayString = today.toISOString().split("T")[0];
  
      const { data: cars, error: carsError } = await window.db
        .from("rental_cars")
        .select("*")
        .eq("is_available", true)
        .order("created_at", { ascending: false });
  
      if (carsError) {
        console.error("Error loading rental cars:", carsError);
        rentalsContainer.innerHTML = `<p>Failed to load rentals: ${carsError.message}</p>`;
        return;
      }
  
      const { data: bookings, error: bookingsError } = await window.db
        .from("rentals")
        .select("rental_car_id, start_date, end_date, booking_status")
        .neq("booking_status", "cancelled");
  
      if (bookingsError) {
        console.error("Error loading bookings:", bookingsError);
        rentalsContainer.innerHTML = `<p>Failed to load rentals: ${bookingsError.message}</p>`;
        return;
      }
  
      const visibleCars = (cars || []).filter((car) => {
        const hasActiveBooking = (bookings || []).some((booking) => {
          return (
            booking.rental_car_id === car.id &&
            booking.start_date <= todayString &&
            booking.end_date >= todayString
          );
        });
  
        return !hasActiveBooking;
      });
  
      if (!visibleCars.length) {
        rentalsContainer.innerHTML = "<p>No rental cars available right now.</p>";
        hideLoader();
        return;
      }
  
      rentalsContainer.innerHTML = visibleCars.map((car) => {
        const carType = car.rental_type || "Luxury";
        const fuelType = car.fuel_type || "Petrol";
        const transmission = car.transmission || "Automatic";
        const seats = car.seats || "-";
  
        return `
  <a href="rental-details.html?id=${car.id}" class="card-link-wrap">
    <article class="rental-page-card"
      data-price="${car.price_per_day || 0}"
      data-type="${carType}"
      data-transmission="${transmission}"
      data-seats="${seats}"
      data-fuel="${fuelType}"
      data-location="">
      
      <div class="rental-page-image">
        <img loading="lazy" src="${car.image_url || "images/rental-1.jpg"}" alt="${car.title || "Rental Car"}">
        <span class="car-badge">${carType}</span>
      </div>

      <div class="rental-page-body">
        <h3>${car.title || "Untitled Car"}</h3>

        <div class="rental-page-meta">
          <span>${seats} Seats</span>
          <span>${transmission}</span>
          <span>${fuelType}</span>
        </div>

        <div class="sale-brand-line">
          Deposit: $${Number(car.deposit_amount || 0).toLocaleString()}
        </div>

        <div class="rental-page-bottom">
          <div class="rental-page-price">
            <strong>$${Number(car.price_per_day || 0).toLocaleString()}</strong>
            <span>/day</span>
          </div>
          <span class="rent-now-btn">Rent Now</span>
        </div>
      </div>
    </article>
  </a>
`;
      }).join("");
      hideLoader();
    } catch (err) {
      console.error("Unexpected error loading rental cars:", err);
      rentalsContainer.innerHTML = `<p>Failed to load rentals: ${err.message}</p>`;
      hideLoader();
    }
  }
  
  function getRentalCarType(car) {
    const title = (car.title || "").toLowerCase();
    const seats = Number(car.seats || 0);
  
    if (
      title.includes("range rover") ||
      title.includes("q8") ||
      title.includes("suv") ||
      seats >= 7
    ) {
      return "SUV";
    }
  
    if (
      title.includes("bmw 7") ||
      title.includes("s-class") ||
      title.includes("c200") ||
      title.includes("sedan")
    ) {
      return "Sedan";
    }
  
    return "Luxury";
  }
  
  function initRentalsFilters() {
    const rentalsGrid = document.getElementById("rentalsGrid");
    if (!rentalsGrid) return;
  
    const priceRange = document.getElementById("priceRange");
    const priceMaxLabel = document.getElementById("priceMaxLabel");
    const carType = document.getElementById("carType");
    const transmission = document.getElementById("transmission");
    const seats = document.getElementById("seats");
    const fuel = document.getElementById("fuel");
    const resetBtn = document.getElementById("resetFilters");
  
    if (!priceRange || !priceMaxLabel || !carType || !transmission || !seats || !fuel) return;
  
    const urlParams = new URLSearchParams(window.location.search);
    const searchedLocation = (urlParams.get("location") || "").toLowerCase();
  
    function updatePriceLabel() {
      priceMaxLabel.textContent = `$${priceRange.value}`;
    }
  
    function cardMatches(card) {
      const cardPrice = Number(card.dataset.price || 0);
      const cardType = card.dataset.type || "";
      const cardTransmission = card.dataset.transmission || "";
      const cardSeats = card.dataset.seats || "";
      const cardFuel = card.dataset.fuel || "";
      const cardLocation = (card.dataset.location || "").toLowerCase();
  
      const maxPrice = Number(priceRange.value);
      const typeValue = carType.value;
      const transmissionValue = transmission.value;
      const seatsValue = seats.value;
      const fuelValue = fuel.value;
  
      const matchPrice = cardPrice <= maxPrice;
      const matchType = typeValue === "all" || cardType === typeValue;
      const matchTransmission = transmissionValue === "all" || cardTransmission === transmissionValue;
      const matchSeats = seatsValue === "all" || cardSeats === seatsValue;
      const matchFuel = fuelValue === "all" || cardFuel === fuelValue;
      const matchLocation = !searchedLocation || cardLocation.includes(searchedLocation);
  
      return matchPrice && matchType && matchTransmission && matchSeats && matchFuel && matchLocation;
    }
  
    function applyFilters() {
      const cards = rentalsGrid.querySelectorAll(".rental-page-card");
      cards.forEach((card) => {
        card.style.display = cardMatches(card) ? "" : "none";
      });
    }
  
    function resetFilters() {
      priceRange.value = 1000;
      carType.value = "all";
      transmission.value = "all";
      seats.value = "all";
      fuel.value = "all";
  
      updatePriceLabel();
      applyFilters();
    }
  
    updatePriceLabel();
    applyFilters();
  
    priceRange.addEventListener("input", () => {
      updatePriceLabel();
      applyFilters();
    });
  
    carType.addEventListener("change", applyFilters);
    transmission.addEventListener("change", applyFilters);
    seats.addEventListener("change", applyFilters);
    fuel.addEventListener("change", applyFilters);
  
    if (resetBtn) {
      resetBtn.addEventListener("click", resetFilters);
    }
  }
  
  async function loadCarsForSale() {
    const carsContainer = document.getElementById("saleGrid");
    if (!carsContainer) return;
  
  
    try {
      const { data, error } = await window.db
        .from("cars_for_sale")
        .select("*")
        .eq("is_available", true)
        .order("created_at", { ascending: false });
  
      if (error) {
        console.error("Error loading cars:", error);
        carsContainer.innerHTML = `<p>Failed to load cars: ${error.message}</p>`;
        hideLoader();
        return;
      }
  
      if (!data || data.length === 0) {
        carsContainer.innerHTML = "<p>No cars available right now.</p>";
        hideLoader();
        return;
      }
  
      carsContainer.innerHTML = data.map((car) => {
        const whatsappMessage = encodeURIComponent(
          `Hello, I am interested in the ${car.title}. Can you send me more details?`
        );
  
        return `
  <article class="rental-page-card sale-page-card card-clickable"
    data-href="car-details.html?id=${car.id}"
    data-brand="${car.brand || ""}"
    data-price="${car.price || 0}"
    data-year="${car.year || ""}"
    data-mileage="${car.mileage || 0}"
    data-fuel="${car.fuel_type || ""}">
    
    <div class="rental-page-image">
      <img loading="lazy" src="${car.image_url || "images/car1.jpg"}" alt="${car.title || "Car"}" />
      <span class="car-badge">${car.condition || "Used"}</span>
    </div>

    <div class="rental-page-body">
      <h3>${car.title || "Untitled Car"}</h3>
      <div class="sale-brand-line">${car.brand || ""} ${car.model ? "• " + car.model : ""}</div>

      <div class="rental-page-meta">
        <span>${car.year || "-"}</span>
        <span>•</span>
        <span>${Number(car.mileage || 0).toLocaleString()} mi</span>
        <span>•</span>
        <span>${car.fuel_type || "-"}</span>
        <span>•</span>
        <span>${car.color || "-"}</span>
      </div>

      <div class="sale-page-bottom">
        <div class="sale-page-price">$${Number(car.price || 0).toLocaleString()}</div>
        <div class="sale-page-actions">
          <span class="rent-now-btn">View Details</span>
          <a href="${getWhatsAppLink(`Hello, I am interested in the ${car.title}. Can you send me more details?`)}" class="whatsapp-btn stop-card-click" target="_blank">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.52 3.48A11.76 11.76 0 0 0 12.01 0C5.38 0 .01 5.37 0 12c0 2.11.55 4.17 1.6 6L0 24l6.15-1.6A11.96 11.96 0 0 0 12.01 24C18.63 24 24 18.63 24 12c0-3.19-1.24-6.19-3.48-8.52zM12 21.82c-1.82 0-3.59-.49-5.14-1.42l-.37-.22-3.65.95.97-3.56-.24-.37A9.82 9.82 0 0 1 2.18 12C2.18 6.58 6.58 2.18 12 2.18c2.61 0 5.06 1.02 6.91 2.87A9.69 9.69 0 0 1 21.82 12c0 5.42-4.4 9.82-9.82 9.82zm5.44-7.37c-.3-.15-1.76-.87-2.03-.97-.27-.1-.46-.15-.66.15s-.76.97-.93 1.17c-.17.2-.34.22-.64.07-.3-.15-1.27-.47-2.41-1.49-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.59-.9-2.17-.24-.57-.48-.49-.66-.5h-.56c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.09 4.48.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.08-.12-.27-.2-.57-.35z"/>
            </svg>
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  </article>
`;
      }).join("");
      initClickableCards();
      hideLoader();
    } catch (err) {
      console.error("Unexpected error loading cars:", err);
      carsContainer.innerHTML = `<p>Failed to load cars: ${err.message}</p>`;
      hideLoader();
    }
  }
  
  function initSaleFilters() {
    const saleGrid = document.getElementById("saleGrid");
    if (!saleGrid) return;
  
    const brand = document.getElementById("saleBrand");
    const priceRange = document.getElementById("salePriceRange");
    const priceMaxLabel = document.getElementById("salePriceMaxLabel");
    const year = document.getElementById("saleYear");
    const mileage = document.getElementById("saleMileage");
    const fuel = document.getElementById("saleFuel");
    const resetBtn = document.getElementById("saleResetFilters");
  
    if (!brand || !priceRange || !priceMaxLabel || !year || !mileage || !fuel) return;
  
    function formatPrice(value) {
      return `$${Number(value).toLocaleString()}`;
    }
  
    function updatePriceLabel() {
      priceMaxLabel.textContent = formatPrice(priceRange.value);
    }
  
    function cardMatches(card) {
      const cardBrand = card.dataset.brand || "";
      const cardPrice = Number(card.dataset.price || 0);
      const cardYear = card.dataset.year || "";
      const cardMileage = Number(card.dataset.mileage || 0);
      const cardFuel = card.dataset.fuel || "";
  
      const selectedBrand = brand.value;
      const selectedPrice = Number(priceRange.value);
      const selectedYear = year.value;
      const selectedMileage = mileage.value;
      const selectedFuel = fuel.value;
  
      const matchBrand = selectedBrand === "all" || cardBrand === selectedBrand;
      const matchPrice = cardPrice <= selectedPrice;
      const matchYear = selectedYear === "all" || cardYear === selectedYear;
      const matchMileage = selectedMileage === "all" || cardMileage <= Number(selectedMileage);
      const matchFuel = selectedFuel === "all" || cardFuel === selectedFuel;
  
      return matchBrand && matchPrice && matchYear && matchMileage && matchFuel;
    }
  
    function applySaleFilters() {
      const cards = saleGrid.querySelectorAll(".sale-page-card");
      cards.forEach((card) => {
        card.style.display = cardMatches(card) ? "" : "none";
      });
    }
  
    function resetSaleFilters() {
      brand.value = "all";
      priceRange.value = "500000";
      year.value = "all";
      mileage.value = "all";
      fuel.value = "all";
  
      updatePriceLabel();
      applySaleFilters();
    }
  
    updatePriceLabel();
    applySaleFilters();
  
    priceRange.addEventListener("input", () => {
      updatePriceLabel();
      applySaleFilters();
    });
  
    brand.addEventListener("change", applySaleFilters);
    year.addEventListener("change", applySaleFilters);
    mileage.addEventListener("change", applySaleFilters);
    fuel.addEventListener("change", applySaleFilters);
  
    if (resetBtn) {
      resetBtn.addEventListener("click", resetSaleFilters);
    }
  }
  
  async function loadAccessories() {
    const accessoriesContainer = document.getElementById("accessoriesGrid");
    if (!accessoriesContainer) return;
  
  
    try {
      const { data, error } = await window.db
        .from("accessories")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
  
      if (error) {
        console.error("Error loading accessories:", error);
        accessoriesContainer.innerHTML = `<p>Failed to load accessories: ${error.message}</p>`;
        hideLoader();
        return;
      }
  
      if (!data || data.length === 0) {
        accessoriesContainer.innerHTML = "<p>No accessories available right now.</p>";
        hideLoader();
        return;
      }
  
      accessoriesContainer.innerHTML = data.map((item) => {
        return `
  <article class="rental-page-card accessory-page-card card-clickable"
    data-href="accessory-details.html?id=${item.id}">
    
    <div class="rental-page-image">
      <img loading="lazy" src="${item.image_url || "images/product-1.jpg"}" alt="${item.name || "Accessory"}" />
      <span class="car-badge">${item.category || "Accessory"}</span>
    </div>

    <div class="rental-page-body">
      <h3>${item.name || "Untitled Product"}</h3>

      <div class="sale-brand-line">${item.category || ""}</div>

      <div class="rental-page-meta">
        <span>Stock: ${item.stock ?? 0}</span>
      </div>

      <div class="accessory-page-bottom">
        <div class="sale-page-price">$${Number(item.price || 0).toLocaleString()}</div>
        <button
          class="rent-now-btn add-to-cart-btn stop-card-click"
          type="button"
          data-id="${item.id}"
          data-name="${(item.name || "Untitled Product").replace(/"/g, "&quot;")}"
          data-price="${item.price || 0}"
          data-image="${item.image_url || "images/product-1.jpg"}"
        >
          Add to Cart
        </button>
      </div>
    </div>
  </article>
`;
      }).join("");
  
      initClickableCards();
      initAddToCartButtons();
      hideLoader();
    } catch (err) {
      console.error("Unexpected error loading accessories:", err);
      accessoriesContainer.innerHTML = `<p>Failed to load accessories: ${err.message}</p>`;
      hideLoader();
    }
  }
  
  async function loadCarDetails() {
    const page = document.getElementById("carDetailsPage");
    if (!page) return;
  
    const params = new URLSearchParams(window.location.search);
    const carId = params.get("id");
  
    if (!carId) {
      window.location.href = "cars-for-sale.html";
      return;
    }
  
    try {
      const { data: car, error: carError } = await window.db
        .from("cars_for_sale")
        .select("*")
        .eq("id", carId)
        .single();
  
      if (carError || !car) {
        console.error("Error loading car:", carError);
        page.innerHTML = `<p class="details-error">Failed to load car details.</p>`;
        return;
      }
  
      const { data: galleryRows, error: galleryError } = await window.db
        .from("car_sale_images")
        .select("*")
        .eq("car_id", carId)
        .order("sort_order", { ascending: true });
  
      if (galleryError) {
        console.error("Error loading car images:", galleryError);
      }
  
      let images = [];
  
      if (car.image_url) {
        images.push(car.image_url);
      }
  
      if (galleryRows && galleryRows.length) {
        galleryRows.forEach((row) => {
          if (row.image_url && !images.includes(row.image_url)) {
            images.push(row.image_url);
          }
        });
      }
  
      if (!images.length) {
        images = ["images/car1.jpg"];
      }
  
      const whatsappHref = getWhatsAppLink(
        `Hello, I am interested in the ${car.title}. Can you send me more details?`
      );
  
      const description = car.description || "No description available for this vehicle yet.";
      const features = buildCarFeatures(car);
  
      page.innerHTML = `
        <div class="car-details-layout">
          <div class="car-gallery">
            <div class="car-main-image">
              <img id="carMainImage" src="${images[0]}" alt="${car.title || "Car"}">
            </div>
  
            <div class="car-thumbs">
              ${images.map((img, index) => `
                <button class="car-thumb ${index === 0 ? "is-active" : ""}" type="button" data-image="${img}">
                  <img loading="lazy" src="${img}" alt="${car.title || "Car"} thumbnail ${index + 1}">
                </button>
              `).join("")}
            </div>
          </div>
  
          <div class="car-details-info">
            <h1>${car.title || "Untitled Car"}</h1>
  
            <div class="car-price-line">
              <span class="price">$${Number(car.price || 0).toLocaleString()}</span>
            </div>
  
            <section class="details-card">
              <h2>Specifications</h2>
  
              <div class="specs-grid">
                <div class="spec-item">
                  <svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <circle cx="12" cy="7" r="4"></circle>
                    <path d="M4 21c0-3.8 3.6-7 8-7s8 3.2 8 7"></path>
                  </svg>
                  <div>
                    <span class="spec-label">Brand</span>
                    <span class="spec-value">${car.brand || "-"}</span>
                  </div>
                </div>
  
                <div class="spec-item">
                  <svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M4 14a8 8 0 1 1 16 0"></path>
                    <path d="M12 14l4-4"></path>
                  </svg>
                  <div>
                    <span class="spec-label">Transmission</span>
                    <span class="spec-value">${car.transmission || "-"}</span>
                  </div>
                </div>
  
                <div class="spec-item">
                  <svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M10 3h4"></path>
                    <path d="M9 3h6v7a3 3 0 0 0 3 3h1v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6h1a3 3 0 0 0 3-3V3z"></path>
                  </svg>
                  <div>
                    <span class="spec-label">Fuel</span>
                    <span class="spec-value">${car.fuel_type || "-"}</span>
                  </div>
                </div>
  
                <div class="spec-item">
                  <svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M21 7l-9 10-5-5"></path>
                  </svg>
                  <div>
                    <span class="spec-label">Year</span>
                    <span class="spec-value">${car.year || "-"}</span>
                  </div>
                </div>
  
                <div class="spec-item">
                  <svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M4 12h16"></path>
                    <path d="M7 8h10"></path>
                    <path d="M7 16h10"></path>
                  </svg>
                  <div>
                    <span class="spec-label">Mileage</span>
                    <span class="spec-value">${Number(car.mileage || 0).toLocaleString()} mi</span>
                  </div>
                </div>
  
                <div class="spec-item">
                  <svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <circle cx="12" cy="12" r="8"></circle>
                    <path d="M12 8v4l3 2"></path>
                  </svg>
                  <div>
                    <span class="spec-label">Color</span>
                    <span class="spec-value">${car.color || "-"}</span>
                  </div>
                </div>
              </div>
            </section>
  
            <section class="details-card">
              <h2>Description</h2>
              <div class="details-text">${description}</div>
            </section>
  
            <section class="details-card">
              <h2>Features</h2>
              <div class="features-grid">
                ${features.length
                  ? features.map(feature => `
                      <div class="feature-item">
                        <svg class="feature-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M20 6L9 17l-5-5"></path>
                        </svg>
                        <span>${feature}</span>
                      </div>
                    `).join("")
                  : `<div class="details-text">No features added yet.</div>`
                }
              </div>
  
              <div class="details-actions">
                <a
                  href="${whatsappHref}"
                  target="_blank"
                  class="whatsapp-detail-btn"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M20.52 3.48A11.76 11.76 0 0 0 12.01 0C5.38 0 .01 5.37 0 12c0 2.11.55 4.17 1.6 6L0 24l6.15-1.6A11.96 11.96 0 0 0 12.01 24C18.63 24 24 18.63 24 12c0-3.19-1.24-6.19-3.48-8.52zM12 21.82c-1.82 0-3.59-.49-5.14-1.42l-.37-.22-3.65.95.97-3.56-.24-.37A9.82 9.82 0 0 1 2.18 12C2.18 6.58 6.58 2.18 12 2.18c2.61 0 5.06 1.02 6.91 2.87A9.69 9.69 0 0 1 21.82 12c0 5.42-4.4 9.82-9.82 9.82zm5.44-7.37c-.3-.15-1.76-.87-2.03-.97-.27-.1-.46-.15-.66.15s-.76.97-.93 1.17c-.17.2-.34.22-.64.07-.3-.15-1.27-.47-2.41-1.49-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.59-.9-2.17-.24-.57-.48-.49-.66-.5h-.56c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.09 4.48.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.08-.12-.27-.2-.57-.35z"/>
                  </svg>
                  WhatsApp
                </a>
              </div>
            </section>
          </div>
        </div>
      `;
  
      initCarGallery();
      hideLoader();
    } catch (err) {
      console.error("Unexpected error loading car details:", err);
      page.innerHTML = `<p class="details-error">Failed to load car details.</p>`;
      hideLoader();
    }
  }
  
  function initCarGallery() {
    const mainImage = document.getElementById("carMainImage");
    const thumbs = document.querySelectorAll(".car-thumb");
  
    if (!mainImage || !thumbs.length) return;
  
    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const image = thumb.getAttribute("data-image");
        if (!image || mainImage.src.includes(image)) return;
  
        mainImage.style.opacity = "0.35";
  
        const tempImg = new Image();
        tempImg.src = image;
  
        tempImg.onload = () => {
          mainImage.src = image;
          mainImage.style.opacity = "1";
        };
  
        thumbs.forEach((btn) => btn.classList.remove("is-active"));
        thumb.classList.add("is-active");
      });
    });
  }
  
  function buildCarFeatures(car) {
    if (car.features && car.features.trim() !== "") {
      return car.features.split(",").map(f => f.trim()).filter(Boolean);
    }
    return [];
  }
  function isDateRangeOverlap(startA, endA, startB, endB) {
    return startA <= endB && endA >= startB;
  }
  async function loadRentalDetails() {
    const page = document.getElementById("rentalDetailsPage");
    if (!page) return;
  
    const params = new URLSearchParams(window.location.search);
    const rentalId = params.get("id");
  
    if (!rentalId) {
      window.location.href = "rentals.html";
      return;
    }
  
    try {
      const { data: rental, error: rentalError } = await window.db
        .from("rental_cars")
        .select("*")
        .eq("id", rentalId)
        .single();
  
      if (rentalError || !rental) {
        console.error("Error loading rental:", rentalError);
        page.innerHTML = `<p class="details-error">Failed to load rental details.</p>`;
        return;
      }
  
      const { data: galleryRows, error: galleryError } = await window.db
        .from("rental_car_images")
        .select("*")
        .eq("rental_car_id", rentalId)
        .order("sort_order", { ascending: true });
  
      if (galleryError) {
        console.error("Error loading rental images:", galleryError);
      }
  
      let images = [];
  
      if (rental.image_url) {
        images.push(rental.image_url);
      }
  
      if (galleryRows && galleryRows.length) {
        galleryRows.forEach((row) => {
          if (row.image_url && !images.includes(row.image_url)) {
            images.push(row.image_url);
          }
        });
      }
  
      if (!images.length) {
        images = ["images/rental-1.jpg"];
      }
  
      const whatsappHref = getWhatsAppLink(
        `Hello, I want to rent the ${rental.title}. Please send me more details.`
      );
  
      const description = rental.description || "No description available for this vehicle yet.";
      const features = buildRentalFeatures(rental);
      const todayString = new Date().toISOString().split("T")[0];

const { data: existingBookings, error: bookingsError } = await window.db
  .from("rentals")
  .select("start_date, end_date, booking_status")
  .eq("rental_car_id", rentalId)
  .neq("booking_status", "cancelled");

if (bookingsError) {
  console.error("Error loading rental bookings:", bookingsError);
}

const isBookedNow = (existingBookings || []).some((booking) => {
  return booking.start_date <= todayString && booking.end_date >= todayString;
});
const { data: authData } = await window.db.auth.getUser();
const currentUser = authData?.user || null;
  
      page.innerHTML = `
        <div class="car-details-layout">
          <div class="car-gallery">
            <div class="car-main-image">
              <img id="rentalMainImage" src="${images[0]}" alt="${rental.title || "Rental Car"}">
            </div>
  
            <div class="car-thumbs">
              ${images.map((img, index) => `
                <button class="car-thumb ${index === 0 ? "is-active" : ""}" type="button" data-image="${img}">
                  <img loading="lazy" src="${img}" alt="${rental.title || "Rental Car"} thumbnail ${index + 1}">
                </button>
              `).join("")}
            </div>
          </div>
  
          <div class="car-details-info">
            <h1>${rental.title || "Untitled Rental"}</h1>
  
            <div class="rental-price-line">
              <span class="price">$${Number(rental.price_per_day || 0).toLocaleString()}</span>
              <span class="per">/day</span>
            </div>
  
            <section class="details-card">
              <h2>Specifications</h2>
  
              <div class="specs-grid">
                <div class="spec-item">
                  <svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <circle cx="12" cy="7" r="4"></circle>
                    <path d="M4 21c0-3.8 3.6-7 8-7s8 3.2 8 7"></path>
                  </svg>
                  <div>
                    <span class="spec-label">Seats</span>
                    <span class="spec-value">${rental.seats || "-"} People</span>
                  </div>
                </div>
  
                <div class="spec-item">
                  <svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M4 14a8 8 0 1 1 16 0"></path>
                    <path d="M12 14l4-4"></path>
                  </svg>
                  <div>
                    <span class="spec-label">Transmission</span>
                    <span class="spec-value">${rental.transmission || "-"}</span>
                  </div>
                </div>
  
                <div class="spec-item">
                  <svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M10 3h4"></path>
                    <path d="M9 3h6v7a3 3 0 0 0 3 3h1v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6h1a3 3 0 0 0 3-3V3z"></path>
                  </svg>
                  <div>
                    <span class="spec-label">Fuel</span>
                    <span class="spec-value">${rental.fuel_type || "-"}</span>
                  </div>
                </div>
  
                <div class="spec-item">
                  <svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M21 7l-9 10-5-5"></path>
                  </svg>
                  <div>
                    <span class="spec-label">Year</span>
                    <span class="spec-value">${rental.year || "-"}</span>
                  </div>
                </div>
  
                <div class="spec-item">
                  <svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M6 19V5"></path>
                    <path d="M18 19V5"></path>
                    <path d="M6 12h12"></path>
                  </svg>
                  <div>
                    <span class="spec-label">Deposit</span>
                    <span class="spec-value">$${Number(rental.deposit_amount || 0).toLocaleString()}</span>
                  </div>
                </div>
  
                <div class="spec-item">
                  <svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <circle cx="12" cy="12" r="8"></circle>
                    <path d="M12 8v4l3 2"></path>
                  </svg>
                  <div>
                    <span class="spec-label">Chauffeur</span>
                    <span class="spec-value">$${Number(rental.chauffeur_price_per_day || 0).toLocaleString()}/day</span>
                  </div>
                </div>
              </div>
            </section>
  
            <section class="details-card">
              <h2>Description</h2>
              <div class="details-text">${description}</div>
            </section>
  
            <section class="details-card">
              <h2>Features</h2>
              <div class="features-grid">
                ${features.length
                  ? features.map(feature => `
                      <div class="feature-item">
                        <svg class="feature-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M20 6L9 17l-5-5"></path>
                        </svg>
                        <span>${feature}</span>
                      </div>
                    `).join("")
                  : `<div class="details-text">No features added yet.</div>`
                }
              </div>
            </section>
  
              <section class="rental-booking-card">
  <h2>Book This Vehicle</h2>

  ${
    isBookedNow
      ? `
        <div class="details-text" style="margin-top:10px;">
          This car is currently unavailable for the selected period and will reappear automatically when the booking ends.
        </div>

        <div class="booking-actions" style="margin-top:18px;">
          <a
            href="${whatsappHref}"
            target="_blank"
            class="rental-wa-btn"
          >
            <svg viewBox="0 0 24 24">
              <path d="M20.52 3.48A11.76 11.76 0 0 0 12.01 0C5.38 0 .01 5.37 0 12c0 2.11.55 4.17 1.6 6L0 24l6.15-1.6A11.96 11.96 0 0 0 12.01 24C18.63 24 24 18.63 24 12c0-3.19-1.24-6.19-3.48-8.52zM12 21.82c-1.82 0-3.59-.49-5.14-1.42l-.37-.22-3.65.95.97-3.56-.24-.37A9.82 9.82 0 0 1 2.18 12C2.18 6.58 6.58 2.18 12 2.18c2.61 0 5.06 1.02 6.91 2.87A9.69 9.69 0 0 1 21.82 12c0 5.42-4.4 9.82-9.82 9.82zm5.44-7.37c-.3-.15-1.76-.87-2.03-.97-.27-.1-.46-.15-.66.15s-.76.97-.93 1.17c-.17.2-.34.22-.64.07-.3-.15-1.27-.47-2.41-1.49-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.59-.9-2.17-.24-.57-.48-.49-.66-.5h-.56c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.09 4.48.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.08-.12-.27-.2-.57-.35z"/>
            </svg>
            WhatsApp
          </a>
        </div>
      `
      : !currentUser
      ? `
        <div class="details-text" style="margin-top:10px;">
          You need to log in before booking this vehicle.
        </div>

        <div class="booking-actions" style="margin-top:18px;">
          <a href="login.html" class="book-now-detail-btn">Log In to Book</a>

          <a
            href="${whatsappHref}"
            target="_blank"
            class="rental-wa-btn"
          >
            <svg viewBox="0 0 24 24">
              <path d="M20.52 3.48A11.76 11.76 0 0 0 12.01 0C5.38 0 .01 5.37 0 12c0 2.11.55 4.17 1.6 6L0 24l6.15-1.6A11.96 11.96 0 0 0 12.01 24C18.63 24 24 18.63 24 12c0-3.19-1.24-6.19-3.48-8.52zM12 21.82c-1.82 0-3.59-.49-5.14-1.42l-.37-.22-3.65.95.97-3.56-.24-.37A9.82 9.82 0 0 1 2.18 12C2.18 6.58 6.58 2.18 12 2.18c2.61 0 5.06 1.02 6.91 2.87A9.69 9.69 0 0 1 21.82 12c0 5.42-4.4 9.82-9.82 9.82zm5.44-7.37c-.3-.15-1.76-.87-2.03-.97-.27-.1-.46-.15-.66.15s-.76.97-.93 1.17c-.17.2-.34.22-.64.07-.3-.15-1.27-.47-2.41-1.49-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.59-.9-2.17-.24-.57-.48-.49-.66-.5h-.56c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.09 4.48.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.08-.12-.27-.2-.57-.35z"/>
            </svg>
            WhatsApp
          </a>
        </div>
      `
      : `
        <form class="booking-form" id="rentalBookingForm">
          <div class="booking-row">
            <div class="booking-field">
              <label for="pickupDate">Pick-up Date</label>
              <input type="date" id="pickupDate" required>
            </div>

            <div class="booking-field">
              <label for="returnDate">Return Date</label>
              <input type="date" id="returnDate" required>
            </div>
          </div>

          <div class="booking-row">
            <div class="booking-field">
              <label for="chauffeurRequired">Chauffeur</label>
              <select id="chauffeurRequired">
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>

            <div class="booking-field">
              <label for="customerPhone">Phone</label>
              <input type="text" id="customerPhone" placeholder="Your phone number">
            </div>
          </div>

          <div class="booking-summary">
            <h3>Booking Summary</h3>

            <div class="booking-summary-list">
              <div class="booking-summary-item">
                <span>Price per day</span>
                <strong id="summaryPricePerDay">$${Number(rental.price_per_day || 0).toLocaleString()}</strong>
              </div>

              <div class="booking-summary-item">
                <span>Total days</span>
                <strong id="summaryTotalDays">0</strong>
              </div>

              <div class="booking-summary-item">
                <span>Base price</span>
                <strong id="summaryBasePrice">$0</strong>
              </div>

              <div class="booking-summary-item">
                <span>Chauffeur</span>
                <strong id="summaryChauffeur">$0</strong>
              </div>

              <div class="booking-summary-item">
                <span>Deposit Due Now</span>
                <strong id="summaryDeposit">$0</strong>
              </div>

              <div class="booking-summary-item">
                <span>Remaining on Delivery</span>
                <strong id="summaryRemaining">$0</strong>
              </div>

              <div class="booking-summary-item">
                <span>Full Rental Total</span>
                <strong id="summaryTotal">$0</strong>
              </div>
            </div>
          </div>

          <div class="booking-actions">
            <button type="submit" class="book-now-detail-btn">Book Now</button>

            <a
              href="${whatsappHref}"
              target="_blank"
              class="rental-wa-btn"
            >
              <svg viewBox="0 0 24 24">
                <path d="M20.52 3.48A11.76 11.76 0 0 0 12.01 0C5.38 0 .01 5.37 0 12c0 2.11.55 4.17 1.6 6L0 24l6.15-1.6A11.96 11.96 0 0 0 12.01 24C18.63 24 24 18.63 24 12c0-3.19-1.24-6.19-3.48-8.52zM12 21.82c-1.82 0-3.59-.49-5.14-1.42l-.37-.22-3.65.95.97-3.56-.24-.37A9.82 9.82 0 0 1 2.18 12C2.18 6.58 6.58 2.18 12 2.18c2.61 0 5.06 1.02 6.91 2.87A9.69 9.69 0 0 1 21.82 12c0 5.42-4.4 9.82-9.82 9.82zm5.44-7.37c-.3-.15-1.76-.87-2.03-.97-.27-.1-.46-.15-.66.15s-.76.97-.93 1.17c-.17.2-.34.22-.64.07-.3-.15-1.27-.47-2.41-1.49-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.59-.9-2.17-.24-.57-.48-.49-.66-.5h-.56c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.09 4.48.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.08-.12-.27-.2-.57-.35z"/>
              </svg>
              WhatsApp
            </a>
          </div>
        </form>
      `
  }
</section>
                
          </div>
        </div>
      `;
  
      initRentalGallery();

      if (!isBookedNow && currentUser) {
        initRentalDatePickers(existingBookings || []);
        initRentalBookingCalculator(rental);
      }
      hideLoader();
    } catch (err) {
      console.error("Unexpected error loading rental details:", err);
      page.innerHTML = `<p class="details-error">Failed to load rental details.</p>`;
      hideLoader();
    }
  }
  
  function initRentalGallery() {
    const mainImage = document.getElementById("rentalMainImage");
    const thumbs = document.querySelectorAll(".car-thumb");
  
    if (!mainImage || !thumbs.length) return;
  
    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const image = thumb.getAttribute("data-image");
        if (!image || mainImage.src.includes(image)) return;
  
        mainImage.style.opacity = "0.35";
  
        const tempImg = new Image();
        tempImg.src = image;
  
        tempImg.onload = () => {
          mainImage.src = image;
          mainImage.style.opacity = "1";
        };
  
        thumbs.forEach((btn) => btn.classList.remove("is-active"));
        thumb.classList.add("is-active");
      });
    });
  }
  function initRentalDatePickers(bookedRanges = []) {
    const pickupDate = document.getElementById("pickupDate");
    const returnDate = document.getElementById("returnDate");
  
    if (!pickupDate || !returnDate || typeof flatpickr === "undefined") return;
  
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    const disableRanges = bookedRanges.map((booking) => ({
      from: booking.start_date,
      to: booking.end_date
    }));
  
    flatpickr(pickupDate, {
      dateFormat: "Y-m-d",
      minDate: today,
      disable: disableRanges
    });
  
    flatpickr(returnDate, {
      dateFormat: "Y-m-d",
      minDate: today,
      disable: disableRanges
    });
  }
  
  function initRentalBookingCalculator(rental) {
    const pickupDate = document.getElementById("pickupDate");
    const returnDate = document.getElementById("returnDate");
    const chauffeurRequired = document.getElementById("chauffeurRequired");
    const form = document.getElementById("rentalBookingForm");
  
    if (!pickupDate || !returnDate || !chauffeurRequired || !form) return;
  
    const summaryTotalDays = document.getElementById("summaryTotalDays");
    const summaryBasePrice = document.getElementById("summaryBasePrice");
    const summaryChauffeur = document.getElementById("summaryChauffeur");
    const summaryDeposit = document.getElementById("summaryDeposit");
    const summaryTotal = document.getElementById("summaryTotal");
  
    function calculate() {
      const start = pickupDate.value ? new Date(pickupDate.value) : null;
      const end = returnDate.value ? new Date(returnDate.value) : null;
    
      let totalDays = 0;
    
      if (start && end) {
        const diff = end.getTime() - start.getTime();
        totalDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (totalDays < 0) totalDays = 0;
      }
    
      const pricePerDay = Number(rental.price_per_day || 0);
      const chauffeurPerDay = Number(rental.chauffeur_price_per_day || 0);
      const depositPercentage = Number(rental.deposit_percentage || 25);
    
      const basePrice = totalDays * pricePerDay;
      const chauffeurPrice =
        chauffeurRequired.value === "true"
          ? totalDays * chauffeurPerDay
          : 0;
    
      const fullTotal = basePrice + chauffeurPrice;
      const deposit = fullTotal * (depositPercentage / 100);
      const remaining = fullTotal - deposit;
    
      summaryTotalDays.textContent = totalDays;
      summaryBasePrice.textContent = `$${basePrice.toLocaleString()}`;
      summaryChauffeur.textContent = `$${chauffeurPrice.toLocaleString()}`;
      summaryDeposit.textContent = `$${deposit.toLocaleString()}`;
      summaryTotal.textContent = `$${fullTotal.toLocaleString()}`;
    
      const remainingEl = document.getElementById("summaryRemaining");
      if (remainingEl) {
        remainingEl.textContent = `$${remaining.toLocaleString()}`;
      }
    }
  
    pickupDate.addEventListener("change", calculate);
    returnDate.addEventListener("change", calculate);
    chauffeurRequired.addEventListener("change", calculate);
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
    
      const pickup = pickupDate.value;
      const dropoff = returnDate.value;
      const chauffeur = chauffeurRequired.value === "true";
      const phone = document.getElementById("customerPhone")?.value.trim() || "";
    
      if (!pickup || !dropoff) {
        alert("Please select pick-up and return dates.");
        return;
      }
    
      const start = new Date(pickup);
      const end = new Date(dropoff);
      const diff = end.getTime() - start.getTime();
      const totalDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
      if (totalDays <= 0) {
        alert("Return date must be after pick-up date.");
        return;
      }
    
      const pricePerDay = Number(rental.price_per_day || 0);
      const chauffeurPerDay = Number(rental.chauffeur_price_per_day || 0);
      const depositPercentage = 25;
    
      const basePrice = totalDays * pricePerDay;
const chauffeurPrice = chauffeur ? totalDays * chauffeurPerDay : 0;
const fullTotal = basePrice + chauffeurPrice;
const depositAmount = fullTotal * (depositPercentage / 100);
const remainingAmount = fullTotal - depositAmount;
const totalPrice = fullTotal;
    
const bookingData = {
  rental_car_id: rental.id,
  title: rental.title || "Rental Car",
  image_url: rental.image_url || "images/rental-1.jpg",
  pickup_date: pickup,
  return_date: dropoff,
  total_days: totalDays,
  customer_phone: phone,
  chauffeur_required: chauffeur,
  price_per_day: pricePerDay,
  chauffeur_price_per_day: chauffeurPerDay,
  base_price: basePrice,
  chauffeur_price: chauffeurPrice,
  deposit_amount: depositAmount,
  remaining_amount: remainingAmount,
  total_price: totalPrice
};
    
      localStorage.setItem("rentalCheckout", JSON.stringify(bookingData));
      window.location.href = "rental-checkout.html";
    });
  
    calculate();
  }
  
  function buildRentalFeatures(rental) {
    if (rental.features && rental.features.trim() !== "") {
      return rental.features.split(",").map(f => f.trim()).filter(Boolean);
    }
  
    return [];
  }
  function initAddToCartButtons() {
    const buttons = document.querySelectorAll(".add-to-cart-btn");
    if (!buttons.length) return;
  
    buttons.forEach((button) => {
      button.addEventListener("click", async () => {
        const { data } = await window.db.auth.getUser();
        const currentUser = data?.user || null;
  
        if (!currentUser) {
          window.location.href = "login.html";
          return;
        }
  
        window.currentUser = currentUser;
  
        const item = {
          id: button.dataset.id,
          name: button.dataset.name,
          price: Number(button.dataset.price || 0),
          image_url: button.dataset.image,
          quantity: 1
        };
  
        addToCart(item);
  
        button.textContent = "Added";
        button.disabled = true;
  
        setTimeout(() => {
          button.textContent = "Add to Cart";
          button.disabled = false;
        }, 1200);
      });
    });
  }
  function getCurrentCartKey() {
    const userId = window.currentUser?.id;
    return userId ? `cart_${userId}` : "cart_guest";
  }
  
  function getCart() {
    return JSON.parse(localStorage.getItem(getCurrentCartKey()) || "[]");
  }
  
  function saveCart(cart) {
    localStorage.setItem(getCurrentCartKey(), JSON.stringify(cart));
  }
  
  function clearCart() {
    localStorage.removeItem(getCurrentCartKey());
  }
  
  function updateCartBadge() {
    const badge = document.getElementById("cartCountBadge");
    if (!badge) return;
  
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  
    badge.textContent = totalItems;
  
    if (totalItems <= 0) {
      badge.classList.add("is-empty");
    } else {
      badge.classList.remove("is-empty");
    }
  }
  
  function addToCart(product) {
    const cart = getCart();
  
    const existing = cart.find((item) => item.id === product.id);
  
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push(product);
    }
  
    saveCart(cart);
    updateCartBadge();
  }
  async function loadAccessoryDetails() {
    const page = document.getElementById("accessoryDetailsPage");
    if (!page) return;
  
    const params = new URLSearchParams(window.location.search);
    const accessoryId = params.get("id");
  
    if (!accessoryId) {
      window.location.href = "accessories.html";
      return;
    }
  
    try {
      const { data: accessory, error: accessoryError } = await window.db
        .from("accessories")
        .select("*")
        .eq("id", accessoryId)
        .single();
  
      if (accessoryError || !accessory) {
        console.error("Error loading accessory:", accessoryError);
        page.innerHTML = `<p class="details-error">Failed to load accessory details.</p>`;
        return;
      }
  
      const { data: galleryRows, error: galleryError } = await window.db
        .from("accessory_images")
        .select("*")
        .eq("accessory_id", accessoryId)
        .order("sort_order", { ascending: true });
  
      if (galleryError) {
        console.error("Error loading accessory images:", galleryError);
      }
  
      let images = [];
  
      if (accessory.image_url) {
        images.push(accessory.image_url);
      }
  
      if (galleryRows && galleryRows.length) {
        galleryRows.forEach((row) => {
          if (row.image_url && !images.includes(row.image_url)) {
            images.push(row.image_url);
          }
        });
      }
  
      if (!images.length) {
        images = ["images/product-1.jpg"];
      }
  
      const description = accessory.description || "No description available for this product yet.";
      const features = buildAccessoryFeatures(accessory);
  
      page.innerHTML = `
        <div class="car-details-layout">
          <div class="car-gallery">
            <div class="car-main-image">
              <img id="accessoryMainImage" src="${images[0]}" alt="${accessory.name || "Accessory"}">
            </div>
  
            <div class="car-thumbs">
              ${images.map((img, index) => `
                <button class="car-thumb ${index === 0 ? "is-active" : ""}" type="button" data-image="${img}">
                  <img loading="lazy" src="${img}" alt="${accessory.name || "Accessory"} thumbnail ${index + 1}">
                </button>
              `).join("")}
            </div>
          </div>
  
          <div class="car-details-info">
            <h1>${accessory.name || "Untitled Product"}</h1>
  
            <div class="car-price-line">
              <span class="price">$${Number(accessory.price || 0).toLocaleString()}</span>
            </div>
  
            <section class="details-card">
              <h2>Product Details</h2>
  
              <div class="specs-grid">
                <div class="spec-item">
                  <svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <circle cx="12" cy="7" r="4"></circle>
                    <path d="M4 21c0-3.8 3.6-7 8-7s8 3.2 8 7"></path>
                  </svg>
                  <div>
                    <span class="spec-label">Category</span>
                    <span class="spec-value">${accessory.category || "-"}</span>
                  </div>
                </div>
  
                <div class="spec-item">
                  <svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M4 12h16"></path>
                    <path d="M7 8h10"></path>
                    <path d="M7 16h10"></path>
                  </svg>
                  <div>
                    <span class="spec-label">Stock</span>
                    <span class="spec-value">${accessory.stock ?? 0}</span>
                  </div>
                </div>
  
                <div class="spec-item">
                  <svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M21 7l-9 10-5-5"></path>
                  </svg>
                  <div>
                    <span class="spec-label">Status</span>
                    <span class="spec-value">${accessory.is_active ? "Available" : "Unavailable"}</span>
                  </div>
                </div>
  
                <div class="spec-item">
                  <svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <circle cx="12" cy="12" r="8"></circle>
                    <path d="M12 8v4l3 2"></path>
                  </svg>
                  <div>
                    <span class="spec-label">Price</span>
                    <span class="spec-value">$${Number(accessory.price || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </section>
  
            <section class="details-card">
              <h2>Description</h2>
              <div class="details-text">${description}</div>
            </section>
  
            <section class="details-card">
              <h2>Features</h2>
              <div class="features-grid">
                ${features.length
                  ? features.map(feature => `
                      <div class="feature-item">
                        <svg class="feature-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M20 6L9 17l-5-5"></path>
                        </svg>
                        <span>${feature}</span>
                      </div>
                    `).join("")
                  : `<div class="details-text">No features added yet.</div>`
                }
              </div>
  
              <div class="details-actions">
                <button
                  class="whatsapp-detail-btn accessory-add-cart-btn"
                  type="button"
                  data-id="${accessory.id}"
                  data-name="${(accessory.name || "Untitled Product").replace(/"/g, "&quot;")}"
                  data-price="${accessory.price || 0}"
                  data-image="${accessory.image_url || "images/product-1.jpg"}"
                >
                  Add to Cart
                </button>
              </div>
            </section>
          </div>
        </div>
      `;
  
      initAccessoryGallery();
      initAccessoryDetailCartButton();
      hideLoader();
    } catch (err) {
      console.error("Unexpected error loading accessory details:", err);
      page.innerHTML = `<p class="details-error">Failed to load accessory details.</p>`;
      hideLoader();
    }
  }
  
  function initAccessoryGallery() {
    const mainImage = document.getElementById("accessoryMainImage");
    const thumbs = document.querySelectorAll(".car-thumb");
  
    if (!mainImage || !thumbs.length) return;
  
    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const image = thumb.getAttribute("data-image");
        if (!image || mainImage.src.includes(image)) return;
  
        mainImage.style.opacity = "0.35";
  
        const tempImg = new Image();
        tempImg.src = image;
  
        tempImg.onload = () => {
          mainImage.src = image;
          mainImage.style.opacity = "1";
        };
  
        thumbs.forEach((btn) => btn.classList.remove("is-active"));
        thumb.classList.add("is-active");
      });
    });
  }
  
  function initAccessoryDetailCartButton() {
    const button = document.querySelector(".accessory-add-cart-btn");
    if (!button) return;
  
    button.addEventListener("click", async () => {
      const { data } = await window.db.auth.getUser();
      const currentUser = data?.user || null;
  
      if (!currentUser) {
        window.location.href = "login.html";
        return;
      }
  
      window.currentUser = currentUser;
  
      const item = {
        id: button.dataset.id,
        name: button.dataset.name,
        price: Number(button.dataset.price || 0),
        image_url: button.dataset.image,
        quantity: 1
      };
  
      addToCart(item);
  
      button.textContent = "Added";
      button.disabled = true;
  
      setTimeout(() => {
        button.textContent = "Add to Cart";
        button.disabled = false;
      }, 1200);
    });
  }
  
  function buildAccessoryFeatures(accessory) {
    if (accessory.features && accessory.features.trim() !== "") {
      return accessory.features.split(",").map(f => f.trim()).filter(Boolean);
    }
  
    return [];
  }

  
  function renderCartPage() {
    const cartItemsContainer = document.getElementById("cartItems");
    if (!cartItemsContainer) return;
  
    const cart = getCart();
  
    if (!cart.length) {
      cartItemsContainer.innerHTML = `
        <div class="cart-empty">
          <h3>Your cart is empty</h3>
          <p>Browse our premium accessories and add your favorites.</p>
          <a href="accessories.html" class="cart-shop-btn">Shop Accessories</a>
        </div>
      `;
      updateCartSummary([]);
      initClearCartButton();
      return;
    }
  
    cartItemsContainer.innerHTML = cart.map((item) => {
      const total = Number(item.price || 0) * Number(item.quantity || 0);
  
      return `
        <article class="cart-item">
          <div class="cart-item-image">
            <img loading="lazy" src="${item.image_url || "images/product-1.jpg"}" alt="${item.name || "Product"}">
          </div>
  
          <div class="cart-item-info">
            <h3>${item.name || "Untitled Product"}</h3>
            <div class="cart-item-price">$${Number(item.price || 0).toLocaleString()}</div>
  
            <div class="cart-item-controls">
              <button class="qty-btn" type="button" data-action="decrease" data-id="${item.id}">−</button>
              <span class="qty-value">${item.quantity || 1}</span>
              <button class="qty-btn" type="button" data-action="increase" data-id="${item.id}">+</button>
              <button class="remove-btn" type="button" data-action="remove" data-id="${item.id}">Remove</button>
            </div>
          </div>
  
          <div class="cart-item-total">
            $${total.toLocaleString()}
          </div>
        </article>
      `;
    }).join("");
  
    updateCartSummary(cart);
    initCartControls();
    initClearCartButton();
  }
  
  function updateCartSummary(cart) {
    const itemsEl = document.getElementById("cartSummaryItems");
    const subtotalEl = document.getElementById("cartSummarySubtotal");
    const totalEl = document.getElementById("cartSummaryTotal");
  
    if (!itemsEl || !subtotalEl || !totalEl) return;
  
    const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const subtotal = cart.reduce((sum, item) => {
      return sum + (Number(item.price || 0) * Number(item.quantity || 0));
    }, 0);
  
    itemsEl.textContent = totalItems;
    subtotalEl.textContent = `$${subtotal.toLocaleString()}`;
    totalEl.textContent = `$${subtotal.toLocaleString()}`;
  }
  
  function initCartControls() {
    const buttons = document.querySelectorAll("[data-action]");
    if (!buttons.length) return;
  
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        const id = button.dataset.id;
  
        let cart = getCart();
        const item = cart.find((product) => product.id === id);
        if (!item) return;
  
        if (action === "increase") {
          item.quantity += 1;
        }
  
        if (action === "decrease") {
          item.quantity -= 1;
          if (item.quantity <= 0) {
            cart = cart.filter((product) => product.id !== id);
          }
        }
  
        if (action === "remove") {
          cart = cart.filter((product) => product.id !== id);
        }
  
        saveCart(cart);
        renderCartPage();
        updateCartBadge();
      });
    });
  }
  
  function initClearCartButton() {
    const clearBtn = document.getElementById("clearCartBtn");
    if (!clearBtn) return;
  
    clearBtn.addEventListener("click", () => {
      clearCart();
      renderCartPage();
      updateCartBadge();
    });
  }
  function renderCheckoutPage() {
    const container = document.getElementById("checkoutSummaryItems");
    const countEl = document.getElementById("checkoutSummaryCount");
    const totalEl = document.getElementById("checkoutSummaryTotal");
  
    if (!container || !countEl || !totalEl) return;
  
    const cart = getCart();
  
    if (!cart.length) {
      container.innerHTML = `<p class="details-text">Your cart is empty.</p>`;
      countEl.textContent = "0";
      totalEl.textContent = "$0";
      return;
    }
  
    container.innerHTML = cart.map((item) => {
      const qty = Number(item.quantity || 0);
      const total = Number(item.price || 0) * qty;
  
      return `
        <div class="checkout-item">
          <div class="checkout-item-image">
            <img loading="lazy" src="${item.image_url || "images/product-1.jpg"}" alt="${item.name || "Product"}">
          </div>
  
          <div>
            <div class="checkout-item-name">${item.name || "Untitled Product"}</div>
            <div class="checkout-item-meta">Qty: ${qty}</div>
          </div>
  
          <div class="checkout-item-total">$${total.toLocaleString()}</div>
        </div>
      `;
    }).join("");
  
    const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const total = cart.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
  
    countEl.textContent = totalItems;
    totalEl.textContent = `$${total.toLocaleString()}`;
  }
  
  function initCheckoutForm() {
    const form = document.getElementById("checkoutForm");
    if (!form) return;
  
    form.addEventListener("submit", handleCheckoutSubmit);
  }
  
  async function handleCheckoutSubmit(e) {
    e.preventDefault();
  
    const cart = getCart();
    const messageEl = document.getElementById("checkoutMessage");
    const submitBtn = document.getElementById("checkoutSubmitBtn");
  
    if (!cart.length) {
      setCheckoutMessage("Your cart is empty.", "error");
      return;
    }
  
    const { data: authData } = await window.db.auth.getUser();
    const currentUser = authData?.user || null;
  
    if (!currentUser) {
      setCheckoutMessage("You need to log in before placing an order.", "error");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 800);
      return;
    }
    
    
    const customerName = document.getElementById("checkoutName")?.value.trim() || "";
    const customerEmail = document.getElementById("checkoutEmail")?.value.trim() || "";
    const customerPhone = document.getElementById("checkoutPhone")?.value.trim() || "";
    const shippingAddress = document.getElementById("checkoutAddress")?.value.trim() || "";
    const paymentMethod = document.getElementById("checkoutPaymentMethod")?.value || "whish_branch";
    const notes = document.getElementById("checkoutNotes")?.value.trim() || "";
  
    if (!customerName || !customerEmail || !customerPhone || !shippingAddress) {
      setCheckoutMessage("Please fill all required fields.", "error");
      return;
    }
  
    const totalPrice = cart.reduce((sum, item) => {
      return sum + (Number(item.price || 0) * Number(item.quantity || 0));
    }, 0);
  
    try {
      submitBtn.disabled = true;
      setCheckoutMessage("Placing order...", "");
  
      for (const item of cart) {
        const { data: product, error: stockReadError } = await window.db
          .from("accessories")
          .select("id, stock, name")
          .eq("id", item.id)
          .single();
  
        if (stockReadError || !product) {
          throw new Error(`Could not verify stock for ${item.name}.`);
        }
  
        if (Number(product.stock || 0) < Number(item.quantity || 0)) {
          throw new Error(`Not enough stock for ${product.name}.`);
        }
      }
  
      const { data: order, error: orderError } = await window.db
      .from("orders")
      .insert([
        {
          user_id: currentUser ? currentUser.id : null,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          shipping_address: `${shippingAddress}${notes ? `\n\nNotes: ${notes}` : ""}`,
          total_price: totalPrice,
          payment_method: paymentMethod,
          payment_status: "pending",
          order_status: "pending_payment"
        }
      ])
      .select()
      .single();
  
      if (orderError || !order) {
        throw new Error(orderError?.message || "Failed to create order.");
      }
  
      for (const item of cart) {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.price || 0);
  
        const { error: itemError } = await window.db
          .from("order_items")
          .insert([
            {
              order_id: order.id,
              accessory_id: item.id,
              quantity,
              unit_price: unitPrice
            }
          ]);
  
        if (itemError) {
          throw new Error(itemError.message || "Failed to save order items.");
        }
  
        const { data: product, error: productReadError } = await window.db
          .from("accessories")
          .select("stock")
          .eq("id", item.id)
          .single();
  
        if (productReadError || !product) {
          throw new Error("Failed to refresh stock.");
        }
  
        const newStock = Number(product.stock || 0) - quantity;
  
        const { error: stockUpdateError } = await window.db
          .from("accessories")
          .update({ stock: newStock })
          .eq("id", item.id);
  
        if (stockUpdateError) {
          throw new Error(stockUpdateError.message || "Failed to update stock.");
        }
      }
  
      clearCart();
      updateCartBadge();
      renderCheckoutPage();
      setCheckoutMessage("Order placed successfully.", "success");
      formResetSafe(form);
    } catch (error) {
      console.error("Checkout error:", error);
      setCheckoutMessage(error.message || "Checkout failed.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  }
  
  function setCheckoutMessage(message, type) {
    const messageEl = document.getElementById("checkoutMessage");
    if (!messageEl) return;
  
    messageEl.textContent = message;
    messageEl.classList.remove("success", "error");
  
    if (type) {
      messageEl.classList.add(type);
    }
  }
  
  function formResetSafe(form) {
    if (form && typeof form.reset === "function") {
      form.reset();
    }
  }
  function initSignupForm() {
    const form = document.getElementById("signupForm");
    if (!form) return;
  
    form.addEventListener("submit", handleSignupSubmit);
  }
  
  async function handleSignupSubmit(e) {
    e.preventDefault();
  
    const fullName = document.getElementById("signupFullName")?.value.trim() || "";
    const email = document.getElementById("signupEmail")?.value.trim() || "";
    const password = document.getElementById("signupPassword")?.value || "";
    const confirmPassword = document.getElementById("signupConfirmPassword")?.value || "";
    const messageEl = document.getElementById("signupMessage");
  
    if (!fullName || !email || !password || !confirmPassword) {
      setAuthMessage("signupMessage", "Please fill all fields.", "error");
      return;
    }
  
    if (password !== confirmPassword) {
      setAuthMessage("signupMessage", "Passwords do not match.", "error");
      return;
    }
  
    if (password.length < 6) {
      setAuthMessage("signupMessage", "Password must be at least 6 characters.", "error");
      return;
    }
  
    try {
      setAuthMessage("signupMessage", "Creating account...", "");
  
      const { data, error } = await window.db.auth.signUp({
        email,
        password
      });
  
      if (error) {
        throw error;
      }
  
      const user = data.user;
  
      if (user) {
        const { error: profileError } = await window.db
          .from("users")
          .upsert([
            {
              id: user.id,
              full_name: fullName,
              email: email,
              role: "customer"
            }
          ]);
  
        if (profileError) {
          throw profileError;
        }
      }
  
      setAuthMessage("signupMessage", "Account created successfully. Check your email if confirmation is enabled.", "success");
      formResetById("signupForm");
    } catch (error) {
      console.error("Signup error:", error);
      setAuthMessage("signupMessage", error.message || "Signup failed.", "error");
    }
  }
  function initLoginForm() {
    const form = document.getElementById("loginForm");
    if (!form) return;
  
    form.addEventListener("submit", handleLoginSubmit);
  }
  
  async function handleLoginSubmit(e) {
    e.preventDefault();
  
    const email = document.getElementById("loginEmail")?.value.trim() || "";
    const password = document.getElementById("loginPassword")?.value || "";
  
    if (!email || !password) {
      setAuthMessage("loginMessage", "Please enter email and password.", "error");
      return;
    }
  
    try {
      setAuthMessage("loginMessage", "Logging in...", "");
  
      const { data, error } = await window.db.auth.signInWithPassword({
        email,
        password
      });
  
      if (error) {
        throw error;
      }
  
      const user = data?.user;
      if (!user) {
        throw new Error("Login failed.");
      }
  
      const { data: profile, error: profileError } = await window.db
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
  
      if (profileError) {
        throw profileError;
      }
  
      setAuthMessage("loginMessage", "Login successful.", "success");
  
      setTimeout(() => {
        if (profile?.role === "admin") {
          window.location.href = "admin-dashboard.html";
        } else {
          window.location.href = "index.html";
        }
      }, 500);
  
    } catch (error) {
      console.error("Login error:", error);
      setAuthMessage("loginMessage", error.message || "Login failed.", "error");
    }
  }
  function setAuthMessage(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
  
    el.textContent = message;
    el.classList.remove("success", "error");
  
    if (type) {
      el.classList.add(type);
    }
  }
  function formResetById(formId) {
    const form = document.getElementById(formId);
    if (form && typeof form.reset === "function") {
      form.reset();
    }
  }
  function getDepositCountdown(deadline) {
    if (!deadline) return "No deadline";
  
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();
  
    if (diff <= 0) {
      return "Expired";
    }
  
    const totalMinutes = Math.floor(diff / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
  
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m left`;
    }
  
    return `${hours}h ${minutes}m left`;
  }
  async function loadAccountPage() {
    const profileContainer = document.getElementById("accountProfile");
    const ordersContainer = document.getElementById("accountOrders");
    const rentalsContainer = document.getElementById("accountRentals");
  
    if (!profileContainer && !ordersContainer && !rentalsContainer) return;
  
    try {
      const { data: sessionData, error: sessionError } = await window.db.auth.getUser();
  
      if (sessionError || !sessionData?.user) {
        window.location.href = "login.html";
        return;
      }
  
      const user = sessionData.user;
  
      const { data: profile, error: profileError } = await window.db
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
  
      if (profileContainer) {
        if (profileError || !profile) {
          profileContainer.innerHTML = `<p class="account-empty">Could not load profile.</p>`;
        } else {
          profileContainer.innerHTML = `
            <div class="account-profile-grid">
              <div class="account-profile-item">
                <span class="account-profile-label">Full Name</span>
                <span class="account-profile-value">${profile.full_name || "-"}</span>
              </div>
  
              <div class="account-profile-item">
                <span class="account-profile-label">Email</span>
                <span class="account-profile-value">${profile.email || user.email || "-"}</span>
              </div>
  
              <div class="account-profile-item">
                <span class="account-profile-label">Role</span>
                <span class="account-profile-value">${profile.role || "customer"}</span>
              </div>
  
              <div class="account-profile-item">
                <span class="account-profile-label">Account Created</span>
                <span class="account-profile-value">${formatAccountDate(profile.created_at)}</span>
              </div>
            </div>
          `;
        }
      }
  
      if (ordersContainer) {
        const { data: orders, error: ordersError } = await window.db
  .from("orders")
  .select(`
    *,
    order_items (
      quantity,
      unit_price,
      accessories (
        name
      )
    )
  `)
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });
  
        if (ordersError) {
          ordersContainer.innerHTML = `<p class="account-empty">Could not load orders.</p>`;
        } else if (!orders || orders.length === 0) {
          ordersContainer.innerHTML = `<p class="account-empty">No orders yet.</p>`;
        } else {
          ordersContainer.innerHTML = `
<div class="account-list">
${orders.map(order => {

  const items = order.order_items?.map(item => `
      <div>
        ${item.accessories?.name || "Product"} 
        (x${item.quantity})
      </div>
  `).join("") || "";

  return `
  <div class="account-item">

    <div class="account-item-top">
      <div class="account-item-title">Order #${order.id.slice(0,8)}</div>
      <div class="account-item-status">${order.order_status || "pending"}</div>
    </div>

    <div class="account-items">
      ${items}
    </div>

    <div class="account-item-meta">
      <div>Total: $${Number(order.total_price || 0).toLocaleString()}</div>
      <div>Payment: ${order.payment_method || "-"}</div>
      <div>Payment Status: ${order.payment_status || "-"}</div>
      <div>Date: ${formatAccountDate(order.created_at)}</div>
    </div>

  </div>
  `;
}).join("")}
</div>
`;
        }
      }
  
      if (rentalsContainer) {
        const { data: rentals, error: rentalsError } = await window.db
          .from("rentals")
          .select(`
            *,
            rental_cars (
              title
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
      
        if (rentalsError) {
          rentalsContainer.innerHTML = `<p class="account-empty">Could not load rentals.</p>`;
        } else if (!rentals || rentals.length === 0) {
          rentalsContainer.innerHTML = `<p class="account-empty">No rentals yet.</p>`;
        } else {
          rentalsContainer.innerHTML = `
      <div class="account-list">
        ${rentals.map(rental => {
          const dueDateText = rental.deposit_due_at
  ? new Date(rental.deposit_due_at).toLocaleString()
  : "-";

  const countdownText =
  rental.payment_method === "whish_branch" && rental.deposit_status === "pending"
    ? getDepositCountdown(rental.deposit_due_at)
    : "-";
      
          return `
            <div class="account-item">
              <div class="account-item-top">
                <div class="account-item-title">
                  ${rental.rental_cars?.title || "Rental Car"} 
                  <span style="font-size:14px; color:#6b7280;">#${rental.id.slice(0, 8)}</span>
                </div>
                <div class="account-item-status">${rental.booking_status || "pending"}</div>
              </div>
      
              <div class="account-item-meta">
                <div>Booking Ref: ${rental.booking_reference || "-"}</div>
                <div>Start: ${rental.start_date || "-"}</div>
                <div>End: ${rental.end_date || "-"}</div>
                <div>Total Days: ${rental.total_days || 0}</div>
                <div>Total Price: $${Number(rental.total_price || 0).toLocaleString()}</div>
                <div>Deposit Now: $${Number(rental.deposit_amount || 0).toLocaleString()}</div>
                <div>Remaining on Delivery: $${Number(rental.remaining_amount || 0).toLocaleString()}</div>
                <div>Deposit Status: ${rental.deposit_status || "-"}</div>
                <div>Payment Method: ${rental.payment_method || "-"}</div>
                <div>Deposit Deadline: ${dueDateText}</div>
                <div>Time Remaining: ${countdownText}</div>
                <div>Payment Status: ${rental.payment_status || "-"}</div>
              </div>
      
              ${
  rental.payment_method === "whish_branch" && rental.deposit_status === "pending"
    ? `
      <div style="margin-top:14px; padding:12px 14px; border-radius:12px; background:rgba(201,164,88,0.10); border:1px solid rgba(201,164,88,0.25);">
        Pay your deposit at any Whish branch using booking reference
        <strong>${rental.booking_reference || "-"}</strong>.
      </div>
    `
    : rental.payment_method === "whish_app" && rental.payment_status === "processing"
    ? `
      <div style="margin-top:14px; padding:12px 14px; border-radius:12px; background:rgba(201,164,88,0.10); border:1px solid rgba(201,164,88,0.25);">
        Your booking is waiting for Whish App payment confirmation.
      </div>
    `
    : ""
}
            </div>
          `;
        }).join("")}
      </div>
      `;
        }
      }
    } catch (error) {
      console.error("Account page error:", error);
  
      if (profileContainer) {
        profileContainer.innerHTML = `<p class="account-empty">Failed to load account.</p>`;
      }
      if (ordersContainer) {
        ordersContainer.innerHTML = `<p class="account-empty">Failed to load orders.</p>`;
      }
      if (rentalsContainer) {
        rentalsContainer.innerHTML = `<p class="account-empty">Failed to load rentals.</p>`;
      }
    }
  }
  
  function formatAccountDate(dateString) {
    if (!dateString) return "-";
  
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
  
    return date.toLocaleDateString();
  }
  function initLogoutButtons() {
    const buttons = document.querySelectorAll(".logout-btn");
    if (!buttons.length) return;
  
    buttons.forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await window.db.auth.signOut();
          window.currentUser = null;
          updateCartBadge();
          window.location.href = "login.html";
        } catch (error) {
          console.error("Logout error:", error);
        }
      });
    });
  }
  async function updateHeaderAuthState() {
    const guestItems = document.querySelectorAll(".guest-only");
    const userItems = document.querySelectorAll(".user-only");
  
    if (!guestItems.length && !userItems.length) {
      document.body.classList.add("auth-ready");
      return;
    }
  
    try {
      const { data, error } = await window.db.auth.getUser();
  
      guestItems.forEach((el) => el.classList.remove("show-auth-item"));
      userItems.forEach((el) => el.classList.remove("show-auth-item"));
  
      if (error || !data?.user) {
        guestItems.forEach((el) => el.classList.add("show-auth-item"));
      } else {
        userItems.forEach((el) => el.classList.add("show-auth-item"));
      }
    } catch (error) {
      console.error("Header auth state error:", error);
      guestItems.forEach((el) => el.classList.add("show-auth-item"));
    } finally {
      document.body.classList.add("auth-ready");
    }
  }
  async function loadFeaturedRentals() {
    const container = document.getElementById("featuredRentalsGrid");
    if (!container) return;
  
    try {
      const today = new Date();
      const todayString = today.toISOString().split("T")[0];
  
      const { data: cars, error: carsError } = await window.db
        .from("rental_cars")
        .select("*")
        .eq("is_available", true)
        .eq("featured", true)
        .order("created_at", { ascending: false });
  
      if (carsError) {
        console.error("Error loading featured rentals:", carsError);
        container.innerHTML = `<p>Failed to load featured rentals.</p>`;
        return;
      }
  
      const { data: bookings, error: bookingsError } = await window.db
        .from("rentals")
        .select("rental_car_id, start_date, end_date, booking_status")
        .neq("booking_status", "cancelled");
  
      if (bookingsError) {
        console.error("Error loading bookings:", bookingsError);
        container.innerHTML = `<p>Failed to load featured rentals.</p>`;
        return;
      }
  
      const visibleCars = (cars || []).filter((car) => {
        const hasActiveBooking = (bookings || []).some((booking) => {
          return (
            booking.rental_car_id === car.id &&
            booking.start_date <= todayString &&
            booking.end_date >= todayString
          );
        });
  
        return !hasActiveBooking;
      }).slice(0, 3);
  
      if (!visibleCars.length) {
        container.innerHTML = "<p>No featured rentals right now.</p>";
        return;
      }
  
      container.innerHTML = visibleCars.map((car) => `
  <article class="rental-card card-clickable" data-href="rental-details.html?id=${car.id}">
    <div class="rental-image">
      <img loading="lazy" src="${car.image_url || "images/rental-1.jpg"}" alt="${car.title || "Rental Car"}" />
    </div>

    <div class="rental-body">
      <h3>${car.title || "Untitled Car"}</h3>

      <div class="rental-meta">
        <span>${car.seats || "-"} Seats</span>
        <span>•</span>
        <span>${car.transmission || "-"}</span>
        <span>•</span>
        <span>${car.fuel_type || "-"}</span>
      </div>

      <div class="rental-bottom">
        <div class="rental-price">
          <strong>$${Number(car.price_per_day || 0).toLocaleString()}</strong><span>/day</span>
        </div>

        <span class="rent-btn">Rent Now</span>
      </div>
    </div>
  </article>
`).join("");

initClickableCards();
    } catch (err) {
      console.error("Unexpected featured rentals error:", err);
      container.innerHTML = `<p>Failed to load featured rentals.</p>`;
    }
  }
  async function loadFeaturedCarsForSale() {
    const container = document.getElementById("featuredSaleGrid");
    if (!container) return;
  
    container.innerHTML = "<p>Loading featured cars...</p>";
  
    try {
      const { data, error } = await window.db
        .from("cars_for_sale")
        .select("*")
        .eq("is_available", true)
        .eq("featured", true)
        .limit(3)
        .order("created_at", { ascending: false });
  
      if (error) {
        console.error("Error loading featured sale cars:", error);
        container.innerHTML = `<p>Failed to load featured cars.</p>`;
        return;
      }
  
      if (!data || data.length === 0) {
        container.innerHTML = "<p>No featured cars right now.</p>";
        return;
      }
  
      container.innerHTML = data.map((car) => `
  <article class="sale-card card-clickable" data-href="car-details.html?id=${car.id}">
    <div class="sale-image">
      <img loading="lazy" src="${car.image_url || "images/car1.jpg"}" alt="${car.title || "Car"}" />
      <span class="car-tag">${car.featured ? "Featured" : "Available"}</span>
    </div>

    <div class="sale-body">
      <h3>${car.title || "Untitled Car"}</h3>

      <div class="sale-meta">
        <span>${car.year || "-"}</span>
        <span>•</span>
        <span>${Number(car.mileage || 0).toLocaleString()} mi</span>
      </div>

      <div class="sale-bottom">
        <div class="sale-price">$${Number(car.price || 0).toLocaleString()}</div>
        <span class="details-btn">View Details</span>
      </div>
    </div>
  </article>
`).join("");

initClickableCards();

    } catch (err) {
      console.error("Unexpected featured sale cars error:", err);
      container.innerHTML = `<p>Failed to load featured cars.</p>`;
    }
  }
  async function loadFeaturedAccessories() {
    const container = document.getElementById("featuredAccessoriesGrid");
    if (!container) return;
  
    container.innerHTML = "<p>Loading featured accessories...</p>";
  
    try {
      const { data, error } = await window.db
        .from("accessories")
        .select("*")
        .eq("is_active", true)
        .eq("featured", true)
        .limit(3)
        .order("created_at", { ascending: false });
  
      if (error) {
        console.error("Error loading featured accessories:", error);
        container.innerHTML = `<p>Failed to load featured accessories.</p>`;
        return;
      }
  
      if (!data || data.length === 0) {
        container.innerHTML = "<p>No featured accessories right now.</p>";
        return;
      }
  
      container.innerHTML = data.map((item) => `
  <article class="accessory-card card-clickable" data-href="accessory-details.html?id=${item.id}">
    <div class="accessory-image">
      <img loading="lazy" src="${item.image_url || "images/product-1.jpg"}" alt="${item.name || "Accessory"}" />
    </div>

    <div class="accessory-body">
      <h3>${item.name || "Untitled Product"}</h3>

      <div class="accessory-bottom">
        <div class="accessory-price">$${Number(item.price || 0).toLocaleString()}</div>
        <span class="cart-btn">View Details</span>
      </div>
    </div>
  </article>
`).join("");

initClickableCards();

    } catch (err) {
      console.error("Unexpected featured accessories error:", err);
      container.innerHTML = `<p>Failed to load featured accessories.</p>`;
    }
  }
  async function renderRentalCheckoutPage() {
    const summary = document.getElementById("rentalCheckoutSummary");
    if (!summary) return;
  
    const { data: authData, error: authError } = await window.db.auth.getUser();
  
    if (authError || !authData?.user) {
      window.location.href = "login.html";
      return;
    }
  
    const booking = JSON.parse(localStorage.getItem("rentalCheckout") || "null");
  
    if (!booking) {
      summary.innerHTML = `<p class="details-text">No rental booking found.</p>`;
      hideLoader();
      return;
    }
  
    summary.innerHTML = `
      <div class="checkout-item" style="margin-bottom:16px;">
        <div class="checkout-item-image">
          <img src="${booking.image_url || "images/rental-1.jpg"}" alt="${booking.title || "Rental Car"}">
        </div>
  
        <div>
          <div class="checkout-item-name">${booking.title || "Rental Car"}</div>
          <div class="checkout-item-meta">${booking.pickup_date} → ${booking.return_date}</div>
        </div>
      </div>
  
      <div class="booking-summary-list">
        <div class="booking-summary-item">
          <span>Total Days</span>
          <strong>${booking.total_days || 0}</strong>
        </div>
  
        <div class="booking-summary-item">
          <span>Price Per Day</span>
          <strong>$${Number(booking.price_per_day || 0).toLocaleString()}</strong>
        </div>
  
        <div class="booking-summary-item">
          <span>Base Price</span>
          <strong>$${Number(booking.base_price || 0).toLocaleString()}</strong>
        </div>
  
        <div class="booking-summary-item">
          <span>Chauffeur</span>
          <strong>$${Number(booking.chauffeur_price || 0).toLocaleString()}</strong>
        </div>
  
        <div class="booking-summary-item">
          <span>Deposit Due Now</span>
          <strong>$${Number(booking.deposit_amount || 0).toLocaleString()}</strong>
        </div>
  
        <div class="booking-summary-item">
          <span>Remaining on Delivery</span>
          <strong>$${Number(booking.remaining_amount || 0).toLocaleString()}</strong>
        </div>
  
        <div class="booking-summary-item">
          <span>Full Rental Total</span>
          <strong>$${Number(booking.total_price || 0).toLocaleString()}</strong>
        </div>
      </div>
    `;
  
    hideLoader();
  }
  function initRentalPaymentMethodUI() {
    const paymentSelect = document.getElementById("rentalCheckoutPayment");
    const appBox = document.getElementById("whishAppCardBox");
    const branchBox = document.getElementById("whishBranchInfoBox");
  
    if (!paymentSelect || !appBox || !branchBox) return;
  
    const cardName = document.getElementById("whishCardName");
    const cardNumber = document.getElementById("whishCardNumber");
    const cardExpiry = document.getElementById("whishCardExpiry");
    const cardCvv = document.getElementById("whishCardCvv");
  
    function updatePaymentUI() {
      const isApp = paymentSelect.value === "whish_app";
  
      appBox.style.display = isApp ? "block" : "none";
      branchBox.style.display = isApp ? "none" : "block";
  
      if (cardName) cardName.required = isApp;
      if (cardNumber) cardNumber.required = isApp;
      if (cardExpiry) cardExpiry.required = isApp;
      if (cardCvv) cardCvv.required = isApp;
    }
  
    paymentSelect.addEventListener("change", updatePaymentUI);
    updatePaymentUI();
  }
  function initRentalCheckoutForm() {
    const form = document.getElementById("rentalCheckoutForm");
    if (!form) return;
  
    form.addEventListener("submit", handleRentalCheckoutSubmit);
  }
  function generateBookingReference() {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `RNT-${year}-${random}`;
  }
  async function uploadRentalDocument(file, folder = "documents") {
    if (!file) return null;
  
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "file";
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
  
    const { error } = await window.db.storage
      .from("rental-documents")
      .upload(fileName, file, {
        upsert: false
      });
  
    if (error) {
      throw new Error(error.message || "Failed to upload document.");
    }
  
    return fileName;
  }
  async function handleRentalCheckoutSubmit(e) {
    e.preventDefault();
  
    const booking = JSON.parse(localStorage.getItem("rentalCheckout") || "null");
    if (!booking) {
      setRentalCheckoutMessage("No rental booking found.", "error");
      return;
    }
  
    const name = document.getElementById("rentalCheckoutName")?.value.trim() || "";
    const email = document.getElementById("rentalCheckoutEmail")?.value.trim() || "";
    const phone = document.getElementById("rentalCheckoutPhone")?.value.trim() || "";
    const paymentMethod = document.getElementById("rentalCheckoutPayment")?.value || "whish_branch";
    const notes = document.getElementById("rentalCheckoutNotes")?.value.trim() || "";
    const idFile = document.getElementById("rentalCustomerIdFile")?.files?.[0] || null;
    const licenseFile = document.getElementById("rentalDriverLicenseFile")?.files?.[0] || null;
    const submitBtn = document.getElementById("rentalCheckoutSubmitBtn");
  
    if (!name || !email || !phone) {
      setRentalCheckoutMessage("Please fill all required fields.", "error");
      return;
    }
  
    if (!idFile || !licenseFile) {
      setRentalCheckoutMessage("Please upload your ID/passport and driver's license.", "error");
      return;
    }
  
    try {
      submitBtn.disabled = true;
      setRentalCheckoutMessage("Saving booking...", "");
  
      const { data: authData } = await window.db.auth.getUser();
      const currentUser = authData?.user || null;
  
      const { data: existingBookings, error: overlapError } = await window.db
        .from("rentals")
        .select("id, start_date, end_date, booking_status")
        .eq("rental_car_id", booking.rental_car_id)
        .neq("booking_status", "cancelled");
  
      if (overlapError) {
        throw overlapError;
      }
  
      const newStart = new Date(booking.pickup_date);
      const newEnd = new Date(booking.return_date);
  
      let conflictBooking = null;
  
      const hasConflict = existingBookings?.some((rental) => {
        const existingStart = new Date(rental.start_date);
        const existingEnd = new Date(rental.end_date);
  
        const overlap = newStart <= existingEnd && newEnd >= existingStart;
  
        if (overlap) {
          conflictBooking = rental;
        }
  
        return overlap;
      });
  
      if (hasConflict && conflictBooking) {
        const startText = new Date(conflictBooking.start_date).toLocaleDateString();
        const endText = new Date(conflictBooking.end_date).toLocaleDateString();
  
        setRentalCheckoutMessage(
          `This car is already booked from ${startText} to ${endText}. Please choose different dates.`,
          "error"
        );
        submitBtn.disabled = false;
        return;
      }
  
      const bookingReference = generateBookingReference();
      const totalPrice = Number(booking.total_price || 0);
const depositAmount = Number(booking.deposit_amount || 0);
const remainingAmount = Number(booking.remaining_amount || 0);
  
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + 48);
  
      setRentalCheckoutMessage("Uploading documents...", "");
  
      const idFilePath = await uploadRentalDocument(idFile, "ids");
      const licenseFilePath = await uploadRentalDocument(licenseFile, "licenses");
  
      const bookingStatus =
      paymentMethod === "whish_app" ? "pending_payment" : "pending_deposit";
    
    const depositStatus =
      paymentMethod === "whish_app" ? "processing" : "pending";
    
    const paymentStatus =
      paymentMethod === "whish_app" ? "processing" : "pending";
  
      const { error } = await window.db
        .from("rentals")
        .insert([
          {
            user_id: currentUser ? currentUser.id : null,
            rental_car_id: booking.rental_car_id,
            booking_reference: bookingReference,
            customer_name: name,
            customer_email: email,
            customer_phone: phone,
            start_date: booking.pickup_date,
            end_date: booking.return_date,
            total_days: booking.total_days,
            base_price: booking.base_price,
            chauffeur_required: booking.chauffeur_required,
            chauffeur_price: booking.chauffeur_price,
            deposit_amount: depositAmount,
            remaining_amount: remainingAmount,
            deposit_status: depositStatus,
            deposit_due_at: paymentMethod === "whish_branch" ? dueDate.toISOString() : null,
            total_price: totalPrice,
            payment_method: paymentMethod,
            booking_status: bookingStatus,
            payment_status: paymentStatus,
            customer_id_file_url: idFilePath,
            driver_license_file_url: licenseFilePath,
            notes: notes || null
          }
        ]);
  
      if (error) {
        throw error;
      }
  
      localStorage.removeItem("rentalCheckout");
  
      if (paymentMethod === "whish_app") {
        setRentalCheckoutMessage(
          `Booking created successfully. Reference: ${bookingReference}. Waiting for Whish App confirmation.`,
          "success"
        );
      } else {
        setRentalCheckoutMessage(
          `Booking created successfully. Reference: ${bookingReference}`,
          "success"
        );
      }
  
      setTimeout(() => {
        window.location.href = "account.html";
      }, 1800);
    } catch (error) {
      console.error("Rental checkout error:", error);
      setRentalCheckoutMessage(error.message || "Failed to save booking.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  }
  
  function setRentalCheckoutMessage(message, type) {
    const el = document.getElementById("rentalCheckoutMessage");
    if (!el) return;
  
    el.textContent = message;
    el.classList.remove("success", "error");
  
    if (type) {
      el.classList.add(type);
    }
  }
  
  function initClickableCards() {
    const cards = document.querySelectorAll(".card-clickable");
    if (!cards.length) return;
  
    cards.forEach((card) => {
      if (card.dataset.bound === "true") return;
      card.dataset.bound = "true";
  
      card.style.cursor = "pointer";
  
      card.addEventListener("click", (e) => {
        if (e.target.closest(".stop-card-click")) return;
  
        const href = card.dataset.href;
        if (!href) return;
  
        window.location.href = href;
      });
    });
  }
  function initMobileMenu() {
    const btn = document.getElementById("mobileMenuBtn");
    const nav = document.getElementById("mainNav");
    if (!btn || !nav) return;
  
    btn.addEventListener("click", () => {
      nav.classList.toggle("open");
    });
  }