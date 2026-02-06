import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { githubLight } from '@uiw/codemirror-theme-github';
import { getSettings } from '../db/schema';
import { getSong, updateSong } from '../services/firestore';
import { parseAndFormatChordPro, applyAllStyles } from '../lib/chordpro/renderUtils';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { debounce } from '../lib/utils/debounce';
import SongMetadataEditor from './SongMetadataEditor';
import type { Song } from '../types/song';

export default function SongEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);

  const isOnline = useOnlineStatus();

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [editorContent, setEditorContent] = useState('');
  const [metadata, setMetadata] = useState<Partial<Song>>({
    title: '',
    artist: '',
    language: undefined,
    difficulty: undefined,
    myLevel: undefined,
    priority: '',
    chordProStatus: undefined,
    editingNotes: '',
    learningResource: ''
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({ fontSize: 16, showChords: true });

  // Load song from Firestore
  useEffect(() => {
    if (!id) return;

    getSong(id)
      .then((loadedSong) => {
        setSong(loadedSong);
        if (loadedSong) {
          setEditorContent(loadedSong.chordProContent);
          setMetadata({
            title: loadedSong.title,
            artist: loadedSong.artist,
            language: loadedSong.language,
            difficulty: loadedSong.difficulty,
            myLevel: loadedSong.myLevel,
            priority: loadedSong.priority,
            chordProStatus: loadedSong.chordProStatus,
            editingNotes: loadedSong.editingNotes,
            learningResource: loadedSong.learningResource
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Load settings
  useEffect(() => {
    getSettings().then((s) => {
      setSettings({ fontSize: s.fontSize, showChords: s.showChords });
    });
  }, []);

  // Debounced preview update
  const debouncedUpdate = useMemo(
    () =>
      debounce((content: string) => {
        if (!previewRef.current) return;
        try {
          const formatted = parseAndFormatChordPro(content);
          previewRef.current.innerHTML = formatted;
          applyAllStyles(previewRef.current, settings.fontSize, settings.showChords);
        } catch (error) {
          previewRef.current.innerHTML = `<p class="text-red-600">Error rendering ChordPro: ${error instanceof Error ? error.message : 'Unknown error'}</p>`;
        }
      }, 300),
    [settings]
  );

  // Update preview when editor content changes
  useEffect(() => {
    debouncedUpdate(editorContent);
  }, [editorContent, debouncedUpdate]);

  // Save handler
  const handleSave = async () => {
    if (!isOnline) {
      alert('You must be online to save changes');
      return;
    }

    if (!id || !song) {
      alert('Song not found');
      return;
    }

    if (!metadata.title || metadata.title.trim() === '') {
      alert('Title is required');
      return;
    }

    setIsSaving(true);
    try {
      await updateSong(id, {
        chordProContent: editorContent,
        title: metadata.title || '',
        artist: metadata.artist,
        language: metadata.language,
        difficulty: metadata.difficulty,
        myLevel: metadata.myLevel,
        priority: metadata.priority,
        learningResource: metadata.learningResource,
        editingNotes: metadata.editingNotes,
        chordProStatus: metadata.chordProStatus
      });

      setHasUnsavedChanges(false);
      alert('Song saved successfully!');

      // Navigate back to song view
      navigate(`/song/${id}`);
    } catch (error) {
      alert(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle metadata changes
  const handleMetadataChange = (updates: Partial<Song>) => {
    setMetadata((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  // Handle editor changes
  const handleEditorChange = (value: string) => {
    setEditorContent(value);
    setHasUnsavedChanges(true);
  };

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">Song not found</p>
          <button
            onClick={() => navigate('/')}
            className="inline-block mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Back to Songs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Edit Song</h1>
            <p className="text-gray-600 mt-1">{song.title}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!isOnline || isSaving || !hasUnsavedChanges}
              className={`px-6 py-2 rounded-lg transition font-semibold ${
                !isOnline || isSaving || !hasUnsavedChanges
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
            </button>
            <button
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                    navigate(`/song/${id}`);
                  }
                } else {
                  navigate(`/song/${id}`);
                }
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Online/Offline Status */}
        {!isOnline && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mt-4">
            <p className="text-yellow-700">
              You are offline. Editing is disabled. Please connect to the internet to edit songs.
            </p>
          </div>
        )}
      </div>

      {/* Split-Pane Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: CodeMirror Editor */}
        <div className="flex flex-col">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">ChordPro Editor</h3>
            <CodeMirror
              value={editorContent}
              height="calc(100vh - 400px)"
              extensions={[markdown(), EditorView.lineWrapping]}
              onChange={handleEditorChange}
              editable={isOnline}
              readOnly={!isOnline}
              theme={githubLight}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightSpecialChars: true,
                foldGutter: true,
                drawSelection: true,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                rectangularSelection: true,
                crosshairCursor: true,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
                closeBracketsKeymap: true,
                searchKeymap: true,
                foldKeymap: true,
                completionKeymap: true,
                lintKeymap: true
              }}
            />
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="flex flex-col">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Live Preview</h3>
            <div
              ref={previewRef}
              className="overflow-auto bg-gray-50 p-4 border border-gray-200 rounded-lg chordpro-container"
              style={{ height: 'calc(100vh - 400px)' }}
            />
          </div>
        </div>
      </div>

      {/* Metadata Editor */}
      <SongMetadataEditor metadata={metadata} onChange={handleMetadataChange} />
    </div>
  );
}
