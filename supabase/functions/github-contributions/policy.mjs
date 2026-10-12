export const REPOSITORY = 'spaceqat/fatqat';
export const ACTIONS = new Set(['closed', 'labeled', 'unlabeled']);
export async function verifySignature(body, signature, secret) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature || '')) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['verify']);
  const bytes = Uint8Array.from(signature.slice(7).match(/../g), hex => parseInt(hex, 16));
  return crypto.subtle.verify('HMAC', key, bytes, body);
}
export function eligiblePull(pr) {
  return pr?.merged === true && !!pr.merged_at && pr.user?.type === 'User' &&
    Number.isSafeInteger(pr.user.id) && Number.isSafeInteger(pr.number) &&
    pr.base?.repo?.full_name?.toLowerCase() === REPOSITORY;
}
export function trustedPermission(data) {
  return ['admin','maintain','write'].includes(data?.permission) || data?.user?.permissions?.push === true;
}
/** @param {any} pr @param {number} repoId @param {boolean} trusted @param {number|null} maintainerId */
export function ingestArgs(pr, repoId, trusted = false, maintainerId = null) {
  if (!eligiblePull(pr) || !Number.isSafeInteger(repoId)) throw new Error('Unsupported contribution');
  return {repo_id:repoId, pr:pr.number, author_github_id:String(pr.user.id), author_login:pr.user.login,
    pr_title:pr.title, merged_at_value:pr.merged_at,
    pr_labels:pr.labels.map(label=>label.name), trusted_maintainer:trusted,
    maintainer_github_id:maintainerId == null ? null : String(maintainerId)};
}
