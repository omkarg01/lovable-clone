export interface ProjectStructure {
  files: {
    [filePath: string]: string;
  };
}

export interface ProjectFile {
  path: string;
  content: string;
  type: 'file' | 'directory';
}
