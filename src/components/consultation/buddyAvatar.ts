// =============================================================================
// Buddy avatar source — SINGLE replaceable path.
//
// To swap in the real Buddy avatar image supplied by the owner, either:
//   a) replace the file src/asset/buddy-avatar.svg with the new image
//      (keeping the same name), or
//   b) drop the new image (png/jpg/webp/svg) into src/asset/ and change ONLY
//      the import path below.
// Nothing else in the meeting UI references the asset directly.
// =============================================================================

import buddyAvatarUrl from '@/asset/buddy-avatar.svg';

export const BUDDY_AVATAR_URL: string = buddyAvatarUrl;
