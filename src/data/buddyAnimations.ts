import { BUDDY_SPRING } from '@/data/buddyTiming';
import {
  BuddyAnimationState,
  BuddyEmotion,
  BuddyPose,
  FacePose,
  PoseValue,
} from '@/types/buddy';

// Pose library for Buddy's full-body character.
//
// Coordinate model (SVG viewBox 0 0 120 150, y grows downward):
// - Limb rotations are degrees around each pivot (shoulder/hip/neck).
// - 0deg = limb hanging straight down. Positive rotation swings a limb
//   toward screen-left, negative toward screen-right. So the LEFT arm
//   raises outward with positive values, the RIGHT arm with negative
//   values, and either arm reaches inward across the body with the
//   opposite sign (e.g. right hand on chin ≈ +140).
// - A number is a resting target (animated with a spring); a number[] is a
//   repeating keyframe cycle lasting `pose.cycle` seconds. Cycles start and
//   end on the same value so loops never jump.

export const NEUTRAL_FACE: FacePose = {
  browY: 0,
  browRotateLeft: 0,
  browRotateRight: 0,
  eyeOpen: 1,
  mouthCurve: 4,
  mouthOpen: 0,
  mouthWidth: 16,
};

export const FACE_PRESETS: Record<BuddyEmotion, FacePose> = {
  neutral: NEUTRAL_FACE,
  happy: { browY: -2, browRotateLeft: 0, browRotateRight: 0, eyeOpen: 1.05, mouthCurve: 7, mouthOpen: 0.45, mouthWidth: 18 },
  smiling: { browY: -1, browRotateLeft: 0, browRotateRight: 0, eyeOpen: 1, mouthCurve: 6, mouthOpen: 0, mouthWidth: 17 },
  laughing: { browY: -2, browRotateLeft: 0, browRotateRight: 0, eyeOpen: 0.25, mouthCurve: 7, mouthOpen: 0.85, mouthWidth: 18 },
  funny: { browY: -1, browRotateLeft: -14, browRotateRight: 4, eyeOpen: 0.9, mouthCurve: 5, mouthOpen: 0, mouthWidth: 13 },
  surprised: { browY: -4, browRotateLeft: 0, browRotateRight: 0, eyeOpen: 1.25, mouthCurve: 1, mouthOpen: 0.9, mouthWidth: 11 },
  confused: { browY: -1, browRotateLeft: -16, browRotateRight: 6, eyeOpen: 1, mouthCurve: -1, mouthOpen: 0.1, mouthWidth: 12 },
  serious: { browY: 1, browRotateLeft: 6, browRotateRight: -6, eyeOpen: 0.85, mouthCurve: 0, mouthOpen: 0, mouthWidth: 14 },
  concerned: { browY: 1.5, browRotateLeft: -10, browRotateRight: 10, eyeOpen: 0.9, mouthCurve: -3, mouthOpen: 0, mouthWidth: 14 },
  angry: { browY: 2, browRotateLeft: 14, browRotateRight: -14, eyeOpen: 0.8, mouthCurve: -5, mouthOpen: 0, mouthWidth: 14 },
  sad: { browY: 1, browRotateLeft: -10, browRotateRight: 10, eyeOpen: 0.8, mouthCurve: -6, mouthOpen: 0, mouthWidth: 14 },
  sleepy: { browY: 1, browRotateLeft: 0, browRotateRight: 0, eyeOpen: 0.2, mouthCurve: 2, mouthOpen: 0.15, mouthWidth: 12 },
};

const REST: BuddyPose = {
  face: NEUTRAL_FACE,
  head: { rotate: 0, y: 0 },
  body: { rotate: 0, y: 0 },
  leftArm: { rotate: 6 },
  rightArm: { rotate: -6 },
  leftHand: { shape: 'relaxed', rotate: 0 },
  rightHand: { shape: 'relaxed', rotate: 0 },
  leftLeg: { rotate: 0 },
  rightLeg: { rotate: 0 },
  cycle: 4,
};

function pose(overrides: Partial<BuddyPose>): BuddyPose {
  return { ...REST, ...overrides, face: overrides.face ?? REST.face };
}

const WALK: Partial<BuddyPose> = {
  // Alternating legs, opposite arm swing, small body bounce.
  leftLeg: { rotate: [24, -24, 24] },
  rightLeg: { rotate: [-24, 24, -24] },
  leftArm: { rotate: [-16, 16, -16] },
  rightArm: { rotate: [16, -16, 16] },
  body: { rotate: 0, y: [0, -2.2, 0, -2.2, 0] },
  head: { rotate: 0, y: [0, -1, 0, -1, 0] },
  cycle: 0.55,
};

