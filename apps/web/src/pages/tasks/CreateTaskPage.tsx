import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { listMembers } from "../../features/members/api";
import type { MemberSummary } from "../../features/members/types";
import { createTask } from "../../features/tasks/api";
import type { TaskPriority, TaskType } from "../../features/tasks/types";
import { useAuth } from "../../lib/auth/AuthContext";
import {
  sanitizeTaskDescriptionHtml,
  taskDescriptionText,
  taskFormSchema,
  taskPriorityDescriptions,
  taskPriorityLabels,
  taskTypeDescriptions,
  taskTypeLabels,
} from "../../lib/validations/task";

type TaskFormState = {
  title: string;
  descriptionHtml: string;
  memberId: string;
  type: TaskType;
  priority: TaskPriority;
  dueDate: string;
  dueTime: string;
  assignToMe: boolean;
};

type TouchedFields = Partial<Record<keyof TaskFormState, boolean>>;
type FieldErrors = Partial<Record<keyof TaskFormState, string>>;

const taskTypes = Object.keys(taskTypeLabels) as TaskType[];
const taskPriorities = Object.keys(taskPriorityLabels) as TaskPriority[];

function nextDateValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  return date.toISOString().slice(0, 10);
}

function memberName(member: { firstName: string; lastName?: string | null }) {
  return [member.firstName, member.lastName].filter(Boolean).join(" ");
}

function apiErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response
  ) {
    const data = error.response.data as { message?: string | string[] };

    if (Array.isArray(data.message)) {
      return data.message[0] ?? "Task details are invalid.";
    }

    if (data.message) {
      return data.message;
    }
  }

  return "Could not create the task. Check the form and try again.";
}

function RichTextEditor({
  value,
  onChange,
  onBlur,
  hasError,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  hasError: boolean;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const editor = editorRef.current;

    if (editor && document.activeElement !== editor && editor.innerHTML !== value) {
      editor.innerHTML = value;
    }
  }, [value]);

  const syncValue = useCallback(() => {
    onChange(editorRef.current?.innerHTML ?? "");
  }, [onChange]);

  const runCommand = useCallback(
    (command: string, commandValue?: string) => {
      editorRef.current?.focus();
      document.execCommand(command, false, commandValue);
      syncValue();
    },
    [syncValue],
  );

  const createLink = useCallback(() => {
    const url = window.prompt("Enter a link URL");

    if (!url) {
      return;
    }

    runCommand("createLink", url);
  }, [runCommand]);

  return (
    <div className={`rich-text-shell ${hasError ? "field-invalid" : ""}`}>
      <div className="rich-text-toolbar" aria-label="Description formatting">
        <button type="button" onClick={() => runCommand("formatBlock", "p")}>
          Paragraph
        </button>
        <button type="button" aria-label="Bold" onClick={() => runCommand("bold")}>
          B
        </button>
        <button
          type="button"
          aria-label="Italic"
          onClick={() => runCommand("italic")}
        >
          I
        </button>
        <button
          type="button"
          aria-label="Underline"
          onClick={() => runCommand("underline")}
        >
          U
        </button>
        <button
          type="button"
          aria-label="Bulleted list"
          onClick={() => runCommand("insertUnorderedList")}
        >
          List
        </button>
        <button
          type="button"
          aria-label="Numbered list"
          onClick={() => runCommand("insertOrderedList")}
        >
          1.
        </button>
        <button
          type="button"
          aria-label="Align left"
          onClick={() => runCommand("justifyLeft")}
        >
          Left
        </button>
        <button
          type="button"
          aria-label="Align center"
          onClick={() => runCommand("justifyCenter")}
        >
          Center
        </button>
        <button type="button" aria-label="Add link" onClick={createLink}>
          Link
        </button>
        <button
          type="button"
          aria-label="Clear formatting"
          onClick={() => runCommand("removeFormat")}
        >
          Clear
        </button>
      </div>
      <div
        ref={editorRef}
        className="rich-text-editor"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-invalid={hasError}
        data-placeholder="Add more details about this task..."
        onInput={syncValue}
        onBlur={onBlur}
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
          syncValue();
        }}
      />
    </div>
  );
}

