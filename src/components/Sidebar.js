export default function Sidebar({ placeholders, onPlaceholderChange }) {
  return (
    <div className="w-80 border-l p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Document Fields</h2>
      <div className="space-y-4">
        {placeholders.map((placeholder, index) => (
          <div key={index} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {placeholder.label}
            </label>
            <input
              type="text"
              value={placeholder.value}
              onChange={(e) => onPlaceholderChange(placeholder.key, e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Enter ${placeholder.label.toLowerCase()}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
