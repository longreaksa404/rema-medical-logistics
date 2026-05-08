export default function StakeholderPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Stakeholder Coordination Flowchart
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Phase 0 → Phase 1 (Hours 0–24) → Phase 2 (Hours 24–48+) · 6 actor groups · All coordination failure protocols
      </p>
      <div className="bg-white rounded-lg border border-gray-200 overflow-auto">
        <img
          src="/visuals/REMA-stakeholder-flowchart.drawio.png"
          alt="REMA Stakeholder Coordination Flowchart"
          className="w-full h-auto"
          style={{ minWidth: '1200px' }}
        />
      </div>
    </div>
  );
}