export function CreateTaskPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [form, setForm] = useState<TaskFormState>({
    title: "",
    descriptionHtml: "",
    memberId: "",
    type: "FOLLOW_UP_MEMBER",
    priority: "MEDIUM",
    dueDate: nextDateValue(),
    dueTime: "09:00",
    assignToMe: true,
  });
  const [touched, setTouched] = useState<TouchedFields>({});
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void listMembers({})
        .then((memberRows) => {
          setMembers(memberRows);
          setForm((current) => ({
            ...current,
            memberId: current.memberId || memberRows[0]?.id || "",
          }));
        })
        .catch(() => setError("Could not load members for task creation."))
        .finally(() => setIsLoading(false));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const validation = useMemo(() => {
    const descriptionHtml = sanitizeTaskDescriptionHtml(form.descriptionHtml);
    const descriptionText = taskDescriptionText(descriptionHtml);
    const result = taskFormSchema.safeParse({
      ...form,
      descriptionHtml,
      descriptionText,
    });
    const errors: FieldErrors = {};

    if (!result.success) {
      for (const issue of result.error.issues) {
        const issueField = issue.path[0];
        const field =
          issueField === "descriptionText"
            ? "descriptionHtml"
            : (issueField as keyof TaskFormState | undefined);

        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
      }
    }

    if (form.memberId && !members.some((member) => member.id === form.memberId)) {
      errors.memberId = "Choose a member from the list.";
    }

    return { descriptionHtml, descriptionText, errors };
  }, [form, members]);

  const canSubmit =
    !isLoading && !isSubmitting && Object.keys(validation.errors).length === 0;

  const fieldError = (field: keyof TaskFormState) =>
    (submitted || touched[field]) ? validation.errors[field] : undefined;

  const updateForm = <Field extends keyof TaskFormState>(
    field: Field,
    value: TaskFormState[Field],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const markTouched = (field: keyof TaskFormState) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    if (!canSubmit) {
      setError("Fix the highlighted fields before creating this task.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await createTask({
        title: form.title.trim(),
        descriptionHtml: validation.descriptionHtml || undefined,
        memberId: form.memberId,
        type: form.type,
        priority: form.priority,
        dueDate: new Date(`${form.dueDate}T${form.dueTime}:00`).toISOString(),
        assignedToId: form.assignToMe ? user?.id : undefined,
      });
      navigate("/tasks");
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page create-task-page">
      <header className="page-header create-task-header">
        <div>
          <div className="breadcrumb">
            <Link to="/tasks">Tasks</Link>
            <span>/</span>
            <span>Create New Task</span>
          </div>
          <h1>Create New Task</h1>
          <p>Add a recovery task and assign ownership for the next action.</p>
        </div>
      </header>

      {isLoading ? (
        <section className="dashboard-state">
          <strong>Loading members</strong>
          <span>Preparing task details.</span>
        </section>
      ) : (
        <form className="create-task-layout" onSubmit={handleSubmit} noValidate>
          <section className="create-task-main">
            {error ? (
              <section className="dashboard-state dashboard-state-error compact-state">
                <strong>{error}</strong>
              </section>
            ) : null}

            <article className="task-form-card">
              <label>
                <span>
                  Task Title <b aria-hidden="true">*</b>
                </span>
                <input
                  value={form.title}
                  maxLength={150}
                  placeholder="Enter a clear and concise task title..."
                  aria-invalid={Boolean(fieldError("title"))}
                  onBlur={() => markTouched("title")}
                  onChange={(event) => updateForm("title", event.target.value)}
                  required
                />
                <small className="field-counter">{form.title.length}/150</small>
                {fieldError("title") ? (
                  <small className="field-error">{fieldError("title")}</small>
                ) : null}
              </label>

              <label>
                <span>Description</span>
                <RichTextEditor
                  value={form.descriptionHtml}
                  hasError={Boolean(fieldError("descriptionHtml"))}
                  onBlur={() => markTouched("descriptionHtml")}
                  onChange={(value) => updateForm("descriptionHtml", value)}
                />
                <small className="field-counter">
                  {validation.descriptionText.length}/2000
                </small>
                {fieldError("descriptionHtml") ? (
                  <small className="field-error">
                    {fieldError("descriptionHtml")}
                  </small>
                ) : null}
              </label>

              <div className="task-form-grid">
                <label>
                  <span>Task Type</span>
                  <select
                    value={form.type}
                    onChange={(event) =>
                      updateForm("type", event.target.value as TaskType)
                    }
                  >
                    {taskTypes.map((taskType) => (
                      <option key={taskType} value={taskType}>
                        {taskTypeLabels[taskType]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>
                    Priority <b aria-hidden="true">*</b>
                  </span>
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      updateForm("priority", event.target.value as TaskPriority)
                    }
                  >
                    {taskPriorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {taskPriorityLabels[priority]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>
                    Due Date <b aria-hidden="true">*</b>
                  </span>
                  <input
                    type="date"
                    value={form.dueDate}
                    aria-invalid={Boolean(fieldError("dueDate"))}
                    onBlur={() => markTouched("dueDate")}
                    onChange={(event) => updateForm("dueDate", event.target.value)}
                    required
                  />
                  {fieldError("dueDate") ? (
                    <small className="field-error">{fieldError("dueDate")}</small>
                  ) : null}
                </label>
                <label>
                  <span>
                    Due Time <b aria-hidden="true">*</b>
                  </span>
                  <input
                    type="time"
                    value={form.dueTime}
                    aria-invalid={Boolean(fieldError("dueTime"))}
                    onBlur={() => markTouched("dueTime")}
                    onChange={(event) => updateForm("dueTime", event.target.value)}
                    required
                  />
                  {fieldError("dueTime") ? (
                    <small className="field-error">{fieldError("dueTime")}</small>
                  ) : null}
                </label>
                <label className="wide-field">
                  <span>
                    Related To <b aria-hidden="true">*</b>
                  </span>
                  <select
                    value={form.memberId}
                    aria-invalid={Boolean(fieldError("memberId"))}
                    onBlur={() => markTouched("memberId")}
                    onChange={(event) => updateForm("memberId", event.target.value)}
                    required
                  >
                    <option value="">Choose a member</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {memberName(member)} · {member.phoneNumber}
                      </option>
                    ))}
                  </select>
                  {fieldError("memberId") ? (
                    <small className="field-error">{fieldError("memberId")}</small>
                  ) : null}
                </label>
              </div>
            </article>
          </section>

          <aside className="create-task-side">
            <article className="task-form-card">
              <h2>Assign To</h2>
              <label className="task-radio-label">
                <input
                  type="radio"
                  checked={form.assignToMe}
                  onChange={() => updateForm("assignToMe", true)}
                />
                <span>
                  <strong>Assign to me</strong>
                  <small>You will be responsible for this task</small>
                </span>
              </label>
              <label className="task-radio-label">
                <input
                  type="radio"
                  checked={!form.assignToMe}
                  onChange={() => updateForm("assignToMe", false)}
                />
                <span>
                  <strong>Unassigned</strong>
                  <small>Leave this task open for the team to claim</small>
                </span>
              </label>
            </article>

            <article className="task-form-card">
              <h2>Task Settings</h2>
              <div className="summary-stack">
                <span>Status</span>
                <strong>Open</strong>
                <span>Type</span>
                <strong>{taskTypeLabels[form.type]}</strong>
                <span>Priority</span>
                <strong>{taskPriorityLabels[form.priority]}</strong>
              </div>
            </article>

            <article className="important-note">
              <strong>About Tasks</strong>
              <p>{taskTypeDescriptions[form.type]}</p>
              <p>{taskPriorityDescriptions[form.priority]}</p>
            </article>
          </aside>

          <div className="create-task-actions">
            <Link to="/tasks" className="secondary-button">
              Cancel
            </Link>
            <button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
