const PUBLIC_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "mail.com",
  "zoho.com",
  "live.com",
  "msn.com",
];

export const extractBusinessDomain = (email) => {
  if (!email) return "";

  const domain = email.split("@")[1];
  if (!domain || PUBLIC_EMAIL_DOMAINS.includes(domain.toLowerCase())) {
    return "";
  }

  return domain;
};
