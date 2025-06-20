export interface PhotoMetadata {
  id: string;
  entityType: 'visitor' | 'user' | 'badge';
  entityId: string;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface IPhotoService {
  // Upload and storage
  saveVisitorPhoto(visitorId: string, photoBase64: string): Promise<string>;
  saveUserPhoto(userId: string, photoBase64: string): Promise<string>;
  saveBadgePhoto(badgeId: string, photoBase64: string): Promise<string>;
  
  // Retrieval
  getPhoto(photoId: string): Promise<Buffer>;
  getPhotoUrl(photoId: string, expireMinutes?: number): Promise<string>;
  getPhotoMetadata(photoId: string): Promise<PhotoMetadata>;
  
  // Manipulation
  generateThumbnail(photoId: string, width: number, height: number): Promise<string>;
  cropPhoto(photoId: string, x: number, y: number, width: number, height: number): Promise<string>;
  
  // Management
  deletePhoto(photoId: string): Promise<void>;
  deletePhotosByEntity(entityType: string, entityId: string): Promise<void>;
  
  // Validation
  validatePhoto(photoBase64: string): Promise<{
    valid: boolean;
    mimeType?: string;
    size?: number;
    dimensions?: { width: number; height: number };
    errors?: string[];
  }>;
}