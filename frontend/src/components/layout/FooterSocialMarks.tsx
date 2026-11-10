const SOCIALS = [
  {
    label: "Facebook",
    path: "M15 8h-2a2 2 0 0 0-2 2v2H9v3h2v7h3v-7h2.2l.8-3H14v-1.2c0-.5.2-.8.8-.8H16V8z",
  },
  {
    label: "Instagram",
    path: "M8 4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4zm8 1.8H8A2.2 2.2 0 0 0 5.8 8v8A2.2 2.2 0 0 0 8 18.2h8a2.2 2.2 0 0 0 2.2-2.2V8A2.2 2.2 0 0 0 16 5.8zM12 8.4A3.6 3.6 0 1 1 8.4 12 3.6 3.6 0 0 1 12 8.4zm0 1.6a2 2 0 1 0 2 2 2 2 0 0 0-2-2zm4.35-2.55a.85.85 0 1 1-.85.85.85.85 0 0 1 .85-.85z",
  },
  {
    label: "X",
    path: "M6 5h2.4l3.1 4.2L15.2 5H18l-4.7 6.1L18.4 19h-2.4l-3.4-4.6L8.6 19H6l5-6.5L6 5z",
  },
  {
    label: "LinkedIn",
    path: "M4.7 3.4A2.1 2.1 0 1 1 2.6 5.5 2.1 2.1 0 0 1 4.7 3.4zM3 8.6h3.4V21H3zm5.6 0H12v1.7h.1c.5-1 1.7-2 3.5-2 3.7 0 4.4 2.4 4.4 5.6V21H16.6v-5.5c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21H8.6z",
  },
] as const;

export function FooterSocialMarks({ heading }: { heading: string }) {
  return (
    <div className="mt-8">
      <p className="text-sm font-semibold text-white">{heading}</p>
      <ul className="mt-3 flex gap-2">
        {SOCIALS.map((social) => (
          <li key={social.label}>
            <span
              aria-label={social.label}
              role="img"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path fill="currentColor" d={social.path} />
              </svg>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
