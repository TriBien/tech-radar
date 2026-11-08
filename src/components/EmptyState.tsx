import type { ReactNode } from "react";
import { RadarIcon } from "./Icons";

interface EmptyStateProps {
  title: string;
  children?: ReactNode;
  code?: string;
}

export function EmptyState({ title, children, code }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <RadarIcon size={30} />
      </div>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {code && <code className="empty-code">{code}</code>}
    </div>
  );
}
