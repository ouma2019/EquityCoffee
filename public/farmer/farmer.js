// farmer.js

// --- LOTS PAGE LOGIC (create, edit, publish, hide, booked) ---
const createPanel = document.getElementById("create-lot-panel");
const openCreateBtn = document.getElementById("open-create-lot");
const cancelCreateBtn = document.getElementById("cancel-create-lot");
const createLotForm = document.getElementById("create-lot-form");
const lotsTableBody = document.querySelector("#lots-table tbody");
const statusFilter = document.getElementById("lots-status-filter");
const lotEditIndexInput = document.getElementById("lot-edit-index");
const createLotTitle = document.getElementById("create-lot-title");

// Helper: build status & visibility display
function buildStatusCell(status, visibility) {
  let badgeHtml = "";
  if (status === "published") {
    badgeHtml = '<span class="badge badge-info">Published</span>';
  } else if (status === "booked") {
    badgeHtml = '<span class="badge badge-warning">Booked</span>';
  } else if (status === "sold") {
    badgeHtml = '<span class="badge badge-success">Sold</span>';
  } else if (status === "hidden") {
    badgeHtml = '<span class="badge badge-info">Hidden</span>';
  } else {
    badgeHtml = '<span class="badge">Draft</span>';
  }

  let tagHtml = "";
  if (visibility === "public" && (status === "published" || status === "booked")) {
    tagHtml = '<span class="tag">Visible to buyers</span>';
  } else if (visibility === "public" && status === "hidden") {
    tagHtml = '<span class="tag">Hidden from marketplace</span>';
  } else if (visibility === "public" && status === "sold") {
    tagHtml = '<span class="tag">History</span>';
  } else if (visibility === "private") {
    tagHtml = '<span class="tag">Private</span>';
  }

  return `${badgeHtml} ${tagHtml}`;
}

// Helper: build action buttons based on status
function buildActionButtons(status) {
  const editBtn = '<button class="btn btn-ghost-small lot-action-edit">Edit</button>';
  const publishBtn =
    '<button class="btn btn-ghost-small lot-action-publish">Publish</button>';
  const hideBtn = '<button class="btn btn-ghost-small lot-action-hide">Hide</button>';
  const bookedBtn =
    '<button class="btn btn-ghost-small lot-action-booked">Mark booked</button>';
  const soldBtn =
    '<button class="btn btn-ghost-small lot-action-sold">Mark sold</button>';

  if (status === "draft") {
    return `${editBtn} ${publishBtn}`;
  }
  if (status === "published") {
    return `${editBtn} ${hideBtn} ${bookedBtn} ${soldBtn}`;
  }
  if (status === "booked") {
    return `${editBtn} ${hideBtn} ${soldBtn}`;
  }
  if (status === "hidden") {
    return `${editBtn} ${publishBtn}`;
  }
  // sold
  return `${editBtn}`;
}

// Show create/edit panel
function openCreatePanel(editRow) {
  createPanel.style.display = "block";
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

  if (editRow) {
    // Editing existing lot
    const cells = editRow.querySelectorAll("td");
    const lotName = cells[0].textContent.trim();
    const origin = cells[1].textContent.trim();
    const varProc = cells[2].textContent.trim();
    const score = cells[3].textContent.trim();
    const bags = cells[4].textContent.trim();
    const [country, region] = origin.split("•").map((s) => s.trim());
    const [variety, process] = varProc.split("/").map((s) => s.trim());

    document.getElementById("lot-name").value = lotName;
    document.getElementById("lot-country").value = country || "";
    document.getElementById("lot-region").value = region || "";
    document.getElementById("lot-variety").value = variety || "";
    document.getElementById("lot-process").value = process || "";
    document.getElementById("lot-score").value = score === "–" ? "" : score;
    document.getElementById("lot-bags").value = bags;
    // These fields aren't in the table yet; leave as-is for now
    // Year, location, status, visibility will usually be adjusted manually
    lotEditIndexInput.value = Array.from(lotsTableBody.children).indexOf(editRow);
    createLotTitle.textContent = "Edit lot";
  } else {
    // New lot
    createLotForm.reset();
    lotEditIndexInput.value = "";
    createLotTitle.textContent = "Create new lot";
  }
}

