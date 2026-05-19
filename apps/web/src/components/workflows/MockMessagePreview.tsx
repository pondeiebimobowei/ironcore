export function MockMessagePreview({ message }: { message: string }) {
  return (
    <div className="mock-message-preview">
      <span>Mock WhatsApp</span>
      <p>{message.replaceAll("{{firstName}}", "Ada")}</p>
    </div>
  );
}
