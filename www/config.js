/* OmniFit runtime config (safe for the client). Never put XAI_API_KEY here. */
window.OMNIFIT = window.OMNIFIT || {
  // Empty string = same-origin (local `python3 serve` on the Mac).
  // Production: full HTTPS origin of the hosted meal-scan API, no trailing slash.
  // Example: "https://omnifit-scan.example.com"
  scanApiBase: ""
};
