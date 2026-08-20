// Hidden trap field — humans never see or fill it; naive bots do. The Edge
// Function rejects any submission where the wire field `website` is non-empty.
//
// IMPORTANT (regression: real users were rejected): browser autofill ignores
// autocomplete="off" and fills anything that LOOKS like a website/URL field —
// firing real input events that React captures. So this input must be
// autofill-proof:
//   - non-semantic name/id/label the autofill heuristics can't classify
//     (the wire payload key stays `website`; only the DOM attributes differ)
//   - readOnly until focused — browsers do not autofill readonly inputs,
//     while naive bots setting .value directly are still caught
//   - kept off-screen (not display:none) so simple bots still render it

import { useState } from 'react';

interface HoneypotFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const HoneypotField = ({ value, onChange }: HoneypotFieldProps) => {
  const [interactive, setInteractive] = useState(false);
  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}
    >
      <label htmlFor="scs-hp-check">Leave this field empty</label>
      <input
        id="scs-hp-check"
        name="scs_hp_check"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        data-1p-ignore="true"
        data-lpignore="true"
        data-form-type="other"
        readOnly={!interactive}
        onFocus={() => setInteractive(true)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default HoneypotField;
