import { z } from "zod";
import type { TaskPriority, TaskType } from "../../features/tasks/types";

export const taskTypeLabels: Record<TaskType, string> = {
  VERIFY_PAYMENT: "Verify payment",
  FOLLOW_UP_MEMBER: "Follow up with member",
  RESOLVE_OVERDUE_STATUS: "Resolve overdue status",
  REVIEW_AT_RISK_MEMBER: "Review at-risk member",
  REACTIVATION: "Start reactivation",
};

export const taskTypeDescriptions: Record<TaskType, string> = {
  VERIFY_PAYMENT: "Review submitted proof and verify recovered revenue.",
  FOLLOW_UP_MEMBER: "Contact the member and unblock the recovery step.",
  RESOLVE_OVERDUE_STATUS: "Confirm renewal intent or recover the overdue amount.",
  REVIEW_AT_RISK_MEMBER: "Prioritize this member before the account churns.",
  REACTIVATION: "Attempt a win-back conversation for this churned member.",
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const taskPriorityDescriptions: Record<TaskPriority, string> = {
  LOW: "Useful follow-up, not blocking revenue today.",
  MEDIUM: "Important work that should be handled soon.",
  HIGH: "Revenue-blocking or overdue work that needs attention.",
};

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title is required.")
    .max(150, "Task title must be 150 characters or fewer."),
  descriptionHtml: z.string().optional(),
  descriptionText: z
    .string()
    .max(2000, "Description must be 2,000 characters or fewer."),
  memberId: z.string().trim().min(1, "Choose the related member."),
  type: z.enum([
    "VERIFY_PAYMENT",
    "FOLLOW_UP_MEMBER",
    "RESOLVE_OVERDUE_STATUS",
    "REVIEW_AT_RISK_MEMBER",
    "REACTIVATION",
  ]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  dueDate: z.string().trim().min(1, "Due date is required."),
  dueTime: z.string().trim().min(1, "Due time is required."),
  assignToMe: z.boolean(),
});

export type TaskFormInput = z.infer<typeof taskFormSchema>;

export function sanitizeTaskDescriptionHtml(html: string) {
  if (!html.trim()) {
    return "";
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  const allowedTags = new Set([
    "P",
    "BR",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "UL",
    "OL",
    "LI",
    "A",
  ]);

  document
    .querySelectorAll("script,style,iframe,object,embed")
    .forEach((element) => element.remove());

  const cleanNode = (node: Node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement;

        if (!allowedTags.has(element.tagName)) {
          cleanNode(element);
          element.replaceWith(...element.childNodes);
          return;
        }

        [...element.attributes].forEach((attribute) => {
          const isSafeHref =
            element.tagName === "A" &&
            attribute.name === "href" &&
            /^(https?:|mailto:|tel:)/i.test(attribute.value);

          if (!isSafeHref) {
            element.removeAttribute(attribute.name);
          }
        });

        if (element.tagName === "A" && element.hasAttribute("href")) {
          element.setAttribute("target", "_blank");
          element.setAttribute("rel", "noreferrer");
        }
      }

      cleanNode(child);
    });
  };

  cleanNode(document.body);

  return document.body.textContent?.trim() ? document.body.innerHTML.trim() : "";
}

export function taskDescriptionText(html: string) {
  if (!html.trim()) {
    return "";
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

  return (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
}
