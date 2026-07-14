document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  const avatarColors = [
    "#1a237e",
    "#00695c",
    "#c62828",
    "#6a1b9a",
    "#ef6c00",
    "#2e7d32",
    "#1565c0",
    "#ad1457",
  ];

  function getInitials(email) {
    return (
      email
        .split("@")[0]
        .split(/[._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("") || "?"
    );
  }

  function getAvatarColor(email) {
    const normalizedEmail = email.trim().toLowerCase();
    let hash = 0;

    for (let index = 0; index < normalizedEmail.length; index += 1) {
      hash = (hash * 31 + normalizedEmail.charCodeAt(index)) >>> 0;
    }

    return avatarColors[hash % avatarColors.length];
  }

  function renderParticipants(participants) {
    if (!participants.length) {
      return '<p class="empty-state">No participants yet.</p>';
    }

    return `
      <div class="participants-list">
        ${participants
          .map(
            (email) => `
              <button type="button" class="participant-chip" data-email="${email}">
                <span class="participant-avatar" style="background-color: ${getAvatarColor(email)}">
                  ${getInitials(email)}
                </span>
                <span class="participant-email">${email}</span>
              </button>
            `
          )
          .join("")}
      </div>
    `;
  }

  function createActivityCard(name, details) {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";
    activityCard.dataset.activityName = name;

    const spotsLeft = details.max_participants - details.participants.length;

    activityCard.innerHTML = `
      <h4>${name}</h4>
      <p>${details.description}</p>
      <p><strong>Schedule:</strong> ${details.schedule}</p>
      <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
      <div class="participants-section">
        <div class="participants-header">
          <h5>Registered Participants</h5>
          <span class="participants-count">${details.participants.length}</span>
        </div>
        ${renderParticipants(details.participants)}
      </div>
    `;

    return activityCard;
  }

  // Function to fetch activities from API
  async function fetchActivities(selectedActivity = "") {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        activitiesList.appendChild(createActivityCard(name, details));

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      if (selectedActivity) {
        activitySelect.value = selectedActivity;
      }
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function refreshActivityCard(activityName) {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      const details = activities[activityName];

      if (!details) {
        await fetchActivities(activityName);
        return;
      }

      const activityCard = Array.from(activitiesList.querySelectorAll(".activity-card")).find(
        (card) => card.dataset.activityName === activityName
      );

      if (!activityCard) {
        await fetchActivities(activityName);
        return;
      }

      activityCard.replaceWith(createActivityCard(activityName, details));
    } catch (error) {
      console.error("Error refreshing activity card:", error);
      await fetchActivities(activityName);
    }
  }

  async function removeParticipantFromActivity(activityName, email) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        await refreshActivityCard(activityName);
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to remove participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error removing participant:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        await refreshActivityCard(activity);
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  activitiesList.addEventListener("click", async (event) => {
    const participantButton = event.target.closest(".participant-chip");

    if (!participantButton) {
      return;
    }

    const activityCard = participantButton.closest(".activity-card");
    const activityName = activityCard?.dataset.activityName;
    const email = participantButton.dataset.email;

    if (!activityName || !email) {
      return;
    }

    await removeParticipantFromActivity(activityName, email);
  });

  // Initialize app
  fetchActivities();
});
