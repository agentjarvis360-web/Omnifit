/* OmniFit runtime config (safe for the client). Never put XAI_API_KEY here. */
window.OMNIFIT = window.OMNIFIT || {
  // Production meal-scan API (public HTTPS origin, no trailing slash).
  // Local same-origin: set this to "" and use `python3 serve`.
  scanApiBase: "https://omnifit-scab.onrender.com"
};
