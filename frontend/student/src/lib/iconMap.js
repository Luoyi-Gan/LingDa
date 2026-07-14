// 中央 emoji → lucide 图标映射
// 用法：const Icon = entTypeIcon('演唱会');  <Icon className="h-5 w-5" />
//      或 <CategoryIcon roomType="carpool" />
import {
  // 通用
  Car,
  Sparkles,
  BookOpen,
  MessageCircle,
  // 娱乐子类型
  Mic,
  Drama,
  Music,
  Lock,
  Clapperboard,
  Image as ImageIcon,
  Gamepad2,
  UtensilsCrossed,
  PartyPopper,
  // 成就
  Rocket,
  Target,
  Star,
  Trophy,
  Crown,
  GraduationCap,
  Award,
  // 朋友群聊（emoji pool 反射）
  Heart,
  Smile,
  Coffee,
  Pizza,
  Flower2,
  Rainbow,
  Cat,
  Dog,
} from 'lucide-react';

// === 房间大类 ===
export const ROOM_TYPE_ICON = {
  carpool: Car,
  entertainment: Sparkles,
  group: BookOpen,
  study: BookOpen,
};
export function roomTypeIcon(type) {
  return ROOM_TYPE_ICON[type] || MessageCircle;
}

// === 娱乐子类型 ===
export const ENT_TYPE_ICON = {
  演唱会: Mic,
  剧本杀: Drama,
  KTV: Music,
  密室: Lock,
  观影: Clapperboard,
  展览: ImageIcon,
  游戏: Gamepad2,
  聚餐: UtensilsCrossed,
  其他: PartyPopper,
};
export function entTypeIcon(name) {
  return ENT_TYPE_ICON[name] || PartyPopper;
}

// === 成就 ===
export const ACHIEVEMENT_ICON = {
  a1: Rocket,        // 初次组队
  a2: Target,        // 准时之星
  a3: Star,          // 满分搭子
  a4: Trophy,        // 百次组队
  a5: Crown,         // 校园之星
  a6: GraduationCap, // 学霸搭子
};
export function achievementIcon(id) {
  return ACHIEVEMENT_ICON[id] || Award;
}

// === 朋友群聊 emoji pool 反射（后端给了哪个 emoji，前端就映射到对应 lucide）===
export const SGROUP_EMOJI_ICON = {
  '💬': MessageCircle,
  '🎉': PartyPopper,
  '🌈': Rainbow,
  '🍕': Pizza,
  '🐱': Cat,
  '🐼': Dog, // lucide 没有 Panda，就用 Dog 作替代
  '🌸': Flower2,
  '🎮': Gamepad2,
  '❤️': Heart,
  '☕': Coffee,
  '🙂': Smile,
};
export function sgroupIcon(emoji) {
  return SGROUP_EMOJI_ICON[emoji] || MessageCircle;
}

// === 群聊综合：根据 type + emoji 决定图标 ===
// type='group' → 用 roomType 决定（按理 backend 已转好对应 emoji）
// type='sgroup' → 用 backend 随机 emoji 反查
export function convIcon(type, emoji, roomType) {
  if (type === 'group') return roomTypeIcon(roomType || 'carpool');
  if (type === 'sgroup') return sgroupIcon(emoji);
  return MessageCircle;
}
