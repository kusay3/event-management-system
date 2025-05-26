// Register user


document.getElementById("registerForm")?.addEventListener("submit", function (e) {
  e.preventDefault();
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;
  let users = JSON.parse(localStorage.getItem("users")) || [];

  if (users.find(u => u.email === email)) {
    alert("User already exists.");
    return;
  }

  users.push({ email, password, approved: false, passwordChanged: false });
  localStorage.setItem("users", JSON.stringify(users));
  alert("Registered successfully. Wait for admin approval.");
  window.location.href = "index.html";
});

// Login user
document.getElementById("loginForm")?.addEventListener("submit", function (e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  let users = JSON.parse(localStorage.getItem("users")) || [];

  // Admin login
  if (email === "admin@site.com" && password === "admin123") {
    alert("Welcome Admin.");
    window.location.href = "admin.html";
    return;
  }

  let user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    alert("User not found.");
    return;
  }
  if (!user.approved) {
    alert("Account not approved yet.");
    return;
  }

  localStorage.setItem("loggedInUser", user.email);

  if (user.passwordChanged === false || user.passwordChanged === "false" || user.passwordChanged === undefined) {
    window.location.href = "change-password.html";
    return;
  }

  alert("Login successful.");
  window.location.href = "events.html";
});

// Handle password change
document.getElementById("changePasswordForm")?.addEventListener("submit", function (e) {
  e.preventDefault();
  const newPassword = document.getElementById("newPassword").value;
  const email = localStorage.getItem("loggedInUser");
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let index = users.findIndex(u => u.email === email);
  if (index !== -1) {
    users[index].password = newPassword;
    users[index].passwordChanged = true;
    localStorage.setItem("users", JSON.stringify(users));
    alert("Password changed successfully.");
    window.location.href = "events.html";
  }
});

// Admin approve/reject
function loadAdminPage() {
  const usersList = document.getElementById("usersList");
  if (!usersList) return;
  const users = JSON.parse(localStorage.getItem("users")) || [];

  usersList.innerHTML = users.map((user, i) => `
    <div style="margin-bottom:10px;">
      ${user.email} - ${user.approved ? "✅ Approved" : "❌ Not Approved"}
      <button onclick="approveUser(${i})">Approve</button>
      <button onclick="rejectUser(${i})">Reject</button>
    </div>
  `).join("");
}

function approveUser(index) {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  users[index].approved = true;
  localStorage.setItem("users", JSON.stringify(users));
  loadAdminPage();
}

function rejectUser(index) {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  users.splice(index, 1);
  localStorage.setItem("users", JSON.stringify(users));
  loadAdminPage();
}

loadAdminPage();

// Load and display events on the page
async function loadEventsPage(filter = "All") {
  const container = document.getElementById('eventsContainer');
  if (!container) return;

  const events = JSON.parse(localStorage.getItem('events')) || [];

  const filteredEvents = filter === "All"
    ? events
    : events.filter(e => e.category === filter);

  if (filteredEvents.length === 0) {
    container.innerHTML = "<p>No events available.</p>";
    return;
  }

  container.innerHTML = "<p>Loading events...</p>";

  let html = "";

  for (let index = 0; index < filteredEvents.length; index++) {
    const event = filteredEvents[index];
    const weather = await getWeather(event.city);

    html += `
      <div class="event-card">
        <h3>${event.title}</h3>
        <p>Date: ${event.date}</p>
        <p>City: ${event.city}</p>
        <p>Category: ${event.category}</p>
        <p>Weather: ${weather}</p>
        ${event.image ? `<img src="${event.image}" width="150" />` : ''}

        <button class="vip-btn" onclick="bookTicket(${index}, 'vip')">Buy VIP - ${event.tickets.vip.price}$</button>
        <p>Available VIP: ${event.tickets.vip.available - event.sold.vip}</p>

        <button class="standard-btn" onclick="bookTicket(${index}, 'standard')">Buy Standard - ${event.tickets.standard.price}$</button>
        <p>Available Standard: ${event.tickets.standard.available - event.sold.standard}</p>

        <label for="payment-${index}">Payment Method:</label>
        <select id="payment-${index}">
          <option value="visa">Visa</option>
          <option value="mastercard">MasterCard</option>
          <option value="paypal">PayPal</option>
        </select>
      </div>
    `;
  }

  container.innerHTML = html;
}

// Buy a ticket
function bookTicket(index, type) {
  const events = JSON.parse(localStorage.getItem("events")) || [];
  const event = events[index];

  const payment = document.getElementById(`payment-${index}`).value;

  const remaining = event.tickets[type].available - event.sold[type];
  if (remaining <= 0) {
    alert(`${type.toUpperCase()} tickets are sold out.`);
    return;
  }

  event.sold[type] += 1;

  const userEmail = localStorage.getItem("loggedInUser");
  if (userEmail) {
    const userTickets = JSON.parse(localStorage.getItem("userTickets")) || {};
    if (!userTickets[userEmail]) {
      userTickets[userEmail] = [];
    }

    userTickets[userEmail].push({
      title: event.title,
      date: event.date,
      type: type,
      price: event.tickets[type].price
    });

    localStorage.setItem("userTickets", JSON.stringify(userTickets));
  }

  localStorage.setItem("events", JSON.stringify(events));
  alert(`You bought 1 ${type.toUpperCase()} ticket via ${payment.toUpperCase()} for ${event.tickets[type].price}$. ${remaining - 1} left.`);
  loadEventsPage();
}


