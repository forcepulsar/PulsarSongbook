import { type Song } from '../types/song';
import SimpleHTMLEditor from './SimpleHTMLEditor';

interface SongMetadataEditorProps {
  metadata: Partial<Song>;
  onChange: (updates: Partial<Song>) => void;
}

export default function SongMetadataEditor({ metadata, onChange }: SongMetadataEditorProps) {
  const handleChange = (field: keyof Song, value: string | undefined) => {
    // Pass the value as-is (including empty strings)
    // The firestore service will convert empty strings to null for optional fields
    onChange({ [field]: value });
  };

  // Valid values for dropdowns
  const validMyLevels = ['Want to Learn', 'Know basics', 'Need refresher', 'In Progress', 'Play Well'];
  const validDifficulties = ['Easy', 'Medium', 'Hard', 'Very Hard'];
  const validStatuses = ['To Do', 'In Progress', 'Done'];

  // Normalize values - if invalid, use empty string
  const normalizedMyLevel = metadata.myLevel && validMyLevels.includes(metadata.myLevel)
    ? metadata.myLevel
    : '';
  const normalizedDifficulty = metadata.difficulty && validDifficulties.includes(metadata.difficulty)
    ? metadata.difficulty
    : '';
  const normalizedStatus = metadata.chordProStatus && validStatuses.includes(metadata.chordProStatus)
    ? metadata.chordProStatus
    : '';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Song Metadata</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={metadata.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            placeholder="Enter song title"
            required
          />
        </div>

        {/* Artist */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Artist
          </label>
          <input
            type="text"
            value={metadata.artist || ''}
            onChange={(e) => handleChange('artist', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            placeholder="Artist name"
          />
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Language
          </label>
          <select
            value={metadata.language || ''}
            onChange={(e) => handleChange('language', e.target.value as 'English' | 'Spanish' || undefined)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          >
            <option value="">Select language</option>
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Difficulty
            {metadata.difficulty && !validDifficulties.includes(metadata.difficulty) && (
              <span className="ml-2 text-xs text-orange-600">(Invalid value: "{metadata.difficulty}" - please select a new value)</span>
            )}
          </label>
          <select
            value={normalizedDifficulty}
            onChange={(e) => handleChange('difficulty', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          >
            <option value="">Select difficulty</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
            <option value="Very Hard">Very Hard</option>
          </select>
        </div>

        {/* My Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            My Level
            {metadata.myLevel && !validMyLevels.includes(metadata.myLevel) && (
              <span className="ml-2 text-xs text-orange-600">(Invalid value: "{metadata.myLevel}" - please select a new value)</span>
            )}
          </label>
          <select
            value={normalizedMyLevel}
            onChange={(e) => handleChange('myLevel', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          >
            <option value="">Select level</option>
            <option value="Want to Learn">Want to Learn</option>
            <option value="Know basics">Know basics</option>
            <option value="Need refresher">Need refresher</option>
            <option value="In Progress">In Progress</option>
            <option value="Play Well">Play Well</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <input
            type="text"
            value={metadata.priority || ''}
            onChange={(e) => handleChange('priority', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            placeholder="e.g., High, Medium, Low"
          />
        </div>

        {/* ChordPro Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ChordPro Status
          </label>
          <select
            value={normalizedStatus}
            onChange={(e) => handleChange('chordProStatus', e.target.value as 'To Do' | 'In Progress' | 'Done' || undefined)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          >
            <option value="">Select status</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
        </div>

        {/* Editing Notes */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Editing Notes
          </label>
          <textarea
            value={metadata.editingNotes || ''}
            onChange={(e) => handleChange('editingNotes', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            rows={3}
            placeholder="Notes about editing this song..."
          />
        </div>

        {/* Learning Resource */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Learning Resource
          </label>
          <SimpleHTMLEditor
            value={metadata.learningResource || ''}
            onChange={(value) => handleChange('learningResource', value)}
            placeholder="Add links to tutorial videos, chord diagrams, or other learning resources..."
          />
        </div>
      </div>
    </div>
  );
}
