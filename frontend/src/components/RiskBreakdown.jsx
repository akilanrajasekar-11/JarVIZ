export default function RiskBreakdown({ breakdown = {} }) {
  if (!Object.keys(breakdown).length) return null;

  const factors = [
    { key: 'hazard_severity', label: 'Hazard Severity', color: '#ef4444' },
    { key: 'people_exposure', label: 'People Exposure', color: '#f97316' },
    { key: 'escalation_potential', label: 'Escalation Potential', color: '#eab308' },
    { key: 'vulnerability', label: 'Vulnerability', color: '#a855f7' },
    { key: 'response_difficulty', label: 'Response Difficulty', color: '#3b82f6' },
    { key: 'uncertainty', label: 'Uncertainty', color: '#6b7280' },
  ];

  return (
    <div className="risk-breakdown">
      {factors.map(({ key, label, color }) => {
        const f = breakdown[key];
        if (!f) return null;
        return (
          <div key={key} className="risk-factor">
            <span className="risk-factor-name">{label}</span>
            <div className="risk-factor-bar">
              <div
                className="risk-factor-fill"
                style={{ width: `${f.value}%`, background: color }}
              />
            </div>
            <span className="risk-factor-val">{f.value} × {f.weight} = {f.weighted}</span>
          </div>
        );
      })}
    </div>
  );
}
