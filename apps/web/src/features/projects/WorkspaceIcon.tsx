const paths = {
  project: "M8 5H5a2 2 0 0 0-2 2v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a2 2 0 0 0-2-2h-3 M8 4h8v4H8z M7 12h10 M7 16h10",
  interview: "M3 4h18v13H3z M10 8l5 2.5-5 2.5z M8 21h8",
  score: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z",
  checklist: "M8 5H5a2 2 0 0 0-2 2v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a2 2 0 0 0-2-2h-3 M8 4h8v4H8z M8 14l3 3 5-6",
  code: "m8 6-6 6 6 6 M16 6l6 6-6 6 M14 4l-4 16",
  layers: "m12 3 10 6-10 6L2 9z M2 13l10 6 10-6 M2 17l10 6 10-6",
  chart: "M4 20v-6 M9 20V9 M15 20V4 M20 20V1",
  calendar: "M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4 M8 14h2 M14 14h2 M8 17h2",
  plus: "M12 5v14 M5 12h14 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  document: "M5 3h9l5 5v13H5z M14 3v6h5 M8 13h8 M8 17h6",
} as const;

type WorkspaceIconProps = { name: keyof typeof paths };

export function WorkspaceIcon({ name }: WorkspaceIconProps) {
  return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}
