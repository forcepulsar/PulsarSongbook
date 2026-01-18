export interface Song {
  id: string;
  title: string;
  artist?: string;
  language?: 'English' | 'Spanish';
  chordProContent: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  myLevel?: 'Want to Learn' | 'Know basics' | 'Need refresher' | 'In Progress' | 'Play Well';
  priority?: string;
  learningResource?: string;
  editingNotes?: string;
  chordProStatus?: 'To Do' | 'In Progress' | 'Done';
  createdAt: Date;
  updatedAt: Date;
  syncStatus?: 'synced' | 'pending' | 'conflict';
}

export interface AppSettings {
  id: number;
  fontSize: number;          // 10-30px
  scrollSpeed: number;       // 0.1-3.0
  showChords: boolean;
  theme: 'light' | 'dark';
  apiUrl?: string;           // Backend URL
  authToken?: string;        // JWT token
}

export interface SyncQueueItem {
  id: string;
  songId: string;
  action: 'create' | 'update' | 'delete';
  timestamp: Date;
  data?: Partial<Song>;
}

// Salesforce export format (for import utility)
export interface SalesforceSongExport {
  records: Array<{
    attributes: {
      type: string;
      referenceId: string;
    };
    Song__c?: string;
    Artist__c?: string;
    Language__c?: string;
    ChordPro_Content__c?: string;
    Difficulty__c?: string;
    My_Level__c?: string;
    Priority__c?: string;
    Learning_resource__c?: string;
    Editing_Notes__c?: string;
    ChordPro_Status__c?: string;
  }>;
}
