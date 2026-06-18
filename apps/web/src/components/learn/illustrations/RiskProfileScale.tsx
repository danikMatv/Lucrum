export const RiskProfileScale = () => (
  <svg
    viewBox="0 0 360 220"
    role="img"
    aria-labelledby="risk-profile-title"
    className="h-full min-h-48 w-full"
  >
    <title id="risk-profile-title">Risk and return scale</title>
    <rect x="1" y="1" width="358" height="218" rx="8" className="fill-surface-alt stroke-border" />
    <path d="M52 150H306" className="stroke-border" strokeLinecap="round" strokeWidth="12" />
    <path d="M52 150H218" className="stroke-primary" strokeLinecap="round" strokeWidth="12" />
    <circle cx="218" cy="150" r="18" className="fill-primary" />
    <path
      d="M72 126C88 98 105 85 126 88C150 91 155 124 182 125C212 126 218 75 250 70C272 67 288 83 302 110"
      className="fill-none stroke-text-muted"
      strokeLinecap="round"
      strokeWidth="4"
    />
    <text x="44" y="184" className="fill-text-muted text-[13px] font-semibold">
      stable
    </text>
    <text x="248" y="184" className="fill-text-muted text-[13px] font-semibold">
      volatile
    </text>
    <text x="88" y="52" className="fill-text-primary text-[15px] font-bold">
      Match risk to time horizon
    </text>
  </svg>
)
