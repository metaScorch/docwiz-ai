export function extractBusinessDomain(email) {
  if (!email) return "";
  const domain = email.split("@")[1];
  // Remove common email providers
  const commonProviders = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "aol.com",
    "icloud.com",
  ];
  if (domain && !commonProviders.includes(domain)) {
    return domain;
  }
  return "";
}
