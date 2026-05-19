import { useState } from "react";
import type { FormEvent } from "react";
import type { MemberFormInput } from "../../lib/validations/member";
import { validateMemberInput } from "../../lib/validations/member";

type MemberFormProps = {
  onSubmit: (input: MemberFormInput) => Promise<void>;
};

const initialInput: MemberFormInput = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  email: "",
  expiryDate: "",
  notes: "",
};

export function MemberForm({ onSubmit }: MemberFormProps) {
  const [input, setInput] = useState<MemberFormInput>(initialInput);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validateMemberInput(input);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    setErrors([]);

    try {
      await onSubmit(input);
      setInput(initialInput);
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "Could not save member.",
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="panel-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          First name
          <input
            value={input.firstName}
            onChange={(event) =>
              setInput({ ...input, firstName: event.target.value })
            }
          />
        </label>
        <label>
          Last name
          <input
            value={input.lastName}
            onChange={(event) =>
              setInput({ ...input, lastName: event.target.value })
            }
          />
        </label>
        <label>
          Phone
          <input
            value={input.phoneNumber}
            onChange={(event) =>
              setInput({ ...input, phoneNumber: event.target.value })
            }
          />
        </label>
        <label>
          Email
          <input
            value={input.email}
            onChange={(event) =>
              setInput({ ...input, email: event.target.value })
            }
          />
        </label>
        <label>
          Expiry date
          <input
            type="date"
            value={input.expiryDate}
            onChange={(event) =>
              setInput({ ...input, expiryDate: event.target.value })
            }
          />
        </label>
      </div>
      <label>
        Notes
        <textarea
          value={input.notes}
          onChange={(event) =>
            setInput({ ...input, notes: event.target.value })
          }
        />
      </label>
      {errors.length > 0 ? (
        <ul className="form-errors">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      <button type="submit" disabled={isSaving}>
        {isSaving ? "Saving..." : "Add member"}
      </button>
    </form>
  );
}
