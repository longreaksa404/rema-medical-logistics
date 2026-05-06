import { DashboardLayout } from '../components/DashboardLayout';

interface PlaceholderProps {
  title: string;
  chat: string;
  description: string;
}

function Placeholder({ title, chat, description }: PlaceholderProps) {
  return (
    <DashboardLayout title={title}>
      <div className="max-w-lg">
        <div className="card p-8 text-center">
          <p className="font-mono text-4xl text-text-muted mb-4">⬡</p>
          <h2 className="font-sans font-bold text-text-primary text-xl mb-2">{title}</h2>
          <p className="font-mono text-xs text-text-muted mb-4">{description}</p>
          <span className="inline-block font-mono text-[10px] text-accent-blue bg-accent-blue/10 px-3 py-1.5 rounded border border-accent-blue/20">
            Coming in {chat}
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function UsersPage() {
  return (
    <Placeholder
      title="User Management"
      chat="Chat 14"
      description="Create, deactivate, and reset passwords for system users."
    />
  );
}