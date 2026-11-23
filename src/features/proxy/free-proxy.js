export const FREE_PROXY_COUNTRIES = Object.freeze([
  { code: "us", name: "United States", flag: "🇺🇸", slug: "usa" },
  { code: "gb", name: "United Kingdom", flag: "🇬🇧", slug: "united-kingdom" },
  { code: "ca", name: "Canada", flag: "🇨🇦", slug: "canada" },
  { code: "de", name: "Germany", flag: "🇩🇪", slug: "germany" },
  { code: "in", name: "India", flag: "🇮🇳", slug: "india" },
  { code: "jp", name: "Japan", flag: "🇯🇵", slug: "japan" },
  { code: "sg", name: "Singapore", flag: "🇸🇬", slug: "singapore" },
  { code: "au", name: "Australia", flag: "🇦🇺", slug: "australia" },
  { code: "fr", name: "France", flag: "🇫🇷", slug: "france" },
  { code: "nl", name: "Netherlands", flag: "🇳🇱", slug: "netherlands" },
  { code: "es", name: "Spain", flag: "🇪🇸", slug: "spain" },
  { code: "it", name: "Italy", flag: "🇮🇹", slug: "italy" },
  { code: "br", name: "Brazil", flag: "🇧🇷", slug: "brazil" },
  { code: "mx", name: "Mexico", flag: "🇲🇽", slug: "mexico" },
  { code: "kr", name: "South Korea", flag: "🇰🇷", slug: "south-korea" },
  { code: "pl", name: "Poland", flag: "🇵🇱", slug: "poland" },
  { code: "tr", name: "Turkey", flag: "🇹🇷", slug: "turkey" },
  { code: "ae", name: "United Arab Emirates", flag: "🇦🇪", slug: "united-arab-emirates" },
  { code: "id", name: "Indonesia", flag: "🇮🇩", slug: "indonesia" },
  { code: "th", name: "Thailand", flag: "🇹🇭", slug: "thailand" },
  { code: "za", name: "South Africa", flag: "🇿🇦", slug: "south-africa" },
  { code: "nz", name: "New Zealand", flag: "🇳🇿", slug: "new-zealand" },
  { code: "ie", name: "Ireland", flag: "🇮🇪", slug: "ireland" },
  { code: "se", name: "Sweden", flag: "🇸🇪", slug: "sweden" },
  { code: "no", name: "Norway", flag: "🇳🇴", slug: "norway" },
  { code: "my", name: "Malaysia", flag: "🇲🇾", slug: "malaysia" },
  { code: "tw", name: "Taiwan", flag: "🇹🇼", slug: "taiwan" },
  { code: "pt", name: "Portugal", flag: "🇵🇹", slug: "portugal" },
  { code: "at", name: "Austria", flag: "🇦🇹", slug: "austria" },
  { code: "be", name: "Belgium", flag: "🇧🇪", slug: "belgium" },
  { code: "fi", name: "Finland", flag: "🇫🇮", slug: "finland" },
  { code: "hk", name: "Hong Kong", flag: "🇭🇰", slug: "hong-kong" }
]);

export const FREE_PROXY_DURATIONS = Object.freeze([0, 5, 10, 15, 30, 60, 120]);

export function getProxyCountry(code) {
  return FREE_PROXY_COUNTRIES.find(country => country.code === code) || FREE_PROXY_COUNTRIES[0];
}

export function getFreeProxyLaunchUrl(countryCode) {
  const country = getProxyCountry(countryCode);
  return `https://shifter.io/web-proxy/${country.slug}`;
}

export function normalizeProxySettings(input = {}) {
  const country = getProxyCountry(typeof input.country === "string" ? input.country : "us");
  const duration = Number(input.durationMinutes);
  return {
    country: country.code,
    durationMinutes: FREE_PROXY_DURATIONS.includes(duration) ? duration : 30
  };
}

export function formatProxyTimeLeft(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
