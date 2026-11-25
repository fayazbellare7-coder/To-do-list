import {
  BookOpen,
  Bookmark,
  Briefcase,
  Code,
  Coffee,
  Compass,
  Droplets,
  Dumbbell,
  Flame,
  Folder,
  GraduationCap,
  Heart,
  Laptop,
  Layers,
  LucideIcon,
  Music,
  Sun,
  Target,
  User,
  Wallet,
  Zap,
} from 'lucide-react';

export const ICON_REGISTRY: Record<string, LucideIcon> = {
  User,
  GraduationCap,
  Briefcase,
  Dumbbell,
  Wallet,
  Laptop,
  BookOpen,
  Droplets,
  Sun,
  Code,
  Heart,
  Target,
  Layers,
  Compass,
  Bookmark,
  Flame,
  Music,
  Coffee,
  Folder,
  Zap,
};

export const ICON_OPTIONS = Object.keys(ICON_REGISTRY);

export function getLucideIcon(name: string): LucideIcon {
  return ICON_REGISTRY[name] || Folder;
}
