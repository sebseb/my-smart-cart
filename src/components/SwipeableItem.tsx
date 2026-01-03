import React, { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Check, Undo2, Trash2 } from 'lucide-react';
import { GroceryItem, Category } from '@/types/grocery';
import { cn } from '@/lib/utils';

interface SwipeableItemProps {
  item: GroceryItem;
  category?: Category;
  onToggleBought: () => void;
  onDelete: () => void;
}

const SWIPE_THRESHOLD = 80;

export function SwipeableItem({ item, category, onToggleBought, onDelete }: SwipeableItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const constraintsRef = useRef(null);
  const x = useMotionValue(0);
  
  const leftActionOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const rightActionOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const scale = useTransform(
    x,
    [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    [0.98, 1, 0.98]
  );

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const offset = info.offset.x;
    
    if (offset > SWIPE_THRESHOLD) {
      // Swipe right - toggle bought
      onToggleBought();
    } else if (offset < -SWIPE_THRESHOLD) {
      // Swipe left - if bought, bring back; if not, delete
      if (item.bought) {
        onToggleBought();
      } else {
        setIsDeleting(true);
        setTimeout(onDelete, 200);
      }
    }
  }, [item.bought, onToggleBought, onDelete]);

  const formatQuantity = () => {
    if (item.quantity === 0) return '';
    const qty = item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(2);
    return item.unit ? `${qty} ${item.unit}` : `${qty}`;
  };

  const getCategoryColor = () => {
    if (!category) return 'bg-category-default';
    return `bg-${category.color}`;
  };

  return (
    <div ref={constraintsRef} className="relative overflow-hidden rounded-lg mb-2">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        {/* Left action (swipe right) */}
        <motion.div
          className="flex-1 flex items-center justify-start px-4 bg-primary"
          style={{ opacity: rightActionOpacity }}
        >
          {item.bought ? (
            <Undo2 className="w-6 h-6 text-primary-foreground" />
          ) : (
            <Check className="w-6 h-6 text-primary-foreground" />
          )}
        </motion.div>
        
        {/* Right action (swipe left) */}
        <motion.div
          className={cn(
            "flex-1 flex items-center justify-end px-4",
            item.bought ? "bg-primary" : "bg-destructive"
          )}
          style={{ opacity: leftActionOpacity }}
        >
          {item.bought ? (
            <Undo2 className="w-6 h-6 text-primary-foreground" />
          ) : (
            <Trash2 className="w-6 h-6 text-destructive-foreground" />
          )}
        </motion.div>
      </div>

      {/* Main item content */}
      <motion.div
        className={cn(
          "relative bg-card p-4 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-colors",
          isDeleting && "opacity-0"
        )}
        style={{ x, scale }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        {/* Category indicator */}
        <div
          className={cn(
            "w-1 h-10 rounded-full",
            getCategoryColor()
          )}
          style={{
            backgroundColor: category ? `hsl(var(--${category.color}))` : undefined
          }}
        />
        
        {/* Item info */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium text-card-foreground truncate",
            item.bought && "line-through text-muted-foreground"
          )}>
            {item.name}
          </p>
          {category && (
            <p className="text-xs text-muted-foreground">{category.name}</p>
          )}
        </div>

        {/* Quantity */}
        <div className={cn(
          "text-sm font-medium",
          item.bought ? "text-muted-foreground" : "text-foreground"
        )}>
          {formatQuantity()}
        </div>

        {/* Bought indicator */}
        {item.bought && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
          >
            <Check className="w-4 h-4 text-primary-foreground" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
