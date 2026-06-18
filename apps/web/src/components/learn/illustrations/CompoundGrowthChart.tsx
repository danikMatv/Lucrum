export const CompoundGrowthChart = () => (
  <svg
    viewBox="0 0 360 220"
    role="img"
    aria-labelledby="compound-growth-title"
    className="h-full min-h-48 w-full text-primary"
  >
    <title id="compound-growth-title">Compound growth chart</title>
    <rect x="1" y="1" width="358" height="218" rx="8" className="fill-surface-alt stroke-border" />
    <path d="M48 176H320" className="stroke-border" strokeWidth="2" />
    <path d="M48 176V36" className="stroke-border" strokeWidth="2" />
    <path
      d="M58 164C92 158 112 150 136 138C174 119 188 96 214 77C244 55 276 45 316 39"
      className="fill-none stroke-primary"
      strokeLinecap="round"
      strokeWidth="5"
    />
    <path
      d="M58 164C92 160 116 156 144 150C188 141 236 127 316 102"
      className="fill-none stroke-text-muted"
      strokeLinecap="round"
      strokeWidth="3"
      strokeDasharray="8 8"
    />
    <circle cx="214" cy="77" r="7" className="fill-primary" />
    <circle cx="316" cy="39" r="7" className="fill-primary" />
    <text x="56" y="198" className="fill-text-muted text-[13px] font-semibold">
      Year 1
    </text>
    <text x="268" y="198" className="fill-text-muted text-[13px] font-semibold">
      Year 20
    </text>
    <text x="204" y="65" className="fill-text-primary text-[13px] font-bold">
      reinvested gains
    </text>
  </svg>
)
