/**
 * Centralized Visual Asset Library for Gym Manager
 * Curated professional commercial gym photography, equipment, and studio visuals.
 * All image URLs use optimized WebP CDN formats with responsive width/quality parameters.
 */

export const GYM_IMAGES = {
  // Authentication & Welcome Hero
  authHero: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1200',
  authGymInterior: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=1200',
  
  // Dashboard Hero & Promotional Banners
  ownerDashboardHero: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&q=80&w=1200',
  strengthArea: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=800',
  cardioStudio: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=800',
  functionalRig: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=800',
  
  // Member Dashboard Experience
  memberPassCardBg: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&q=80&w=800',
  workoutProgress: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=800',
  stretchingYoga: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&q=80&w=800',
  
  // Gym Thumbnail Fallbacks (For City Rankings & Directory)
  defaultGymCover: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=600',
  gymThumbnail1: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=400',
  gymThumbnail2: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&q=80&w=400',
  gymThumbnail3: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=400',
}

/**
 * Returns a stable, deterministic gym cover image for any given gym ID or name
 */
export function getGymCoverImage(gymIdOrName) {
  const covers = [
    GYM_IMAGES.authGymInterior,
    GYM_IMAGES.strengthArea,
    GYM_IMAGES.ownerDashboardHero,
    GYM_IMAGES.cardioStudio,
    GYM_IMAGES.functionalRig,
  ]
  if (!gymIdOrName) return covers[0]
  const str = String(gymIdOrName)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % covers.length
  return covers[index]
}
