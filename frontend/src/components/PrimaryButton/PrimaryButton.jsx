export default function PrimaryButton({ children, onClick, disabled, loading, fullWidth, className = '' }) {
  return (
    <button
      className={`primary-btn${fullWidth ? ' primary-btn--full' : ''}${disabled ? ' primary-btn--disabled' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <span className="primary-btn__spinner" /> : children}
    </button>
  );
}
