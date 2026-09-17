import { formatDateTime } from '../utils/constants';
import { ClipboardList } from 'lucide-react';

export default function Timeline({ events = [] }) {
  if (!events.length) {
    return (
      <div className="empty-state" style={{ padding: '1.5rem', textAlign: 'center' }}>
        <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
          <ClipboardList size={28} strokeWidth={1.5} />
        </div>
        <p className="empty-title">No timeline events yet</p>
      </div>
    );
  }

  return (
    <div className="timeline">
      {events.map((event) => (
        <div key={event.id} className="timeline-event">
          <div className="timeline-time">{formatDateTime(event.timestamp)}</div>
          <div className="timeline-text">{event.event}</div>
          <div className="timeline-actor">— {event.actor_name}</div>
        </div>
      ))}
    </div>
  );
}
