export default function RiskBreakdown({ breakdown = {} }) {
  if (!Object.keys(breakdown).length) return null;

  const factors = [
    { key: 'hazard_severity', label: 'Hazard Severity', color: '#dc2626' },
    { key: 'people_exposure', label: 'People Exposure', color: '#ea580c' },
    { key: 'escalation_potential', label: 'Escalation Potential', color: '#D4AF37' },
    { key: 'vulnerability', label: 'Vulnerability', color: '#1F3A5F' },
    { key: 'response_difficulty', label: 'Response Difficulty', color: '#2563eb' },
    { key: 'uncertainty', label: 'Uncertainty', color: '#8a8a8a' },
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
