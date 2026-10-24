# Project Architecture

- Use `ProfileAvatar` for user photos so Dishyo+ frames and badges remain consistent across social surfaces.
- Keep reaction catalogs in `dishyo-db.ts`; database triggers remain the authority for Dishyo+ reaction access.
- Apply Dishyo+ accents through the root data attribute and global CSS palettes, not inline color overrides, so light/dark themes and semantic controls stay synchronized.