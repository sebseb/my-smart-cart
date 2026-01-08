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
  onEdit?: () => void;
}

const SWIPE_THRESHOLD = 80;

export function SwipeableItem({ item, category, onToggleBought, onDelete, onEdit }: SwipeableItemProps) {
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

  const handleTap = useCallback(() => {
    // Only open edit if not dragging
    if (Math.abs(x.get()) < 5 && onEdit) {
      onEdit();
    }
  }, [onEdit, x]);

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
    <div ref={constraintsRef} className="relative overflow-hidden rounded-lg mb-1">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        {/* Left action (swipe right) */}
        <motion.div
          className="flex-1 flex items-center justify-start px-3 bg-primary"
          style={{ opacity: rightActionOpacity }}
        >
          {item.bought ? (
            <Undo2 className="w-5 h-5 text-primary-foreground" />
          ) : (
            <Check className="w-5 h-5 text-primary-foreground" />
          )}
        </motion.div>
        
        {/* Right action (swipe left) */}
        <motion.div
          className={cn(
            "flex-1 flex items-center justify-end px-3",
            item.bought ? "bg-primary" : "bg-destructive"
          )}
          style={{ opacity: leftActionOpacity }}
        >
          {item.bought ? (
            <Undo2 className="w-5 h-5 text-primary-foreground" />
          ) : (
            <Trash2 className="w-5 h-5 text-destructive-foreground" />
          )}
        </motion.div>
      </div>

      {/* Main item content */}
      <motion.div
        className={cn(
          "relative bg-card py-2.5 px-3 flex items-center gap-2 cursor-grab active:cursor-grabbing transition-colors",
          isDeleting && "opacity-0"
        )}
        style={{ x, scale }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
      >
        {/* Category indicator */}
        <div
          className={cn(
            "w-1 h-8 rounded-full flex-shrink-0",
            getCategoryColor()
          )}
          style={{
            backgroundColor: category ? `hsl(var(--${category.color}))` : undefined
          }}
        />
        
        {/* Item info */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium text-card-foreground truncate",
            item.bought && "line-through text-muted-foreground"
          )}>
            {item.name}
          </p>
        </div>

        {/* Quantity */}
        <div className={cn(
          "text-xs font-medium flex-shrink-0",
          item.bought ? "text-muted-foreground" : "text-foreground"
        )}>
          {formatQuantity()}
        </div>

        {/* Bought indicator */}
        {item.bought && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
          >
            <Check className="w-3 h-3 text-primary-foreground" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
