import { useState } from 'react';
import { getAllSongs } from '../services/firestore';

export default function DataExport() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Export from Firebase (current data)
      const songs = await getAllSongs();

      // Convert to Salesforce format for consistency
      const salesforceFormat = {
        records: songs.map((song, index) => ({
          attributes: {
            type: 'song__c',
            referenceId: `song__cRef${index + 1}`
          },
          Song__c: song.title,
          Artist__c: song.artist || null,
          Language__c: song.language || null,
          ChordPro_Content__c: song.chordProContent,
          Priority__c: song.priority || null,
          My_Level__c: song.myLevel || null,
          Difficulty__c: song.difficulty || null,
          ChordPro_Status__c: song.chordProStatus || null,
          Editing_Notes__c: song.editingNotes || null,
          Learning_resource__c: song.learningResource || null
        }))
      };

      const jsonData = JSON.stringify(salesforceFormat, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `pulsar_songs_${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);
      alert('Songs exported successfully from Firebase!');
    } catch (error) {
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Export Data</h2>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Export to JSON</h3>
          <p className="text-gray-600 mb-4">
            Export all songs from Firebase to a JSON file. This file can be:
          </p>
          <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
            <li>Committed to git for backup</li>
            <li>Shared with other users</li>
            <li>Re-imported to Salesforce using CLI tools (optional)</li>
          </ul>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`px-6 py-3 rounded-lg transition font-semibold ${
              isExporting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {isExporting ? 'Exporting...' : 'Export Songs to JSON'}
          </button>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Git Backup Workflow</h3>
          <ol className="list-decimal list-inside text-gray-600 space-y-2">
            <li>Click "Export Songs to JSON" above</li>
            <li>Copy the downloaded file to your repository's <code className="bg-gray-100 px-2 py-1 rounded">public/</code> directory</li>
            <li>Commit and push to git:
              <pre className="bg-gray-100 p-3 rounded mt-2 text-sm overflow-x-auto">
{`git add public/song__c_*.json
git commit -m "Update songs: [description]"
git push`}
              </pre>
            </li>
          </ol>
        </div>
      </div>
    </div>
    </div>
  );
}