const HANDS_ON_WAIST: Partial<BuddyPose> = {
  leftArm: { rotate: -11 },
  rightArm: { rotate: 11 },
  leftHand: { shape: 'fist', rotate: 0 },
  rightHand: { shape: 'fist', rotate: 0 },
};

export const BUDDY_POSES: Record<BuddyAnimationState, BuddyPose> = {
  idle: pose({
    // Natural breathing lives on the body group; this adds weight shifting.
    body: { rotate: [0.8, -0.8, 0.8], y: 0 },
    leftLeg: { rotate: [1.2, -1.2, 1.2] },
    rightLeg: { rotate: [-1.2, 1.2, -1.2] },
    leftArm: { rotate: [6, 4, 6] },
    rightArm: { rotate: [-6, -4, -6] },
    head: { rotate: 0, y: [0, -0.6, 0] },
    cycle: 4.8,
  }),
  welcoming: pose({
    rightArm: { rotate: [-150, -115, -160, -115, -150] },
    rightHand: { shape: 'open', rotate: [0, 18, -14, 18, 0] },
    leftArm: { rotate: 10 },
    head: { rotate: [-3, -5, -3], y: 0 },
    body: { rotate: 0, y: [0, -1.5, 0] },
    face: FACE_PRESETS.happy,
    faceLocked: true,
    cycle: 1.5,
  }),
  waving: pose({
    rightArm: { rotate: [-150, -118, -158, -118, -150] },
    rightHand: { shape: 'open', rotate: [0, 16, -12, 16, 0] },
    leftArm: { rotate: 8 },
    head: { rotate: -3, y: 0 },
    // Face stays overridable so the goodbye wave can carry a funny/friendly
    // expression while the same pose waves hello elsewhere.
    face: FACE_PRESETS.smiling,
    cycle: 1.4,
  }),
  speaking: pose({
    leftArm: { rotate: [18, 30, 18] },
    rightArm: { rotate: [-22, -38, -22] },
    leftHand: { shape: 'open', rotate: 0 },
    rightHand: { shape: 'open', rotate: 0 },
    head: { rotate: 0, y: [0, -1, 0] },
    face: { ...NEUTRAL_FACE, mouthCurve: 5 },
    talking: true,
    cycle: 2,
  }),
  listening: pose({
    // Right hand cupped near the ear, head tilted toward it.
    rightArm: { rotate: -170 },
    rightHand: { shape: 'flat', rotate: -20 },
    leftArm: { rotate: 8 },
    head: { rotate: -6, y: 0 },
    body: { rotate: [0, 1, 0], y: 0 },
    face: { ...NEUTRAL_FACE, eyeOpen: 1.1, mouthCurve: 3 },
    cycle: 3,
  }),
  thinking: pose({
    // Right hand on chin.
    rightArm: { rotate: 140 },
    rightHand: { shape: 'fist', rotate: 0 },
    leftArm: { rotate: -12 },
    head: { rotate: [5, 7, 5], y: 0 },
    face: { ...NEUTRAL_FACE, browRotateLeft: -10, mouthCurve: 1, mouthWidth: 12 },
    cycle: 2.4,
  }),
  pointingLeft: pose({
    leftArm: { rotate: [88, 94, 88] },
    leftHand: { shape: 'point', rotate: 0 },
    rightArm: { rotate: -8 },
    head: { rotate: 3, y: 0 },
    face: { ...NEUTRAL_FACE, mouthCurve: 5 },
    cycle: 1.6,
  }),
  pointingRight: pose({
    rightArm: { rotate: [-88, -94, -88] },
    rightHand: { shape: 'point', rotate: 0 },
    leftArm: { rotate: 8 },
    head: { rotate: -3, y: 0 },
    face: { ...NEUTRAL_FACE, mouthCurve: 5 },
    cycle: 1.6,
  }),
  pointingUp: pose({
    rightArm: { rotate: [-172, -178, -172] },
    rightHand: { shape: 'point', rotate: 0 },
    leftArm: { rotate: 8 },
    head: { rotate: -2, y: -1 },
    face: { ...NEUTRAL_FACE, browY: -2, mouthCurve: 5 },
    cycle: 1.8,
  }),
  pointingDown: pose({
    rightArm: { rotate: [-28, -22, -28] },
    rightHand: { shape: 'point', rotate: 0 },
    leftArm: { rotate: 8 },
    head: { rotate: 4, y: 0 },
    face: { ...NEUTRAL_FACE, mouthCurve: 4 },
    cycle: 1.8,
  }),
  explaining: pose({
    // Open palms toward the visitor.
    leftArm: { rotate: [45, 58, 45] },
    rightArm: { rotate: [-45, -58, -45] },
    leftHand: { shape: 'open', rotate: 0 },
    rightHand: { shape: 'open', rotate: 0 },
    head: { rotate: 0, y: [0, -0.8, 0] },
    face: { ...NEUTRAL_FACE, mouthCurve: 3 },
    cycle: 2.2,
  }),
  celebrating: pose({
    // Cheer with both arms up plus small happy jumps.
    leftArm: { rotate: [155, 172, 155] },
    rightArm: { rotate: [-155, -172, -155] },
    leftHand: { shape: 'open', rotate: 0 },
    rightHand: { shape: 'open', rotate: 0 },
    body: { rotate: 0, y: [0, -6, 0] },
    head: { rotate: 0, y: [0, -2, 0] },
    leftLeg: { rotate: [4, -4, 4] },
    rightLeg: { rotate: [-4, 4, -4] },
    face: FACE_PRESETS.happy,
    faceLocked: true,
    cycle: 0.9,
  }),
  happy: pose({
    leftArm: { rotate: [25, 35, 25] },
    rightArm: { rotate: [-25, -35, -25] },
    leftHand: { shape: 'open', rotate: 0 },
    rightHand: { shape: 'open', rotate: 0 },
    body: { rotate: 0, y: [0, -3, 0] },
    face: FACE_PRESETS.happy,
    faceLocked: true,
    cycle: 1.2,
  }),
  smiling: pose({
    body: { rotate: [0.5, -0.5, 0.5], y: 0 },
    face: FACE_PRESETS.smiling,
    faceLocked: true,
    cycle: 4,
  }),
  laughing: pose({
    // Right hand covers the mouth, left hand holds the belly, body shakes.
    rightArm: { rotate: 145 },
    rightHand: { shape: 'flat', rotate: 10 },
    leftArm: { rotate: -25 },
    leftHand: { shape: 'flat', rotate: 0 },
    body: { rotate: [-1.5, 1.5, -1.5], y: 0 },
    head: { rotate: 0, y: [0, 1, 0] },
    face: FACE_PRESETS.laughing,
    faceLocked: true,
    cycle: 0.5,
  }),
  funny: pose({
    // Hands on waist, playful smirk, short foot tap.
    ...HANDS_ON_WAIST,
    body: { rotate: 1, y: 0 },
    rightLeg: { rotate: [0, 8, 0, 8, 0] },
    head: { rotate: -3, y: 0 },
    face: FACE_PRESETS.funny,
    faceLocked: true,
    cycle: 1.6,
  }),
  surprised: pose({
    leftArm: { rotate: 40 },
    rightArm: { rotate: -40 },
    leftHand: { shape: 'open', rotate: 0 },
    rightHand: { shape: 'open', rotate: 0 },
    body: { rotate: -2, y: 0 },
    head: { rotate: -2, y: -2 },
    face: FACE_PRESETS.surprised,
    faceLocked: true,
    cycle: 2,
  }),
  confused: pose({
    // Shrug with palms up plus a head tilt.
    leftArm: { rotate: 55 },
    rightArm: { rotate: -55 },
    leftHand: { shape: 'open', rotate: -90 },
    rightHand: { shape: 'open', rotate: 90 },
    body: { rotate: 0, y: -1 },
    head: { rotate: 9, y: 0 },
    face: FACE_PRESETS.confused,
    faceLocked: true,
    cycle: 2.6,
  }),
  serious: pose({
    // Professional explaining gesture, reduced body movement.
    rightArm: { rotate: -35 },
    rightHand: { shape: 'flat', rotate: 0 },
    leftArm: { rotate: 5 },
    face: FACE_PRESETS.serious,
    faceLocked: true,
    cycle: 4,
  }),
  concerned: pose({
    rightArm: { rotate: -45 },
    rightHand: { shape: 'open', rotate: 0 },
    leftArm: { rotate: 6 },
    head: { rotate: 6, y: 0 },
    body: { rotate: [0, 0.5, 0], y: 0 },
    face: FACE_PRESETS.concerned,
    faceLocked: true,
    cycle: 3.4,
  }),
  angry: pose({
    // Playful frustration only: hands on waist + short foot tap.
    ...HANDS_ON_WAIST,
    rightLeg: { rotate: [0, 10, 0, 10, 0] },
    head: { rotate: -2, y: 0 },
    face: FACE_PRESETS.angry,
    faceLocked: true,
    cycle: 1.4,
  }),
  sad: pose({
    leftArm: { rotate: 2 },
    rightArm: { rotate: -2 },
    head: { rotate: 4, y: 2 },
    body: { rotate: 0, y: [1, 1.8, 1] },
    face: FACE_PRESETS.sad,
    faceLocked: true,
    cycle: 6,
  }),
  waiting: pose({
    // Foot tapping while casually looking around.
    rightLeg: { rotate: [0, 9, 0, 9, 0, 9, 0] },
    leftArm: { rotate: 4 },
    rightArm: { rotate: -4 },
    head: { rotate: [-7, -7, 7, 7, -7], y: 0 },
    face: { ...NEUTRAL_FACE, mouthCurve: 3 },
    cycle: 3.2,
  }),
  nodding: pose({
    head: { rotate: 0, y: [0, 3, 0, 3, 0] },
    face: FACE_PRESETS.smiling,
    faceLocked: true,
    cycle: 1.2,
  }),
  sleepy: pose({
    head: { rotate: [8, 11, 8], y: [1, 2.5, 1] },
    leftArm: { rotate: 3 },
    rightArm: { rotate: -3 },
    body: { rotate: 0, y: [0, 0.8, 0] },
    face: FACE_PRESETS.sleepy,
    faceLocked: true,
    cycle: 3.6,
  }),
  walking: pose({ ...WALK, face: FACE_PRESETS.smiling }),
  goingHome: pose({ ...WALK, face: FACE_PRESETS.smiling, faceLocked: true }),
  returning: pose({ ...WALK, face: FACE_PRESETS.happy, faceLocked: true }),
  insideHome: pose({
    head: { rotate: 8, y: 2 },
    face: FACE_PRESETS.sleepy,
    faceLocked: true,
    cycle: 4,
  }),
  knockingResponse: pose({
    leftArm: { rotate: 20 },
    rightArm: { rotate: -20 },
    head: { rotate: 0, y: -2 },
    face: FACE_PRESETS.surprised,
    faceLocked: true,
    cycle: 2,
  }),
  success: pose({
    // Thumbs-up (hand rotation compensates the arm angle so the thumb stays up).
    rightArm: { rotate: -70 },
    rightHand: { shape: 'thumbsUp', rotate: 70 },
    leftArm: { rotate: 8 },
    body: { rotate: 0, y: [0, -2, 0] },
    face: FACE_PRESETS.happy,
    faceLocked: true,
    cycle: 1.4,
  }),
  error: pose({
    rightArm: { rotate: -40 },
    rightHand: { shape: 'open', rotate: 0 },
    leftArm: { rotate: 6 },
    head: { rotate: [-5, 5, -5], y: 0 },
    face: FACE_PRESETS.concerned,
    faceLocked: true,
    cycle: 1.6,
  }),
};

/**
 * Resolve the pose for a state, overlaying the current emotion's face unless
 * the pose owns its expression (e.g. `laughing`). Emotions never touch limbs,
 * so they can't interrupt a walk or gesture.
 */
export function getBuddyPose(state: BuddyAnimationState, emotion: BuddyEmotion = 'neutral'): BuddyPose {
  const base = BUDDY_POSES[state] ?? BUDDY_POSES.idle;
  if (emotion === 'neutral' || base.faceLocked) return base;
  return { ...base, face: FACE_PRESETS[emotion] };
}

/** Freeze keyframe cycles to their first frame when animation is paused. */
export function poseTarget(value: PoseValue, animate: boolean): PoseValue {
  if (!animate && Array.isArray(value)) return value[0];
  return value;
}

/** Spring for resting targets; a repeating tween for keyframe cycles. */
export function poseTransition(value: PoseValue, cycle: number, animate: boolean) {
  if (animate && Array.isArray(value)) {
    return { duration: cycle, repeat: Infinity, ease: 'easeInOut' as const };
  }
  return BUDDY_SPRING;
}
