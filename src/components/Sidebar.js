export default function Sidebar({ documentValues, onValueChange }) {
  return (
    <div className="w-80 border-l p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Document Fields</h2>
      <div className="space-y-4">
        {Object.entries(documentValues).map(([key, value]) => (
          <div key={key} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {key.replace(/([A-Z])/g, " $1").trim()}{" "}
              {/* Format camelCase to words */}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => onValueChange(key, e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Enter ${key.toLowerCase()}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
