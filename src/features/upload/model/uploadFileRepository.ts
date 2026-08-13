const filesBySessionId = new Map<string, File>();

export function saveUploadFile(sessionId: string, file: File) {
  filesBySessionId.clear();
  filesBySessionId.set(sessionId, file);
}

export function getUploadFile(sessionId: string) {
  return filesBySessionId.get(sessionId) ?? null;
}

export function clearUploadFiles() {
  filesBySessionId.clear();
}
