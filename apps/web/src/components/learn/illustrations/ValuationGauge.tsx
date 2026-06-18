export const ValuationGauge = () => (
  <svg
    viewBox="0 0 360 220"
    role="img"
    aria-labelledby="valuation-gauge-title"
    className="h-full min-h-48 w-full"
  >
    <title id="valuation-gauge-title">Valuation margin of safety gauge</title>
    <rect x="1" y="1" width="358" height="218" rx="8" className="fill-surface-alt stroke-border" />
    <path
      d="M74 154A106 106 0 0 1 286 154"
      className="fill-none stroke-border"
      strokeLinecap="round"
      strokeWidth="18"
    />
    <path
      d="M74 154A106 106 0 0 1 160 52"
      className="fill-none stroke-success"
      strokeLinecap="round"
      strokeWidth="18"
    />
    <path
      d="M160 52A106 106 0 0 1 238 78"
      className="fill-none stroke-warning"
      strokeLinecap="round"
      strokeWidth="18"
    />
    <path
      d="M238 78A106 106 0 0 1 286 154"
      className="fill-none stroke-danger"
      strokeLinecap="round"
      strokeWidth="18"
    />
    <path d="M180 154L232 96" className="stroke-primary" strokeLinecap="round" strokeWidth="6" />
    <circle cx="180" cy="154" r="10" className="fill-primary" />
    <text x="64" y="184" className="fill-text-muted text-[13px] font-semibold">
      discount
    </text>
    <text x="244" y="184" className="fill-text-muted text-[13px] font-semibold">
      expensive
    </text>
    <text x="108" y="42" className="fill-text-primary text-[15px] font-bold">
      Price versus value
    </text>
  </svg>
)
