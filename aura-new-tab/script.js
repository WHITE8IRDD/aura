document.addEventListener("DOMContentLoaded", () => {
  const downloadBtn = document.getElementById("downloadBtn");
  const searchInput = document.querySelector(".search-input");

  // Open Downloads Tab on button click
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      window.location.href = "chrome://downloads";
    });
  }

  // Handle URL navigation directly inside the search box
  const form = document.querySelector(".search-form");
  form.addEventListener("submit", (e) => {
    const query = searchInput.value.trim();

    // Check if query is a valid URL
    const isUrl = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/.*)?$/i.test(query);

    if (isUrl) {
      e.preventDefault();
      const targetUrl = query.startsWith("http") ? query : `https://${query}`;
      window.location.href = targetUrl;
    }
  });
});
