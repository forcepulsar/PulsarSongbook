import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Downgraded from error to warning, deliberately, so `npm run lint` can
      // gate CI (see build:cf) without rewriting working UI code first.
      //
      // This rule is newer than the code it flags. It fires on four
      // pre-existing "sync state in an effect" sites: AuthContext (setLoading
      // in a catch), SongList (URL param -> state), GlobalSearch (derived
      // filtering), SongEdit (prefill from location.state). All four work; all
      // four would want restructuring into derived state or useMemo, which is
      // real refactoring of live behaviour that the 43 modern-app tests only
      // partly cover.
      //
      // Kept visible as warnings rather than switched off, and tracked as an
      // issue. Do NOT add new violations - fix them at the point of writing.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // A context file exporting its own hook alongside its provider is the
    // standard React pattern, and this rule is a dev-only Fast Refresh
    // nicety rather than a correctness check. Splitting useAuth/useTheme into
    // separate modules would churn imports across the app for no runtime gain.
    files: ['src/contexts/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
