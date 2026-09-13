// Auto-dismissal is owned by ToastProvider; this component just renders the
// banner and a progress line that shrinks over the same duration.
export default function Toast({ message, type = 'info', duration = 2500, onDismiss }) {
  return (
    <div className={`toast toast--${type}`} onClick={onDismiss}>
      <span className="toast__msg">{message}</span>
      <span className="toast__progress" style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
}
