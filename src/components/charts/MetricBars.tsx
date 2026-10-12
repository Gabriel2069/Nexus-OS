type Item = { label: string; value: number; detail?: string };
export function MetricBars({
  items,
  max = Math.max(...items.map((item, index) => item.value), 1),
}: {
  items: Item[];
  max?: number;
}) {
  return (
    <div className="metric-bars">
      {items.map((item, index) => (
        <div className="metric-bar" key={`${item.label}-${index}`}>
          <div className="metric-bar__head">
            <span>{item.label}</span>
            <strong>{item.detail ?? item.value}</strong>
          </div>
          <div className="metric-bar__track">
            <span
              style={{
                width: `${Math.max(0, Math.min(100, (item.value / Math.max(max, 1)) * 100))}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
