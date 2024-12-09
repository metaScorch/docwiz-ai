export default function ChangePreview({ originalText, newText, onAccept, onReject }) {
  const renderFormattedContent = (content) => {
    // If content is already HTML, render it directly
    if (/<[^>]*>/g.test(content)) {
      return (
        <div 
          dangerouslySetInnerHTML={{ __html: content }}
          className="prose prose-sm max-w-none [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4"
        />
      );
    }
    
    // If plain text with newlines, convert to HTML with proper formatting
    if (content.includes('\n')) {
      const htmlContent = content
        .split('\n')
        .map(line => {
          if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
            return `<li>${line.trim().substring(1).trim()}</li>`;
          }
          return `<p>${line}</p>`;
        })
        .join('');
      
      return (
        <div 
          dangerouslySetInnerHTML={{ __html: htmlContent }}
          className="prose prose-sm max-w-none [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4"
        />
      );
    }
    
    // Plain text without formatting
    return <p>{content}</p>;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-3xl w-full mx-4 space-y-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold">Review Changes</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500">Original Text:</h4>
            <div className="p-3 bg-red-50 dark:bg-red-900/20">
              <div className="text-red-700 dark:text-red-300">
                {renderFormattedContent(originalText)}
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">New Text:</h4>
            <div className="p-3 bg-green-50 dark:bg-green-900/20">
              <div className="text-green-700 dark:text-green-300">
                {renderFormattedContent(newText)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onReject}
            className="px-4 py-2 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Reject
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
