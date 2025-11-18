document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Basic card content
        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants" aria-live="polite">
            <strong>Participants:</strong>
            <ul class="participants-list"></ul>
          </div>
        `;

        // Populate participants list (bulleted) with avatar + name
        const participantsUl = activityCard.querySelector(".participants-list");
        if (details.participants && details.participants.length > 0) {
          details.participants.forEach((p) => {
            const li = document.createElement("li");
            li.className = "participant-item";

            // avatar with initials
            const avatar = document.createElement("span");
            avatar.className = "participant-avatar";
            const initials = p
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            avatar.textContent = initials;
            avatar.setAttribute("aria-hidden", "true");

            // name
            const nameSpan = document.createElement("span");
            nameSpan.className = "participant-name";
            nameSpan.textContent = p;
            nameSpan.title = p;

            // remove button (delete icon)
            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "participant-remove";
            removeBtn.innerHTML = "&times;"; // simple × icon
            removeBtn.setAttribute("aria-label", `Remove participant ${p} from ${name}`);

            // click handler to unregister participant
            removeBtn.addEventListener("click", async () => {
              // optimistic UI: disable button while processing
              removeBtn.disabled = true;

              try {
                // Attempt to call backend to unregister. Use DELETE on the same signup endpoint.
                const res = await fetch(
                  `/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(p)}`,
                  { method: "DELETE" }
                );

                if (res.ok) {
                  // remove this li from DOM
                  const parentUl = li.parentElement;
                  li.remove();

                  // If no participants remain, show muted placeholder
                  if (!parentUl.querySelector(".participant-item")) {
                    const emptyLi = document.createElement("li");
                    emptyLi.textContent = "No participants yet";
                    emptyLi.className = "muted";
                    parentUl.appendChild(emptyLi);
                  }

                  // update availability count shown in card
                  const availEl = activityCard.querySelector(".availability");
                  if (availEl) {
                    // parse current number and increment
                    const match = availEl.textContent.match(/(\d+) spots left/);
                    if (match) {
                      const current = parseInt(match[1], 10);
                      const updated = current + 1;
                      availEl.innerHTML = `<strong>Availability:</strong> ${updated} spots left`;
                    }
                  }

                  // show brief success message
                  messageDiv.textContent = `Removed ${p} from ${name}`;
                  messageDiv.className = "success";
                  messageDiv.classList.remove("hidden");
                  setTimeout(() => messageDiv.classList.add("hidden"), 3000);
                } else {
                  const err = await res.json().catch(() => ({}));
                  messageDiv.textContent = err.detail || `Failed to remove ${p}`;
                  messageDiv.className = "error";
                  messageDiv.classList.remove("hidden");
                  removeBtn.disabled = false;
                }
              } catch (e) {
                console.error("Error removing participant:", e);
                messageDiv.textContent = `Failed to remove ${p}. Try again.`;
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
                removeBtn.disabled = false;
              }
            });

            li.appendChild(avatar);
            li.appendChild(nameSpan);
            li.appendChild(removeBtn);
            participantsUl.appendChild(li);
          });
        } else {
          const li = document.createElement("li");
          li.textContent = "No participants yet";
          li.className = "muted";
          participantsUl.appendChild(li);
        }

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
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

  // Initialize app
  fetchActivities();
});
