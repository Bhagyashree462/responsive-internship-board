"use strict";

// Deployed Render backend URL
const API_BASE_URL = "https://internship-records-api.onrender.com";

const INTERNSHIPS_ENDPOINT = `${API_BASE_URL}/api/internships`;
const APPLICATIONS_ENDPOINT = `${API_BASE_URL}/api/applications`;

const searchInput = document.querySelector("#search");
const domainSelect = document.querySelector("#domain");
const clearButton = document.querySelector("#clearFilters");
const emptyClearButton = document.querySelector("#emptyClearButton");
const retryButton = document.querySelector("#retryButton");
const internshipList = document.querySelector("#internshipList");
const resultCount = document.querySelector("#resultCount");
const loadingMessage = document.querySelector("#loadingMessage");
const emptyMessage = document.querySelector("#emptyMessage");
const errorMessage = document.querySelector("#errorMessage");
const errorText = document.querySelector("#errorText");

let internships = [];
let isLoading = false;

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text == null ? "" : String(text);
  return element;
}

function getFirstValue(item, keys, fallback = "") {
  for (const key of keys) {
    const value = item?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
}

function normalizeInternship(item) {
  const rawId = getFirstValue(
    item,
    ["id", "internshipId", "internship_id"],
    null
  );

  const rawSkills = getFirstValue(item, ["skills"], "");
  const skills = Array.isArray(rawSkills)
    ? rawSkills.join(", ")
    : String(rawSkills ?? "");

  return {
    id: rawId,
    title: String(
      getFirstValue(
        item,
        ["title", "role", "position", "internshipTitle"],
        "Internship opportunity"
      )
    ),
    company: String(
      getFirstValue(
        item,
        ["company", "companyName", "organization", "employer"],
        "Company not specified"
      )
    ),
    domain: String(
      getFirstValue(
        item,
        ["domain", "category", "field", "department"],
        skills || "Other"
      )
    ),
    location: String(
      getFirstValue(
        item,
        ["location", "workMode", "mode", "place"],
        "Not specified"
      )
    ),
    description: String(
      getFirstValue(
        item,
        ["description", "summary", "details"],
        "Explore this internship opportunity."
      )
    ),
    url: String(
      getFirstValue(
        item,
        ["apply_url", "applyUrl", "applicationUrl", "url", "link"],
        ""
      )
    )
  };
}

async function readResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getErrorMessage(result, fallback) {
  if (typeof result?.error === "string") {
    return result.error;
  }

  return (
    result?.error?.message ||
    result?.message ||
    result?.errorMessage ||
    fallback
  );
}

function setLoading(loading) {
  isLoading = loading;
  loadingMessage.hidden = !loading;
  internshipList.setAttribute("aria-busy", String(loading));

  if (retryButton) {
    retryButton.disabled = loading;
  }
}

function populateDomains() {
  const previousValue = domainSelect.value;

  const domains = [
    ...new Set(
      internships
        .map(item => item.domain.trim())
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));

  domainSelect.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All domains";
  domainSelect.appendChild(allOption);

  domains.forEach(domain => {
    const option = document.createElement("option");
    option.value = domain;
    option.textContent = domain;
    domainSelect.appendChild(option);
  });

  domainSelect.value = domains.includes(previousValue)
    ? previousValue
    : "all";
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function createApplicationForm(internship) {
  const form = document.createElement("form");
  form.className = "application-form";

  form.appendChild(
    createTextElement(
      "h3",
      "application-heading",
      "Apply for this internship"
    )
  );

  const fields = [
    {
      name: "fullName",
      label: "Full name",
      type: "text",
      required: true,
      maxLength: 100,
      autocomplete: "name",
      placeholder: "Enter your full name"
    },
    {
      name: "email",
      label: "Email address",
      type: "email",
      required: true,
      maxLength: 254,
      autocomplete: "email",
      placeholder: "you@example.com"
    },
    {
      name: "phone",
      label: "Mobile number",
      type: "tel",
      required: true,
      maxLength: 10,
      pattern: "[6-9][0-9]{9}",
      autocomplete: "tel-national",
      placeholder: "10-digit mobile number"
    },
    {
      name: "resumeUrl",
      label: "Resume URL (optional)",
      type: "url",
      required: false,
      maxLength: 2048,
      placeholder: "https://example.com/resume.pdf"
    }
  ];

  fields.forEach(field => {
    const label = document.createElement("label");
    label.className = "form-field";
    label.htmlFor = `${field.name}-${String(internship.id)}`;

    const labelText = document.createElement("span");
    labelText.textContent = field.label;
    label.appendChild(labelText);

    const input = document.createElement("input");
    input.id = label.htmlFor;
    input.name = field.name;
    input.type = field.type;
    input.required = field.required;
    input.maxLength = field.maxLength;
    input.placeholder = field.placeholder;

    if (field.pattern) {
      input.pattern = field.pattern;
      input.title = "Enter a valid 10-digit Indian mobile number.";
      input.inputMode = "numeric";
    }

    if (field.autocomplete) {
      input.autocomplete = field.autocomplete;
    }

    label.appendChild(input);
    form.appendChild(label);
  });

  const submitButton = document.createElement("button");
  submitButton.className = "primary-button submit-button";
  submitButton.type = "submit";
  submitButton.textContent = "Submit application";
  form.appendChild(submitButton);

  const message = createTextElement("p", "form-message", "");
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");
  form.appendChild(message);

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    if (
      internship.id === null ||
      internship.id === undefined ||
      String(internship.id).trim() === ""
    ) {
      message.textContent =
        "This internship does not have a valid ID. Please contact support.";
      message.className = "form-message form-message-error";
      return;
    }

    const formData = new FormData(form);

    const application = {
      internshipId: internship.id,
      fullName: String(formData.get("fullName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      resumeUrl: String(formData.get("resumeUrl") ?? "").trim()
    };

    if (
      application.resumeUrl &&
      !isValidHttpUrl(application.resumeUrl)
    ) {
      message.textContent =
        "Please enter a valid HTTP or HTTPS resume URL.";
      message.className = "form-message form-message-error";
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";
    message.textContent = "Submitting your application...";
    message.className = "form-message";

    try {
      const response = await fetch(APPLICATIONS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(application)
      });

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            result,
            `Application failed (HTTP ${response.status}).`
          )
        );
      }

      message.textContent =
        result.message || "Application submitted successfully!";
      message.className = "form-message form-message-success";
      form.reset();
    } catch (error) {
      console.error("Application submission error:", error);

      message.textContent =
        error instanceof TypeError
          ? "Could not reach the API. Check the backend URL and CORS configuration."
          : error.message ||
            "Unable to submit your application. Please retry.";

      message.className = "form-message form-message-error";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Submit application";
    }
  });

  return form;
}

