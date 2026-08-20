// Hidden "website" field — humans never see or fill it; naive bots do.
// The Edge Function rejects any submission where it is non-empty.
// Kept off-screen (not display:none) so simple bots still render it.

interface HoneypotFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const HoneypotField = ({ value, onChange }: HoneypotFieldProps) => (
  <div
    aria-hidden="true"
    style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}
  >
    <label htmlFor="website-field">Website</label>
    <input
      id="website-field"
      name="website"
      type="text"
      tabIndex={-1}
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

export default HoneypotField;
