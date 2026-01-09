import React from 'react';
import {
  Apple, Carrot, Beef, Fish, Wheat, Soup, Cookie, Coffee, Milk, Sparkles,
  Egg, Pizza, Sandwich, Cake, Candy, Beer, Wine, Grape, Cherry, Banana,
  Leaf, Salad, Popcorn, IceCreamCone, Croissant, Drumstick, CircleDot, Citrus,
  Utensils, ShoppingBasket, Package, Pill, Baby, Dog, Cat, Home, SprayCan,
  LucideProps,
} from 'lucide-react';
import { CategoryIcon as CategoryIconType } from '@/types/grocery';

const iconMap: Record<CategoryIconType, React.FC<LucideProps>> = {
  'apple': Apple,
  'carrot': Carrot,
  'beef': Beef,
  'fish': Fish,
  'wheat': Wheat,
  'soup': Soup,
  'cookie': Cookie,
  'coffee': Coffee,
  'milk': Milk,
  'sparkles': Sparkles,
  'egg': Egg,
  'pizza': Pizza,
  'sandwich': Sandwich,
  'cake': Cake,
  'candy': Candy,
  'beer': Beer,
  'wine': Wine,
  'grape': Grape,
  'cherry': Cherry,
  'banana': Banana,
  'leaf': Leaf,
  'salad': Salad,
  'popcorn': Popcorn,
  'ice-cream-cone': IceCreamCone,
  'croissant': Croissant,
  'drumstick': Drumstick,
  'circle-dot': CircleDot,
  'citrus': Citrus,
  'utensils': Utensils,
  'shopping-basket': ShoppingBasket,
  'package': Package,
  'pill': Pill,
  'baby': Baby,
  'dog': Dog,
  'cat': Cat,
  'home': Home,
  'spray-can': SprayCan,
};

interface CategoryIconProps extends LucideProps {
  icon?: string;
}

export function CategoryIcon({ icon, ...props }: CategoryIconProps) {
  if (!icon) return null;
  
  const IconComponent = iconMap[icon as CategoryIconType];
  if (!IconComponent) return null;
  
  return <IconComponent {...props} />;
}

export { iconMap };