// Close panel
function closeCreatePanel() {
  createPanel.style.display = "none";
  createLotForm.reset();
  lotEditIndexInput.value = "";
  createLotTitle.textContent = "Create new lot";
}

// Attach events if we're on the lots page
if (openCreateBtn && createPanel && cancelCreateBtn && createLotForm && lotsTableBody) {
  openCreateBtn.addEventListener("click", () => openCreatePanel(null));
  cancelCreateBtn.addEventListener("click", () => closeCreatePanel());

  createLotForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("lot-name").value.trim();
    const year = document.getElementById("lot-year").value.trim();
    const variety = document.getElementById("lot-variety").value.trim();
    const process = document.getElementById("lot-process").value.trim();
    const region = document.getElementById("lot-region").value.trim();
    const country = document.getElementById("lot-country").value.trim();
    const bags = document.getElementById("lot-bags").value.trim();
    const score = document.getElementById("lot-score").value.trim();
    const status = document.getElementById("lot-status").value; // draft or published
    const visibility = document.getElementById("lot-visibility").value; // public/private

    const originText = `${country} • ${region}`;
    const varProcText = `${variety} / ${process}`;
    const scoreText = score || "–";

    const statusCellHtml = buildStatusCell(status, visibility);
    const actionButtonsHtml = buildActionButtons(status);

    const existingIndex = lotEditIndexInput.value;
    if (existingIndex !== "") {
      // Update existing row
      const row = lotsTableBody.children[Number(existingIndex)];
      row.setAttribute("data-status", status);
      row.setAttribute("data-visibility", visibility);
      const cells = row.querySelectorAll("td");
      cells[0].textContent = name;
      cells[1].textContent = originText;
      cells[2].textContent = varProcText;
      cells[3].textContent = scoreText;
      cells[4].textContent = bags;
      cells[5].innerHTML = statusCellHtml;
      cells[6].innerHTML = actionButtonsHtml;
    } else {
      // Create new row at top
      const row = document.createElement("tr");
      row.setAttribute("data-status", status);
      row.setAttribute("data-visibility", visibility);
      row.innerHTML = `
        <td>${name}</td>
        <td>${originText}</td>
        <td>${varProcText}</td>
        <td>${scoreText}</td>
        <td>${bags}</td>
        <td>${statusCellHtml}</td>
        <td>${actionButtonsHtml}</td>
      `;
      lotsTableBody.prepend(row);
    }

    // TODO: here is where you will later call your backend API:
    // fetch('/api/farmer/lots', { method:'POST' or 'PUT', body: JSON.stringify({...}) })

    closeCreatePanel();
  });

  // Delegate click events for action buttons (publish, hide, booked, sold, edit)
  lotsTableBody.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const row = btn.closest("tr");
    let status = row.getAttribute("data-status");
    let visibility = row.getAttribute("data-visibility");

    if (btn.classList.contains("lot-action-edit")) {
      openCreatePanel(row);
      return;
    }

    if (btn.classList.contains("lot-action-publish")) {
      status = "published";
      visibility = "public";
    } else if (btn.classList.contains("lot-action-hide")) {
      status = "hidden";
      visibility = "public";
    } else if (btn.classList.contains("lot-action-booked")) {
      status = "booked";
    } else if (btn.classList.contains("lot-action-sold")) {
      status = "sold";
    }

    row.setAttribute("data-status", status);
    row.setAttribute("data-visibility", visibility);
    const cells = row.querySelectorAll("td");
    cells[5].innerHTML = buildStatusCell(status, visibility);
    cells[6].innerHTML = buildActionButtons(status);

    // TODO: later call backend to update lot status/visibility
  });
}

// Filter by status
if (statusFilter && lotsTableBody) {
  statusFilter.addEventListener("change", () => {
    const value = statusFilter.value;
    const rows = lotsTableBody.querySelectorAll("tr");

    rows.forEach((row) => {
      const status = row.getAttribute("data-status");
      if (value === "all" || value === status) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  });
}
