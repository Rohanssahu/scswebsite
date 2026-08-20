// Types for Buddy's full-body animated character system.
// Layers are kept separate (emotion / physical action / home / speech) so a
// facial emotion can never cancel a walk cycle and vice versa — the
// useBuddyAnimation reducer is the only place they are combined.

/** Facial emotion layer — drives eyes, eyebrows and mouth only. */
export type BuddyEmotion =
  | 'neutral'
  | 'happy'
  | 'smiling'
  | 'laughing'
  | 'funny'
  | 'surprised'
  | 'confused'
  | 'serious'
  | 'concerned'
  | 'angry'
  | 'sad'
  | 'sleepy';

/** Every named animation state the character supports. */
export type BuddyAnimationState =
  | 'idle'
  | 'welcoming'
  | 'waving'
  | 'speaking'
  | 'listening'
  | 'thinking'
  | 'pointingLeft'
  | 'pointingRight'
  | 'pointingUp'
  | 'pointingDown'
  | 'explaining'
  | 'celebrating'
  | 'happy'
  | 'smiling'
  | 'laughing'
  | 'funny'
  | 'surprised'
  | 'confused'
  | 'serious'
  | 'concerned'
  | 'angry'
  | 'sad'
  | 'waiting'
  | 'nodding'
  | 'sleepy'
  | 'walking'
  | 'goingHome'
  | 'insideHome'
  | 'knockingResponse'
  | 'returning'
  | 'success'
  | 'error';

/** Renderable hand shapes. Each hand is posed independently. */
export type HandShape = 'relaxed' | 'open' | 'point' | 'thumbsUp' | 'fist' | 'flat';

/** A single rotation value, or a repeating keyframe cycle. */
export type PoseValue = number | number[];

export interface HandPose {
  shape: HandShape;
  rotate: PoseValue;
}

export interface LimbPose {
  rotate: PoseValue;
}

/** Face parameters in head-local SVG units. */
export interface FacePose {
  /** Eyebrow lift; negative raises the brows. */
  browY: number;
  browRotateLeft: number;
  browRotateRight: number;
  /** Eye openness as a scaleY factor (1 = open, ~0.15 = nearly closed). */
  eyeOpen: number;
  /** Mouth curve; positive = smile, negative = frown. */
  mouthCurve: number;
  /** Open-mouth amount 0..1 (laughing, surprised, speaking). */
  mouthOpen: number;
  mouthWidth: number;
}

export interface BuddyPose {
  face: FacePose;
  head: { rotate: PoseValue; y: PoseValue };
  body: { rotate: PoseValue; y: PoseValue };
  leftArm: LimbPose;
  rightArm: LimbPose;
  leftHand: HandPose;
  rightHand: HandPose;
  leftLeg: LimbPose;
  rightLeg: LimbPose;
  /** Seconds for one keyframe cycle (repeating poses). */
  cycle: number;
  /** Animate the mouth in a talking loop. */
  talking?: boolean;
  /** Keep this pose's own face even when an emotion overlay is active. */
  faceLocked?: boolean;
}

/** Where Buddy is relative to its home (physical/home layer). */
export type BuddyHomePhase =
  | 'outside'
  | 'goodbye'
  | 'turning'
  | 'walkingHome'
  | 'entering'
  | 'inside'
  | 'knocking'
  | 'peeking'
  | 'walkingBack'
  | 'greeting';

/** Conversation events Buddy reacts to visually. */
export type BuddyReactionEvent =
  | 'welcome'
  | 'welcome-back'
  | 'service-selected'
  | 'answered'
  | 'step-complete'
  | 'requirement-complete'
  | 'unknown'
  | 'warning'
  | 'form-error'
  | 'submit-success'
  | 'joke'
  | 'waiting';

export interface BuddyReaction {
  state: BuddyAnimationState;
  emotion: BuddyEmotion;
  durationMs: number;
}

/** Versioned persisted preferences — invalid saved data resets to defaults. */
export interface BuddyPrefsV1 {
  version: 1;
  insideHome: boolean;
  animationsPaused: boolean;
  reduceMotion: boolean;
  soundsEnabled: boolean;
}
