const colorMap = [
  "badge-indigo",
  "badge-blue",
  "badge-emerald",
  "badge-purple",
  "badge-amber",
  "badge-rose",
];

export const getBadgeColor = (subject) => {
  if (!subject) return colorMap[0];
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorMap[Math.abs(hash) % colorMap.length];
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
