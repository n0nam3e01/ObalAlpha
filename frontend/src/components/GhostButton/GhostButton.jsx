export default function GhostButton({ children, onClick, disabled, danger, fullWidth, className = '' }) {
  return (
    <button
      className={`ghost-btn${danger ? ' ghost-btn--danger' : ''}${fullWidth ? ' ghost-btn--full' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