function createCard(internship) {
  const card = document.createElement("article");
  card.className = "internship-card";

  const top = document.createElement("div");
  top.className = "card-top";

  top.appendChild(
    createTextElement("span", "domain-tag", internship.domain)
  );

  top.appendChild(
    createTextElement("span", "card-id", `#${internship.id ?? "N/A"}`)
  );

  card.appendChild(top);

  card.appendChild(
    createTextElement("h3", "card-title", internship.title)
  );

  card.appendChild(
    createTextElement("p", "company", internship.company)
  );

  card.appendChild(
    createTextElement(
      "p",
      "card-meta",
      `Location / mode: ${internship.location}`
    )
  );

  card.appendChild(
    createTextElement(
      "p",
      "card-description",
      internship.description
    )
  );

  if (internship.url && isValidHttpUrl(internship.url)) {
    const link = document.createElement("a");
    link.className = "card-link";
    link.href = internship.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View opportunity ↗";
    card.appendChild(link);
  }

  card.appendChild(createApplicationForm(internship));

  return card;
}

function renderInternships() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedDomain = domainSelect.value;

  const filtered = internships.filter(item => {
    const searchable = [
      item.title,
      item.company,
      item.domain,
      item.location,
      item.description
    ].join(" ").toLowerCase();

    return (
      searchable.includes(query) &&
      (selectedDomain === "all" || item.domain === selectedDomain)
    );
  });

  internshipList.replaceChildren();

  const fragment = document.createDocumentFragment();

  filtered.forEach(item => {
    fragment.appendChild(createCard(item));
  });

  internshipList.appendChild(fragment);

  resultCount.textContent =
    `${filtered.length} of ${internships.length} internships shown`;

  emptyMessage.hidden = filtered.length !== 0;
}

function showError(message) {
  internships = [];
  internshipList.replaceChildren();
  resultCount.textContent = "Internship data unavailable";
  emptyMessage.hidden = true;
  errorMessage.hidden = false;
  errorText.textContent = message;
}

async function loadInternships() {
  if (isLoading) return;

  setLoading(true);
  errorMessage.hidden = true;
  emptyMessage.hidden = true;
  resultCount.textContent = "Loading internships...";

  try {
    const response = await fetch(
      `${INTERNSHIPS_ENDPOINT}?page=1&limit=100`,
      {
        headers: { Accept: "application/json" }
      }
    );

    const result = await readResponse(response);

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          result,
          `Request failed (HTTP ${response.status}).`
        )
      );
    }

    const records = Array.isArray(result)
      ? result
      : Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.internships)
          ? result.internships
          : null;

    if (!records) {
      throw new Error(
        "Unexpected API response. Expected an array of internship records."
      );
    }

    internships = records.map(normalizeInternship);

    populateDomains();
    renderInternships();
  } catch (error) {
    console.error("Internship loading error:", error);

    showError(
      error instanceof TypeError
        ? "Could not connect to the deployed API. Check the backend URL, availability, and CORS configuration."
        : error.message ||
          "Something went wrong while loading internships."
    );
  } finally {
    setLoading(false);
  }
}

function clearFilters() {
  searchInput.value = "";
  domainSelect.value = "all";
  renderInternships();
  searchInput.focus();
}

searchInput.addEventListener("input", renderInternships);
domainSelect.addEventListener("change", renderInternships);
clearButton.addEventListener("click", clearFilters);
emptyClearButton.addEventListener("click", clearFilters);
retryButton.addEventListener("click", loadInternships);

loadInternships();