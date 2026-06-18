const allocationSegments: Array<{
  label: string
  value: string
  colorClass: string
  x: number
  y: number
}> = [
  { label: 'Stocks', value: '50%', colorClass: 'fill-primary', x: 220, y: 72 },
  { label: 'ETFs', value: '25%', colorClass: 'fill-success', x: 220, y: 102 },
  { label: 'Bonds', value: '15%', colorClass: 'fill-warning', x: 220, y: 132 },
  { label: 'Cash', value: '10%', colorClass: 'fill-text-muted', x: 220, y: 162 },
]

export const AssetAllocationDonut = () => (
  <svg
    viewBox="0 0 360 220"
    role="img"
    aria-labelledby="asset-allocation-title"
    className="h-full min-h-48 w-full"
  >
    <title id="asset-allocation-title">Diversified asset allocation</title>
    <rect x="1" y="1" width="358" height="218" rx="8" className="fill-surface-alt stroke-border" />
    <circle
      cx="118"
      cy="110"
      r="58"
      className="fill-none stroke-primary"
      strokeWidth="34"
      strokeDasharray="182 365"
      transform="rotate(-90 118 110)"
    />
    <circle
      cx="118"
      cy="110"
      r="58"
      className="fill-none stroke-success"
      strokeWidth="34"
      strokeDasharray="92 365"
      strokeDashoffset="-182"
      transform="rotate(-90 118 110)"
    />
    <circle
      cx="118"
      cy="110"
      r="58"
      className="fill-none stroke-warning"
      strokeWidth="34"
      strokeDasharray="55 365"
      strokeDashoffset="-274"
      transform="rotate(-90 118 110)"
    />
    <circle
      cx="118"
      cy="110"
      r="58"
      className="fill-none stroke-text-muted"
      strokeWidth="34"
      strokeDasharray="36 365"
      strokeDashoffset="-329"
      transform="rotate(-90 118 110)"
    />
    {allocationSegments.map(({ label, value, colorClass, x, y }) => (
      <g key={label}>
        <circle cx={x} cy={y - 4} r="5" className={colorClass} />
        <text x={x + 14} y={y} className="fill-text-primary text-[14px] font-bold">
          {label}
        </text>
        <text x={304} y={y} className="fill-text-muted text-[14px] font-semibold">
          {value}
        </text>
      </g>
    ))}
  </svg>
)
