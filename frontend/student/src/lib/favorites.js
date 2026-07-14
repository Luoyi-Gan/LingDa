import { useCallback, useEffect, useState } from 'react';

const KEY = 'lingda:favorites:v1';
const EVENT = 'lingda:favorites-change';

function readRaw() {
  if (typeof window === 'undefined') return [];
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeRaw(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVENT));
}

function favoriteKey(roomType, roomId) {
  return `${roomType || 'group'}:${roomId}`;
}

function normalizeFavorite(input) {
  const roomId = Number(input.roomId || input.room_id);
  const roomType = input.roomType || input.room_type || 'group';
  return {
    id: favoriteKey(roomType, roomId),
    roomId,
    roomType,
    title: input.title || '未命名组队',
    subtitle: input.subtitle || input.location || '',
    meetTime: input.meetTime || input.meet_time || null,
    meetLabel: input.meetLabel || input.meet_label || '',
    location: input.location || '',
    creatorName: input.creatorName || input.creator_name || '',
    savedAt: input.savedAt || new Date().toISOString(),
  };
}

export function getFavorites() {
  return readRaw()
    .filter((item) => item && item.roomId)
    .sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
}

export function isFavorite(roomType, roomId) {
  const key = favoriteKey(roomType, Number(roomId));
  return readRaw().some((item) => item.id === key);
}

export function addFavorite(input) {
  const nextItem = normalizeFavorite(input);
  const list = readRaw().filter((item) => item.id !== nextItem.id);
  writeRaw([nextItem, ...list]);
  return nextItem;
}

export function removeFavorite(roomType, roomId) {
  const key = favoriteKey(roomType, Number(roomId));
  writeRaw(readRaw().filter((item) => item.id !== key));
}

export function toggleFavorite(input) {
  const nextItem = normalizeFavorite(input);
  if (isFavorite(nextItem.roomType, nextItem.roomId)) {
    removeFavorite(nextItem.roomType, nextItem.roomId);
    return { active: false, item: nextItem };
  }
  return { active: true, item: addFavorite(nextItem) };
}

export function useFavoriteRoom(roomType, roomId) {
  const [active, setActive] = useState(() => isFavorite(roomType, roomId));

  useEffect(() => {
    const update = () => setActive(isFavorite(roomType, roomId));
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, [roomType, roomId]);

  const toggle = useCallback((payload) => {
    const result = toggleFavorite(payload);
    setActive(result.active);
    return result;
  }, []);

  return [active, toggle];
}

export function useFavoritesList() {
  const [items, setItems] = useState(() => getFavorites());

  useEffect(() => {
    const update = () => setItems(getFavorites());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return items;
}