let editingIndex = -1; // to specific the evenet that i am editng on it

function loadAdminEvents() {
  const form = document.getElementById("eventForm");
  const list = document.getElementById("eventList");
  if (!form || !list) return;

  if (form.dataset.bound) return;

  // do the event 1 time
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const title = document.getElementById("eventTitle").value;
    const date = document.getElementById("eventDate").value;
    const image = document.getElementById("eventImage").value;
    const city = document.getElementById("eventCity").value;
    const category = document.getElementById("eventCategory").value;
    const vipCount = parseInt(document.getElementById("vipCount").value);
    const vipPrice = parseFloat(document.getElementById("vipPrice").value);
    const stdCount = parseInt(document.getElementById("stdCount").value);
    const stdPrice = parseFloat(document.getElementById("stdPrice").value);

    const events = JSON.parse(localStorage.getItem("events")) || [];

    const newEvent = {
      title,
      date,
      image,
      city,
      category,
      tickets: {
        vip: { available: vipCount, price: vipPrice },
        standard: { available: stdCount, price: stdPrice }
      },
      sold: editingIndex >= 0 ? events[editingIndex].sold : { vip: 0, standard: 0 }
    };

    if (editingIndex >= 0) {
      events[editingIndex] = newEvent;
      editingIndex = -1;
      document.getElementById("submitBtn").textContent = "Add Event";
    } else {
      events.push(newEvent);
    }

    localStorage.setItem("events", JSON.stringify(events));
    form.reset();
    loadAdminEvents(); // reload the event
  });

  form.dataset.bound = true; // being sure ti will not retry

  // show events list
  const events = JSON.parse(localStorage.getItem("events")) || [];
  list.innerHTML = events.map((event, i) => `
    <div style="margin: 10px; padding: 10px; border: 1px solid #ccc;">
      <h3>${event.title}</h3>
      <p>Date: ${event.date}</p>
      <p>City: ${event.city}</p>
      <p>Category: ${event.category}</p>
      <button onclick="editEvent(${i})">Edit</button>
      <button onclick="deleteEvent(${i})">Delete</button>
    </div>
  `).join("");
}

function editEvent(index) {
  const events = JSON.parse(localStorage.getItem("events")) || [];
  const e = events[index];

  document.getElementById("eventTitle").value = e.title;
  document.getElementById("eventDate").value = e.date;
  document.getElementById("eventImage").value = e.image;
  document.getElementById("eventCity").value = e.city;
  document.getElementById("eventCategory").value = e.category;
  document.getElementById("vipCount").value = e.tickets.vip.available;
  document.getElementById("vipPrice").value = e.tickets.vip.price;
  document.getElementById("stdCount").value = e.tickets.standard.available;
  document.getElementById("stdPrice").value = e.tickets.standard.price;

  editingIndex = index;
  document.getElementById("submitBtn").textContent = "Update Event";
}

function deleteEvent(index) {
  const events = JSON.parse(localStorage.getItem("events")) || [];
  if (confirm("Are you sure you want to delete this event?")) {
    events.splice(index, 1);
    localStorage.setItem("events", JSON.stringify(events));
    loadAdminEvents(); // refresh the list after delete
  }
}


// bu sure of loading when open the page
window.onload = () => {
  loadAdminEvents();
};


// Tickets page
function loadUserTickets() {
  const container = document.getElementById("ticketList");
  const email = localStorage.getItem("loggedInUser");
  const tickets = (JSON.parse(localStorage.getItem("userTickets")) || {})[email] || [];

  if (tickets.length === 0) {
    container.innerHTML = "<p>No tickets purchased.</p>";
    return;
  }

  container.innerHTML = tickets.map((t, i) => `
    <div class="ticket-card">
      <p><strong>${t.title}</strong></p>
      <p>Date: ${t.date}</p>
      <p>Type: ${t.type}</p>
      <p>Price: $${t.price}</p>
      <button onclick="cancelTicket(${i})">Cancel Ticket</button>
    </div>
  `).join("");
}

function cancelTicket(index) {
  const email = localStorage.getItem("loggedInUser");
  const userTickets = JSON.parse(localStorage.getItem("userTickets")) || {};
  if (userTickets[email]) {
    userTickets[email].splice(index, 1);
    localStorage.setItem("userTickets", JSON.stringify(userTickets));
    loadUserTickets();
  }
}

// Weather API
async function getWeather(city) {
  const apiKey = "4e242d8edc2e17afb3857d5ecf2f420b";
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.weather && data.weather.length > 0) {
      return data.weather[0].main;
    } else {
      return "Unknown";
    }
  } catch (error) {
    console.error("Weather fetch error:", error);
    return "Error";
  }
}

function filterEvents(category) {
  loadEventsPage(category);
}
