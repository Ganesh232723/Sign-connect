export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface LandmarkFrame {
  timestamp: number;
  hands: LandmarkPoint[][]; // Array of hands, each containing 21 points
  pose: LandmarkPoint[];     // 33 points
  face: LandmarkPoint[];     // 478 points
}

export interface PartialCaption {
  type: 'partial_caption';
  text: string;
  confidence: number;
}

export interface FinalCaption {
  type: 'final_caption';
  text: string;
  lang: string;
  audio_url?: string;
  translations?: Record<string, string>;
  emotion?: 'neutral' | 'question' | 'urgent' | 'happy';
  confidence: number;
}

export interface EmergencyAlert {
  type: 'emergency_alert';
  phrase: string;
  confidence: number;
}

export type WSMessage = PartialCaption | FinalCaption | EmergencyAlert;
