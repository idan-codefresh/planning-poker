import { PlayerGame } from '../types/player';

const playerGamesStoreName = 'playerGames';

export const getPlayerGamesFromCache = (): PlayerGame[] => {
  let playerGames: PlayerGame[] = [];

  const store = localStorage.getItem(playerGamesStoreName);
  if (store) {
    playerGames = JSON.parse(store);
  }
  return playerGames;
};

export const isGameInPlayerCache = (gameId: string): boolean => {
  const playerGames = getPlayerGamesFromCache();
  const found = playerGames.find((playerGames) => playerGames.id === gameId);
  if (found) {
    return true;
  }
  return found ? true : false;
};

export const updatePlayerGamesInCache = (playerGames: PlayerGame[]) => {
  localStorage.setItem(playerGamesStoreName, JSON.stringify(playerGames));
};

const linearApiKeyStoreName = 'linearApiKey';

// Stored in sessionStorage so it is cleared when the tab/browser is closed
// and never persists across sessions.
export const getLinearApiKey = (): string | null => {
  return sessionStorage.getItem(linearApiKeyStoreName);
};

export const setLinearApiKey = (apiKey: string) => {
  sessionStorage.setItem(linearApiKeyStoreName, apiKey);
};

export const removeLinearApiKey = () => {
  sessionStorage.removeItem(linearApiKeyStoreName);
};

// ── Linear issue queue (per game session) ──────────────────────────────────────

const queueKey = (gameId: string) => `linearQueue_${gameId}`;
const queueIdxKey = (gameId: string) => `linearQueueIdx_${gameId}`;

export const getLinearIssueQueue = (gameId: string): unknown[] | null => {
  const stored = localStorage.getItem(queueKey(gameId));
  return stored ? JSON.parse(stored) : null;
};

export const setLinearIssueQueue = (gameId: string, issues: unknown[], index: number) => {
  localStorage.setItem(queueKey(gameId), JSON.stringify(issues));
  localStorage.setItem(queueIdxKey(gameId), String(index));
};

export const getLinearQueueIndex = (gameId: string): number => {
  const stored = localStorage.getItem(queueIdxKey(gameId));
  return stored !== null ? parseInt(stored, 10) : 0;
};

export const updateLinearQueueIndex = (gameId: string, index: number) => {
  localStorage.setItem(queueIdxKey(gameId), String(index));
};

export const clearLinearIssueQueue = (gameId: string) => {
  localStorage.removeItem(queueKey(gameId));
  localStorage.removeItem(queueIdxKey(gameId));
};
