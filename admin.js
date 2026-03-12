const pageLoader = document.getElementById("pageLoader");

function showLoader() {
  if (!pageLoader) return;
  pageLoader.classList.remove("hide");
}

function hideLoader() {
  document.body.classList.add("admin-ready");

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
document.addEventListener("DOMContentLoaded", async () => {
  if (!window.db) {
    console.error("Supabase client not found. Make sure supabase.js is loaded before admin.js");
    hideLoader();
    window.location.href = "index.html";
    return;
  }
  try {
    const { data: authData, error: authError } = await window.db.auth.getUser();

    if (authError || !authData?.user) {
      hideLoader();
      window.location.href = "index.html";
      return;
    }

    const { data: profile, error: profileError } = await window.db
      .from("users")
      .select("role")
      .eq("id", authData.user.id)
      .single();

      if (profileError || !profile || profile.role !== "admin") {
        hideLoader();
        window.location.href = "index.html";
        return;
      }

    initAdminLogout();

    initProgressiveImageInputs([
      "rentalGalleryImage1",
      "rentalGalleryImage2",
      "rentalGalleryImage3",
      "rentalGalleryImage4",
      "rentalGalleryImage5"
    ]);

    initProgressiveImageInputs([
      "accessoryGalleryImage1",
      "accessoryGalleryImage2",
      "accessoryGalleryImage3",
      "accessoryGalleryImage4",
      "accessoryGalleryImage5"
    ]);

    await loadAdminDashboard();
    await loadAdminRentCars();
    await loadAdminSaleCars();
    await loadAdminAccessories();
    await loadAdminBookings();
    await loadAdminOrders();
    await loadAdminCustomers();
    await loadAdminAnalytics();
    await loadAdminSettings();


  } catch (error) {
    console.error("Admin init error:", error);
    window.location.href = "index.html";
  }
  hideLoader();
});
  /* =========================
     HELPERS
  ========================= */
  
  function formatMoney(value) {
    return `$${Number(value || 0).toLocaleString()}`;
  }
  
  function formatDate(dateString) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  }
  
  function getMonthShortName(index) {
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][index];
  }
  
  function getMonthTotalsFromRows(rows, valueGetter) {
    const totals = new Array(12).fill(0);
  
    rows.forEach((row) => {
      if (!row?.created_at) return;
      const monthIndex = new Date(row.created_at).getMonth();
      totals[monthIndex] += Number(valueGetter(row) || 0);
    });
  
    return totals;
  }
  function initAdminLogout() {
    const logoutBtn = document.getElementById("adminLogoutBtn");
    if (!logoutBtn || logoutBtn.dataset.bound) return;
  
    logoutBtn.dataset.bound = "true";
  
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
  
      try {
        await window.db.auth.signOut();
        window.location.href = "login.html";
      } catch (error) {
        console.error("Admin logout error:", error);
        alert("Failed to log out.");
      }
    });
  }
  
  function calculateMonthChange(monthTotals) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  
    const currentValue = Number(monthTotals[currentMonth] || 0);
    const previousValue = Number(monthTotals[previousMonth] || 0);
  
    if (previousValue === 0 && currentValue === 0) {
      return { text: "0%", className: "up" };
    }
  
    if (previousValue === 0 && currentValue > 0) {
      return { text: "+100%", className: "up" };
    }
  
    const change = ((currentValue - previousValue) / previousValue) * 100;
    const rounded = Math.round(change);
  
    if (rounded >= 0) {
      return { text: `+${rounded}%`, className: "up" };
    }
  
    return { text: `${rounded}%`, className: "down" };
  }
  
  function getCurrentMonthTotal(monthTotals) {
    const now = new Date();
    return Number(monthTotals[now.getMonth()] || 0);
  }
  
  function getStatusClass(status) {
    const value = String(status || "").toLowerCase();
  
    if (["confirmed", "available", "delivered", "completed", "paid", "active", "in stock"].includes(value)) {
      return "success";
    }
  
    if (["pending", "processing", "reserved", "partial", "low stock", "shipped"].includes(value)) {
      return "warning";
    }
  
    if (["cancelled", "sold", "rented", "unavailable", "out of stock", "failed"].includes(value)) {
      return "danger";
    }
  
    return "default";
  }
  
  function makeStatusBadge(status) {
    return `<span class="status-badge ${getStatusClass(status)}">${status || "-"}</span>`;
  }
  
  function getCanvasContext(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    return canvas.getContext("2d");
  }
  
  function destroyChartIfExists(chartRef) {
    if (chartRef && typeof chartRef.destroy === "function") {
      chartRef.destroy();
    }
  }
  async function uploadImageToSupabase(file, folder = "general") {
    if (!file) return null;
  
    const extension = file.name.split(".").pop();
    const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  
    const { error: uploadError } = await window.db.storage
      .from("images")
      .upload(filePath, file);
  
    if (uploadError) {
      throw uploadError;
    }
  
    const { data } = window.db.storage
      .from("images")
      .getPublicUrl(filePath);
  
    return data.publicUrl;
  }
  
  async function uploadOptionalGalleryFiles(fileInputs, folder = "general") {
    const urls = [];
  
    for (const input of fileInputs) {
      const file = input?.files?.[0];
      if (!file) continue;
  
      const url = await uploadImageToSupabase(file, folder);
      if (url) urls.push(url);
    }
  
    return urls;
  }
  
  function initProgressiveImageInputs(inputIds) {
    const inputs = inputIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);
  
    if (!inputs.length) return;
  
    inputs.forEach((input, index) => {
      input.addEventListener("change", () => {
        const hasFile = input.files && input.files.length > 0;
        const nextInput = inputs[index + 1];
  
        if (hasFile && nextInput) {
          nextInput.style.display = "block";
        }
      });
    });
  }
  /* =========================
     GLOBAL CHART REFS
  ========================= */
  
  let rentalsPerMonthChart = null;
  let salesStatisticsChart = null;
  let analyticsRevenueChart = null;
  let analyticsTypesChart = null;
  
  /* =========================
     DASHBOARD
  ========================= */
  
  async function loadAdminDashboard() {
    const statsWrap = document.getElementById("dashboardStats");
    const latestBookingsWrap = document.getElementById("latestBookings");
    const latestPurchasesWrap = document.getElementById("latestPurchases");
    const rentalsChartCanvas = document.getElementById("rentalsPerMonthChart");
    const salesChartCanvas = document.getElementById("salesStatisticsChart");
  
    if (!statsWrap && !latestBookingsWrap && !latestPurchasesWrap && !rentalsChartCanvas && !salesChartCanvas) {
      return;
    }
  
    try {
      const [
        rentalCarsRes,
        rentalsRes,
        ordersRes,
        saleCarsRes
      ] = await Promise.all([
        window.db.from("rental_cars").select("*"),
        window.db.from("rentals").select("*"),
        window.db.from("orders").select("*"),
        window.db.from("cars_for_sale").select("*")
      ]);
  
      const rentalCars = rentalCarsRes.data || [];
      const rentals = rentalsRes.data || [];
      const orders = ordersRes.data || [];
      const salesCars = saleCarsRes.data || [];
  
      renderDashboardStats(rentalCars, rentals, orders, salesCars);
      renderDashboardRentalsChart(rentals);
      renderDashboardSalesChart(orders, rentals);
      await renderLatestBookings();
      await renderLatestPurchases();
    } catch (error) {
      console.error("Dashboard load error:", error);
    }
  }
  
  function renderDashboardStats(rentalCars, rentals, orders, salesCars) {
    const statsWrap = document.getElementById("dashboardStats");
    if (!statsWrap) return;
  
    const today = new Date().toISOString().slice(0, 10);
  
    const carsRentedToday = rentals.filter((item) => {
      const created = item.created_at ? item.created_at.slice(0, 10) : "";
      return created === today;
    }).length;
  
    const totalOrders = orders.length;
  
    const rentalRevenuePerMonth = getMonthTotalsFromRows(rentals, (r) => Number(r.deposit_paid || 0));
    const orderRevenuePerMonth = getMonthTotalsFromRows(orders, (o) => Number(o.total_price || 0));
    const revenuePerMonth = rentalRevenuePerMonth.map((value, index) => value + orderRevenuePerMonth[index]);
  
    const totalCarsPerMonth = getMonthTotalsFromRows(
      [...rentalCars, ...salesCars],
      () => 1
    );
  
    const rentalsPerMonth = getMonthTotalsFromRows(rentals, () => 1);
    const ordersPerMonth = getMonthTotalsFromRows(orders, () => 1);
  
    const totalCarsChange = calculateMonthChange(totalCarsPerMonth);
    const rentedTodayChange = calculateMonthChange(rentalsPerMonth);
    const totalOrdersChange = calculateMonthChange(ordersPerMonth);
    const monthlyRevenueChange = calculateMonthChange(revenuePerMonth);
  
    const currentMonthRevenue = getCurrentMonthTotal(revenuePerMonth);
  
    statsWrap.innerHTML = `
      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 13l2-5h14l2 5"></path>
              <path d="M5 13h14v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5Z"></path>
              <circle cx="7.5" cy="17.5" r="1"></circle>
              <circle cx="16.5" cy="17.5" r="1"></circle>
            </svg>
          </div>
          <div class="stat-change ${totalCarsChange.className}">
            ${totalCarsChange.className === "up" ? "↗" : "↘"} ${totalCarsChange.text}
          </div>
        </div>
        <div class="stat-label">Total Cars</div>
        <div class="stat-value">${rentalCars.length + salesCars.length}</div>
      </div>
  
      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"></rect>
              <path d="M16 2v4M8 2v4M3 10h18"></path>
            </svg>
          </div>
          <div class="stat-change ${rentedTodayChange.className}">
            ${rentedTodayChange.className === "up" ? "↗" : "↘"} ${rentedTodayChange.text}
          </div>
        </div>
        <div class="stat-label">Cars Rented Today</div>
        <div class="stat-value">${carsRentedToday}</div>
      </div>
  
      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="20" r="1"></circle>
              <circle cx="18" cy="20" r="1"></circle>
              <path d="M3 4h2l2.6 10.4a1 1 0 0 0 1 .76h9.7a1 1 0 0 0 .97-.76L21 7H7"></path>
            </svg>
          </div>
          <div class="stat-change ${totalOrdersChange.className}">
            ${totalOrdersChange.className === "up" ? "↗" : "↘"} ${totalOrdersChange.text}
          </div>
        </div>
        <div class="stat-label">Total Orders</div>
        <div class="stat-value">${totalOrders}</div>
      </div>
  
      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-icon gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1v22"></path>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div class="stat-change ${monthlyRevenueChange.className}">
            ${monthlyRevenueChange.className === "up" ? "↗" : "↘"} ${monthlyRevenueChange.text}
          </div>
        </div>
        <div class="stat-label">Monthly Revenue</div>
        <div class="stat-value">${formatMoney(currentMonthRevenue)}</div>
      </div>
    `;
  }
  
  function renderDashboardRentalsChart(rentals) {
    const ctx = getCanvasContext("rentalsPerMonthChart");
    if (!ctx || typeof Chart === "undefined") return;
  
    const totals = getMonthTotalsFromRows(rentals, () => 1);
  
    destroyChartIfExists(rentalsPerMonthChart);
  
    rentalsPerMonthChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [
          {
            label: "Rentals",
            data: totals,
            backgroundColor: "#c9a458",
            borderRadius: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: "#53657f" },
            grid: { color: "rgba(0,0,0,0.08)" }
          },
          x: {
            ticks: { color: "#53657f" },
            grid: { color: "rgba(0,0,0,0.06)" }
          }
        }
      }
    });
  }
  
  function renderDashboardSalesChart(orders, rentals) {
    const ctx = getCanvasContext("salesStatisticsChart");
    if (!ctx || typeof Chart === "undefined") return;
  
    const rentalsRevenue = getMonthTotalsFromRows(rentals, (r) => Number(r.deposit_paid || 0));
    const ordersRevenue = getMonthTotalsFromRows(orders, (o) => Number(o.total_price || 0));
    const totals = rentalsRevenue.map((value, index) => value + ordersRevenue[index]);
  
    destroyChartIfExists(salesStatisticsChart);
  
    salesStatisticsChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [
          {
            label: "Revenue",
            data: totals,
            borderColor: "#111111",
            backgroundColor: "#c9a458",
            pointBackgroundColor: "#c9a458",
            pointBorderColor: "#111111",
            pointRadius: 5,
            tension: 0.35,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: "#53657f" },
            grid: { color: "rgba(0,0,0,0.08)" }
          },
          x: {
            ticks: { color: "#53657f" },
            grid: { color: "rgba(0,0,0,0.06)" }
          }
        }
      }
    });
  }
  
  async function renderLatestBookings() {
    const wrap = document.getElementById("latestBookings");
    if (!wrap) return;
  
    try {
      const { data, error } = await window.db
        .from("rentals")
        .select(`
          *,
          rental_cars (
            title
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5);
  
      if (error) throw error;
  
      if (!data || !data.length) {
        wrap.innerHTML = `<p class="admin-empty">No bookings yet.</p>`;
        return;
      }
  
      wrap.innerHTML = data.map((item) => `
        <div class="latest-item">
          <div class="latest-item-main">
            <div class="latest-item-title">${item.customer_name || "Customer"}</div>
            <div class="latest-item-sub">${item.rental_cars?.title || "Rental Car"}</div>
            <div class="latest-item-sub">${item.start_date || "-"} - ${item.end_date || "-"}</div>
          </div>
  
          <div class="latest-item-side">
            ${makeStatusBadge(item.booking_status || "pending")}
            <div class="latest-item-price">${formatMoney(item.total_price)}</div>
          </div>
        </div>
      `).join("");
    } catch (error) {
      console.error("Latest bookings error:", error);
      wrap.innerHTML = `<p class="admin-empty">Could not load bookings.</p>`;
    }
  }
  
  async function renderLatestPurchases() {
    const wrap = document.getElementById("latestPurchases");
    if (!wrap) return;
  
    try {
      const { data, error } = await window.db
        .from("orders")
        .select(`
          *,
          order_items (
            quantity,
            accessories (
              name
            )
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5);
  
      if (error) throw error;
  
      if (!data || !data.length) {
        wrap.innerHTML = `<p class="admin-empty">No purchases yet.</p>`;
        return;
      }
  
      wrap.innerHTML = data.map((order) => {
        const itemsText = order.order_items?.map((item) => item.accessories?.name || "Product").join(", ") || "Products";
  
        return `
          <div class="latest-item">
            <div class="latest-item-main">
              <div class="latest-item-title">${order.customer_name || "Customer"}</div>
              <div class="latest-item-sub">${itemsText}</div>
              <div class="latest-item-sub">${formatDate(order.created_at)}</div>
            </div>
  
            <div class="latest-item-side">
              ${makeStatusBadge(order.order_status || "pending")}
              <div class="latest-item-price">${formatMoney(order.total_price)}</div>
            </div>
          </div>
        `;
      }).join("");
    } catch (error) {
      console.error("Latest purchases error:", error);
      wrap.innerHTML = `<p class="admin-empty">Could not load purchases.</p>`;
    }
  }
  
  /* =========================
     RENT CARS PAGE
  ========================= */
  
  async function loadAdminRentCars() {
    const body = document.getElementById("adminRentCarsBody");
    const searchInput = document.getElementById("adminRentalsSearch");
    if (!body) return;
  
    try {
      const todayString = new Date().toISOString().split("T")[0];
  
      const [carsRes, bookingsRes] = await Promise.all([
        window.db
          .from("rental_cars")
          .select("*")
          .order("created_at", { ascending: false }),
  
        window.db
          .from("rentals")
          .select("id, rental_car_id, start_date, end_date, booking_status")
          .in("booking_status", ["pending_deposit", "confirmed"])
      ]);
  
      if (carsRes.error) throw carsRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
  
      const data = carsRes.data || [];
      const bookings = bookingsRes.data || [];
  
      if (!data.length) {
        body.innerHTML = `<tr><td colspan="7">No rental cars found.</td></tr>`;
        initRentalModal();
        return;
      }
  
      function isCarBookedNow(carId) {
        return bookings.some((booking) => {
          return (
            booking.rental_car_id === carId &&
            booking.start_date <= todayString &&
            booking.end_date >= todayString
          );
        });
      }
  
      function renderRows(rows) {
        if (!rows.length) {
          body.innerHTML = `<tr><td colspan="7">No matching rental cars found.</td></tr>`;
          initRentalModal();
          return;
        }
  
        body.innerHTML = rows.map((car) => {
          const bookedNow = isCarBookedNow(car.id);
          const availableNow = !!car.is_available && !bookedNow;
  
          return `
            <tr>
              <td>
                <div class="admin-table-product">
                  <img src="${car.image_url || "images/rental-1.jpg"}" alt="${car.title || "Car"}">
                  <span>${car.title || "-"}</span>
                </div>
              </td>
              <td>${car.rental_type || "-"}</td>
              <td>${formatMoney(car.price_per_day)}</td>
              <td>${formatMoney(car.deposit_amount)}</td>
              <td>${makeStatusBadge(car.featured ? "Featured" : "No")}</td>
              <td>${makeStatusBadge(availableNow ? "Available" : "Booked")}</td>
              <td class="admin-actions">
                <button type="button" class="icon-btn admin-edit-rental-btn" data-id="${car.id}">✎</button>
                <button 
                  type="button" 
                  class="icon-btn admin-toggle-rental-btn" 
                  data-id="${car.id}" 
                  data-available="${car.is_available}"
                  ${bookedNow ? "disabled" : ""}
                  title="${bookedNow ? "This car is currently booked" : "Toggle availability"}"
                >
                  ${car.is_available ? "⏸" : "↺"}
                </button>
                <button type="button" class="icon-btn delete admin-delete-rental-btn" data-id="${car.id}">🗑</button>
              </td>
            </tr>
          `;
        }).join("");
  
        initRentalEditButtons(rows);
        initRentalToggleButtons();
        initRentalDeleteButtons();
        initRentalModal();
      }
  
      renderRows(data);
  
      if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = "true";
        searchInput.addEventListener("input", () => {
          const value = searchInput.value.trim().toLowerCase();
  
          const filtered = data.filter((car) => {
            const title = String(car.title || "").toLowerCase();
            const type = String(car.rental_type || "").toLowerCase();
            const transmission = String(car.transmission || "").toLowerCase();
  
            return (
              title.includes(value) ||
              type.includes(value) ||
              transmission.includes(value)
            );
          });
  
          renderRows(filtered);
        });
      }
    } catch (error) {
      console.error("Admin rent cars error:", error);
      body.innerHTML = `<tr><td colspan="7">Failed to load rental cars.</td></tr>`;
      initRentalModal();
    }
  }
  function initRentalModal() {
    const modal = document.getElementById("rentalModal");
    const openBtn = document.getElementById("openRentalModalBtn");
    const closeBtn = document.getElementById("closeRentalModalBtn");
    const cancelBtn = document.getElementById("cancelRentalModalBtn");
    const form = document.getElementById("rentalForm");
  
    if (!modal || !form) return;
  
    if (openBtn && !openBtn.dataset.bound) {
      openBtn.dataset.bound = "true";
      openBtn.addEventListener("click", () => {
        resetRentalForm();
        document.getElementById("rentalModalTitle").textContent = "Add Rental Car";
        modal.classList.add("show");
      });
    }
  
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = "true";
      closeBtn.addEventListener("click", () => modal.classList.remove("show"));
    }
  
    if (cancelBtn && !cancelBtn.dataset.bound) {
      cancelBtn.dataset.bound = "true";
      cancelBtn.addEventListener("click", () => modal.classList.remove("show"));
    }
  
    if (!form.dataset.bound) {
      form.dataset.bound = "true";
      form.addEventListener("submit", handleRentalFormSubmit);
    }
  }
  
  function fillRentalForm(car) {
    document.getElementById("rentalId").value = car.id || "";
    document.getElementById("rentalTitle").value = car.title || "";
    document.getElementById("rentalBrand").value = car.brand || "";
    document.getElementById("rentalModel").value = car.model || "";
    document.getElementById("rentalType").value = car.rental_type || "Luxury";
    document.getElementById("rentalYear").value = car.year || "";
    document.getElementById("rentalSeats").value = car.seats || "";
    document.getElementById("rentalFuel").value = car.fuel_type || "";
    document.getElementById("rentalTransmission").value = car.transmission || "";
    document.getElementById("rentalPricePerDay").value = car.price_per_day || "";
    document.getElementById("rentalDepositAmount").value = car.deposit_amount || "";
    document.getElementById("rentalDepositPercentage").value = car.deposit_percentage || "";
    document.getElementById("rentalChauffeurPrice").value = car.chauffeur_price_per_day || "";
    document.getElementById("rentalDescription").value = car.description || "";
    document.getElementById("rentalFeatures").value = car.features || "";
    document.getElementById("rentalFeatured").checked = !!car.featured;
    document.getElementById("rentalAvailable").checked = !!car.is_available;
  
    const mainImageInput = document.getElementById("rentalMainImageFile");
    const galleryIds = [
      "rentalGalleryImage1",
      "rentalGalleryImage2",
      "rentalGalleryImage3",
      "rentalGalleryImage4",
      "rentalGalleryImage5"
    ];
  
    if (mainImageInput) mainImageInput.value = "";
  
    galleryIds.forEach((id, index) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.value = "";
      input.style.display = index === 0 ? "block" : "none";
    });
  }
  
  function resetRentalForm() {
    const form = document.getElementById("rentalForm");
    const message = document.getElementById("rentalFormMessage");
    if (form) form.reset();
  
    document.getElementById("rentalId").value = "";
    document.getElementById("rentalBrand").value = "";
    document.getElementById("rentalModel").value = "";
    document.getElementById("rentalType").value = "Luxury";
    document.getElementById("rentalAvailable").checked = true;
    document.getElementById("rentalFeatured").checked = false;
  
    const mainImageInput = document.getElementById("rentalMainImageFile");
    const galleryIds = [
      "rentalGalleryImage1",
      "rentalGalleryImage2",
      "rentalGalleryImage3",
      "rentalGalleryImage4",
      "rentalGalleryImage5"
    ];
  
    if (mainImageInput) mainImageInput.value = "";
  
    galleryIds.forEach((id, index) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.value = "";
      input.style.display = index === 0 ? "block" : "none";
    });
  
    if (message) {
      message.textContent = "";
      message.className = "admin-form-message";
    }
  }
  
  function setRentalFormMessage(message, type) {
    const el = document.getElementById("rentalFormMessage");
    if (!el) return;
  
    el.textContent = message;
    el.className = "admin-form-message";
  
    if (type) {
      el.classList.add(type);
    }
  }
  
  async function handleRentalFormSubmit(e) {
    e.preventDefault();
  
    const rentalId = document.getElementById("rentalId").value.trim();
  
    const mainImageFile = document.getElementById("rentalMainImageFile")?.files?.[0] || null;
  
    const galleryInputs = [
      document.getElementById("rentalGalleryImage1"),
      document.getElementById("rentalGalleryImage2"),
      document.getElementById("rentalGalleryImage3"),
      document.getElementById("rentalGalleryImage4"),
      document.getElementById("rentalGalleryImage5")
    ];
  
    const payload = {
      title: document.getElementById("rentalTitle").value.trim(),
      brand: document.getElementById("rentalBrand").value.trim(),
      model: document.getElementById("rentalModel").value.trim(),
      rental_type: document.getElementById("rentalType").value,
      year: Number(document.getElementById("rentalYear").value || 0) || null,
      seats: Number(document.getElementById("rentalSeats").value || 0) || null,
      fuel_type: document.getElementById("rentalFuel").value.trim(),
      transmission: document.getElementById("rentalTransmission").value.trim(),
      price_per_day: Number(document.getElementById("rentalPricePerDay").value || 0),
      deposit_amount: Number(document.getElementById("rentalDepositAmount").value || 0),
      deposit_percentage: Number(document.getElementById("rentalDepositPercentage").value || 0),
      chauffeur_price_per_day: Number(document.getElementById("rentalChauffeurPrice").value || 0),
      description: document.getElementById("rentalDescription").value.trim(),
      features: document.getElementById("rentalFeatures").value.trim(),
      featured: document.getElementById("rentalFeatured").checked,
      is_available: document.getElementById("rentalAvailable").checked
    };
  
    try {
      setRentalFormMessage("Saving rental car...", "");
  
      if (!payload.title) {
        throw new Error("Title is required.");
      }
      if (!payload.brand) {
        throw new Error("Brand is required.");
      }
      if (!payload.model) {
        throw new Error("Model is required.");
      }
  
      if (!payload.price_per_day) {
        throw new Error("Price per day is required.");
      }
  
      let mainImageUrl = null;
  
      if (mainImageFile) {
        mainImageUrl = await uploadImageToSupabase(mainImageFile, "rentals");
      }
  
      const galleryUrls = await uploadOptionalGalleryFiles(galleryInputs, "rentals");
  
      if (rentalId) {
        const updatePayload = { ...payload };
  
        if (mainImageUrl) {
          updatePayload.image_url = mainImageUrl;
        }
  
        const { error } = await window.db
          .from("rental_cars")
          .update(updatePayload)
          .eq("id", rentalId);
  
        if (error) throw error;
  
        if (galleryUrls.length > 0) {
          const galleryRows = galleryUrls.map((url, index) => ({
            rental_car_id: rentalId,
            image_url: url,
            sort_order: index + 1
          }));
  
          const { error: galleryError } = await window.db
            .from("rental_car_images")
            .insert(galleryRows);
  
          if (galleryError) throw galleryError;
        }
      } else {
        if (!mainImageUrl) {
          throw new Error("Main image is required.");
        }
  
        const insertPayload = {
          ...payload,
          image_url: mainImageUrl
        };
  
        const { data: newRental, error } = await window.db
          .from("rental_cars")
          .insert([insertPayload])
          .select()
          .single();
  
        if (error) throw error;
  
        if (galleryUrls.length > 0) {
          const galleryRows = galleryUrls.map((url, index) => ({
            rental_car_id: newRental.id,
            image_url: url,
            sort_order: index + 1
          }));
  
          const { error: galleryError } = await window.db
            .from("rental_car_images")
            .insert(galleryRows);
  
          if (galleryError) throw galleryError;
        }
      }
  
      setRentalFormMessage("Rental car saved successfully.", "success");
  
      document.getElementById("rentalModal").classList.remove("show");
      resetRentalForm();
  
      await loadAdminRentCars();
      await loadAdminDashboard();
      await loadAdminAnalytics();
    } catch (error) {
      console.error("Rental form error:", error);
      setRentalFormMessage(error.message || "Failed to save rental car.", "error");
    }
  }
  
  function initRentalEditButtons(rows) {
    const buttons = document.querySelectorAll(".admin-edit-rental-btn");
    const modal = document.getElementById("rentalModal");
    const title = document.getElementById("rentalModalTitle");
  
    if (!buttons.length || !modal || !title) return;
  
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.id;
        const car = rows.find((item) => item.id === id);
        if (!car) return;
  
        resetRentalForm();
        fillRentalForm(car);
        title.textContent = "Edit Rental Car";
        modal.classList.add("show");
      });
    });
  }
  
  function initRentalToggleButtons() {
    const buttons = document.querySelectorAll(".admin-toggle-rental-btn");
    if (!buttons.length) return;
  
    buttons.forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.dataset.id;
        const current = button.dataset.available === "true";
  
        try {
          const { error } = await window.db
            .from("rental_cars")
            .update({ is_available: !current })
            .eq("id", id);
  
          if (error) throw error;
  
          await loadAdminRentCars();
          await loadAdminDashboard();
        } catch (error) {
          console.error("Toggle rental availability error:", error);
          alert(error.message || "Failed to update availability.");
        }
      });
    });
  }
  
  function initRentalDeleteButtons() {
    const buttons = document.querySelectorAll(".admin-delete-rental-btn");
    if (!buttons.length) return;
  
    buttons.forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.dataset.id;
        const ok = window.confirm("Delete this rental car?");
        if (!ok) return;
  
        try {
          const { error } = await window.db
            .from("rental_cars")
            .delete()
            .eq("id", id);
  
          if (error) throw error;
  
          await loadAdminRentCars();
          await loadAdminDashboard();
          await loadAdminAnalytics();
        } catch (error) {
          console.error("Delete rental error:", error);
          alert(error.message || "Failed to delete rental car.");
        }
      });
    });
  }
  
  /* =========================
     SALE CARS PAGE
  ========================= */
  
  async function loadAdminSaleCars() {
    const body = document.getElementById("adminSaleCarsBody");
    if (!body) return;
  
    try {
      const { data, error } = await window.db
        .from("cars_for_sale")
        .select("*")
        .order("created_at", { ascending: false });
  
      if (error) throw error;
  
      if (!data || !data.length) {
        body.innerHTML = `<tr><td colspan="7">No sale cars found.</td></tr>`;
        return;
      }
  
      body.innerHTML = data.map((car) => `
        <tr>
          <td>
            <div class="admin-table-product">
              <img src="${car.image_url || "images/car1.jpg"}" alt="${car.title || "Car"}">
              <span>${car.title || "-"}</span>
            </div>
          </td>
          <td>${car.year || "-"}</td>
          <td>${Number(car.mileage || 0).toLocaleString()} mi</td>
          <td>${formatMoney(car.price)}</td>
          <td>${makeStatusBadge(car.condition || "Available")}</td>
          <td>${makeStatusBadge(car.is_available ? "Available" : "Sold")}</td>
          <td class="admin-actions">
            <button type="button" class="icon-btn">✎</button>
            <button type="button" class="icon-btn delete">🗑</button>
          </td>
        </tr>
      `).join("");
    } catch (error) {
      console.error("Admin sale cars error:", error);
      body.innerHTML = `<tr><td colspan="7">Failed to load cars for sale.</td></tr>`;
    }
  }
  
  /* =========================
     ACCESSORIES PAGE
  ========================= */
  
  async function loadAdminAccessories() {
    const body = document.getElementById("adminAccessoriesBody");
    const searchInput = document.getElementById("adminAccessoriesSearch");
    if (!body) return;
  
    try {
      const { data, error } = await window.db
        .from("accessories")
        .select("*")
        .order("created_at", { ascending: false });
  
      if (error) throw error;
  
      if (!data || !data.length) {
        body.innerHTML = `<tr><td colspan="6">No accessories found.</td></tr>`;
        initAccessoryModal();
        return;
      }
  
      function renderRows(rows) {
        if (!rows.length) {
          body.innerHTML = `<tr><td colspan="6">No matching accessories found.</td></tr>`;
          initAccessoryModal();
          return;
        }
  
        body.innerHTML = rows.map((item) => {
          let stockStatus = `${item.stock ?? 0} units`;
          let stockClass = "success";
  
          if (Number(item.stock || 0) <= 0) {
            stockStatus = "Out of stock";
            stockClass = "danger";
          } else if (Number(item.stock || 0) <= 15) {
            stockClass = "warning";
          }
  
          return `
            <tr>
              <td>
                <div class="admin-table-product">
                  <img src="${item.image_url || "images/product-1.jpg"}" alt="${item.name || "Product"}">
                  <span>${item.name || "-"}</span>
                </div>
              </td>
              <td>${item.category || "-"}</td>
              <td>${formatMoney(item.price)}</td>
              <td><span class="status-badge ${stockClass}">${stockStatus}</span></td>
              <td>${makeStatusBadge(item.is_active ? "Available" : "Hidden")}</td>
              <td class="admin-actions">
                <button type="button" class="icon-btn admin-edit-accessory-btn" data-id="${item.id}">✎</button>
                <button type="button" class="icon-btn admin-toggle-accessory-btn" data-id="${item.id}" data-active="${item.is_active}">
                  ${item.is_active ? "⏸" : "↺"}
                </button>
                <button type="button" class="icon-btn delete admin-delete-accessory-btn" data-id="${item.id}">🗑</button>
              </td>
            </tr>
          `;
        }).join("");
  
        initAccessoryEditButtons(rows);
        initAccessoryToggleButtons();
        initAccessoryDeleteButtons();
        initAccessoryModal();
      }
  
      renderRows(data);
  
      if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = "true";
        searchInput.addEventListener("input", () => {
          const value = searchInput.value.trim().toLowerCase();
  
          const filtered = data.filter((item) => {
            const name = String(item.name || "").toLowerCase();
            const category = String(item.category || "").toLowerCase();
            return name.includes(value) || category.includes(value);
          });
  
          renderRows(filtered);
        });
      }
    } catch (error) {
      console.error("Admin accessories error:", error);
      body.innerHTML = `<tr><td colspan="6">Failed to load accessories.</td></tr>`;
      initAccessoryModal();
    }
  }
  function initAccessoryModal() {
    const modal = document.getElementById("accessoryModal");
    const openBtn = document.getElementById("openAccessoryModalBtn");
    const closeBtn = document.getElementById("closeAccessoryModalBtn");
    const cancelBtn = document.getElementById("cancelAccessoryModalBtn");
    const form = document.getElementById("accessoryForm");
  
    if (!modal || !form) return;
  
    if (openBtn && !openBtn.dataset.bound) {
      openBtn.dataset.bound = "true";
      openBtn.addEventListener("click", () => {
        resetAccessoryForm();
        document.getElementById("accessoryModalTitle").textContent = "Add Accessory";
        modal.classList.add("show");
      });
    }
  
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = "true";
      closeBtn.addEventListener("click", () => modal.classList.remove("show"));
    }
  
    if (cancelBtn && !cancelBtn.dataset.bound) {
      cancelBtn.dataset.bound = "true";
      cancelBtn.addEventListener("click", () => modal.classList.remove("show"));
    }
  
    if (!form.dataset.bound) {
      form.dataset.bound = "true";
      form.addEventListener("submit", handleAccessoryFormSubmit);
    }
  }
  
  function fillAccessoryForm(item) {
    document.getElementById("accessoryId").value = item.id || "";
    document.getElementById("accessoryName").value = item.name || "";
    document.getElementById("accessoryCategory").value = item.category || "";
    document.getElementById("accessoryPrice").value = item.price || "";
    document.getElementById("accessoryStock").value = item.stock || "";
    document.getElementById("accessoryDescription").value = item.description || "";
    document.getElementById("accessoryFeatures").value = item.features || "";
    document.getElementById("accessoryFeatured").checked = !!item.featured;
    document.getElementById("accessoryActive").checked = !!item.is_active;
  
    const mainImageInput = document.getElementById("accessoryMainImageFile");
    const galleryIds = [
      "accessoryGalleryImage1",
      "accessoryGalleryImage2",
      "accessoryGalleryImage3",
      "accessoryGalleryImage4",
      "accessoryGalleryImage5"
    ];
  
    if (mainImageInput) mainImageInput.value = "";
  
    galleryIds.forEach((id, index) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.value = "";
      input.style.display = index === 0 ? "block" : "none";
    });
  }
  
  function resetAccessoryForm() {
    const form = document.getElementById("accessoryForm");
    const message = document.getElementById("accessoryFormMessage");
    if (form) form.reset();
  
    document.getElementById("accessoryId").value = "";
    document.getElementById("accessoryActive").checked = true;
    document.getElementById("accessoryFeatured").checked = false;
  
    const mainImageInput = document.getElementById("accessoryMainImageFile");
    const galleryIds = [
      "accessoryGalleryImage1",
      "accessoryGalleryImage2",
      "accessoryGalleryImage3",
      "accessoryGalleryImage4",
      "accessoryGalleryImage5"
    ];
  
    if (mainImageInput) mainImageInput.value = "";
  
    galleryIds.forEach((id, index) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.value = "";
      input.style.display = index === 0 ? "block" : "none";
    });
  
    if (message) {
      message.textContent = "";
      message.className = "admin-form-message";
    }
  }
  
  function setAccessoryFormMessage(message, type) {
    const el = document.getElementById("accessoryFormMessage");
    if (!el) return;
  
    el.textContent = message;
    el.className = "admin-form-message";
  
    if (type) {
      el.classList.add(type);
    }
  }
  
  async function handleAccessoryFormSubmit(e) {
    e.preventDefault();
  
    const accessoryId = document.getElementById("accessoryId").value.trim();
  
    const mainImageFile = document.getElementById("accessoryMainImageFile")?.files?.[0] || null;
  
    const galleryInputs = [
      document.getElementById("accessoryGalleryImage1"),
      document.getElementById("accessoryGalleryImage2"),
      document.getElementById("accessoryGalleryImage3"),
      document.getElementById("accessoryGalleryImage4"),
      document.getElementById("accessoryGalleryImage5")
    ];
  
    const payload = {
      name: document.getElementById("accessoryName").value.trim(),
      category: document.getElementById("accessoryCategory").value.trim(),
      price: Number(document.getElementById("accessoryPrice").value || 0),
      stock: Number(document.getElementById("accessoryStock").value || 0),
      description: document.getElementById("accessoryDescription").value.trim(),
      features: document.getElementById("accessoryFeatures").value.trim(),
      featured: document.getElementById("accessoryFeatured").checked,
      is_active: document.getElementById("accessoryActive").checked
    };
  
    try {
      setAccessoryFormMessage("Saving accessory...", "");
  
      if (!payload.name) {
        throw new Error("Name is required.");
      }
  
      if (!payload.category) {
        throw new Error("Category is required.");
      }
  
      if (payload.price <= 0) {
        throw new Error("Price is required.");
      }
  
      let mainImageUrl = null;
  
      if (mainImageFile) {
        mainImageUrl = await uploadImageToSupabase(mainImageFile, "accessories");
      }
  
      const galleryUrls = await uploadOptionalGalleryFiles(galleryInputs, "accessories");
  
      if (accessoryId) {
        const updatePayload = { ...payload };
  
        if (mainImageUrl) {
          updatePayload.image_url = mainImageUrl;
        }
  
        const { error } = await window.db
          .from("accessories")
          .update(updatePayload)
          .eq("id", accessoryId);
  
        if (error) throw error;
  
        if (galleryUrls.length > 0) {
          const galleryRows = galleryUrls.map((url, index) => ({
            accessory_id: accessoryId,
            image_url: url,
            sort_order: index + 1
          }));
  
          const { error: galleryError } = await window.db
            .from("accessory_images")
            .insert(galleryRows);
  
          if (galleryError) throw galleryError;
        }
      } else {
        if (!mainImageUrl) {
          throw new Error("Main image is required.");
        }
  
        const insertPayload = {
          ...payload,
          image_url: mainImageUrl
        };
  
        const { data: newAccessory, error } = await window.db
          .from("accessories")
          .insert([insertPayload])
          .select()
          .single();
  
        if (error) throw error;
  
        if (galleryUrls.length > 0) {
          const galleryRows = galleryUrls.map((url, index) => ({
            accessory_id: newAccessory.id,
            image_url: url,
            sort_order: index + 1
          }));
  
          const { error: galleryError } = await window.db
            .from("accessory_images")
            .insert(galleryRows);
  
          if (galleryError) throw galleryError;
        }
      }
  
      setAccessoryFormMessage("Accessory saved successfully.", "success");
  
      document.getElementById("accessoryModal").classList.remove("show");
      resetAccessoryForm();
  
      await loadAdminAccessories();
      await loadAdminDashboard();
      await loadAdminAnalytics();
    } catch (error) {
      console.error("Accessory form error:", error);
      setAccessoryFormMessage(error.message || "Failed to save accessory.", "error");
    }
  }
  
  function initAccessoryEditButtons(rows) {
    const buttons = document.querySelectorAll(".admin-edit-accessory-btn");
    const modal = document.getElementById("accessoryModal");
    const title = document.getElementById("accessoryModalTitle");
  
    if (!buttons.length || !modal || !title) return;
  
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.id;
        const item = rows.find((row) => row.id === id);
        if (!item) return;
  
        resetAccessoryForm();
        fillAccessoryForm(item);
        title.textContent = "Edit Accessory";
        modal.classList.add("show");
      });
    });
  }
  
  function initAccessoryToggleButtons() {
    const buttons = document.querySelectorAll(".admin-toggle-accessory-btn");
    if (!buttons.length) return;
  
    buttons.forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.dataset.id;
        const current = button.dataset.active === "true";
  
        try {
          const { error } = await window.db
            .from("accessories")
            .update({ is_active: !current })
            .eq("id", id);
  
          if (error) throw error;
  
          await loadAdminAccessories();
          await loadAdminDashboard();
        } catch (error) {
          console.error("Toggle accessory error:", error);
          alert(error.message || "Failed to update accessory.");
        }
      });
    });
  }
  
  function initAccessoryDeleteButtons() {
    const buttons = document.querySelectorAll(".admin-delete-accessory-btn");
    if (!buttons.length) return;
  
    buttons.forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.dataset.id;
        const ok = window.confirm("Delete this accessory?");
        if (!ok) return;
  
        try {
          const { error } = await window.db
            .from("accessories")
            .delete()
            .eq("id", id);
  
          if (error) throw error;
  
          await loadAdminAccessories();
          await loadAdminDashboard();
          await loadAdminAnalytics();
        } catch (error) {
          console.error("Delete accessory error:", error);
          alert(error.message || "Failed to delete accessory.");
        }
      });
    });
  }
  
  /* =========================
     BOOKINGS PAGE
  ========================= */
  
  async function loadAdminBookings() {
    const body = document.getElementById("adminBookingsBody");
    const searchInput = document.getElementById("adminBookingsSearch");
    if (!body) return;
  
    try {
      const { data, error } = await window.db
        .from("rentals")
        .select(`
          *,
          rental_cars (
            title
          )
        `)
        .order("created_at", { ascending: false });
  
      if (error) throw error;
  
      if (!data || !data.length) {
        body.innerHTML = `<tr><td colspan="8">No bookings found.</td></tr>`;
        return;
      }
  
      function getRemainingTimeText(dateString) {
        if (!dateString) return "-";
  
        const now = new Date();
        const due = new Date(dateString);
        const diff = due.getTime() - now.getTime();
  
        if (diff <= 0) return "Expired";
  
        const totalMinutes = Math.floor(diff / (1000 * 60));
        const days = Math.floor(totalMinutes / (60 * 24));
        const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
        const minutes = totalMinutes % 60;
  
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
      }
  
      function renderRows(rows) {
        if (!rows.length) {
          body.innerHTML = `<tr><td colspan="8">No matching bookings found.</td></tr>`;
          return;
        }
  
        body.innerHTML = rows.map((booking) => {
          const paymentMethod = booking.payment_method || "-";
          const depositStatus = booking.deposit_status || booking.payment_status || "-";
          const depositDueText = booking.deposit_due_at ? formatDate(booking.deposit_due_at) : "-";
          const timerText =
            paymentMethod === "wish_branch"
              ? getRemainingTimeText(booking.deposit_due_at)
              : "-";
  
          return `
            <tr>
              <td>
                <div>${booking.customer_name || "-"}</div>
                <div class="admin-subtext">${booking.customer_email || "-"}</div>
                <div class="admin-subtext">${booking.customer_phone || "-"}</div>
              </td>
  
              <td>${booking.rental_cars?.title || "Rental Car"}</td>
  
              <td>
                <div>${booking.start_date || "-"}</div>
                <div class="admin-subtext">${booking.end_date || "-"}</div>
                <div class="admin-subtext">${booking.total_days || 0} day(s)</div>
              </td>
  
              <td>
                <div>Total: ${formatMoney(booking.total_price)}</div>
                <div class="admin-subtext">Deposit: ${formatMoney(booking.deposit_amount)}</div>
              </td>
  
              <td>
                <div>${paymentMethod}</div>
                <div class="admin-subtext">Due: ${depositDueText}</div>
                <div class="admin-subtext">Time left: ${timerText}</div>
              </td>
  
              <td>${makeStatusBadge(depositStatus)}</td>
  
              <td>${makeStatusBadge(booking.booking_status || "pending")}</td>
  
              <td class="admin-actions">
                <button
  type="button"
  class="icon-btn admin-view-id-btn"
  data-file-url="${booking.customer_id_file_url || ""}"
  title="View ID / Passport"
>
  ID
</button>

<button
  type="button"
  class="icon-btn admin-view-license-btn"
  data-file-url="${booking.driver_license_file_url || ""}"
  title="View Driver's License"
>
  DL
</button>
  
${booking.booking_status === "pending_deposit" ? `
  <button
    type="button"
    class="icon-btn delete admin-booking-action"
    data-id="${booking.id}"
    data-action="cancel"
    title="Cancel"
  >
    ✕
  </button>
` : ""}

${booking.booking_status === "pending_deposit" && booking.deposit_status === "paid" ? `
  <button
    type="button"
    class="icon-btn success admin-booking-action"
    data-id="${booking.id}"
    data-action="confirm"
    title="Confirm"
  >
    ✓
  </button>
` : ""}
  
                ${String(booking.booking_status || "").toLowerCase() === "confirmed" ? `
                  <button type="button" class="icon-btn admin-booking-action" data-id="${booking.id}" data-action="complete" title="Complete">✔</button>
                ` : ""}
  
                <button type="button" class="icon-btn admin-booking-action" data-id="${booking.id}" data-action="toggle-payment" title="Toggle Payment">$</button>
              </td>
            </tr>
          `;
        }).join("");
  
        initBookingActionButtons();
        initViewIdButtons();
        initViewLicenseButtons();
      }
  
      renderRows(data);
  
      if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = "true";
        searchInput.addEventListener("input", () => {
          const value = searchInput.value.trim().toLowerCase();
  
          const filtered = data.filter((booking) => {
            const customerName = String(booking.customer_name || "").toLowerCase();
            const customerEmail = String(booking.customer_email || "").toLowerCase();
            const carTitle = String(booking.rental_cars?.title || "").toLowerCase();
  
            return (
              customerName.includes(value) ||
              customerEmail.includes(value) ||
              carTitle.includes(value)
            );
          });
  
          renderRows(filtered);
        });
      }
    } catch (error) {
      console.error("Admin bookings error:", error);
      body.innerHTML = `<tr><td colspan="8">Failed to load bookings.</td></tr>`;
    }
  }
  function initBookingActionButtons() {
    const buttons = document.querySelectorAll(".admin-booking-action");
    if (!buttons.length) return;
  
    buttons.forEach((button) => {
      button.addEventListener("click", async () => {
        const bookingId = button.dataset.id;
        const action = button.dataset.action;
  
        if (!bookingId || !action) return;
  
        button.disabled = true;
  
        try {
          if (action === "confirm") {
            await confirmBooking(bookingId);
          }
  
          if (action === "cancel") {
            await cancelBooking(bookingId);
          }
  
          if (action === "complete") {
            await completeBooking(bookingId);
          }
  
          if (action === "toggle-payment") {
            await toggleBookingPayment(bookingId);
          }
  
          await loadAdminBookings();
          await loadAdminDashboard();
          await loadAdminAnalytics();
        } catch (error) {
          console.error("Booking action error:", error);
          alert(error.message || "Failed to update booking.");
        } finally {
          button.disabled = false;
        }
      });
    });
  }
  function openRentalDocument(filePath) {
    if (!filePath) {
      alert("Document not uploaded.");
      return;
    }
  
    window.db.storage
      .from("rental-documents")
      .createSignedUrl(filePath, 60 * 10)
      .then(({ data, error }) => {
        if (error) throw error;
        if (!data?.signedUrl) throw new Error("No signed URL returned.");
  
        window.open(data.signedUrl, "_blank");
      })
      .catch((error) => {
        console.error("Open rental document error:", error);
        alert("Failed to open document.");
      });
  }
  
  function initViewIdButtons() {
    const buttons = document.querySelectorAll(".admin-view-id-btn");
    if (!buttons.length) return;
  
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const filePath = button.dataset.fileUrl || "";
        openRentalDocument(filePath);
      });
    });
  }
  
  function initViewLicenseButtons() {
    const buttons = document.querySelectorAll(".admin-view-license-btn");
    if (!buttons.length) return;
  
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const filePath = button.dataset.fileUrl || "";
        openRentalDocument(filePath);
      });
    });
  }
  async function confirmBooking(bookingId) {
    const { data: booking, error: bookingError } = await window.db
      .from("rentals")
      .select("id, rental_car_id, deposit_status, booking_status")
      .eq("id", bookingId)
      .single();
  
    if (bookingError || !booking) {
      throw bookingError || new Error("Booking not found.");
    }
  
    if (booking.booking_status !== "pending_deposit") {
      throw new Error("Only pending deposit bookings can be confirmed.");
    }
  
    if (booking.deposit_status !== "paid") {
      throw new Error("Deposit must be paid before confirming.");
    }
  
    const { error: rentalError } = await window.db
      .from("rentals")
      .update({
        booking_status: "confirmed",
        payment_status: "partial"
      })
      .eq("id", bookingId);
  
    if (rentalError) throw rentalError;
  
    const { error: carError } = await window.db
      .from("rental_cars")
      .update({
        is_available: false
      })
      .eq("id", booking.rental_car_id);
  
    if (carError) throw carError;
  }
  
  async function cancelBooking(bookingId) {
    const { data: booking, error: bookingError } = await window.db
      .from("rentals")
      .select("id, rental_car_id")
      .eq("id", bookingId)
      .single();
  
    if (bookingError || !booking) {
      throw bookingError || new Error("Booking not found.");
    }
  
    const { error: rentalError } = await window.db
      .from("rentals")
      .update({
        booking_status: "cancelled",
        deposit_status: "failed"
      })
      .eq("id", bookingId);
  
    if (rentalError) throw rentalError;
  
    const { error: carError } = await window.db
      .from("rental_cars")
      .update({
        is_available: true
      })
      .eq("id", booking.rental_car_id);
  
    if (carError) throw carError;
  }
  
  async function completeBooking(bookingId) {
    const { data: booking, error: bookingError } = await window.db
      .from("rentals")
      .select("id, rental_car_id")
      .eq("id", bookingId)
      .single();
  
    if (bookingError || !booking) {
      throw bookingError || new Error("Booking not found.");
    }
  
    const { error: rentalError } = await window.db
      .from("rentals")
      .update({
        booking_status: "completed",
        payment_status: "paid"
      })
      .eq("id", bookingId);
  
    if (rentalError) throw rentalError;
  
    const { error: carError } = await window.db
      .from("rental_cars")
      .update({
        is_available: true
      })
      .eq("id", booking.rental_car_id);
  
    if (carError) throw carError;
  }
  
  async function toggleBookingPayment(bookingId) {
    const { data, error } = await window.db
      .from("rentals")
      .select("id, payment_status, deposit_status, booking_status")
      .eq("id", bookingId)
      .single();
  
    if (error || !data) throw error || new Error("Booking not found.");
  
    let nextPaymentStatus = data.payment_status || "unpaid";
    let nextDepositStatus = data.deposit_status || "pending";
  
    if (data.booking_status === "pending_deposit") {
      if (data.deposit_status !== "paid") {
        nextDepositStatus = "paid";
        nextPaymentStatus = "partial";
      } else {
        nextDepositStatus = "pending";
        nextPaymentStatus = "unpaid";
      }
    } else if (data.booking_status === "confirmed") {
      if (data.payment_status === "partial") {
        nextPaymentStatus = "paid";
      } else if (data.payment_status === "paid") {
        nextPaymentStatus = "partial";
      }
    } else {
      throw new Error("Payment can only be changed for pending deposit or confirmed bookings.");
    }
  
    const { error: updateError } = await window.db
      .from("rentals")
      .update({
        payment_status: nextPaymentStatus,
        deposit_status: nextDepositStatus
      })
      .eq("id", bookingId);
  
    if (updateError) throw updateError;
  }
  /* =========================
     ORDERS PAGE
  ========================= */
  
  async function loadAdminOrders() {
    const body = document.getElementById("adminOrdersBody");
    const searchInput = document.getElementById("adminOrdersSearch");
    if (!body) return;
  
    try {
      const { data, error } = await window.db
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
        .order("created_at", { ascending: false });
  
      if (error) throw error;
  
      if (!data || !data.length) {
        body.innerHTML = `<tr><td colspan="7">No orders found.</td></tr>`;
        return;
      }
  
      function renderRows(rows) {
        if (!rows.length) {
          body.innerHTML = `<tr><td colspan="7">No matching orders found.</td></tr>`;
          return;
        }
  
        body.innerHTML = rows.map((order) => {
          const itemsText = order.order_items?.map((item) => {
            const name = item.accessories?.name || "Product";
            return `${name} (x${item.quantity || 0})`;
          }).join(", ") || "-";
  
          return `
            <tr>
              <td>
                <div>#${String(order.id).slice(0, 8)}</div>
                <div class="admin-subtext">${formatDate(order.created_at)}</div>
              </td>
  
              <td>
                <div>${order.customer_name || "-"}</div>
                <div class="admin-subtext">${order.customer_email || "-"}</div>
                <div class="admin-subtext">${order.customer_phone || "-"}</div>
              </td>
  
              <td>${itemsText}</td>
  
              <td>${formatMoney(order.total_price)}</td>
  
              <td>
                <div>${order.payment_method || "-"}</div>
                <div class="admin-subtext">${makeStatusBadge(order.payment_status || "unpaid")}</div>
              </td>
  
              <td>${makeStatusBadge(order.order_status || "pending")}</td>
  
              <td class="admin-actions">
                ${String(order.order_status || "").toLowerCase() === "pending" ? `
                  <button type="button" class="icon-btn success admin-order-action" data-id="${order.id}" data-action="processing" title="Processing">↻</button>
                  <button type="button" class="icon-btn delete admin-order-action" data-id="${order.id}" data-action="cancelled" title="Cancel">✕</button>
                ` : ""}
  
                ${String(order.order_status || "").toLowerCase() === "processing" ? `
                  <button type="button" class="icon-btn admin-order-action" data-id="${order.id}" data-action="shipped" title="Ship">🚚</button>
                ` : ""}
  
                ${String(order.order_status || "").toLowerCase() === "shipped" ? `
                  <button type="button" class="icon-btn success admin-order-action" data-id="${order.id}" data-action="delivered" title="Deliver">✓</button>
                ` : ""}
  
                <button type="button" class="icon-btn admin-order-action" data-id="${order.id}" data-action="toggle-payment" title="Toggle Payment">$</button>
              </td>
            </tr>
          `;
        }).join("");
  
        initOrderActionButtons();
      }
  
      renderRows(data);
  
      if (searchInput) {
        searchInput.addEventListener("input", () => {
          const value = searchInput.value.trim().toLowerCase();
  
          const filtered = data.filter((order) => {
            const orderId = String(order.id || "").toLowerCase();
            const customerName = String(order.customer_name || "").toLowerCase();
            const customerEmail = String(order.customer_email || "").toLowerCase();
  
            return (
              orderId.includes(value) ||
              customerName.includes(value) ||
              customerEmail.includes(value)
            );
          });
  
          renderRows(filtered);
        });
      }
    } catch (error) {
      console.error("Admin orders error:", error);
      body.innerHTML = `<tr><td colspan="7">Failed to load orders.</td></tr>`;
    }
  }
  function initOrderActionButtons() {
    const buttons = document.querySelectorAll(".admin-order-action");
    if (!buttons.length) return;
  
    buttons.forEach((button) => {
      button.addEventListener("click", async () => {
        const orderId = button.dataset.id;
        const action = button.dataset.action;
  
        if (!orderId || !action) return;
  
        button.disabled = true;
  
        try {
          if (action === "toggle-payment") {
            await toggleOrderPayment(orderId);
          } else {
            await updateOrderStatus(orderId, action);
          }
  
          await loadAdminOrders();
          await loadAdminDashboard();
          await loadAdminAnalytics();
        } catch (error) {
          console.error("Order action error:", error);
          alert(error.message || "Failed to update order.");
        } finally {
          button.disabled = false;
        }
      });
    });
  }
  
  async function updateOrderStatus(orderId, nextStatus) {
    const { error } = await window.db
      .from("orders")
      .update({
        order_status: nextStatus
      })
      .eq("id", orderId);
  
    if (error) throw error;
  }
  
  async function toggleOrderPayment(orderId) {
    const { data, error } = await window.db
      .from("orders")
      .select("id, payment_status")
      .eq("id", orderId)
      .single();
  
    if (error || !data) throw error || new Error("Order not found.");
  
    const current = String(data.payment_status || "").toLowerCase();
    let nextStatus = "paid";
  
    if (current === "paid") {
      nextStatus = "unpaid";
    } else if (current === "unpaid") {
      nextStatus = "paid";
    } else if (current === "partial") {
      nextStatus = "paid";
    }
  
    const { error: updateError } = await window.db
      .from("orders")
      .update({
        payment_status: nextStatus
      })
      .eq("id", orderId);
  
    if (updateError) throw updateError;
  }
  
  /* =========================
     CUSTOMERS PAGE
  ========================= */
  
  async function loadAdminCustomers() {
    const body = document.getElementById("adminCustomersBody");
    const searchInput = document.getElementById("adminCustomersSearch");
    if (!body) return;
  
    try {
      const [usersRes, rentalsRes, ordersRes] = await Promise.all([
        window.db.from("users").select("*").eq("role", "customer"),
        window.db.from("rentals").select("*"),
        window.db.from("orders").select("*")
      ]);
  
      const users = usersRes.data || [];
      const rentals = rentalsRes.data || [];
      const orders = ordersRes.data || [];
  
      if (!users.length) {
        body.innerHTML = `<tr><td colspan="5">No customers found.</td></tr>`;
        return;
      }
  
      function renderRows(rows) {
        if (!rows.length) {
          body.innerHTML = `<tr><td colspan="5">No matching customers found.</td></tr>`;
          return;
        }
  
        body.innerHTML = rows.map((user) => {
          const userRentals = rentals.filter((r) => r.user_id === user.id);
          const userOrders = orders.filter((o) => o.user_id === user.id);
  
          const bookingsCount = userRentals.length;
          const totalSpent =
            userRentals.reduce((sum, r) => sum + Number(r.deposit_paid || 0), 0) +
            userOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  
          return `
            <tr>
              <td>
                <div>${user.full_name || "-"}</div>
                <div class="admin-subtext">${formatDate(user.created_at)}</div>
              </td>
              <td>${user.email || "-"}</td>
              <td>${user.phone || "-"}</td>
              <td>${bookingsCount}</td>
              <td>${formatMoney(totalSpent)}</td>
            </tr>
          `;
        }).join("");
      }
  
      renderRows(users);
  
      if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = "true";
  
        searchInput.addEventListener("input", () => {
          const value = searchInput.value.trim().toLowerCase();
  
          const filtered = users.filter((user) => {
            const name = String(user.full_name || "").toLowerCase();
            const email = String(user.email || "").toLowerCase();
            const phone = String(user.phone || "").toLowerCase();
  
            return (
              name.includes(value) ||
              email.includes(value) ||
              phone.includes(value)
            );
          });
  
          renderRows(filtered);
        });
      }
    } catch (error) {
      console.error("Admin customers error:", error);
      body.innerHTML = `<tr><td colspan="5">Failed to load customers.</td></tr>`;
    }
  }
  
  /* =========================
     ANALYTICS PAGE
  ========================= */
  
  async function loadAdminAnalytics() {
    const statsWrap = document.getElementById("analyticsStats");
    const revenueCanvas = document.getElementById("analyticsRevenueChart");
    const typesCanvas = document.getElementById("analyticsTypesChart");
  
    if (!statsWrap && !revenueCanvas && !typesCanvas) return;
  
    try {
      const [
        rentalsRes,
        ordersRes,
        customersRes,
        saleCarsRes,
        rentalCarsRes
      ] = await Promise.all([
        window.db.from("rentals").select("*"),
        window.db.from("orders").select("*"),
        window.db.from("users").select("*").eq("role", "customer"),
        window.db.from("cars_for_sale").select("*"),
        window.db.from("rental_cars").select("*")
      ]);
  
      const rentals = rentalsRes.data || [];
      const orders = ordersRes.data || [];
      const customers = customersRes.data || [];
      const saleCars = saleCarsRes.data || [];
      const rentalCars = rentalCarsRes.data || [];
  
      renderAnalyticsStats(rentals, orders, customers, saleCars);
      renderAnalyticsRevenueChart(rentals, orders, saleCars);
      renderAnalyticsTypesChart(rentalCars);
    } catch (error) {
      console.error("Analytics load error:", error);
    }
  }
  
  function renderAnalyticsStats(rentals, orders, customers, saleCars) {
    const wrap = document.getElementById("analyticsStats");
    if (!wrap) return;
  
    const rentalRevenue =
      rentals.reduce((sum, item) => sum + Number(item.deposit_paid || 0), 0);
  
    const orderRevenue =
      orders.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
  
    const soldCars = saleCars.filter((car) => !car.is_available);
    const soldCarsRevenue =
      soldCars.reduce((sum, car) => sum + Number(car.price || 0), 0);
  
    const totalRevenue = rentalRevenue + orderRevenue + soldCarsRevenue;
  
    const rentalsPerMonth = getMonthTotalsFromRows(rentals, () => 1);
    const rentalRevenuePerMonth = getMonthTotalsFromRows(rentals, (r) => Number(r.deposit_paid || 0));
    const orderRevenuePerMonth = getMonthTotalsFromRows(orders, (o) => Number(o.total_price || 0));
    const customersPerMonth = getMonthTotalsFromRows(customers, () => 1);
    const soldCarsPerMonth = getMonthTotalsFromRows(soldCars, () => 1);
    const soldCarsRevenuePerMonth = getMonthTotalsFromRows(soldCars, (car) => Number(car.price || 0));
  
    const totalRevenuePerMonth = rentalRevenuePerMonth.map((value, index) => {
      return value + orderRevenuePerMonth[index] + soldCarsRevenuePerMonth[index];
    });
  
    const rentalsChange = calculateMonthChange(rentalsPerMonth);
    const revenueChange = calculateMonthChange(totalRevenuePerMonth);
    const customersChange = calculateMonthChange(customersPerMonth);
    const soldChange = calculateMonthChange(soldCarsPerMonth);
  
    wrap.innerHTML = `
      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 13l2-5h14l2 5"></path>
              <path d="M5 13h14v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5Z"></path>
            </svg>
          </div>
          <div class="stat-change ${rentalsChange.className}">
            ${rentalsChange.className === "up" ? "↗" : "↘"} ${rentalsChange.text}
          </div>
        </div>
        <div class="stat-label">Total Rentals</div>
        <div class="stat-value">${rentals.length}</div>
      </div>
  
      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1v22"></path>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div class="stat-change ${revenueChange.className}">
            ${revenueChange.className === "up" ? "↗" : "↘"} ${revenueChange.text}
          </div>
        </div>
        <div class="stat-label">Total Revenue</div>
        <div class="stat-value">${formatMoney(totalRevenue)}</div>
      </div>
  
      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M17 11l2 2 4-4"></path>
              <path d="M3 21c0-4 3-7 8-7 2 0 3.8.6 5.2 1.6"></path>
            </svg>
          </div>
          <div class="stat-change ${customersChange.className}">
            ${customersChange.className === "up" ? "↗" : "↘"} ${customersChange.text}
          </div>
        </div>
        <div class="stat-label">Total Customers</div>
        <div class="stat-value">${customers.length}</div>
      </div>
  
      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-icon gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 13l2-5h14l2 5"></path>
              <path d="M5 13h14v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5Z"></path>
            </svg>
          </div>
          <div class="stat-change ${soldChange.className}">
            ${soldChange.className === "up" ? "↗" : "↘"} ${soldChange.text}
          </div>
        </div>
        <div class="stat-label">Cars Sold</div>
        <div class="stat-value">${soldCars.length}</div>
      </div>
    `;
  }
  
  function renderAnalyticsRevenueChart(rentals, orders, saleCars = []) {
    const ctx = getCanvasContext("analyticsRevenueChart");
    if (!ctx || typeof Chart === "undefined") return;
  
    const soldCars = saleCars.filter((car) => !car.is_available);
  
    const rentalsRevenue = getMonthTotalsFromRows(rentals, (r) => Number(r.deposit_paid || 0));
    const ordersRevenue = getMonthTotalsFromRows(orders, (o) => Number(o.total_price || 0));
    const soldCarsRevenue = getMonthTotalsFromRows(soldCars, (car) => Number(car.price || 0));
  
    const totals = rentalsRevenue.map((value, index) => {
      return value + ordersRevenue[index] + soldCarsRevenue[index];
    });
  
    destroyChartIfExists(analyticsRevenueChart);
  
    analyticsRevenueChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [
          {
            label: "Revenue",
            data: totals,
            borderColor: "#c9a458",
            backgroundColor: "#c9a458",
            pointBackgroundColor: "#c9a458",
            pointBorderColor: "#c9a458",
            pointRadius: 5,
            tension: 0.35,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: "#53657f" },
            grid: { color: "rgba(0,0,0,0.08)" }
          },
          x: {
            ticks: { color: "#53657f" },
            grid: { color: "rgba(0,0,0,0.06)" }
          }
        }
      }
    });
  }
  
  function renderAnalyticsTypesChart(rentalCars) {
    const ctx = getCanvasContext("analyticsTypesChart");
    if (!ctx || typeof Chart === "undefined") return;
  
    const counts = {
      SUV: 0,
      Sedan: 0,
      "Sports Car": 0,
      Luxury: 0
    };
  
    rentalCars.forEach((car) => {
      const type = car.rental_type || "Luxury";
      if (counts[type] === undefined) counts[type] = 0;
      counts[type] += 1;
    });
  
    destroyChartIfExists(analyticsTypesChart);
  
    analyticsTypesChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: Object.keys(counts),
        datasets: [
          {
            data: Object.values(counts),
            backgroundColor: ["#c9a458", "#050505", "#777777", "#bdbdbd"],
            borderColor: "#ffffff",
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#53657f",
              font: {
                size: 14
              }
            }
          }
        }
      }
    });
  }
  async function uploadAdminImage(file, folder = "general") {
    if (!file) return "";
  
    const ext = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  
    const { error } = await window.db.storage
      .from("images")
      .upload(fileName, file, { upsert: false });
  
    if (error) throw error;
  
    const { data } = window.db.storage
      .from("images")
      .getPublicUrl(fileName);
  
    return data.publicUrl;
  }
  
  async function saveSaleGalleryImages(carId, imageUrls) {
    if (!carId || !imageUrls.length) return;
  
    const rows = imageUrls.map((url, index) => ({
      car_id: carId,
      image_url: url,
      sort_order: index + 1
    }));
  
    const { error } = await window.db
      .from("car_sale_images")
      .insert(rows);
  
    if (error) throw error;
  }
  async function loadAdminSaleCars() {
    const body = document.getElementById("adminSaleCarsBody");
    const searchInput = document.getElementById("adminSalesSearch");
    if (!body) return;
  
    try {
      const { data, error } = await window.db
        .from("cars_for_sale")
        .select("*")
        .order("created_at", { ascending: false });
  
      if (error) throw error;
  
      if (!data || !data.length) {
        body.innerHTML = `<tr><td colspan="7">No sale cars found.</td></tr>`;
        initSaleModal();
        return;
      }
  
      function renderRows(rows) {
        if (!rows.length) {
          body.innerHTML = `<tr><td colspan="7">No matching cars found.</td></tr>`;
          initSaleModal();
          return;
        }
  
        body.innerHTML = rows.map((car) => `
          <tr>
            <td>
              <div class="admin-table-product">
                <img src="${car.image_url || "images/car1.jpg"}" alt="${car.title || "Car"}">
                <span>${car.title || "-"}</span>
              </div>
            </td>
            <td>${car.year || "-"}</td>
            <td>${Number(car.mileage || 0).toLocaleString()} mi</td>
            <td>${formatMoney(car.price)}</td>
            <td>${makeStatusBadge(car.condition || "Used")}</td>
            <td>${makeStatusBadge(car.is_available ? "Available" : "Sold")}</td>
            <td class="admin-actions">
              <button type="button" class="icon-btn admin-edit-sale-btn" data-id="${car.id}">✎</button>
              <button type="button" class="icon-btn admin-toggle-sale-btn" data-id="${car.id}" data-available="${car.is_available}">
                ${car.is_available ? "⏸" : "↺"}
              </button>
              <button type="button" class="icon-btn delete admin-delete-sale-btn" data-id="${car.id}">🗑</button>
            </td>
          </tr>
        `).join("");
  
        initSaleEditButtons(rows);
        initSaleToggleButtons();
        initSaleDeleteButtons();
        initSaleModal();
      }
  
      renderRows(data);
  
      if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = "true";
        searchInput.addEventListener("input", () => {
          const value = searchInput.value.trim().toLowerCase();
  
          const filtered = data.filter((car) => {
            const title = String(car.title || "").toLowerCase();
            const brand = String(car.brand || "").toLowerCase();
            const model = String(car.model || "").toLowerCase();
  
            return title.includes(value) || brand.includes(value) || model.includes(value);
          });
  
          renderRows(filtered);
        });
      }
    } catch (error) {
      console.error("Admin sale cars error:", error);
      body.innerHTML = `<tr><td colspan="7">Failed to load cars for sale.</td></tr>`;
      initSaleModal();
    }
  }
  
  function initSaleModal() {
    const modal = document.getElementById("saleModal");
    const openBtn = document.getElementById("openSaleModalBtn");
    const closeBtn = document.getElementById("closeSaleModalBtn");
    const cancelBtn = document.getElementById("cancelSaleModalBtn");
    const form = document.getElementById("saleForm");
  
    if (!modal || !form) return;
  
    initSaleGalleryReveal();
  
    if (openBtn && !openBtn.dataset.bound) {
      openBtn.dataset.bound = "true";
      openBtn.addEventListener("click", () => {
        resetSaleForm();
        document.getElementById("saleModalTitle").textContent = "Add New Car";
        modal.classList.add("show");
      });
    }
  
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = "true";
      closeBtn.addEventListener("click", () => modal.classList.remove("show"));
    }
  
    if (cancelBtn && !cancelBtn.dataset.bound) {
      cancelBtn.dataset.bound = "true";
      cancelBtn.addEventListener("click", () => modal.classList.remove("show"));
    }
  
    if (!form.dataset.bound) {
      form.dataset.bound = "true";
      form.addEventListener("submit", handleSaleFormSubmit);
    }
  }
  
  function initSaleGalleryReveal() {
    const ids = [1, 2, 3, 4, 5];
  
    ids.forEach((num, index) => {
      const currentInput = document.getElementById(`saleGalleryImage${num}`);
      const nextWrap = document.getElementById(`saleGalleryWrap${num + 1}`);
  
      if (!currentInput || !nextWrap || currentInput.dataset.bound) return;
  
      currentInput.dataset.bound = "true";
      currentInput.addEventListener("change", () => {
        if (currentInput.files && currentInput.files.length > 0) {
          nextWrap.style.display = "block";
        }
      });
    });
  }
  
  function fillSaleForm(car) {
    document.getElementById("saleId").value = car.id || "";
    document.getElementById("saleTitle").value = car.title || "";
    document.getElementById("saleBrand").value = car.brand || "";
    document.getElementById("saleModel").value = car.model || "";
    document.getElementById("saleYear").value = car.year || "";
    document.getElementById("saleMileage").value = car.mileage || "";
    document.getElementById("saleFuel").value = car.fuel_type || "";
    document.getElementById("saleTransmission").value = car.transmission || "";
    document.getElementById("saleColor").value = car.color || "";
    document.getElementById("salePrice").value = car.price || "";
    document.getElementById("saleCondition").value = car.condition || "Used";
    document.getElementById("saleDescription").value = car.description || "";
    document.getElementById("saleFeatures").value = car.features || "";
    document.getElementById("saleFeatured").checked = !!car.featured;
    document.getElementById("saleAvailable").checked = !!car.is_available;
  }
  
  function resetSaleForm() {
    const form = document.getElementById("saleForm");
    const message = document.getElementById("saleFormMessage");
  
    if (form) form.reset();
  
    document.getElementById("saleId").value = "";
    document.getElementById("saleCondition").value = "Used";
    document.getElementById("saleAvailable").checked = true;
    document.getElementById("saleFeatured").checked = false;
  
    const galleryWraps = [
      document.getElementById("saleGalleryWrap2"),
      document.getElementById("saleGalleryWrap3"),
      document.getElementById("saleGalleryWrap4"),
      document.getElementById("saleGalleryWrap5")
    ];
  
    galleryWraps.forEach((wrap) => {
      if (wrap) wrap.style.display = "none";
    });
  
    if (message) {
      message.textContent = "";
      message.className = "admin-form-message";
    }
  }
  
  function setSaleFormMessage(message, type) {
    const el = document.getElementById("saleFormMessage");
    if (!el) return;
  
    el.textContent = message;
    el.className = "admin-form-message";
  
    if (type) {
      el.classList.add(type);
    }
  }
  
  async function handleSaleFormSubmit(e) {
    e.preventDefault();
  
    const saleId = document.getElementById("saleId").value.trim();
  
    try {
      setSaleFormMessage("Saving car...", "");
  
      const mainImageFile = document.getElementById("saleMainImageFile").files[0] || null;
  
      const galleryFiles = [
        document.getElementById("saleGalleryImage1").files[0] || null,
        document.getElementById("saleGalleryImage2").files[0] || null,
        document.getElementById("saleGalleryImage3").files[0] || null,
        document.getElementById("saleGalleryImage4").files[0] || null,
        document.getElementById("saleGalleryImage5").files[0] || null
      ].filter(Boolean);
  
      let mainImageUrl = "";
  
      if (mainImageFile) {
        mainImageUrl = await uploadAdminImage(mainImageFile, "sale-cars");
      }
  
      const payload = {
        title: document.getElementById("saleTitle").value.trim(),
        brand: document.getElementById("saleBrand").value.trim(),
        model: document.getElementById("saleModel").value.trim(),
        year: Number(document.getElementById("saleYear").value || 0) || null,
        mileage: Number(document.getElementById("saleMileage").value || 0) || null,
        fuel_type: document.getElementById("saleFuel").value.trim(),
        transmission: document.getElementById("saleTransmission").value.trim(),
        color: document.getElementById("saleColor").value.trim(),
        price: Number(document.getElementById("salePrice").value || 0),
        condition: document.getElementById("saleCondition").value,
        description: document.getElementById("saleDescription").value.trim(),
        features: document.getElementById("saleFeatures").value.trim(),
        featured: document.getElementById("saleFeatured").checked,
        is_available: document.getElementById("saleAvailable").checked
      };
  
      if (!payload.title) throw new Error("Title is required.");
      if (!payload.brand) throw new Error("Brand is required.");
      if (!payload.model) throw new Error("Model is required.");
      if (!payload.price) throw new Error("Price is required.");
  
      if (mainImageUrl) {
        payload.image_url = mainImageUrl;
      }
  
      let savedCarId = saleId;
  
      if (saleId) {
        const { error } = await window.db
          .from("cars_for_sale")
          .update(payload)
          .eq("id", saleId);
  
        if (error) throw error;
      } else {
        const { data, error } = await window.db
          .from("cars_for_sale")
          .insert([payload])
          .select()
          .single();
  
        if (error) throw error;
        savedCarId = data.id;
      }
  
      if (galleryFiles.length && savedCarId) {
        const galleryUrls = [];
  
        for (const file of galleryFiles) {
          const url = await uploadAdminImage(file, "sale-cars-gallery");
          galleryUrls.push(url);
        }
  
        await saveSaleGalleryImages(savedCarId, galleryUrls);
      }
  
      setSaleFormMessage("Car saved successfully.", "success");
  
      document.getElementById("saleModal").classList.remove("show");
      await loadAdminSaleCars();
      await loadAdminDashboard();
      await loadAdminAnalytics();
    } catch (error) {
      console.error("Sale form error:", error);
      setSaleFormMessage(error.message || "Failed to save car.", "error");
    }
  }
  
  function initSaleEditButtons(rows) {
    const buttons = document.querySelectorAll(".admin-edit-sale-btn");
    const modal = document.getElementById("saleModal");
    const title = document.getElementById("saleModalTitle");
  
    if (!buttons.length || !modal || !title) return;
  
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.id;
        const car = rows.find((item) => item.id === id);
        if (!car) return;
  
        resetSaleForm();
        fillSaleForm(car);
        title.textContent = "Edit Car";
        modal.classList.add("show");
      });
    });
  }
  
  function initSaleToggleButtons() {
    const buttons = document.querySelectorAll(".admin-toggle-sale-btn");
    if (!buttons.length) return;
  
    buttons.forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.dataset.id;
        const current = button.dataset.available === "true";
  
        try {
          const { error } = await window.db
            .from("cars_for_sale")
            .update({ is_available: !current })
            .eq("id", id);
  
          if (error) throw error;
  
          await loadAdminSaleCars();
          await loadAdminDashboard();
          await loadAdminAnalytics();
        } catch (error) {
          console.error("Toggle sale availability error:", error);
          alert(error.message || "Failed to update car status.");
        }
      });
    });
  }
  
  function initSaleDeleteButtons() {
    const buttons = document.querySelectorAll(".admin-delete-sale-btn");
    if (!buttons.length) return;
  
    buttons.forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.dataset.id;
        const ok = window.confirm("Delete this car?");
        if (!ok) return;
  
        try {
          const { error } = await window.db
            .from("cars_for_sale")
            .delete()
            .eq("id", id);
  
          if (error) throw error;
  
          await loadAdminSaleCars();
          await loadAdminDashboard();
          await loadAdminAnalytics();
        } catch (error) {
          console.error("Delete sale car error:", error);
          alert(error.message || "Failed to delete car.");
        }
      });
    });
  }
  async function loadAdminSettings() {
    const websiteForm = document.getElementById("websiteSettingsForm");
    const contactForm = document.getElementById("contactSettingsForm");
    const socialForm = document.getElementById("socialSettingsForm");
  
    if (!websiteForm && !contactForm && !socialForm) return;
  
    try {
      let { data, error } = await window.db
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
  
      if (error) throw error;
  
      if (!data) {
        const { data: inserted, error: insertError } = await window.db
          .from("site_settings")
          .insert([{}])
          .select()
          .single();
  
        if (insertError) throw insertError;
        data = inserted;
      }
  
      const companyName = document.getElementById("settingCompanyName");
      const tagline = document.getElementById("settingTagline");
      const phone = document.getElementById("settingPhone");
      const email = document.getElementById("settingEmail");
      const address = document.getElementById("settingAddress");
      const whatsapp = document.getElementById("settingWhatsapp");
      const facebook = document.getElementById("settingFacebook");
      const instagram = document.getElementById("settingInstagram");
      const tiktok = document.getElementById("settingTiktok");
  
      if (companyName) companyName.value = data.company_name || "";
      if (tagline) tagline.value = data.tagline || "";
      if (phone) phone.value = data.phone || "";
      if (email) email.value = data.email || "";
      if (address) address.value = data.address || "";
      if (whatsapp) whatsapp.value = data.whatsapp_number || "";
      if (facebook) facebook.value = data.facebook_url || "";
      if (instagram) instagram.value = data.instagram_url || "";
      if (tiktok) tiktok.value = data.tiktok_url || "";
  
      if (websiteForm && !websiteForm.dataset.bound) {
        websiteForm.dataset.bound = "true";
        websiteForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          await saveAdminSettings("website");
        });
      }
  
      if (contactForm && !contactForm.dataset.bound) {
        contactForm.dataset.bound = "true";
        contactForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          await saveAdminSettings("contact");
        });
      }
  
      if (socialForm && !socialForm.dataset.bound) {
        socialForm.dataset.bound = "true";
        socialForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          await saveAdminSettings("social");
        });
      }
  
    } catch (error) {
      console.error("Settings load error:", error);
    }
  }
  async function saveAdminSettings(section) {
    try {
      let { data: existing, error: fetchError } = await window.db
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
  
      if (fetchError) throw fetchError;
  
      if (!existing) {
        const { data: inserted, error: insertError } = await window.db
          .from("site_settings")
          .insert([{}])
          .select()
          .single();
  
        if (insertError) throw insertError;
        existing = inserted;
      }
  
      let payload = {};
  
      if (section === "website") {
        payload = {
          company_name: document.getElementById("settingCompanyName")?.value.trim() || "",
          tagline: document.getElementById("settingTagline")?.value.trim() || ""
        };
      }
  
      if (section === "contact") {
        payload = {
          phone: document.getElementById("settingPhone")?.value.trim() || "",
          email: document.getElementById("settingEmail")?.value.trim() || "",
          address: document.getElementById("settingAddress")?.value.trim() || "",
          whatsapp_number: document.getElementById("settingWhatsapp")?.value.trim() || ""
        };
      }
  
      if (section === "social") {
        payload = {
          facebook_url: document.getElementById("settingFacebook")?.value.trim() || "",
          instagram_url: document.getElementById("settingInstagram")?.value.trim() || "",
          tiktok_url: document.getElementById("settingTiktok")?.value.trim() || ""
        };
      }
  
      const { error } = await window.db
        .from("site_settings")
        .update(payload)
        .eq("id", existing.id);
  
      if (error) throw error;
  
      const messageId =
        section === "website"
          ? "websiteSettingsMessage"
          : section === "contact"
          ? "contactSettingsMessage"
          : "socialSettingsMessage";
  
      const el = document.getElementById(messageId);
      if (el) {
        el.textContent = "Saved successfully.";
        el.className = "admin-message success";
      }
  
    } catch (error) {
      console.error("Settings save error:", error);
  
      const messageId =
        section === "website"
          ? "websiteSettingsMessage"
          : section === "contact"
          ? "contactSettingsMessage"
          : "socialSettingsMessage";
  
      const el = document.getElementById(messageId);
      if (el) {
        el.textContent = error.message || "Failed to save settings.";
        el.className = "admin-message error";
      }
    }
  }