
const searchInput = document.querySelector("#search");
const domainSelect = document.querySelector("#domain");
const clearButton = document.querySelector("#clearFilters");
const internshipList = document.querySelector("#internshipList");
const resultCount = document.querySelector("#resultCount");
const emptyMessage = document.querySelector("#emptyMessage");
const errorMessage = document.querySelector("#errorMessage");

let internships = [];

function getText(item, keys, fallback = "") {
  for (const key of keys) {
    const value = item[key];

    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }

  return fallback;
}

function normalize(item, index) {
  return {
    id: getText(item, ["id", "internshipId"], String(index + 1)),
    title: getText(
      item,
      ["title", "role", "position", "internshipTitle"],
      "Internship opportunity"
    ),
    company: getText(
      item,
      ["company", "companyName", "organization", "employer"],
      "Company not specified"
    ),
    domain: getText(
      item,
      ["domain", "category", "field", "department"],
      "Other"
    ),
    location: getText(
      item,
      ["location", "workMode", "mode", "place"],
      "Not specified"
    ),
    description: getText(
      item,
      ["description", "summary", "details"],
      "Explore this internship opportunity."
    ),
    url: getText(
      item,
      ["url", "applicationUrl", "applyUrl", "link"],
      ""
    )
  };
}

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function populateDomains() {
  const domains = [
    ...new Set(internships.map((item) => item.domain))
  ].sort((a, b) => a.localeCompare(b));

  domainSelect.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All domains";
  domainSelect.appendChild(allOption);

  domains.forEach((domain) => {
    const option = document.createElement("option");
    option.value = domain;
    option.textContent = domain;
    domainSelect.appendChild(option);
  });
}

function createCard(item) {
  const card = document.createElement("article");
  card.className = "internship-card";

  card.appendChild(
    createTextElement("span", "domain-tag", item.domain)
  );

  card.appendChild(
    createTextElement("h3", "", item.title)
  );

  card.appendChild(
    createTextElement("p", "company", item.company)
  );

  card.appendChild(
    createTextElement(
      "p",
      "card-meta",
      `Location / mode: ${item.location}`
    )
  );

  card.appendChild(
    createTextElement("p", "card-description", item.description)
  );

  if (item.url) {
    try {
      const url = new URL(item.url);

      if (url.protocol === "https:" || url.protocol === "http:") {
        const link = document.createElement("a");
        link.className = "card-link";
        link.href = url.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "View opportunity ↗";
        card.appendChild(link);
      }
    } catch {
      // Ignore invalid application URLs.
    }
  }

  return card;
}

function renderInternships() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedDomain = domainSelect.value;

  const filtered = internships.filter((item) => {
    const searchable = [
      item.title,
      item.company,
      item.domain,
      item.location,
      item.description
    ].join(" ").toLowerCase();

    const matchesSearch = searchable.includes(query);
    const matchesDomain =
      selectedDomain === "all" ||
      item.domain === selectedDomain;

    return matchesSearch && matchesDomain;
  });

  internshipList.replaceChildren();

  filtered.forEach((item) => {
    internshipList.appendChild(createCard(item));
  });

  resultCount.textContent =
    `${filtered.length} of ${internships.length} internships shown`;

  emptyMessage.hidden = filtered.length > 0;
}

function showError() {
  internships = [];
  internshipList.replaceChildren();
  resultCount.textContent = "Internship data unavailable";
  emptyMessage.hidden = true;
  errorMessage.hidden = false;
}

async function loadInternships() {
  resultCount.textContent = "Loading internships...";
  errorMessage.hidden = true;

  try {
    const response = await fetch("./internships.json");

    if (!response.ok) {
      throw new Error("Could not load internships.json");
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Expected a JSON array of internships");
    }

    internships = data.map(normalize);
    populateDomains();
    renderInternships();
  } catch (error) {
    console.error("Internship loading error:", error);
    showError();
  }
}

searchInput.addEventListener("input", renderInternships);
domainSelect.addEventListener("change", renderInternships);

clearButton.addEventListener("click", () => {
  searchInput.value = "";
  domainSelect.value = "all";
  renderInternships();
  searchInput.focus();
});

loadInternships();