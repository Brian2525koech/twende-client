// src/features/passenger/components/FavouriteButton.tsx
import React, { useState } from 'react';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api/axios';

interface FavouriteButtonProps {
  routeId: number;
  initialFavourited: boolean;
  onToggle?: (routeId: number, isFav: boolean) => void;
}

const FavouriteButton: React.FC<FavouriteButtonProps> = ({
  routeId,
  initialFavourited,
  onToggle,
}) => {
  const [favourited, setFavourited] = useState(initialFavourited);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);

    const next = !favourited;
    setFavourited(next); // optimistic

    try {
      if (next) {
        await api.post('/favourites', { route_id: routeId });
        toast.success('Added to saved routes');
      } else {
        await api.delete(`/favourites/${routeId}`);
        toast.success('Removed from saved routes');
      }
      onToggle?.(routeId, next);
    } catch {
      setFavourited(!next); // revert
      toast.error('Failed to update saved routes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      aria-label={favourited ? 'Remove from favourites' : 'Add to favourites'}
      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90 ${
        favourited
          ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500'
          : 'bg-slate-50 dark:bg-white/[0.04] text-slate-300 dark:text-slate-600 hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'
      } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <Star
        size={16}
        strokeWidth={2.5}
        className={`transition-all duration-200 ${favourited ? 'fill-amber-500' : ''}`}
      />
    </button>
  );
};

export default FavouriteButton;